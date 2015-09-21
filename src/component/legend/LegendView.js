define(function (require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var formatUtil = require('../../util/format');
    var symbolCreator = require('../../util/symbol');

    var LEGEND_DISABLE_STYLE = {
        fill: '#ccc',
        stroke: '#ccc'
    };

    function createSelectActionDispatcher(uid, seriesName, api) {
        api.dispatch({
            type: 'legendToggleSelect',
            from: uid,
            seriesName: seriesName
        });
    }

    return require('../../echarts').extendComponentView({

        type: 'legend',

        init: function () {
            this._itemElMap = {};
        },

        render: function (legendModel, ecModel, api) {
            var itemGap = legendModel.get('itemGap');
            var padding = formatUtil.normalizeCssArray(
                legendModel.get('padding')
            );
            var orient = legendModel.get('orient');

            var group = this.group;
            group.removeAll();

            group.position = [
                numberUtil.parsePercent(
                    legendModel.get('x'), api.getWidth()
                ),
                numberUtil.parsePercent(
                    legendModel.get('y'), api.getHeight()
                )
            ];

            var x = padding[3];
            var y = padding[0];

            var width = 20;
            var height = 10;

            zrUtil.each(legendModel.getData(), function (itemModel) {
                var seriesName = itemModel.get('name');
                var seriesModel = ecModel.getSeriesByName(seriesName, true);
                var data = seriesModel.getData();

                var itemElMap = this._itemElMap;
                var itemGroup = itemElMap[seriesName];
                if (legendModel.isSelected(seriesName)) {
                    itemGroup = new api.Group();
                    this._createSymbol(
                        data, x, y, width, height, data.getVisual('color'), itemGroup
                    );
                    itemElMap[seriesName] = itemGroup;
                }
                else {
                    itemGroup.eachChild(function (child) {
                        if (child.type !== 'text') {
                            child.style.set(LEGEND_DISABLE_STYLE);
                        }
                    });
                    itemGroup.off('click');
                }

                var text = new api.Text({
                    style: {
                        text: seriesName,
                        x: x + width + 5,
                        y: y + height / 2,
                        fill: '#000',
                        textAlign: 'left',
                        textBaseline: 'middle'
                    }
                });
                itemGroup.add(text);

                var textRect = text.getBoundingRect();
                if (orient === 'horizontal') {
                    x += width + 5 + textRect.width + itemGap;
                }
                else {
                    y += Math.max(height, textRect.height) + itemGap;
                }

                group.add(itemGroup);

                itemGroup.on('click', zrUtil.curry(createSelectActionDispatcher, this.uid, seriesName, api), this);
            }, this);

            var groupRect = group.getBoundingRect();
            group.position[0] -= groupRect.width / 2;
        },

        _createSymbol: function (data, x, y, width, height, color, group) {
            // Using rect symbol defaultly
            var legendSymbolType = data && data.getVisual('legendSymbol')
                || 'roundRect';
            var symbolType = data && data.getVisual('symbol');

            group.add(symbolCreator.createSymbol(
                legendSymbolType, x, y, width, height, color
            ));

            // Compose symbols
            // PENDING Use group ?
            if (symbolType && symbolType !== legendSymbolType) {
                var size = height * 0.8;
                // Put symbol in the center
                group.add(symbolCreator.createSymbol(
                    symbolType, x + (width - size) / 2, y + (height - size) / 2, size, size, color
                ));
            }

            return group;
        }
    });
});
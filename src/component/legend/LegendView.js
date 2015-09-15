define(function (require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var formatUtil = require('../../util/format');
    var symbolCreator = require('../../util/symbol');

    function createSelectActionDispatcher(uid, seriesName, api) {
        api.dispatch({
            type: 'legendToggleSelect',
            from: uid,
            seriesName: seriesName
        });
    }

    return require('../../echarts').extendComponentView({

        type: 'legend',

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
                var color = legendModel.isSelected(seriesName)
                    ? data.getVisual('color')
                    : '#ccc';

                var legendSymbol = this._createSymbol(
                    data, x, y, width, height, color, api
                );

                var text = new api.Text({
                    style: {
                        text: seriesName,
                        x: x + width + 5,
                        y: y,
                        fill: '#000',
                        textAlign: 'left',
                        textBaseline: 'top'
                    }
                });

                var textRect = text.getBoundingRect();
                if (orient === 'horizontal') {
                    x += width + 5 + textRect.width + itemGap;
                }
                else {
                    y += Math.max(height, textRect.height) + itemGap;
                }

                group.add(legendSymbol);
                group.add(text);

                var onClick = zrUtil.curry(createSelectActionDispatcher, this.uid, seriesName, api);
                legendSymbol.on('click', onClick, this);
                text.on('click', onClick, this);
            }, this);

            var groupRect = group.getBoundingRect();
            group.position[0] -= groupRect.width / 2;
        },

        _createSymbol: function (data, x, y, width, height, color, api) {

            var group = new api.Group();
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
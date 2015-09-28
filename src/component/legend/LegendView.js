define(function (require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var symbolCreator = require('../../util/symbol');
    var legendLayout = require('./legendLayout');
    var graphic = require('../../util/graphic');

    var LEGEND_DISABLE_COLOR = '#ccc';

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
            this._symbolTypeStore = {};
        },

        render: function (legendModel, ecModel, api) {
            var enableSelect = legendModel.get('selectedMode');
            var itemWidth = legendModel.get('itemWidth');
            var itemHeight = legendModel.get('itemHeight');
            var group = this.group;
            var x = legendModel.get('x');
            var y = legendModel.get('y');
            var itemAlign = legendModel.get('align');
            var parsePercent = numberUtil.parsePercent;
            group.position = [
                parsePercent(x, api.getWidth()),
                parsePercent(y, api.getHeight())
            ];
            group.removeAll();

            if (itemAlign === 'auto') {
                itemAlign = group.position[0] / api.getWidth() < 0.7 ? 'left' : 'right';
            }

            zrUtil.each(legendModel.getData(), function (itemModel) {
                var seriesName = itemModel.get('name');
                var seriesModel = ecModel.getSeriesByName(seriesName, true);
                if (!seriesModel) {
                    // Series not exists
                    return;
                }

                var data = seriesModel.getData();
                var color = data.getVisual('color');

                if (!legendModel.isSelected(seriesName)) {
                    color = LEGEND_DISABLE_COLOR;
                }

                var itemGroup = new graphic.Group();
                this._createSymbol(
                    data, 0, 0, itemWidth, itemHeight, color, itemGroup
                );

                var textX = itemAlign === 'left' ? itemWidth + 5 : -5;
                var textAlign = itemAlign;

                var text = new graphic.Text({
                    style: {
                        text: seriesName,
                        x: textX,
                        y: itemHeight / 2,
                        fill: '#000',
                        textAlign: textAlign,
                        textBaseline: 'middle'
                    }
                });
                itemGroup.add(text);

                itemGroup.eachChild(function (child) {
                    child.silent = !enableSelect;
                });

                group.add(itemGroup);

                itemGroup.on('click', zrUtil.curry(createSelectActionDispatcher, this.uid, seriesName, api), this);
            }, this);

            legendLayout(group, legendModel);

            this._adjustGroupPosition(group, x, y);
        },

        _adjustGroupPosition: function (group, x, y) {

            var groupRect = group.getBoundingRect();
            var position = group.position;
            var padding = group.padding;

            switch (x) {
                case 'center':
                    position[0] -= groupRect.width / 2;
                    break;
                case 'right':
                    position[0] -= groupRect.width + groupRect.x + padding[1];
                    break;
            }
            switch (y) {
                case 'center':
                    position[1] -= groupRect.height / 2;
                    break;
                case 'bottom':
                    position[0] -= groupRect.height + groupRect.y + padding[2];
                    break;
            }
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
            if (symbolType && symbolType !== legendSymbolType && symbolType != 'none') {
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
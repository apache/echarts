define(function (require) {

    var numberUtil = require('../../util/number');
    var symbolCreator = require('../../util/symbol');

    return require('../../echarts').extendComponentView({

        type: 'legend',

        render: function (legendModel, ecModel, api) {
            var itemGap = legendModel.get('itemGap');
            var padding = numberUtil.normalizeCssArray(
                legendModel.get('padding')
            );
            var orient = legendModel.get('orient');

            var group = this.group;
            group.clear();

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

            legendModel.getData().each(function (dataItem) {
                var seriesName = dataItem.name;
                var seriesModel = ecModel.getSeriesByName(seriesName);
                var color = legendModel.isSelected(seriesName)
                    ? seriesModel.getVisual('color')
                    : '#ccc';

                var legendSymbol = this._createSymbol(seriesModel, x, y, width, height, api);
                legendSymbol.style.set({
                    fill: color,
                    stroke: color
                });

                var text = new api.Text({
                    style: {
                        text: dataItem.name,
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

                legendSymbol.on('click', function () {
                    legendModel.toggleSelected(seriesName);
                    api.update();
                });
            }, this);

            var groupRect = group.getBoundingRect();
            group.position[0] -= groupRect.width / 2;
        },

        _createSymbol: function (seriesModel, x, y, width, height, api) {

            // Using rect symbol defaultly
            var legendSymbolType = seriesModel.getVisual('legendSymbol')
                || 'roundRect';
            var symbolType = seriesModel.getVisual('symbol');

            var legendSymbolShape = symbolCreator.createSymbol(legendSymbolType, x, y, width, height);

            // Compose symbols
            // PENDING Use group ?
            if (symbolType && symbolType !== legendSymbolType) {
                var size = height * 0.8;
                // Put symbol in the center
                var symbolShape = symbolCreator.createSymbol(symbolType, x + (width - size) / 2, y + (height - size) / 2, size, size);

                legendSymbolShape = api.mergePath([legendSymbolShape, symbolShape]);
            }

            return legendSymbolShape;
        }
    });
});
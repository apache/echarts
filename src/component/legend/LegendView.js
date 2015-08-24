define(function (require) {

    var numberUtil = require('../../util/number');

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

            legendModel.getData().each(function (dataItem) {
                var seriesName = dataItem.name;
                var seriesModel = ecModel.getSeriesByName(seriesName);
                var color = legendModel.isSelected(seriesName)
                    ? seriesModel.getVisual('color')
                    : '#ccc';

                var symbol = seriesModel.getVisual('symbol');

                var width = 20;
                var height = 10;
                var rect = new api.Rect({
                    shape: {
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    },
                    style: {
                        fill: color
                    }
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

                group.add(rect);
                group.add(text);

                rect.on('click', function () {
                    legendModel.toggleSelected(seriesName);
                    api.update();
                });
            });

            var groupRect = group.getBoundingRect();
            group.position[0] -= groupRect.width / 2;
        }
    });
});
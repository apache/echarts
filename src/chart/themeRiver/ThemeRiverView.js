define(function (require) {

    var poly = require('../line/poly');
    var graphic = require('../../util/graphic');

    return require('../../echarts').extendChartView({

        type: 'themeRiver',

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var rawData = seriesModel.getRawData();

            if (!data.count()) {
                return;
            }

            var group = this.group;

            var layerSeries = seriesModel.getLayerSeries();

            group.removeAll();

            var layoutInfo = data.getLayout('layoutInfo');
            var rect = layoutInfo.rect;
            var boundaryGap = layoutInfo.boundaryGap;

            group.position = [0, rect.y + boundaryGap[0]];

            var m = layerSeries.length;

            for (var i = 0; i < m; i++) {
                var polygon = new poly.Polygon();
                var text = new graphic.Text();
                var points0 = [];
                var points1 = [];
                var color;
                var n = layerSeries[i].length;

                for (var j = 0; j < n; j++) {
                    var layout = data.getItemLayout(layerSeries[i][j]);
                    var x = layout.x;
                    var y0 = layout.y0;

                    color = rawData.getItemVisual(
                        data.getRawIndex(layerSeries[i][j]), 'color'
                    );

                    var y = layout.y;

                    points0.push([x, y0]);
                    points1.push([x, y0 + y]);
                }

                polygon.setShape({
                    points: points0,
                    stackedOnPoints: points1,
                    smooth: 0.4,
                    stackedOnSmooth: 0.4,
                    smoothConstraint: false
                });

                var itemModel = data.getItemModel(layerSeries[i][j-1]);
                var labelModel = itemModel.getModel('label.normal');
                var margin = labelModel.get('margin');
                var areaStyleModel = itemModel.getModel('areaStyle.emphasis');
                var textStyleModel = labelModel.getModel('textStyle');
                var textLayout = data.getItemLayout(layerSeries[i][0]);

                graphic.updateProps(text, {
                    style: {
                        x: textLayout.x - margin,
                        y: textLayout.y0 + textLayout.y / 2
                    }
                }, seriesModel);

                text.setStyle({
                    text: labelModel.get('show')
                        ? seriesModel.getFormattedLabel(layerSeries[i][j-1], 'normal')
                            || data.getName(layerSeries[i][j-1])
                        :'',
                    textFont: textStyleModel.getFont(),
                    textAlign: labelModel.get('textAlign'),
                    textBaseline: 'middle'
                });

                polygon.setStyle({
                    fill: color
                });

                var stroke = areaStyleModel.get('stroke');

                graphic.setHoverStyle(polygon, {
                    stroke: stroke
                });

                group.add(polygon);
                group.add(text);
            }
        }
    });

});
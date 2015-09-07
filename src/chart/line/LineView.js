define(function(require) {

    'use strict';

    return require('../../echarts').extendChartView({

        type: 'line',

        render: function (seriesModel, ecModel, api) {

            if (seriesModel.coordinateSystem.type === 'cartesian2d') {
                this._renderCartesian(seriesModel, ecModel, api);
            }
        },

        _renderCartesian: function (seriesModel, ecModel, api) {

            var data = seriesModel.getData();
            var lineStyleNormalModel = seriesModel.getModel('itemStyle.normal.lineStyle');

            var points = data.map(function (dataItem) {
                var layout = dataItem.layout;
                if (layout) {
                    return [layout.x, layout.y];
                }
            });
            // Initialization animation
            if (!this._data) {
                var cartesian = seriesModel.coordinateSystem;
                var xAxis = cartesian.getAxis('x');
                var yAxis = cartesian.getAxis('y');
                var xExtent = xAxis.getExtent();
                var yExtent = yAxis.getExtent();

                var clipPath = new api.Rect({
                    shape: {
                        x: xExtent[0],
                        y: yExtent[0],
                        width: 0,
                        height: yExtent[1] - yExtent[0]
                    }
                });

                this.group.setClipPath(clipPath);

                clipPath.animateShape()
                    .when(1500, {
                        x: xExtent[0],
                        y: yExtent[0],
                        width: xExtent[1] - xExtent[0],
                        height: yExtent[1] - yExtent[0]
                    })
                    .start();

                var polyline = new api.Polyline({
                    shape: {
                        points: points
                    },
                    style: {
                        stroke: seriesModel.getVisual('color'),
                        lineWidth: lineStyleNormalModel.get('width')
                    }
                });
                this.group.add(polyline);

                this._polyline = polyline;
            }
            else {
                // this._polyline.animateShape()
                //     .when(500, {
                //         points: points
                //     })
                //     .start('cubicOut');
                this._polyline.shape.points = points;
                this._polyline.dirty(true);
            }

            this._data = data;
        }
    });
});
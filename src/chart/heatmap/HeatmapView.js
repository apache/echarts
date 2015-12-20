define(function (require) {

    var graphic = require('../../util/graphic');

    return require('../../echarts').extendChartView({

        type: 'heatmap',

        render: function (seriesModel, ecModel, api) {
            var coordSys = seriesModel.coordinateSystem;
            if (coordSys.type === 'cartesian2d') {
                this._renderOnCartesian(coordSys, seriesModel, ecModel, api);
            }
            else if (coordSys.type === 'geo') {
                this._renderOnGeo(coordSys, seriesModel, ecModel, api);
            }
        },

        _renderOnCartesian: function (cartesian, seriesModel, ecModel, api) {
            var xAxis = cartesian.getAxis('x');
            var yAxis = cartesian.getAxis('y');
            var group = this.group;
            group.removeAll();

            if (!(xAxis.type === 'category' && yAxis.type === 'category')) {
                throw new Error('Heatmap on cartesian must have two category axes');
            }
            if (!(xAxis.onBand && yAxis.onBand)) {
                throw new Error('Heatmap on cartesian must have two axes with boundaryGap true');
            }
            var width = xAxis.getBandWidth();
            var height = yAxis.getBandWidth();

            var data = seriesModel.getData();
            data.each(['x', 'y', 'z'], function (x, y, z, idx) {
                var itemModel = data.getItemModel(idx);
                var point = cartesian.dataToPoint([x, y]);
                var rect = new graphic.Rect({
                    shape: {
                        x: point[0] - width / 2,
                        y: point[1] - height / 2,
                        width: width,
                        height: height
                    },
                    style: {
                        fill: data.getItemVisual(idx, 'color')
                    }
                });
                var style = itemModel.getModel('itemStyle.normal').getItemStyle(['color']);
                var hoverStl = itemModel.getModel('itemStyle.emphasis').getItemStyle();
                var labelModel = itemModel.getModel('label.normal');
                var hoverLabelModel = itemModel.getModel('label.emphasis');

                var rawValue = seriesModel.getRawValue(idx);
                var defaultText = '-';
                if (rawValue && rawValue[2] != null) {
                    defaultText = rawValue[2];
                }
                if (labelModel.get('show')) {
                    graphic.setText(style, labelModel);
                    style.text = seriesModel.getFormattedLabel(idx, 'normal') || defaultText;
                }
                if (hoverLabelModel.get('show')) {
                    graphic.setText(hoverStl, hoverLabelModel);
                    hoverStl.text = seriesModel.getFormattedLabel(idx, 'emphasis') || defaultText;
                }

                rect.setStyle(style);

                graphic.setHoverStyle(rect, hoverStl);

                group.add(rect);
                data.setItemGraphicEl(idx, rect);
            });
        },

        _renderOnGeo: function (geo, seriesModel, ecModel, api) {

        }
    });
});
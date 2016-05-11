define(function (require) {

    var graphic = require('../../util/graphic');
    var HeatmapLayer = require('./HeatmapLayer');
    var zrUtil = require('zrender/core/util');

    function getIsInPiecewiseRange(dataExtent, pieceList, selected) {
        var dataSpan = dataExtent[1] - dataExtent[0];
        pieceList = zrUtil.map(pieceList, function (piece) {
            return {
                interval: [
                    (piece.interval[0] - dataExtent[0]) / dataSpan,
                    (piece.interval[1] - dataExtent[0]) / dataSpan
                ]
            };
        });
        var len = pieceList.length;
        var lastIndex = 0;
        return function (val) {
            // Try to find in the location of the last found
            for (var i = lastIndex; i < len; i++) {
                var interval = pieceList[i].interval;
                if (interval[0] <= val && val <= interval[1]) {
                    lastIndex = i;
                    break;
                }
            }
            if (i === len) { // Not found, back interation
                for (var i = lastIndex - 1; i >= 0; i--) {
                    var interval = pieceList[i].interval;
                    if (interval[0] <= val && val <= interval[1]) {
                        lastIndex = i;
                        break;
                    }
                }
            }
            return i >= 0 && i < len && selected[i];
        };
    }

    function getIsInContinuousRange(dataExtent, range) {
        var dataSpan = dataExtent[1] - dataExtent[0];
        range = [
            (range[0] - dataExtent[0]) / dataSpan,
            (range[1] - dataExtent[0]) / dataSpan
        ];
        return function (val) {
            return val >= range[0] && val <= range[1];
        };
    }

    function isGeoCoordSys(coordSys) {
        var dimensions = coordSys.dimensions;
        // Not use coorSys.type === 'geo' because coordSys maybe extended
        return dimensions[0] === 'lng' && dimensions[1] === 'lat';
    }

    return require('../../echarts').extendChartView({

        type: 'heatmap',

        render: function (seriesModel, ecModel, api) {
            var visualMapOfThisSeries;
            ecModel.eachComponent('visualMap', function (visualMap) {
                visualMap.eachTargetSeries(function (targetSeries) {
                    if (targetSeries === seriesModel) {
                        visualMapOfThisSeries = visualMap;
                    }
                });
            });

            if (!visualMapOfThisSeries) {
                throw new Error('Heatmap must use with visualMap');
            }

            this.group.removeAll();
            var coordSys = seriesModel.coordinateSystem;
            if (coordSys.type === 'cartesian2d') {
                this._renderOnCartesian(coordSys, seriesModel, api);
            }
            else if (isGeoCoordSys(coordSys)) {
                this._renderOnGeo(
                    coordSys, seriesModel, visualMapOfThisSeries, api
                );
            }
        },

        _renderOnCartesian: function (cartesian, seriesModel, api) {
            var xAxis = cartesian.getAxis('x');
            var yAxis = cartesian.getAxis('y');
            var group = this.group;

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
                // Ignore empty data
                if (isNaN(z)) {
                    return;
                }
                var rect = new graphic.Rect({
                    shape: {
                        x: point[0] - width / 2,
                        y: point[1] - height / 2,
                        width: width,
                        height: height
                    },
                    style: {
                        fill: data.getItemVisual(idx, 'color'),
                        opacity: data.getItemVisual(idx, 'opacity')
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

        _renderOnGeo: function (geo, seriesModel, visualMapModel, api) {
            var inRangeVisuals = visualMapModel.targetVisuals.inRange;
            var outOfRangeVisuals = visualMapModel.targetVisuals.outOfRange;
            // if (!visualMapping) {
            //     throw new Error('Data range must have color visuals');
            // }

            var data = seriesModel.getData();
            var hmLayer = this._hmLayer || (this._hmLayer || new HeatmapLayer());
            hmLayer.blurSize = seriesModel.get('blurSize');
            hmLayer.pointSize = seriesModel.get('pointSize');
            hmLayer.minOpacity = seriesModel.get('minOpacity');
            hmLayer.maxOpacity = seriesModel.get('maxOpacity');

            var rect = geo.getViewRect().clone();
            var roamTransform = geo.getRoamTransform().transform;
            rect.applyTransform(roamTransform);

            // Clamp on viewport
            var x = Math.max(rect.x, 0);
            var y = Math.max(rect.y, 0);
            var x2 = Math.min(rect.width + rect.x, api.getWidth());
            var y2 = Math.min(rect.height + rect.y, api.getHeight());
            var width = x2 - x;
            var height = y2 - y;

            var points = data.mapArray(['lng', 'lat', 'value'], function (lng, lat, value) {
                var pt = geo.dataToPoint([lng, lat]);
                pt[0] -= x;
                pt[1] -= y;
                pt.push(value);
                return pt;
            });

            var dataExtent = visualMapModel.getExtent();
            var isInRange = visualMapModel.type === 'visualMap.continuous'
                ? getIsInContinuousRange(dataExtent, visualMapModel.option.range)
                : getIsInPiecewiseRange(
                    dataExtent, visualMapModel.getPieceList(), visualMapModel.option.selected
                );

            hmLayer.update(
                points, width, height,
                inRangeVisuals.color.getNormalizer(),
                {
                    inRange: inRangeVisuals.color.getColorMapper(),
                    outOfRange: outOfRangeVisuals.color.getColorMapper()
                },
                isInRange
            );
            var img = new graphic.Image({
                style: {
                    width: width,
                    height: height,
                    x: x,
                    y: y,
                    image: hmLayer.canvas
                },
                silent: true
            });
            this.group.add(img);
        }
    });
});
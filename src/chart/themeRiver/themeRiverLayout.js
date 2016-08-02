/**
 * @file  Using layout algorithm transform the raw data to layout information.
 * @author Deqing Li(annong035@gmail.com)
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil =  require('../../util/number');


    return function (ecModel, api) {

        ecModel.eachSeriesByType('themeRiver', function (seriesModel) {

            var data = seriesModel.getData();

            var single = seriesModel.coordinateSystem;

            var layoutInfo = {};

            // use the axis boundingRect for view
            var rect = single.getRect();

            layoutInfo.rect = rect;

            var boundaryGap = seriesModel.get('boundaryGap');

            var axis = single.getAxis();

            layoutInfo.boundaryGap = boundaryGap;

            if (axis.orient === 'horizontal') {
                boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], rect.height);
                boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], rect.height);
                var height = rect.height - boundaryGap[0] - boundaryGap[1];
                themeRiverLayout(data, seriesModel, height);
            }
            else {
                boundaryGap[0] = numberUtil.parsePercent(boundaryGap[0], rect.width);
                boundaryGap[1] = numberUtil.parsePercent(boundaryGap[1], rect.width);
                var width = rect.width - boundaryGap[0] - boundaryGap[1];
                themeRiverLayout(data, seriesModel, width);
            }

            data.setLayout('layoutInfo', layoutInfo);
        });
    };

    /**
     * The layout information about themeriver
     *
     * @param {module:echarts/data/List} data  data in the series
     * @param {module:echarts/model/Series} seriesModel  the model object of themeRiver series
     * @param {number} height  value used to compute every series height
     */
    function themeRiverLayout(data, seriesModel, height) {
        if (!data.count()) {
            return;
        }
        var coordSys = seriesModel.coordinateSystem;
        // the data in each layer are organized into a series.
        var layerSeries = seriesModel.getLayerSeries();

        // the points in each layer.
        var layerPoints = zrUtil.map(layerSeries, function (singleLayer) {
            return zrUtil.map(singleLayer.indices, function (idx) {
                var pt = coordSys.dataToPoint(data.get('time', idx));
                pt[1] = data.get('value', idx);
                return pt;
            });
        });

        var base = computeBaseline(layerPoints);
        var baseLine = base.y0;
        var ky = height / base.max;

        // set layout information for each item.
        var n = layerSeries.length;
        var m = layerSeries[0].indices.length;
        var baseY0;
        for (var j = 0; j < m; ++j) {
            baseY0 = baseLine[j] * ky;
            data.setItemLayout(layerSeries[0].indices[j], {
                layerIndex: 0,
                x: layerPoints[0][j][0],
                y0: baseY0,
                y: layerPoints[0][j][1] * ky
            });
            for (var i = 1; i < n; ++i) {
                baseY0 += layerPoints[i - 1][j][1] * ky;
                data.setItemLayout(layerSeries[i].indices[j], {
                    layerIndex: i,
                    x: layerPoints[i][j][0],
                    y0: baseY0,
                    y: layerPoints[i][j][1] * ky
                });
            }
        }
    }

    /**
     * Compute the baseLine of the rawdata
     * Inspired by Lee Byron's paper Stacked Graphs - Geometry & Aesthetics
     *
     * @param  {Array.<Array>} data  the points in each layer
     * @return {Array}
     */
    function computeBaseline(data) {
        var layerNum = data.length;
        var pointNum = data[0].length;
        var sums = [];
        var y0 = [];
        var max = 0;
        var temp;
        var base = {};

        for (var i = 0; i < pointNum; ++i) {
            for (var j = 0, temp = 0; j < layerNum; ++j) {
                temp += data[j][i][1];
            }
            if (temp > max) {
                max = temp;
            }
            sums.push(temp);
        }

        for (var k = 0; k < pointNum; ++k) {
            y0[k] = (max - sums[k]) / 2;
        }
        max = 0;

        for (var l = 0; l < pointNum; ++l) {
            var sum = sums[l] + y0[l];
            if (sum > max) {
                max = sum;
            }
        }
        base.y0 = y0;
        base.max = max;

        return base;
    }
});

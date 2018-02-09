import * as zrUtil from 'zrender/src/core/util';
import {parsePercent} from '../../util/number';
import {subPixelOptimize} from '../../util/graphic';

var retrieve2 = zrUtil.retrieve2;

export default function (ecModel) {

    ecModel.eachSeriesByType('candlestick', function (seriesModel) {

        var coordSys = seriesModel.coordinateSystem;
        var data = seriesModel.getData();
        var candleWidth = calculateCandleWidth(seriesModel, data);
        var chartLayout = seriesModel.get('layout');
        var variableDim = chartLayout === 'horizontal' ? 0 : 1;
        var constDim = 1 - variableDim;
        var coordDims = ['x', 'y'];
        var vDims = [];
        var cDim;

        zrUtil.each(data.dimensions, function (dimName) {
            var dimInfo = data.getDimensionInfo(dimName);
            var coordDim = dimInfo.coordDim;
            if (coordDim === coordDims[constDim]) {
                vDims.push(dimName);
            }
            else if (coordDim === coordDims[variableDim]) {
                cDim = dimName;
            }
        });

        if (cDim == null || vDims.length < 4) {
            return;
        }

        var dataIndex = 0;

        data.each([cDim].concat(vDims), function () {
            var args = arguments;
            var axisDimVal = args[0];
            var idx = args[vDims.length + 1];

            var openVal = args[1];
            var closeVal = args[2];
            var lowestVal = args[3];
            var highestVal = args[4];

            var ocLow = Math.min(openVal, closeVal);
            var ocHigh = Math.max(openVal, closeVal);

            var ocLowPoint = getPoint(ocLow);
            var ocHighPoint = getPoint(ocHigh);
            var lowestPoint = getPoint(lowestVal);
            var highestPoint = getPoint(highestVal);

            var whiskerEnds = [
                [
                    subPixelOptimizePoint(highestPoint),
                    subPixelOptimizePoint(ocHighPoint)
                ],
                [
                    subPixelOptimizePoint(lowestPoint),
                    subPixelOptimizePoint(ocLowPoint)
                ]
            ];

            var bodyEnds = [];
            addBodyEnd(ocHighPoint, 0);
            addBodyEnd(ocLowPoint, 1);

            var sign;
            if (openVal > closeVal) {
                sign = -1;
            }
            else if (openVal < closeVal) {
                sign = 1;
            }
            else {
                // If close === open, compare with close of last record
                if (dataIndex > 0) {
                    sign = data.getItemModel(dataIndex - 1).get()[2]
                        <= closeVal
                            ? 1
                            : -1;
                }
                else {
                    // No record of previous, set to be positive
                    sign = 1;
                }
            }

            data.setItemLayout(idx, {
                chartLayout: chartLayout,
                sign: sign,
                initBaseline: openVal > closeVal
                    ? ocHighPoint[constDim] : ocLowPoint[constDim], // open point.
                bodyEnds: bodyEnds,
                whiskerEnds: whiskerEnds,
                brushRect: makeBrushRect()
            });

            ++dataIndex;

            function getPoint(val) {
                var p = [];
                p[variableDim] = axisDimVal;
                p[constDim] = val;
                return (isNaN(axisDimVal) || isNaN(val))
                    ? [NaN, NaN]
                    : coordSys.dataToPoint(p);
            }

            function addBodyEnd(point, start) {
                var point1 = point.slice();
                var point2 = point.slice();

                point1[variableDim] = subPixelOptimize(
                    point1[variableDim] + candleWidth / 2, 1, false
                );
                point2[variableDim] = subPixelOptimize(
                    point2[variableDim] - candleWidth / 2, 1, true
                );

                start
                    ? bodyEnds.push(point1, point2)
                    : bodyEnds.push(point2, point1);
            }

            function makeBrushRect() {
                var pmin = getPoint(Math.min(openVal, closeVal, lowestVal, highestVal));
                var pmax = getPoint(Math.max(openVal, closeVal, lowestVal, highestVal));

                pmin[variableDim] -= candleWidth / 2;
                pmax[variableDim] -= candleWidth / 2;

                return {
                    x: pmin[0],
                    y: pmin[1],
                    width: constDim ? candleWidth : pmax[0] - pmin[0],
                    height: constDim ? pmax[1] - pmin[1] : candleWidth
                };
            }

            function subPixelOptimizePoint(point) {
                point[variableDim] = subPixelOptimize(point[variableDim], 1);
                return point;
            }

        });
    });
}

function calculateCandleWidth(seriesModel, data) {
    var baseAxis = seriesModel.getBaseAxis();
    var extent;

    var bandWidth = baseAxis.type === 'category'
        ? baseAxis.getBandWidth()
        : (
            extent = baseAxis.getExtent(),
            Math.abs(extent[1] - extent[0]) / data.count()
        );

    var barMaxWidth = parsePercent(
        retrieve2(seriesModel.get('barMaxWidth'), bandWidth),
        bandWidth
    );
    var barMinWidth = parsePercent(
        retrieve2(seriesModel.get('barMinWidth'), 1),
        bandWidth
    );
    var barWidth = seriesModel.get('barWidth');
    return barWidth != null
        ? parsePercent(barWidth, bandWidth)
        // Put max outer to ensure bar visible in spite of overlap.
        : Math.max(Math.min(bandWidth / 2, barMaxWidth), barMinWidth);
}

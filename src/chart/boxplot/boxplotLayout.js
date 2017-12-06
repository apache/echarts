import * as zrUtil from 'zrender/src/core/util';
import {parsePercent} from '../../util/number';

var each = zrUtil.each;

export default function (ecModel) {

    var groupResult = groupSeriesByAxis(ecModel);

    each(groupResult, function (groupItem) {
        var seriesModels = groupItem.seriesModels;

        if (!seriesModels.length) {
            return;
        }

        calculateBase(groupItem);

        each(seriesModels, function (seriesModel, idx) {
            layoutSingleSeries(
                seriesModel,
                groupItem.boxOffsetList[idx],
                groupItem.boxWidthList[idx]
            );
        });
    });
}

/**
 * Group series by axis.
 */
function groupSeriesByAxis(ecModel) {
    var result = [];
    var axisList = [];

    ecModel.eachSeriesByType('boxplot', function (seriesModel) {
        var baseAxis = seriesModel.getBaseAxis();
        var idx = zrUtil.indexOf(axisList, baseAxis);

        if (idx < 0) {
            idx = axisList.length;
            axisList[idx] = baseAxis;
            result[idx] = {axis: baseAxis, seriesModels: []};
        }

        result[idx].seriesModels.push(seriesModel);
    });

    return result;
}

/**
 * Calculate offset and box width for each series.
 */
function calculateBase(groupItem) {
    var extent;
    var baseAxis = groupItem.axis;
    var seriesModels = groupItem.seriesModels;
    var seriesCount = seriesModels.length;

    var boxWidthList = groupItem.boxWidthList = [];
    var boxOffsetList = groupItem.boxOffsetList = [];
    var boundList = [];

    var bandWidth;
    if (baseAxis.type === 'category') {
        bandWidth = baseAxis.getBandWidth();
    }
    else {
        var maxDataCount = 0;
        each(seriesModels, function (seriesModel) {
            maxDataCount = Math.max(maxDataCount, seriesModel.getData().count());
        });
        extent = baseAxis.getExtent(),
        Math.abs(extent[1] - extent[0]) / maxDataCount;
    }

    each(seriesModels, function (seriesModel) {
        var boxWidthBound = seriesModel.get('boxWidth');
        if (!zrUtil.isArray(boxWidthBound)) {
            boxWidthBound = [boxWidthBound, boxWidthBound];
        }
        boundList.push([
            parsePercent(boxWidthBound[0], bandWidth) || 0,
            parsePercent(boxWidthBound[1], bandWidth) || 0
        ]);
    });

    var availableWidth = bandWidth * 0.8 - 2;
    var boxGap = availableWidth / seriesCount * 0.3;
    var boxWidth = (availableWidth - boxGap * (seriesCount - 1)) / seriesCount;
    var base = boxWidth / 2 - availableWidth / 2;

    each(seriesModels, function (seriesModel, idx) {
        boxOffsetList.push(base);
        base += boxGap + boxWidth;

        boxWidthList.push(
            Math.min(Math.max(boxWidth, boundList[idx][0]), boundList[idx][1])
        );
    });
}

/**
 * Calculate points location for each series.
 */
function layoutSingleSeries(seriesModel, offset, boxWidth) {
    var coordSys = seriesModel.coordinateSystem;
    var data = seriesModel.getData();
    var halfWidth = boxWidth / 2;
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

    if (cDim == null || vDims.length < 5) {
        return;
    }

    data.each([cDim].concat(vDims), function () {
        var args = arguments;
        var axisDimVal = args[0];
        var idx = args[vDims.length + 1];

        var median = getPoint(args[3]);
        var end1 = getPoint(args[1]);
        var end5 = getPoint(args[5]);
        var whiskerEnds = [
            [end1, getPoint(args[2])],
            [end5, getPoint(args[4])]
        ];
        layEndLine(end1);
        layEndLine(end5);
        layEndLine(median);

        var bodyEnds = [];
        addBodyEnd(whiskerEnds[0][1], 0);
        addBodyEnd(whiskerEnds[1][1], 1);

        data.setItemLayout(idx, {
            chartLayout: chartLayout,
            initBaseline: median[constDim],
            median: median,
            bodyEnds: bodyEnds,
            whiskerEnds: whiskerEnds
        });

        function getPoint(val) {
            var p = [];
            p[variableDim] = axisDimVal;
            p[constDim] = val;
            var point;
            if (isNaN(axisDimVal) || isNaN(val)) {
                point = [NaN, NaN];
            }
            else {
                point = coordSys.dataToPoint(p);
                point[variableDim] += offset;
            }
            return point;
        }

        function addBodyEnd(point, start) {
            var point1 = point.slice();
            var point2 = point.slice();
            point1[variableDim] += halfWidth;
            point2[variableDim] -= halfWidth;
            start
                ? bodyEnds.push(point1, point2)
                : bodyEnds.push(point2, point1);
        }

        function layEndLine(endCenter) {
            var line = [endCenter.slice(), endCenter.slice()];
            line[0][variableDim] -= halfWidth;
            line[1][variableDim] += halfWidth;
            whiskerEnds.push(line);
        }
    });
}

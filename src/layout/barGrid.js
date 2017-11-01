import * as zrUtil from 'zrender/src/core/util';
import {parsePercent} from '../util/number';

var STACK_PREFIX = '__ec_stack_';

function getSeriesStackId(seriesModel) {
    return seriesModel.get('stack') || STACK_PREFIX + seriesModel.seriesIndex;
}

function getAxisKey(axis) {
    return axis.dim + axis.index;
}

/**
 * @param {Object} opt
 * @param {module:echarts/coord/Axis} opt.axis Only support category axis currently.
 * @param {number} opt.count Positive interger.
 * @param {number} [opt.barWidth]
 * @param {number} [opt.barMaxWidth]
 * @param {number} [opt.barGap]
 * @param {number} [opt.barCategoryGap]
 * @return {Object} {width, offset, offsetCenter} If axis.type is not 'category', return undefined.
 */
function getLayoutOnAxis(opt, api) {
    var params = [];
    var baseAxis = opt.axis;
    var axisKey = 'axis0';

    if (baseAxis.type !== 'category') {
        return;
    }
    var bandWidth = baseAxis.getBandWidth();

    for (var i = 0; i < opt.count || 0; i++) {
        params.push(zrUtil.defaults({
            bandWidth: bandWidth,
            axisKey: axisKey,
            stackId: STACK_PREFIX + i
        }, opt));
    }
    var widthAndOffsets = doCalBarWidthAndOffset(params, api);

    var result = [];
    for (var i = 0; i < opt.count; i++) {
        var item = widthAndOffsets[axisKey][STACK_PREFIX + i];
        item.offsetCenter = item.offset + item.width / 2;
        result.push(item);
    }

    return result;
}

function calBarWidthAndOffset(barSeries, api) {
    var seriesInfoList = zrUtil.map(barSeries, function (seriesModel) {
        var data = seriesModel.getData();
        var cartesian = seriesModel.coordinateSystem;
        var baseAxis = cartesian.getBaseAxis();
        var axisExtent = baseAxis.getExtent();
        var bandWidth = baseAxis.type === 'category'
            ? baseAxis.getBandWidth()
            : (Math.abs(axisExtent[1] - axisExtent[0]) / data.count());

        var barWidth = parsePercent(
            seriesModel.get('barWidth'), bandWidth
        );
        var barMaxWidth = parsePercent(
            seriesModel.get('barMaxWidth'), bandWidth
        );
        var barGap = seriesModel.get('barGap');
        var barCategoryGap = seriesModel.get('barCategoryGap');

        return {
            bandWidth: bandWidth,
            barWidth: barWidth,
            barMaxWidth: barMaxWidth,
            barGap: barGap,
            barCategoryGap: barCategoryGap,
            axisKey: getAxisKey(baseAxis),
            stackId: getSeriesStackId(seriesModel)
        };
    });

    return doCalBarWidthAndOffset(seriesInfoList, api);
}

function doCalBarWidthAndOffset(seriesInfoList, api) {
    // Columns info on each category axis. Key is cartesian name
    var columnsMap = {};

    zrUtil.each(seriesInfoList, function (seriesInfo, idx) {
        var axisKey = seriesInfo.axisKey;
        var bandWidth = seriesInfo.bandWidth;
        var columnsOnAxis = columnsMap[axisKey] || {
            bandWidth: bandWidth,
            remainedWidth: bandWidth,
            autoWidthCount: 0,
            categoryGap: '20%',
            gap: '30%',
            stacks: {}
        };
        var stacks = columnsOnAxis.stacks;
        columnsMap[axisKey] = columnsOnAxis;

        var stackId = seriesInfo.stackId;

        if (!stacks[stackId]) {
            columnsOnAxis.autoWidthCount++;
        }
        stacks[stackId] = stacks[stackId] || {
            width: 0,
            maxWidth: 0
        };

        // Caution: In a single coordinate system, these barGrid attributes
        // will be shared by series. Consider that they have default values,
        // only the attributes set on the last series will work.
        // Do not change this fact unless there will be a break change.

        // TODO
        var barWidth = seriesInfo.barWidth;
        if (barWidth && !stacks[stackId].width) {
            // See #6312, do not restrict width.
            stacks[stackId].width = barWidth;
            barWidth = Math.min(columnsOnAxis.remainedWidth, barWidth);
            columnsOnAxis.remainedWidth -= barWidth;
        }

        var barMaxWidth = seriesInfo.barMaxWidth;
        barMaxWidth && (stacks[stackId].maxWidth = barMaxWidth);
        var barGap = seriesInfo.barGap;
        (barGap != null) && (columnsOnAxis.gap = barGap);
        var barCategoryGap = seriesInfo.barCategoryGap;
        (barCategoryGap != null) && (columnsOnAxis.categoryGap = barCategoryGap);
    });

    var result = {};

    zrUtil.each(columnsMap, function (columnsOnAxis, coordSysName) {

        result[coordSysName] = {};

        var stacks = columnsOnAxis.stacks;
        var bandWidth = columnsOnAxis.bandWidth;
        var categoryGap = parsePercent(columnsOnAxis.categoryGap, bandWidth);
        var barGapPercent = parsePercent(columnsOnAxis.gap, 1);

        var remainedWidth = columnsOnAxis.remainedWidth;
        var autoWidthCount = columnsOnAxis.autoWidthCount;
        var autoWidth = (remainedWidth - categoryGap)
            / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
        autoWidth = Math.max(autoWidth, 0);

        // Find if any auto calculated bar exceeded maxBarWidth
        zrUtil.each(stacks, function (column, stack) {
            var maxWidth = column.maxWidth;
            if (maxWidth && maxWidth < autoWidth) {
                maxWidth = Math.min(maxWidth, remainedWidth);
                if (column.width) {
                    maxWidth = Math.min(maxWidth, column.width);
                }
                remainedWidth -= maxWidth;
                column.width = maxWidth;
                autoWidthCount--;
            }
        });

        // Recalculate width again
        autoWidth = (remainedWidth - categoryGap)
            / (autoWidthCount + (autoWidthCount - 1) * barGapPercent);
        autoWidth = Math.max(autoWidth, 0);

        var widthSum = 0;
        var lastColumn;
        zrUtil.each(stacks, function (column, idx) {
            if (!column.width) {
                column.width = autoWidth;
            }
            lastColumn = column;
            widthSum += column.width * (1 + barGapPercent);
        });
        if (lastColumn) {
            widthSum -= lastColumn.width * barGapPercent;
        }

        var offset = -widthSum / 2;
        zrUtil.each(stacks, function (column, stackId) {
            result[coordSysName][stackId] = result[coordSysName][stackId] || {
                offset: offset,
                width: column.width
            };

            offset += column.width * (1 + barGapPercent);
        });
    });

    return result;
}

/**
 * @param {string} seriesType
 * @param {module:echarts/model/Global} ecModel
 * @param {module:echarts/ExtensionAPI} api
 */
function barLayoutGrid(seriesType, ecModel, api) {

    var barWidthAndOffset = calBarWidthAndOffset(
        zrUtil.filter(
            ecModel.getSeriesByType(seriesType),
            function (seriesModel) {
                return !ecModel.isSeriesFiltered(seriesModel)
                    && seriesModel.coordinateSystem
                    && seriesModel.coordinateSystem.type === 'cartesian2d';
            }
        )
    );

    var lastStackCoords = {};
    var lastStackCoordsOrigin = {};

    ecModel.eachSeriesByType(seriesType, function (seriesModel) {

        // Check series coordinate, do layout for cartesian2d only
        if (seriesModel.coordinateSystem.type !== 'cartesian2d') {
            return;
        }

        var data = seriesModel.getData();
        var cartesian = seriesModel.coordinateSystem;
        var baseAxis = cartesian.getBaseAxis();

        var stackId = getSeriesStackId(seriesModel);
        var columnLayoutInfo = barWidthAndOffset[getAxisKey(baseAxis)][stackId];
        var columnOffset = columnLayoutInfo.offset;
        var columnWidth = columnLayoutInfo.width;
        var valueAxis = cartesian.getOtherAxis(baseAxis);

        var barMinHeight = seriesModel.get('barMinHeight') || 0;

        var valueAxisStart = baseAxis.onZero
            ? valueAxis.toGlobalCoord(valueAxis.dataToCoord(0))
            : valueAxis.getGlobalExtent()[0];

        var coordDims = [
            seriesModel.coordDimToDataDim('x')[0],
            seriesModel.coordDimToDataDim('y')[0]
        ];
        var coords = data.mapArray(coordDims, function (x, y) {
            return cartesian.dataToPoint([x, y]);
        }, true);

        lastStackCoords[stackId] = lastStackCoords[stackId] || [];
        lastStackCoordsOrigin[stackId] = lastStackCoordsOrigin[stackId] || []; // Fix #4243

        data.setLayout({
            offset: columnOffset,
            size: columnWidth
        });

        data.each(seriesModel.coordDimToDataDim(valueAxis.dim)[0], function (value, idx) {
            if (isNaN(value)) {
                return;
            }

            if (!lastStackCoords[stackId][idx]) {
                lastStackCoords[stackId][idx] = {
                    p: valueAxisStart, // Positive stack
                    n: valueAxisStart  // Negative stack
                };
                lastStackCoordsOrigin[stackId][idx] = {
                    p: valueAxisStart, // Positive stack
                    n: valueAxisStart  // Negative stack
                };
            }
            var sign = value >= 0 ? 'p' : 'n';
            var coord = coords[idx];
            var lastCoord = lastStackCoords[stackId][idx][sign];
            var lastCoordOrigin = lastStackCoordsOrigin[stackId][idx][sign];
            var x;
            var y;
            var width;
            var height;

            if (valueAxis.isHorizontal()) {
                x = lastCoord;
                y = coord[1] + columnOffset;
                width = coord[0] - lastCoordOrigin;
                height = columnWidth;

                lastStackCoordsOrigin[stackId][idx][sign] += width;
                if (Math.abs(width) < barMinHeight) {
                    width = (width < 0 ? -1 : 1) * barMinHeight;
                }
                lastStackCoords[stackId][idx][sign] += width;
            }
            else {
                x = coord[0] + columnOffset;
                y = lastCoord;
                width = columnWidth;
                height = coord[1] - lastCoordOrigin;

                lastStackCoordsOrigin[stackId][idx][sign] += height;
                if (Math.abs(height) < barMinHeight) {
                    // Include zero to has a positive bar
                    height = (height <= 0 ? -1 : 1) * barMinHeight;
                }
                lastStackCoords[stackId][idx][sign] += height;
            }

            data.setItemLayout(idx, {
                x: x,
                y: y,
                width: width,
                height: height
            });
        }, true);

    }, this);
}

barLayoutGrid.getLayoutOnAxis = getLayoutOnAxis;

export default barLayoutGrid;
import * as zrUtil from 'zrender/src/core/util';
import {parsePercent} from '../util/number';

function getSeriesStackId(seriesModel) {
    return seriesModel.get('stack')
        || '__ec_stack_' + seriesModel.seriesIndex;
}

function getAxisKey(axis) {
    return axis.dim;
}

/**
 * @param {string} seriesType
 * @param {module:echarts/model/Global} ecModel
 * @param {module:echarts/ExtensionAPI} api
 */
function barLayoutPolar(seriesType, ecModel, api) {

    var width = api.getWidth();
    var height = api.getHeight();

    var lastStackCoords = {};
    var lastStackCoordsOrigin = {};

    var barWidthAndOffset = calRadialBar(
        zrUtil.filter(
            ecModel.getSeriesByType(seriesType),
            function (seriesModel) {
                return !ecModel.isSeriesFiltered(seriesModel)
                    && seriesModel.coordinateSystem
                    && seriesModel.coordinateSystem.type === 'polar';
            }
        )
    );

    ecModel.eachSeriesByType(seriesType, function (seriesModel) {
        // Check series coordinate, do layout for polar only
        if (seriesModel.coordinateSystem.type !== 'polar') {
            return;
        }

        var data = seriesModel.getData();
        var polar = seriesModel.coordinateSystem;
        var angleAxis = polar.getAngleAxis();
        var baseAxis = polar.getBaseAxis();

        var stackId = getSeriesStackId(seriesModel);
        var columnLayoutInfo
            = barWidthAndOffset[getAxisKey(baseAxis)][stackId];
        var columnOffset = columnLayoutInfo.offset;
        var columnWidth = columnLayoutInfo.width;
        var valueAxis = polar.getOtherAxis(baseAxis);

        var center = seriesModel.get('center') || ['50%', '50%'];
        var cx = parsePercent(center[0], width);
        var cy = parsePercent(center[1], height);

        var barMinHeight = seriesModel.get('barMinHeight') || 0;
        var barMinAngle = seriesModel.get('barMinAngle') || 0;

        var valueAxisStart = valueAxis.getExtent()[0];
        var valueMax = valueAxis.model.get('max');
        var valueMin = valueAxis.model.get('min');

        var coordDims = [
            seriesModel.coordDimToDataDim('radius')[0],
            seriesModel.coordDimToDataDim('angle')[0]
        ];
        var coords = data.mapArray(coordDims, function (radius, angle) {
            return polar.dataToPoint([radius, angle]);
        }, true);

        lastStackCoords[stackId] = lastStackCoords[stackId] || [];
        lastStackCoordsOrigin[stackId] = lastStackCoordsOrigin[stackId] || []; // Fix #4243

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
            var coord = polar.pointToCoord(coords[idx]);

            var lastCoordOrigin = lastStackCoordsOrigin[stackId][idx][sign];
            var r0;
            var r;
            var startAngle;
            var endAngle;

            if (valueAxis.dim === 'radius') {
                // radial sector
                r0 = lastCoordOrigin;
                r = coord[0];
                startAngle = (-coord[1] + columnOffset) * Math.PI / 180;
                endAngle = startAngle + columnWidth * Math.PI / 180;

                if (Math.abs(r) < barMinHeight) {
                    r = r0 + (r < 0 ? -1 : 1) * barMinHeight;
                }

                lastStackCoordsOrigin[stackId][idx][sign] = r;
            }
            else {
                // tangential sector
                r0 = coord[0] + columnOffset;
                r = r0 + columnWidth;

                // clamp data if min or max is defined for valueAxis
                if (valueMax != null) {
                    value = Math.min(value, valueMax);
                }
                if (valueMin != null) {
                    value = Math.max(value, valueMin);
                }

                var angle = angleAxis.dataToAngle(value);
                if (Math.abs(angle - lastCoordOrigin) < barMinAngle) {
                    angle = lastCoordOrigin - (value < 0 ? -1 : 1)
                        * barMinAngle;
                }

                startAngle = -lastCoordOrigin * Math.PI / 180;
                endAngle = -angle * Math.PI / 180;

                // if the previous stack is at the end of the ring,
                // add a round to differentiate it from origin
                var extent = angleAxis.getExtent();
                var stackCoord = angle;
                if (stackCoord === extent[0] && value > 0) {
                    stackCoord = extent[1];
                }
                else if (stackCoord === extent[1] && value < 0) {
                    stackCoord = extent[0];
                }
                lastStackCoordsOrigin[stackId][idx][sign] = stackCoord;
            }

            data.setItemLayout(idx, {
                cx: cx,
                cy: cy,
                r0: r0,
                r: r,
                startAngle: startAngle,
                endAngle: endAngle
            });

        }, true);

    }, this);

}

/**
 * Calculate bar width and offset for radial bar charts
 */
function calRadialBar(barSeries, api) {
    // Columns info on each category axis. Key is polar name
    var columnsMap = {};

    zrUtil.each(barSeries, function (seriesModel, idx) {
        var data = seriesModel.getData();
        var polar = seriesModel.coordinateSystem;

        var baseAxis = polar.getBaseAxis();

        var axisExtent = baseAxis.getExtent();
        var bandWidth = baseAxis.type === 'category'
            ? baseAxis.getBandWidth()
            : (Math.abs(axisExtent[1] - axisExtent[0]) / data.count());

        var columnsOnAxis = columnsMap[getAxisKey(baseAxis)] || {
            bandWidth: bandWidth,
            remainedWidth: bandWidth,
            autoWidthCount: 0,
            categoryGap: '20%',
            gap: '30%',
            stacks: {}
        };
        var stacks = columnsOnAxis.stacks;
        columnsMap[getAxisKey(baseAxis)] = columnsOnAxis;

        var stackId = getSeriesStackId(seriesModel);

        if (!stacks[stackId]) {
            columnsOnAxis.autoWidthCount++;
        }
        stacks[stackId] = stacks[stackId] || {
            width: 0,
            maxWidth: 0
        };

        var barWidth = parsePercent(
            seriesModel.get('barWidth'),
            bandWidth
        );
        var barMaxWidth = parsePercent(
            seriesModel.get('barMaxWidth'),
            bandWidth
        );
        var barGap = seriesModel.get('barGap');
        var barCategoryGap = seriesModel.get('barCategoryGap');

        if (barWidth && !stacks[stackId].width) {
            barWidth = Math.min(columnsOnAxis.remainedWidth, barWidth);
            stacks[stackId].width = barWidth;
            columnsOnAxis.remainedWidth -= barWidth;
        }

        barMaxWidth && (stacks[stackId].maxWidth = barMaxWidth);
        (barGap != null) && (columnsOnAxis.gap = barGap);
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

export default barLayoutPolar;
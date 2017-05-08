define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var parsePercent = require('../util/number').parsePercent;

    function getSeriesStackId(seriesModel) {
        return seriesModel.get('stack')
            || '__ec_stack_' + seriesModel.seriesIndex;
    }

    /**
     * @param {string} seriesType
     * @param {module:echarts/model/Global} ecModel
     * @param {module:echarts/ExtensionAPI} api
     */
    function barLayoutPolar(seriesType, ecModel, api) {

        var width = api.getWidth();
        var height = api.getHeight();
        var size = Math.min(width, height);

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
            console.log('');

            // Check series coordinate, do layout for polar only
            if (seriesModel.coordinateSystem.type !== 'polar') {
                return;
            }

            var data = seriesModel.getData();
            var polar = seriesModel.coordinateSystem;
            var baseAxis = polar.getBaseAxis();
            var axisExtent = baseAxis.getExtent();

            var stackId = getSeriesStackId(seriesModel);
            var columnLayoutInfo =
                barWidthAndOffset[getAxisKey(baseAxis)][stackId];
            var columnOffset = columnLayoutInfo.offset;
            var columnWidth = columnLayoutInfo.width;
            var valueAxis = polar.getOtherAxis(baseAxis);

            var center = seriesModel.get('center') || ['50%', '50%'];
            var cx = parsePercent(center[0], width);
            var cy = parsePercent(center[1], height);
            var radius = size;

            var barMinHeight = seriesModel.get('barMinHeight') || 0;
            var bandWidth = baseAxis.type === 'category'
                ? baseAxis.getBandWidth()
                : (Math.abs(axisExtent[1] - axisExtent[0]) / data.count());

            var valueAxisStart = valueAxis.getExtent()[0];

            var coords = polar.dataToPoints(data, true);
            lastStackCoords[stackId] = lastStackCoords[stackId] || [];
            lastStackCoordsOrigin[stackId] = lastStackCoordsOrigin[stackId] || []; // Fix #4243

            data.each(valueAxis.dim, function (value, idx) {
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
                var lastCoord = lastStackCoords[stackId][idx][sign];
                var lastCoordOrigin = lastStackCoordsOrigin[stackId][idx][sign];
                var r0;
                var r;
                var startAngle;
                var endAngle;

                if (valueAxis.dim === 'radius') {
                    // radial sector
                    r0 = lastCoordOrigin;
                    r = coord[0];
                    startAngle = (-coord[1] - bandWidth / 2
                        + (bandWidth - columnWidth) / 2) * Math.PI / 180;
                    endAngle = startAngle + columnWidth * Math.PI / 180;

                    lastStackCoordsOrigin[stackId][idx][sign] += coord[0];
                }
                else {
                    // tangential sector
                    r0 = coord[0] - columnWidth / 2;
                    r = r0 + columnWidth;

                    var extent = valueAxis.getExtent();
                    var limit = function (x) {
                        return Math.ceil(Math.floor(x, extent[1]), extent[0]);
                    };
                    startAngle = -limit(lastCoordOrigin) * Math.PI / 180;
                    endAngle = -limit(coord[1]) * Math.PI / 180;
                    console.log(lastCoordOrigin, coord[1]);

                    if (startAngle === endAngle) {
                        // check if need to add a round for endAngle
                        if (value > 0) {
                            endAngle += Math.PI * 2;
                        }
                        else if (value < 0) {
                            endAngle -= Math.PI * 2;
                        }
                    }

                    lastStackCoordsOrigin[stackId][idx][sign] = coord[1];
                }

                data.setItemLayout(idx, {
                    cx: cx,
                    cy: cy,
                    r0: r0,
                    r: r,
                    startAngle: startAngle,
                    endAngle: endAngle
                });

            });

        }, this);

    }

    function getSeriesStackId(seriesModel) {
        return seriesModel.get('stack') || '__ec_stack_' + seriesModel.seriesIndex;
    }

    function getAxisKey(axis) {
        return axis.dim;
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

            var radiusAxis = polar.getRadiusAxis();
            var angleAxis = polar.getAngleAxis();
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
                seriesModel.get('barWidth'), bandWidth
            );
            var barMaxWidth = parsePercent(
                seriesModel.get('barMaxWidth'), bandWidth
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

    return barLayoutPolar;
});

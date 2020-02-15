/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as zrUtil from 'zrender/src/core/util';
import {parsePercent} from '../util/number';
import {isDimensionStacked} from '../data/helper/dataStackHelper';

function getSeriesStackId(seriesModel) {
    return seriesModel.get('stack')
        || '__ec_stack_' + seriesModel.seriesIndex;
}

function getAxisKey(polar, axis) {
    return axis.dim + polar.model.componentIndex;
}

/**
 * @param {string} seriesType
 * @param {module:echarts/model/Global} ecModel
 * @param {module:echarts/ExtensionAPI} api
 */
function barLayoutPolar(seriesType, ecModel, api) {

    var lastStackCoords = {};

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
        var baseAxis = polar.getBaseAxis();
        var axisKey = getAxisKey(polar, baseAxis);

        var stackId = getSeriesStackId(seriesModel);
        var columnLayoutInfo = barWidthAndOffset[axisKey][stackId];
        var columnOffset = columnLayoutInfo.offset;
        var columnWidth = columnLayoutInfo.width;
        var valueAxis = polar.getOtherAxis(baseAxis);

        var cx = seriesModel.coordinateSystem.cx;
        var cy = seriesModel.coordinateSystem.cy;

        var barMinHeight = seriesModel.get('barMinHeight') || 0;
        var barMinAngle = seriesModel.get('barMinAngle') || 0;

        lastStackCoords[stackId] = lastStackCoords[stackId] || [];

        var valueDim = data.mapDimension(valueAxis.dim);
        var baseDim = data.mapDimension(baseAxis.dim);
        var stacked = isDimensionStacked(data, valueDim /*, baseDim*/);
        var clampLayout = baseAxis.dim !== 'radius'
            || !seriesModel.get('roundCap', true);

        var valueAxisStart = valueAxis.getExtent()[0];

        for (var idx = 0, len = data.count(); idx < len; idx++) {
            var value = data.get(valueDim, idx);
            var baseValue = data.get(baseDim, idx);

            var sign = value >= 0 ? 'p' : 'n';
            var baseCoord = valueAxisStart;

            // Because of the barMinHeight, we can not use the value in
            // stackResultDimension directly.
            // Only ordinal axis can be stacked.
            if (stacked) {
                if (!lastStackCoords[stackId][baseValue]) {
                    lastStackCoords[stackId][baseValue] = {
                        p: valueAxisStart, // Positive stack
                        n: valueAxisStart  // Negative stack
                    };
                }
                // Should also consider #4243
                baseCoord = lastStackCoords[stackId][baseValue][sign];
            }

            var r0;
            var r;
            var startAngle;
            var endAngle;

            // radial sector
            if (valueAxis.dim === 'radius') {
                var radiusSpan = valueAxis.dataToRadius(value) - valueAxisStart;
                var angle = baseAxis.dataToAngle(baseValue);

                if (Math.abs(radiusSpan) < barMinHeight) {
                    radiusSpan = (radiusSpan < 0 ? -1 : 1) * barMinHeight;
                }

                r0 = baseCoord;
                r = baseCoord + radiusSpan;
                startAngle = angle - columnOffset;
                endAngle = startAngle - columnWidth;

                stacked && (lastStackCoords[stackId][baseValue][sign] = r);
            }
            // tangential sector
            else {
                var angleSpan = valueAxis.dataToAngle(value, clampLayout) - valueAxisStart;
                var radius = baseAxis.dataToRadius(baseValue);

                if (Math.abs(angleSpan) < barMinAngle) {
                    angleSpan = (angleSpan < 0 ? -1 : 1) * barMinAngle;
                }

                r0 = radius + columnOffset;
                r = r0 + columnWidth;
                startAngle = baseCoord;
                endAngle = baseCoord + angleSpan;

                // if the previous stack is at the end of the ring,
                // add a round to differentiate it from origin
                // var extent = angleAxis.getExtent();
                // var stackCoord = angle;
                // if (stackCoord === extent[0] && value > 0) {
                //     stackCoord = extent[1];
                // }
                // else if (stackCoord === extent[1] && value < 0) {
                //     stackCoord = extent[0];
                // }
                stacked && (lastStackCoords[stackId][baseValue][sign] = endAngle);
            }

            data.setItemLayout(idx, {
                cx: cx,
                cy: cy,
                r0: r0,
                r: r,
                // Consider that positive angle is anti-clockwise,
                // while positive radian of sector is clockwise
                startAngle: -startAngle * Math.PI / 180,
                endAngle: -endAngle * Math.PI / 180
            });

        }

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
        var axisKey = getAxisKey(polar, baseAxis);

        var axisExtent = baseAxis.getExtent();
        var bandWidth = baseAxis.type === 'category'
            ? baseAxis.getBandWidth()
            : (Math.abs(axisExtent[1] - axisExtent[0]) / data.count());

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
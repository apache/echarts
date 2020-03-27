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

import {__DEV__} from '../../config';
import * as echarts from '../../echarts';
import * as graphic from '../../util/graphic';
import HeatmapLayer from './HeatmapLayer';
import * as zrUtil from 'zrender/src/core/util';

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

export default echarts.extendChartView({

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

        if (__DEV__) {
            if (!visualMapOfThisSeries) {
                throw new Error('Heatmap must use with visualMap');
            }
        }

        this.group.removeAll();

        this._incrementalDisplayable = null;

        var coordSys = seriesModel.coordinateSystem;
        if (coordSys.type === 'cartesian2d' || coordSys.type === 'calendar') {
            this._renderOnCartesianAndCalendar(seriesModel, api, 0, seriesModel.getData().count());
        }
        else if (isGeoCoordSys(coordSys)) {
            this._renderOnGeo(
                coordSys, seriesModel, visualMapOfThisSeries, api
            );
        }
    },

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        this.group.removeAll();
    },

    incrementalRender: function (params, seriesModel, ecModel, api) {
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys) {
            this._renderOnCartesianAndCalendar(seriesModel, api, params.start, params.end, true);
        }
    },

    _renderOnCartesianAndCalendar: function (seriesModel, api, start, end, incremental) {

        var coordSys = seriesModel.coordinateSystem;
        var width;
        var height;

        if (coordSys.type === 'cartesian2d') {
            var xAxis = coordSys.getAxis('x');
            var yAxis = coordSys.getAxis('y');

            if (__DEV__) {
                if (!(xAxis.type === 'category' && yAxis.type === 'category')) {
                    throw new Error('Heatmap on cartesian must have two category axes');
                }
                if (!(xAxis.onBand && yAxis.onBand)) {
                    throw new Error('Heatmap on cartesian must have two axes with boundaryGap true');
                }
            }

            width = xAxis.getBandWidth();
            height = yAxis.getBandWidth();
        }

        var group = this.group;
        var data = seriesModel.getData();

        var itemStyleQuery = 'itemStyle';
        var hoverItemStyleQuery = 'emphasis.itemStyle';
        var labelQuery = 'label';
        var hoverLabelQuery = 'emphasis.label';
        var style = seriesModel.getModel(itemStyleQuery).getItemStyle(['color']);
        var hoverStl = seriesModel.getModel(hoverItemStyleQuery).getItemStyle();
        var labelModel = seriesModel.getModel(labelQuery);
        var hoverLabelModel = seriesModel.getModel(hoverLabelQuery);
        var coordSysType = coordSys.type;


        var dataDims = coordSysType === 'cartesian2d'
            ? [
                data.mapDimension('x'),
                data.mapDimension('y'),
                data.mapDimension('value')
            ]
            : [
                data.mapDimension('time'),
                data.mapDimension('value')
            ];

        for (var idx = start; idx < end; idx++) {
            var rect;

            if (coordSysType === 'cartesian2d') {
                // Ignore empty data
                if (isNaN(data.get(dataDims[2], idx))) {
                    continue;
                }

                var point = coordSys.dataToPoint([
                    data.get(dataDims[0], idx),
                    data.get(dataDims[1], idx)
                ]);

                rect = new graphic.Rect({
                    shape: {
                        x: Math.floor(Math.round(point[0]) - width / 2),
                        y: Math.floor(Math.round(point[1]) - height / 2),
                        width: Math.ceil(width),
                        height: Math.ceil(height)
                    },
                    style: {
                        fill: data.getItemVisual(idx, 'color'),
                        opacity: data.getItemVisual(idx, 'opacity')
                    }
                });
            }
            else {
                // Ignore empty data
                if (isNaN(data.get(dataDims[1], idx))) {
                    continue;
                }

                rect = new graphic.Rect({
                    z2: 1,
                    shape: coordSys.dataToRect([data.get(dataDims[0], idx)]).contentShape,
                    style: {
                        fill: data.getItemVisual(idx, 'color'),
                        opacity: data.getItemVisual(idx, 'opacity')
                    }
                });
            }

            var itemModel = data.getItemModel(idx);

            // Optimization for large datset
            if (data.hasItemOption) {
                style = itemModel.getModel(itemStyleQuery).getItemStyle(['color']);
                hoverStl = itemModel.getModel(hoverItemStyleQuery).getItemStyle();
                labelModel = itemModel.getModel(labelQuery);
                hoverLabelModel = itemModel.getModel(hoverLabelQuery);
            }

            var rawValue = seriesModel.getRawValue(idx);
            var defaultText = '-';
            if (rawValue && rawValue[2] != null) {
                defaultText = rawValue[2];
            }

            graphic.setLabelStyle(
                style, hoverStl, labelModel, hoverLabelModel,
                {
                    labelFetcher: seriesModel,
                    labelDataIndex: idx,
                    defaultText: defaultText,
                    isRectText: true
                }
            );

            rect.setStyle(style);
            graphic.setHoverStyle(rect, data.hasItemOption ? hoverStl : zrUtil.extend({}, hoverStl));

            rect.incremental = incremental;
            // PENDING
            if (incremental) {
                // Rect must use hover layer if it's incremental.
                rect.useHoverLayer = true;
            }

            group.add(rect);
            data.setItemGraphicEl(idx, rect);
        }
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
        var roamTransform = geo.getRoamTransform();
        rect.applyTransform(roamTransform);

        // Clamp on viewport
        var x = Math.max(rect.x, 0);
        var y = Math.max(rect.y, 0);
        var x2 = Math.min(rect.width + rect.x, api.getWidth());
        var y2 = Math.min(rect.height + rect.y, api.getHeight());
        var width = x2 - x;
        var height = y2 - y;

        var dims = [
            data.mapDimension('lng'),
            data.mapDimension('lat'),
            data.mapDimension('value')
        ];

        var points = data.mapArray(dims, function (lng, lat, value) {
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
    },

    dispose: function () {}
});
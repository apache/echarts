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

/* global Uint32Array, Float64Array, Float32Array */

import {__DEV__} from '../../config';
import SeriesModel from '../../model/Series';
import List from '../../data/List';
import { concatArray, mergeAll, map } from 'zrender/src/core/util';
import {encodeHTML} from '../../util/format';
import CoordinateSystem from '../../CoordinateSystem';

var Uint32Arr = typeof Uint32Array === 'undefined' ? Array : Uint32Array;
var Float64Arr = typeof Float64Array === 'undefined' ? Array : Float64Array;

function compatEc2(seriesOpt) {
    var data = seriesOpt.data;
    if (data && data[0] && data[0][0] && data[0][0].coord) {
        if (__DEV__) {
            console.warn('Lines data configuration has been changed to'
                + ' { coords:[[1,2],[2,3]] }');
        }
        seriesOpt.data = map(data, function (itemOpt) {
            var coords = [
                itemOpt[0].coord, itemOpt[1].coord
            ];
            var target = {
                coords: coords
            };
            if (itemOpt[0].name) {
                target.fromName = itemOpt[0].name;
            }
            if (itemOpt[1].name) {
                target.toName = itemOpt[1].name;
            }
            return mergeAll([target, itemOpt[0], itemOpt[1]]);
        });
    }
}

var LinesSeries = SeriesModel.extend({

    type: 'series.lines',

    dependencies: ['grid', 'polar'],

    visualColorAccessPath: 'lineStyle.color',

    init: function (option) {
        // The input data may be null/undefined.
        option.data = option.data || [];

        // Not using preprocessor because mergeOption may not have series.type
        compatEc2(option);

        var result = this._processFlatCoordsArray(option.data);
        this._flatCoords = result.flatCoords;
        this._flatCoordsOffset = result.flatCoordsOffset;
        if (result.flatCoords) {
            option.data = new Float32Array(result.count);
        }

        LinesSeries.superApply(this, 'init', arguments);
    },

    mergeOption: function (option) {

        compatEc2(option);

        if (option.data) {
            // Only update when have option data to merge.
            var result = this._processFlatCoordsArray(option.data);
            this._flatCoords = result.flatCoords;
            this._flatCoordsOffset = result.flatCoordsOffset;
            if (result.flatCoords) {
                option.data = new Float32Array(result.count);
            }
        }

        LinesSeries.superApply(this, 'mergeOption', arguments);
    },

    appendData: function (params) {
        var result = this._processFlatCoordsArray(params.data);
        if (result.flatCoords) {
            if (!this._flatCoords) {
                this._flatCoords = result.flatCoords;
                this._flatCoordsOffset = result.flatCoordsOffset;
            }
            else {
                this._flatCoords = concatArray(this._flatCoords, result.flatCoords);
                this._flatCoordsOffset = concatArray(this._flatCoordsOffset, result.flatCoordsOffset);
            }
            params.data = new Float32Array(result.count);
        }

        this.getRawData().appendData(params.data);
    },

    _getCoordsFromItemModel: function (idx) {
        var itemModel = this.getData().getItemModel(idx);
        var coords = (itemModel.option instanceof Array)
            ? itemModel.option : itemModel.getShallow('coords');

        if (__DEV__) {
            if (!(coords instanceof Array && coords.length > 0 && coords[0] instanceof Array)) {
                throw new Error(
                    'Invalid coords ' + JSON.stringify(coords) + '. Lines must have 2d coords array in data item.'
                );
            }
        }
        return coords;
    },

    getLineCoordsCount: function (idx) {
        if (this._flatCoordsOffset) {
            return this._flatCoordsOffset[idx * 2 + 1];
        }
        else {
            return this._getCoordsFromItemModel(idx).length;
        }
    },

    getLineCoords: function (idx, out) {
        if (this._flatCoordsOffset) {
            var offset = this._flatCoordsOffset[idx * 2];
            var len = this._flatCoordsOffset[idx * 2 + 1];
            for (var i = 0; i < len; i++) {
                out[i] = out[i] || [];
                out[i][0] = this._flatCoords[offset + i * 2];
                out[i][1] = this._flatCoords[offset + i * 2 + 1];
            }
            return len;
        }
        else {
            var coords = this._getCoordsFromItemModel(idx);
            for (var i = 0; i < coords.length; i++) {
                out[i] = out[i] || [];
                out[i][0] = coords[i][0];
                out[i][1] = coords[i][1];
            }
            return coords.length;
        }
    },

    _processFlatCoordsArray: function (data) {
        var startOffset = 0;
        if (this._flatCoords) {
            startOffset = this._flatCoords.length;
        }
        // Stored as a typed array. In format
        // Points Count(2) | x | y | x | y | Points Count(3) | x |  y | x | y | x | y |
        if (typeof data[0] === 'number') {
            var len = data.length;
            // Store offset and len of each segment
            var coordsOffsetAndLenStorage = new Uint32Arr(len);
            var coordsStorage = new Float64Arr(len);
            var coordsCursor = 0;
            var offsetCursor = 0;
            var dataCount = 0;
            for (var i = 0; i < len;) {
                dataCount++;
                var count = data[i++];
                // Offset
                coordsOffsetAndLenStorage[offsetCursor++] = coordsCursor + startOffset;
                // Len
                coordsOffsetAndLenStorage[offsetCursor++] = count;
                for (var k = 0; k < count; k++) {
                    var x = data[i++];
                    var y = data[i++];
                    coordsStorage[coordsCursor++] = x;
                    coordsStorage[coordsCursor++] = y;

                    if (i > len) {
                        if (__DEV__) {
                            throw new Error('Invalid data format.');
                        }
                    }
                }
            }

            return {
                flatCoordsOffset: new Uint32Array(coordsOffsetAndLenStorage.buffer, 0, offsetCursor),
                flatCoords: coordsStorage,
                count: dataCount
            };
        }

        return {
            flatCoordsOffset: null,
            flatCoords: null,
            count: data.length
        };
    },

    getInitialData: function (option, ecModel) {
        if (__DEV__) {
            var CoordSys = CoordinateSystem.get(option.coordinateSystem);
            if (!CoordSys) {
                throw new Error('Unkown coordinate system ' + option.coordinateSystem);
            }
        }

        var lineData = new List(['value'], this);
        lineData.hasItemOption = false;

        lineData.initData(option.data, [], function (dataItem, dimName, dataIndex, dimIndex) {
            // dataItem is simply coords
            if (dataItem instanceof Array) {
                return NaN;
            }
            else {
                lineData.hasItemOption = true;
                var value = dataItem.value;
                if (value != null) {
                    return value instanceof Array ? value[dimIndex] : value;
                }
            }
        });

        return lineData;
    },

    formatTooltip: function (dataIndex) {
        var data = this.getData();
        var itemModel = data.getItemModel(dataIndex);
        var name = itemModel.get('name');
        if (name) {
            return name;
        }
        var fromName = itemModel.get('fromName');
        var toName = itemModel.get('toName');
        var html = [];
        fromName != null && html.push(fromName);
        toName != null && html.push(toName);

        return encodeHTML(html.join(' > '));
    },

    preventIncremental: function () {
        return !!this.get('effect.show');
    },

    getProgressive: function () {
        var progressive = this.option.progressive;
        if (progressive == null) {
            return this.option.large ? 1e4 : this.get('progressive');
        }
        return progressive;
    },

    getProgressiveThreshold: function () {
        var progressiveThreshold = this.option.progressiveThreshold;
        if (progressiveThreshold == null) {
            return this.option.large ? 2e4 : this.get('progressiveThreshold');
        }
        return progressiveThreshold;
    },

    defaultOption: {
        coordinateSystem: 'geo',
        zlevel: 0,
        z: 2,
        legendHoverLink: true,

        hoverAnimation: true,
        // Cartesian coordinate system
        xAxisIndex: 0,
        yAxisIndex: 0,

        symbol: ['none', 'none'],
        symbolSize: [10, 10],
        // Geo coordinate system
        geoIndex: 0,

        effect: {
            show: false,
            period: 4,
            // Animation delay. support callback
            // delay: 0,
            // If move with constant speed px/sec
            // period will be ignored if this property is > 0,
            constantSpeed: 0,
            symbol: 'circle',
            symbolSize: 3,
            loop: true,
            // Length of trail, 0 - 1
            trailLength: 0.2
            // Same with lineStyle.color
            // color
        },

        large: false,
        // Available when large is true
        largeThreshold: 2000,

        // If lines are polyline
        // polyline not support curveness, label, animation
        polyline: false,

        // If clip the overflow.
        // Available when coordinateSystem is cartesian or polar.
        clip: true,

        label: {
            show: false,
            position: 'end'
            // distance: 5,
            // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
        },

        lineStyle: {
            opacity: 0.5
        }
    }
});

export default LinesSeries;

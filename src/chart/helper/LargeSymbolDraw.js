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

// TODO Batch by color

import * as graphic from '../../util/graphic';
import {createSymbol} from '../../util/symbol';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';

var BOOST_SIZE_THRESHOLD = 4;

var LargeSymbolPath = graphic.extendShape({

    shape: {
        points: null
    },

    symbolProxy: null,

    buildPath: function (path, shape) {
        var points = shape.points;
        var size = shape.size;

        var symbolProxy = this.symbolProxy;
        var symbolProxyShape = symbolProxy.shape;
        var ctx = path.getContext ? path.getContext() : path;
        var canBoost = ctx && size[0] < BOOST_SIZE_THRESHOLD;

        // Do draw in afterBrush.
        if (canBoost) {
            return;
        }

        for (var i = 0; i < points.length;) {
            var x = points[i++];
            var y = points[i++];

            if (isNaN(x) || isNaN(y)) {
                continue;
            }

            symbolProxyShape.x = x - size[0] / 2;
            symbolProxyShape.y = y - size[1] / 2;
            symbolProxyShape.width = size[0];
            symbolProxyShape.height = size[1];

            symbolProxy.buildPath(path, symbolProxyShape, true);
        }
    },

    afterBrush: function (ctx) {
        var shape = this.shape;
        var points = shape.points;
        var size = shape.size;
        var canBoost = size[0] < BOOST_SIZE_THRESHOLD;

        if (!canBoost) {
            return;
        }

        this.setTransform(ctx);
        // PENDING If style or other canvas status changed?
        for (var i = 0; i < points.length;) {
            var x = points[i++];
            var y = points[i++];
            if (isNaN(x) || isNaN(y)) {
                continue;
            }
            // fillRect is faster than building a rect path and draw.
            // And it support light globalCompositeOperation.
            ctx.fillRect(
                x - size[0] / 2, y - size[1] / 2,
                size[0], size[1]
            );
        }

        this.restoreTransform(ctx);
    },

    findDataIndex: function (x, y) {
        // TODO ???
        // Consider transform

        var shape = this.shape;
        var points = shape.points;
        var size = shape.size;

        var w = Math.max(size[0], 4);
        var h = Math.max(size[1], 4);

        // Not consider transform
        // Treat each element as a rect
        // top down traverse
        for (var idx = points.length / 2 - 1; idx >= 0; idx--) {
            var i = idx * 2;
            var x0 = points[i] - w / 2;
            var y0 = points[i + 1] - h / 2;
            if (x >= x0 && y >= y0 && x <= x0 + w && y <= y0 + h) {
                return idx;
            }
        }

        return -1;
    }
});

function LargeSymbolDraw() {
    this.group = new graphic.Group();
}

var largeSymbolProto = LargeSymbolDraw.prototype;

largeSymbolProto.isPersistent = function () {
    return !this._incremental;
};

/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 */
largeSymbolProto.updateData = function (data) {
    this.group.removeAll();
    var symbolEl = new LargeSymbolPath({
        rectHover: true,
        cursor: 'default'
    });

    symbolEl.setShape({
        points: data.getLayout('symbolPoints')
    });
    this._setCommon(symbolEl, data);
    this.group.add(symbolEl);

    this._incremental = null;
};

largeSymbolProto.updateLayout = function (data) {
    if (this._incremental) {
        return;
    }

    var points = data.getLayout('symbolPoints');
    this.group.eachChild(function (child) {
        if (child.startIndex != null) {
            var len = (child.endIndex - child.startIndex) * 2;
            var byteOffset = child.startIndex * 4 * 2;
            points = new Float32Array(points.buffer, byteOffset, len);
        }
        child.setShape('points', points);
    });
};

largeSymbolProto.incrementalPrepareUpdate = function (data) {
    this.group.removeAll();

    this._clearIncremental();
    // Only use incremental displayables when data amount is larger than 2 million.
    // PENDING Incremental data?
    if (data.count() > 2e6) {
        if (!this._incremental) {
            this._incremental = new IncrementalDisplayable({
                silent: true
            });
        }
        this.group.add(this._incremental);
    }
    else {
        this._incremental = null;
    }
};

largeSymbolProto.incrementalUpdate = function (taskParams, data) {
    var symbolEl;
    if (this._incremental) {
        symbolEl = new LargeSymbolPath();
        this._incremental.addDisplayable(symbolEl, true);
    }
    else {
        symbolEl = new LargeSymbolPath({
            rectHover: true,
            cursor: 'default',
            startIndex: taskParams.start,
            endIndex: taskParams.end
        });
        symbolEl.incremental = true;
        this.group.add(symbolEl);
    }

    symbolEl.setShape({
        points: data.getLayout('symbolPoints')
    });
    this._setCommon(symbolEl, data, !!this._incremental);
};

largeSymbolProto._setCommon = function (symbolEl, data, isIncremental) {
    var hostModel = data.hostModel;

    // TODO
    // if (data.hasItemVisual.symbolSize) {
    //     // TODO typed array?
    //     symbolEl.setShape('sizes', data.mapArray(
    //         function (idx) {
    //             var size = data.getItemVisual(idx, 'symbolSize');
    //             return (size instanceof Array) ? size : [size, size];
    //         }
    //     ));
    // }
    // else {
    var size = data.getVisual('symbolSize');
    symbolEl.setShape('size', (size instanceof Array) ? size : [size, size]);
    // }

    // Create symbolProxy to build path for each data
    symbolEl.symbolProxy = createSymbol(
        data.getVisual('symbol'), 0, 0, 0, 0
    );
    // Use symbolProxy setColor method
    symbolEl.setColor = symbolEl.symbolProxy.setColor;

    var extrudeShadow = symbolEl.shape.size[0] < BOOST_SIZE_THRESHOLD;
    symbolEl.useStyle(
        // Draw shadow when doing fillRect is extremely slow.
        hostModel.getModel('itemStyle').getItemStyle(extrudeShadow ? ['color', 'shadowBlur', 'shadowColor'] : ['color'])
    );

    var visualColor = data.getVisual('color');
    if (visualColor) {
        symbolEl.setColor(visualColor);
    }

    if (!isIncremental) {
        // Enable tooltip
        // PENDING May have performance issue when path is extremely large
        symbolEl.seriesIndex = hostModel.seriesIndex;
        symbolEl.on('mousemove', function (e) {
            symbolEl.dataIndex = null;
            var dataIndex = symbolEl.findDataIndex(e.offsetX, e.offsetY);
            if (dataIndex >= 0) {
                // Provide dataIndex for tooltip
                symbolEl.dataIndex = dataIndex + (symbolEl.startIndex || 0);
            }
        });
    }
};

largeSymbolProto.remove = function () {
    this._clearIncremental();
    this._incremental = null;
    this.group.removeAll();
};

largeSymbolProto._clearIncremental = function () {
    var incremental = this._incremental;
    if (incremental) {
        incremental.clearDisplaybles();
    }
};

export default LargeSymbolDraw;
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

import * as graphic from '../../util/graphic';
import * as zrUtil from 'zrender/src/core/util';
import ChartView from '../../view/Chart';

var DEFAULT_SMOOTH = 0.3;

var ParallelView = ChartView.extend({

    type: 'parallel',

    init: function () {

        /**
         * @type {module:zrender/container/Group}
         * @private
         */
        this._dataGroup = new graphic.Group();

        this.group.add(this._dataGroup);

        /**
         * @type {module:echarts/data/List}
         */
        this._data;

        /**
         * @type {boolean}
         */
        this._initialized;
    },

    /**
     * @override
     */
    render: function (seriesModel, ecModel, api, payload) {
        var dataGroup = this._dataGroup;
        var data = seriesModel.getData();
        var oldData = this._data;
        var coordSys = seriesModel.coordinateSystem;
        var dimensions = coordSys.dimensions;
        var seriesScope = makeSeriesScope(seriesModel);

        data.diff(oldData)
            .add(add)
            .update(update)
            .remove(remove)
            .execute();

        function add(newDataIndex) {
            var line = addEl(data, dataGroup, newDataIndex, dimensions, coordSys);
            updateElCommon(line, data, newDataIndex, seriesScope);
        }

        function update(newDataIndex, oldDataIndex) {
            var line = oldData.getItemGraphicEl(oldDataIndex);
            var points = createLinePoints(data, newDataIndex, dimensions, coordSys);
            data.setItemGraphicEl(newDataIndex, line);
            var animationModel = (payload && payload.animation === false) ? null : seriesModel;
            graphic.updateProps(line, {shape: {points: points}}, animationModel, newDataIndex);

            updateElCommon(line, data, newDataIndex, seriesScope);
        }

        function remove(oldDataIndex) {
            var line = oldData.getItemGraphicEl(oldDataIndex);
            dataGroup.remove(line);
        }

        // First create
        if (!this._initialized) {
            this._initialized = true;
            var clipPath = createGridClipShape(
                coordSys, seriesModel, function () {
                    // Callback will be invoked immediately if there is no animation
                    setTimeout(function () {
                        dataGroup.removeClipPath();
                    });
                }
            );
            dataGroup.setClipPath(clipPath);
        }

        this._data = data;
    },

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        this._initialized = true;
        this._data = null;
        this._dataGroup.removeAll();
    },

    incrementalRender: function (taskParams, seriesModel, ecModel) {
        var data = seriesModel.getData();
        var coordSys = seriesModel.coordinateSystem;
        var dimensions = coordSys.dimensions;
        var seriesScope = makeSeriesScope(seriesModel);

        for (var dataIndex = taskParams.start; dataIndex < taskParams.end; dataIndex++) {
            var line = addEl(data, this._dataGroup, dataIndex, dimensions, coordSys);
            line.incremental = true;
            updateElCommon(line, data, dataIndex, seriesScope);
        }
    },

    dispose: function () {},

    // _renderForProgressive: function (seriesModel) {
    //     var dataGroup = this._dataGroup;
    //     var data = seriesModel.getData();
    //     var oldData = this._data;
    //     var coordSys = seriesModel.coordinateSystem;
    //     var dimensions = coordSys.dimensions;
    //     var option = seriesModel.option;
    //     var progressive = option.progressive;
    //     var smooth = option.smooth ? SMOOTH : null;

    //     // In progressive animation is disabled, so use simple data diff,
    //     // which effects performance less.
    //     // (Typically performance for data with length 7000+ like:
    //     // simpleDiff: 60ms, addEl: 184ms,
    //     // in RMBP 2.4GHz intel i7, OSX 10.9 chrome 50.0.2661.102 (64-bit))
    //     if (simpleDiff(oldData, data, dimensions)) {
    //         dataGroup.removeAll();
    //         data.each(function (dataIndex) {
    //             addEl(data, dataGroup, dataIndex, dimensions, coordSys);
    //         });
    //     }

    //     updateElCommon(data, progressive, smooth);

    //     // Consider switch between progressive and not.
    //     data.__plProgressive = true;
    //     this._data = data;
    // },

    /**
     * @override
     */
    remove: function () {
        this._dataGroup && this._dataGroup.removeAll();
        this._data = null;
    }
});

function createGridClipShape(coordSys, seriesModel, cb) {
    var parallelModel = coordSys.model;
    var rect = coordSys.getRect();
    var rectEl = new graphic.Rect({
        shape: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        }
    });

    var dim = parallelModel.get('layout') === 'horizontal' ? 'width' : 'height';
    rectEl.setShape(dim, 0);
    graphic.initProps(rectEl, {
        shape: {
            width: rect.width,
            height: rect.height
        }
    }, seriesModel, cb);
    return rectEl;
}

function createLinePoints(data, dataIndex, dimensions, coordSys) {
    var points = [];
    for (var i = 0; i < dimensions.length; i++) {
        var dimName = dimensions[i];
        var value = data.get(data.mapDimension(dimName), dataIndex);
        if (!isEmptyValue(value, coordSys.getAxis(dimName).type)) {
            points.push(coordSys.dataToPoint(value, dimName));
        }
    }
    return points;
}

function addEl(data, dataGroup, dataIndex, dimensions, coordSys) {
    var points = createLinePoints(data, dataIndex, dimensions, coordSys);
    var line = new graphic.Polyline({
        shape: {points: points},
        silent: true,
        z2: 10
    });
    dataGroup.add(line);
    data.setItemGraphicEl(dataIndex, line);
    return line;
}

function makeSeriesScope(seriesModel) {
    var smooth = seriesModel.get('smooth', true);
    smooth === true && (smooth = DEFAULT_SMOOTH);
    return {
        lineStyle: seriesModel.getModel('lineStyle').getLineStyle(),
        smooth: smooth != null ? smooth : DEFAULT_SMOOTH
    };
}

function updateElCommon(el, data, dataIndex, seriesScope) {
    var lineStyle = seriesScope.lineStyle;

    if (data.hasItemOption) {
        var lineStyleModel = data.getItemModel(dataIndex).getModel('lineStyle');
        lineStyle = lineStyleModel.getLineStyle();
    }

    el.useStyle(lineStyle);

    var elStyle = el.style;
    elStyle.fill = null;
    // lineStyle.color have been set to itemVisual in module:echarts/visual/seriesColor.
    elStyle.stroke = data.getItemVisual(dataIndex, 'color');
    // lineStyle.opacity have been set to itemVisual in parallelVisual.
    elStyle.opacity = data.getItemVisual(dataIndex, 'opacity');

    seriesScope.smooth && (el.shape.smooth = seriesScope.smooth);
}

// function simpleDiff(oldData, newData, dimensions) {
//     var oldLen;
//     if (!oldData
//         || !oldData.__plProgressive
//         || (oldLen = oldData.count()) !== newData.count()
//     ) {
//         return true;
//     }

//     var dimLen = dimensions.length;
//     for (var i = 0; i < oldLen; i++) {
//         for (var j = 0; j < dimLen; j++) {
//             if (oldData.get(dimensions[j], i) !== newData.get(dimensions[j], i)) {
//                 return true;
//             }
//         }
//     }

//     return false;
// }

// FIXME
// 公用方法?
function isEmptyValue(val, axisType) {
    return axisType === 'category'
        ? val == null
        : (val == null || isNaN(val)); // axisType === 'value'
}

export default ParallelView;
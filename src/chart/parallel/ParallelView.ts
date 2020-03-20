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
import ChartView from '../../view/Chart';
import List from '../../data/List';
import ParallelSeriesModel, { ParallelSeriesDataItemOption } from './ParallelSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { StageHandlerProgressParams, ParsedValue, Payload } from '../../util/types';
import Parallel from '../../coord/parallel/Parallel';
import { StyleProps } from 'zrender/src/graphic/Style';
import { OptionAxisType } from '../../coord/axisCommonTypes';

const DEFAULT_SMOOTH = 0.3;

interface ParallelDrawSeriesScope {
    smooth: number
    lineStyle: StyleProps
}
class ParallelView extends ChartView {
    static type = 'parallel';
    type = ParallelView.type;

    private _dataGroup = new graphic.Group();

    private _data: List;

    private _initialized = false;

    init() {
        this.group.add(this._dataGroup);
    }

    /**
     * @override
     */
    render(
        seriesModel: ParallelSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload & {
            animation?: boolean
        }
    ) {
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

        function add(newDataIndex: number) {
            var line = addEl(data, dataGroup, newDataIndex, dimensions, coordSys);
            updateElCommon(line, data, newDataIndex, seriesScope);
        }

        function update(newDataIndex: number, oldDataIndex: number) {
            var line = oldData.getItemGraphicEl(oldDataIndex) as graphic.Polyline;
            var points = createLinePoints(data, newDataIndex, dimensions, coordSys);
            data.setItemGraphicEl(newDataIndex, line);
            var animationModel = (payload && payload.animation === false) ? null : seriesModel;
            graphic.updateProps(line, {shape: {points: points}}, animationModel, newDataIndex);

            updateElCommon(line, data, newDataIndex, seriesScope);
        }

        function remove(oldDataIndex: number) {
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
    }

    incrementalPrepareRender(seriesModel: ParallelSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this._initialized = true;
        this._data = null;
        this._dataGroup.removeAll();
    }

    incrementalRender(taskParams: StageHandlerProgressParams, seriesModel: ParallelSeriesModel, ecModel: GlobalModel) {
        var data = seriesModel.getData();
        var coordSys = seriesModel.coordinateSystem;
        var dimensions = coordSys.dimensions;
        var seriesScope = makeSeriesScope(seriesModel);

        for (var dataIndex = taskParams.start; dataIndex < taskParams.end; dataIndex++) {
            var line = addEl(data, this._dataGroup, dataIndex, dimensions, coordSys);
            line.incremental = true;
            updateElCommon(line, data, dataIndex, seriesScope);
        }
    }

    /**
     * @override
     */
    remove() {
        this._dataGroup && this._dataGroup.removeAll();
        this._data = null;
    }
}

function createGridClipShape(coordSys: Parallel, seriesModel: ParallelSeriesModel, cb: () => void) {
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

function createLinePoints(data: List, dataIndex: number, dimensions: string[], coordSys: Parallel) {
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

function addEl(data: List, dataGroup: graphic.Group, dataIndex: number, dimensions: string[], coordSys: Parallel) {
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

function makeSeriesScope(seriesModel: ParallelSeriesModel): ParallelDrawSeriesScope {
    var smooth = seriesModel.get('smooth', true);
    smooth === true && (smooth = DEFAULT_SMOOTH);

    return {
        lineStyle: seriesModel.getModel('lineStyle').getLineStyle(),
        smooth: smooth != null ? +smooth : DEFAULT_SMOOTH
    };
}

function updateElCommon(
    el: graphic.Polyline,
    data: List,
    dataIndex: number,
    seriesScope: ParallelDrawSeriesScope
) {
    var lineStyle = seriesScope.lineStyle;

    if (data.hasItemOption) {
        var lineStyleModel = data.getItemModel<ParallelSeriesDataItemOption>(dataIndex)
            .getModel('lineStyle');
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

// FIXME put in common util?
function isEmptyValue(val: ParsedValue, axisType: OptionAxisType) {
    return axisType === 'category'
        ? val == null
        : (val == null || isNaN(val as number)); // axisType === 'value'
}

ChartView.registerClass(ParallelView);

export default ParallelView;

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
import { OptionAxisType } from '../../coord/axisCommonTypes';
import { PathStyleProps } from 'zrender/src/graphic/Path';

const DEFAULT_SMOOTH = 0.3;

interface ParallelDrawSeriesScope {
    smooth: number
    lineStyle: PathStyleProps
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
        let dataGroup = this._dataGroup;
        let data = seriesModel.getData();
        let oldData = this._data;
        let coordSys = seriesModel.coordinateSystem;
        let dimensions = coordSys.dimensions;
        let seriesScope = makeSeriesScope(seriesModel);

        data.diff(oldData)
            .add(add)
            .update(update)
            .remove(remove)
            .execute();

        function add(newDataIndex: number) {
            let line = addEl(data, dataGroup, newDataIndex, dimensions, coordSys);
            updateElCommon(line, data, newDataIndex, seriesScope);
        }

        function update(newDataIndex: number, oldDataIndex: number) {
            let line = oldData.getItemGraphicEl(oldDataIndex) as graphic.Polyline;
            let points = createLinePoints(data, newDataIndex, dimensions, coordSys);
            data.setItemGraphicEl(newDataIndex, line);
            let animationModel = (payload && payload.animation === false) ? null : seriesModel;
            graphic.updateProps(line, {shape: {points: points}}, animationModel, newDataIndex);

            updateElCommon(line, data, newDataIndex, seriesScope);
        }

        function remove(oldDataIndex: number) {
            let line = oldData.getItemGraphicEl(oldDataIndex);
            dataGroup.remove(line);
        }

        // First create
        if (!this._initialized) {
            this._initialized = true;
            let clipPath = createGridClipShape(
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
        let data = seriesModel.getData();
        let coordSys = seriesModel.coordinateSystem;
        let dimensions = coordSys.dimensions;
        let seriesScope = makeSeriesScope(seriesModel);

        for (let dataIndex = taskParams.start; dataIndex < taskParams.end; dataIndex++) {
            let line = addEl(data, this._dataGroup, dataIndex, dimensions, coordSys);
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
    let parallelModel = coordSys.model;
    let rect = coordSys.getRect();
    let rectEl = new graphic.Rect({
        shape: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        }
    });

    let dim = parallelModel.get('layout') === 'horizontal' ? 'width' as const : 'height' as const;
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
    let points = [];
    for (let i = 0; i < dimensions.length; i++) {
        let dimName = dimensions[i];
        let value = data.get(data.mapDimension(dimName), dataIndex);
        if (!isEmptyValue(value, coordSys.getAxis(dimName).type)) {
            points.push(coordSys.dataToPoint(value, dimName));
        }
    }
    return points;
}

function addEl(data: List, dataGroup: graphic.Group, dataIndex: number, dimensions: string[], coordSys: Parallel) {
    let points = createLinePoints(data, dataIndex, dimensions, coordSys);
    let line = new graphic.Polyline({
        shape: {points: points},
        silent: true,
        z2: 10
    });
    dataGroup.add(line);
    data.setItemGraphicEl(dataIndex, line);
    return line;
}

function makeSeriesScope(seriesModel: ParallelSeriesModel): ParallelDrawSeriesScope {
    let smooth = seriesModel.get('smooth', true);
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
    let lineStyle = seriesScope.lineStyle;

    if (data.hasItemOption) {
        let lineStyleModel = data.getItemModel<ParallelSeriesDataItemOption>(dataIndex)
            .getModel('lineStyle');
        lineStyle = lineStyleModel.getLineStyle();
    }

    el.useStyle(lineStyle);

    let elStyle = el.style;
    elStyle.fill = null;
    // lineStyle.color have been set to itemVisual in module:echarts/visual/seriesColor.
    elStyle.stroke = data.getItemVisual(dataIndex, 'color');
    // lineStyle.opacity have been set to itemVisual in parallelVisual.
    elStyle.opacity = data.getItemVisual(dataIndex, 'opacity');

    seriesScope.smooth && (el.shape.smooth = seriesScope.smooth);
}

// function simpleDiff(oldData, newData, dimensions) {
//     let oldLen;
//     if (!oldData
//         || !oldData.__plProgressive
//         || (oldLen = oldData.count()) !== newData.count()
//     ) {
//         return true;
//     }

//     let dimLen = dimensions.length;
//     for (let i = 0; i < oldLen; i++) {
//         for (let j = 0; j < dimLen; j++) {
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

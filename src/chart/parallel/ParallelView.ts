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
import { setStatesStylesFromModel, toggleHoverEmphasis } from '../../util/states';
import ChartView from '../../view/Chart';
import SeriesData from '../../data/SeriesData';
import ParallelSeriesModel, { ParallelSeriesDataItemOption } from './ParallelSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { StageHandlerProgressParams, ParsedValue, Payload } from '../../util/types';
import Parallel from '../../coord/parallel/Parallel';
import { OptionAxisType } from '../../coord/axisCommonTypes';
import { numericToNumber } from '../../util/number';
import { eqNaN } from 'zrender/src/core/util';
import { saveOldStyle } from '../../animation/basicTransition';
import Element from 'zrender/src/Element';

const DEFAULT_SMOOTH = 0.3;

interface ParallelDrawSeriesScope {
    smooth: number
}
class ParallelView extends ChartView {
    static type = 'parallel';
    type = ParallelView.type;

    private _dataGroup = new graphic.Group();

    private _data: SeriesData;

    private _initialized = false;

    private _progressiveEls: Element[];

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
        payload: Payload
    ) {

        // Clear previously rendered progressive elements.
        this._progressiveEls = null;

        const dataGroup = this._dataGroup;
        const data = seriesModel.getData();
        const oldData = this._data;
        const coordSys = seriesModel.coordinateSystem;
        const dimensions = coordSys.dimensions;
        const seriesScope = makeSeriesScope(seriesModel);

        data.diff(oldData)
            .add(add)
            .update(update)
            .remove(remove)
            .execute();

        function add(newDataIndex: number) {
            const line = addEl(data, dataGroup, newDataIndex, dimensions, coordSys);
            updateElCommon(line, data, newDataIndex, seriesScope);
        }

        function update(newDataIndex: number, oldDataIndex: number) {
            const line = oldData.getItemGraphicEl(oldDataIndex) as graphic.Polyline;

            const points = createLinePoints(data, newDataIndex, dimensions, coordSys);
            data.setItemGraphicEl(newDataIndex, line);

            graphic.updateProps(line, {shape: {points: points}}, seriesModel, newDataIndex);

            saveOldStyle(line);

            updateElCommon(line, data, newDataIndex, seriesScope);
        }

        function remove(oldDataIndex: number) {
            const line = oldData.getItemGraphicEl(oldDataIndex);
            dataGroup.remove(line);
        }

        // First create
        if (!this._initialized) {
            this._initialized = true;
            const clipPath = createGridClipShape(
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
        const data = seriesModel.getData();
        const coordSys = seriesModel.coordinateSystem;
        const dimensions = coordSys.dimensions;
        const seriesScope = makeSeriesScope(seriesModel);
        const progressiveEls: Element[] = this._progressiveEls = [];

        for (let dataIndex = taskParams.start; dataIndex < taskParams.end; dataIndex++) {
            const line = addEl(data, this._dataGroup, dataIndex, dimensions, coordSys);
            line.incremental = true;
            updateElCommon(line, data, dataIndex, seriesScope);
            progressiveEls.push(line);
        }
    }

    remove() {
        this._dataGroup && this._dataGroup.removeAll();
        this._data = null;
    }
}

function createGridClipShape(coordSys: Parallel, seriesModel: ParallelSeriesModel, cb: () => void) {
    const parallelModel = coordSys.model;
    const rect = coordSys.getRect();
    const rectEl = new graphic.Rect({
        shape: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        }
    });

    const dim = parallelModel.get('layout') === 'horizontal' ? 'width' as const : 'height' as const;
    rectEl.setShape(dim, 0);
    graphic.initProps(rectEl, {
        shape: {
            width: rect.width,
            height: rect.height
        }
    }, seriesModel, cb);
    return rectEl;
}

function createLinePoints(data: SeriesData, dataIndex: number, dimensions: string[], coordSys: Parallel) {
    const points = [];
    for (let i = 0; i < dimensions.length; i++) {
        const dimName = dimensions[i];
        const value = data.get(data.mapDimension(dimName), dataIndex);
        if (!isEmptyValue(value, coordSys.getAxis(dimName).type)) {
            points.push(coordSys.dataToPoint(value, dimName));
        }
    }
    return points;
}

function addEl(
    data: SeriesData, dataGroup: graphic.Group, dataIndex: number, dimensions: string[], coordSys: Parallel
) {
    const points = createLinePoints(data, dataIndex, dimensions, coordSys);
    const line = new graphic.Polyline({
        shape: {points: points},
        // silent: true,
        z2: 10
    });
    dataGroup.add(line);
    data.setItemGraphicEl(dataIndex, line);
    return line;
}

function makeSeriesScope(seriesModel: ParallelSeriesModel): ParallelDrawSeriesScope {
    let smooth = seriesModel.get('smooth', true);
    smooth === true && (smooth = DEFAULT_SMOOTH);
    smooth = numericToNumber(smooth);
    eqNaN(smooth) && (smooth = 0);

    return { smooth };
}

function updateElCommon(
    el: graphic.Polyline,
    data: SeriesData,
    dataIndex: number,
    seriesScope: ParallelDrawSeriesScope
) {
    el.useStyle(data.getItemVisual(dataIndex, 'style'));
    el.style.fill = null;
    el.setShape('smooth', seriesScope.smooth);

    const itemModel = data.getItemModel<ParallelSeriesDataItemOption>(dataIndex);
    const emphasisModel = itemModel.getModel('emphasis');
    setStatesStylesFromModel(el, itemModel, 'lineStyle');

    toggleHoverEmphasis(
        el, emphasisModel.get('focus'), emphasisModel.get('blurScope'), emphasisModel.get('disabled')
    );
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

export default ParallelView;

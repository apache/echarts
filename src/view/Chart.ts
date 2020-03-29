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

import {each} from 'zrender/src/core/util';
import Group from 'zrender/src/graphic/Group';
import * as componentUtil from '../util/component';
import * as clazzUtil from '../util/clazz';
import * as modelUtil from '../util/model';
import * as graphicUtil from '../util/graphic';
import {createTask, TaskResetCallbackReturn} from '../stream/task';
import createRenderPlanner from '../chart/helper/createRenderPlanner';
import SeriesModel from '../model/Series';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../ExtensionAPI';
import Element from 'zrender/src/Element';
import {
    Payload, ViewRootGroup, ECEvent, EventQueryItem,
    StageHandlerPlanReturn, DisplayState, StageHandlerProgressParams
} from '../util/types';
import { SeriesTaskContext, SeriesTask } from '../stream/Scheduler';
import List from '../data/List';
import { graphic } from '../export';

const inner = modelUtil.makeInner<{
    updateMethod: keyof ChartView
}, Payload>();
const renderPlanner = createRenderPlanner();

interface ChartView {
    /**
     * Rendering preparation in progressive mode.
     * Implement it if needed.
     */
    incrementalPrepareRender(
        seriesModel: SeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ): void;

    /**
     * Render in progressive mode.
     * Implement it if needed.
     * @param params See taskParams in `stream/task.js`
     */
    incrementalRender(
        params: StageHandlerProgressParams,
        seriesModel: SeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ): void;

    /**
     * Update transform directly.
     * Implement it if needed.
     */
    updateTransform(
        seriesModel: SeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ): void | {update: true};

    /**
     * The view contains the given point.
     * Implement it if needed.
     */
    containPoint(
        point: number[], seriesModel: SeriesModel
    ): boolean;

    /**
     * Pass only when return `true`.
     * Implement it if needed.
     */
    filterForExposedEvent(
        eventType: string, query: EventQueryItem, targetEl: Element, packedEvent: ECEvent
    ): boolean;
}
class ChartView {

    // [Caution]: for compat the previous "class extend"
    // publich and protected fields must be initialized on
    // prototype rather than in constructor. Otherwise the
    // subclass overrided filed will be overwritten by this
    // class. That is, they should not be initialized here.

    // @readonly
    type: string;

    readonly group: ViewRootGroup;

    readonly uid: string;

    readonly renderTask: SeriesTask;

    // ----------------------
    // Injectable properties
    // ----------------------
    __alive: boolean;
    __model: SeriesModel;
    __id: string;

    static protoInitialize = (function () {
        const proto = ChartView.prototype;
        proto.type = 'chart';
    })();


    constructor() {
        this.group = new Group();
        this.uid = componentUtil.getUID('viewChart');

        this.renderTask = createTask<SeriesTaskContext>({
            plan: renderTaskPlan,
            reset: renderTaskReset
        });
        this.renderTask.context = {view: this} as SeriesTaskContext;
    }

    init(ecModel: GlobalModel, api: ExtensionAPI): void {}

    render(seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {}

    /**
     * Highlight series or specified data item.
     */
    highlight(seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        toggleHighlight(seriesModel.getData(), payload, 'emphasis');
    }

    /**
     * Downplay series or specified data item.
     */
    downplay(seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        toggleHighlight(seriesModel.getData(), payload, 'normal');
    }

    /**
     * Remove self.
     */
    remove(ecModel: GlobalModel, api: ExtensionAPI): void {
        this.group.removeAll();
    }

    /**
     * Dispose self.
     */
    dispose(ecModel: GlobalModel, api: ExtensionAPI): void {}


    updateView(seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        this.render(seriesModel, ecModel, api, payload);
    }

    // FIXME never used?
    updateLayout(seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        this.render(seriesModel, ecModel, api, payload);
    }

    // FIXME never used?
    updateVisual(seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        this.render(seriesModel, ecModel, api, payload);
    }

    static markUpdateMethod(payload: Payload, methodName: keyof ChartView): void {
        inner(payload).updateMethod = methodName;
    }

    static registerClass: clazzUtil.ClassManager['registerClass'];
};


/**
 * Set state of single element
 */
function elSetState(el: Element, state: DisplayState, highlightDigit: number) {
    if (el) {
        state === 'emphasis' ? graphicUtil.enterEmphasis(el, highlightDigit)
            : graphicUtil.leaveEmphasis(el, highlightDigit);

        if (el.isGroup
            // Simple optimize.
            && !graphicUtil.isHighDownDispatcher(el)
        ) {
            for (let i = 0, len = (el as Group).childCount(); i < len; i++) {
                elSetState((el as Group).childAt(i), state, highlightDigit);
            }
        }
    }
}

function toggleHighlight(data: List, payload: Payload, state: DisplayState) {
    const dataIndex = modelUtil.queryDataIndex(data, payload);

    const highlightDigit = (payload && payload.highlightKey != null)
        ? graphicUtil.getHighlightDigit(payload.highlightKey)
        : null;

    if (dataIndex != null) {
        each(modelUtil.normalizeToArray(dataIndex), function (dataIdx) {
            elSetState(data.getItemGraphicEl(dataIdx), state, highlightDigit);
        });
    }
    else {
        data.eachItemGraphicEl(function (el) {
            elSetState(el, state, highlightDigit);
        });
    }
}

export type ChartViewConstructor = typeof ChartView
    & clazzUtil.ExtendableConstructor
    & clazzUtil.ClassManager;

clazzUtil.enableClassExtend(ChartView as ChartViewConstructor, ['dispose']);
clazzUtil.enableClassManagement(ChartView as ChartViewConstructor, {registerWhenExtend: true});


function renderTaskPlan(context: SeriesTaskContext): StageHandlerPlanReturn {
    return renderPlanner(context.model);
}

function renderTaskReset(context: SeriesTaskContext): TaskResetCallbackReturn<SeriesTaskContext> {
    const seriesModel = context.model;
    const ecModel = context.ecModel;
    const api = context.api;
    const payload = context.payload;
    // FIXME: remove updateView updateVisual
    const progressiveRender = seriesModel.pipelineContext.progressiveRender;
    const view = context.view;

    const updateMethod = payload && inner(payload).updateMethod;
    const methodName: keyof ChartView = progressiveRender
        ? 'incrementalPrepareRender'
        : (updateMethod && view[updateMethod])
        ? updateMethod
        // `appendData` is also supported when data amount
        // is less than progressive threshold.
        : 'render';

    if (methodName !== 'render') {
        (view[methodName] as any)(seriesModel, ecModel, api, payload);
    }

    return progressMethodMap[methodName];
}

const progressMethodMap: {[method: string]: TaskResetCallbackReturn<SeriesTaskContext>} = {
    incrementalPrepareRender: {
        progress: function (params: StageHandlerProgressParams, context: SeriesTaskContext): void {
            context.view.incrementalRender(
                params, context.model, context.ecModel, context.api, context.payload
            );
        }
    },
    render: {
        // Put view.render in `progress` to support appendData. But in this case
        // view.render should not be called in reset, otherwise it will be called
        // twise. Use `forceFirstProgress` to make sure that view.render is called
        // in any cases.
        forceFirstProgress: true,
        progress: function (params: StageHandlerProgressParams, context: SeriesTaskContext): void {
            context.view.render(
                context.model, context.ecModel, context.api, context.payload
            );
        }
    }
};

export default ChartView;

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
import { enterEmphasis, leaveEmphasis, getHighlightDigit, isHighDownDispatcher } from '../util/states';
import {createTask, TaskResetCallbackReturn} from '../core/task';
import createRenderPlanner from '../chart/helper/createRenderPlanner';
import SeriesModel from '../model/Series';
import GlobalModel from '../model/Global';
import ExtensionAPI from '../core/ExtensionAPI';
import Element from 'zrender/src/Element';
import {
    Payload, ViewRootGroup, ECActionEvent, EventQueryItem,
    StageHandlerPlanReturn, DisplayState, StageHandlerProgressParams, ECElementEvent
} from '../util/types';
import { SeriesTaskContext, SeriesTask } from '../core/Scheduler';
import SeriesData from '../data/SeriesData';
import { traverseElements } from '../util/graphic';
import { error } from '../util/log';

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
        eventType: string, query: EventQueryItem, targetEl: Element, packedEvent: ECActionEvent | ECElementEvent
    ): boolean;
}
class ChartView {

    // [Caution]: Because this class or desecendants can be used as `XXX.extend(subProto)`,
    // the class members must not be initialized in constructor or declaration place.
    // Otherwise there is bad case:
    //   class A {xxx = 1;}
    //   enableClassExtend(A);
    //   class B extends A {}
    //   var C = B.extend({xxx: 5});
    //   var c = new C();
    //   console.log(c.xxx); // expect 5 but always 1.

    // @readonly
    type: string;

    readonly group: ViewRootGroup;

    readonly uid: string;

    readonly renderTask: SeriesTask;

    /**
     * Ignore label line update in global stage. Will handle it in chart itself.
     * Used in pie / funnel
     */
    ignoreLabelLineUpdate: boolean;

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

    render(seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        if (__DEV__) {
            throw new Error('render method must been implemented');
        }
    }

    /**
     * Highlight series or specified data item.
     */
    highlight(seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        const data = seriesModel.getData(payload && payload.dataType);
        if (!data) {
            if (__DEV__) {
                error(`Unknown dataType ${payload.dataType}`);
            }
            return;
        }
        toggleHighlight(data, payload, 'emphasis');
    }

    /**
     * Downplay series or specified data item.
     */
    downplay(seriesModel: SeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        const data = seriesModel.getData(payload && payload.dataType);
        if (!data) {
            if (__DEV__) {
                error(`Unknown dataType ${payload.dataType}`);
            }
            return;
        }
        toggleHighlight(data, payload, 'normal');
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

    /**
     * Traverse the new rendered elements.
     *
     * It will traverse the new added element in progressive rendering.
     * And traverse all in normal rendering.
     */
    eachRendered(cb: (el: Element) => boolean | void) {
        traverseElements(this.group, cb);
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
    if (el && isHighDownDispatcher(el)) {
        (state === 'emphasis' ? enterEmphasis : leaveEmphasis)(el, highlightDigit);
    }
}

function toggleHighlight(data: SeriesData, payload: Payload, state: DisplayState) {
    const dataIndex = modelUtil.queryDataIndex(data, payload);

    const highlightDigit = (payload && payload.highlightKey != null)
        ? getHighlightDigit(payload.highlightKey)
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
clazzUtil.enableClassManagement(ChartView as ChartViewConstructor);


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

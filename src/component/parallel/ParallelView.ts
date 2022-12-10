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

import GlobalModel from '../../model/Global';
import ParallelModel, { ParallelCoordinateSystemOption } from '../../coord/parallel/ParallelModel';
import ExtensionAPI from '../../core/ExtensionAPI';
import ComponentView from '../../view/Component';
import { ElementEventName } from 'zrender/src/core/types';
import { ElementEvent } from 'zrender/src/Element';
import { ParallelAxisExpandPayload } from '../axis/parallelAxisAction';
import { each, bind, extend } from 'zrender/src/core/util';
import { ThrottleController, createOrUpdate, clear } from '../../util/throttle';

const CLICK_THRESHOLD = 5; // > 4

class ParallelView extends ComponentView {
    static type = 'parallel';
    readonly type = ParallelView.type;
    // @internal
    _model: ParallelModel;
    private _api: ExtensionAPI;
    // @internal
    _mouseDownPoint: number[];
    private _handlers: Partial<Record<ElementEventName, ElementEventHandler>>;
    render(parallelModel: ParallelModel, ecModel: GlobalModel, api: ExtensionAPI): void {
        this._model = parallelModel;
        this._api = api;
        if (!this._handlers) {
            this._handlers = {};
            each(handlers, function (handler: ElementEventHandler, eventName) {
                api.getZr().on(eventName, this._handlers[eventName] = bind(handler, this) as ElementEventHandler);
            }, this);
        }
        createOrUpdate(this, '_throttledDispatchExpand', parallelModel.get('axisExpandRate'), 'fixRate');
    }
    dispose(ecModel: GlobalModel, api: ExtensionAPI): void {
        clear(this, '_throttledDispatchExpand');
        each(this._handlers, function (handler: ElementEventHandler, eventName) {
            api.getZr().off(eventName, handler);
        });
        this._handlers = null;
    }
    /**
     * @internal
     * @param {Object} [opt] If null, cancel the last action triggering for debounce.
     */
    _throttledDispatchExpand(this: ParallelView, opt: Omit<ParallelAxisExpandPayload, 'type'>): void {
        this._dispatchExpand(opt);
    }
    /**
     * @internal
     */
    _dispatchExpand(opt: Omit<ParallelAxisExpandPayload, 'type'>) {
        opt && this._api.dispatchAction(extend({ type: 'parallelAxisExpand' }, opt));
    }
}
type ElementEventHandler = (this: ParallelView, e: ElementEvent) => void;
const handlers: Partial<Record<ElementEventName, ElementEventHandler>> = {
    mousedown: function (e) {
        if (checkTrigger(this, 'click')) {
            this._mouseDownPoint = [e.offsetX, e.offsetY];
        }
    },
    mouseup: function (e) {
        const mouseDownPoint = this._mouseDownPoint;
        if (checkTrigger(this, 'click') && mouseDownPoint) {
            const point = [e.offsetX, e.offsetY];
            const dist = Math.pow(mouseDownPoint[0] - point[0], 2)
                + Math.pow(mouseDownPoint[1] - point[1], 2);
            if (dist > CLICK_THRESHOLD) {
                return;
            }
            const result = this._model.coordinateSystem.getSlidedAxisExpandWindow([e.offsetX, e.offsetY]);
            result.behavior !== 'none' && this._dispatchExpand({
                axisExpandWindow: result.axisExpandWindow
            });
        }
        this._mouseDownPoint = null;
    },
    mousemove: function (e) {
        // Should do nothing when brushing.
        if (this._mouseDownPoint || !checkTrigger(this, 'mousemove')) {
            return;
        }
        const model = this._model;
        const result = model.coordinateSystem.getSlidedAxisExpandWindow([e.offsetX, e.offsetY]);
        const behavior = result.behavior;
        behavior === 'jump'
            && (this._throttledDispatchExpand as ParallelView['_throttledDispatchExpand'] & ThrottleController)
                .debounceNextCall(model.get('axisExpandDebounce'));
        this._throttledDispatchExpand(behavior === 'none'
            ? null // Cancel the last trigger, in case that mouse slide out of the area quickly.
            : {
                axisExpandWindow: result.axisExpandWindow,
                // Jumping uses animation, and sliding suppresses animation.
                animation: behavior === 'jump' ? null : {
                    duration: 0 // Disable animation.
                }
            });
    }
};
function checkTrigger(view: ParallelView, triggerOn: ParallelCoordinateSystemOption['axisExpandTriggerOn']): boolean {
    const model = view._model;
    return model.get('axisExpandable') && model.get('axisExpandTriggerOn') === triggerOn;
}

export default ParallelView;

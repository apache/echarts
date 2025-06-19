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

import Eventful from 'zrender/src/core/Eventful';
import * as eventTool from 'zrender/src/core/event';
import * as interactionMutex from './interactionMutex';
import { ZRenderType } from 'zrender/src/zrender';
import { ZRElementEvent, RoamOptionMixin, NullUndefined } from '../../util/types';
import { Bind3, isString, bind, defaults, extend, retrieve2 } from 'zrender/src/core/util';
import { makeInner } from '../../util/model';
import { retrieveZInfo } from '../../util/graphic';
import type Component from '../../model/Component';
import ExtensionAPI from '../../core/ExtensionAPI';
import { onIrrelevantElement } from './cursorHelper';
import Displayable from 'zrender/src/graphic/Displayable';


export interface RoamOption {
    zInfo: {
        // mandatory to provide z and zlevel and pointer checker criteria.
        component: Component
        z2?: number
    }
    triggerInfo: {
        roamTrigger: RoamOptionMixin['roamTrigger'] | NullUndefined
        // At present in all scenarios it can be supported.
        isInSelf: RoamPointerChecker
        // Required if clipping is supported
        isInClip?: RoamPointerChecker
    }
    api: ExtensionAPI

    zoomOnMouseWheel?: boolean | 'ctrl' | 'shift' | 'alt'
    moveOnMouseMove?: boolean | 'ctrl' | 'shift' | 'alt'
    moveOnMouseWheel?: boolean | 'ctrl' | 'shift' | 'alt'
    /**
     * If fixed the page when pan
     */
    preventDefaultMouseMove?: boolean
}
type RoamSetting = Omit<Required<RoamOption>, 'zInfo'> & {
    zInfoParsed: {
        component: Component
        z: number
        zlevel: number
        z2: number
    }
};

type RoamEventType = keyof RoamEventParams;

type RoamBehavior = 'zoomOnMouseWheel' | 'moveOnMouseMove' | 'moveOnMouseWheel';

export interface RoamEventParams {
    'zoom': {
        scale: number
        originX: number
        originY: number

        isAvailableBehavior: Bind3<typeof isAvailableBehavior, null, RoamBehavior, ZRElementEvent>
    }
    'scrollMove': {
        scrollDelta: number
        originX: number
        originY: number

        isAvailableBehavior: Bind3<typeof isAvailableBehavior, null, RoamBehavior, ZRElementEvent>
    }
    'pan': {
        dx: number
        dy: number
        oldX: number
        oldY: number
        newX: number
        newY: number

        isAvailableBehavior: Bind3<typeof isAvailableBehavior, null, RoamBehavior, ZRElementEvent>
    }
};
export type RoamEventDefinition = {
    [key in keyof RoamEventParams]: (params: RoamEventParams[key]) => void | undefined
};

type RoamPointerChecker = (e: ZRElementEvent, x: number, y: number) => boolean;

/**
 * An manager of zoom and pan(darg) hehavior.
 * But it is not responsible for updating the view, since view updates vary and can
 * not be handled in a uniform way.
 *
 * Note: regarding view updates:
 *  - Transformabe views typically use `coord/View` (e.g., geo and series.graph roaming).
 *    Some commonly used view update logic has been organized into `roamHelper.ts`.
 *  - Non-transformable views handle updates themselves, possibly involving re-layout,
 *    (e.g., treemap).
 *  - Some scenarios do not require transformation (e.g., dataZoom roaming for cartesian,
 *    brush component).
 */
class RoamController extends Eventful<RoamEventDefinition> {

    private _zr: ZRenderType;

    private _opt: Required<RoamSetting>;

    private _dragging: boolean;

    private _pinching: boolean;

    private _x: number;

    private _y: number;

    private _controlType: RoamOptionMixin['roam'];

    private _enabled: boolean;

    readonly enable: (this: this, controlType: RoamOptionMixin['roam'], opt: RoamOption) => void;

    readonly disable: () => void;


    constructor(zr: ZRenderType) {
        super();

        this._zr = zr;

        // Avoid two roamController bind the same handler
        const mousedownHandler = bind(this._mousedownHandler, this);
        const mousemoveHandler = bind(this._mousemoveHandler, this);
        const mouseupHandler = bind(this._mouseupHandler, this);
        const mousewheelHandler = bind(this._mousewheelHandler, this);
        const pinchHandler = bind(this._pinchHandler, this);

        /**
         * Notice:
         *  - only enable needed types. For example, if 'zoom'
         *    is not needed, 'zoom' should not be enabled, otherwise
         *    default mousewheel behaviour (scroll page) will be disabled.
         *  - This method is idempotent.
         */
        this.enable = function (controlType, rawOpt) {
            const zInfo = rawOpt.zInfo;
            const {z, zlevel} = retrieveZInfo(zInfo.component);
            const zInfoParsed = {
                component: zInfo.component,
                z,
                zlevel,
                // By default roam controller is the lowest z2 comparing to other elememts in a component.
                z2: retrieve2(zInfo.z2, -Infinity),
            };
            const triggerInfo = extend({}, rawOpt.triggerInfo);

            this._opt = defaults(extend({}, rawOpt), {
                zoomOnMouseWheel: true,
                moveOnMouseMove: true,
                // By default, wheel do not trigger move.
                moveOnMouseWheel: false,
                preventDefaultMouseMove: true,
                zInfoParsed,
                triggerInfo,
            });

            if (controlType == null) {
                controlType = true;
            }

            // A handy optimization for repeatedly calling `enable` during roaming.
            // Assert `disable` is only affected by `controlType`.
            if (!this._enabled || this._controlType !== controlType) {
                this._enabled = true;

                // Disable previous first
                this.disable();

                if (controlType === true || (controlType === 'move' || controlType === 'pan')) {
                    addRoamZrListener(zr, 'mousedown', mousedownHandler, zInfoParsed);
                    addRoamZrListener(zr, 'mousemove', mousemoveHandler, zInfoParsed);
                    addRoamZrListener(zr, 'mouseup', mouseupHandler, zInfoParsed);
                }
                if (controlType === true || (controlType === 'scale' || controlType === 'zoom')) {
                    addRoamZrListener(zr, 'mousewheel', mousewheelHandler, zInfoParsed);
                    addRoamZrListener(zr, 'pinch', pinchHandler, zInfoParsed);
                }
            }
        };

        this.disable = function () {
            this._enabled = false;
            removeRoamZrListener(zr, 'mousedown', mousedownHandler);
            removeRoamZrListener(zr, 'mousemove', mousemoveHandler);
            removeRoamZrListener(zr, 'mouseup', mouseupHandler);
            removeRoamZrListener(zr, 'mousewheel', mousewheelHandler);
            removeRoamZrListener(zr, 'pinch', pinchHandler);
        };
    }

    isDragging() {
        return this._dragging;
    }

    isPinching() {
        return this._pinching;
    }

    _checkPointer(e: ZRElementEvent, x: number, y: number): boolean {
        const opt = this._opt;

        const zInfoParsed = opt.zInfoParsed;
        if (onIrrelevantElement(e, opt.api, zInfoParsed.component)) {
            return false;
        };

        const triggerInfo = opt.triggerInfo;
        const roamTrigger = triggerInfo.roamTrigger;
        let inArea = false;
        if (roamTrigger === 'global') {
            inArea = true;
        }
        if (!inArea) {
            inArea = triggerInfo.isInSelf(e, x, y);
        }
        if (inArea && triggerInfo.isInClip && !triggerInfo.isInClip(e, x, y)) {
            inArea = false;
        }
        return inArea;
    }

    private _decideCursorStyle(
        e: ZRElementEvent,
        x: number,
        y: number,
        forReverse: boolean,
    ): string | NullUndefined {
        // If this cursor style decision is not strictly consistent with zrender,
        // it's fine - zr will set the cursor on the next mousemove.

        // This `grab` cursor style should take the lowest precedence. If the hovring element already
        // have a cursor, zrender will set it to be non-'default' before entering this handler.
        // (note, e.target is never silent, e.topTarget can be silent be irrelevant.)
        const target = e.target;
        if (!target && this._checkPointer(e, x, y)) {
            // To indicate users that this area is draggable, otherwise users probably cannot kwown
            // that when hovering out of the shape but still inside the bounding rect.
            return 'grab';
        }
        if (forReverse) {
            return target && (target as Displayable).cursor || 'default';
        }
    }

    dispose() {
        this.disable();
    }

    private _mousedownHandler(e: ZRElementEvent) {
        if (eventTool.isMiddleOrRightButtonOnMouseUpDown(e)
            || eventConsumed(e)
        ) {
            return;
        }

        let el = e.target;
        while (el) {
            if (el.draggable) {
                return;
            }
            // check if host is draggable
            el = el.__hostTarget || el.parent;
        }

        const x = e.offsetX;
        const y = e.offsetY;

        // To determine dragging start, only by checking on mosedown, but not mousemove.
        // Mouse can be out of target when mouse moving.
        if (this._checkPointer(e, x, y)) {
            this._x = x;
            this._y = y;
            this._dragging = true;
        }
    }

    private _mousemoveHandler(e: ZRElementEvent) {
        const zr = this._zr;
        if (e.gestureEvent === 'pinch'
            || interactionMutex.isTaken(zr, 'globalPan')
            || eventConsumed(e)
        ) {
            return;
        }

        const x = e.offsetX;
        const y = e.offsetY;

        if (!this._dragging
            || !isAvailableBehavior('moveOnMouseMove', e, this._opt)
        ) {
            const cursorStyle = this._decideCursorStyle(e, x, y, false);
            if (cursorStyle) {
                zr.setCursorStyle(cursorStyle);
            }
            return;
        }

        zr.setCursorStyle('grabbing');

        const oldX = this._x;
        const oldY = this._y;

        const dx = x - oldX;
        const dy = y - oldY;

        this._x = x;
        this._y = y;

        if (this._opt.preventDefaultMouseMove) {
            eventTool.stop(e.event);
        }
        (e as RoamControllerZREventExtend).__ecRoamConsumed = true;

        trigger(this, 'pan', 'moveOnMouseMove', e, {
            dx: dx, dy: dy, oldX: oldX, oldY: oldY, newX: x, newY: y, isAvailableBehavior: null
        });
    }

    private _mouseupHandler(e: ZRElementEvent) {
        if (eventConsumed(e)) {
            return;
        }
        const zr = this._zr;
        if (!eventTool.isMiddleOrRightButtonOnMouseUpDown(e)) {
            this._dragging = false;

            const cursorStyle = this._decideCursorStyle(e, e.offsetX, e.offsetY, true);
            if (cursorStyle) {
                zr.setCursorStyle(cursorStyle);
            }
        }
    }

    private _mousewheelHandler(e: ZRElementEvent) {
        if (eventConsumed(e)) {
            return;
        }

        const shouldZoom = isAvailableBehavior('zoomOnMouseWheel', e, this._opt);
        const shouldMove = isAvailableBehavior('moveOnMouseWheel', e, this._opt);
        const wheelDelta = e.wheelDelta;
        const absWheelDeltaDelta = Math.abs(wheelDelta);
        const originX = e.offsetX;
        const originY = e.offsetY;

        // wheelDelta maybe -0 in chrome mac.
        if (wheelDelta === 0 || (!shouldZoom && !shouldMove)) {
            return;
        }

        // If both `shouldZoom` and `shouldMove` is true, trigger
        // their event both, and the final behavior is determined
        // by event listener themselves.

        if (shouldZoom) {
            // Convenience:
            // Mac and VM Windows on Mac: scroll up: zoom out.
            // Windows: scroll up: zoom in.

            // FIXME: Should do more test in different environment.
            // wheelDelta is too complicated in difference nvironment
            // (https://developer.mozilla.org/en-US/docs/Web/Events/mousewheel),
            // although it has been normallized by zrender.
            // wheelDelta of mouse wheel is bigger than touch pad.
            const factor = absWheelDeltaDelta > 3 ? 1.4 : absWheelDeltaDelta > 1 ? 1.2 : 1.1;
            const scale = wheelDelta > 0 ? factor : 1 / factor;
            this._checkTriggerMoveZoom(this, 'zoom', 'zoomOnMouseWheel', e, {
                scale: scale, originX: originX, originY: originY, isAvailableBehavior: null
            });
        }

        if (shouldMove) {
            // FIXME: Should do more test in different environment.
            const absDelta = Math.abs(wheelDelta);
            // wheelDelta of mouse wheel is bigger than touch pad.
            const scrollDelta = (wheelDelta > 0 ? 1 : -1) * (absDelta > 3 ? 0.4 : absDelta > 1 ? 0.15 : 0.05);
            this._checkTriggerMoveZoom(this, 'scrollMove', 'moveOnMouseWheel', e, {
                scrollDelta: scrollDelta, originX: originX, originY: originY, isAvailableBehavior: null
            });
        }
    }

    private _pinchHandler(e: ZRElementEvent) {
        if (interactionMutex.isTaken(this._zr, 'globalPan')
            || eventConsumed(e)
        ) {
            return;
        }
        const scale = e.pinchScale > 1 ? 1.1 : 1 / 1.1;
        this._checkTriggerMoveZoom(this, 'zoom', null, e, {
            scale: scale, originX: e.pinchX, originY: e.pinchY, isAvailableBehavior: null
        });
    }

    private _checkTriggerMoveZoom<T extends 'scrollMove' | 'zoom'>(
        controller: RoamController,
        eventName: T,
        behaviorToCheck: RoamBehavior,
        e: ZRElementEvent,
        contollerEvent: RoamEventParams[T]
    ) {
        if (controller._checkPointer(e, contollerEvent.originX, contollerEvent.originY)) {
            // When mouse is out of roamController rect,
            // default befavoius should not be be disabled, otherwise
            // page sliding is disabled, contrary to expectation.
            eventTool.stop(e.event);
            (e as RoamControllerZREventExtend).__ecRoamConsumed = true;

            trigger(controller, eventName, behaviorToCheck, e, contollerEvent);
        }
    }
}

type RoamControllerZREventExtend = ZRElementEvent & {
    __ecRoamConsumed: boolean
};

function eventConsumed(e: ZRElementEvent): boolean {
    return (e as RoamControllerZREventExtend).__ecRoamConsumed;
}


type RoamControllerZREventListener = (e: ZRElementEvent) => void;
type RoamControllerZREventType = 'mousedown' | 'mousemove' | 'mouseup' | 'mousewheel' | 'pinch';
type RoamControllerListenerItem = {listener: RoamControllerZREventListener} & Pick<RoamSetting, 'zInfoParsed'>;

const innerZrStore = makeInner<{
    roam: Partial<Record<RoamControllerZREventType, RoamControllerListenerItem[]>>
    uniform: Partial<Record<RoamControllerZREventType, RoamControllerZREventListener>>
}, ZRenderType>();

function ensureZrStore(zr: ZRenderType) {
    const store = innerZrStore(zr);
    store.roam = store.roam || {};
    store.uniform = store.uniform || {};
    return store;
}

/**
 * Listeners are sorted by z2/z/zlevel in descending order.
 * This decides the precedence between different roam controllers if they are overlapped.
 *
 * [MEMO]: It's not easy to perfectly reconcile the conflicts caused by overlap.
 *  - Consider cases:
 *    - Multiple roam controllers overlapped.
 *      - Usually only the topmost can trigger roam.
 *    - Roam controllers overlap with other zr elements:
 *      - zr elements are relevant or irrelevent to the host of the roam controller. e.g., axis split line
 *        or series elements is relevant to a cartesian and should trigger roam.
 *      - zr elements is above or below the roam controller host, which affects the precedence of interaction.
 *      - zr elements may not silent only for triggering tooltip by hovering, which is available to roam;
 *        or may not silent for click, where roam is not preferable.
 *  - Approach - `addRoamZrListener+pointerChecker+onIrrelevantElement` (currently used):
 *    - Resolve the precedence between different roam controllers
 *    - But cannot prevent the handling on other zr elements that under the roam controller in z-order.
 *  - Approach - "use an invisible zr elements to receive the zr events to trigger roam":
 *    - More complicated in impl.
 *    - May cause bad cases where zr event cannot be receive due to other non-silient zr elements covering it.
 */
function addRoamZrListener(
    zr: ZRenderType,
    eventType: RoamControllerZREventType,
    listener: RoamControllerZREventListener,
    zInfoParsed: RoamSetting['zInfoParsed']
): void {
    const store = ensureZrStore(zr);
    const roam = store.roam;
    const listenerList = roam[eventType] = roam[eventType] || [];
    let idx = 0;
    for (; idx < listenerList.length; idx++) {
        const currZInfo = listenerList[idx].zInfoParsed;
        if (
            ((currZInfo.zlevel - zInfoParsed.zlevel)
                || (currZInfo.z - zInfoParsed.z)
                || (currZInfo.z2 - zInfoParsed.z2)
                // If all equals, the latter added one has a higher precedence.
            ) <= 0
        ) {
            break;
        }
    }
    listenerList.splice(idx, 0, {listener, zInfoParsed});
    ensureUniformListener(zr, eventType);
}

function removeRoamZrListener(
    zr: ZRenderType, eventType: RoamControllerZREventType, listener: RoamControllerZREventListener
): void {
    const store = ensureZrStore(zr);
    const listenerList = store.roam[eventType] || [];
    for (let idx = 0; idx < listenerList.length; idx++) {
        if (listenerList[idx].listener === listener) {
            listenerList.splice(idx, 1);
            if (!listenerList.length) {
                removeUniformListener(zr, eventType);
            }
            return;
        }
    }
}

function ensureUniformListener(zr: ZRenderType, eventType: RoamControllerZREventType): void {
    const store = ensureZrStore(zr);
    if (!store.uniform[eventType]) {
        zr.on(eventType, store.uniform[eventType] = function (event) {
            const listenerList = store.roam[eventType];
            if (listenerList) {
                for (let i = 0; i < listenerList.length; i++) {
                    listenerList[i].listener(event);
                }
            }
        });
    }
}

function removeUniformListener(zr: ZRenderType, eventType: RoamControllerZREventType): void {
    const store = ensureZrStore(zr);
    const uniform = store.uniform;
    if (uniform[eventType]) {
        zr.off(eventType, uniform[eventType]);
        uniform[eventType] = null;
    }
}


function trigger<T extends RoamEventType>(
    controller: RoamController,
    eventName: T,
    behaviorToCheck: RoamBehavior,
    e: ZRElementEvent,
    contollerEvent: RoamEventParams[T]
) {
    // Also provide behavior checker for event listener, for some case that
    // multiple components share one listener.
    contollerEvent.isAvailableBehavior = bind(isAvailableBehavior, null, behaviorToCheck, e);
    // TODO should not have type issue.
    (controller as any).trigger(eventName, contollerEvent);
}

// settings: {
//     zoomOnMouseWheel
//     moveOnMouseMove
//     moveOnMouseWheel
// }
// The value can be: true / false / 'shift' / 'ctrl' / 'alt'.
function isAvailableBehavior(
    behaviorToCheck: RoamBehavior,
    e: ZRElementEvent,
    settings: Pick<RoamOption, RoamBehavior>
) {
    const setting = settings[behaviorToCheck];
    return !behaviorToCheck || (
        setting && (!isString(setting) || e.event[setting + 'Key' as 'shiftKey' | 'ctrlKey' | 'altKey'])
    );
}

export default RoamController;
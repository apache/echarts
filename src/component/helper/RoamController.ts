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
import { ZRElementEvent, RoamOptionMixin } from '../../util/types';
import { Bind3, isString, bind, defaults, clone } from 'zrender/src/core/util';
import Group from 'zrender/src/graphic/Group';

// Can be null/undefined or true/false
// or 'pan/move' or 'zoom'/'scale'
export type RoamType = RoamOptionMixin['roam'];

interface RoamOption {
    zoomOnMouseWheel?: boolean | 'ctrl' | 'shift' | 'alt'
    moveOnMouseMove?: boolean | 'ctrl' | 'shift' | 'alt'
    moveOnMouseWheel?: boolean | 'ctrl' | 'shift' | 'alt'
    /**
     * If fixed the page when pan
     */
    preventDefaultMouseMove?: boolean
}

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

export interface RoamControllerHost {
    target: Group
    zoom: number
    zoomLimit: {
        min?: number
        max?: number
    }
}

class RoamController extends Eventful<{
    [key in keyof RoamEventParams]: (params: RoamEventParams[key]) => void | undefined
}> {

    pointerChecker: (e: ZRElementEvent, x: number, y: number) => boolean;

    private _zr: ZRenderType;

    private _opt: Required<RoamOption>;

    private _dragging: boolean;

    private _pinching: boolean;

    private _x: number;

    private _y: number;

    readonly enable: (this: this, controlType?: RoamType, opt?: RoamOption) => void;

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
         * Notice: only enable needed types. For example, if 'zoom'
         * is not needed, 'zoom' should not be enabled, otherwise
         * default mousewheel behaviour (scroll page) will be disabled.
         */
        this.enable = function (controlType, opt) {

            // Disable previous first
            this.disable();

            this._opt = defaults(clone(opt) || {}, {
                zoomOnMouseWheel: true,
                moveOnMouseMove: true,
                // By default, wheel do not trigger move.
                moveOnMouseWheel: false,
                preventDefaultMouseMove: true
            });

            if (controlType == null) {
                controlType = true;
            }

            if (controlType === true || (controlType === 'move' || controlType === 'pan')) {
                zr.on('mousedown', mousedownHandler);
                zr.on('mousemove', mousemoveHandler);
                zr.on('mouseup', mouseupHandler);
            }
            if (controlType === true || (controlType === 'scale' || controlType === 'zoom')) {
                zr.on('mousewheel', mousewheelHandler);
                zr.on('pinch', pinchHandler);
            }
        };

        this.disable = function () {
            zr.off('mousedown', mousedownHandler);
            zr.off('mousemove', mousemoveHandler);
            zr.off('mouseup', mouseupHandler);
            zr.off('mousewheel', mousewheelHandler);
            zr.off('pinch', pinchHandler);
        };
    }

    isDragging() {
        return this._dragging;
    }

    isPinching() {
        return this._pinching;
    }

    setPointerChecker(pointerChecker: RoamController['pointerChecker']) {
        this.pointerChecker = pointerChecker;
    }

    dispose() {
        this.disable();
    }

    private _mousedownHandler(e: ZRElementEvent) {
        if (eventTool.isMiddleOrRightButtonOnMouseUpDown(e)) {
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

        // Only check on mosedown, but not mousemove.
        // Mouse can be out of target when mouse moving.
        if (this.pointerChecker && this.pointerChecker(e, x, y)) {
            this._x = x;
            this._y = y;
            this._dragging = true;
        }
    }

    private _mousemoveHandler(e: ZRElementEvent) {
        if (!this._dragging
            || !isAvailableBehavior('moveOnMouseMove', e, this._opt)
            || e.gestureEvent === 'pinch'
            || interactionMutex.isTaken(this._zr, 'globalPan')
        ) {
            return;
        }

        const x = e.offsetX;
        const y = e.offsetY;

        const oldX = this._x;
        const oldY = this._y;

        const dx = x - oldX;
        const dy = y - oldY;

        this._x = x;
        this._y = y;

        this._opt.preventDefaultMouseMove && eventTool.stop(e.event);

        trigger(this, 'pan', 'moveOnMouseMove', e, {
            dx: dx, dy: dy, oldX: oldX, oldY: oldY, newX: x, newY: y, isAvailableBehavior: null
        });
    }

    private _mouseupHandler(e: ZRElementEvent) {
        if (!eventTool.isMiddleOrRightButtonOnMouseUpDown(e)) {
            this._dragging = false;
        }
    }

    private _mousewheelHandler(e: ZRElementEvent) {
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
            checkPointerAndTrigger(this, 'zoom', 'zoomOnMouseWheel', e, {
                scale: scale, originX: originX, originY: originY, isAvailableBehavior: null
            });
        }

        if (shouldMove) {
            // FIXME: Should do more test in different environment.
            const absDelta = Math.abs(wheelDelta);
            // wheelDelta of mouse wheel is bigger than touch pad.
            const scrollDelta = (wheelDelta > 0 ? 1 : -1) * (absDelta > 3 ? 0.4 : absDelta > 1 ? 0.15 : 0.05);
            checkPointerAndTrigger(this, 'scrollMove', 'moveOnMouseWheel', e, {
                scrollDelta: scrollDelta, originX: originX, originY: originY, isAvailableBehavior: null
            });
        }
    }

    private _pinchHandler(e: ZRElementEvent) {
        if (interactionMutex.isTaken(this._zr, 'globalPan')) {
            return;
        }
        const scale = e.pinchScale > 1 ? 1.1 : 1 / 1.1;
        checkPointerAndTrigger(this, 'zoom', null, e, {
            scale: scale, originX: e.pinchX, originY: e.pinchY, isAvailableBehavior: null
        });
    }
}


function checkPointerAndTrigger<T extends 'scrollMove' | 'zoom'>(
    controller: RoamController,
    eventName: T,
    behaviorToCheck: RoamBehavior,
    e: ZRElementEvent,
    contollerEvent: RoamEventParams[T]
) {
    if (controller.pointerChecker
        && controller.pointerChecker(e, contollerEvent.originX, contollerEvent.originY)
    ) {
        // When mouse is out of roamController rect,
        // default befavoius should not be be disabled, otherwise
        // page sliding is disabled, contrary to expectation.
        eventTool.stop(e.event);

        trigger(controller, eventName, behaviorToCheck, e, contollerEvent);
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
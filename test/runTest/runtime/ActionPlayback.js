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

import * as timeline from './timeline';

function waitTime(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
};

export class ActionPlayback {

    constructor() {
        this._timer = 0;
        this._current = 0;

        this._ops = [];
        this._currentOpIndex = 0;

        this._isLastOpMousewheel = false;
    }

    getContext() {
        return {
            elapsedTime: this._elapsedTime,
            currentOpIndex: this._currentOpIndex,
            isLastOpMouseWheel: this._isLastOpMousewheel
        }
    }

    _reset() {
        this._currentOpIndex = 0;
        this._current = Date.now();
        this._elapsedTime = 0;
        this._isLastOpMousewheel = false;
    }

    _restoreContext(ctx) {
        this._elapsedTime = ctx.elapsedTime;
        this._currentOpIndex = ctx.currentOpIndex;
        this._isLastOpMousewheel = ctx.isLastOpMouseWheel;
    }

    async runAction(action, ctxToRestore) {
        this.stop();

        if (!action.ops.length) {
            return;
        }

        this._ops = action.ops.slice().sort((a, b) => {
            return a.time - b.time;
        });
        let firstOp = this._ops[0];
        this._ops.forEach(op => {
            op.time -= firstOp.time;
        });

        this._reset();

        if (ctxToRestore) {
            this._restoreContext(ctxToRestore);
            // Usually restore context happens when page is reloaded after mouseup.
            // In this case the _currentOpIndex is not increased yet.
            this._currentOpIndex++;
        }

        let self = this;

        async function takeScreenshot() {
            // Pause timeline when doing screenshot to avoid screenshot needs taking a while.
            timeline.pause();
            await __VRT_ACTION_SCREENSHOT__(action);
            timeline.resume();
        }

        return new Promise((resolve, reject) => {
            async function tick() {
                let current = Date.now();
                let dTime = current - self._current;
                self._elapsedTime += dTime;
                self._current = current;

                try {
                    // Execute all if there are multiple ops in one frame.
                    do {
                        const executed = await self._update(takeScreenshot);
                        if (!executed) {
                            break;
                        }
                    } while (true);
                }
                catch (e) {
                    // Stop running and throw error.
                    reject(e);
                    return;
                }

                if (self._currentOpIndex >= self._ops.length) {
                    // Finished
                    resolve();
                }
                else {
                    self._timer = setTimeout(tick, 0);
                }
            }
            tick();
        });
    }


    stop() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = 0;
        }
    }

    async _update(takeScreenshot) {
        let op = this._ops[this._currentOpIndex];

        if (!op || (op.time > this._elapsedTime)) {
            // Not yet.
            return;
        }

        let screenshotTaken = false;
        switch (op.type) {
            case 'mousedown':
                // Pause timeline to avoid frame not sync.
                timeline.pause();
                await __VRT_MOUSE_MOVE__(op.x, op.y);
                await __VRT_MOUSE_DOWN__();
                timeline.resume();
                break;
            case 'mouseup':
                timeline.pause();
                await __VRT_MOUSE_MOVE__(op.x, op.y);
                await __VRT_MOUSE_UP__();
                if (window.__VRT_RELOAD_TRIGGERED__) {
                    return;
                }
                timeline.resume();
                break;
            case 'mousemove':
                timeline.pause();
                await __VRT_MOUSE_MOVE__(op.x, op.y);
                timeline.resume();
                break;
            case 'mousewheel':
                let element = document.elementFromPoint(op.x, op.y);
                // Here dispatch mousewheel event because echarts used it.
                // TODO Consider upgrade?
                let event = new WheelEvent('mousewheel', {
                    // PENDING
                    // Needs inverse delta?
                    deltaY: op.deltaY,
                    clientX: op.x, clientY: op.y,
                    // Needs bubble to parent container
                    bubbles: true
                });
                element.dispatchEvent(event);
                this._isLastOpMousewheel = true;
                break;
            case 'screenshot':
                await takeScreenshot();
                screenshotTaken = true;
                break;
            case 'valuechange':
                const selector = document.querySelector(op.selector);
                selector.value = op.value;
                // changing value via js won't trigger `change` event, so trigger it manually
                selector.dispatchEvent(new Event('change'));
                break;
        }

        this._currentOpIndex++;

        // If next op is an auto screenshot
        let nextOp = this._ops[this._currentOpIndex];
        if (nextOp && nextOp.type === 'screenshot-auto') {
            let delay = nextOp.delay == null ? 400 : nextOp.delay;
            // TODO Configuration time
            await waitTime(delay);
            await takeScreenshot();
            screenshotTaken = true;
            this._currentOpIndex++;
        }

        if (this._isLastOpMousewheel && op.type !== 'mousewheel') {
            // Only take screenshot after mousewheel finished
            if (!screenshotTaken) {
                await takeScreenshot();
            }
            this._isLastOpMousewheel = false;
        }

        return true;
    }
};

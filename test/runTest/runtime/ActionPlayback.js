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

    _reset() {
        this._currentOpIndex = 0;
        this._current = Date.now();
        this._elapsedTime = 0;
        this._isLastOpMousewheel = false;
    }


    async runAction(action, playbackSpeed) {
        this.stop();

        playbackSpeed = playbackSpeed || 1;

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

        let self = this;

        async function takeScreenshot() {
            // Pause timeline when doing screenshot to avoid screenshot needs taking a while.
            timeline.pause();
            await __VST_ACTION_SCREENSHOT__(action);
            timeline.resume();
        }

        return new Promise((resolve, reject) => {
            async function tick() {
                // Date has multiplied playbackSpeed
                let current = Date.now();
                let dTime = current - self._current;
                self._elapsedTime += dTime;
                self._current = current;

                try {
                    await self._update(takeScreenshot, playbackSpeed);
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

    async _update(takeScreenshot, playbackSpeed) {
        let op = this._ops[this._currentOpIndex];

        if (op.time > this._elapsedTime) {
            // Not yet.
            return;
        }

        let screenshotTaken = false;
        switch (op.type) {
            case 'mousedown':
                // Pause timeline to avoid frame not sync.
                timeline.pause();
                await __VST_MOUSE_MOVE__(op.x, op.y);
                await __VST_MOUSE_DOWN__();
                timeline.resume();
                break;
            case 'mouseup':
                timeline.pause();
                await __VST_MOUSE_MOVE__(op.x, op.y);
                await __VST_MOUSE_UP__();
                timeline.resume();
                break;
            case 'mousemove':
                timeline.pause();
                await __VST_MOUSE_MOVE__(op.x, op.y);
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
                document.querySelector(op.selector).value = op.value;
                break;
        }

        this._currentOpIndex++;

        // If next op is an auto screenshot
        let nextOp = this._ops[this._currentOpIndex];
        if (nextOp && nextOp.type === 'screenshot-auto') {
            let delay = nextOp.delay == null ? 400 : nextOp.delay;
            // TODO Configuration time
            await waitTime(delay / playbackSpeed);
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
    }
};
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

const {waitTime} = require('./util');

module.exports = class Timeline {

    constructor(page) {
        this._page = page;

        this._timer = 0;
        this._current = 0;

        this._ops = [];
        this._currentOpIndex = 0;

        this._client;
    }

    _reset() {
        this._currentOpIndex = 0;
        this._current = Date.now();
        this._elapsedTime = 0;
    }


    async runAction(action, takeScreenshot, playbackSpeed) {
        if (!this._client) {
            this._client = await this._page.target().createCDPSession();
        }

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

        return new Promise(resolve => {
            async function tick() {
                let current = Date.now();
                let dTime = current - self._current;
                self._elapsedTime += dTime * playbackSpeed;
                self._current = current;

                await self._update(takeScreenshot, playbackSpeed);
                if (self._currentOpIndex >= self._ops.length) {
                    // Finished
                    resolve();
                }
                else {
                    self._timer = setTimeout(tick, 16);
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

        let page = this._page;
        switch (op.type) {
            case 'mousedown':
                await page.mouse.move(op.x, op.y);
                await page.mouse.down();
                break;
            case 'mouseup':
                await page.mouse.move(op.x, op.y);
                await page.mouse.up();
                break;
            case 'mousemove':
                await page.mouse.move(op.x, op.y);
                break;
            case 'mousewheel':
                await page.evaluate((x, y, deltaX, deltaY) => {
                    let element = document.elementFromPoint(x, y);
                    // Here dispatch mousewheel event because echarts used it.
                    // TODO Consider upgrade?
                    let event = new WheelEvent('mousewheel', {
                        // PENDING
                        // Needs inverse delta?
                        deltaY,
                        clientX: x, clientY: y,
                        // Needs bubble to parent container
                        bubbles: true
                    });

                    element.dispatchEvent(event);
                }, op.x, op.y, op.deltaX || 0, op.deltaY);

                // console.log('mousewheel', op.x, op.y, op.deltaX, op.deltaY);
                // await this._client.send('Input.dispatchMouseEvent', {
                //     type: 'mouseWheel',
                //     x: op.x,
                //     y: op.y,
                //     deltaX: op.deltaX,
                //     deltaY: op.deltaY
                // });
                // break;
            case 'screenshot':
                await takeScreenshot();
                break;
            case 'valuechange':
                if (op.target === 'select') {
                    await page.select(op.selector, op.value);
                }
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
            this._currentOpIndex++;
        }
    }
};
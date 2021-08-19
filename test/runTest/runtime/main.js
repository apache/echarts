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

import seedrandom from 'seedrandom';
import { ActionPlayback } from './ActionPlayback';
import * as timeline from './timeline';

let myRandom = new seedrandom('echarts-random');
// Random for echarts code.
// In case different echarts version called random different times.
// It will cause following random number all wrong.
let myRandom2 = new seedrandom('echarts-random-inner');
// Fixed random generator
Math.random = function () {
    const val = myRandom();
    return val;
};

window.__random__inner__ = function () {
    const val = myRandom2();
    return val;
};

let vstStarted = false;

window.__VRT_START__ = function () {
    if (vstStarted) {
        return;
    }
    vstStarted = true;
    timeline.start();

    // TODO not support reload without simpleRequire
    if (window.__VRT_RUN_CONTEXT__) {
        // Restore from previous run
        setTimeout(async () => {
            await __VRT_RUN_ACTIONS__(
                window.__VRT_RUN_CONTEXT__.actions,
                window.__VRT_RUN_CONTEXT__.currentActionIndex,
                window.__VRT_RUN_CONTEXT__.currentActionContext
            )
        }, 1000);
    }
    else {
        // Screenshot after 1000ms (200ms if 5x speed), wait the animation to be finished
        setTimeout(async () => {
            // Pause timeline until run actions.
            timeline.pause();
            await __VRT_FULL_SCREENSHOT__();
        }, 1000);
    }
}

function saveRunningContext(actions, actionIndex, playback) {
    localStorage.setItem('vstRunContext', JSON.stringify({
        actions: actions,
        currentActionIndex: actionIndex,
        currentActionContext: playback.getContext()
    }));
}

window.__VRT_RUN_ACTIONS__ = async function (actions, restoredActionIndex, restoredActionContext) {
    // Actions can only bu runned once.
    timeline.resume();

    const actionPlayback = new ActionPlayback();

    const nativeLocation = window.location;
    let currentActionIndex = 0;

    // Some test cases change the params through reload().
    // We need to save the running info and keep running after reload.
    // window.location seems can't be redefined anymore. So we can only provide helper functions.
    window.__VRT_RELOAD__ = function () {
        // Mark reload triggered and let ActionPlayback stop.
        window.__VRT_RELOAD_TRIGGERED__ = true;
        saveRunningContext(actions, currentActionIndex, actionPlayback);
        timeline.nativeSetTimeout(() => {
            // CDPSession pay be disconnected if reload immediately.
            nativeLocation.reload();
        }, 100);
    }

    for (const [index, action] of actions.entries()) {
        currentActionIndex = index;
        if (index < restoredActionIndex) {
            continue;
        }
        window.scrollTo(action.scrollX, action.scrollY);
        await actionPlayback.runAction(action, index === restoredActionIndex ? restoredActionContext : null);

    }
    actionPlayback.stop();

    __VRT_FINISH_ACTIONS__();
}


window.addEventListener('DOMContentLoaded', () => {
    let style = document.createElement('style');
    // Disable all css animation since it will cause screenshot inconsistent.
    // PENDING Only tooltip? div[_echarts_instance_]>div
    style.innerHTML = `
* {
    transition-delay: 0s !important;
    transition-duration: 0s !important;
    animation-delay: -0.0001s !important;
    animation-duration: 0s !important;
}
    `;
    document.head.appendChild(style);


    // Prevent triggered mouseout event when mouse move out of window.
    // DON"T know why, but it happens occasionally and cause hover state/ tooltip wrong before screenshot.


    document.body.addEventListener('mouseout', e => {
        if (!e.relatedTarget) {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }, true);

    // Draw mouse
    const box = document.createElement('puppeteer-mouse-pointer');
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
puppeteer-mouse-pointer {
    pointer-events: none;
    position: absolute;
    top: 0;
    z-index: 10000;
    left: 0;
    width: 20px;
    height: 20px;
    background: rgba(0,0,0,.4);
    border: 1px solid white;
    border-radius: 10px;
    margin: -10px 0 0 -10px;
    padding: 0;
    transition: background .2s, border-radius .2s, border-color .2s;
}
puppeteer-mouse-pointer.button-1 {
    transition: none;
    background: rgba(0,0,0,0.9);
}
puppeteer-mouse-pointer.button-2 {
    transition: none;
    border-color: rgba(0,0,255,0.9);
}
puppeteer-mouse-pointer.button-3 {
    transition: none;
    border-radius: 4px;
}
puppeteer-mouse-pointer.button-4 {
    transition: none;
    border-color: rgba(255,0,0,0.9);
}
puppeteer-mouse-pointer.button-5 {
    transition: none;
    border-color: rgba(0,255,0,0.9);
}
`;
    document.head.appendChild(styleElement);
    document.body.appendChild(box);
    document.addEventListener('mousemove', event => {
        box.style.left = event.pageX + 'px';
        box.style.top = event.pageY + 'px';
        updateButtons(event.buttons);
    }, true);
    document.addEventListener('mousedown', event => {
        updateButtons(event.buttons);
        box.classList.add('button-' + event.which);
    }, true);
    document.addEventListener('mouseup', event => {
        updateButtons(event.buttons);
        box.classList.remove('button-' + event.which);
    }, true);
    function updateButtons(buttons) {
        for (let i = 0; i < 5; i++) {
            box.classList.toggle('button-' + i, buttons & (1 << i));
        }
    }
});
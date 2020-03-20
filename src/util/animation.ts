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

// @ts-nocheck

import * as zrUtil from 'zrender/src/core/util';
import Element, { ElementProps } from 'zrender/src/Element';
import { ZREasing } from './types';

/**
 * @example
 *  // Animate position
 *  animation
 *      .createWrap()
 *      .add(el1, {position: [10, 10]})
 *      .add(el2, {shape: {width: 500}, style: {fill: 'red'}}, 400)
 *      .done(function () { // done })
 *      .start('cubicOut');
 */
export function createWrap() {

    let storage = [];
    let elExistsMap = {};
    let doneCallback;

    return {

        /**
         * Caution: a el can only be added once, otherwise 'done'
         * might not be called. This method checks this (by el.id),
         * suppresses adding and returns false when existing el found.
         *
         * @return Whether adding succeeded.
         *
         * @example
         *     add(el, target, time, delay, easing);
         *     add(el, target, time, easing);
         *     add(el, target, time);
         *     add(el, target);
         */
        add: function (
            el: Element,
            target: ElementProps,
            time?: number,
            delay?: number | ZREasing,
            easing?: ZREasing
        ) {
            if (zrUtil.isString(delay)) {
                easing = delay;
                delay = 0;
            }

            if (elExistsMap[el.id]) {
                return false;
            }
            elExistsMap[el.id] = 1;

            storage.push(
                {el: el, target: target, time: time, delay: delay, easing: easing}
            );

            return true;
        },

        /**
         * Only execute when animation finished. Will not execute when any
         * of 'stop' or 'stopAnimation' called.
         */
        done: function (callback: () => void) {
            doneCallback = callback;
            return this;
        },

        /**
         * Will stop exist animation firstly.
         */
        start: function () {
            let count = storage.length;

            for (let i = 0, len = storage.length; i < len; i++) {
                let item = storage[i];
                item.el.animateTo(item.target, item.time, item.delay, item.easing, done);
            }

            return this;

            function done() {
                count--;
                if (!count) {
                    storage.length = 0;
                    elExistsMap = {};
                    doneCallback && doneCallback();
                }
            }
        }
    };
}

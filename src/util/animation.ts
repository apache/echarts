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


import Element, { ElementProps } from 'zrender/src/Element';
import { ZREasing } from './types';
import { AnimationEasing } from 'zrender/src/animation/easing';

interface AnimationWrapStorage {
    el: Element;
    target: ElementProps;
    duration: number;
    delay: number;
    easing: AnimationEasing
}
type AnimationWrapDoneCallback = () => void;

/**
 * Animate multiple elements with a single done-callback.
 *
 * @example
 *  animation
 *      .createWrap()
 *      .add(el1, {x: 10, y: 10})
 *      .add(el2, {shape: {width: 500}, style: {fill: 'red'}}, 400)
 *      .done(function () { // done })
 *      .start('cubicOut');
 */
class AnimationWrap {

    private _storage = [] as AnimationWrapStorage[];
    private _elExistsMap: { [elId: string]: boolean } = {};
    private _finishedCallback: AnimationWrapDoneCallback;

    /**
     * Caution: a el can only be added once, otherwise 'done'
     * might not be called. This method checks this (by el.id),
     * suppresses adding and returns false when existing el found.
     *
     * @return Whether adding succeeded.
     */
    add(
        el: Element,
        target: ElementProps,
        duration?: number,
        delay?: number,
        easing?: ZREasing
    ): boolean {
        if (this._elExistsMap[el.id]) {
            return false;
        }
        this._elExistsMap[el.id] = true;

        this._storage.push({
            el: el,
            target: target,
            duration: duration,
            delay: delay,
            easing: easing
        });

        return true;
    }

    /**
     * Only execute when animation done/aborted.
     */
    finished(callback: AnimationWrapDoneCallback): AnimationWrap {
        this._finishedCallback = callback;
        return this;
    }

    /**
     * Will stop exist animation firstly.
     */
    start(): AnimationWrap {
        let count = this._storage.length;

        const checkTerminate = () => {
            count--;
            if (count <= 0) { // Guard.
                this._storage.length = 0;
                this._elExistsMap = {};
                this._finishedCallback && this._finishedCallback();
            }
        };

        for (let i = 0, len = this._storage.length; i < len; i++) {
            const item = this._storage[i];
            item.el.animateTo(item.target, {
                duration: item.duration,
                delay: item.delay,
                easing: item.easing,
                setToFinal: true,
                done: checkTerminate,
                aborted: checkTerminate
            });
        }

        return this;
    }
}

export function createWrap(): AnimationWrap {
    return new AnimationWrap();
}

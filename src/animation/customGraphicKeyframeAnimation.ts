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

import { AnimationEasing } from 'zrender/src/animation/easing';
import Element from 'zrender/src/Element';
import { keys, filter, each } from 'zrender/src/core/util';
import { ELEMENT_ANIMATABLE_PROPS } from './customGraphicTransition';
import { ElementAnimationOption } from '../util/types';

// Helpers for creating keyframe based animations in custom series and graphic components.

type AnimationKeyframe<T extends Record<string, any>> = T & {
    easing?: AnimationEasing
    percent?: number    // 0 - 1
};

export interface ElementKeyframeAnimationOption<Props extends Record<string, any>> extends ElementAnimationOption {
    // Animation configuration for keyframe based animation.
    loop?: boolean
    keyframes?: AnimationKeyframe<Props>[]
}

export function applyKeyframeAnimation<T extends Record<string, any>>(
    el: Element, animationOpts?: ElementKeyframeAnimationOption<T>
) {
    const keyframes = animationOpts.keyframes;
    const duration = animationOpts.duration;
    if (!keyframes || !duration) {
        return;
    }

    function applyKeyframeAnimationOnProp(propName: typeof ELEMENT_ANIMATABLE_PROPS[number]) {
        if (propName && !(el as any)[propName]) {
            return;
        }

        const animator = el.animate(propName, animationOpts.loop);
        each(keyframes, kf => {
            // Stop current animation.
            const animators = el.animators;
            const kfValues = propName ? kf[propName] : kf;
            if (!kfValues) {
                return;
            }

            let propKeys = keys(kfValues);
            if (!propName) {
                // PENDING performance?
                propKeys = filter(propKeys, key => key !== 'percent' && key !== 'easing');
            }
            for (let i = 0; i < animators.length; i++) {
                if (animators[i] !== animator) {
                    animators[i].stopTracks(propKeys);
                }
            }

            animator.whenWithKeys(duration * kf.percent, kfValues, propKeys, kf.easing);
        });
        animator
            .delay(animationOpts.delay || 0)
            .start(animationOpts.easing);
    }

    each(ELEMENT_ANIMATABLE_PROPS, applyKeyframeAnimationOnProp);
}
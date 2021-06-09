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

import {
    AnimationOptionMixin,
    AnimationDelayCallbackParam,
    PayloadAnimationPart,
    AnimationOption
} from '../util/types';
import { AnimationEasing } from 'zrender/src/animation/easing';
import Element from 'zrender/src/Element';
import Model from '../model/Model';
import {
    isObject,
    retrieve2
} from 'zrender/src/core/util';
import Displayable from 'zrender/src/graphic/Displayable';
import Group from 'zrender/src/graphic/Group';

type AnimateOrSetPropsOption = {
    dataIndex?: number;
    cb?: () => void;
    during?: (percent: number) => void;
    removeOpt?: AnimationOption
    isFrom?: boolean;
};

function animateOrSetProps<Props>(
    animationType: 'init' | 'update' | 'remove',
    el: Element<Props>,
    props: Props,
    animatableModel?: Model<AnimationOptionMixin> & {
        getAnimationDelayParams?: (el: Element<Props>, dataIndex: number) => AnimationDelayCallbackParam
    },
    dataIndex?: AnimateOrSetPropsOption['dataIndex'] | AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption,
    cb?: AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption['during'],
    during?: AnimateOrSetPropsOption['during']
) {
    let isFrom = false;
    let removeOpt: AnimationOption;
    if (typeof dataIndex === 'function') {
        during = cb;
        cb = dataIndex;
        dataIndex = null;
    }
    else if (isObject(dataIndex)) {
        cb = dataIndex.cb;
        during = dataIndex.during;
        isFrom = dataIndex.isFrom;
        removeOpt = dataIndex.removeOpt;
        dataIndex = dataIndex.dataIndex;
    }
    const isUpdate = animationType === 'update';
    const isRemove = animationType === 'remove';

    let animationPayload: PayloadAnimationPart;
    // Check if there is global animation configuration from dataZoom/resize can override the config in option.
    // If animation is enabled. Will use this animation config in payload.
    // If animation is disabled. Just ignore it.
    if (animatableModel && animatableModel.ecModel) {
        const updatePayload = animatableModel.ecModel.getUpdatePayload();
        animationPayload = (updatePayload && updatePayload.animation) as PayloadAnimationPart;
    }
    const animationEnabled = animatableModel && animatableModel.isAnimationEnabled();

    if (!isRemove) {
        // Must stop the remove animation.
        el.stopAnimation('remove');
    }

    if (animationEnabled) {
        let duration: number | Function;
        let animationEasing: AnimationEasing;
        let animationDelay: number | Function;
        if (animationPayload) {
            duration = animationPayload.duration || 0;
            animationEasing = animationPayload.easing || 'cubicOut';
            animationDelay = animationPayload.delay || 0;
        }
        else if (isRemove) {
            removeOpt = removeOpt || {};
            duration = retrieve2(removeOpt.duration, 200);
            animationEasing = retrieve2(removeOpt.easing, 'cubicOut');
            animationDelay = 0;
        }
        else {
            duration = animatableModel.getShallow(
                isUpdate ? 'animationDurationUpdate' : 'animationDuration'
            );
            animationEasing = animatableModel.getShallow(
                isUpdate ? 'animationEasingUpdate' : 'animationEasing'
            );
            animationDelay = animatableModel.getShallow(
                isUpdate ? 'animationDelayUpdate' : 'animationDelay'
            );
        }
        if (typeof animationDelay === 'function') {
            animationDelay = animationDelay(
                dataIndex as number,
                animatableModel.getAnimationDelayParams
                    ? animatableModel.getAnimationDelayParams(el, dataIndex as number)
                    : null
            );
        }
        if (typeof duration === 'function') {
            duration = duration(dataIndex as number);
        }

        duration > 0
            ? (
                isFrom
                    ? el.animateFrom(props, {
                        duration: duration as number,
                        delay: animationDelay as number || 0,
                        easing: animationEasing,
                        done: cb,
                        force: !!cb || !!during,
                        setToFinal: true,
                        scope: animationType,
                        during: during
                    })
                    : el.animateTo(props, {
                        duration: duration as number,
                        delay: animationDelay as number || 0,
                        easing: animationEasing,
                        done: cb,
                        force: !!cb || !!during,
                        setToFinal: true,
                        scope: animationType,
                        during: during
                    })
            )
            // FIXME:
            // If `duration` is 0, only the animation on props
            // can be stoped, other animation should be continued?
            // But at present using duration 0 in `animateTo`, `animateFrom`
            // might cause unexpected behavior.
            : (
                el.stopAnimation(),
                // If `isFrom`, the props is the "from" props.
                !isFrom && el.attr(props),
                cb && (cb as AnimateOrSetPropsOption['cb'])()
            );
    }
    else {
        el.stopAnimation();
        !isFrom && el.attr(props);
        // Call during once.
        during && during(1);
        cb && (cb as AnimateOrSetPropsOption['cb'])();
    }
}



/**
 * Update graphic element properties with or without animation according to the
 * configuration in series.
 *
 * Caution: this method will stop previous animation.
 * So do not use this method to one element twice before
 * animation starts, unless you know what you are doing.
 * @example
 *     graphic.updateProps(el, {
 *         position: [100, 100]
 *     }, seriesModel, dataIndex, function () { console.log('Animation done!'); });
 *     // Or
 *     graphic.updateProps(el, {
 *         position: [100, 100]
 *     }, seriesModel, function () { console.log('Animation done!'); });
 */
 function updateProps<Props>(
    el: Element<Props>,
    props: Props,
    // TODO: TYPE AnimatableModel
    animatableModel?: Model<AnimationOptionMixin>,
    dataIndex?: AnimateOrSetPropsOption['dataIndex'] | AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption,
    cb?: AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption['during'],
    during?: AnimateOrSetPropsOption['during']
) {
    animateOrSetProps('update', el, props, animatableModel, dataIndex, cb, during);
}

export {updateProps};

/**
 * Init graphic element properties with or without animation according to the
 * configuration in series.
 *
 * Caution: this method will stop previous animation.
 * So do not use this method to one element twice before
 * animation starts, unless you know what you are doing.
 */
export function initProps<Props>(
    el: Element<Props>,
    props: Props,
    animatableModel?: Model<AnimationOptionMixin>,
    dataIndex?: AnimateOrSetPropsOption['dataIndex'] | AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption,
    cb?: AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption['during'],
    during?: AnimateOrSetPropsOption['during']
) {
    animateOrSetProps('init', el, props, animatableModel, dataIndex, cb, during);
}

/**
 * If element is removed.
 * It can determine if element is having remove animation.
 */
 export function isElementRemoved(el: Element) {
    if (!el.__zr) {
        return true;
    }
    for (let i = 0; i < el.animators.length; i++) {
        const animator = el.animators[i];
        if (animator.scope === 'remove') {
            return true;
        }
    }
    return false;
}

/**
 * Remove graphic element
 */
export function removeElement<Props>(
    el: Element<Props>,
    props: Props,
    animatableModel?: Model<AnimationOptionMixin>,
    dataIndex?: AnimateOrSetPropsOption['dataIndex'] | AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption,
    cb?: AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption['during'],
    during?: AnimateOrSetPropsOption['during']
) {
    // Don't do remove animation twice.
    if (isElementRemoved(el)) {
        return;
    }

    animateOrSetProps('remove', el, props, animatableModel, dataIndex, cb, during);
}

function fadeOutDisplayable(
    el: Displayable,
    animatableModel?: Model<AnimationOptionMixin>,
    dataIndex?: number,
    done?: AnimateOrSetPropsOption['cb']
) {
    el.removeTextContent();
    el.removeTextGuideLine();
    removeElement(el, {
        style: {
            opacity: 0
        }
    }, animatableModel, dataIndex, done);
}

export function removeElementWithFadeOut(
    el: Element,
    animatableModel?: Model<AnimationOptionMixin>,
    dataIndex?: number
) {
    function doRemove() {
        el.parent && el.parent.remove(el);
    }
    // Hide label and labelLine first
    // TODO Also use fade out animation?
    if (!el.isGroup) {
        fadeOutDisplayable(el as Displayable, animatableModel, dataIndex, doRemove);
    }
    else {
        (el as Group).traverse(function (disp: Displayable) {
            if (!disp.isGroup) {
                // Can invoke doRemove multiple times.
                fadeOutDisplayable(disp as Displayable, animatableModel, dataIndex, doRemove);
            }
        });
    }
}
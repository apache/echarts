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

// Basic transitions in the same series when shapes are the same.

import {
    AnimationOptionMixin,
    AnimationDelayCallbackParam,
    PayloadAnimationPart,
    AnimationOption
} from '../util/types';
import { AnimationEasing } from 'zrender/src/animation/easing';
import Element, { ElementAnimateConfig, ElementProps } from 'zrender/src/Element';
import Model from '../model/Model';
import {
    isFunction,
    isObject,
    retrieve2
} from 'zrender/src/core/util';
import Displayable from 'zrender/src/graphic/Displayable';
import Group from 'zrender/src/graphic/Group';
import { makeInner } from '../util/model';

// Stored properties for further transition.

export const transitionStore = makeInner<{
    oldStyle: Displayable['style']
}, Displayable>();


type AnimateOrSetPropsOption = {
    dataIndex?: number;
    cb?: () => void;
    during?: (percent: number) => void;
    removeOpt?: AnimationOption
    isFrom?: boolean;
};

/**
 * Return null if animation is disabled.
 */
export function getAnimationConfig(
    animationType: 'enter' | 'update' | 'leave',
    animatableModel: Model<AnimationOptionMixin>,
    dataIndex: number,
    // Extra opts can override the option in animatable model.
    extraOpts?: Pick<ElementAnimateConfig, 'easing' | 'duration' | 'delay'>,
    // TODO It's only for pictorial bar now.
    extraDelayParams?: unknown
): Pick<ElementAnimateConfig, 'easing' | 'duration' | 'delay'> | null {
    let animationPayload: PayloadAnimationPart;
    // Check if there is global animation configuration from dataZoom/resize can override the config in option.
    // If animation is enabled. Will use this animation config in payload.
    // If animation is disabled. Just ignore it.
    if (animatableModel && animatableModel.ecModel) {
        const updatePayload = animatableModel.ecModel.getUpdatePayload();
        animationPayload = (updatePayload && updatePayload.animation) as PayloadAnimationPart;
    }
    const animationEnabled = animatableModel && animatableModel.isAnimationEnabled();

    const isUpdate = animationType === 'update';

    if (animationEnabled) {
        let duration: number | Function;
        let easing: AnimationEasing;
        let delay: number | Function;
        if (extraOpts) {
            duration = retrieve2(extraOpts.duration, 200);
            easing = retrieve2(extraOpts.easing, 'cubicOut');
            delay = 0;
        }
        else {
            duration = animatableModel.getShallow(
                isUpdate ? 'animationDurationUpdate' : 'animationDuration'
            );
            easing = animatableModel.getShallow(
                isUpdate ? 'animationEasingUpdate' : 'animationEasing'
            );
            delay = animatableModel.getShallow(
                isUpdate ? 'animationDelayUpdate' : 'animationDelay'
            );
        }
        // animation from payload has highest priority.
        if (animationPayload) {
            animationPayload.duration != null && (duration = animationPayload.duration);
            animationPayload.easing != null && (easing = animationPayload.easing);
            animationPayload.delay != null && (delay = animationPayload.delay);
        }
        if (isFunction(delay)) {
            delay = delay(
                dataIndex as number,
                extraDelayParams
            );
        }
        if (isFunction(duration)) {
            duration = duration(dataIndex as number);
        }
        const config = {
            duration: duration as number || 0,
            delay: delay as number,
            easing
        };

        return config;
    }
    else {
        return null;
    }
}

function animateOrSetProps<Props>(
    animationType: 'enter' | 'update' | 'leave',
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
    if (isFunction(dataIndex)) {
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

    const isRemove = (animationType === 'leave');

    if (!isRemove) {
        // Must stop the remove animation.
        el.stopAnimation('leave');
    }

    const animationConfig = getAnimationConfig(
        animationType,
        animatableModel,
        dataIndex as number,
        isRemove ? (removeOpt || {}) : null,
        (animatableModel && animatableModel.getAnimationDelayParams)
            ? animatableModel.getAnimationDelayParams(el, dataIndex as number)
            : null
    );
    if (animationConfig && animationConfig.duration > 0) {
        const duration = animationConfig.duration;
        const animationDelay = animationConfig.delay;
        const animationEasing = animationConfig.easing;

        const animateConfig: ElementAnimateConfig = {
            duration: duration as number,
            delay: animationDelay as number || 0,
            easing: animationEasing,
            done: cb,
            force: !!cb || !!during,
            // Set to final state in update/init animation.
            // So the post processing based on the path shape can be done correctly.
            setToFinal: !isRemove,
            scope: animationType,
            during: during
        };

        isFrom
            ? el.animateFrom(props, animateConfig)
            : el.animateTo(props, animateConfig);
    }
    else {
        el.stopAnimation();
        // If `isFrom`, the props is the "from" props.
        !isFrom && el.attr(props);
        // Call during at least once.
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
 function updateProps<Props extends ElementProps>(
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
export function initProps<Props extends ElementProps>(
    el: Element<Props>,
    props: Props,
    animatableModel?: Model<AnimationOptionMixin>,
    dataIndex?: AnimateOrSetPropsOption['dataIndex'] | AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption,
    cb?: AnimateOrSetPropsOption['cb'] | AnimateOrSetPropsOption['during'],
    during?: AnimateOrSetPropsOption['during']
) {
    animateOrSetProps('enter', el, props, animatableModel, dataIndex, cb, during);
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
        if (animator.scope === 'leave') {
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

    animateOrSetProps('leave', el, props, animatableModel, dataIndex, cb, during);
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

/**
 * Save old style for style transition in universalTransition module.
 * It's used when element will be reused in each render.
 * For chart like map, heatmap, which will always create new element.
 * We don't need to save this because universalTransition can get old style from the old element
 */
export function saveOldStyle(el: Displayable) {
    transitionStore(el).oldStyle = el.style;
}

export function getOldStyle(el: Displayable) {
    return transitionStore(el).oldStyle;
}

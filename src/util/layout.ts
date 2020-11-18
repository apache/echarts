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

// Layout helpers for each component positioning

import * as zrUtil from 'zrender/src/core/util';
import BoundingRect from 'zrender/src/core/BoundingRect';
import {parsePercent} from './number';
import * as formatUtil from './format';
import { BoxLayoutOptionMixin, ComponentLayoutMode } from './types';
import Group from 'zrender/src/graphic/Group';
import Element from 'zrender/src/Element';
import { Dictionary } from 'zrender/src/core/types';

const each = zrUtil.each;

export interface LayoutRect extends BoundingRect {
    margin: number[]
}

export interface NewlineElement extends Element {
    newline: boolean
}

type BoxLayoutKeys = keyof BoxLayoutOptionMixin;
/**
 * @public
 */
export const LOCATION_PARAMS = [
    'left', 'right', 'top', 'bottom', 'width', 'height'
] as const;

/**
 * @public
 */
export const HV_NAMES = [
    ['width', 'left', 'right'],
    ['height', 'top', 'bottom']
] as const;

function boxLayout(
    orient: 'horizontal' | 'vertical',
    group: Group,
    gap: number,
    maxWidth?: number,
    maxHeight?: number
) {
    let x = 0;
    let y = 0;

    if (maxWidth == null) {
        maxWidth = Infinity;
    }
    if (maxHeight == null) {
        maxHeight = Infinity;
    }
    let currentLineMaxSize = 0;

    group.eachChild(function (child, idx) {
        const rect = child.getBoundingRect();
        const nextChild = group.childAt(idx + 1);
        const nextChildRect = nextChild && nextChild.getBoundingRect();
        let nextX: number;
        let nextY: number;

        if (orient === 'horizontal') {
            const moveX = rect.width + (nextChildRect ? (-nextChildRect.x + rect.x) : 0);
            nextX = x + moveX;
            // Wrap when width exceeds maxWidth or meet a `newline` group
            // FIXME compare before adding gap?
            if (nextX > maxWidth || (child as NewlineElement).newline) {
                x = 0;
                nextX = moveX;
                y += currentLineMaxSize + gap;
                currentLineMaxSize = rect.height;
            }
            else {
                // FIXME: consider rect.y is not `0`?
                currentLineMaxSize = Math.max(currentLineMaxSize, rect.height);
            }
        }
        else {
            const moveY = rect.height + (nextChildRect ? (-nextChildRect.y + rect.y) : 0);
            nextY = y + moveY;
            // Wrap when width exceeds maxHeight or meet a `newline` group
            if (nextY > maxHeight || (child as NewlineElement).newline) {
                x += currentLineMaxSize + gap;
                y = 0;
                nextY = moveY;
                currentLineMaxSize = rect.width;
            }
            else {
                currentLineMaxSize = Math.max(currentLineMaxSize, rect.width);
            }
        }

        if ((child as NewlineElement).newline) {
            return;
        }

        child.x = x;
        child.y = y;
        child.markRedraw();

        orient === 'horizontal'
            ? (x = nextX + gap)
            : (y = nextY + gap);
    });
}

/**
 * VBox or HBox layouting
 * @param {string} orient
 * @param {module:zrender/graphic/Group} group
 * @param {number} gap
 * @param {number} [width=Infinity]
 * @param {number} [height=Infinity]
 */
export const box = boxLayout;

/**
 * VBox layouting
 * @param {module:zrender/graphic/Group} group
 * @param {number} gap
 * @param {number} [width=Infinity]
 * @param {number} [height=Infinity]
 */
export const vbox = zrUtil.curry(boxLayout, 'vertical');

/**
 * HBox layouting
 * @param {module:zrender/graphic/Group} group
 * @param {number} gap
 * @param {number} [width=Infinity]
 * @param {number} [height=Infinity]
 */
export const hbox = zrUtil.curry(boxLayout, 'horizontal');

/**
 * If x or x2 is not specified or 'center' 'left' 'right',
 * the width would be as long as possible.
 * If y or y2 is not specified or 'middle' 'top' 'bottom',
 * the height would be as long as possible.
 */
export function getAvailableSize(
    positionInfo: {
        left?: number | string
        top?: number | string
        right?: number | string
        bottom?: number | string
    },
    containerRect: { width: number, height: number },
    margin?: number[] | number
) {
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    let x = parsePercent(positionInfo.left, containerWidth);
    let y = parsePercent(positionInfo.top, containerHeight);
    let x2 = parsePercent(positionInfo.right, containerWidth);
    let y2 = parsePercent(positionInfo.bottom, containerHeight);

    (isNaN(x) || isNaN(parseFloat(positionInfo.left as string))) && (x = 0);
    (isNaN(x2) || isNaN(parseFloat(positionInfo.right as string))) && (x2 = containerWidth);
    (isNaN(y) || isNaN(parseFloat(positionInfo.top as string))) && (y = 0);
    (isNaN(y2) || isNaN(parseFloat(positionInfo.bottom as string))) && (y2 = containerHeight);

    margin = formatUtil.normalizeCssArray(margin || 0);

    return {
        width: Math.max(x2 - x - margin[1] - margin[3], 0),
        height: Math.max(y2 - y - margin[0] - margin[2], 0)
    };
}

/**
 * Parse position info.
 */
export function getLayoutRect(
    positionInfo: BoxLayoutOptionMixin & {
        aspect?: number // aspect is width / height
    },
    containerRect: {width: number, height: number},
    margin?: number | number[]
): LayoutRect {
    margin = formatUtil.normalizeCssArray(margin || 0);

    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    let left = parsePercent(positionInfo.left, containerWidth);
    let top = parsePercent(positionInfo.top, containerHeight);
    const right = parsePercent(positionInfo.right, containerWidth);
    const bottom = parsePercent(positionInfo.bottom, containerHeight);
    let width = parsePercent(positionInfo.width, containerWidth);
    let height = parsePercent(positionInfo.height, containerHeight);

    const verticalMargin = margin[2] + margin[0];
    const horizontalMargin = margin[1] + margin[3];
    const aspect = positionInfo.aspect;

    // If width is not specified, calculate width from left and right
    if (isNaN(width)) {
        width = containerWidth - right - horizontalMargin - left;
    }
    if (isNaN(height)) {
        height = containerHeight - bottom - verticalMargin - top;
    }

    if (aspect != null) {
        // If width and height are not given
        // 1. Graph should not exceeds the container
        // 2. Aspect must be keeped
        // 3. Graph should take the space as more as possible
        // FIXME
        // Margin is not considered, because there is no case that both
        // using margin and aspect so far.
        if (isNaN(width) && isNaN(height)) {
            if (aspect > containerWidth / containerHeight) {
                width = containerWidth * 0.8;
            }
            else {
                height = containerHeight * 0.8;
            }
        }

        // Calculate width or height with given aspect
        if (isNaN(width)) {
            width = aspect * height;
        }
        if (isNaN(height)) {
            height = width / aspect;
        }
    }

    // If left is not specified, calculate left from right and width
    if (isNaN(left)) {
        left = containerWidth - right - width - horizontalMargin;
    }
    if (isNaN(top)) {
        top = containerHeight - bottom - height - verticalMargin;
    }

    // Align left and top
    switch (positionInfo.left || positionInfo.right) {
        case 'center':
            left = containerWidth / 2 - width / 2 - margin[3];
            break;
        case 'right':
            left = containerWidth - width - horizontalMargin;
            break;
    }
    switch (positionInfo.top || positionInfo.bottom) {
        case 'middle':
        case 'center':
            top = containerHeight / 2 - height / 2 - margin[0];
            break;
        case 'bottom':
            top = containerHeight - height - verticalMargin;
            break;
    }
    // If something is wrong and left, top, width, height are calculated as NaN
    left = left || 0;
    top = top || 0;
    if (isNaN(width)) {
        // Width may be NaN if only one value is given except width
        width = containerWidth - horizontalMargin - left - (right || 0);
    }
    if (isNaN(height)) {
        // Height may be NaN if only one value is given except height
        height = containerHeight - verticalMargin - top - (bottom || 0);
    }

    const rect = new BoundingRect(left + margin[3], top + margin[0], width, height) as LayoutRect;
    rect.margin = margin;
    return rect;
}


/**
 * Position a zr element in viewport
 *  Group position is specified by either
 *  {left, top}, {right, bottom}
 *  If all properties exists, right and bottom will be igonred.
 *
 * Logic:
 *     1. Scale (against origin point in parent coord)
 *     2. Rotate (against origin point in parent coord)
 *     3. Traslate (with el.position by this method)
 * So this method only fixes the last step 'Traslate', which does not affect
 * scaling and rotating.
 *
 * If be called repeatly with the same input el, the same result will be gotten.
 *
 * @param el Should have `getBoundingRect` method.
 * @param positionInfo
 * @param positionInfo.left
 * @param positionInfo.top
 * @param positionInfo.right
 * @param positionInfo.bottom
 * @param positionInfo.width Only for opt.boundingModel: 'raw'
 * @param positionInfo.height Only for opt.boundingModel: 'raw'
 * @param containerRect
 * @param margin
 * @param opt
 * @param opt.hv Only horizontal or only vertical. Default to be [1, 1]
 * @param opt.boundingMode
 *        Specify how to calculate boundingRect when locating.
 *        'all': Position the boundingRect that is transformed and uioned
 *               both itself and its descendants.
 *               This mode simplies confine the elements in the bounding
 *               of their container (e.g., using 'right: 0').
 *        'raw': Position the boundingRect that is not transformed and only itself.
 *               This mode is useful when you want a element can overflow its
 *               container. (Consider a rotated circle needs to be located in a corner.)
 *               In this mode positionInfo.width/height can only be number.
 */
export function positionElement(
    el: Element,
    positionInfo: BoxLayoutOptionMixin,
    containerRect: {width: number, height: number},
    margin?: number[] | number,
    opt?: {
        hv: [1 | 0 | boolean, 1 | 0 | boolean],
        boundingMode: 'all' | 'raw'
    }
) {
    const h = !opt || !opt.hv || opt.hv[0];
    const v = !opt || !opt.hv || opt.hv[1];
    const boundingMode = opt && opt.boundingMode || 'all';

    if (!h && !v) {
        return;
    }

    let rect;
    if (boundingMode === 'raw') {
        rect = el.type === 'group'
            ? new BoundingRect(0, 0, +positionInfo.width || 0, +positionInfo.height || 0)
            : el.getBoundingRect();
    }
    else {
        rect = el.getBoundingRect();
        if (el.needLocalTransform()) {
            const transform = el.getLocalTransform();
            // Notice: raw rect may be inner object of el,
            // which should not be modified.
            rect = rect.clone();
            rect.applyTransform(transform);
        }
    }

    // The real width and height can not be specified but calculated by the given el.
    const layoutRect = getLayoutRect(
        zrUtil.defaults(
            {width: rect.width, height: rect.height},
            positionInfo
        ),
        containerRect,
        margin
    );

    // Because 'tranlate' is the last step in transform
    // (see zrender/core/Transformable#getLocalTransform),
    // we can just only modify el.position to get final result.
    const dx = h ? layoutRect.x - rect.x : 0;
    const dy = v ? layoutRect.y - rect.y : 0;

    if (boundingMode === 'raw') {
        el.x = dx;
        el.y = dy;
    }
    else {
        el.x += dx;
        el.y += dy;
    }
    el.markRedraw();
}

/**
 * @param option Contains some of the properties in HV_NAMES.
 * @param hvIdx 0: horizontal; 1: vertical.
 */
export function sizeCalculable(option: BoxLayoutOptionMixin, hvIdx: number): boolean {
    return option[HV_NAMES[hvIdx][0]] != null
        || (option[HV_NAMES[hvIdx][1]] != null && option[HV_NAMES[hvIdx][2]] != null);
}

export function fetchLayoutMode(ins: any): ComponentLayoutMode {
    const layoutMode = ins.layoutMode || ins.constructor.layoutMode;
    return zrUtil.isObject(layoutMode)
        ? layoutMode
        : layoutMode
        ? {type: layoutMode}
        : null;
}

/**
 * Consider Case:
 * When default option has {left: 0, width: 100}, and we set {right: 0}
 * through setOption or media query, using normal zrUtil.merge will cause
 * {right: 0} does not take effect.
 *
 * @example
 * ComponentModel.extend({
 *     init: function () {
 *         ...
 *         let inputPositionParams = layout.getLayoutParams(option);
 *         this.mergeOption(inputPositionParams);
 *     },
 *     mergeOption: function (newOption) {
 *         newOption && zrUtil.merge(thisOption, newOption, true);
 *         layout.mergeLayoutParam(thisOption, newOption);
 *     }
 * });
 *
 * @param targetOption
 * @param newOption
 * @param opt
 */
export function mergeLayoutParam<T extends BoxLayoutOptionMixin>(
    targetOption: T,
    newOption: T,
    opt?: ComponentLayoutMode
) {
    let ignoreSize = opt && opt.ignoreSize;
    !zrUtil.isArray(ignoreSize) && (ignoreSize = [ignoreSize, ignoreSize]);

    const hResult = merge(HV_NAMES[0], 0);
    const vResult = merge(HV_NAMES[1], 1);

    copy(HV_NAMES[0], targetOption, hResult);
    copy(HV_NAMES[1], targetOption, vResult);

    function merge(names: typeof HV_NAMES[number], hvIdx: number) {
        const newParams: BoxLayoutOptionMixin = {};
        let newValueCount = 0;
        const merged: BoxLayoutOptionMixin = {};
        let mergedValueCount = 0;
        const enoughParamNumber = 2;

        each(names, function (name: BoxLayoutKeys) {
            merged[name] = targetOption[name];
        });
        each(names, function (name: BoxLayoutKeys) {
            // Consider case: newOption.width is null, which is
            // set by user for removing width setting.
            hasProp(newOption, name) && (newParams[name] = merged[name] = newOption[name]);
            hasValue(newParams, name) && newValueCount++;
            hasValue(merged, name) && mergedValueCount++;
        });

        if ((ignoreSize as [boolean, boolean])[hvIdx]) {
            // Only one of left/right is premitted to exist.
            if (hasValue(newOption, names[1])) {
                merged[names[2]] = null;
            }
            else if (hasValue(newOption, names[2])) {
                merged[names[1]] = null;
            }
            return merged;
        }

        // Case: newOption: {width: ..., right: ...},
        // or targetOption: {right: ...} and newOption: {width: ...},
        // There is no conflict when merged only has params count
        // little than enoughParamNumber.
        if (mergedValueCount === enoughParamNumber || !newValueCount) {
            return merged;
        }
        // Case: newOption: {width: ..., right: ...},
        // Than we can make sure user only want those two, and ignore
        // all origin params in targetOption.
        else if (newValueCount >= enoughParamNumber) {
            return newParams;
        }
        else {
            // Chose another param from targetOption by priority.
            for (let i = 0; i < names.length; i++) {
                const name = names[i];
                if (!hasProp(newParams, name) && hasProp(targetOption, name)) {
                    newParams[name] = targetOption[name];
                    break;
                }
            }
            return newParams;
        }
    }

    function hasProp(obj: object, name: string): boolean {
        return obj.hasOwnProperty(name);
    }

    function hasValue(obj: Dictionary<any>, name: string): boolean {
        return obj[name] != null && obj[name] !== 'auto';
    }

    function copy(names: readonly string[], target: Dictionary<any>, source: Dictionary<any>) {
        each(names, function (name) {
            target[name] = source[name];
        });
    }
}

/**
 * Retrieve 'left', 'right', 'top', 'bottom', 'width', 'height' from object.
 */
export function getLayoutParams(source: BoxLayoutOptionMixin): BoxLayoutOptionMixin {
    return copyLayoutParams({}, source);
}

/**
 * Retrieve 'left', 'right', 'top', 'bottom', 'width', 'height' from object.
 * @param {Object} source
 * @return {Object} Result contains those props.
 */
export function copyLayoutParams(target: BoxLayoutOptionMixin, source: BoxLayoutOptionMixin): BoxLayoutOptionMixin {
    source && target && each(LOCATION_PARAMS, function (name: BoxLayoutKeys) {
        source.hasOwnProperty(name) && (target[name] = source[name]);
    });
    return target;
}

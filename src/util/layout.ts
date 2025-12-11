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
import BoundingRect, { RectLike } from 'zrender/src/core/BoundingRect';
import {parsePercent} from './number';
import * as formatUtil from './format';
import {
    BoxLayoutOptionMixin, CircleLayoutOptionMixin, NullUndefined, ComponentLayoutMode, SeriesOption,
    PreserveAspectMixin,
    ComponentOption
} from './types';
import Group from 'zrender/src/graphic/Group';
import { SectorShape } from 'zrender/src/graphic/shape/Sector';
import Element from 'zrender/src/Element';
import { Dictionary } from 'zrender/src/core/types';
import ExtensionAPI from '../core/ExtensionAPI';
import { error } from './log';
import { BoxCoordinateSystemCoordFrom, getCoordForBoxCoordSys } from '../core/CoordinateSystem';
import SeriesModel from '../model/Series';
import type Model from '../model/Model';
import type ComponentModel from '../model/Component';

const each = zrUtil.each;

/**
 * @see {getLayoutRect}
 */
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


export function getBoxLayoutParams(boxLayoutModel: Model<BoxLayoutOptionMixin>, ignoreParent: boolean) {
    return {
        left: boxLayoutModel.getShallow('left', ignoreParent),
        top: boxLayoutModel.getShallow('top', ignoreParent),
        right: boxLayoutModel.getShallow('right', ignoreParent),
        bottom: boxLayoutModel.getShallow('bottom', ignoreParent),
        width: boxLayoutModel.getShallow('width', ignoreParent),
        height: boxLayoutModel.getShallow('height', ignoreParent)
    };
}

type CircleLayoutSeriesOption = SeriesOption & CircleLayoutOptionMixin<{
    // `center: string | number` has been accepted in series.pie.
    centerExtra: string | number
}>;

function getViewRectAndCenterForCircleLayout<TOption extends CircleLayoutSeriesOption>(
    seriesModel: SeriesModel<TOption>,
    api: ExtensionAPI
) {
    const layoutRef = createBoxLayoutReference(seriesModel, api, {
        enableLayoutOnlyByCenter: true,
    });
    const boxLayoutParams = seriesModel.getBoxLayoutParams();

    let viewRect: LayoutRect;
    let center: number[];
    if (layoutRef.type === BoxLayoutReferenceType.point) {
        center = layoutRef.refPoint;
        // `viewRect` is required in `pie/labelLayout.ts`.
        viewRect = getLayoutRect(
            boxLayoutParams, {width: api.getWidth(), height: api.getHeight()}
        );
    }
    else { // layoutRef.type === layout.BoxLayoutReferenceType.rect
        const centerOption = seriesModel.get('center');
        const centerOptionArr = zrUtil.isArray(centerOption)
            ? centerOption : [centerOption, centerOption];
        viewRect = getLayoutRect(
            boxLayoutParams, layoutRef.refContainer
        );
        center = layoutRef.boxCoordFrom === BoxCoordinateSystemCoordFrom.coord2
            ? layoutRef.refPoint // option `series.center` has been used as coord.
            : [
                parsePercent(centerOptionArr[0], viewRect.width) + viewRect.x,
                parsePercent(centerOptionArr[1], viewRect.height) + viewRect.y,
            ];
    }

    return {viewRect, center};
}

export function getCircleLayout<TOption extends CircleLayoutSeriesOption>(
    seriesModel: SeriesModel<TOption>,
    api: ExtensionAPI
): Pick<SectorShape, 'cx' | 'cy' | 'r' | 'r0'> & {viewRect: LayoutRect} {

    // center can be string or number when coordinateSystem is specified
    const {viewRect, center} = getViewRectAndCenterForCircleLayout(seriesModel, api);

    let radius = seriesModel.get('radius');

    if (!zrUtil.isArray(radius)) {
        radius = [0, radius];
    }
    const width = parsePercent(viewRect.width, api.getWidth());
    const height = parsePercent(viewRect.height, api.getHeight());
    const size = Math.min(width, height);
    const r0 = parsePercent(radius[0], size / 2);
    const r = parsePercent(radius[1], size / 2);

    return {
        cx: center[0],
        cy: center[1],
        r0,
        r,
        viewRect,
    };
}

type GetLayoutRectInputContainerRect = {
    x?: number, // 0 by default
    y?: number, // 0 by default
    width: number,
    height: number,
};

/**
 * Parse position info.
 */
export function getLayoutRect(
    positionInfo: BoxLayoutOptionMixin & {
        // PENDING:
        //  when width can not be decided but height can be decided and aspect is near Infinity,
        //  or when height can not be decided but width can be decided and aspect is near 0,
        //  the result width or height is near Inifity. It's logically correct, therefore
        //  currently we do not handle it, until bad cases arise.
        //
        // aspect is width / height. But this method does not preserve aspect ratio if
        // both width and height can be decided by the given left/top/bottom/right/width/height.
        // To always preserve aspect ratio, uses `applyPreserveAspect` to process the result.
        aspect?: number
    },
    containerRect: GetLayoutRectInputContainerRect,
    // This is the space from the `containerRect` to the returned bounding rect.
    // Commonly used in option `legend.padding`, `timeline.padding`, `title.padding`,
    //  `visualMap.padding`, ...
    // [NOTICE]:
    //  It's named `margin`, because it's the space that outside the bounding rect. But from
    //  the perspective of the the caller, it's commonly used as the `padding` of a component,
    //  because conventionally background color covers this space.
    // [BEHAVIOR]:
    //  - If width/height is specified, `margin` does not effect them.
    //  - Otherwise, they are calculated based on the rect that `containerRect` shrinked by `margin`.
    //  - left/right/top/bottom are based on the rect that `containerRect` shrinked by `margin`.
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
            // PENDING: if only `left` or `right` is defined, perhaps it's more preferable to
            // calculate size based on `containerWidth - left` or `containerWidth - left` here,
            // but for backward compatibility we do not change it.
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

    const rect = new BoundingRect(
        (containerRect.x || 0) + left + margin[3],
        (containerRect.y || 0) + top + margin[0],
        width,
        height
    ) as LayoutRect;
    rect.margin = margin;

    return rect;
}

/**
 * PENDING:
 *  when preserveAspect: 'cover' and aspect is near Infinity
 *  or when preserveAspect: 'contain' and aspect is near 0,
 *  the result width or height is near Inifity. It's logically correct,
 *  Therefore currently we do not handle it, until bad cases arise.
 */
export function applyPreserveAspect(
    component: ComponentModel<ComponentOption & PreserveAspectMixin>,
    layoutRect: LayoutRect,
    // That is, `width / height`.
    // Assume `aspect` is positive.
    aspect: number,
): LayoutRect {
    const preserveAspect = component.getShallow('preserveAspect', true);
    if (!preserveAspect) {
        return layoutRect;
    }

    const actualAspect = layoutRect.width / layoutRect.height;

    if (Math.abs(Math.atan(aspect) - Math.atan(actualAspect)) < 1e-9) {
        return layoutRect;
    }

    const preserveAspectAlign = component.getShallow('preserveAspectAlign', true);
    const preserveAspectVerticalAlign = component.getShallow('preserveAspectVerticalAlign', true);
    const layoutOptInner: BoxLayoutOptionMixin = {width: layoutRect.width, height: layoutRect.height};
    const isCover = preserveAspect === 'cover';

    if ((actualAspect > aspect && !isCover) || (actualAspect < aspect && isCover)) {
        layoutOptInner.width = layoutRect.height * aspect;
        preserveAspectAlign === 'left' ? (layoutOptInner.left = 0)
            : preserveAspectAlign === 'right' ? (layoutOptInner.right = 0)
            : (layoutOptInner.left = 'center');
    }
    else {
        layoutOptInner.height = layoutRect.width / aspect;
        preserveAspectVerticalAlign === 'top' ? (layoutOptInner.top = 0)
            : preserveAspectVerticalAlign === 'bottom' ? (layoutOptInner.bottom = 0)
            : (layoutOptInner.top = 'middle');
    }
    return getLayoutRect(layoutOptInner, layoutRect);
}


type CreateBoxLayoutReferenceOpt<TEnableByCenter extends boolean = false> = {
    // Use this only if:
    //  - Intending to layout based on coord sys that can not get a rect from `dataToLayout`.
    //  - Can layout based only on center but a rect is not essential, such as pie, chord.
    enableLayoutOnlyByCenter?: TEnableByCenter;
};
export const BoxLayoutReferenceType = {
    rect: 1,
    point: 2,
} as const;
export type BoxLayoutReferenceType = (typeof BoxLayoutReferenceType)[keyof typeof BoxLayoutReferenceType];

export type BoxLayoutReferenceResult<TEnableByCenter extends boolean = false> = TEnableByCenter extends true
    ? (BoxLayoutReferenceRectResult | BoxLayoutReferencePointResult)
    : BoxLayoutReferenceRectResult;
type BoxLayoutReferenceRectResult = {
    // This is the default way.
    type: typeof BoxLayoutReferenceType.rect;
    refContainer: LayoutRect;
    refPoint: number[]; // The center of rect in this case.
    boxCoordFrom: BoxCoordinateSystemCoordFrom | NullUndefined;
};
type BoxLayoutReferencePointResult = {
    // This is available only if `enableLayoutOnlyByCenter: true`
    //  and `layoutRect` is not available.
    type: typeof BoxLayoutReferenceType.point;
    refPoint: number[];
    boxCoordFrom: BoxCoordinateSystemCoordFrom | NullUndefined;
};

/**
 * Uniformly calculate layout reference (rect or center) based on either:
 *  - viewport:
 *      - Get `refContainer` as `{x: 0, y: 0, width: api.getWidth(), height: api.getHeight()}`
 *  - coordinate system, which can serve in several ways:
 *      - Use `dataToPoint` to get the `refPoint`, such as, in cartesian2d coord sys.
 *      - Use `dataToLayout` to get the `refContainer`, such as, in matrix coord sys.
 */
export function createBoxLayoutReference<TEnableByCenter extends boolean = false>(
    model: ComponentModel,
    api: ExtensionAPI,
    opt?: CreateBoxLayoutReferenceOpt<TEnableByCenter>
): BoxLayoutReferenceResult<TEnableByCenter> {

    let refContainer: RectLike | NullUndefined;
    let refPoint: number[] | NullUndefined;
    let layoutRefType: BoxLayoutReferenceType | NullUndefined;

    const boxCoordSys = model.boxCoordinateSystem;
    let boxCoordFrom: BoxCoordinateSystemCoordFrom | NullUndefined;
    if (boxCoordSys) {
        const {coord, from} = getCoordForBoxCoordSys(model);
        // Do not use `clamp` in `dataToLayout` and `dataToPoint`, because:
        //  1. Should support overflow (such as, by dataZoom), where NaN should be in the result.
        //  2. Be consistent with the way used in `series.data`
        if (boxCoordSys.dataToLayout) {
            layoutRefType = BoxLayoutReferenceType.rect;
            boxCoordFrom = from;
            const result = boxCoordSys.dataToLayout(coord);
            refContainer = result.contentRect || result.rect;
        }
        else if (opt && opt.enableLayoutOnlyByCenter && boxCoordSys.dataToPoint) {
            layoutRefType = BoxLayoutReferenceType.point;
            boxCoordFrom = from;
            refPoint = boxCoordSys.dataToPoint(coord);
        }
        else {
            if (__DEV__) {
                error(`${model.type}[${model.componentIndex}]`
                    + ` layout based on ${boxCoordSys.type} is not supported.`
                );
            }
        }
    }

    if (layoutRefType == null) {
        layoutRefType = BoxLayoutReferenceType.rect;
    }

    if (layoutRefType === BoxLayoutReferenceType.rect) {
        if (!refContainer) {
            refContainer = {x: 0, y: 0, width: api.getWidth(), height: api.getHeight()};
        }
        refPoint = [refContainer.x + refContainer.width / 2, refContainer.y + refContainer.height / 2];
    }

    return {type: layoutRefType, refContainer, refPoint, boxCoordFrom} as BoxLayoutReferenceResult<TEnableByCenter>;
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
 *     3. Translate (with el.position by this method)
 * So this method only fixes the last step 'Translate', which does not affect
 * scaling and rotating.
 *
 * If be called repeatedly with the same input el, the same result will be gotten.
 *
 * Return true if the layout happened.
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
    containerRect: GetLayoutRectInputContainerRect,
    margin?: number[] | number,
    opt?: {
        hv: [1 | 0 | boolean, 1 | 0 | boolean],
        boundingMode: 'all' | 'raw'
    },
    out?: { x?: number, y?: number }
): boolean {
    const h = !opt || !opt.hv || opt.hv[0];
    const v = !opt || !opt.hv || opt.hv[1];
    const boundingMode = opt && opt.boundingMode || 'all';
    out = out || el;

    out.x = el.x;
    out.y = el.y;

    if (!h && !v) {
        return false;
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
        out.x = dx;
        out.y = dy;
    }
    else {
        out.x += dx;
        out.y += dy;
    }
    if (out === el) {
        el.markRedraw();
    }
    return true;
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
            zrUtil.hasOwn(newOption, name) && (newParams[name] = merged[name] = newOption[name]);
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
                if (!zrUtil.hasOwn(newParams, name) && zrUtil.hasOwn(targetOption, name)) {
                    newParams[name] = targetOption[name];
                    break;
                }
            }
            return newParams;
        }
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
        zrUtil.hasOwn(source, name) && (target[name] = source[name]);
    });
    return target;
}

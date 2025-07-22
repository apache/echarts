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

import type SingleAxisModel from '../../coord/single/AxisModel';
import type CartesianAxisModel from '../../coord/cartesian/AxisModel';
import type { AxisBaseModel } from '../../coord/AxisBaseModel';
import type ExtensionAPI from '../../core/ExtensionAPI';
import type { ExtendedElementProps } from '../../core/ExtendedElement';
import type CartesianAxisView from './CartesianAxisView';
import { makeInner } from '../../util/model';
import type { NullUndefined, ParsedAxisBreak } from '../../util/types';
import { assert, each, extend, find, map } from 'zrender/src/core/util';
import { getScaleBreakHelper } from '../../scale/break';
import type { PathProps } from 'zrender/src/graphic/Path';
import { subPixelOptimizeLine } from 'zrender/src/graphic/helper/subPixelOptimize';
import { applyTransform } from 'zrender/src/core/vector';
import * as matrixUtil from 'zrender/src/core/matrix';
import {
    AXIS_BREAK_COLLAPSE_ACTION_TYPE,
    AXIS_BREAK_EXPAND_ACTION_TYPE,
    AXIS_BREAK_TOGGLE_ACTION_TYPE,
    BaseAxisBreakPayload
} from './axisAction';
import {
    LabelLayoutWithGeometry,
    labelIntersect,
    labelLayoutApplyTranslation
} from '../../label/labelLayoutHelper';
import type SingleAxisView from './SingleAxisView';
import type { AxisBuilderCfg } from './AxisBuilder';
import { AxisBreakUpdateResult, registerAxisBreakHelperImpl } from './axisBreakHelper';
import { warn } from '../../util/log';
import ComponentModel from '../../model/Component';
import { AxisBaseOption } from '../../coord/axisCommonTypes';
import { BoundingRect, Group, Line, Point, Polygon, Polyline, WH, XY } from '../../util/graphic';

/**
 * @caution
 *  Must not export anything except `installAxisBreakHelper`
 */

/**
 * The zigzag shapes for axis breaks are generated according to some random
 * factors. It should persist as much as possible to avoid constantly
 * changing by every user operation.
 */
const viewCache = makeInner<{
    visualList: CacheBreakVisual[];
}, CartesianAxisView | SingleAxisView>();
type CacheBreakVisual = {
    parsedBreak: ParsedAxisBreak;
    zigzagRandomList: number[];
    shouldRemove: boolean;
};

function ensureVisualInCache(
    visualList: CacheBreakVisual[],
    targetBreak: ParsedAxisBreak
): CacheBreakVisual {
    let visual = find(
        visualList,
        item => getScaleBreakHelper()!.identifyAxisBreak(item.parsedBreak.breakOption, targetBreak.breakOption)
    );
    if (!visual) {
        visualList.push(visual = {
            zigzagRandomList: [],
            parsedBreak: targetBreak,
            shouldRemove: false
        });
    }
    return visual;
}

function resetCacheVisualRemoveFlag(visualList: CacheBreakVisual[]): void {
    each(visualList, item => (item.shouldRemove = true));
}

function removeUnusedCacheVisual(visualList: CacheBreakVisual[]): void {
    for (let i = visualList.length - 1; i >= 0; i--) {
        if (visualList[i].shouldRemove) {
            visualList.splice(i, 1);
        }
    }
}

function rectCoordBuildBreakAxis(
    axisGroup: Group,
    axisView: CartesianAxisView | SingleAxisView,
    axisModel: CartesianAxisModel | SingleAxisModel,
    coordSysRect: BoundingRect,
    api: ExtensionAPI
): void {
    const axis = axisModel.axis;

    if (axis.scale.isBlank() || !getScaleBreakHelper()) {
        return;
    }

    const breakPairs = getScaleBreakHelper()!.retrieveAxisBreakPairs(
        axis.scale.getTicks({breakTicks: 'only_break'}),
        tick => tick.break,
        false
    );
    if (!breakPairs.length) {
        return;
    }

    const breakAreaModel = (axisModel as AxisBaseModel).getModel('breakArea');
    const zigzagAmplitude = breakAreaModel.get('zigzagAmplitude');
    let zigzagMinSpan = breakAreaModel.get('zigzagMinSpan');
    let zigzagMaxSpan = breakAreaModel.get('zigzagMaxSpan');
    // Use arbitrary value to avoid dead loop if user gives inappropriate settings.
    zigzagMinSpan = Math.max(2, zigzagMinSpan || 0);
    zigzagMaxSpan = Math.max(zigzagMinSpan, zigzagMaxSpan || 0);
    const expandOnClick = breakAreaModel.get('expandOnClick');
    const zigzagZ = breakAreaModel.get('zigzagZ');

    const itemStyleModel = breakAreaModel.getModel('itemStyle');
    const itemStyle = itemStyleModel.getItemStyle();
    const borderColor = itemStyle.stroke;
    const borderWidth = itemStyle.lineWidth;
    const borderType = itemStyle.lineDash;
    const color = itemStyle.fill;

    const group = new Group({
        ignoreModelZ: true
    } as ExtendedElementProps);

    const isAxisHorizontal = axis.isHorizontal();

    const cachedVisualList = viewCache(axisView).visualList || (viewCache(axisView).visualList = []);
    resetCacheVisualRemoveFlag(cachedVisualList);

    for (let i = 0; i < breakPairs.length; i++) {
        const parsedBreak = breakPairs[i][0].break.parsedBreak;

        // Even if brk.gap is 0, we should also draw the breakArea because
        // border is sometimes required to be visible (as a line)
        const coords: number[] = [];
        coords[0] = axis.toGlobalCoord(axis.dataToCoord(parsedBreak.vmin, true));
        coords[1] = axis.toGlobalCoord(axis.dataToCoord(parsedBreak.vmax, true));
        if (coords[1] < coords[0]) {
            coords.reverse();
        }

        const cachedVisual = ensureVisualInCache(cachedVisualList, parsedBreak);
        cachedVisual.shouldRemove = false;
        const breakGroup = new Group();

        addZigzagShapes(
            cachedVisual.zigzagRandomList,
            breakGroup,
            coords[0],
            coords[1],
            isAxisHorizontal,
            parsedBreak,
        );

        if (expandOnClick) {
            breakGroup.on('click', () => {
                const payload: BaseAxisBreakPayload = {
                    type: AXIS_BREAK_EXPAND_ACTION_TYPE,
                    breaks: [{
                        start: parsedBreak.breakOption.start,
                        end: parsedBreak.breakOption.end,
                    }]
                };
                payload[`${axis.dim}AxisIndex`] = axisModel.componentIndex;
                api.dispatchAction(payload);
            });
        }
        breakGroup.silent = !expandOnClick;

        group.add(breakGroup);
    }
    axisGroup.add(group);

    removeUnusedCacheVisual(cachedVisualList);

    function addZigzagShapes(
        zigzagRandomList: number[],
        breakGroup: Group,
        startCoord: number,
        endCoord: number,
        isAxisHorizontal: boolean,
        trimmedBreak: ParsedAxisBreak
    ) {
        const polylineStyle = {
            stroke: borderColor,
            lineWidth: borderWidth,
            lineDash: borderType,
            fill: 'none'
        };

        const dimBrk = isAxisHorizontal ? 0 : 1;
        const dimZigzag = 1 - dimBrk;
        const zigzagCoordMax = coordSysRect[XY[dimZigzag]] + coordSysRect[WH[dimZigzag]];

        // Apply `subPixelOptimizeLine` for alignning with break ticks.
        function subPixelOpt(brkCoord: number): number {
            const pBrk: number[] = [];
            const dummyP: number[] = [];
            pBrk[dimBrk] = dummyP[dimBrk] = brkCoord;
            pBrk[dimZigzag] = coordSysRect[XY[dimZigzag]];
            dummyP[dimZigzag] = zigzagCoordMax;
            const dummyShape = {x1: pBrk[0], y1: pBrk[1], x2: dummyP[0], y2: dummyP[1]};
            subPixelOptimizeLine(dummyShape, dummyShape, {lineWidth: 1});
            pBrk[0] = dummyShape.x1;
            pBrk[1] = dummyShape.y1;
            return pBrk[dimBrk];
        }
        startCoord = subPixelOpt(startCoord);
        endCoord = subPixelOpt(endCoord);

        const pointsA = [];
        const pointsB = [];

        let isSwap = true;
        let current = coordSysRect[XY[dimZigzag]];
        for (let idx = 0; ; idx++) {
            // Use `isFirstPoint` `isLastPoint` to ensure the intersections between zigzag
            // and axis are precise, thus it can join its axis tick correctly.
            const isFirstPoint = current === coordSysRect[XY[dimZigzag]];
            const isLastPoint = current >= zigzagCoordMax;
            if (isLastPoint) {
                current = zigzagCoordMax;
            }

            const pA: number[] = [];
            const pB: number[] = [];
            pA[dimBrk] = startCoord;
            pB[dimBrk] = endCoord;
            if (!isFirstPoint && !isLastPoint) {
                pA[dimBrk] += isSwap ? -zigzagAmplitude : zigzagAmplitude;
                pB[dimBrk] -= !isSwap ? -zigzagAmplitude : zigzagAmplitude;
            }
            pA[dimZigzag] = current;
            pB[dimZigzag] = current;
            pointsA.push(pA);
            pointsB.push(pB);

            let randomVal: number;
            if (idx < zigzagRandomList.length) {
                randomVal = zigzagRandomList[idx];
            }
            else {
                randomVal = Math.random();
                zigzagRandomList.push(randomVal);
            }
            current += randomVal * (zigzagMaxSpan - zigzagMinSpan) + zigzagMinSpan;
            isSwap = !isSwap;

            if (isLastPoint) {
                break;
            }
        }

        const anidSuffix = getScaleBreakHelper()!.serializeAxisBreakIdentifier(trimmedBreak.breakOption);

        // Create two polylines and add them to the breakGroup
        breakGroup.add(new Polyline({
            anid: `break_a_${anidSuffix}`,
            shape: {
                points: pointsA
            },
            style: polylineStyle,
            z: zigzagZ
        }));

        /* Add the second polyline and a polygon only if the gap is not zero
         * Otherwise if the polyline is with dashed line or being opaque,
         * it may not be constant with breaks with non-zero gaps. */
        if (trimmedBreak.gapReal !== 0) {
            breakGroup.add(new Polyline({
                anid: `break_b_${anidSuffix}`,
                shape: {
                    // Not reverse to keep the dash stable when dragging resizing.
                    points: pointsB
                },
                style: polylineStyle,
                z: zigzagZ
            }));

            // Creating the polygon that fills the area between the polylines
            // From end to start for polygon.
            const pointsB2 = pointsB.slice();
            pointsB2.reverse();
            const polygonPoints = pointsA.concat(pointsB2);
            breakGroup.add(new Polygon({
                anid: `break_c_${anidSuffix}`,
                shape: {
                    points: polygonPoints
                },
                style: {
                    fill: color,
                    opacity: itemStyle.opacity
                },
                z: zigzagZ
            }));
        }
    }
}

function buildAxisBreakLine(
    axisModel: AxisBaseModel,
    group: Group,
    transformGroup: Group,
    pathBaseProp: PathProps,
): void {
    const axis = axisModel.axis;
    const transform = transformGroup.transform;
    assert(pathBaseProp.style);
    let extent: number[] = axis.getExtent();

    if (axis.inverse) {
        extent = extent.slice();
        extent.reverse();
    }

    const breakPairs = getScaleBreakHelper()!.retrieveAxisBreakPairs(
        axis.scale.getTicks({breakTicks: 'only_break'}),
        tick => tick.break,
        false
    );
    const brkLayoutList = map(breakPairs, breakPair => {
        const parsedBreak = breakPair[0].break.parsedBreak;
        const coordPair = [
            axis.dataToCoord(parsedBreak.vmin, true),
            axis.dataToCoord(parsedBreak.vmax, true),
        ];
        (coordPair[0] > coordPair[1]) && coordPair.reverse();
        return {
            coordPair,
            brkId: getScaleBreakHelper()!.serializeAxisBreakIdentifier(parsedBreak.breakOption),
        };
    });
    brkLayoutList.sort((layout1, layout2) => layout1.coordPair[0] - layout2.coordPair[0]);

    let ySegMin = extent[0];
    let lastLayout = null;
    for (let idx = 0; idx < brkLayoutList.length; idx++) {
        const layout = brkLayoutList[idx];
        const brkTirmmedMin = Math.max(layout.coordPair[0], extent[0]);
        const brkTirmmedMax = Math.min(layout.coordPair[1], extent[1]);
        if (ySegMin <= brkTirmmedMin) {
            addSeg(ySegMin, brkTirmmedMin, lastLayout, layout);
        }
        ySegMin = brkTirmmedMax;
        lastLayout = layout;
    }
    if (ySegMin <= extent[1]) {
        addSeg(ySegMin, extent[1], lastLayout, null);
    }

    function addSeg(
        min: number,
        max: number,
        layout1: {brkId: string} | NullUndefined,
        layout2: {brkId: string} | NullUndefined
    ): void {

        function trans(p1: number[], p2: number[]): void {
            if (transform) {
                applyTransform(p1, p1, transform);
                applyTransform(p2, p2, transform);
            }
        }

        function subPixelOptimizePP(p1: number[], p2: number[]): void {
            const shape = {x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1]};
            subPixelOptimizeLine(shape, shape, pathBaseProp.style);
            p1[0] = shape.x1;
            p1[1] = shape.y1;
            p2[0] = shape.x2;
            p2[1] = shape.y2;
        }
        const lineP1 = [min, 0];
        const lineP2 = [max, 0];

        // dummy tick is used to align the line segment ends with axis ticks
        // after `subPixelOptimizeLine` being applied.
        const dummyTickEnd1 = [min, 5];
        const dummyTickEnd2 = [max, 5];
        trans(lineP1, dummyTickEnd1);
        subPixelOptimizePP(lineP1, dummyTickEnd1);
        trans(lineP2, dummyTickEnd2);
        subPixelOptimizePP(lineP2, dummyTickEnd2);
        // Apply it keeping the same as the normal axis line.
        subPixelOptimizePP(lineP1, lineP2);

        const seg = new Line(extend({shape: {
            x1: lineP1[0],
            y1: lineP1[1],
            x2: lineP2[0],
            y2: lineP2[1],
        }}, pathBaseProp));

        group.add(seg);
        // Animation should be precise to be consistent with tick and split line animation.
        seg.anid = `breakLine_${layout1 ? layout1.brkId : '\0'}_\0_${layout2 ? layout2.brkId : '\0'}`;
    }
}

/**
 * Resolve the overlap of a pair of labels.
 *
 * [CAUTION] Only label.x/y are allowed to change.
 */
function adjustBreakLabelPair(
    axisInverse: boolean,
    axisRotation: AxisBuilderCfg['rotation'],
    layoutPair: (LabelLayoutWithGeometry | NullUndefined)[], // Means [brk_min_label, brk_max_label]
): void {

    if (find(layoutPair, item => !item)) {
        return;
    }

    const mtv = new Point();
    if (!labelIntersect(layoutPair[0], layoutPair[1], mtv, {
        // Assert `labelPair` is `[break_min, break_max]`.
        // `axis.inverse: true` means a smaller scale value corresponds to a bigger value in axis.extent.
        // The axisRotation indicates mtv direction of OBB intersecting.
        direction: -(axisInverse ? axisRotation + Math.PI : axisRotation),
        touchThreshold: 0,
        // If need to resovle intersection align axis by moving labels according to MTV,
        // the direction must not be opposite, otherwise cause misleading.
        bidirectional: false,
    })) {
        return;
    }

    // Rotate axis back to (1, 0) direction, to be a standard axis.
    const axisStTrans = matrixUtil.create();
    matrixUtil.rotate(axisStTrans, axisStTrans, -axisRotation);

    const labelPairStTrans = map(
        layoutPair,
        layout => (layout.transform
            ? matrixUtil.mul(matrixUtil.create(), axisStTrans, layout.transform)
            : axisStTrans
        )
    );

    function isParallelToAxis(whIdx: number): boolean {
        // Assert label[0] and label[1] has the same rotation, so only use [0].
        const localRect = layoutPair[0].localRect;
        const labelVec0 = new Point(
            localRect[WH[whIdx]] * labelPairStTrans[0][0],
            localRect[WH[whIdx]] * labelPairStTrans[0][1]
        );
        return Math.abs(labelVec0.y) < 1e-5;
    }

    // If overlapping, move pair[0] pair[1] apart a little. We need to calculate a ratio k to
    // distribute mtv to pair[0] and pair[1]. This is to place the text gap as close as possible
    // to the center of the break ticks, otherwise it might looks weird or misleading.

    // - When labels' width/height are not parallel to axis (usually by rotation),
    //  we can simply treat the k as `0.5`.
    let k = 0.5;

    // - When labels' width/height are parallel to axis, the width/height need to be considered,
    //  since they may differ significantly. In this case we keep textAlign as 'center' rather
    //  than 'left'/'right', due to considerations of space utilization for wide break.gap.
    //  A sample case: break on xAxis(no inverse) is [200, 300000].
    //  We calculate k based on the formula below:
    //      Rotated axis and labels to the direction of (1, 0).
    //      uval = ( (pair[0].insidePt - mtv*k) + (pair[1].insidePt + mtv*(1-k)) ) / 2 - brkCenter
    //      0 <= k <= 1
    //      |uval| should be as small as possible.
    //  Derived as follows:
    //      qval = (pair[0].insidePt + pair[1].insidePt + mtv) / 2 - brkCenter
    //      k = (qval - uval) / mtv
    //      min(qval, qval-mtv) <= uval <= max(qval, qval-mtv)
    if (isParallelToAxis(0) || isParallelToAxis(1)) {
        const rectSt = map(layoutPair, (layout, idx) => {
            const rect = layout.localRect.clone();
            rect.applyTransform(labelPairStTrans[idx]);
            return rect;
        });

        const brkCenterSt = new Point();
        brkCenterSt.copy(layoutPair[0].label).add(layoutPair[1].label).scale(0.5);
        brkCenterSt.transform(axisStTrans);

        const mtvSt = mtv.clone().transform(axisStTrans);
        const insidePtSum = rectSt[0].x + rectSt[1].x
            + (mtvSt.x >= 0 ? rectSt[0].width : rectSt[1].width);
        const qval = (insidePtSum + mtvSt.x) / 2 - brkCenterSt.x;
        const uvalMin = Math.min(qval, qval - mtvSt.x);
        const uvalMax = Math.max(qval, qval - mtvSt.x);
        const uval =
            uvalMax < 0 ? uvalMax
            : uvalMin > 0 ? uvalMin
            : 0;
        k = (qval - uval) / mtvSt.x;
    }

    const delta0 = new Point();
    const delta1 = new Point();
    Point.scale(delta0, mtv, -k);
    Point.scale(delta1, mtv, 1 - k);
    labelLayoutApplyTranslation(layoutPair[0], delta0);
    labelLayoutApplyTranslation(layoutPair[1], delta1);
}

function updateModelAxisBreak(
    model: ComponentModel<AxisBaseOption>,
    payload: BaseAxisBreakPayload
): AxisBreakUpdateResult {
    const result: AxisBreakUpdateResult = {breaks: []};

    each(payload.breaks, inputBrk => {
        if (!inputBrk) {
            return;
        }
        const breakOption = find(
            model.get('breaks', true),
            brkOption => getScaleBreakHelper()!.identifyAxisBreak(brkOption, inputBrk)
        );
        if (!breakOption) {
            if (__DEV__) {
                warn(`Can not find axis break by start: ${inputBrk.start}, end: ${inputBrk.end}`);
            }
            return;
        }
        const actionType = payload.type;
        const old = {
            isExpanded: !!breakOption.isExpanded
        };
        breakOption.isExpanded =
            actionType === AXIS_BREAK_EXPAND_ACTION_TYPE ? true
            : actionType === AXIS_BREAK_COLLAPSE_ACTION_TYPE ? false
            : actionType === AXIS_BREAK_TOGGLE_ACTION_TYPE ? !breakOption.isExpanded
            : breakOption.isExpanded;
        result.breaks.push({
            start: breakOption.start,
            end: breakOption.end,
            isExpanded: !!breakOption.isExpanded,
            old,
        });
    });

    return result;
}


export function installAxisBreakHelper(): void {
    registerAxisBreakHelperImpl({
        adjustBreakLabelPair,
        buildAxisBreakLine,
        rectCoordBuildBreakAxis,
        updateModelAxisBreak,
    });
}

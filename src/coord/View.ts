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

import BoundingRect, {
    boundingRectApplyTransform,
    boundingRectCalculateTransform, boundingRectContain, boundingRectCopy, boundingRectCreate,
} from 'zrender/src/core/BoundingRect';
import Transformable, {
    copyTransform, transformableCreate, transformableGetLocalTransform
} from 'zrender/src/core/Transformable';
import Element from 'zrender/src/Element';
import { CoordinateSystemMaster, CoordinateSystem } from './CoordinateSystem';
import GlobalModel from '../model/Global';
import { ParsedModelFinder, ParsedModelFinderKnown } from '../util/model';
import { isPositionSizeOptionPercent, mathAbs, parsePercent } from '../util/number';
import {
    AnimationOptionMixin,
    ChartComponentRoamHostView, NullUndefined, RoamHostComponentOrSeries,
    RoamOptionMixin, RoamPayload,
} from '../util/types';
import { assert, each } from 'zrender/src/core/util';
import ExtensionAPI, { getViewOfComponentOrSeries } from '../core/ExtensionAPI';
import {
    decomposeTransform,
    payloadDisableAnimation, updateProps, WH, XY
} from '../util/graphic';
import type ComponentModel from '../model/Component';
import type Model from '../model/Model';
import {
    MatrixArray, invert as matrixInvert, mul as matrixMul, create as matrixCreate,
    copy as matrixCopy
} from 'zrender/src/core/matrix';
import {
    applyTransform as vectorApplyTransform, copy as vectorCopy, set as vectorSet
} from 'zrender/src/core/vector';


/**
 * @tutorial [VIEW_COORD_SYS_ANIMATION]
 *
 *  Some VIEW_COORD_SYS may need to support roaming animation, which may be required when the original
 *  inputs (such as `center/zoom/left/top/right/bottomwidth/height/etc.`) are changed via `setOption`.
 *  Roaming animation requires strict visual alignment between VIEW_COORD_SYS itself (consider "geo map")
 *  and its content (e.g., scatter series).
 *  A logically correct implementation is probably applying animation to VIEW_COORD_SYS's inputs and
 *  calculate VIEW_COORD_SYS's transformation and lay out its dependent series per frame via
 *  `dispatchAction`-ish pattern. But this approach require more mechanism to be introduced and careful
 *  refactoring.
 *  Instead, we currently still follow the conventional implementation - create animation separately on
 *  each element (typically via `graphic.updateProps`) . See VIEW_COORD_SYS_ANIMATION_PROPS_CONSTRAINT.
 *
 *  [VIEW_COORD_SYS_ANIMATION_PROPS_CONSTRAINT]:
 *    The animation should only interpolate `x/y/scaleX/scaleY`, thereby ensuring visual alignment, even
 *    though `MapDraw` applies animations only on a "VIEW_COORD_SYS_TRANS_ROAM" but scatter series applies
 *    animation on a "VIEW_COORD_SYS_TRANS_OVERALL".
 *    But this constraint must always be respected by all relevant components and series.
 *
 *  [VIEW_COORD_SYS_ANIMATION_INTERRUPTION]:
 *    The animation should be able to be interrupted, such as when users roam it by mouse or touch.
 *    When interrupted, `center` and `zoom` must be synchronized back to the VIEW_COORD_SYS and host models
 *    (e.g., geo components or map series). Otherwise, a next `setOption` can cause unexpected result due to
 *    the outdated `center` and `zoom`.
 *    But see FIXME_VIEW_COORD_SYS_SYNC_BACK for some existing bugs.
 *
 *  [VIEW_COORD_SYS_UPDATE_FLOW]:
 *    To avoid bidirectional flow, we consider the original inputs (center/zoom/dataRect/viewRect/etc.) as
 *    the single source of truth, and always calculate transformations based on that.
 *    - Roaming interactions ('pan'/'zoom') can trigger an update to the original inputs via
 *      `dispatchAction({type: 'xxxRoam', ...})`.
 *    - Roaming animation can synchronize back to the original inputs when interrupted.
 *      See `syncBackEl`: It is zrender elements that are assigned with VIEW_COORD_SYS_TRANSFORMATION,
 *      and may be modified outside, typically by animation.
 */

/**
 * @tutorial [VIEW_COORD_SYS_TRANSFORMATION]
 *
 *  @tutorial [VIEW_COORD_SYS_TRANS_RAW]
 *    It is the transformation from `ViewInner['dataRect']` to `ViewInner['viewRect']`.
 *    - ViewInner['dataRect']:
 *      A rect in a source space (or say, data space).
 *      The unit is defined by the source. For example,
 *        - for geo source, the unit defined as lat/lng,
 *        - for SVG source, the unit is the same as the width/height defined in SVG.
 *        - for series.graph/series.tree/series.sankey, the unit defined as px directly.
 *    - ViewInner['viewRect']:
 *      A rect in the canvas pixel space.
 *      For example, it can be ec option left/right/top/bottom/width/height of a component or series.
 *    NOTICE:
 *      - ViewInner['dataRect'] and ViewInner['viewRect'] affect the behavior when centerOption contains
 *        absolute values. See VIEW_COORD_SYS_CENTER_ZOOM_DEFINITION .
 *
 *  @tutorial [VIEW_COORD_SYS_TRANS_ROAM]
 *    It is built with respect to `RoamOptionMixin['center']` and `RoamOptionMixin['zoom']`.
 *    [VIEW_COORD_SYS_CENTER_ZOOM_DEFINITION]:
 *      {pxSpace} <-roamTrans- {viewRectSpace} <-rawTrans- {dataRectSpace} <-- ...
 *                     |                                         |
 *                 zoomOption                                centerOption
 *      `RoamOptionMixin['center']` is a user specified point on the space of `ViewInner['dataRect']`,
 *      which will be located to the center of `ViewInner['viewRect']`.
 *      It can also be a percent value (e.g. '50%'), based on ViewInner['dataRect'].width/height` (since v6).
 *      Under this definition, users can use '0%' to map the top-left of `ViewInner['dataRect']`
 *      to the center of `ViewInner['viewRect']`.
 *      NOTICE:
 *        - `RoamOptionMixin['center']` is in a linear space regardless of `GeoCommonOptionMixin['projection']`
 *        - Absolute values in centerOption may hardly have a rigorous meaningful definition if the layout
 *          is auto-calculated, since users are unlikely to known the exact value of the bounding rect.
 *          And it is affected by the settings of ViewInner['dataRect'] and ViewInner['viewRect'].
 *          Therefore, percent centerOption is preferred.
 *      Use cases:
 *        geo and map series (`MapDraw`) use this transformation for roamming, since the source
 *        has been converted with respect to VIEW_COORD_SYS_TRANS_RAW.
 *
 *  @tutorial [VIEW_COORD_SYS_TRANS_OVERALL]
 *    This is the result of
 *      `matrix_left_multiply(VIEW_COORD_SYS_TRANS_ROAM, VIEW_COORD_SYS_TRANS_RAW)`.
 *    Use case:
 *      sankey/tree/graph series use this transformation for roamming.
 *
 *  @tutorial [VIEW_COORD_SYS_TRANSFORMATION_FORMULA]
 *    [Basic]:
 *      {pxSpace} <-roamTrans- {viewRectSpace} <-rawTrans- {dataRectSpace} <-- ...
 *      pxPoint = roamTrans * rawTrans * dataPoint
 *      overallTrans = roamTrans * rawTrans
 *    [e.g., geo case]:
 *             pxPoint = roamTrans * (rawTrans * (projection * dataPoint))
 *      Hence: pxPoint = group_syncBackType_ROAM * (rawTrans * (projection * dataPoint))
 *      Hence: pxPoint = group_syncBackType_ROAM * rawTrans_projection_precalculated_point
 *    [e.g., graph series case]:
 *             pxPoint = (roamTrans * rawTrans) * upper_els
 *      Hence: pxPoint = group_syncBackType_OVERALL * upper_els
 *      (NOTE: upper_els can have their own transformations)
 *
 * @see viewCoordSysCopyTrans for fetching transformations.
 */
export const VIEW_COORD_SYS_TRANS_RAW = 0;
export const VIEW_COORD_SYS_TRANS_ROAM = 1;
export const VIEW_COORD_SYS_TRANS_OVERALL = 2;

/**
 * Private props of VIEW_COORD_SYS.
 */
interface ViewInner extends View {

    /**
     * @see useLegacyViewCoordSysCenterBase
     */
    lgCt?: {w: number; h: number;} | NullUndefined;
    lgGeo?: Transformable;
    invertY: boolean;

    /**
     * @see VIEW_COORD_SYS_CENTER_ZOOM_DEFINITION
     */
    centerOption: RoamOptionMixin['center'] | NullUndefined;
    zoom: RoamOptionMixin['zoom'];
    zoomLimit: RoamOptionMixin['scaleLimit'] | NullUndefined;

    /**
     * The index is `VIEW_COORD_SYS_TRANS_RAW`/`VIEW_COORD_SYS_TRANS_ROAM`/`VIEW_COORD_SYS_TRANS_OVERALL`.
     *
     * TRANSFORMABLE_PROPS on the returned transformable is ready to use.
     */
    trans: Transformable[];

    /**
     * This is `transformableGetLocalTransform(viewInner.trans[VIEW_COORD_SYS_TRANS_RAW])`.
     * It should follow each update of `viewInner.trans[VIEW_COORD_SYS_TRANS_RAW]`.
     */
    mtRaw: MatrixArray;
    /**
     * This is the inverse matrix of `mtRaw`.
     */
    mtRawInv: MatrixArray;
    /**
     * This is `transformableGetLocalTransform(viewInner.trans[VIEW_COORD_SYS_TRANS_OVERALL])`
     * It should follow each update of `viewInner.trans[VIEW_COORD_SYS_TRANS_OVERALL]`.
     */
    mtOverall: MatrixArray;
    /**
     * This is the inverse matrix of `mtOverall`.
     */
    mtOverallInv: MatrixArray;

    /**
     * @see VIEW_COORD_SYS_TRANS_RAW
     */
    dataRect: BoundingRect | NullUndefined;
    /**
     * @see VIEW_COORD_SYS_TRANS_RAW
     */
    viewRect: BoundingRect | NullUndefined;

    /**
     * @see VIEW_COORD_SYS_ANIMATION
     */
    syncBackEl: Element | NullUndefined;
    syncBackType: typeof VIEW_COORD_SYS_TRANS_ROAM | typeof VIEW_COORD_SYS_TRANS_OVERALL;
}

function inner(viewCoordSys: View): ViewInner {
    return viewCoordSys as ViewInner;
}

export const VIEW_COORD_SYS_TYPE = 'view';

/**
 * [VIEW_COORD_SYS]
 *
 * @final [NOTICE] Inheritance of this class is not recommended. Use composition instead.
 */
class View extends Transformable implements CoordinateSystemMaster, CoordinateSystem {

    readonly type: string = VIEW_COORD_SYS_TYPE;

    static dimensions = ['x', 'y'];
    readonly dimensions = ['x', 'y'];

    constructor(
        invertY?: boolean,
        legacyCenterBase?: ViewInner['lgCt'],
        legacyGeo?: Transformable
    ) {
        super();
        const viewInner = inner(this);

        viewInner.invertY = invertY;

        viewInner.lgCt = legacyCenterBase;
        viewInner.lgGeo = legacyGeo;

        const trans: ViewInner['trans'] = viewInner.trans = [];
        trans[VIEW_COORD_SYS_TRANS_RAW] = transformableCreate();
        trans[VIEW_COORD_SYS_TRANS_ROAM] = transformableCreate();
        trans[VIEW_COORD_SYS_TRANS_OVERALL] = transformableCreate();

        viewInner.mtRaw = matrixCreate();
        viewInner.mtRawInv = matrixCreate();
        viewInner.mtOverall = matrixCreate();
        viewInner.mtOverallInv = matrixCreate();

        viewInner.zoom = 1;
    }

    /**
     * @implements CoordinateSystem['getBoundingRect']
     * @see VIEW_COORD_SYS_TRANS_RAW
     *
     * This is a rect in data space.
     * For historicall reason, the name is `getBoundingRect` - preserve it for backward compatibility.
     */
    getBoundingRect(): BoundingRect {
        return viewCoordSysCopyBoundingRect(null, this);
    }

    /**
     * @implements CoordinateSystem['getViewRect']
     * @see VIEW_COORD_SYS_TRANS_RAW
     */
    getViewRect(): BoundingRect {
        return viewCoordSysCopyViewRect(null, this);
    }

    /**
     * @implements CoordinateSystem['getRoamTransform']
     */
    getRoamTransform(): MatrixArray {
        return transformableGetLocalTransform(inner(this).trans[VIEW_COORD_SYS_TRANS_ROAM]);
    }

    dataToPoint(data: number[], noRoam?: boolean, out?: number[]): number[] {
        const transform = noRoam ? inner(this).mtRaw : inner(this).mtOverall;
        out = out || [];
        return transform
            ? vectorApplyTransform(out, data, transform)
            : vectorCopy(out, data);
    }

    pointToData(point: number[], reserved?: unknown, out?: number[]): number[] {
        out = out || [];
        const invTransform = inner(this).mtOverallInv;
        return invTransform
            ? vectorApplyTransform(out, point, invTransform)
            : vectorCopy(out, point);
    }

    convertToPixel(
        ecModel: GlobalModel, finder: ParsedModelFinder, value: number[]
    ): number[] {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? coordSys.dataToPoint(value) : null;
    }

    convertFromPixel(
        ecModel: GlobalModel, finder: ParsedModelFinder, pixel: number[]
    ): number[] {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? coordSys.pointToData(pixel) : null;
    }

    containPoint(point: number[]): boolean {
        const viewInner = inner(this);
        boundingRectCopy(tmpPixelRectForContain, viewInner.dataRect);
        boundingRectApplyTransform(tmpPixelRectForContain, tmpPixelRectForContain, viewInner.mtOverall);
        return boundingRectContain(tmpPixelRectForContain, point[0], point[1]);
    }

    // getScalarScale() {
    //     // Use determinant square root of transform to multiply scalar
    //     let m = this.transform;
    //     let det = Math.sqrt(Math.abs(m[0] * m[3] - m[2] * m[1]));
    //     return det;
    // }
}
const tmpPixelRectForContain = boundingRectCreate();


export function viewCoordSysCopyOverallMatrix(
    out: MatrixArray | NullUndefined, viewCoordSys: View
): MatrixArray {
    return matrixCopy(out || [], inner(viewCoordSys).mtOverall);
}

export function viewCoordSysGetZoomOption(viewCoordSys: View): RoamOptionMixin['zoom'] {
    return inner(viewCoordSys).zoom;
}

export function viewCoordSysCopyBoundingRect(
    out: BoundingRect | NullUndefined, viewCoordSys: View
): BoundingRect {
    return boundingRectCopy(out || boundingRectCreate(), inner(viewCoordSys).dataRect);
}

export function viewCoordSysCopyViewRect(
    out: BoundingRect | NullUndefined, viewCoordSys: View
): BoundingRect {
    return boundingRectCopy(out || boundingRectCreate(), inner(viewCoordSys).viewRect);
}

/**
 * Copy from `ViewInner['trans']`.
 */
export function viewCoordSysCopyTrans(
    out: NullUndefined,
    viewCoordSys: View,
    transKind: typeof VIEW_COORD_SYS_TRANS_RAW | typeof VIEW_COORD_SYS_TRANS_ROAM | typeof VIEW_COORD_SYS_TRANS_OVERALL
): Transformable;
export function viewCoordSysCopyTrans<TOut extends Transformable>(
    out: TOut,
    viewCoordSys: View,
    transKind: typeof VIEW_COORD_SYS_TRANS_RAW | typeof VIEW_COORD_SYS_TRANS_ROAM | typeof VIEW_COORD_SYS_TRANS_OVERALL
): TOut;
export function viewCoordSysCopyTrans(
    out: Transformable | NullUndefined,
    viewCoordSys: View,
    transKind: typeof VIEW_COORD_SYS_TRANS_RAW | typeof VIEW_COORD_SYS_TRANS_ROAM | typeof VIEW_COORD_SYS_TRANS_OVERALL
    // @return The input `out` or create an object.
): Transformable {
    return copyTransform(
        out || transformableCreate(),
        inner(viewCoordSys).trans[transKind]
    );
}

function viewCoordSysIsInputReady(viewInner: ViewInner): boolean {
    return !!(viewInner.dataRect && viewInner.viewRect);
    // NOTE: Other parameters has default values. Only parameters
    // above are required to be input.
}

function calcOverallTransFromSyncBackEl(
    out: Transformable,
    viewInner: ViewInner,
    syncBackEl: Transformable,
    syncBackType: typeof VIEW_COORD_SYS_TRANS_ROAM | typeof VIEW_COORD_SYS_TRANS_OVERALL
): void {
    if (syncBackType === VIEW_COORD_SYS_TRANS_ROAM) {
        calcOverallTrans(
            out,
            viewInner.trans[VIEW_COORD_SYS_TRANS_RAW],
            syncBackEl
        );
    }
    else {
        copyTransform(out, syncBackEl);
    }
}

function calcRoamTransFromOverallTrans(
    out: Transformable,
    viewInner: ViewInner,
    overallTrans: Transformable
): void {
    // Convert overallTrans to roamTrans. If update animation is applied to overallTrans,
    // we assume that rawTrans is changed instantly, and roamTrans takes that animation.
    // Formula:
    //  overallTrans = roamTrans * rawTrans
    //  overallTrans * invert(rawTrans) = roamTrans
    transformableGetLocalTransform(overallTrans, tmpMtRTO);
    matrixMul(tmpMtRTO, tmpMtRTO, viewInner.mtRawInv);
    decomposeTransform(out, tmpMtRTO);
}
const tmpMtRTO = matrixCreate();

/**
 * [NOTICE]
 *  The definition of this center has always been irrelevant to some other series center like
 *  'series-pie.center' - this center is a point in the space of `ViewInner['dataRect'].x/y`,
 *  rather than canvas viewport, and the unit is not necessarily pixel (e.g., in geo case).
 */
export function viewCoordSysSetRoamOptionFromModel(
    viewCoordSys: View,
    hostModel: RoamHostComponentOrSeries
): void {
    const viewInner = inner(viewCoordSys);
    viewInner.centerOption = hostModel.getShallow('center');
    const zoomLimit = viewInner.zoomLimit = hostModel.getShallow('scaleLimit');
    const zoomOption = hostModel.getShallow('zoom');

    viewInner.zoom = clampByZoomLimit(zoomOption || 1, zoomLimit) || 1;

    if (viewCoordSysIsInputReady(viewInner)) {
        viewCoordSysUpdateTransform(viewInner);
    }
}

/**
 * @see ViewInner['dataRect']
 */
export function viewCoordSysSetBoundingRect(
    viewCoordSys: View,
    x: number, y: number, width: number, height: number
): void {
    const viewInner = inner(viewCoordSys);
    viewInner.dataRect = new BoundingRect(x, y, width, height);
    if (viewCoordSysIsInputReady(viewInner)) {
        viewCoordSysUpdateTransform(viewInner);
    }
}

/**
 * @see ViewInner['viewRect']
 */
export function viewCoordSysSetViewRect(
    viewCoordSys: View,
    x: number, y: number, width: number, height: number
): void {
    const viewInner = inner(viewCoordSys);
    viewInner.viewRect = new BoundingRect(x, y, width, height);
    if (viewCoordSysIsInputReady(viewInner)) {
        viewCoordSysUpdateTransform(viewInner);
    }
}

function viewCoordSysUpdateTransform(
    viewInner: ViewInner
): void {
    // The order matters.
    viewCoordSysUpdateRawTrans(viewInner);
    viewCoordSysUpdateRoamTrans(viewInner);
    viewCoordSysUpdateOverallTrans(viewInner);
}

function viewCoordSysUpdateRawTrans(
    viewInner: ViewInner
): void {
    let dataRect = viewInner.dataRect;
    const viewRect = viewInner.viewRect;

    const rawTrans = viewInner.trans[VIEW_COORD_SYS_TRANS_RAW];
    const invertY = viewInner.invertY;

    if (invertY) {
        dataRect = boundingRectCopy(tmpRectURT, dataRect);
        dataRect.y = -dataRect.y - dataRect.height;
    }

    boundingRectCalculateTransform(tmpMtURT, dataRect, viewRect);
    decomposeTransform(rawTrans, tmpMtURT);

    if (invertY) {
        rawTrans.scaleY = -rawTrans.scaleY;
    }

    const mtRaw = transformableGetLocalTransform(rawTrans, viewInner.mtRaw);
    matrixInvert(viewInner.mtRawInv, mtRaw);
}
const tmpMtURT = matrixCreate();
const tmpRectURT = boundingRectCreate();

/**
 * NOTICE: It depends on `viewCoordSysUpdateRawTrans`.
 */
function viewCoordSysUpdateRoamTrans(viewInner: ViewInner): void {
    const viewRectCenter = viewCoordSysGetViewRectCenter(viewInner);
    const roamViewCenter = parseCenterOption(tmpCenterURT, viewInner, viewInner.centerOption)
        ? vectorApplyTransform(tmpCenterURT, tmpCenterURT, viewInner.mtRaw)
        : viewRectCenter;

    const zoom = viewInner.zoom;
    const roamTrans = viewInner.trans[VIEW_COORD_SYS_TRANS_ROAM];
    roamTrans.x = viewRectCenter[0] - zoom * roamViewCenter[0];
    roamTrans.y = viewRectCenter[1] - zoom * roamViewCenter[1];
    roamTrans.scaleX = roamTrans.scaleY = zoom;
    // [VIEW_COORD_SYS_APPLY_ROAM_CENTER_AND_ZOOM]
    // Ordinarily, the definition is:
    //  roamTrans.originX = roamViewCenter[0];
    //  roamTrans.originY = roamViewCenter[1];
    //  roamTrans.x = viewRectCenter[0] - roamViewCenter[0];
    //  roamTrans.y = viewRectCenter[1] - roamViewCenter[1];
    //  roamTrans.scaleX = roamTrans.scaleY = zoom;
    // But `el.originX`/`originY` should not be set.
    // (see VIEW_COORD_SYS_ANIMATION_PROPS_CONSTRAINT for the reason),
    // so we use the above formula instead.
}
const tmpCenterURT: number[] = [];

/**
 * NOTICE: It depends on `viewCoordSysUpdateRoamTrans` and `viewCoordSysUpdateRawTrans`
 */
function viewCoordSysUpdateOverallTrans(viewInner: ViewInner): void {
    const trans = viewInner.trans;
    const roamTrans = trans[VIEW_COORD_SYS_TRANS_ROAM];
    const rawTrans = trans[VIEW_COORD_SYS_TRANS_RAW];
    const overallTrans = trans[VIEW_COORD_SYS_TRANS_OVERALL];

    calcOverallTrans(overallTrans, rawTrans, roamTrans);

    const mtOverall = transformableGetLocalTransform(overallTrans, viewInner.mtOverall);
    const mtOverallInv = matrixInvert(viewInner.mtOverallInv, mtOverall);

    legacyCopyOverallTrans(viewInner, overallTrans, mtOverall, mtOverallInv);
    legacyCopyOverallTrans(viewInner.lgGeo, overallTrans, mtOverall, mtOverallInv);
}

/**
 * [VIEW_COORD_SYS_TRANS_OVERALL_BACKWARD_COMPATIBILITY]
 *   VIEW_COORD_SYS_TRANS_OVERALL transformable has long been View or Geo instance itself.
 *   We keep backward compatibility, since some users may have visited it directly (e.g.
 *   for drawing a computed bounding rect).
 */
function legacyCopyOverallTrans(
    target: Transformable | NullUndefined,
    overallTrans: Transformable,
    mtOverall: MatrixArray,
    mtOverallInv: MatrixArray
): void {
    if (target) {
        copyTransform(target, overallTrans);
        matrixCopy(target.transform || (target.transform = []), mtOverall);
        matrixCopy(target.invTransform || (target.invTransform = []), mtOverallInv);
    }
}

function calcOverallTrans(
    out: Transformable,
    rawTrans: Transformable,
    roamTrans: Transformable
): void {
    transformableGetLocalTransform(rawTrans, tmpMtCOT1);
    transformableGetLocalTransform(roamTrans, tmpMtCOT2);
    matrixMul(tmpMtCOT2, tmpMtCOT2, tmpMtCOT1);
    decomposeTransform(out, tmpMtCOT2);
}
const tmpMtCOT1 = matrixCreate();
const tmpMtCOT2 = matrixCreate();

function getCoordSys(finder: ParsedModelFinderKnown): View {
    const seriesModel = finder.seriesModel;
    return seriesModel ? seriesModel.coordinateSystem as View : null; // e.g., graph.
}

function viewCoordSysGetViewRectCenter(viewInner: ViewInner): number[] {
    const viewRect = viewInner.viewRect;
    tmpViewRectCenter[0] = viewRect.x + viewRect.width / 2;
    tmpViewRectCenter[1] = viewRect.y + viewRect.height / 2;
    return tmpViewRectCenter;
}
const tmpViewRectCenter: number[] = [];

export function isViewCoordSys(coordSys: CoordinateSystem | NullUndefined): coordSys is View {
    return coordSys && coordSys.type === 'view';
}

/**
 * NOTICE:
 *  - `syncBackEl` should be in the pixel space without any other transformation
 *    in its accesters, otherwise the roaming may incorrect.
 *  - `syncBackEl` can be a `Group`, having its own descendants and transformation.
 *    But in this case, `dataToPoint` can only reach the space of `syncBackEl` itself.
 */
export function applyViewCoordSysTransToElement(
    syncBackEl: Element | NullUndefined,
    syncBackType: typeof VIEW_COORD_SYS_TRANS_ROAM | typeof VIEW_COORD_SYS_TRANS_OVERALL,
    viewCoordSys: View,
    // If NullUndefined, no animation.
    // Typically, there should be no animation in the first render and in `__updateOnOwnRoam`.
    animatableModel: Model<AnimationOptionMixin> | NullUndefined
): void {
    const viewInner = inner(viewCoordSys);
    viewInner.syncBackEl = syncBackEl;
    viewInner.syncBackType = syncBackType;

    if (!animatableModel) {
        viewCoordSysCopyTrans(syncBackEl, viewCoordSys, syncBackType);
        syncBackEl.dirty();
    }
    else {
        updateProps(
            syncBackEl,
            viewCoordSysCopyTrans(null, viewCoordSys, syncBackType),
            animatableModel
        );
    }
}

/**
 * FIXME: [FIXME_VIEW_COORD_SYS_SYNC_BACK]
 *  Currently the "sync back" is only performed on roam action. But these cases are not
 *  covered:
 *  1. Consider both center change and series data adding is requested via `setOption`
 *    and animation is not finished, the new added series symbols should lay out based
 *    on the "intermediate state" rather than the "final state" of the VIEW_COORD_SYS,
 *    otherwise, visual artifacts can arise.
 *  2. See the case of FIXME_SYMBOL_CLIP_CONSIDERING_COORD_SYS_ALIGNMENT_DURING_ANIMATION .
 */
function viewCoordSysSyncBack(
    viewCoordSys: View,
    hostModel: RoamHostComponentOrSeries,
    otherModelsToSync: RoamHostComponentOrSeries[] | NullUndefined,
    payload: RoamPayload | NullUndefined
): void {
    const viewInner = inner(viewCoordSys);
    const syncBackEl = viewInner.syncBackEl;
    if (syncBackEl) {
        if (__DEV__) {
            assert(viewInner.syncBackType != null);
        }
        // @see VIEW_COORD_SYS_ANIMATION_INTERRUPTION
        syncBackEl.stopAnimation();
        // syncBackEl may have been changed regardless of animation,
        // therefore, need to sync back.
        calcOverallTransFromSyncBackEl(tmpTransSB1, viewInner, syncBackEl, viewInner.syncBackType);
    }
    else {
        copyTransform(tmpTransSB1, viewInner.trans[VIEW_COORD_SYS_TRANS_OVERALL]);
    }

    // Sync back to model.
    calcRoamTransFromOverallTrans(tmpTransSB2, viewInner, tmpTransSB1);
    payload
        ? applyRoamPayloadToOverallTrans(tmpTransSB1, tmpTransSB2, viewInner, payload)
        : copyTransform(tmpTransSB1, tmpTransSB2);
    calcRoamTransFromOverallTrans(tmpTransSB1, viewInner, tmpTransSB1);
    syncBackToRoamOptionFromRoamTrans(viewInner, hostModel, otherModelsToSync, tmpTransSB1);
}
const tmpTransSB1 = transformableCreate();
const tmpTransSB2 = transformableCreate();

/**
 * Invert to `center` and `zoom` of VIEW_COORD_SYS and host models based on
 *  - `syncBackEl` or VIEW_COORD_SYS_TRANS_OVERALL
 *  - Delta in `payload`.
 *
 * Should be only called in action handlers.
 *
 * @see RoamHostView['__updateOnOwnRoam']
 */
export function ownRoamModelCoordSysUpdateInAction(
    payload: RoamPayload,
    hostModel: RoamHostComponentOrSeries,
    // This is only used for MAP_SERIES_GROUP, where the change need to sync to all series,
    // otherwise when legend filter some series and the other series take the responsibility
    // to draw map, or roam then legend restored, the result will be incorrect.
    otherModelsToSync?: RoamHostComponentOrSeries[] | NullUndefined
): void {
    // NOTE: VIEW_COORD_SYS instances are depended on by this action handler.
    // Under the current design, actions should not be triggered before `setOption`
    // being called, therefore coord sys instances always exist.
    const viewCoordSys = getOwnRoamViewCoordSys(hostModel);
    if (viewCoordSys) {
        // Sync back to model.
        viewCoordSysSyncBack(viewCoordSys, hostModel, otherModelsToSync, payload);
        // Recalculate from model.
        viewCoordSysSetRoamOptionFromModel(viewCoordSys, hostModel);
    }
}

export function getOwnRoamViewCoordSys(hostModel: RoamHostComponentOrSeries): View | NullUndefined {
    return hostModel.__ownRoamView ? hostModel.__ownRoamView() : null;
}

export function ownRoamViewUpdateDirectlyInAction(
    payload: RoamPayload,
    componentOrSeries: ComponentModel,
    ecModel: GlobalModel,
    api: ExtensionAPI
): void {
    // Tricky: disable animation in `updateProps` of `graphic.ts`.
    ecModel.setUpdatePayload(payloadDisableAnimation(payload));

    const componentOrSeriesView = getViewOfComponentOrSeries(api, componentOrSeries);
    if (componentOrSeriesView && (componentOrSeriesView as ChartComponentRoamHostView).__updateOnOwnRoam) {
        (componentOrSeriesView as ChartComponentRoamHostView).__updateOnOwnRoam(payload, componentOrSeries, api);
    }
}

function applyRoamPayloadToOverallTrans(
    targetOverallTrans: Transformable,
    roamTrans: Transformable,
    viewInner: ViewInner,
    payload: RoamPayload
): void {
    // NOTE: payload.dx/dy should always applied to pixel space, i.e., "overallTrans".
    if (payload.dx != null && payload.dy != null) {
        targetOverallTrans.x += payload.dx;
        targetOverallTrans.y += payload.dy;
    }
    const deltaZoom = payload.zoom;
    if (deltaZoom != null) {
        // Although `zoomOption` is defined on roamTrans
        const oldZoom = getZoomFromRoamTrans(roamTrans);
        const newZoom = clampByZoomLimit(oldZoom * deltaZoom, viewInner.zoomLimit);
        const deltaZoom2 = newZoom / oldZoom;

        // Keep the mouse center when scaling.
        targetOverallTrans.x -= (payload.originX - targetOverallTrans.x) * (deltaZoom2 - 1);
        targetOverallTrans.y -= (payload.originY - targetOverallTrans.y) * (deltaZoom2 - 1);
        // Although `zoomOption` is defined on roamTrans,
        // deltaZoom can be applied to overallTrans directly.
        targetOverallTrans.scaleX *= deltaZoom2;
        targetOverallTrans.scaleY *= deltaZoom2;
    }
}

function getZoomFromRoamTrans(trans: Transformable): number {
    if (__DEV__) {
        // scaleX and scaleY should be the same even during animation.
        // See VIEW_COORD_SYS_APPLY_ROAM_CENTER_AND_ZOOM .
        assert(mathAbs(trans.scaleX - trans.scaleY) < 1e-5);
    }
    return trans.scaleX;
}

function parseCenterOption(
    // `out` is a center in `dataRect` space.
    out: number[],
    viewInner: ViewInner,
    centerOption: RoamOptionMixin['center']
    // @return Whether a valid center is obtained.
): boolean {
    if (__DEV__) {
        assert(viewCoordSysIsInputReady(viewInner));
    }
    const dataRect = viewInner.dataRect;
    if (!centerOption) {
        return false;
    }
    // #16904 introduced percentage string here, such as '33%'. But it was based on canvas
    // width/height, which is not reasonable - the unit may incorrect, and it is unpredictable if
    // the `ViewInner['dataRect']` is not calculated based on the current canvas rect. Therefore the percentage
    // value is changed to based on `ViewInner['dataRect'].width/height` since v6. Under this definition, users
    // can use '0%' to map the top-left of `ViewInner['dataRect']` to the center of `ViewInner['viewRect']`.
    const lgCt = viewInner.lgCt;
    if (lgCt) {
        vectorSet(
            out,
            parsePercent(centerOption[0], lgCt.w),
            parsePercent(centerOption[1], lgCt.h)
        );
    }
    else if (dataRect) {
        vectorSet(
            out,
            parsePercent(centerOption[0], dataRect.width, dataRect.x),
            parsePercent(centerOption[1], dataRect.height, dataRect.y)
        );
    }
    return true;
}

/**
 * An inverse operation to `parseCenterOption`.
 * Mainly for percentage center option.
 */
function invertBackToCenterOption(
    viewInner: ViewInner,
    center: number[]
): RoamOptionMixin['center'] {
    const lastCenterOption = viewInner.centerOption;
    const dataRect = viewInner.dataRect;
    if (__DEV__) {
        assert(center && dataRect);
    }
    return (!lastCenterOption || viewInner.lgCt)
        ? center.slice()
        : [
            invertToPercentPerCenterDim(0, center, lastCenterOption, dataRect),
            invertToPercentPerCenterDim(1, center, lastCenterOption, dataRect),
        ];
}

function invertToPercentPerCenterDim(
    dimIdx: 0 | 1,
    center: number[],
    lastCenterOption: RoamOptionMixin['center'],
    dataRect: BoundingRect
): RoamOptionMixin['center'][number] {
    return (
        lastCenterOption
        && dataRect
        && dataRect[WH[dimIdx]]
        && isPositionSizeOptionPercent(lastCenterOption[dimIdx])
    )
        ? (
            (center[dimIdx] - dataRect[XY[dimIdx]]) / dataRect[WH[dimIdx]] * 100
        ) + '%'
        : center[dimIdx];
}

export function useLegacyViewCoordSysCenterBase(
    ecModel: GlobalModel,
    api: ExtensionAPI
): ViewInner['lgCt'] {
    return (api && ecModel && ecModel.getShallow('legacyViewCoordSysCenterBase'))
        ? {w: api.getWidth(), h: api.getHeight()}
        : null;
}

/**
 * @see VIEW_COORD_SYS_ANIMATION_INTERRUPTION
 */
function syncBackToRoamOptionFromRoamTrans(
    viewInner: ViewInner,
    hostModel: RoamHostComponentOrSeries,
    otherModelsToSync: RoamHostComponentOrSeries[] | NullUndefined,
    roamTrans: Transformable,
): void {
    // This is the inverse operation of `viewCoordSysSetRoamOptionFromModel`.
    const viewRectCenter = viewCoordSysGetViewRectCenter(viewInner);
    const zoom = getZoomFromRoamTrans(roamTrans);
    const notZoomNearZero = mathAbs(zoom) > 1e-6;
    tmpCenterITR[0] = notZoomNearZero
        ? (viewRectCenter[0] - roamTrans.x) / zoom
        : viewRectCenter[0]; // Unlikely to occur.
    tmpCenterITR[1] = notZoomNearZero
        ? (viewRectCenter[1] - roamTrans.y) / zoom
        : viewRectCenter[1]; // Unlikely to occur.

    vectorApplyTransform(tmpCenterITR, tmpCenterITR, viewInner.mtRawInv);

    const centerOption = invertBackToCenterOption(viewInner, tmpCenterITR);
    syncBackRoamOptionToRoamHostModel(hostModel, centerOption, zoom);
    each(otherModelsToSync, function (otherModel) {
        if (otherModel !== hostModel) {
            syncBackRoamOptionToRoamHostModel(otherModel, centerOption.slice(), zoom);
        }
    });
}
const tmpCenterITR: number[] = [];

/**
 * Models should be updated, otherwise consequent `setOption()` can cause outdated `center`
 * and `zoom` to be used.
 */
function syncBackRoamOptionToRoamHostModel(
    hostModel: RoamHostComponentOrSeries,
    center: RoamOptionMixin['center'],
    zoom: number
): void {
    const option = hostModel.option;
    option.center = center;
    option.zoom = zoom;
}

export function clampByZoomLimit(
    zoom: number,
    zoomLimit: RoamOptionMixin['scaleLimit'] | NullUndefined
): number {
    if (zoomLimit) {
        const zoomMin = zoomLimit.min || 0;
        const zoomMax = zoomLimit.max || Infinity;
        zoom = Math.max(
            Math.min(zoomMax, zoom),
            zoomMin
        );
    }
    return zoom;
}

export function calcCompensationScaleToPreserveNodeSize(
    viewCoordSys: View,
    model: Model<Pick<RoamOptionMixin, 'nodeScaleRatio'>>
) {
    const nodeScaleRatio = (model.getShallow('nodeScaleRatio', true) || 1);
    const viewInner = inner(viewCoordSys);
    // Scale node when zoom changes
    return ((viewInner.zoom - 1) * nodeScaleRatio + 1)
        / (viewInner.trans[VIEW_COORD_SYS_TRANS_OVERALL].scaleX || 1);
}

export default View;

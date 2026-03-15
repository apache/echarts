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
    assert, isArray, eqNaN, isFunction, each, HashMap, createHashMap
} from 'zrender/src/core/util';
import Scale from '../scale/Scale';
import { AxisBaseModel } from './AxisBaseModel';
import { parsePercent } from 'zrender/src/contain/text';
import {
    NumericAxisBaseOptionCommon,
    NumericAxisBoundaryGapOptionItemValue,
} from './axisCommonTypes';
import { DimensionIndex, DimensionName, NullUndefined, ScaleDataValue } from '../util/types';
import { isIntervalScale, isLogScale, isOrdinalScale, isTimeScale } from '../scale/helper';
import {
    makeInner, initExtentForUnion, unionExtentFromNumber, isValidNumberForExtent,
    extentHasValue,
    unionExtentFromExtent,
    unionExtentStartFromNumber,
    unionExtentEndFromNumber,
} from '../util/model';
import { getDataDimensionsOnAxis } from './axisHelper';
import {
    getCoordForCoordSysUsageKindBox
} from '../core/CoordinateSystem';
import type GlobalModel from '../model/Global';
import { error } from '../util/log';
import type Axis from './Axis';
import { mathMax, mathMin } from '../util/number';
import { SCALE_EXTENT_KIND_MAPPING } from '../scale/scaleMapper';
import { AxisStatKey, eachKeyOnAxis, eachSeriesOnAxis } from './axisStatistics';


/**
 * NOTICE: Can be only used in `ensureScaleStore(axisLike)`.
 *
 * In most cases the instances of `Axis` and `Scale` are one-to-one mapping and share the same lifecycle.
 * But in some external usage (such as echarts-gl), axis instance does not necessarily exist, and only
 * scale instance and axisModel are used. Therefore we store the internal info on scale instance directly.
 */
const scaleInner = makeInner<{
    extent: number[];
    dimIdxInCoord: number;
}, Scale>();

export const AXIS_EXTENT_INFO_BUILD_FROM_COORD_SYS_UPDATE = 1;
export const AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM = 2;
const AXIS_EXTENT_INFO_BUILD_FROM_EMPTY = 3;
export type AxisExtentInfoBuildFrom =
    typeof AXIS_EXTENT_INFO_BUILD_FROM_COORD_SYS_UPDATE
    | typeof AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM
    | typeof AXIS_EXTENT_INFO_BUILD_FROM_EMPTY;

/**
 * It is originally created as `ScaleRawExtentResultFinal['fixMinMax']` and may be
 * modified in the subsequent process.
 * It suggests axes to use `scaleRawExtentResult.min/max` directly as their bounds,
 * instead of expanding the extent by some "nice strategy". But axes may refuse to
 * comply with it in some special cases, for example, when their scale extents are
 * invalid, or when they need to be expanded to visually contain series bars.
 *
 * In `ScaleRawExtentResultFinal['fixMinMax']`, it is `true` iff:
 *  - ec option `xxxAxis.min/max` are specified, or
 *  - `scaleRawExtentResult.zoomFixMinMax[]` are `true`.
 *  - `min` `max` are expanded by `AxisContainShapeHandler`.
 *
 * In the subsequent process, it may be modified to `true` for customization.
 */
export type ScaleExtentFixMinMax = boolean[];

type ScaleRawExtentResultForContainShape = Pick<
    ScaleRawExtentInternal,
    'noZoomEffMM' | 'containShape'
>;

/**
 * Return the min max before `dataZoom` applied.
 */
export type ScaleRawExtentResultForZoom = {
    // "effective" means `SCALE_EXTENT_KIND_EFFECTIVE`.
    noZoomEffMM: number[];
    // "mapping" means `SCALE_EXTENT_KIND_MAPPING`.
    noZoomMapMM: number[];
};

type ScaleRawExtentResultFinal = Pick<
    ScaleRawExtentInternal,
    'fixMM' | 'zoomFixMM' | 'isBlank' | 'needCrossZero' | 'needToggleAxisInverse'
> & {
    // This is the effective min max. "effective" indicates `SCALE_EXTENT_KIND_EFFECTIVE`.
    // It is determined by series data extent and ec options such as `xxxAxis.min/max`,
    // `xxxAxis.boundaryGap`, etc. And this is the input of "nice" strategy.
    // Ensure `effMM` has only finite numbers or `NaN`, but never has `null`/`undefined`.
    // `NaN` means min/max axis is blank.
    effMM: number[];

    // Expected min max for mapping. "mapping" indicates `SCALE_EXTENT_KIND_MAPPING`.
    // It has to be applied after "nice" strategies (see `scaleCalcNice`) being applied,
    // since "nice" strategies may expand the scale extent originated from `effMM`.
    mapMM: number[];
};

type ScaleRawExtentResultOthers = Pick<
    ScaleRawExtentInternal,
    'startValue' | 'dataMM'
>;


/**
 * CAVEAT: MUST NOT be modified outside!
 */
interface ScaleRawExtentInternal {

    scale: Scale;

    // The effective min max before `dataZoom` applied.
    // "effective" means `SCALE_EXTENT_KIND_EFFECTIVE`.
    noZoomEffMM: number[];

    // Expanded from `noZoomEffMM`. `NullUndefined` means not used.
    // This is relevant to `SCALE_EXTENT_KIND_MAPPING`.
    noZoomEffMMExp?: number[] | NullUndefined;

    // data min max, an union from series data on this axis and `model.dataMin/dataMax`.
    // May be at the initial state `[Infinity, -Infinity]`.
    dataMM: number[];

    // Specified by `dataZoom` when its start/end is not 0%/100%.
    // `NullUndefined` means not specified.
    // Highest priority if specified.
    zoomMM: (number | NullUndefined)[];

    // See comments of `ScaleExtentFixMinMax`
    fixMM: ScaleExtentFixMinMax;

    // It indicates that the min max have been fixed by `dataZoom` when its start/end is not 0%/100%.
    zoomFixMM: ScaleExtentFixMinMax;

    startValue: number;

    // Mark that the axis should be blank.
    isBlank: boolean;

    needCrossZero: boolean;

    needToggleAxisInverse: boolean;

    containShape: boolean;
}

export type AxisContainShapeHandler = (
    axis: Axis,
    scale: Scale,
    ecModel: GlobalModel
    // @return: supplement in linear space.
    //  Must ensure: `supplement[0] <= 0 && supplement[1] >= 0`
    //  - e.g., [-50, 70] indicates the final extent should calculated by adding this supplement:
    //    [
    //        scale.transformOut(scale.transformIn(extent[0]) - 50),
    //        scale.transformOut(scale.transformIn(extent[1]) + 70)
    //    ]
    //  - `null/undefined` means no supplement.
) => number[] | NullUndefined;


export class ScaleRawExtentInfo {

    private _i: ScaleRawExtentInternal;

    // Injected outside
    readonly from: AxisExtentInfoBuildFrom;


    constructor(
        scale: Scale,
        model: AxisBaseModel,
        // Typically: data extent from all series on this axis.
        dataExtent: number[]
    ) {
        const isOrdinal = isOrdinalScale(scale);

        const axisDataLen = isOrdinal
            // FIXME: there is a flaw here: if there is no "block" data processor like `dataZoom`,
            // and progressive rendering is using, here the category result might just only contain
            // the processed chunk rather than the entire result.
            ? model.getCategories().length
            : null;

        // NOTE: also considered the input dataExtent may be still in the initialized state `[Infinity, -Infinity]`.
        const dataMM = dataExtent.slice();
        // custom dataMin/dataMax.
        // Also considered `modelDataMinMax[0] > modelDataMinMax[1]` may occur.
        if (isIntervalScale(scale) || isLogScale(scale) || isTimeScale(scale)) {
            unionExtentStartFromNumber(
                dataMM,
                parseAxisModelMinMax(scale, (model as AxisBaseModel<NumericAxisBaseOptionCommon>).get('dataMin', true))
            );
            unionExtentEndFromNumber(
                dataMM,
                parseAxisModelMinMax(scale, (model as AxisBaseModel<NumericAxisBaseOptionCommon>).get('dataMax', true))
            );
        }
        if (!extentHasValue(dataMM)) {
            // dataMM may be still `[Infinity, -Infinity]`, we use `NaN` on the subsequent calculations
            // to force the `noZoomEffMM` to be `[NaN, NaN]` if needed.
            dataMM[0] = dataMM[1] = NaN;
        }

        const noZoomEffMM: number[] = [];
        const fixMM: boolean[] = [false, false];

        // Notice: When min/max is not set (that is, when there are null/undefined,
        // which is the most common case), these cases should be ensured:
        // (1) For 'ordinal', show all axis.data.
        // (2) For others:
        //      + `boundaryGap` is applied (if min/max set, boundaryGap is
        //      disabled).
        //      + If `needCrossZero`, min/max should be zero, otherwise, min/max should
        //      be the result that originalExtent enlarged by boundaryGap.
        // (3) If no data, it should be ensured that `scale.setBlank` is set.

        let startValue = parseAxisModelMinMax(scale, model.get('startValue', true));
        let modelMinRaw = model.get('min', true);
        if (modelMinRaw == null) {
            modelMinRaw = startValue;
        }
        if (modelMinRaw === 'dataMin') {
            noZoomEffMM[0] = dataMM[0];
            fixMM[0] = true;
        }
        else {
            noZoomEffMM[0] = parseAxisModelMinMax(
                scale,
                isFunction(modelMinRaw)
                    // This callback always provides users the full data extent (before data is filtered).
                    ? modelMinRaw({min: dataMM[0], max: dataMM[1]})
                    : modelMinRaw
            );
            // If `xxxAxis.min: null/undefined`, min should not be fixed.
            fixMM[0] = noZoomEffMM[0] != null;
        }

        const modelMaxRaw = model.get('max', true);
        if (modelMaxRaw === 'dataMax') {
            noZoomEffMM[1] = dataMM[1];
            fixMM[1] = true;
        }
        else {
            noZoomEffMM[1] = parseAxisModelMinMax(
                scale,
                isFunction(modelMaxRaw)
                    // This callback always provides users the full data extent (before data is filtered).
                    ? modelMaxRaw({min: dataMM[0], max: dataMM[1]})
                    : modelMaxRaw
            );
            // If `xxxAxis.max: null/undefined`, max should not be fixed.
            fixMM[1] = noZoomEffMM[1] != null;
        }

        const boundaryGap = parseBoundaryGapOption(scale, model);

        const span = !isOrdinal
            ? ((dataMM[1] - dataMM[0]) || Math.abs(dataMM[0]))
            : null;
        // NOTE: If a numeric axis min/max is specified as 'dataMin'/'dataMax',
        // `boundaryGap` will not be used.
        if (noZoomEffMM[0] == null) {
            noZoomEffMM[0] = isOrdinal
                ? (axisDataLen ? 0 : NaN)
                : dataMM[0] - boundaryGap[0] * span;
        }
        if (noZoomEffMM[1] == null) {
            noZoomEffMM[1] = isOrdinal
                ? (axisDataLen ? axisDataLen - 1 : NaN)
                : dataMM[1] + boundaryGap[1] * span;
        }

        // Normalize to `NaN` if invalid.
        !isValidNumberForExtent(noZoomEffMM[0]) && (noZoomEffMM[0] = NaN);
        !isValidNumberForExtent(noZoomEffMM[1]) && (noZoomEffMM[1] = NaN);

        const isBlank = eqNaN(noZoomEffMM[0]) || eqNaN(noZoomEffMM[1])
            || (isOrdinal && !axisDataLen);

        let needToggleAxisInverse: boolean = false;
        if (noZoomEffMM[0] > noZoomEffMM[1]) {
            // Historically, if users set `xxxAxis.min > xxxAxis.max`, the behavior is
            // sometimes like `xxxAxis.inverse = true`, sometimes abnormal. We remain
            // backward compatible with the former one.
            noZoomEffMM.reverse();
            needToggleAxisInverse = true;
        }

        const needCrossZero = isIntervalScale(scale) && model.getNeedCrossZero && model.getNeedCrossZero();
        if (needCrossZero) {
            if (noZoomEffMM[0] > 0 && noZoomEffMM[1] > 0 && !fixMM[0]) {
                noZoomEffMM[0] = 0;
                // fixMM[0] = true;
            }
            if (noZoomEffMM[0] < 0 && noZoomEffMM[1] < 0 && !fixMM[1]) {
                noZoomEffMM[1] = 0;
                // fixMM[1] = true;
            }
        }

        if (scale.sanitize) {
            startValue = scale.sanitize(startValue, dataMM);
        }

        let containShape = (model as AxisBaseModel<NumericAxisBaseOptionCommon>).get('containShape', true);
        if (containShape == null) {
            containShape = true;
        }

        const internal: ScaleRawExtentInternal = this._i = {
            scale,
            dataMM,
            noZoomEffMM,
            zoomMM: [],
            fixMM,
            zoomFixMM: [false, false],
            startValue,
            isBlank,
            needCrossZero,
            needToggleAxisInverse,
            containShape,
        };

        sanitizeExtent(internal, noZoomEffMM);
    }

    makeForContainShape(): ScaleRawExtentResultForContainShape {
        const internal = this._i;
        return {
            noZoomEffMM: internal.noZoomEffMM.slice(),
            containShape: internal.containShape
        };
    }

    makeNoZoom(): ScaleRawExtentResultForZoom {
        const internal = this._i;
        return {
            noZoomEffMM: internal.noZoomEffMM.slice(),
            noZoomMapMM: makeNoZoomMappingMM(internal),
        };
    }

    makeFinal(): ScaleRawExtentResultFinal {
        const internal = this._i;
        const zoomMM = internal.zoomMM;
        const noZoomEffMM = internal.noZoomEffMM;
        const zoomFixMM = internal.zoomFixMM;
        const fixMM = internal.fixMM;
        const result = {
            fixMM,
            zoomFixMM,
            isBlank: internal.isBlank,
            needCrossZero: internal.needCrossZero,
            needToggleAxisInverse: internal.needToggleAxisInverse,
            effMM: noZoomEffMM.slice(),
            mapMM: makeNoZoomMappingMM(internal),
        };
        const effMM = result.effMM;
        const mapMM = result.mapMM;

        // NOTE: Switching `fixMM` probably leads to abrupt extent changes when draging a `dataZoom`
        // handle, since `fixMM` impact the "nice extent" and "nice ticks" calculation.
        // Consider a case:
        //  dataZoom `start` is 2% but its `end` is 100%, (or vice versa), we currently only set `fixMM[0]`
        //  as `true` but remain `fixMM[1]` as `false` for this case to avoid unnecessary abrupt change.
        //  Incidentally, the effect is not unacceptable if we set both `fixMM[0]/[1]` as `true`.
        if (zoomMM[0] != null) {
            // `zoomMM` may overflow `noZoomEffMM` due to `noZoomEffMMExp`.
            effMM[0] = mathMax(noZoomEffMM[0], zoomMM[0]);
            mapMM[0] = zoomMM[0];
            fixMM[0] = zoomFixMM[0] = true;
        }
        if (zoomMM[1] != null) {
            // `zoomMM` may overflow `noZoomEffMM` due to `noZoomEffectiveMinMaxExpanded`.
            effMM[1] = mathMin(noZoomEffMM[1], zoomMM[1]);
            mapMM[1] = zoomMM[1];
            fixMM[1] = zoomFixMM[1] = true;
        }

        sanitizeExtent(internal, effMM);
        sanitizeExtent(internal, mapMM);

        return result;
    }

    makeOthers(): ScaleRawExtentResultOthers {
        const internal = this._i;
        return {
            dataMM: internal.dataMM.slice(),
            startValue: internal.startValue,
        };
    }

    /**
     * NOTICE:
     *  The caller must ensure `start <= end` and the range is equal or less then `noZoomMappingMinMax`.
     *  The outcome `_zoomMM` may have both `NullUndefined` and a finite value, like `[undefined, 123]`.
     */
    setZoomMinMax(idxMinMax: 0 | 1, val: number | NullUndefined): void {
        this._i.zoomMM[idxMinMax] = val;
    }

    /**
     * NOTICE: The caller MUST ensure `start <= end` and the range is equal or larger than `noZoomEffMM`.
     */
    setNoZoomExpanded(start: number, end: number) {
        const internal = this._i;
        if (__DEV__) {
            assert(internal.noZoomEffMMExp == null);
        }
        sanitizeExtent(internal, internal.noZoomEffMMExp = [start, end]);
    }

}

function makeNoZoomMappingMM(internal: ScaleRawExtentInternal): number[] {
    return (internal.noZoomEffMMExp || internal.noZoomEffMM).slice();
}

/**
 * Should be called when a new extent is created or modified.
 */
function sanitizeExtent(
    internal: ScaleRawExtentInternal,
    mm: (number | NullUndefined)[]
): void {
    const scale = internal.scale;
    if (scale.sanitize) {
        const dataMM = internal.dataMM;
        mm[0] = scale.sanitize(mm[0], dataMM);
        mm[1] = scale.sanitize(mm[1], dataMM);
        if (mm[1] < mm[0]) {
            mm[1] = mm[0];
        }
    }
}

function parseAxisModelMinMax(scale: Scale, minMax: ScaleDataValue): number {
    return minMax == null ? null // null/undefined means not specified and other default values can be applied.
        : eqNaN(minMax) ? NaN // NaN means a deliberate invalid number.
        : scale.parse(minMax);
}

function parseBoundaryGapOption(
    scale: Scale,
    model: AxisBaseModel
): number[] {
    let boundaryGapOptionArr;
    if (isOrdinalScale(scale)) {
        boundaryGapOptionArr = [0, 0];
    }
    else {
        let boundaryGap = (model as AxisBaseModel<NumericAxisBaseOptionCommon>).get('boundaryGap');
        if (typeof boundaryGap === 'boolean') {
            if (__DEV__) {
                console.warn('Boolean type for boundaryGap is only '
                    + 'allowed for ordinal axis. Please use string in '
                    + 'percentage instead, e.g., "20%". Currently, '
                    + 'boundaryGap is set to be 0.');
            }
            boundaryGap = null;
        }
        boundaryGapOptionArr = isArray(boundaryGap) ? boundaryGap : [boundaryGap, boundaryGap];
    }
    return [
        parseBoundaryGapOptionItem(boundaryGapOptionArr[0]),
        parseBoundaryGapOptionItem(boundaryGapOptionArr[1]),
    ];
}

function parseBoundaryGapOptionItem(
    opt: NumericAxisBoundaryGapOptionItemValue | boolean
): number {
    return parsePercent(
        typeof opt === 'boolean' ? 0 : opt,
        1
    ) || 0;
}

/**
 * NOTE: `associateSeriesWithAxis` is not necessarily called, e.g., when
 * an axis is not used by any series.
 */
function ensureScaleStore(axisLike: {scale: Scale}) {
    const store = scaleInner(axisLike.scale);
    if (!store.extent) {
        store.extent = initExtentForUnion();
    }
    return store;
}

/**
 * This supports union extent on case like: pie (or other similar series)
 * lays out on cartesian2d.
 * @see scaleRawExtentInfoCreate
 */
export function scaleRawExtentInfoEnableBoxCoordSysUsage(
    axisLike: {
        scale: Scale;
        dim: DimensionName;
    },
    coordSysDimIdxMap: HashMap<DimensionIndex, DimensionName> | NullUndefined
): void {
    ensureScaleStore(axisLike).dimIdxInCoord = coordSysDimIdxMap.get(axisLike.dim);
}

/**
 * @usage
 *  class SomeCoordSys {
 *      static create() {
 *          ecModel.eachSeries(function (seriesModel) {
 *              associateSeriesWithAxis(axis1, seriesModel, ...);
 *              associateSeriesWithAxis(axis2, seriesModel, ...);
 *              // ...
 *          });
 *      }
 *      update() {
 *          scaleRawExtentInfoCreate(axis1);
 *          scaleRawExtentInfoCreate(axis2);
 *      }
 *  }
 *  class AxisProxy {
 *      reset() {
 *          scaleRawExtentInfoCreate(axis1);
 *      }
 *  }
 *
 * NOTICE:
 *  - `associateSeriesWithAxis`(in `axisStatistics.ts`) should be called in:
 *      - Coord sys create method.
 *  - `scaleRawExtentInfoCreate` should be typically called in:
 *      - `dataZoom` processor. It require processing like:
 *          1. Filter series data by dataZoom1;
 *          2. Union the filtered data and init the extent of the orthogonal axes, which is the 100% of dataZoom2;
 *          3. Filter series data by dataZoom2;
 *          4. ...
 *      - Coord sys update method, for other axes that not covered by `dataZoom`.
 *          NOTE: If `dataZoom` exists can cover this series, this data and its extent
 *          has been dataZoom-filtered. Therefore this handling should not before dataZoom.
 *  - The callback of `min`/`max` in ec option should NOT be called multiple times,
 *      therefore, we initialize `ScaleRawExtentInfo` uniformly in `scaleRawExtentInfoCreate`.
 */
export function scaleRawExtentInfoCreate(
    ecModel: GlobalModel,
    axis: Axis,
    from: AxisExtentInfoBuildFrom
): void {
    const scale = axis.scale;
    const model = axis.model;
    const axisDim = axis.dim;
    if (__DEV__) {
        assert(scale && model && axisDim);
    }

    if (scale.rawExtentInfo) {
        if (__DEV__) {
            // Check for incorrect impl - the duplicated calling of this method is only allowed in
            // these cases:
            //  - First in `AxisProxy['reset']` (for dataZoom)
            //  - Then in `CoordinateSystem['update']`.
            //  - Then after `chart.appendData()` due to `dirtyOnOverallProgress: true`
            assert(scale.rawExtentInfo.from !== from || from === AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM);
        }
        return;
    }

    scaleRawExtentInfoCreateDeal(scale, axis, axisDim, model, ecModel, from);

    calcContainShape(scale, axis, ecModel, scale.rawExtentInfo);
}

function scaleRawExtentInfoCreateDeal(
    scale: Scale,
    axis: Axis,
    axisDim: DimensionName,
    model: AxisBaseModel,
    ecModel: GlobalModel,
    from: AxisExtentInfoBuildFrom
): void {
    const scaleStore = ensureScaleStore(axis);
    const extent = scaleStore.extent;

    eachSeriesOnAxis(axis, function (seriesModel) {
        if (seriesModel.boxCoordinateSystem) {
            // This supports union extent on case like: pie (or other similar series)
            // lays out on cartesian2d.
            const {coord} = getCoordForCoordSysUsageKindBox(seriesModel);
            const dimIdx = scaleStore.dimIdxInCoord;
            if (!(dimIdx >= 0)) {
                if (__DEV__) {
                    // Require `scaleRawExtentInfoEnableBoxCoordSysUsage` have been called to support it.
                    // But if users set it, give a error log but no exceptions.
                    error(`Property "series.coord" is not supported on axis ${seriesModel.boxCoordinateSystem.type}.`);
                }
            }
            // Only `[val1, val2]` case needs to be supported currently.
            else if (isArray(coord)) {
                const coordItem = coord[dimIdx];
                if (coordItem != null && !isArray(coordItem)) {
                    unionExtentFromNumber(extent, scale.parse(coordItem));
                }
            }
        }
        else if (seriesModel.coordinateSystem) {
            // NOTE: This data may have been filtered by dataZoom on orthogonal axes.
            const data = seriesModel.getData();
            if (data) {
                const filter = scale.getFilter ? scale.getFilter() : null;
                each(getDataDimensionsOnAxis(data, axisDim), function (dim) {
                    unionExtentFromExtent(extent, data.getApproximateExtent(dim, filter));
                });
            }
        }
    });

    const rawExtentInfo = new ScaleRawExtentInfo(scale, model, extent);
    injectScaleRawExtentInfo(scale, rawExtentInfo, from);

    scaleStore.extent = null; // Clean up
}

/**
 * `rawExtentInfo` may not be created in some cases, such as no series declared or extra useless
 * axes declared in ec option. In this case we still create a default one for that empty axis.
 */
function scaleRawExtentInfoBuildDefault(
    axisLike: {
        scale: Scale;
        model: AxisBaseModel;
    },
    dataExtent: number[]
): void {
    const scale = axisLike.scale;
    if (__DEV__) {
        assert(!scale.rawExtentInfo);
    }
    injectScaleRawExtentInfo(
        scale,
        new ScaleRawExtentInfo(scale, axisLike.model, dataExtent),
        AXIS_EXTENT_INFO_BUILD_FROM_EMPTY
    );
}

function injectScaleRawExtentInfo(
    scale: Scale,
    scaleRawExtentInfo: ScaleRawExtentInfo,
    from: AxisExtentInfoBuildFrom
): void {
    // @ts-ignore
    scale.rawExtentInfo = scaleRawExtentInfo;
    // @ts-ignore
    scaleRawExtentInfo.from = from;
}

/**
 * See `axisSnippets.ts` for some commonly used handlers.
 */
export function registerAxisContainShapeHandler(
    // `axisStatKey` is used to quickly omit irrelevant handlers,
    // since handlers need to be iterated per axis.
    axisStatKey: AxisStatKey,
    handler: AxisContainShapeHandler,
) {
    if (__DEV__) {
        assert(!axisContainShapeHandlerMap.get(axisStatKey));
    }
    axisContainShapeHandlerMap.set(axisStatKey, handler);
}

const axisContainShapeHandlerMap: HashMap<AxisContainShapeHandler, AxisStatKey> = createHashMap();


/**
 * Prepare axis scale extent before "nice".
 * Item of returned array can only be number (including Infinity and NaN).
 */
export function adoptScaleRawExtentInfoAndPrepare(
    scale: Scale,
    model: AxisBaseModel,
    ecModel: GlobalModel | NullUndefined,
    axis: Axis | NullUndefined,
    externalDataExtent: number[] | NullUndefined
): ScaleRawExtentResultFinal {

    if (__DEV__) {
        assert(!externalDataExtent || !scale.rawExtentInfo);
    }

    if (!scale.rawExtentInfo) {
        scaleRawExtentInfoBuildDefault(
            {scale, model},
            externalDataExtent || initExtentForUnion()
        );
    }
    const rawExtentResult = scale.rawExtentInfo.makeFinal();

    // NOTE: The scale extent is at least required in:
    //  - `AxisContainShapeHandler`, such as `makeColumnLayout` in `barGrid.ts`. And this should be the raw
    //    extent instead of the "nice" extent for better preciseness.
    //  - Nice extent calculation and axis align calculation, where the transformed intermediate extent may
    //    be required.
    const effectiveMinMax = rawExtentResult.effMM;
    scale.setExtent(effectiveMinMax[0], effectiveMinMax[1]);

    scale.setBlank(rawExtentResult.isBlank);

    if (axis
        && rawExtentResult.needToggleAxisInverse
        && ecModel && !ecModel.get('legacyMinMaxDontInverseAxis')
    ) {
        axis.inverse = !axis.inverse;
    }

    return rawExtentResult;
}

/**
 * These handlers implement ec option `someAxis.boundaryGap[i].containShape`. That is, expand scale
 * extent slightly to ensure shapes of specific series are fully contained in the axis extent without
 * overflow. See `barGridAxisContainShapeHandler` in `barGrid.ts` as a typical example.
 *
 * NOTICE:
 *  - Time-consuming. So avoid calling this frequently.
 *  - `axis.getExtent()` (pixel extent) is required.
 *  - This feature can be implemented by either expanding axis extent (pixel extent) or scale extent
 *    (data extent). The choice depends on whether series shape sizes are defined in pixels or data space.
 *    For example, scatter series glyph sizes is mainly defined in pixel, while bar series `bandWidth` is
 *    mainly determined by given percents of data scale. Since currently scatter does not require this
 *    feature, we implement it only on the data scale.
 *  - scale extent has been set in `adoptScaleRawExtentAndPrepare` as an input, though it may be modified later.
 *  - axis pixel extent has been set as an input, though it may be modified later (e.g., `outerBounds`).
 *  - (See the summary in the comment of `scaleMapper.setExtent`.)
 */
function calcContainShape(
    scale: Scale,
    axis: Axis,
    ecModel: GlobalModel,
    rawExtentInfo: ScaleRawExtentInfo,
): void {
    // `scale.getExtent` is required by AxisContainShapeHandler. See
    // `barGridCreateAxisContainShapeHandler` in `barGrid.ts` as an example.
    const {noZoomEffMM, containShape} = rawExtentInfo.makeForContainShape();
    axis.scale.setExtent(noZoomEffMM[0], noZoomEffMM[1]);

    if (!containShape) {
        return;
    }

    // `NullUndefined` indicates that `linearSupplement` is not introduced.
    let linearSupplement: number[] | NullUndefined;

    eachKeyOnAxis(axis, function (axisStatKey) {
        const handler = axisContainShapeHandlerMap.get(axisStatKey);
        if (handler) {
            const singleLinearSupplement = handler(axis, scale, ecModel);
            if (singleLinearSupplement) {
                linearSupplement = linearSupplement || [0, 0];
                unionExtentStartFromNumber(linearSupplement, singleLinearSupplement[0]);
                unionExtentEndFromNumber(linearSupplement, singleLinearSupplement[1]);
            }
        }
    });

    if (linearSupplement) {
        rawExtentInfo.setNoZoomExpanded(
            mathMin(
                noZoomEffMM[0],
                axis.scale.transformOut(
                    axis.scale.transformIn(noZoomEffMM[0], null) + linearSupplement[0], null
                )
            ),
            mathMax(
                noZoomEffMM[1],
                axis.scale.transformOut(
                    axis.scale.transformIn(noZoomEffMM[1], null) + linearSupplement[1], null
                )
            )
        );
    }
}

export function adoptScaleExtentKindMapping(
    scale: Scale,
    rawExtentResult: ScaleRawExtentResultFinal,
): void {
    // NOTE: `SCALE_EXTENT_KIND_MAPPING` is only used on the full extent before dataZoom applied,
    // which is the most intuitive. When dataZoom `start`/`end` is applied, the edge should be
    // exactly with respect to that `start`/`end`, and shapes are clipped if overflowing.
    //
    // NOTE: since currently `SCALE_EXTENT_KIND_MAPPING` is never required to be displayed, we
    // do not need to find a proper precision for that. But if it is required in the future, We
    // can use `getAcceptableTickPrecision` to find a proper precision.
    const scaleExtent = scale.getExtent();
    const scaleExtentExpanded = scaleExtent.slice();
    unionExtentFromExtent(scaleExtentExpanded, rawExtentResult.mapMM);
    if (scaleExtentExpanded[0] < scaleExtent[0] || scaleExtentExpanded[1] > scaleExtent[1]) {
        scale.setExtent2(
            SCALE_EXTENT_KIND_MAPPING,
            scaleExtentExpanded[0],
            scaleExtentExpanded[1]
        );
    }
}

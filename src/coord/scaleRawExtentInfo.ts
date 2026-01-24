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

import { assert, isArray, eqNaN, isFunction, each, HashMap } from 'zrender/src/core/util';
import Scale from '../scale/Scale';
import { AxisBaseModel } from './AxisBaseModel';
import { parsePercent } from 'zrender/src/contain/text';
import {
    AxisBaseOption, CategoryAxisBaseOption, NumericAxisBaseOptionCommon, ValueAxisBaseOption
} from './axisCommonTypes';
import { DimensionIndex, DimensionName, NullUndefined, ScaleDataValue } from '../util/types';
import { isIntervalScale, isLogScale, isOrdinalScale, isTimeScale } from '../scale/helper';
import type Axis from './Axis';
import type SeriesModel from '../model/Series';
import { makeInner, initExtentForUnion } from '../util/model';
import { getDataDimensionsOnAxis, unionExtent } from './axisHelper';
import {
    getCoordForCoordSysUsageKindBox
} from '../core/CoordinateSystem';
import GlobalModel from '../model/Global';


const axisSeriesInner = makeInner<{
    extent: number[];
    seriesList: SeriesModel[];
    dimIdxInCoord: number;
}, Axis>();

export const AXIS_EXTENT_INFO_BUILD_FROM_COORD_SYS_UPDATE = 1;
export const AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM = 2;
const AXIS_EXTENT_INFO_BUILD_FROM_EMPTY = 3;
export type AxisExtentInfoBuildFrom =
    typeof AXIS_EXTENT_INFO_BUILD_FROM_COORD_SYS_UPDATE
    | typeof AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM
    | typeof AXIS_EXTENT_INFO_BUILD_FROM_EMPTY;

export interface ScaleRawExtentResult {
    // `min`/`max` defines data available range, determined by
    // `dataMin`/`dataMax` and explicit specified min max related option.
    // The final extent will be based on the `min`/`max` and may be enlarge
    // a little (say, "nice strategy", e.g., niceScale, boundaryGap).
    // Ensure `min`/`max` be finite number or NaN here.
    // (not to be null/undefined) `NaN` means min/max axis is blank.
    min: number;
    max: number;

    dataMin: number;
    dataMax: number;

    // `minFixed`/`maxFixed` is `true` iff:
    //  - ec option `xxxAxis.min/max` are specified, or
    //  - `scaleRawExtentResult.minDetermined/maxDetermined` are `true`
    // They typically suggest axes to use `scaleRawExtentResult.min/max` directly
    // as their bounds, instead of expanding the extent by some "nice strategy".
    readonly minFixed: boolean;
    readonly maxFixed: boolean;

    // Typically set by `dataZoom` when its start/end is not 0%/100%.
    readonly minDetermined: boolean;
    readonly maxDetermined: boolean;

    // Mark that the axis should be blank.
    readonly isBlank: boolean;
    readonly needCrossZero: boolean;
}

export class ScaleRawExtentInfo {

    private _needCrossZero: ValueAxisBaseOption['scale'];
    private _isOrdinal: boolean;
    private _axisDataLen: number;
    private _boundaryGapInner: number[];

    // Accurate raw value get from model.
    private _modelMinRaw: AxisBaseOption['min'];
    private _modelMaxRaw: AxisBaseOption['max'];

    // Can be `finite number`/`null`/`undefined`/`NaN`
    private _modelMinNum: number;
    private _modelMaxNum: number;

    // Range union by series data on this axis.
    // May be modified if data is filtered.
    private _dataMin: number;
    private _dataMax: number;

    // Typically specified by `dataZoom` when its start/end is not 0%/100%.
    // Highest priority if specified.
    private _determinedMin: number;
    private _determinedMax: number;

    // custom dataMin/dataMax
    private _dataMinNum: number;
    private _dataMaxNum: number;

    // Injected outside
    readonly from: AxisExtentInfoBuildFrom;

    constructor(
        scale: Scale,
        model: AxisBaseModel,
        // Typically: data extent from all series on this axis.
        dataExtent: number[]
    ) {
        this._prepareParams(scale, model, dataExtent);
    }

    /**
     * Parameters depending on outside (like model, user callback)
     * are prepared and fixed here.
     */
    private _prepareParams(
        scale: Scale,
        model: AxisBaseModel,
        // Usually: data extent from all series on this axis.
        dataExtent: number[]
    ) {
        if (dataExtent[1] < dataExtent[0]) {
            dataExtent = [NaN, NaN];
        }
        this._dataMin = dataExtent[0];
        this._dataMax = dataExtent[1];

        const isOrdinal = this._isOrdinal = isOrdinalScale(scale);
        this._needCrossZero = isIntervalScale(scale) && model.getNeedCrossZero && model.getNeedCrossZero();

        if (isIntervalScale(scale) || isLogScale(scale) || isTimeScale(scale)) {
            // Process custom dataMin/dataMax
            const dataMinRaw = (model as AxisBaseModel<NumericAxisBaseOptionCommon>).get('dataMin', true);
            if (dataMinRaw != null) {
                this._dataMinNum = parseAxisModelMinMax(scale, dataMinRaw);
            }

            const dataMaxRaw = (model as AxisBaseModel<NumericAxisBaseOptionCommon>).get('dataMax', true);
            if (dataMaxRaw != null) {
                this._dataMaxNum = parseAxisModelMinMax(scale, dataMaxRaw);
            }
        }

        let axisMinValue = model.get('min', true);
        if (axisMinValue == null) {
            axisMinValue = model.get('startValue', true);
        }
        const modelMinRaw = this._modelMinRaw = axisMinValue;
        if (isFunction(modelMinRaw)) {
            // This callback always provides users the full data extent (before data is filtered).
            this._modelMinNum = parseAxisModelMinMax(scale, modelMinRaw({
                min: dataExtent[0],
                max: dataExtent[1]
            }));
        }
        else if (modelMinRaw !== 'dataMin') {
            this._modelMinNum = parseAxisModelMinMax(scale, modelMinRaw);
        }

        const modelMaxRaw = this._modelMaxRaw = model.get('max', true);
        if (isFunction(modelMaxRaw)) {
            // This callback always provides users the full data extent (before data is filtered).
            this._modelMaxNum = parseAxisModelMinMax(scale, modelMaxRaw({
                min: dataExtent[0],
                max: dataExtent[1]
            }));
        }
        else if (modelMaxRaw !== 'dataMax') {
            this._modelMaxNum = parseAxisModelMinMax(scale, modelMaxRaw);
        }

        if (isOrdinal) {
            // FIXME: there is a flaw here: if there is no "block" data processor like `dataZoom`,
            // and progressive rendering is using, here the category result might just only contain
            // the processed chunk rather than the entire result.
            this._axisDataLen = model.getCategories().length;
        }
        else {
            const boundaryGap = (model as AxisBaseModel<CategoryAxisBaseOption>).get('boundaryGap');
            const boundaryGapArr = isArray(boundaryGap)
                ? boundaryGap : [boundaryGap || 0, boundaryGap || 0];

            if (typeof boundaryGapArr[0] === 'boolean' || typeof boundaryGapArr[1] === 'boolean') {
                if (__DEV__) {
                    console.warn('Boolean type for boundaryGap is only '
                        + 'allowed for ordinal axis. Please use string in '
                        + 'percentage instead, e.g., "20%". Currently, '
                        + 'boundaryGap is set to be 0.');
                }
                this._boundaryGapInner = [0, 0];
            }
            else {
                this._boundaryGapInner = [
                    parsePercent(boundaryGapArr[0], 1),
                    parsePercent(boundaryGapArr[1], 1)
                ];
            }
        }
    }

    /**
     * Calculate extent by prepared parameters.
     * This method has no external dependency and can be called repeatedly,
     * getting the same result.
     * If parameters changed, should call this method to recalculate.
     */
    calculate(): ScaleRawExtentResult {
        // Notice: When min/max is not set (that is, when there are null/undefined,
        // which is the most common case), these cases should be ensured:
        // (1) For 'ordinal', show all axis.data.
        // (2) For others:
        //      + `boundaryGap` is applied (if min/max set, boundaryGap is
        //      disabled).
        //      + If `needCrossZero`, min/max should be zero, otherwise, min/max should
        //      be the result that originalExtent enlarged by boundaryGap.
        // (3) If no data, it should be ensured that `scale.setBlank` is set.

        const isOrdinal = this._isOrdinal;
        let dataMin = this._dataMin;
        let dataMax = this._dataMax;

        // Include custom dataMin/dataMax in calculation
        // If dataMin is set and less than current data minimum, update the minimum value
        if (this._dataMinNum != null && isFinite(dataMin) && this._dataMinNum < dataMin) {
            dataMin = this._dataMinNum;
        }

        // If dataMax is set and greater than current data maximum, update the maximum value
        if (this._dataMaxNum != null && isFinite(dataMax) && this._dataMaxNum > dataMax) {
            dataMax = this._dataMaxNum;
        }

        const axisDataLen = this._axisDataLen;
        const boundaryGapInner = this._boundaryGapInner;

        const span = !isOrdinal
            ? ((dataMax - dataMin) || Math.abs(dataMin))
            : null;

        // Currently if a `'value'` axis model min is specified as 'dataMin'/'dataMax',
        // `boundaryGap` will not be used. It's the different from specifying as `null`/`undefined`.
        let min = this._modelMinRaw === 'dataMin' ? dataMin : this._modelMinNum;
        let max = this._modelMaxRaw === 'dataMax' ? dataMax : this._modelMaxNum;

        // If `_modelMinNum`/`_modelMaxNum` is `null`/`undefined`, should not be fixed.
        let minFixed = min != null;
        let maxFixed = max != null;

        if (min == null) {
            min = isOrdinal
                ? (axisDataLen ? 0 : NaN)
                : dataMin - boundaryGapInner[0] * span;
        }
        if (max == null) {
            max = isOrdinal
                ? (axisDataLen ? axisDataLen - 1 : NaN)
                : dataMax + boundaryGapInner[1] * span;
        }

        (min == null || !isFinite(min)) && (min = NaN);
        (max == null || !isFinite(max)) && (max = NaN);

        const isBlank = eqNaN(min)
            || eqNaN(max)
            || (isOrdinal && !axisDataLen);

        // If data extent modified, need to recalculated to ensure cross zero.
        const needCrossZero = this._needCrossZero;
        if (needCrossZero) {
            // Axis is over zero and min is not set
            if (min > 0 && max > 0 && !minFixed) {
                min = 0;
                // minFixed = true;
            }
            // Axis is under zero and max is not set
            if (min < 0 && max < 0 && !maxFixed) {
                max = 0;
                // maxFixed = true;
            }
            // PENDING:
            // When `needCrossZero` and all data is positive/negative, should it be ensured
            // that the results processed by boundaryGap are positive/negative?
            // If so, here `minFixed`/`maxFixed` need to be set.
        }

        // NOTE: Switching `min/maxFixed` probably leads to abrupt extent changes when draging a `dataZoom`
        // handle, since minFixed/maxFixed impact the "nice extent" and "nice ticks" calculation. Consider
        // the case that dataZoom `start` is greater than 0% but its `end` is 100%, (or vice versa), we
        // currently only set `minFixed` as `true` but remain `maxFixed` as `false` to avoid unnecessary
        // abrupt change. Incidentally, the effect is not unacceptable if we set both `min/maxFixed` as `true`.
        const determinedMin = this._determinedMin;
        const determinedMax = this._determinedMax;
        let minDetermined = false;
        let maxDetermined = false;
        if (determinedMin != null) {
            min = determinedMin;
            minFixed = minDetermined = true;
        }
        if (determinedMax != null) {
            max = determinedMax;
            maxFixed = maxDetermined = true;
        }

        // Ensure min/max be finite number or NaN here. (not to be null/undefined)
        // `NaN` means min/max axis is blank.
        return {
            min: min,
            max: max,
            dataMin: dataMin,
            dataMax: dataMax,
            minFixed: minFixed,
            maxFixed: maxFixed,
            minDetermined: minDetermined,
            maxDetermined: maxDetermined,
            isBlank: isBlank,
            needCrossZero: needCrossZero,
        };
    }

    // modifyDataMinMax(minMaxName: 'min' | 'max', val: number): void {
    //     this[DATA_MIN_MAX_ATTR[minMaxName]] = val;
    // }

    setDeterminedMinMax(minMaxName: 'min' | 'max', val: number): void {
        const attr = DETERMINED_MIN_MAX_ATTR[minMaxName];
        if (__DEV__) {
            assert(this[attr] == null);
        }
        this[attr] = val;
    }
}

const DETERMINED_MIN_MAX_ATTR = { min: '_determinedMin', max: '_determinedMax' } as const;
// const DATA_MIN_MAX_ATTR = { min: '_dataMin', max: '_dataMax' } as const;

function parseAxisModelMinMax(scale: Scale, minMax: ScaleDataValue): number {
    return minMax == null ? null
        : eqNaN(minMax) ? NaN
        : scale.parse(minMax);
}

/**
 * @usage
 *  class SomeCoordSys {
 *      static create() {
 *          ecModel.eachSeries(function (seriesModel) {
 *              axisExtentInfoRequireBuild(axis1, seriesModel, ...);
 *              axisExtentInfoRequireBuild(axis2, seriesModel, ...);
 *              // ...
 *          });
 *      }
 *      update() {
 *          axisExtentInfoFinalBuild(axis1);
 *          axisExtentInfoFinalBuild(axis2);
 *      }
 *  }
 *  class AxisProxy {
 *      reset() {
 *          axisExtentInfoFinalBuild(axis1);
 *      }
 *  }
 *
 * NOTICE:
 *  - `axisExtentInfoRequireBuild` should be typically called in:
 *      - Coord sys create method.
 *  - `axisExtentInfoFinalBuild` should be typically called in:
 *      - `dataZoom` processor. It require processing like:
 *          1. Filter series data by dataZoom1;
 *          2. Union the filtered data and init the extent of the orthogonal axes, which is the 100% of dataZoom2;
 *          3. Filter series data by dataZoom2;
 *          4. ...
 *      - Coord sys update method, for other axes that not covered by `dataZoom`.
 *          NOTE: If `dataZoom` exists can covers this series, this data and its extent
 *          has been dataZoom-filtered. Therefore this handling should not before dataZoom.
 *  - The callback of `min`/`max` in ec option should NOT be called multiple times,
 *      therefore, we initialize `ScaleRawExtentInfo` uniformly in `axisExtentInfoFinalBuild`.
 */
export function axisExtentInfoRequireBuild(
    axis: Axis,
    seriesModel: SeriesModel,
    // coordSysDimIdxMap is required only for `boxCoordinateSystem`.
    coordSysDimIdxMap: HashMap<DimensionIndex, DimensionName> | NullUndefined
): void {
    const axisStore = axisSeriesInner(axis);
    if (!axisStore.extent) {
        axisStore.extent = initExtentForUnion();
        axisStore.seriesList = [];
    }
    axisStore.seriesList.push(seriesModel);
    if (seriesModel.boxCoordinateSystem) {
        // This supports union extent on case like: pie (or other similar series)
        // lays out on cartesian2d.
        if (__DEV__) {
            assert(coordSysDimIdxMap);
        }
        axisStore.dimIdxInCoord = coordSysDimIdxMap.get(axis.dim);
        if (__DEV__) {
            assert(axisStore.dimIdxInCoord >= 0);
        }
    }
}

/**
 * @see {axisExtentInfoRequireBuild}
 */
export function axisExtentInfoFinalBuild(
    ecModel: GlobalModel,
    axis: Axis,
    from: AxisExtentInfoBuildFrom
): void {
    const scale = axis.scale;
    const axisStore = axisSeriesInner(axis);
    const extent = axisStore.extent;

    if (scale.rawExtentInfo) {
        if (__DEV__) {
            // Check for incorrect impl - the duplicated calling of this method is only allowed in
            // one case that first dataZoom than coord sys update.
            assert(scale.rawExtentInfo.from !== from);
        }
        return;
    }

    each(axisStore.seriesList, function (seriesModel) {
        // Legend-filtered series need to be ignored since series are registered before `legendFilter`.
        if (ecModel.isSeriesFiltered(seriesModel)) {
            return;
        }
        if (seriesModel.boxCoordinateSystem) {
            // This supports union extent on case like: pie (or other similar series)
            // lays out on cartesian2d.
            const {coord} = getCoordForCoordSysUsageKindBox(seriesModel);
            let val: number | NullUndefined;
            const dimIdx = axisStore.dimIdxInCoord;
            // Only `[val1, val2]` case needs to be supported currently.
            if (isArray(coord)) {
                const coordItem = coord[dimIdx];
                if (coordItem != null && !isArray(coordItem)) {
                    val = axis.scale.parse(coordItem);
                    unionExtent(extent, val);
                }
            }
        }
        else if (seriesModel.coordinateSystem) {
            // NOTE: This data may have been filtered by dataZoom on orthogonal axes.
            const data = seriesModel.getData();
            if (data) {
                each(getDataDimensionsOnAxis(data, axis.dim), function (dim) {
                    const seriesExtent = data.getApproximateExtent(dim);
                    unionExtent(extent, seriesExtent[0]);
                    unionExtent(extent, seriesExtent[1]);
                });
            }
        }

    });

    const rawExtentInfo = new ScaleRawExtentInfo(scale, axis.model, extent);
    injectScaleRawExtentInfo(scale, rawExtentInfo, from);

    // PENDING: Is it necessary? See `adoptScaleExtentOptionAndPrepare`,
    // need scale extent in `makeColumnLayout`.
    const result = rawExtentInfo.calculate();
    scale.setExtent(result.min, result.max);

    axisStore.seriesList = axisStore.extent = null; // Clean up
}

export function ensureScaleRawExtentInfo(
    {scale, model}: {scale: Scale; model: AxisBaseModel;}
): ScaleRawExtentInfo {
    if (!scale.rawExtentInfo) {
        // `rawExtentInfo` may not be created in cases such as no series declared or extra useless
        // axes declared in ec option. In this case we still create a default one for that empty axis.
        injectScaleRawExtentInfo(
            scale,
            new ScaleRawExtentInfo(scale, model, initExtentForUnion()),
            AXIS_EXTENT_INFO_BUILD_FROM_EMPTY
        );
    }
    return scale.rawExtentInfo;
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

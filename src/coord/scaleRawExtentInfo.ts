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

import { assert, isArray, eqNaN, isFunction } from 'zrender/src/core/util';
import Scale from '../scale/Scale';
import { AxisBaseModel } from './AxisBaseModel';
import { parsePercent } from 'zrender/src/contain/text';
import { AxisBaseOption, CategoryAxisBaseOption } from './axisCommonTypes';
import { ScaleDataValue } from '../util/types';


export interface ScaleRawExtentResult {
    // `min`/`max` defines data available range, determined by
    // `dataMin`/`dataMax` and explicit specified min max related option.
    // The final extent will be based on the `min`/`max` and may be enlarge
    // a little (say, "nice strategy", e.g., niceScale, boundaryGap).
    // Ensure `min`/`max` be finite number or NaN here.
    // (not to be null/undefined) `NaN` means min/max axis is blank.
    readonly min: number;
    readonly max: number;
    // `minFixed`/`maxFixed` marks that `min`/`max` should be used
    // in the final extent without other "nice strategy".
    readonly minFixed: boolean;
    readonly maxFixed: boolean;
    // Mark that the axis should be blank.
    readonly isBlank: boolean;
}

export class ScaleRawExtentInfo {

    private _needCrossZero: boolean;
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

    // Highest priority if specified.
    private _determinedMin: number;
    private _determinedMax: number;

    // Make that the `rawExtentInfo` can not be modified any more.
    readonly frozen: boolean;


    constructor(
        scale: Scale,
        model: AxisBaseModel,
        // Usually: data extent from all series on this axis.
        originalExtent: number[]
    ) {
        this._prepareParams(scale, model, originalExtent);
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

        const isOrdinal = this._isOrdinal = scale.type === 'ordinal';
        this._needCrossZero = scale.type === 'interval' && model.getNeedCrossZero && model.getNeedCrossZero();

        const modelMinRaw = this._modelMinRaw = model.get('min', true);
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
     * This method has no external dependency and can be called duplicatedly,
     * getting the same result.
     * If parameters changed, should call this method to recalcuate.
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
        const dataMin = this._dataMin;
        const dataMax = this._dataMax;
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
        if (this._needCrossZero) {
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

        const determinedMin = this._determinedMin;
        const determinedMax = this._determinedMax;
        if (determinedMin != null) {
            min = determinedMin;
            minFixed = true;
        }
        if (determinedMax != null) {
            max = determinedMax;
            maxFixed = true;
        }

        // Ensure min/max be finite number or NaN here. (not to be null/undefined)
        // `NaN` means min/max axis is blank.
        return {
            min: min,
            max: max,
            minFixed: minFixed,
            maxFixed: maxFixed,
            isBlank: isBlank
        };
    }

    modifyDataMinMax(minMaxName: 'min' | 'max', val: number): void {
        if (__DEV__) {
            assert(!this.frozen);
        }
        this[DATA_MIN_MAX_ATTR[minMaxName]] = val;
    }

    setDeterminedMinMax(minMaxName: 'min' | 'max', val: number): void {
        const attr = DETERMINED_MIN_MAX_ATTR[minMaxName];
        if (__DEV__) {
            assert(
                !this.frozen
                // Earse them usually means logic flaw.
                && (this[attr] == null)
            );
        }
        this[attr] = val;
    }

    freeze() {
        // @ts-ignore
        this.frozen = true;
    }
}

const DETERMINED_MIN_MAX_ATTR = { min: '_determinedMin', max: '_determinedMax' } as const;
const DATA_MIN_MAX_ATTR = { min: '_dataMin', max: '_dataMax' } as const;

/**
 * Get scale min max and related info only depends on model settings.
 * This method can be called after coordinate system created.
 * For example, in data processing stage.
 *
 * Scale extent info probably be required multiple times during a workflow.
 * For example:
 * (1) `dataZoom` depends it to get the axis extent in "100%" state.
 * (2) `processor/extentCalculator` depends it to make sure whether axis extent is specified.
 * (3) `coordSys.update` use it to finally decide the scale extent.
 * But the callback of `min`/`max` should not be called multiple times.
 * The code below should not be implemented repeatedly either.
 * So we cache the result in the scale instance, which will be recreated at the beginning
 * of the workflow (because `scale` instance will be recreated each round of the workflow).
 */
export function ensureScaleRawExtentInfo(
    scale: Scale,
    model: AxisBaseModel,
    // Usually: data extent from all series on this axis.
    originalExtent: number[]
): ScaleRawExtentInfo {

    // Do not permit to recreate.
    let rawExtentInfo = scale.rawExtentInfo;
    if (rawExtentInfo) {
        return rawExtentInfo;
    }

    rawExtentInfo = new ScaleRawExtentInfo(scale, model, originalExtent);
    // @ts-ignore
    scale.rawExtentInfo = rawExtentInfo;

    return rawExtentInfo;
}

export function parseAxisModelMinMax(scale: Scale, minMax: ScaleDataValue): number {
    return minMax == null ? null
        : eqNaN(minMax) ? NaN
        : scale.parse(minMax);
}

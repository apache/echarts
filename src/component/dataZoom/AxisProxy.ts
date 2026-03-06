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

import {clone, defaults, each, map} from 'zrender/src/core/util';
import {
    asc, getAcceptableTickPrecision, linearMap, mathAbs, mathCeil, mathFloor, mathMax, mathMin, round
} from '../../util/number';
import sliderMove from '../helper/sliderMove';
import GlobalModel from '../../model/Global';
import SeriesModel from '../../model/Series';
import ExtensionAPI from '../../core/ExtensionAPI';
import { Dictionary, NullUndefined } from '../../util/types';
// TODO Polar?
import DataZoomModel from './DataZoomModel';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import { getAxisMainType, isCoordSupported, DataZoomAxisDimension } from './helper';
import { SINGLE_REFERRING } from '../../util/model';
import { isOrdinalScale, isTimeScale } from '../../scale/helper';
import {
    AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM, scaleRawExtentInfoReallyCreate,
    ScaleRawExtentResultForZoom,
} from '../../coord/scaleRawExtentInfo';
import { discourageOnAxisZero } from '../../coord/axisHelper';


interface MinMaxSpan {
    minSpan: number
    maxSpan: number
    minValueSpan: number
    maxValueSpan: number
}

export interface AxisProxyWindow {
    // NOTE: May include non-effective portion.
    value: number[];
    noZoomEffMM: ScaleRawExtentResultForZoom['noZoomEffMM'];
    percent: number[];
    // Percent invert from "value window", which may be slightly different from "percent window" due to some
    // handling such as rounding. The difference may be magnified in cases like "alignTicks", so we use
    // `percentInverted` in these cases.
    // But we retain the original input percent in `percent` whenever possible, since they have been used in views.
    percentInverted: number[];
    valuePrecision: number;
}

/**
 * Operate single axis.
 * One axis can only operated by one axis operator.
 * Different dataZoomModels may be defined to operate the same axis.
 * (i.e. 'inside' data zoom and 'slider' data zoom components)
 * So dataZoomModels share one axisProxy in that case.
 */
class AxisProxy {

    ecModel: GlobalModel;

    // NOTICE: The lifetime of `AxisProxy` instance is different from `Axis` instance.
    // It is recreated in each run of "ec prepare".

    private _dimName: DataZoomAxisDimension;
    private _axisIndex: number;

    private _window: AxisProxyWindow;

    private _extent: ScaleRawExtentResultForZoom;

    private _minMaxSpan: MinMaxSpan;

    /**
     * The host `dataZoom` model. An axis may be controlled by multiple `dataZoom`s,
     * but only the first declared `dataZoom` is the host.
     */
    private _dataZoomModel: DataZoomModel;

    constructor(
        dimName: DataZoomAxisDimension,
        axisIndex: number,
        dataZoomModel: DataZoomModel,
        ecModel: GlobalModel
    ) {
        this._dimName = dimName;

        this._axisIndex = axisIndex;

        this.ecModel = ecModel;

        this._dataZoomModel = dataZoomModel;

        // /**
        //  * @readOnly
        //  * @private
        //  */
        // this.hasSeriesStacked;
    }

    /**
     * Whether the axisProxy is hosted by dataZoomModel.
     */
    hostedBy(dataZoomModel: DataZoomModel): boolean {
        return this._dataZoomModel === dataZoomModel;
    }

    /**
     * @return `getWindow().value` can only have NaN or finite value.
     */
    getWindow(): AxisProxyWindow {
        return clone(this._window);
    }

    getTargetSeriesModels() {
        const seriesModels: SeriesModel[] = [];

        this.ecModel.eachSeries(function (seriesModel) {
            if (isCoordSupported(seriesModel)) {
                const axisMainType = getAxisMainType(this._dimName);
                const axisModel = seriesModel.getReferringComponents(axisMainType, SINGLE_REFERRING).models[0];
                if (axisModel && this._axisIndex === axisModel.componentIndex) {
                    seriesModels.push(seriesModel);
                }
            }
        }, this);

        return seriesModels;
    }

    getAxisModel(): AxisBaseModel {
        return this.ecModel.getComponent(this._dimName + 'Axis', this._axisIndex) as AxisBaseModel;
    }

    getMinMaxSpan() {
        return clone(this._minMaxSpan);
    }

    /**
     * [CAVEAT] Keep this method pure, so that it can be called multiple times.
     *
     * Only calculate by given range and cumulative series data extent, do not change anything.
     */
    calculateDataWindow(
        opt: {
            start?: number // percent, 0 ~ 100
            end?: number // percent, 0 ~ 100
            startValue?: number | string | Date
            endValue?: number | string | Date
        }
    ): AxisProxyWindow {
        const {noZoomMapMM: dataExtent, noZoomEffMM} = this._extent;
        const axis = this.getAxisModel().axis;
        const scale = axis.scale;
        const dataZoomModel = this._dataZoomModel;
        const rangePropMode = dataZoomModel.getRangePropMode();
        const percentExtent = [0, 100];
        const percentWindow = [] as unknown as [number, number];
        const valueWindow = [] as unknown as [number, number];
        let hasPropModeValue;
        const needRound = [false, false];

        // NOTE:
        //  The current percentage base calculation strategy:
        //    - If the window boundary is NOT at 0% or 100%, boundary values are derived from the raw extent
        //      (series data + axis.min/max; see `ScaleRawExtentInfo['makeForZoom']`). Any subsequent "nice"
        //      expansion are excluded.
        //    - If the window boundary is at 0% or 100%, the "nice"-expanded portion is included.
        //  Pros:
        //    - The effect may be preferable when users intend to quickly narrow down to data details,
        //      especially when "nice strategy" excessively expands the extent.
        //    - It simplifies the logic, otherwise, "nice strategy" would need to be applied twice (full window
        //      + current window).
        //  Cons:
        //    - This strategy causes jitter when switching dataZoom to/from 0%/100% (though generally acceptable).

        each(['start', 'end'] as const, function (prop, idx) {
            let boundPercent = opt[prop];
            let boundValue = opt[prop + 'Value' as 'startValue' | 'endValue'];

            // NOTE: dataZoom is based either on `percentProp` ('start', 'end') or
            // on `valueProp` ('startValue', 'endValue').
            // The former one is suitable for cases that a dataZoom component controls multiple
            // axes with different unit or extent, and the latter one is suitable for accurate
            // zoom by pixel (e.g., in dataZoomSelect).
            // we use `getRangePropMode()` to mark which prop is used. `rangePropMode` is updated
            // only when setOption or dispatchAction, otherwise it remains its original value.
            // (Why not only record `percentProp` and always map to `valueProp`? Because
            // the map `valueProp` -> `percentProp` -> `valueProp` probably not the original
            // `valueProp`. consider two axes constrolled by one dataZoom. They have different
            // data extent. All of values that are overflow the `dataExtent` will be calculated
            // to percent '100%').

            if (rangePropMode[idx] === 'percent') {
                boundPercent == null && (boundPercent = percentExtent[idx]);
                boundValue = linearMap(boundPercent, percentExtent, dataExtent);
                needRound[idx] = true;
            }
            else {
                hasPropModeValue = true;
                // NOTE: `scale.parse` can also round input for 'time' or 'ordinal' scale.
                boundValue = boundValue == null ? dataExtent[idx] : scale.parse(boundValue);
                // Calculating `percent` from `value` may be not accurate, because
                // This calculation can not be inverted, because all of values that
                // are overflow the `dataExtent` will be calculated to percent '100%'
                boundPercent = linearMap(boundValue, dataExtent, percentExtent);
            }

            // fallback to extent start/end when parsed value or percent is invalid
            valueWindow[idx] = boundValue == null || isNaN(boundValue)
                ? dataExtent[idx]
                : boundValue;
            percentWindow[idx] = boundPercent == null || isNaN(boundPercent)
                ? percentExtent[idx]
                : boundPercent;
        });

        asc(valueWindow);
        asc(percentWindow);

        // The windows specified from `dispatchAction` or `setOption` may:
        //  (1) be out of the extent, or
        //  (2) do not comply with `minSpan/maxSpan`, `minValueSpan/maxValueSpan`.
        // So we clamp them here.
        // But we don't restrict window by `zoomLock` here, because we see `zoomLock` just as a
        // interaction constraint, where API is able to initialize/modify the window size even
        // though `zoomLock` specified.
        // PENDING: For historical reason, the option design is partially incompatible:
        //  If `option.start` and `option.endValue` are specified, and when we choose whether
        //  `min/maxValueSpan` or `minSpan/maxSpan` is applied, neither one is intuitive.
        //  (Currently using `minValueSpan/maxValueSpan`.)
        const spans = this._minMaxSpan;
        hasPropModeValue
            ? restrictSet(valueWindow, percentWindow, dataExtent, percentExtent, false)
            : restrictSet(percentWindow, valueWindow, percentExtent, dataExtent, true);

        function restrictSet(
            fromWindow: number[],
            toWindow: number[],
            fromExtent: number[],
            toExtent: number[],
            toValue: boolean
        ) {
            const suffix = toValue ? 'Span' : 'ValueSpan';
            sliderMove(
                0, fromWindow, fromExtent, 'all',
                spans['min' + suffix as 'minSpan' | 'minValueSpan'],
                spans['max' + suffix as 'maxSpan' | 'maxValueSpan']
            );
            for (let i = 0; i < 2; i++) {
                toWindow[i] = linearMap(fromWindow[i], fromExtent, toExtent, true);
                if (toValue) {
                    toWindow[i] = toWindow[i];
                    needRound[i] = true;
                }
            }
            simplyEnsureAsc(toWindow);
        }

        // - In 'time' and 'ordinal' scale, rounding by 0 is required.
        // - In 'interval' and 'log' scale, we round values for acceptable display with acceptable accuracy loose.
        //  "Values" can be rounded only if they are generated from `percent`, since user-specified "value"
        //  should be respected, and `DataZoomSelect` already performs its own rounding.
        // - Currently we only round "value" but not "percent", since there is no need so far.
        // - MEMO: See also #3228 and commit a89fd0d7f1833ecf08a4a5b7ecf651b4a0d8da41
        // - PENDING: The rounding result may slightly overflow the restriction from `min/maxSpan`,
        //  but it is acceptable so far.
        const isScaleOrdinalOrTime = isOrdinalScale(scale) || isTimeScale(scale);
        // Typically pxExtent has been ready in coordSys create. (See `create` of `Grid.ts`)
        const pxExtent = axis.getExtent();
        // NOTICE: this pxSpan may be not accurate yet due to "outerBounds" logic, but acceptable.
        const pxSpan = mathAbs(pxExtent[1] - pxExtent[0]);
        const precision = isScaleOrdinalOrTime
            ? 0
            // NOTICE: We deliberately do not allow specifying this precision by users, until real requirements
            // occur. Otherwise, unnecessary complexity and bad case may be introduced. A small precision may
            // cause the rounded ends overflow the expected min/max significantly. And this precision effectively
            // determines the size of a roaming step, and a big step would likely constantly cut through series
            // shapes in an unexpected place and cause visual artifacts (e.g., for bar series). Although
            // theroetically that defect can be resolved by introducing extra spaces between axis min/max tick
            // and axis boundary (see `SCALE_EXTENT_KIND_MAPPING`), it's complicated and unnecessary.
            : getAcceptableTickPrecision(valueWindow, pxSpan, 0.5);
        each([[0, mathCeil], [1, mathFloor]] as const, function ([idx, ceilOrFloor]) {
            if (!needRound[idx] || !isFinite(precision)) {
                return;
            }
            valueWindow[idx] = round(valueWindow[idx], precision);
            valueWindow[idx] = mathMin(dataExtent[1], mathMax(dataExtent[0], valueWindow[idx])); // Clamp.
            if (percentWindow[idx] === percentExtent[idx]) {
                // When `percent` is 0 or 100, `value` must be `dataExtent[0]` or `dataExtent[1]`
                // regardless of the calculated precision.
                // NOTE: `percentWindow` is never over [0, 100] at this moment.
                valueWindow[idx] = dataExtent[idx];
                if (isScaleOrdinalOrTime) {
                    // In case that dataExtent[idx] is not an integer (may occur since it comes from user input)
                    valueWindow[idx] = ceilOrFloor(valueWindow[idx]);
                }
            }
        });
        simplyEnsureAsc(valueWindow);

        const percentInvertedWindow = [
            linearMap(valueWindow[0], dataExtent, percentExtent, true),
            linearMap(valueWindow[1], dataExtent, percentExtent, true),
        ] as [number, number];
        simplyEnsureAsc(percentInvertedWindow);

        function simplyEnsureAsc(window: number[]): void {
            if (window[0] > window[1]) {
                window[0] = window[1];
            }
        }

        return {
            value: valueWindow,
            noZoomEffMM: noZoomEffMM.slice(),
            percent: percentWindow,
            percentInverted: percentInvertedWindow,
            valuePrecision: precision,
        };
    }

    /**
     * Notice: reset should not be called before series.restoreData() is called,
     * so it is recommended to be called in "process stage" but not "model init
     * stage".
     */
    reset(dataZoomModel: DataZoomModel, alignToPercentInverted: number[] | NullUndefined) {
        if (!this.hostedBy(dataZoomModel)) {
            return;
        }

        // It is important to get "consistent" extent when more then one axes is
        // controlled by a `dataZoom`, otherwise those axes will not be synchronized
        // when zooming. But it is difficult to know what is "consistent", considering
        // axes have different type or even different meanings (For example, two
        // time axes are used to compare data of the same date in different years).
        // So basically dataZoom just obtains extent by series.data (in category axis
        // extent can be obtained from axis.data).
        // Nevertheless, user can set min/max/scale on axes to make extent of axes
        // consistent.
        const axis = this.getAxisModel().axis;
        scaleRawExtentInfoReallyCreate(this.ecModel, axis, AXIS_EXTENT_INFO_BUILD_FROM_DATA_ZOOM);

        discourageOnAxisZero(axis, {dz: true});

        const rawExtentInfo = axis.scale.rawExtentInfo;
        this._extent = rawExtentInfo.makeNoZoom();

        // `calculateDataWindow` uses min/maxSpan.
        this._updateMinMaxSpan();

        let opt = dataZoomModel.settledOption;
        if (alignToPercentInverted) {
            opt = defaults({
                start: alignToPercentInverted[0],
                end: alignToPercentInverted[1],
            }, opt);
        }
        const {percent, value} = this._window = this.calculateDataWindow(opt);

        // For value axis, if min/max/scale are not set, we just use the extent obtained
        // by series data, which may be a little different from the extent calculated by
        // `axisHelper.getScaleExtent`. But the different just affects the experience a
        // little when zooming. So it will not be fixed until some users require it strongly.
        if (percent[0] !== 0) {
            rawExtentInfo.setZoomMinMax(0, value[0]);
        }
        if (percent[1] !== 100) {
            rawExtentInfo.setZoomMinMax(1, value[1]);
        }
    }

    filterData(dataZoomModel: DataZoomModel, api: ExtensionAPI) {
        if (!this.hostedBy(dataZoomModel)) {
            return;
        }

        const axisDim = this._dimName;
        const seriesModels = this.getTargetSeriesModels();
        const filterMode = dataZoomModel.get('filterMode');
        const valueWindow = this._window.value;

        if (filterMode === 'none') {
            return;
        }

        // FIXME
        // Toolbox may has dataZoom injected. And if there are stacked bar chart
        // with NaN data, NaN will be filtered and stack will be wrong.
        // So we need to force the mode to be set empty.
        // In fact, it is not a big deal that do not support filterMode-'filter'
        // when using toolbox#dataZoom, util tooltip#dataZoom support "single axis
        // selection" some day, which might need "adapt to data extent on the
        // otherAxis", which is disabled by filterMode-'empty'.
        // But currently, stack has been fixed to based on value but not index,
        // so this is not an issue any more.
        // let otherAxisModel = this.getOtherAxisModel();
        // if (dataZoomModel.get('$fromToolbox')
        //     && otherAxisModel
        //     && otherAxisModel.hasSeriesStacked
        // ) {
        //     filterMode = 'empty';
        // }

        // TODO
        // filterMode 'weakFilter' and 'empty' is not optimized for huge data yet.

        each(seriesModels, function (seriesModel) {
            let seriesData = seriesModel.getData();
            const dataDims = seriesData.mapDimensionsAll(axisDim);

            if (!dataDims.length) {
                return;
            }

            if (filterMode === 'weakFilter') {
                const store = seriesData.getStore();
                const dataDimIndices = map(dataDims, dim => seriesData.getDimensionIndex(dim), seriesData);
                seriesData.filterSelf(function (dataIndex) {
                    let leftOut;
                    let rightOut;
                    let hasValue;
                    for (let i = 0; i < dataDims.length; i++) {
                        const value = store.get(dataDimIndices[i], dataIndex) as number;
                        const thisHasValue = !isNaN(value);
                        const thisLeftOut = value < valueWindow[0];
                        const thisRightOut = value > valueWindow[1];
                        if (thisHasValue && !thisLeftOut && !thisRightOut) {
                            return true;
                        }
                        thisHasValue && (hasValue = true);
                        thisLeftOut && (leftOut = true);
                        thisRightOut && (rightOut = true);
                    }
                    // If both left out and right out, do not filter.
                    return hasValue && leftOut && rightOut;
                });
            }
            else {
                each(dataDims, function (dim) {
                    if (filterMode === 'empty') {
                        seriesModel.setData(
                            seriesData = seriesData.map(dim, function (value: number) {
                                return !isInWindow(value) ? NaN : value;
                            })
                        );
                    }
                    else {
                        const range: Dictionary<[number, number]> = {};
                        range[dim] = valueWindow as [number, number];

                        // console.time('AxisProxy_selectRange');
                        seriesData.selectRange(range);
                        // console.timeEnd('AxisProxy_selectRange');
                    }
                });
            }

            each(dataDims, function (dim) {
                seriesData.setApproximateExtent(valueWindow as [number, number], dim);
            });
        });

        function isInWindow(value: number) {
            return value >= valueWindow[0] && value <= valueWindow[1];
        }
    }

    private _updateMinMaxSpan() {
        const minMaxSpan = this._minMaxSpan = {} as MinMaxSpan;
        const dataZoomModel = this._dataZoomModel;
        const dataExtent = this._extent.noZoomMapMM;

        each(['min', 'max'], function (minMax) {
            let percentSpan = dataZoomModel.get(minMax + 'Span' as 'minSpan' | 'maxSpan');
            let valueSpan = dataZoomModel.get(minMax + 'ValueSpan' as 'minValueSpan' | 'maxValueSpan');
            valueSpan != null && (valueSpan = this.getAxisModel().axis.scale.parse(valueSpan));

            // minValueSpan and maxValueSpan has higher priority than minSpan and maxSpan
            if (valueSpan != null) {
                percentSpan = linearMap(
                    dataExtent[0] + valueSpan, dataExtent, [0, 100], true
                );
            }
            else if (percentSpan != null) {
                valueSpan = linearMap(
                    percentSpan, [0, 100], dataExtent, true
                ) - dataExtent[0];
            }

            minMaxSpan[minMax + 'Span' as 'minSpan' | 'maxSpan'] = percentSpan;
            minMaxSpan[minMax + 'ValueSpan' as 'minValueSpan' | 'maxValueSpan'] = valueSpan;
        }, this);
    }
}

export default AxisProxy;

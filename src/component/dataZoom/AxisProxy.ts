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

import * as zrUtil from 'zrender/src/core/util';
import * as numberUtil from '../../util/number';
import sliderMove from '../helper/sliderMove';
import GlobalModel from '../../model/Global';
import SeriesModel from '../../model/Series';
import ExtensionAPI from '../../core/ExtensionAPI';
import { Dictionary } from '../../util/types';
// TODO Polar?
import DataZoomModel from './DataZoomModel';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import { unionAxisExtentFromData } from '../../coord/axisHelper';
import { ensureScaleRawExtentInfo } from '../../coord/scaleRawExtentInfo';
import { getAxisMainType, isCoordSupported, DataZoomAxisDimension } from './helper';
import { SINGLE_REFERRING } from '../../util/model';

const each = zrUtil.each;
const asc = numberUtil.asc;

interface MinMaxSpan {
    minSpan: number
    maxSpan: number
    minValueSpan: number
    maxValueSpan: number
}

type SupportedAxis = 'xAxis' | 'yAxis' | 'angleAxis' | 'radiusAxis' | 'singleAxis';

/**
 * Operate single axis.
 * One axis can only operated by one axis operator.
 * Different dataZoomModels may be defined to operate the same axis.
 * (i.e. 'inside' data zoom and 'slider' data zoom components)
 * So dataZoomModels share one axisProxy in that case.
 */
class AxisProxy {

    ecModel: GlobalModel;

    private _dimName: DataZoomAxisDimension;
    private _axisIndex: number;

    private _valueWindow: [number, number];
    private _percentWindow: [number, number];

    private _dataExtent: [number, number];

    private _minMaxSpan: MinMaxSpan;

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
     * @return Value can only be NaN or finite value.
     */
    getDataValueWindow() {
        return this._valueWindow.slice() as [number, number];
    }

    /**
     * @return {Array.<number>}
     */
    getDataPercentWindow() {
        return this._percentWindow.slice() as [number, number];
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
        return zrUtil.clone(this._minMaxSpan);
    }

    /**
     * Only calculate by given range and this._dataExtent, do not change anything.
     */
    calculateDataWindow(opt?: {
        start?: number
        end?: number
        startValue?: number | string | Date
        endValue?: number | string | Date
    }) {
        const dataExtent = this._dataExtent;
        const axisModel = this.getAxisModel();
        const scale = axisModel.axis.scale;
        const rangePropMode = this._dataZoomModel.getRangePropMode();
        const percentExtent = [0, 100];
        const percentWindow = [] as unknown as [number, number];
        const valueWindow = [] as unknown as [number, number];
        let hasPropModeValue;

        each(['start', 'end'] as const, function (prop, idx) {
            let boundPercent = opt[prop];
            let boundValue = opt[prop + 'Value' as 'startValue' | 'endValue'];

            // Notice: dataZoom is based either on `percentProp` ('start', 'end') or
            // on `valueProp` ('startValue', 'endValue'). (They are based on the data extent
            // but not min/max of axis, which will be calculated by data window then).
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
                // Use scale.parse to math round for category or time axis.
                boundValue = scale.parse(numberUtil.linearMap(
                    boundPercent, percentExtent, dataExtent
                ));
            }
            else {
                hasPropModeValue = true;
                boundValue = boundValue == null ? dataExtent[idx] : scale.parse(boundValue);
                // Calculating `percent` from `value` may be not accurate, because
                // This calculation can not be inversed, because all of values that
                // are overflow the `dataExtent` will be calculated to percent '100%'
                boundPercent = numberUtil.linearMap(
                    boundValue, dataExtent, percentExtent
                );
            }

            // valueWindow[idx] = round(boundValue);
            // percentWindow[idx] = round(boundPercent);
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

        // The windows from user calling of `dispatchAction` might be out of the extent,
        // or do not obey the `min/maxSpan`, `min/maxValueSpan`. But we don't restrict window
        // by `zoomLock` here, because we see `zoomLock` just as a interaction constraint,
        // where API is able to initialize/modify the window size even though `zoomLock`
        // specified.
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
                toWindow[i] = numberUtil.linearMap(fromWindow[i], fromExtent, toExtent, true);
                toValue && (toWindow[i] = scale.parse(toWindow[i]));
            }
        }

        return {
            valueWindow: valueWindow,
            percentWindow: percentWindow
        };
    }

    /**
     * Notice: reset should not be called before series.restoreData() is called,
     * so it is recommended to be called in "process stage" but not "model init
     * stage".
     */
    reset(dataZoomModel: DataZoomModel) {
        if (dataZoomModel !== this._dataZoomModel) {
            return;
        }

        const targetSeries = this.getTargetSeriesModels();
        // Culculate data window and data extent, and record them.
        this._dataExtent = calculateDataExtent(this, this._dimName, targetSeries);

        // `calculateDataWindow` uses min/maxSpan.
        this._updateMinMaxSpan();

        const dataWindow = this.calculateDataWindow(dataZoomModel.settledOption);

        this._valueWindow = dataWindow.valueWindow;
        this._percentWindow = dataWindow.percentWindow;

        // Update axis setting then.
        this._setAxisModel();
    }

    filterData(dataZoomModel: DataZoomModel, api: ExtensionAPI) {
        if (dataZoomModel !== this._dataZoomModel) {
            return;
        }

        const axisDim = this._dimName;
        const seriesModels = this.getTargetSeriesModels();
        const filterMode = dataZoomModel.get('filterMode');
        const valueWindow = this._valueWindow;

        if (filterMode === 'none') {
            return;
        }

        // FIXME
        // Toolbox may has dataZoom injected. And if there are stacked bar chart
        // with NaN data, NaN will be filtered and stack will be wrong.
        // So we need to force the mode to be set empty.
        // In fect, it is not a big deal that do not support filterMode-'filter'
        // when using toolbox#dataZoom, utill tooltip#dataZoom support "single axis
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
                const dataDimIndices = zrUtil.map(dataDims, dim => seriesData.getDimensionIndex(dim), seriesData);
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
                        range[dim] = valueWindow;

                        // console.time('select');
                        seriesData.selectRange(range);
                        // console.timeEnd('select');
                    }
                });
            }

            each(dataDims, function (dim) {
                seriesData.setApproximateExtent(valueWindow, dim);
            });
        });

        function isInWindow(value: number) {
            return value >= valueWindow[0] && value <= valueWindow[1];
        }
    }

    private _updateMinMaxSpan() {
        const minMaxSpan = this._minMaxSpan = {} as MinMaxSpan;
        const dataZoomModel = this._dataZoomModel;
        const dataExtent = this._dataExtent;

        each(['min', 'max'], function (minMax) {
            let percentSpan = dataZoomModel.get(minMax + 'Span' as 'minSpan' | 'maxSpan');
            let valueSpan = dataZoomModel.get(minMax + 'ValueSpan' as 'minValueSpan' | 'maxValueSpan');
            valueSpan != null && (valueSpan = this.getAxisModel().axis.scale.parse(valueSpan));

            // minValueSpan and maxValueSpan has higher priority than minSpan and maxSpan
            if (valueSpan != null) {
                percentSpan = numberUtil.linearMap(
                    dataExtent[0] + valueSpan, dataExtent, [0, 100], true
                );
            }
            else if (percentSpan != null) {
                valueSpan = numberUtil.linearMap(
                    percentSpan, [0, 100], dataExtent, true
                ) - dataExtent[0];
            }

            minMaxSpan[minMax + 'Span' as 'minSpan' | 'maxSpan'] = percentSpan;
            minMaxSpan[minMax + 'ValueSpan' as 'minValueSpan' | 'maxValueSpan'] = valueSpan;
        }, this);
    }

    private _setAxisModel() {

        const axisModel = this.getAxisModel();

        const percentWindow = this._percentWindow;
        const valueWindow = this._valueWindow;

        if (!percentWindow) {
            return;
        }

        // [0, 500]: arbitrary value, guess axis extent.
        let precision = numberUtil.getPixelPrecision(valueWindow, [0, 500]);
        precision = Math.min(precision, 20);

        // For value axis, if min/max/scale are not set, we just use the extent obtained
        // by series data, which may be a little different from the extent calculated by
        // `axisHelper.getScaleExtent`. But the different just affects the experience a
        // little when zooming. So it will not be fixed until some users require it strongly.
        const rawExtentInfo = axisModel.axis.scale.rawExtentInfo;
        if (percentWindow[0] !== 0) {
            rawExtentInfo.setDeterminedMinMax('min', +valueWindow[0].toFixed(precision));
        }
        if (percentWindow[1] !== 100) {
            rawExtentInfo.setDeterminedMinMax('max', +valueWindow[1].toFixed(precision));
        }
        rawExtentInfo.freeze();
    }
}

function calculateDataExtent(axisProxy: AxisProxy, axisDim: string, seriesModels: SeriesModel[]) {
    const dataExtent = [Infinity, -Infinity];

    each(seriesModels, function (seriesModel) {
        unionAxisExtentFromData(dataExtent, seriesModel.getData(), axisDim);
    });

    // It is important to get "consistent" extent when more then one axes is
    // controlled by a `dataZoom`, otherwise those axes will not be synchronized
    // when zooming. But it is difficult to know what is "consistent", considering
    // axes have different type or even different meanings (For example, two
    // time axes are used to compare data of the same date in different years).
    // So basically dataZoom just obtains extent by series.data (in category axis
    // extent can be obtained from axis.data).
    // Nevertheless, user can set min/max/scale on axes to make extent of axes
    // consistent.
    const axisModel = axisProxy.getAxisModel();
    const rawExtentResult = ensureScaleRawExtentInfo(axisModel.axis.scale, axisModel, dataExtent).calculate();

    return [rawExtentResult.min, rawExtentResult.max] as [number, number];
}

export default AxisProxy;

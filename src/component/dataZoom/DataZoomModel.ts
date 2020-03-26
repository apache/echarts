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

import {__DEV__} from '../../config';
import * as zrUtil from 'zrender/src/core/util';
import env from 'zrender/src/core/env';
import * as modelUtil from '../../util/model';
import AxisProxy from './AxisProxy';
import ComponentModel from '../../model/Component';
import {
    LayoutOrient,
    ComponentOption,
    Dictionary,
    LabelOption,
    SeriesOption,
    SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin,
    SeriesOnSingleOptionMixin
} from '../../util/types';
import Model from '../../model/Model';
import GlobalModel from '../../model/Global';
import SeriesModel from '../../model/Series';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import { OptionAxisType, AxisBaseOption } from '../../coord/axisCommonTypes';
import { eachAxisDim } from './helper';

const each = zrUtil.each;

export interface DataZoomOption extends ComponentOption {

    /**
     * Default auto by axisIndex
     */
    orient?: LayoutOrient

    /**
     * Default the first horizontal category axis.
     */
    xAxisIndex?: number | number[]

    /**
     * Default the first vertical category axis.
     */
    yAxisIndex?: number | number[]

    radiusAxisIndex?: number | number[]
    angleAxisIndex?: number | number[]

    singleAxisIndex?: number | number[]

    /**
     * Possible values: 'filter' or 'empty' or 'weakFilter'.
     * 'filter': data items which are out of window will be removed. This option is
     *         applicable when filtering outliers. For each data item, it will be
     *         filtered if one of the relevant dimensions is out of the window.
     * 'weakFilter': data items which are out of window will be removed. This option
     *         is applicable when filtering outliers. For each data item, it will be
     *         filtered only if all  of the relevant dimensions are out of the same
     *         side of the window.
     * 'empty': data items which are out of window will be set to empty.
     *         This option is applicable when user should not neglect
     *         that there are some data items out of window.
     * 'none': Do not filter.
     * Taking line chart as an example, line will be broken in
     * the filtered points when filterModel is set to 'empty', but
     * be connected when set to 'filter'.
     */
    filterMode?: 'filter' | 'weakFilter' | 'empty' | 'none'

    /**
     * Dispatch action by the fixed rate, avoid frequency.
     * default 100. Do not throttle when use null/undefined.
     * If animation === true and animationDurationUpdate > 0,
     * default value is 100, otherwise 20.
     */
    throttle?: number | null | undefined
    /**
     * Start percent. 0 ~ 100
     */
    start?: number
    /**
     * End percent. 0 ~ 100
     */
    end?: number
    /**
     * Start value. If startValue specified, start is ignored
     */
    startValue?: number
    /**
     * End value. If endValue specified, end is ignored.
     */
    endValue?: number
    /**
     * Min span percent, 0 - 100
     * The range of dataZoom can not be smaller than that.
     */
    minSpan?: number
    /**
     * Max span percent, 0 - 100
     * The range of dataZoom can not be larger than that.
     */
    maxSpan?: number

    minValueSpan?: number

    maxValueSpan?: number

    rangeMode?: ['value' | 'percent', 'value' | 'percent']

    realtime?: boolean

    // Available when type is slider
    textStyle?: LabelOption
}

type RangeOption = Pick<DataZoomOption, 'start' | 'end' | 'startValue' | 'endValue'>;

type ExtendedAxisBaseModel = AxisBaseModel & {
    __dzAxisProxy: AxisProxy
};

interface SeriesModelOnAxis extends SeriesModel<
    SeriesOption & SeriesOnCartesianOptionMixin & SeriesOnPolarOptionMixin & SeriesOnSingleOptionMixin
> {}

class DataZoomModel<Opts extends DataZoomOption = DataZoomOption> extends ComponentModel<Opts> {
    static type = 'dataZoom';
    type = DataZoomModel.type;

    static dependencies = [
        'xAxis', 'yAxis', 'zAxis', 'radiusAxis', 'angleAxis', 'singleAxis', 'series'
    ];


    static defaultOption: DataZoomOption = {
        zlevel: 0,
        z: 4,                   // Higher than normal component (z: 2).

        filterMode: 'filter',

        start: 0,
        end: 100
    };

    /**
     * key like x_0, y_1
     */
    private _dataIntervalByAxis: Dictionary<[number, number]> = {};

    private _dataInfo = {};

    private _axisProxies: Dictionary<AxisProxy> = {};

    private _autoThrottle = true;

    /**
     * It is `[rangeModeForMin, rangeModeForMax]`.
     * The optional values for `rangeMode`:
     * + `'value'` mode: the axis extent will always be determined by
     *     `dataZoom.startValue` and `dataZoom.endValue`, despite
     *     how data like and how `axis.min` and `axis.max` are.
     * + `'percent'` mode: `100` represents 100% of the `[dMin, dMax]`,
     *     where `dMin` is `axis.min` if `axis.min` specified, otherwise `data.extent[0]`,
     *     and `dMax` is `axis.max` if `axis.max` specified, otherwise `data.extent[1]`.
     *     Axis extent will be determined by the result of the percent of `[dMin, dMax]`.
     *
     * For example, when users are using dynamic data (update data periodically via `setOption`),
     * if in `'value`' mode, the window will be kept in a fixed value range despite how
     * data are appended, while if in `'percent'` mode, whe window range will be changed alone with
     * the appended data (suppose `axis.min` and `axis.max` are not specified).
     */
    private _rangePropMode: DataZoomOption['rangeMode'] = ['percent', 'percent'];

    textStyleModel: Model<DataZoomOption['textStyle']>;

    settledOption: Opts;

    init(option: Opts, parentModel: Model, ecModel: GlobalModel) {

        const inputRawOption = retrieveRawOption(option);

        /**
         * Suppose a "main process" start at the point that model prepared (that is,
         * model initialized or merged or method called in `action`).
         * We should keep the `main process` idempotent, that is, given a set of values
         * on `option`, we get the same result.
         *
         * But sometimes, values on `option` will be updated for providing users
         * a "final calculated value" (`dataZoomProcessor` will do that). Those value
         * should not be the base/input of the `main process`.
         *
         * So in that case we should save and keep the input of the `main process`
         * separately, called `settledOption`.
         *
         * For example, consider the case:
         * (Step_1) brush zoom the grid by `toolbox.dataZoom`,
         *     where the original input `option.startValue`, `option.endValue` are earsed by
         *     calculated value.
         * (Step)2) click the legend to hide and show a series,
         *     where the new range is calculated by the earsed `startValue` and `endValue`,
         *     which brings incorrect result.
         *
         * @readOnly
         */
        this.settledOption = inputRawOption;

        this.mergeDefaultAndTheme(option, ecModel);

        this.doInit(inputRawOption);
    }

    /**
     * @override
     */
    mergeOption(newOption: Opts) {
        const inputRawOption = retrieveRawOption(newOption);

        //FIX #2591
        zrUtil.merge(this.option, newOption, true);
        zrUtil.merge(this.settledOption, inputRawOption, true);

        this.doInit(inputRawOption);
    }

    /**
     * @protected
     */
    doInit(inputRawOption: Opts) {
        const thisOption = this.option;

        // Disable realtime view update if canvas is not supported.
        if (!env.canvasSupported) {
            thisOption.realtime = false;
        }

        this._setDefaultThrottle(inputRawOption);

        this._updateRangeUse(inputRawOption);

        const settledOption = this.settledOption;
        each([['start', 'startValue'], ['end', 'endValue']] as const, function (names, index) {
            // start/end has higher priority over startValue/endValue if they
            // both set, but we should make chart.setOption({endValue: 1000})
            // effective, rather than chart.setOption({endValue: 1000, end: null}).
            if (this._rangePropMode[index] === 'value') {
                thisOption[names[0]] = settledOption[names[0]] = null;
            }
            // Otherwise do nothing and use the merge result.
        }, this);

        this.textStyleModel = this.getModel('textStyle');

        this._resetTarget();

        this._giveAxisProxies();
    }

    private _giveAxisProxies() {
        const axisProxies = this._axisProxies;

        this.eachTargetAxis(function (dimNames, axisIndex, dataZoomModel, ecModel) {
            const axisModel = this.dependentModels[dimNames.axis][axisIndex];

            // If exists, share axisProxy with other dataZoomModels.
            const axisProxy = (axisModel as ExtendedAxisBaseModel).__dzAxisProxy || (
                // Use the first dataZoomModel as the main model of axisProxy.
                (axisModel as ExtendedAxisBaseModel).__dzAxisProxy = new AxisProxy(
                    dimNames.name, axisIndex, this, ecModel
                )
            );
            // FIXME
            // dispose __dzAxisProxy

            axisProxies[dimNames.name + '_' + axisIndex] = axisProxy;
        }, this);
    }

    private _resetTarget() {
        const thisOption = this.option;

        const autoMode = this._judgeAutoMode();

        eachAxisDim(function (dimNames) {
            const axisIndexName = dimNames.axisIndex;
            thisOption[axisIndexName] = modelUtil.normalizeToArray(
                thisOption[axisIndexName]
            );
        }, this);

        if (autoMode === 'axisIndex') {
            this._autoSetAxisIndex();
        }
        else if (autoMode === 'orient') {
            this._autoSetOrient();
        }
    }

    private _judgeAutoMode() {
        // Auto set only works for setOption at the first time.
        // The following is user's reponsibility. So using merged
        // option is OK.
        const thisOption = this.option;

        let hasIndexSpecified = false;
        eachAxisDim(function (dimNames) {
            // When user set axisIndex as a empty array, we think that user specify axisIndex
            // but do not want use auto mode. Because empty array may be encountered when
            // some error occured.
            if (thisOption[dimNames.axisIndex] != null) {
                hasIndexSpecified = true;
            }
        }, this);

        const orient = thisOption.orient;

        if (orient == null && hasIndexSpecified) {
            return 'orient';
        }
        else if (!hasIndexSpecified) {
            if (orient == null) {
                thisOption.orient = 'horizontal';
            }
            return 'axisIndex';
        }
    }

    private _autoSetAxisIndex() {
        let autoAxisIndex = true;
        const orient = this.get('orient', true);
        const thisOption = this.option;
        const dependentModels = this.dependentModels;

        if (autoAxisIndex) {
            // Find axis that parallel to dataZoom as default.
            const dimName = orient === 'vertical' ? 'y' : 'x';

            if (dependentModels[dimName + 'Axis'].length) {
                thisOption[dimName + 'AxisIndex' as 'xAxisIndex' | 'yAxisIndex'] = [0];
                autoAxisIndex = false;
            }
            else {
                each(dependentModels.singleAxis, function (
                    singleAxisModel: AxisBaseModel<{'orient': LayoutOrient} & AxisBaseOption>
                ) {
                    if (autoAxisIndex && singleAxisModel.get('orient', true) === orient) {
                        thisOption.singleAxisIndex = [singleAxisModel.componentIndex];
                        autoAxisIndex = false;
                    }
                });
            }
        }

        if (autoAxisIndex) {
            // Find the first category axis as default. (consider polar)
            eachAxisDim(function (dimNames) {
                if (!autoAxisIndex) {
                    return;
                }
                const axisIndices = [];
                const axisModels = this.dependentModels[dimNames.axis];
                if (axisModels.length && !axisIndices.length) {
                    for (let i = 0, len = axisModels.length; i < len; i++) {
                        if (axisModels[i].get('type') === 'category') {
                            axisIndices.push(i);
                        }
                    }
                }
                thisOption[dimNames.axisIndex] = axisIndices;
                if (axisIndices.length) {
                    autoAxisIndex = false;
                }
            }, this);
        }

        if (autoAxisIndex) {
            // FIXME
            // 这里是兼容ec2的写法（没指定xAxisIndex和yAxisIndex时把scatter和双数值轴折柱纳入dataZoom控制），
            // 但是实际是否需要Grid.js#getScaleByOption来判断（考虑time，log等axis type）？

            // If both dataZoom.xAxisIndex and dataZoom.yAxisIndex is not specified,
            // dataZoom component auto adopts series that reference to
            // both xAxis and yAxis which type is 'value'.
            this.ecModel.eachSeries(function (seriesModel: SeriesModelOnAxis) {
                if (this._isSeriesHasAllAxesTypeOf(seriesModel, 'value')) {
                    eachAxisDim(function (dimNames) {
                        const axisIndices = thisOption[dimNames.axisIndex] as number[]; // Has been normalized to array

                        let axisIndex = seriesModel.get(dimNames.axisIndex);
                        const axisId = seriesModel.get(dimNames.axisId);

                        const axisModel = seriesModel.ecModel.queryComponents({
                            mainType: dimNames.axis,
                            index: axisIndex,
                            id: axisId
                        })[0];

                        if (__DEV__) {
                            if (!axisModel) {
                                throw new Error(
                                    dimNames.axis + ' "' + zrUtil.retrieve<number | string>(
                                        axisIndex,
                                        axisId,
                                        0
                                    ) + '" not found'
                                );
                            }
                        }
                        axisIndex = axisModel.componentIndex;

                        if (zrUtil.indexOf(axisIndices, axisIndex) < 0) {
                            axisIndices.push(axisIndex);
                        }
                    });
                }
            }, this);
        }
    }

    private _autoSetOrient() {
        let dim: string;

        // Find the first axis
        this.eachTargetAxis(function (dimNames) {
            !dim && (dim = dimNames.name);
        }, this);

        this.option.orient = dim === 'y' ? 'vertical' : 'horizontal';
    }

    private _isSeriesHasAllAxesTypeOf(seriesModel: SeriesModelOnAxis, axisType: OptionAxisType) {
        // FIXME
        // 需要series的xAxisIndex和yAxisIndex都首先自动设置上。
        // 例如series.type === scatter时。

        let is = true;
        eachAxisDim(function (dimNames) {
            const seriesAxisIndex = seriesModel.get(dimNames.axisIndex);
            const axisModel = this.dependentModels[dimNames.axis][seriesAxisIndex];

            if (!axisModel || axisModel.get('type') !== axisType) {
                is = false;
            }
        }, this);
        return is;
    }

    private _setDefaultThrottle(inputRawOption: DataZoomOption) {
        // When first time user set throttle, auto throttle ends.
        if (inputRawOption.hasOwnProperty('throttle')) {
            this._autoThrottle = false;
        }
        if (this._autoThrottle) {
            const globalOption = this.ecModel.option;
            this.option.throttle = (
                globalOption.animation && globalOption.animationDurationUpdate > 0
            ) ? 100 : 20;
        }
    }

    private _updateRangeUse(inputRawOption: RangeOption) {
        const rangePropMode = this._rangePropMode;
        const rangeModeInOption = this.get('rangeMode');

        each([['start', 'startValue'], ['end', 'endValue']] as const, function (names, index) {
            const percentSpecified = inputRawOption[names[0]] != null;
            const valueSpecified = inputRawOption[names[1]] != null;
            if (percentSpecified && !valueSpecified) {
                rangePropMode[index] = 'percent';
            }
            else if (!percentSpecified && valueSpecified) {
                rangePropMode[index] = 'value';
            }
            else if (rangeModeInOption) {
                rangePropMode[index] = rangeModeInOption[index];
            }
            else if (percentSpecified) { // percentSpecified && valueSpecified
                rangePropMode[index] = 'percent';
            }
            // else remain its original setting.
        });
    }

    /**
     * @public
     */
    getFirstTargetAxisModel() {
        let firstAxisModel: AxisBaseModel;
        eachAxisDim(function (dimNames) {
            if (firstAxisModel == null) {
                const indices = this.get(dimNames.axisIndex) as number[]; // Has been normalized to array
                if (indices.length) {
                    firstAxisModel = this.dependentModels[dimNames.axis][indices[0]] as AxisBaseModel;
                }
            }
        }, this);

        return firstAxisModel;
    }

    /**
     * @public
     * @param {Function} callback param: axisModel, dimNames, axisIndex, dataZoomModel, ecModel
     */
    eachTargetAxis<Ctx>(
        callback: (
            this: Ctx,
            dimNames: Parameters<Parameters<typeof eachAxisDim>[0]>[0],
            axisIndex: number,
            dataZoomModel: this,
            ecModel: GlobalModel
        ) => void,
        context?: Ctx
    ) {
        const ecModel = this.ecModel;
        eachAxisDim(function (dimNames) {
            each(
                this.get(dimNames.axisIndex) as number[],   // Has been normalized to array
                function (axisIndex) {
                    callback.call(context, dimNames, axisIndex, this, ecModel);
                },
                this
            );
        }, this);
    }

    /**
     * @return If not found, return null/undefined.
     */
    getAxisProxy(dimName: string, axisIndex: number): AxisProxy {
        return this._axisProxies[dimName + '_' + axisIndex];
    }

    /**
     * @return If not found, return null/undefined.
     */
    getAxisModel(dimName: string, axisIndex: number): AxisBaseModel {
        const axisProxy = this.getAxisProxy(dimName, axisIndex);
        return axisProxy && axisProxy.getAxisModel();
    }

    /**
     * If not specified, set to undefined.
     */
    setRawRange(opt: RangeOption) {
        const thisOption = this.option;
        const settledOption = this.settledOption;
        each([['start', 'startValue'], ['end', 'endValue']] as const, function (names) {
            // Consider the pair <start, startValue>:
            // If one has value and the other one is `null/undefined`, we both set them
            // to `settledOption`. This strategy enables the feature to clear the original
            // value in `settledOption` to `null/undefined`.
            // But if both of them are `null/undefined`, we do not set them to `settledOption`
            // and keep `settledOption` with the original value. This strategy enables users to
            // only set <end or endValue> but not set <start or startValue> when calling
            // `dispatchAction`.
            // The pair <end, endValue> is treated in the same way.
            if (opt[names[0]] != null || opt[names[1]] != null) {
                thisOption[names[0]] = settledOption[names[0]] = opt[names[0]];
                thisOption[names[1]] = settledOption[names[1]] = opt[names[1]];
            }
        }, this);

        this._updateRangeUse(opt);
    }

    setCalculatedRange(opt: RangeOption) {
        const option = this.option;
        each(['start', 'startValue', 'end', 'endValue'] as const, function (name) {
            option[name] = opt[name];
        });
    }

    /**
     * @public
     * @return {Array.<number>} [startPercent, endPercent]
     */
    getPercentRange() {
        const axisProxy = this.findRepresentativeAxisProxy();
        if (axisProxy) {
            return axisProxy.getDataPercentWindow();
        }
    }

    /**
     * @public
     * For example, chart.getModel().getComponent('dataZoom').getValueRange('y', 0);
     *
     * @return [startValue, endValue] value can only be '-' or finite number.
     */
    getValueRange(axisDimName: string, axisIndex: number): [number, number] {
        if (axisDimName == null && axisIndex == null) {
            const axisProxy = this.findRepresentativeAxisProxy();
            if (axisProxy) {
                return axisProxy.getDataValueWindow();
            }
        }
        else {
            return this.getAxisProxy(axisDimName, axisIndex).getDataValueWindow();
        }
    }

    /**
     * @public
     * @param axisModel If axisModel given, find axisProxy
     *      corresponding to the axisModel
     */
    findRepresentativeAxisProxy(axisModel?: AxisBaseModel): AxisProxy {
        if (axisModel) {
            return (axisModel as ExtendedAxisBaseModel).__dzAxisProxy;
        }

        // Find the first hosted axisProxy
        const axisProxies = this._axisProxies;
        for (const key in axisProxies) {
            if (axisProxies.hasOwnProperty(key) && axisProxies[key].hostedBy(this)) {
                return axisProxies[key];
            }
        }

        // If no hosted axis find not hosted axisProxy.
        // Consider this case: dataZoomModel1 and dataZoomModel2 control the same axis,
        // and the option.start or option.end settings are different. The percentRange
        // should follow axisProxy.
        // (We encounter this problem in toolbox data zoom.)
        for (const key in axisProxies) {
            if (axisProxies.hasOwnProperty(key) && !axisProxies[key].hostedBy(this)) {
                return axisProxies[key];
            }
        }
    }

    /**
     * @return {Array.<string>}
     */
    getRangePropMode() {
        return this._rangePropMode.slice();
    }

}
/**
 * Retrieve the those raw params from option, which will be cached separately.
 * becasue they will be overwritten by normalized/calculated values in the main
 * process.
 */
function retrieveRawOption<T extends DataZoomOption>(option: T) {
    const ret = {} as T;
    each(
        ['start', 'end', 'startValue', 'endValue', 'throttle'] as const,
        function (name) {
            option.hasOwnProperty(name) && (ret[name] = option[name]);
        }
    );
    return ret;
}

export default DataZoomModel;
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

import { each, createHashMap, merge, HashMap, assert } from 'zrender/src/core/util';
import AxisProxy from './AxisProxy';
import ComponentModel from '../../model/Component';
import {
    LayoutOrient,
    ComponentOption,
    LabelOption
} from '../../util/types';
import Model from '../../model/Model';
import GlobalModel from '../../model/Global';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import {
    getAxisMainType, DATA_ZOOM_AXIS_DIMENSIONS, DataZoomAxisDimension
} from './helper';
import SingleAxisModel from '../../coord/single/AxisModel';
import { MULTIPLE_REFERRING, SINGLE_REFERRING } from '../../util/model';


export interface DataZoomOption extends ComponentOption {

    mainType?: 'dataZoom'

    /**
     * Default auto by axisIndex
     */
    orient?: LayoutOrient

    /**
     * Default the first horizontal category axis.
     */
    xAxisIndex?: number | number[]
    xAxisId?: string | string[]

    /**
     * Default the first vertical category axis.
     */
    yAxisIndex?: number | number[]
    yAxisId?: string | string[]

    radiusAxisIndex?: number | number[]
    radiusAxisId?: string | string[]
    angleAxisIndex?: number | number[]
    angleAxisId?: string | string[]

    singleAxisIndex?: number | number[]
    singleAxisId?: string | string[]

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
    startValue?: number | string | Date
    /**
     * End value. If endValue specified, end is ignored.
     */
    endValue?: number | string | Date
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

export type DataZoomExtendedAxisBaseModel = AxisBaseModel & {
    __dzAxisProxy: AxisProxy
};

class DataZoomAxisInfo {
    indexList: number[] = [];
    indexMap: boolean[] = [];

    add(axisCmptIdx: number) {
        // Remove duplication.
        if (!this.indexMap[axisCmptIdx]) {
            this.indexList.push(axisCmptIdx);
            this.indexMap[axisCmptIdx] = true;
        }
    }
}
export type DataZoomTargetAxisInfoMap = HashMap<DataZoomAxisInfo, DataZoomAxisDimension>;

class DataZoomModel<Opts extends DataZoomOption = DataZoomOption> extends ComponentModel<Opts> {
    static type = 'dataZoom';
    type = DataZoomModel.type;

    static dependencies = [
        'xAxis', 'yAxis', 'radiusAxis', 'angleAxis', 'singleAxis', 'series', 'toolbox'
    ];


    static defaultOption: DataZoomOption = {
        // zlevel: 0,
        z: 4,                   // Higher than normal component (z: 2).

        filterMode: 'filter',

        start: 0,
        end: 100
    };

    private _autoThrottle = true;

    private _orient: LayoutOrient;

    private _targetAxisInfoMap: DataZoomTargetAxisInfoMap;

    private _noTarget: boolean = true;

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

    /**
     * @readonly
     */
    settledOption: Opts;

    init(option: Opts, parentModel: Model, ecModel: GlobalModel): void {

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
         */
        this.settledOption = inputRawOption;

        this.mergeDefaultAndTheme(option, ecModel);

        this._doInit(inputRawOption);
    }

    mergeOption(newOption: Opts): void {
        const inputRawOption = retrieveRawOption(newOption);

        // FIX #2591
        merge(this.option, newOption, true);
        merge(this.settledOption, inputRawOption, true);

        this._doInit(inputRawOption);
    }

    private _doInit(inputRawOption: Opts): void {
        const thisOption = this.option;

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

        this._resetTarget();
    }

    private _resetTarget() {
        const optionOrient = this.get('orient', true);
        const targetAxisIndexMap = this._targetAxisInfoMap = createHashMap<DataZoomAxisInfo, DataZoomAxisDimension>();

        const hasAxisSpecified = this._fillSpecifiedTargetAxis(targetAxisIndexMap);

        if (hasAxisSpecified) {
            this._orient = optionOrient || this._makeAutoOrientByTargetAxis();
        }
        else {
            this._orient = optionOrient || 'horizontal';
            this._fillAutoTargetAxisByOrient(targetAxisIndexMap, this._orient);
        }

        this._noTarget = true;
        targetAxisIndexMap.each(function (axisInfo) {
            if (axisInfo.indexList.length) {
                this._noTarget = false;
            }
        }, this);
    }

    private _fillSpecifiedTargetAxis(targetAxisIndexMap: DataZoomTargetAxisInfoMap): boolean {
        let hasAxisSpecified = false;

        each(DATA_ZOOM_AXIS_DIMENSIONS, function (axisDim) {
            const refering = this.getReferringComponents(getAxisMainType(axisDim), MULTIPLE_REFERRING);
            // When user set axisIndex as a empty array, we think that user specify axisIndex
            // but do not want use auto mode. Because empty array may be encountered when
            // some error occurred.
            if (!refering.specified) {
                return;
            }
            hasAxisSpecified = true;
            const axisInfo = new DataZoomAxisInfo();
            each(refering.models, function (axisModel) {
                axisInfo.add(axisModel.componentIndex);
            });
            targetAxisIndexMap.set(axisDim, axisInfo);
        }, this);

        return hasAxisSpecified;
    }

    private _fillAutoTargetAxisByOrient(targetAxisIndexMap: DataZoomTargetAxisInfoMap, orient: LayoutOrient): void {
        const ecModel = this.ecModel;
        let needAuto = true;

        // Find axis that parallel to dataZoom as default.
        if (needAuto) {
            const axisDim = orient === 'vertical' ? 'y' : 'x';
            const axisModels = ecModel.findComponents({ mainType: axisDim + 'Axis' });
            setParallelAxis(axisModels, axisDim);
        }
        // Find axis that parallel to dataZoom as default.
        if (needAuto) {
            const axisModels = ecModel.findComponents({
                mainType: 'singleAxis',
                filter: (axisModel: SingleAxisModel) => axisModel.get('orient', true) === orient
            });
            setParallelAxis(axisModels, 'single');
        }

        function setParallelAxis(axisModels: ComponentModel[], axisDim: DataZoomAxisDimension): void {
            // At least use the first parallel axis as the target axis.
            const axisModel = axisModels[0];
            if (!axisModel) {
                return;
            }

            const axisInfo = new DataZoomAxisInfo();
            axisInfo.add(axisModel.componentIndex);
            targetAxisIndexMap.set(axisDim, axisInfo);
            needAuto = false;

            // Find parallel axes in the same grid.
            if (axisDim === 'x' || axisDim === 'y') {
                const gridModel = axisModel.getReferringComponents('grid', SINGLE_REFERRING).models[0];
                gridModel && each(axisModels, function (axModel) {
                    if (axisModel.componentIndex !== axModel.componentIndex
                        && gridModel === axModel.getReferringComponents('grid', SINGLE_REFERRING).models[0]
                    ) {
                        axisInfo.add(axModel.componentIndex);
                    }
                });
            }
        }

        if (needAuto) {
            // If no parallel axis, find the first category axis as default. (Also consider polar).
            each(DATA_ZOOM_AXIS_DIMENSIONS, function (axisDim) {
                if (!needAuto) {
                    return;
                }
                const axisModels = ecModel.findComponents({
                    mainType: getAxisMainType(axisDim),
                    filter: (axisModel: SingleAxisModel) => axisModel.get('type', true) === 'category'
                });
                if (axisModels[0]) {
                    const axisInfo = new DataZoomAxisInfo();
                    axisInfo.add(axisModels[0].componentIndex);
                    targetAxisIndexMap.set(axisDim, axisInfo);
                    needAuto = false;
                }
            }, this);
        }
    }

    private _makeAutoOrientByTargetAxis(): LayoutOrient {
        let dim: string;

        // Find the first axis
        this.eachTargetAxis(function (axisDim) {
            !dim && (dim = axisDim);
        }, this);

        return dim === 'y' ? 'vertical' : 'horizontal';
    }

    private _setDefaultThrottle(inputRawOption: DataZoomOption): void {
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

    private _updateRangeUse(inputRawOption: RangeOption): void {
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

    noTarget(): boolean {
        return this._noTarget;
    }

    getFirstTargetAxisModel(): AxisBaseModel {
        let firstAxisModel: AxisBaseModel;
        this.eachTargetAxis(function (axisDim, axisIndex) {
            if (firstAxisModel == null) {
                firstAxisModel = this.ecModel.getComponent(
                    getAxisMainType(axisDim), axisIndex
                ) as AxisBaseModel;
            }
        }, this);

        return firstAxisModel;
    }

    /**
     * @param {Function} callback param: axisModel, dimNames, axisIndex, dataZoomModel, ecModel
     */
    eachTargetAxis<Ctx>(
        callback: (
            this: Ctx,
            axisDim: DataZoomAxisDimension,
            axisIndex: number
        ) => void,
        context?: Ctx
    ): void {
        this._targetAxisInfoMap.each(function (axisInfo, axisDim) {
            each(axisInfo.indexList, function (axisIndex) {
                callback.call(context, axisDim, axisIndex);
            });
        });
    }

    /**
     * @return If not found, return null/undefined.
     */
    getAxisProxy(axisDim: DataZoomAxisDimension, axisIndex: number): AxisProxy {
        const axisModel = this.getAxisModel(axisDim, axisIndex);
        if (axisModel) {
            return (axisModel as DataZoomExtendedAxisBaseModel).__dzAxisProxy;
        }
    }

    /**
     * @return If not found, return null/undefined.
     */
    getAxisModel(axisDim: DataZoomAxisDimension, axisIndex: number): AxisBaseModel {
        if (__DEV__) {
            assert(axisDim && axisIndex != null);
        }
        const axisInfo = this._targetAxisInfoMap.get(axisDim);
        if (axisInfo && axisInfo.indexMap[axisIndex]) {
            return this.ecModel.getComponent(getAxisMainType(axisDim), axisIndex) as AxisBaseModel;
        }
    }

    /**
     * If not specified, set to undefined.
     */
    setRawRange(opt: RangeOption): void {
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

    setCalculatedRange(opt: RangeOption): void {
        const option = this.option;
        each(['start', 'startValue', 'end', 'endValue'] as const, function (name) {
            (option as any)[name] = opt[name];
        });
    }

    getPercentRange(): number[] {
        const axisProxy = this.findRepresentativeAxisProxy();
        if (axisProxy) {
            return axisProxy.getDataPercentWindow();
        }
    }

    /**
     * For example, chart.getModel().getComponent('dataZoom').getValueRange('y', 0);
     *
     * @return [startValue, endValue] value can only be '-' or finite number.
     */
    getValueRange(axisDim: DataZoomAxisDimension, axisIndex: number): number[] {
        if (axisDim == null && axisIndex == null) {
            const axisProxy = this.findRepresentativeAxisProxy();
            if (axisProxy) {
                return axisProxy.getDataValueWindow();
            }
        }
        else {
            return this.getAxisProxy(axisDim, axisIndex).getDataValueWindow();
        }
    }

    /**
     * @param axisModel If axisModel given, find axisProxy
     *      corresponding to the axisModel
     */
    findRepresentativeAxisProxy(axisModel?: AxisBaseModel): AxisProxy {
        if (axisModel) {
            return (axisModel as DataZoomExtendedAxisBaseModel).__dzAxisProxy;
        }

        // Find the first hosted axisProxy
        let firstProxy;
        const axisDimList = this._targetAxisInfoMap.keys();
        for (let i = 0; i < axisDimList.length; i++) {
            const axisDim = axisDimList[i];
            const axisInfo = this._targetAxisInfoMap.get(axisDim);
            for (let j = 0; j < axisInfo.indexList.length; j++) {
                const proxy = this.getAxisProxy(axisDim, axisInfo.indexList[j]);
                if (proxy.hostedBy(this)) {
                    return proxy;
                }
                if (!firstProxy) {
                    firstProxy = proxy;
                }
            }
        }

        // If no hosted proxy found, still need to return a proxy.
        // This case always happens in toolbox dataZoom, where axes are all hosted by
        // other dataZooms.
        return firstProxy;
    }

    getRangePropMode(): DataZoomModel['_rangePropMode'] {
        return this._rangePropMode.slice() as DataZoomModel['_rangePropMode'];
    }

    getOrient(): LayoutOrient {
        if (__DEV__) {
            // Should not be called before initialized.
            assert(this._orient);
        }
        return this._orient;
    }

}
/**
 * Retrieve those raw params from option, which will be cached separately,
 * because they will be overwritten by normalized/calculated values in the main
 * process.
 */
function retrieveRawOption<T extends DataZoomOption>(option: T) {
    const ret = {} as T;
    each(
        ['start', 'end', 'startValue', 'endValue', 'throttle'] as const,
        function (name) {
            option.hasOwnProperty(name) && ((ret as any)[name] = option[name]);
        }
    );
    return ret;
}

export default DataZoomModel;

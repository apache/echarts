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

import {createHashMap, each, HashMap} from 'zrender/src/core/util';
import GlobalModel from '../model/Global';
import SeriesModel from '../model/Series';
import { SeriesOption, SeriesStackOptionMixin } from '../util/types';
import SeriesData, { DataCalculationInfo } from '../data/SeriesData';
import { addSafe } from '../util/number';

interface StackNormalizeOption {
    stackNormalize?: boolean
}

type StackSeriesOption = SeriesOption & SeriesStackOptionMixin & StackNormalizeOption;

type StackInfo = Pick<
    DataCalculationInfo<StackSeriesOption>,
    'stackedDimension'
    | 'isStackedByIndex'
    | 'stackedByDimension'
    | 'stackResultDimension'
    | 'stackedOverDimension'
> & {
    data: SeriesData
    seriesModel: SeriesModel<StackSeriesOption>
};

interface StackTotal {
    all: number
    positive: number
    negative: number
}

type StackTotalMap = HashMap<StackTotal, string | number>;
type StackTotalKey = string | number;

interface StackTotalMaps {
    byIndex?: StackTotalMap
    byDimension?: StackTotalMap
}

// (1) [Caution]: the logic is correct based on the premises:
//     data processing stage is blocked in stream.
//     See <module:echarts/stream/Scheduler#performDataProcessorTasks>
// (2) Only register once when import repeatedly.
//     Should be executed after series is filtered and before stack calculation.
export default function dataStack(ecModel: GlobalModel) {
    const stackInfoMap = createHashMap<StackInfo[]>();
    ecModel.eachSeries(function (seriesModel: SeriesModel<StackSeriesOption>) {
        const stack = seriesModel.get('stack');
        // Compatible: when `stack` is set as '', do not stack.
        if (stack) {
            const stackInfoList = stackInfoMap.get(stack) || stackInfoMap.set(stack, []);
            const data = seriesModel.getData();

            const stackInfo: StackInfo = {
                // Used for calculate axis extent automatically.
                // TODO: Type getCalculationInfo return more specific type?
                stackResultDimension: data.getCalculationInfo('stackResultDimension'),
                stackedOverDimension: data.getCalculationInfo('stackedOverDimension'),
                stackedDimension: data.getCalculationInfo('stackedDimension'),
                stackedByDimension: data.getCalculationInfo('stackedByDimension'),
                isStackedByIndex: data.getCalculationInfo('isStackedByIndex'),
                data: data,
                seriesModel: seriesModel
            };

            // If stacked on axis that do not support data stack.
            if (!stackInfo.stackedDimension
                || !(stackInfo.isStackedByIndex || stackInfo.stackedByDimension)
            ) {
                return;
            }

            stackInfoList.push(stackInfo);
        }
    });

    // Process each stack group
    stackInfoMap.each(function (stackInfoList) {
        if (stackInfoList.length === 0) {
            return;
        }
        // Check if stack order needs to be reversed
        const firstSeries = stackInfoList[0].seriesModel;
        const stackOrder = firstSeries.get('stackOrder') || 'seriesAsc';

        if (stackOrder === 'seriesDesc') {
            stackInfoList.reverse();
        }

        // Set stackedOnSeries for each series in the final order
        each(stackInfoList, function (stackInfo, index) {
            stackInfo.data.setCalculationInfo(
                'stackedOnSeries',
                index > 0 ? stackInfoList[index - 1].seriesModel : null
            );
        });

        // Calculate stack values
        calculateStack(stackInfoList, shouldNormalizeStack(stackInfoList));
    });
}

function shouldNormalizeStack(stackInfoList: StackInfo[]) {
    for (let i = 0; i < stackInfoList.length; i++) {
        const seriesModel = stackInfoList[i].seriesModel;
        if (seriesModel.type !== 'series.line' || !seriesModel.get('stackNormalize')) {
            return false;
        }
    }

    return stackInfoList.length > 0;
}

function calculateStack(stackInfoList: StackInfo[], normalizeStack: boolean) {
    const stackTotalMaps: StackTotalMaps = {};

    each(stackInfoList, function (targetStackInfo, idxInStack) {
        const resultVal: number[] = [];
        const resultNaN = [NaN, NaN];
        const dims: [string, string] = [targetStackInfo.stackResultDimension, targetStackInfo.stackedOverDimension];
        const targetData = targetStackInfo.data;
        const isStackedByIndex = targetStackInfo.isStackedByIndex;
        const stackStrategy = targetStackInfo.seriesModel.get('stackStrategy') || 'samesign';

        // Should not write on raw data, because stack series model list changes
        // depending on legend selection.
        targetData.modify(dims, function (v0, v1, dataIndex) {
            let sum = normalizeStack
                ? normalizeStackValue(stackInfoList, stackTotalMaps, targetStackInfo, dataIndex, stackStrategy)
                : targetData.get(targetStackInfo.stackedDimension, dataIndex) as number;

            // Consider `connectNulls` of line area, if value is NaN, stackedOver
            // should also be NaN, to draw a appropriate belt area.
            if (isNaN(sum)) {
                return resultNaN;
            }

            let byValue: number;
            let stackedDataRawIndex;

            if (isStackedByIndex) {
                stackedDataRawIndex = targetData.getRawIndex(dataIndex);
            }
            else {
                byValue = targetData.get(targetStackInfo.stackedByDimension, dataIndex) as number;
            }

            // If stackOver is NaN, chart view will render point on value start.
            let stackedOver = NaN;

            for (let j = idxInStack - 1; j >= 0; j--) {
                const stackInfo = stackInfoList[j];

                // Has been optimized by inverted indices on `stackedByDimension`.
                if (!isStackedByIndex) {
                    stackedDataRawIndex = stackInfo.data.rawIndexOf(stackInfo.stackedByDimension, byValue);
                }

                if (stackedDataRawIndex >= 0) {
                    const val = stackInfo.data.getByRawIndex(
                        stackInfo.stackResultDimension, stackedDataRawIndex
                    ) as number;

                    // Considering positive stack, negative stack and empty data
                    if (isStackedValueInStrategy(val, sum, stackStrategy)) {
                        // The sum has to be very small to be affected by the
                        // floating arithmetic problem. An incorrect result will probably
                        // cause axis min/max to be filtered incorrectly.
                        sum = addSafe(sum, val);
                        stackedOver = val;
                        break;
                    }
                }
            }

            resultVal[0] = sum;
            resultVal[1] = stackedOver;

            return resultVal;
        });
    });
}

function getStackTotalMap(
    stackInfoList: StackInfo[],
    stackTotalMaps: StackTotalMaps,
    isStackedByIndex: boolean
) {
    const totalMapKey = isStackedByIndex ? 'byIndex' : 'byDimension';
    return stackTotalMaps[totalMapKey]
        || (stackTotalMaps[totalMapKey] = calculateStackTotalMap(stackInfoList, isStackedByIndex));
}

function calculateStackTotalMap(stackInfoList: StackInfo[], isStackedByIndex: boolean) {
    const stackTotalMap = createHashMap<StackTotal, string | number>();

    for (let i = 0; i < stackInfoList.length; i++) {
        const stackInfo = stackInfoList[i];
        const data = stackInfo.data;

        for (let dataIndex = 0, len = data.count(); dataIndex < len; dataIndex++) {
            const value = data.get(stackInfo.stackedDimension, dataIndex) as number;

            if (isNaN(value)) {
                continue;
            }

            const key: StackTotalKey = isStackedByIndex
                ? data.getRawIndex(dataIndex)
                : data.get(stackInfo.stackedByDimension, dataIndex) as StackTotalKey;

            addStackTotal(stackTotalMap, key, value);
        }
    }

    return stackTotalMap;
}

function addStackTotal(stackTotalMap: StackTotalMap, key: StackTotalKey, value: number) {
    const total = stackTotalMap.get(key) || stackTotalMap.set(key, {
        all: 0,
        positive: 0,
        negative: 0
    });

    total.all = addSafe(total.all, value);
    if (value > 0) {
        total.positive = addSafe(total.positive, value);
    }
    else if (value < 0) {
        total.negative = addSafe(total.negative, value);
    }
}

function normalizeStackValue(
    stackInfoList: StackInfo[],
    stackTotalMaps: StackTotalMaps,
    targetStackInfo: StackInfo,
    dataIndex: number,
    stackStrategy: StackSeriesOption['stackStrategy']
) {
    const rawValue = targetStackInfo.data.get(targetStackInfo.stackedDimension, dataIndex) as number;

    if (isNaN(rawValue)) {
        return NaN;
    }

    const stackTotalMap = getStackTotalMap(stackInfoList, stackTotalMaps, targetStackInfo.isStackedByIndex);
    const key: StackTotalKey = targetStackInfo.isStackedByIndex
        ? targetStackInfo.data.getRawIndex(dataIndex)
        : targetStackInfo.data.get(targetStackInfo.stackedByDimension, dataIndex) as StackTotalKey;
    const totalInfo = stackTotalMap.get(key);
    const total = totalInfo && getStackTotal(totalInfo, rawValue, stackStrategy);
    return total ? rawValue / Math.abs(total) : 0;
}

function getStackTotal(
    totalInfo: StackTotal,
    targetValue: number,
    stackStrategy: StackSeriesOption['stackStrategy']
) {
    if (stackStrategy === 'all') {
        return totalInfo.all;
    }
    else if (stackStrategy === 'positive') {
        return totalInfo.positive;
    }
    else if (stackStrategy === 'negative') {
        return totalInfo.negative;
    }

    return targetValue >= 0 ? totalInfo.positive : totalInfo.negative;
}

function isStackedValueInStrategy(
    value: number,
    targetValue: number,
    stackStrategy: StackSeriesOption['stackStrategy']
) {
    return stackStrategy === 'all'
        || (stackStrategy === 'positive' && value > 0)
        || (stackStrategy === 'negative' && value < 0)
        || (stackStrategy === 'samesign' && targetValue >= 0 && value > 0)
        || (stackStrategy === 'samesign' && targetValue <= 0 && value < 0);
}

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

import { each } from 'zrender/src/core/util';
import { addSafe } from './number';
import { StackInfo } from './types';

/**
 * Percent stackStrategy logic to normalize each value as a percentage of the total per index.
 */
export function calculatePercentStack(stackInfoList: StackInfo[]) {
    const dataLength = stackInfoList[0].data.count();
    if (dataLength === 0) {
        return;
    }

    // Calculate totals per data index across all series in the stack group.
    const totals = calculateStackTotals(stackInfoList, dataLength);

    // Used to track running total of percent values at each index.
    const cumulativePercents = new Float64Array(dataLength);

    const resultNaN = [NaN, NaN];

    each(stackInfoList, function (targetStackInfo) {
        const resultVal: number[] = [];
        const dims: [string, string] = [targetStackInfo.stackResultDimension, targetStackInfo.stackedOverDimension];
        const targetData = targetStackInfo.data;
        const stackedDim = targetStackInfo.stackedDimension;

        // Should not write on raw data, because stack series model list changes
        // depending on legend selection.
        targetData.modify(dims, function (v0, v1, dataIndex) {
            const rawValue = targetData.get(stackedDim, dataIndex) as number;

            // Consider `connectNulls` of line area, if value is NaN, stackedOver
            // should also be NaN, to draw a appropriate belt area.
            if (isNaN(rawValue)) {
                return resultNaN;
            }

            // Pre-calculated total for this specific data index.
            const total = totals[dataIndex];

            // Percentage contribution of this segment.
            const percent = total === 0 ? 0 : (rawValue / total) * 100;

            // Bottom edge of this segment (cumulative % before this series).
            const stackedOver = cumulativePercents[dataIndex];

            // Update the cumulative percentage for the next series at this index to use.
            cumulativePercents[dataIndex] = addSafe(stackedOver, percent);

            // Result: [Top edge %, Bottom edge %]
            resultVal[0] = cumulativePercents[dataIndex];
            resultVal[1] = stackedOver;
            return resultVal;
        });
    });
}

/**
* Helper to calculate the total value across all series for each data index.
*/
function calculateStackTotals(stackInfoList: StackInfo[], dataLength: number): number[] {
    const totals = Array(dataLength).fill(0);
    each(stackInfoList, (stackInfo) => {
        const data = stackInfo.data;
        const dim = stackInfo.stackedDimension;
        for (let i = 0; i < dataLength; i++) {
            const val = data.get(dim, i) as number;
            if (!isNaN(val)) {
                totals[i] = addSafe(totals[i], val);
            }
        }
    });
    return totals;
}

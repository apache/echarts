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

import { quantile, asc } from '../../util/number';
import { isFunction, isString } from 'zrender/src/core/util';

export interface PrepareBoxplotDataOpt {
    boundIQR?: number | 'none';
    // Like "expriment{value}" produce: "expriment0", "expriment1", ...
    itemNameFormatter?: string | ((params: { value: number }) => string);
}


/**
 * See:
 *  <https://en.wikipedia.org/wiki/Box_plot#cite_note-frigge_hoaglin_iglewicz-2>
 *  <http://stat.ethz.ch/R-manual/R-devel/library/grDevices/html/boxplot.stats.html>
 *
 * Helper method for preparing data.
 *
 * @param rawData like
 *        [
 *            [12,232,443], (raw data set for the first box)
 *            [3843,5545,1232], (raw data set for the second box)
 *            ...
 *        ]
 * @param opt.boundIQR=1.5 Data less than min bound is outlier.
 *      default 1.5, means Q1 - 1.5 * (Q3 - Q1).
 *      If 'none'/0 passed, min bound will not be used.
 */
export default function prepareBoxplotData(
    rawData: number[][],
    opt: PrepareBoxplotDataOpt
): {
    boxData: (number | string)[][];
    outliers: (number | string)[][];
} {
    opt = opt || {};
    const boxData = [];
    const outliers = [];
    const boundIQR = opt.boundIQR;
    const useExtreme = boundIQR === 'none' || boundIQR === 0;

    for (let i = 0; i < rawData.length; i++) {
        const ascList = asc(rawData[i].slice());

        const Q1 = quantile(ascList, 0.25);
        const Q2 = quantile(ascList, 0.5);
        const Q3 = quantile(ascList, 0.75);
        const min = ascList[0];
        const max = ascList[ascList.length - 1];

        const bound = (boundIQR == null ? 1.5 : boundIQR as number) * (Q3 - Q1);

        const low = useExtreme
            ? min
            : Math.max(min, Q1 - bound);
        const high = useExtreme
            ? max
            : Math.min(max, Q3 + bound);

        const itemNameFormatter = opt.itemNameFormatter;
        const itemName = isFunction(itemNameFormatter)
            ? itemNameFormatter({ value: i })
            : isString(itemNameFormatter)
            ? itemNameFormatter.replace('{value}', i + '')
            : i + '';

        boxData.push([itemName, low, Q1, Q2, Q3, high]);

        for (let j = 0; j < ascList.length; j++) {
            const dataItem = ascList[j];
            if (dataItem < low || dataItem > high) {
                const outlier = [itemName, dataItem];
                outliers.push(outlier);
            }
        }
    }
    return {
        boxData: boxData,
        outliers: outliers
    };
}

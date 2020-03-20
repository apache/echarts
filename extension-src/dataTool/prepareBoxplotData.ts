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

// @ts-nocheck
import * as numberUtil from '../../src/util/number';

/**
 * See:
 *  <https://en.wikipedia.org/wiki/Box_plot#cite_note-frigge_hoaglin_iglewicz-2>
 *  <http://stat.ethz.ch/R-manual/R-devel/library/grDevices/html/boxplot.stats.html>
 *
 * Helper method for preparing data.
 *
 * @param {Array.<number>} rawData like
 *        [
 *            [12,232,443], (raw data set for the first box)
 *            [3843,5545,1232], (raw datat set for the second box)
 *            ...
 *        ]
 * @param {Object} [opt]
 *
 * @param {(number|string)} [opt.boundIQR=1.5] Data less than min bound is outlier.
 *      default 1.5, means Q1 - 1.5 * (Q3 - Q1).
 *      If 'none'/0 passed, min bound will not be used.
 * @param {(number|string)} [opt.layout='horizontal']
 *      Box plot layout, can be 'horizontal' or 'vertical'
 * @return {Object} {
 *      boxData: Array.<Array.<number>>
 *      outliers: Array.<Array.<number>>
 *      axisData: Array.<string>
 * }
 */
export default function (rawData, opt) {
    opt = opt || [];
    let boxData = [];
    let outliers = [];
    let axisData = [];
    let boundIQR = opt.boundIQR;
    let useExtreme = boundIQR === 'none' || boundIQR === 0;

    for (let i = 0; i < rawData.length; i++) {
        axisData.push(i + '');
        let ascList = numberUtil.asc(rawData[i].slice());

        let Q1 = numberUtil.quantile(ascList, 0.25);
        let Q2 = numberUtil.quantile(ascList, 0.5);
        let Q3 = numberUtil.quantile(ascList, 0.75);
        let min = ascList[0];
        let max = ascList[ascList.length - 1];

        let bound = (boundIQR == null ? 1.5 : boundIQR) * (Q3 - Q1);

        let low = useExtreme
            ? min
            : Math.max(min, Q1 - bound);
        let high = useExtreme
            ? max
            : Math.min(max, Q3 + bound);

        boxData.push([low, Q1, Q2, Q3, high]);

        for (let j = 0; j < ascList.length; j++) {
            let dataItem = ascList[j];
            if (dataItem < low || dataItem > high) {
                let outlier = [i, dataItem];
                opt.layout === 'vertical' && outlier.reverse();
                outliers.push(outlier);
            }
        }
    }
    return {
        boxData: boxData,
        outliers: outliers,
        axisData: axisData
    };
}

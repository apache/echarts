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
import * as modelUtil from '../../util/model';
import { ECUnitOption, SeriesOption } from '../../util/types';
import { ParallelAxisOption } from './AxisModel';
import { ParallelSeriesOption } from '../../chart/parallel/ParallelSeries';

export default function parallelPreprocessor(option: ECUnitOption): void {
    createParallelIfNeeded(option);
    mergeAxisOptionFromParallel(option);
}

/**
 * Create a parallel coordinate if not exists.
 * @inner
 */
function createParallelIfNeeded(option: ECUnitOption): void {
    if (option.parallel) {
        return;
    }

    let hasParallelSeries = false;

    zrUtil.each(option.series, function (seriesOpt: SeriesOption) {
        if (seriesOpt && seriesOpt.type === 'parallel') {
            hasParallelSeries = true;
        }
    });

    if (hasParallelSeries) {
        option.parallel = [{}];
    }
}

/**
 * Merge aixs definition from parallel option (if exists) to axis option.
 * @inner
 */
function mergeAxisOptionFromParallel(option: ECUnitOption): void {
    const axes = modelUtil.normalizeToArray(option.parallelAxis) as ParallelAxisOption[];

    zrUtil.each(axes, function (axisOption) {
        if (!zrUtil.isObject(axisOption)) {
            return;
        }

        const parallelIndex = axisOption.parallelIndex || 0;
        const parallelOption = modelUtil.normalizeToArray(option.parallel)[parallelIndex] as ParallelSeriesOption;

        if (parallelOption && parallelOption.parallelAxisDefault) {
            zrUtil.merge(axisOption, parallelOption.parallelAxisDefault, false);
        }
    });
}

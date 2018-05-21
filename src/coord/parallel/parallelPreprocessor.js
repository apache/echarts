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

export default function (option) {
    createParallelIfNeeded(option);
    mergeAxisOptionFromParallel(option);
}

/**
 * Create a parallel coordinate if not exists.
 * @inner
 */
function createParallelIfNeeded(option) {
    if (option.parallel) {
        return;
    }

    var hasParallelSeries = false;

    zrUtil.each(option.series, function (seriesOpt) {
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
function mergeAxisOptionFromParallel(option) {
    var axes = modelUtil.normalizeToArray(option.parallelAxis);

    zrUtil.each(axes, function (axisOption) {
        if (!zrUtil.isObject(axisOption)) {
            return;
        }

        var parallelIndex = axisOption.parallelIndex || 0;
        var parallelOption = modelUtil.normalizeToArray(option.parallel)[parallelIndex];

        if (parallelOption && parallelOption.parallelAxisDefault) {
            zrUtil.merge(axisOption, parallelOption.parallelAxisDefault, false);
        }
    });
}

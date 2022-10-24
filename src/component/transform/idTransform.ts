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

import { DataTransformOption, ExternalDataTransform } from '../../data/helper/transform';
import {
    DimensionDefinitionLoose,
    DimensionIndex,
    DimensionName,
    OptionSourceDataArrayRows
} from '../../util/types';


/**
 * @usage
 *
 * ```js
 * dataset: [{
 *     source: [
 *         ['aa', 'bb', 'cc', 'tag'],
 *         [12, 0.33, 5200, 'AA'],
 *         [21, 0.65, 8100, 'AA'],
 *         ...
 *     ]
 * }, {
 *     transform: {
 *         type: 'ecSimpleTransform:id',
 *         config: {
 *             dimensionIndex: 4,
 *             dimensionName: 'ID'
 *         }
 *     }
 *     // Then the result data will be:
 *     // [
 *     //     ['aa', 'bb', 'cc', 'tag', 'ID'],
 *     //     [12, 0.33, 5200, 'AA', 0],
 *     //     [21, 0.65, 8100, 'BB', 1],
 *     //     ...
 *     // ]
 * }]
 * ```
 */

export interface IdTransformOption extends DataTransformOption {
    type: 'echarts:id';
    config: {
        // Mandatory. Specify where to put the new id dimension.
        dimensionIndex: DimensionIndex;
        // Optional. If not provided, left the dimension name not defined.
        dimensionName: DimensionName;
    };
}

export const idTransform: ExternalDataTransform<IdTransformOption> = {

    type: 'echarts:id',

    transform: function (params) {
        const {upstream, config} = params;
        const {dimensionIndex, dimensionName} = config;

        const dimensions = upstream.cloneAllDimensionInfo() as DimensionDefinitionLoose[];
        dimensions[dimensionIndex] = dimensionName;

        const data = upstream.cloneRawData() as OptionSourceDataArrayRows;

        // TODO: support objectRows
        for (let i = 0, len = data.length; i < len; i++) {
            const line = data[i];
            line[dimensionIndex] = i;
        }

        return {
            dimensions,
            data
        };
    }
};
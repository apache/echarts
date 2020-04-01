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

import * as echarts from '../../echarts';
import GlobalModel from '../../model/Global';
import { Payload } from '../../util/types';
import BrushModel, { BrushAreaParam } from './BrushModel';

interface BrushPayload extends Payload {
    // If "areas" is empty, all of the select-boxes will be deleted
    areas?: BrushAreaParam[];
}

echarts.registerAction(
    {type: 'brush', event: 'brush', update: 'updateVisual' },
    function (payload: BrushPayload, ecModel: GlobalModel) {
        ecModel.eachComponent(
            {mainType: 'brush', query: payload},
            function (brushModel: BrushModel) {
                brushModel.setAreas(payload.areas);
            }
        );
    }
);

/**
 * payload: {
 *      brushComponents: [
 *          {
 *              brushId,
 *              brushIndex,
 *              brushName,
 *              series: [
 *                  {
 *                      seriesId,
 *                      seriesIndex,
 *                      seriesName,
 *                      rawIndices: [21, 34, ...]
 *                  },
 *                  ...
 *              ]
 *          },
 *          ...
 *      ]
 * }
 */
echarts.registerAction(
    {type: 'brushSelect', event: 'brushSelected', update: 'none'},
    function () {}
);

echarts.registerAction(
    {type: 'brushEnd', event: 'brushEnd', update: 'none'},
    function () {}
);

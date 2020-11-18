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

import {makeInner} from '../../util/model';
import SeriesModel from '../../model/Series';
import { StageHandlerPlanReturn } from '../../util/types';

/**
 * @return {string} If large mode changed, return string 'reset';
 */
export default function createRenderPlanner() {
    const inner = makeInner<{
        large: boolean
        progressiveRender: boolean
    }, SeriesModel>();

    return function (seriesModel: SeriesModel): StageHandlerPlanReturn {
        const fields = inner(seriesModel);
        const pipelineContext = seriesModel.pipelineContext;

        const originalLarge = !!fields.large;
        const originalProgressive = !!fields.progressiveRender;

        // FIXME: if the planner works on a filtered series, `pipelineContext` does not
        // exists. See #11611 . Probably we need to modify this structure, see the comment
        // on `performRawSeries` in `Schedular.js`.
        const large = fields.large = !!(pipelineContext && pipelineContext.large);
        const progressive = fields.progressiveRender = !!(pipelineContext && pipelineContext.progressiveRender);

        return (
            !!((originalLarge !== large) || (originalProgressive !== progressive)) && 'reset'
        ) as StageHandlerPlanReturn;
    };
}

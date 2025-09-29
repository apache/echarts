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
import * as visualSolution from '../../visual/visualSolution';
import VisualMapping from '../../visual/VisualMapping';
import VisualMapModel, { VisualMeta } from './VisualMapModel';
import { StageHandlerProgressExecutor, BuiltinVisualProperty, ParsedValue, StageHandler } from '../../util/types';
import SeriesModel from '../../model/Series';
import { getVisualFromData } from '../../visual/helper';

export const visualMapEncodingHandlers: StageHandler[] = [
    {
        createOnAllSeries: true,
        reset: function (seriesModel, ecModel) {
            const resetDefines: StageHandlerProgressExecutor[] = [];
            ecModel.eachComponent('visualMap', function (visualMapModel: VisualMapModel) {
                const pipelineContext = seriesModel.pipelineContext;
                if (!visualMapModel.isTargetSeries(seriesModel)
                    || (pipelineContext && pipelineContext.large)
                ) {
                    return;
                }

                resetDefines.push(visualSolution.incrementalApplyVisual(
                    visualMapModel.stateList,
                    visualMapModel.targetVisuals,
                    zrUtil.bind(visualMapModel.getValueState, visualMapModel),
                    visualMapModel.getDataDimensionIndex(seriesModel.getData())
                ));
            });

            return resetDefines;
        }
    },
    // Only support color.
    {
        createOnAllSeries: true,
        reset: function (seriesModel, ecModel) {
            const data = seriesModel.getData();
            const visualMetaList: VisualMeta[] = [];

            ecModel.eachComponent('visualMap', function (visualMapModel: VisualMapModel) {
                if (visualMapModel.isTargetSeries(seriesModel)) {
                    const visualMeta = visualMapModel.getVisualMeta(
                        zrUtil.bind(getColorVisual, null, seriesModel, visualMapModel)
                    ) || {
                        stops: [],
                        outerColors: []
                    } as VisualMeta;

                    const dimIdx = visualMapModel.getDataDimensionIndex(data);
                    if (dimIdx >= 0) {
                        // visualMeta.dimension should be dimension index, but not concrete dimension.
                        visualMeta.dimension = dimIdx;
                        visualMetaList.push(visualMeta);
                    }
                }
            });

            // console.log(JSON.stringify(visualMetaList.map(a => a.stops)));
            seriesModel.getData().setVisual('visualMeta', visualMetaList);
        }
    }
];

// FIXME
// performance and export for heatmap?
// value can be Infinity or -Infinity
function getColorVisual(
    seriesModel: SeriesModel,
    visualMapModel: VisualMapModel,
    value: ParsedValue,
    valueState: VisualMapModel['stateList'][number]
) {
    const mappings = visualMapModel.targetVisuals[valueState];
    const visualTypes = VisualMapping.prepareVisualTypes(mappings);
    const resultVisual: Partial<Record<BuiltinVisualProperty, any>> = {
        color: getVisualFromData(seriesModel.getData(), 'color') // default color.
    };

    for (let i = 0, len = visualTypes.length; i < len; i++) {
        const type = visualTypes[i];
        const mapping = mappings[
            (type === 'opacity' ? '__alphaForOpacity' : type) as BuiltinVisualProperty
        ];
        mapping && mapping.applyVisual(value, getVisual, setVisual);
    }

    return resultVisual.color;

    function getVisual(key: BuiltinVisualProperty) {
        return resultVisual[key];
    }

    function setVisual(key: BuiltinVisualProperty, value: any) {
        resultVisual[key] = value;
    }
}

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

import type ScatterSeriesModel from './ScatterSeries';
import { needFixJitter, fixJitter } from '../../util/jitter';
import type SingleAxis from '../../coord/single/SingleAxis';
import type Axis2D from '../../coord/cartesian/Axis2D';
import type SeriesData from '../../data/SeriesData';
import type { StageHandler } from '../../util/types';
import createRenderPlanner from '../helper/createRenderPlanner';

export default function jitterLayout(): StageHandler {
    return {
        seriesType: 'scatter',

        plan: createRenderPlanner(),

        reset(seriesModel: ScatterSeriesModel) {
            const coordSys = seriesModel.coordinateSystem;
            if (!coordSys || (coordSys.type !== 'cartesian2d' && coordSys.type !== 'single')) {
                return;
            }
            const baseAxis = coordSys.getBaseAxis && coordSys.getBaseAxis() as Axis2D | SingleAxis;
            const hasJitter = baseAxis && needFixJitter(seriesModel, baseAxis);
            if (!hasJitter) {
                return;
            }

            const dim = baseAxis.dim;
            const orient = (baseAxis as SingleAxis).orient;
            const isSingleY = orient === 'horizontal' && baseAxis.type !== 'category'
                || orient === 'vertical' && baseAxis.type === 'category';

            return {
                progress(params, data: SeriesData): void {
                    const points = data.getLayout('points') as number[] | Float32Array;
                    const chunkPointCount = (params.end - params.start) * 2;
                    const hasPoints = !!points && points.length >= chunkPointCount;

                    for (let i = params.start; i < params.end; i++) {
                        const offset = hasPoints ? (i - params.start) * 2 : -1;
                        const layout = hasPoints ? [points[offset], points[offset + 1]] : data.getItemLayout(i);
                        if (!layout) {
                            continue;
                        }

                        const rawSize = data.getItemVisual(i, 'symbolSize');
                        const size = rawSize instanceof Array ? (rawSize[1] + rawSize[0]) / 2 : rawSize;

                        if (dim === 'y' || (dim === 'single' && isSingleY)) {
                            // x is fixed, and y is floating
                            const jittered = fixJitter(
                                baseAxis,
                                layout[0],
                                layout[1],
                                size / 2
                            );
                            if (hasPoints) {
                                points[offset + 1] = jittered;
                            }
                            else {
                                data.setItemLayout(i, [layout[0], jittered]);
                            }
                        }
                        else if (dim === 'x' || (dim === 'single' && !isSingleY)) {
                            // y is fixed, and x is floating
                            const jittered = fixJitter(
                                baseAxis,
                                layout[1],
                                layout[0],
                                size / 2
                            );
                            if (hasPoints) {
                                points[offset] = jittered;
                            }
                            else {
                                data.setItemLayout(i, [jittered, layout[1]]);
                            }
                        }
                    }
                }
            };
        }
    };
}

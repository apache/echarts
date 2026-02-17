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

            const jitterOnY = dim === 'y' || (dim === 'single' && isSingleY);
            const jitterOnX = dim === 'x' || (dim === 'single' && !isSingleY);
            if (!jitterOnY && !jitterOnX) {
                return;
            }

            return {
                progress(params, data): void {
                    const points = data.getLayout('points') as Float32Array;
                    const hasPoints = !!points;

                    for (let i = params.start; i < params.end; i++) {
                        const offset = hasPoints ? (i - params.start) * 2 : -1;
                        const layout = hasPoints ? [points[offset], points[offset + 1]] : data.getItemLayout(i);
                        if (!layout) {
                            continue;
                        }

                        const rawSize = data.getItemVisual(i, 'symbolSize');
                        const size = rawSize instanceof Array ? (rawSize[1] + rawSize[0]) / 2 : rawSize;

                        if (jitterOnY) {
                            // x is fixed, and y is floating
                            const jittered = fixJitter(baseAxis, layout[0], layout[1], size / 2);
                            if (hasPoints) {
                                points[offset + 1] = jittered;
                            }
                            else {
                                layout[1] = jittered;
                            }
                        }
                        else if (jitterOnX) {
                            // y is fixed, and x is floating
                            const jittered = fixJitter(baseAxis, layout[1], layout[0], size / 2);
                            if (hasPoints) {
                                points[offset] = jittered;
                            }
                            else {
                                layout[0] = jittered;
                            }
                        }
                    }
                }
            };
        }
    };
}

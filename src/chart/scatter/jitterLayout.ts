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
import { COORD_SYS_TYPE_CARTESIAN_2D } from '../../coord/cartesian/GridModel';
import { COORD_SYS_TYPE_SINGLE } from '../../coord/single/AxisModel';
import { validateUpstreamOutputRange } from '../../util/model';
import type { AxisBaseModel } from '../../coord/AxisBaseModel';
import { isString, reduce } from 'zrender/src/core/util';

const DEFAULT_JITTER_SEED = 'echarts-jitter';
const DEFAULT_JITTER_RNG = createRNG(DEFAULT_JITTER_SEED);

/**
 * Mulberry32 RNG
 */
function createRNG(seed: string | number) {
    let state = isString(seed)
        ? reduce(seed.split(''), (h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0)
        : (Number(seed) | 0);
    return function () {
        let t = state += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export default function jitterLayout(): StageHandler {
    return {
        seriesType: 'scatter',

        plan: createRenderPlanner(),

        reset(seriesModel: ScatterSeriesModel) {
            const coordSys = seriesModel.coordinateSystem;
            if (!coordSys || (
                coordSys.type !== COORD_SYS_TYPE_CARTESIAN_2D
                && coordSys.type !== COORD_SYS_TYPE_SINGLE
            )) {
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

            const baseAxisModel = baseAxis.model as AxisBaseModel;
            let jitterRng = baseAxisModel.get('jitterRng');
            if (!jitterRng) {
                const jitterSeed = baseAxisModel.get('jitterSeed');

                jitterRng = jitterSeed == null || jitterSeed === DEFAULT_JITTER_SEED
                    ? DEFAULT_JITTER_RNG
                    : createRNG(jitterSeed);
            }
            return {
                progress(params, data): void {
                    const points = data.getLayout('points') as Float32Array;
                    const hasPoints = !!points;

                    if (__DEV__) {
                        hasPoints && validateUpstreamOutputRange(data.getLayout('pointsRange'), params);
                    }

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
                            const jittered = fixJitter(baseAxis, layout[0], layout[1], size / 2, jitterRng);
                            if (hasPoints) {
                                points[offset + 1] = jittered;
                            }
                            else {
                                layout[1] = jittered;
                            }
                        }
                        else if (jitterOnX) {
                            // y is fixed, and x is floating
                            const jittered = fixJitter(baseAxis, layout[1], layout[0], size / 2, jitterRng);
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

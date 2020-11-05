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

/* global Float32Array */

import {map} from 'zrender/src/core/util';
import createRenderPlanner from '../chart/helper/createRenderPlanner';
import {isDimensionStacked} from '../data/helper/dataStackHelper';
import SeriesModel from '../model/Series';
import { StageHandler, ParsedValueNumeric } from '../util/types';
import { createFloat32Array } from '../util/vendor';


export default function pointsLayout(seriesType: string, forceStoreInTypedArray?: boolean): StageHandler {
    return {
        seriesType: seriesType,

        plan: createRenderPlanner(),

        reset: function (seriesModel: SeriesModel) {
            const data = seriesModel.getData();
            const coordSys = seriesModel.coordinateSystem;
            const pipelineContext = seriesModel.pipelineContext;
            const useTypedArray = forceStoreInTypedArray || pipelineContext.large;

            if (!coordSys) {
                return;
            }

            const dims = map(coordSys.dimensions, function (dim) {
                return data.mapDimension(dim);
            }).slice(0, 2);
            const dimLen = dims.length;

            const stackResultDim = data.getCalculationInfo('stackResultDimension');
            if (isDimensionStacked(data, dims[0] /*, dims[1]*/)) {
                dims[0] = stackResultDim;
            }
            if (isDimensionStacked(data, dims[1] /*, dims[0]*/)) {
                dims[1] = stackResultDim;
            }

            const dimInfo0 = data.getDimensionInfo(dims[0]);
            const dimInfo1 = data.getDimensionInfo(dims[1]);

            const dimIdx0 = dimInfo0 && dimInfo0.index;
            const dimIdx1 = dimInfo1 && dimInfo1.index;

            return dimLen && {
                progress(params, data) {
                    const segCount = params.end - params.start;
                    const points = useTypedArray && createFloat32Array(segCount * dimLen);

                    const tmpIn: ParsedValueNumeric[] = [];
                    const tmpOut: number[] = [];

                    for (let i = params.start, offset = 0; i < params.end; i++) {
                        let point;

                        if (dimLen === 1) {
                            const x = data.getByDimIdx(dimIdx0, i) as ParsedValueNumeric;
                            // NOTE: Make sure the second parameter is null to use default strategy.
                            point = coordSys.dataToPoint(x, null, tmpOut);
                        }
                        else {
                            tmpIn[0] = data.getByDimIdx(dimIdx0, i) as ParsedValueNumeric;
                            tmpIn[1] = data.getByDimIdx(dimIdx1, i) as ParsedValueNumeric;
                            // Let coordinate system to handle the NaN data.
                            point = coordSys.dataToPoint(tmpIn, null, tmpOut);
                        }

                        if (useTypedArray) {
                            points[offset++] = point[0];
                            points[offset++] = point[1];
                        }
                        else {
                            data.setItemLayout(i, point.slice());
                        }
                    }

                    useTypedArray && data.setLayout('points', points);
                }
            };
        }
    };
};

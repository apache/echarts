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


export default function (seriesType: string, forceStoreInTypedArray?: boolean): StageHandler {
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


            return dimLen && {
                progress(params, data) {
                    const segCount = params.end - params.start;
                    const points = useTypedArray && createFloat32Array(segCount * dimLen);

                    const tmpIn: ParsedValueNumeric[] = [];
                    const tmpOut: number[] = [];
                    for (let i = params.start, offset = 0; i < params.end; i++) {
                        let point;

                        if (dimLen === 1) {
                            const x = data.get(dims[0], i) as ParsedValueNumeric;
                            point = !isNaN(x) && coordSys.dataToPoint(x, null, tmpOut);
                        }
                        else {
                            const x = tmpIn[0] = data.get(dims[0], i) as ParsedValueNumeric;
                            const y = tmpIn[1] = data.get(dims[1], i) as ParsedValueNumeric;
                            // Also {Array.<number>}, not undefined to avoid if...else... statement
                            point = !isNaN(x) && !isNaN(y) && coordSys.dataToPoint(tmpIn, null, tmpOut);
                        }

                        if (useTypedArray) {
                            points[offset++] = point ? point[0] : NaN;
                            points[offset++] = point ? point[1] : NaN;
                        }
                        else {
                            data.setItemLayout(i, (point && point.slice()) || [NaN, NaN]);
                        }
                    }

                    useTypedArray && data.setLayout('points', points);
                }
            };
        }
    };
};

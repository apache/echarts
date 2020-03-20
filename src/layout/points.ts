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

export default function (seriesType?: string): StageHandler {
    return {
        seriesType: seriesType,

        plan: createRenderPlanner(),

        reset: function (seriesModel: SeriesModel) {
            let data = seriesModel.getData();
            let coordSys = seriesModel.coordinateSystem;
            let pipelineContext = seriesModel.pipelineContext;
            let isLargeRender = pipelineContext.large;

            if (!coordSys) {
                return;
            }

            let dims = map(coordSys.dimensions, function (dim) {
                return data.mapDimension(dim);
            }).slice(0, 2);
            let dimLen = dims.length;

            let stackResultDim = data.getCalculationInfo('stackResultDimension');
            if (isDimensionStacked(data, dims[0] /*, dims[1]*/)) {
                dims[0] = stackResultDim;
            }
            if (isDimensionStacked(data, dims[1] /*, dims[0]*/)) {
                dims[1] = stackResultDim;
            }


            return dimLen && {
                progress(params, data) {
                    let segCount = params.end - params.start;
                    let points = isLargeRender && new Float32Array(segCount * dimLen);

                    let tmpIn: ParsedValueNumeric[] = [];
                    let tmpOut: number[] = [];
                    for (let i = params.start, offset = 0; i < params.end; i++) {
                        let point;

                        if (dimLen === 1) {
                            let x = data.get(dims[0], i) as ParsedValueNumeric;
                            point = !isNaN(x) && coordSys.dataToPoint(x, null, tmpOut);
                        }
                        else {
                            let x = tmpIn[0] = data.get(dims[0], i) as ParsedValueNumeric;
                            let y = tmpIn[1] = data.get(dims[1], i) as ParsedValueNumeric;
                            // Also {Array.<number>}, not undefined to avoid if...else... statement
                            point = !isNaN(x) && !isNaN(y) && coordSys.dataToPoint(tmpIn, null, tmpOut);
                        }

                        if (isLargeRender) {
                            points[offset++] = point ? point[0] : NaN;
                            points[offset++] = point ? point[1] : NaN;
                        }
                        else {
                            data.setItemLayout(i, (point && point.slice()) || [NaN, NaN]);
                        }
                    }

                    isLargeRender && data.setLayout('symbolPoints', points);
                }
            };
        }
    };
};

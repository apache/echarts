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

import createRenderPlanner from '../helper/createRenderPlanner';
import { StageHandler } from '../../util/types';
import LinesSeriesModel, {LinesDataItemOption} from './LinesSeries';

const linesLayout: StageHandler = {
    seriesType: 'lines',

    plan: createRenderPlanner(),

    reset: function (seriesModel: LinesSeriesModel) {
        const coordSys = seriesModel.coordinateSystem;
        const isPolyline = seriesModel.get('polyline');
        const isLarge = seriesModel.pipelineContext.large;
        return {
            progress(params, lineData) {
                const lineCoords: number[][] = [];
                if (isLarge) {
                    let points;
                    const segCount = params.end - params.start;
                    if (isPolyline) {
                        let totalCoordsCount = 0;
                        for (let i = params.start; i < params.end; i++) {
                            totalCoordsCount += seriesModel.getLineCoordsCount(i);
                        }
                        points = new Float32Array(segCount + totalCoordsCount * 2);
                    }
                    else {
                        points = new Float32Array(segCount * 4);
                    }

                    let offset = 0;
                    let pt: number[] = [];
                    for (let i = params.start; i < params.end; i++) {
                        const len = seriesModel.getLineCoords(i, lineCoords);
                        if (isPolyline) {
                            points[offset++] = len;
                        }
                        for (let k = 0; k < len; k++) {
                            pt = coordSys.dataToPoint(lineCoords[k], false, pt);
                            points[offset++] = pt[0];
                            points[offset++] = pt[1];
                        }
                    }

                    lineData.setLayout('linesPoints', points);
                }
                else {
                    for (let i = params.start; i < params.end; i++) {
                        const itemModel = lineData.getItemModel<LinesDataItemOption>(i);
                        const len = seriesModel.getLineCoords(i, lineCoords);

                        const pts = [];
                        if (isPolyline) {
                            for (let j = 0; j < len; j++) {
                                pts.push(coordSys.dataToPoint(lineCoords[j]));
                            }
                        }
                        else {
                            pts[0] = coordSys.dataToPoint(lineCoords[0]);
                            pts[1] = coordSys.dataToPoint(lineCoords[1]);

                            const curveness = itemModel.get(['lineStyle', 'curveness']);
                            if (+curveness) {
                                pts[2] = [
                                    (pts[0][0] + pts[1][0]) / 2 - (pts[0][1] - pts[1][1]) * curveness,
                                    (pts[0][1] + pts[1][1]) / 2 - (pts[1][0] - pts[0][0]) * curveness
                                ];
                            }
                        }
                        lineData.setItemLayout(i, pts);
                    }
                }
            }
        };
    }
};

export default linesLayout;
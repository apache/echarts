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

import type GlobalModel from '../../model/Global';
import type ScatterSeriesModel from './ScatterSeries';
import { needFixJitter, fixJitter } from '../../util/jitter';
import type SingleAxis from '../../coord/single/SingleAxis';
import type Axis2D from '../../coord/cartesian/Axis2D';

export default function jitterLayout(ecModel: GlobalModel) {
    ecModel.eachSeriesByType('scatter', function (seriesModel: ScatterSeriesModel) {
        const coordSys = seriesModel.coordinateSystem;
        if (coordSys
            && (coordSys.type === 'cartesian2d' || coordSys.type === 'single')) {
            const baseAxis = coordSys.getBaseAxis ? coordSys.getBaseAxis() : null;
            const hasJitter = baseAxis && needFixJitter(seriesModel, baseAxis);

            if (hasJitter) {
                const data = seriesModel.getData();
                data.each(function (idx) {
                    const dim = baseAxis.dim;
                    const orient = (baseAxis as SingleAxis).orient;
                    const isSingleY = orient === 'horizontal' && baseAxis.type !== 'category'
                        || orient === 'vertical' && baseAxis.type === 'category';
                    const layout = data.getItemLayout(idx);
                    const rawSize = data.getItemVisual(idx, 'symbolSize');
                    const size = rawSize instanceof Array ? (rawSize[1] + rawSize[0]) / 2 : rawSize;

                    if (dim === 'y' || dim === 'single' && isSingleY) {
                        // x is fixed, and y is floating
                        const jittered = fixJitter(
                            baseAxis as Axis2D | SingleAxis,
                            layout[0],
                            layout[1],
                            size / 2
                        );
                        data.setItemLayout(idx, [layout[0], jittered]);
                    }
                    else if (dim === 'x' || dim === 'single' && !isSingleY) {
                        // y is fixed, and x is floating
                        const jittered = fixJitter(
                            baseAxis as Axis2D | SingleAxis,
                            layout[1],
                            layout[0],
                            size / 2
                        );
                        data.setItemLayout(idx, [jittered, layout[1]]);
                    }
                });
            }
        }
    });
}

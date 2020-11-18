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

import { StageHandler, SeriesOption, SeriesSamplingOptionMixin } from '../util/types';
import { Dictionary } from 'zrender/src/core/types';
import SeriesModel from '../model/Series';


type Sampler = (frame: ArrayLike<number>) => number;
const samplers: Dictionary<Sampler> = {
    average: function (frame) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < frame.length; i++) {
            if (!isNaN(frame[i])) {
                sum += frame[i];
                count++;
            }
        }
        // Return NaN if count is 0
        return count === 0 ? NaN : sum / count;
    },
    sum: function (frame) {
        let sum = 0;
        for (let i = 0; i < frame.length; i++) {
            // Ignore NaN
            sum += frame[i] || 0;
        }
        return sum;
    },
    max: function (frame) {
        let max = -Infinity;
        for (let i = 0; i < frame.length; i++) {
            frame[i] > max && (max = frame[i]);
        }
        // NaN will cause illegal axis extent.
        return isFinite(max) ? max : NaN;
    },
    min: function (frame) {
        let min = Infinity;
        for (let i = 0; i < frame.length; i++) {
            frame[i] < min && (min = frame[i]);
        }
        // NaN will cause illegal axis extent.
        return isFinite(min) ? min : NaN;
    },
    // TODO
    // Median
    nearest: function (frame) {
        return frame[0];
    }
};

const indexSampler = function (frame: ArrayLike<number>) {
    return Math.round(frame.length / 2);
};

export default function dataSample(seriesType: string): StageHandler {
    return {

        seriesType: seriesType,

        // FIXME:TS never used, so comment it
        // modifyOutputEnd: true,

        reset: function (seriesModel: SeriesModel<SeriesOption & SeriesSamplingOptionMixin>, ecModel, api) {
            const data = seriesModel.getData();
            const sampling = seriesModel.get('sampling');
            const coordSys = seriesModel.coordinateSystem;
            const count = data.count();
            // Only cartesian2d support down sampling. Disable it when there is few data.
            if (count > 10 && coordSys.type === 'cartesian2d' && sampling) {
                const baseAxis = coordSys.getBaseAxis();
                const valueAxis = coordSys.getOtherAxis(baseAxis);
                const extent = baseAxis.getExtent();
                const dpr = api.getDevicePixelRatio();
                // Coordinste system has been resized
                const size = Math.abs(extent[1] - extent[0]) * (dpr || 1);
                const rate = Math.round(count / size);

                if (rate > 1) {
                    if (sampling === 'lttb') {
                        seriesModel.setData(data.lttbDownSample(data.mapDimension(valueAxis.dim), 1 / rate));
                    }
                    let sampler;
                    if (typeof sampling === 'string') {
                        sampler = samplers[sampling];
                    }
                    else if (typeof sampling === 'function') {
                        sampler = sampling;
                    }
                    if (sampler) {
                        // Only support sample the first dim mapped from value axis.
                        seriesModel.setData(data.downSample(
                            data.mapDimension(valueAxis.dim), 1 / rate, sampler, indexSampler
                        ));
                    }
                }
            }
        }
    };
}
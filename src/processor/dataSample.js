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


var samplers = {
    average: function (frame) {
        var sum = 0;
        var count = 0;
        for (var i = 0; i < frame.length; i++) {
            if (!isNaN(frame[i])) {
                sum += frame[i];
                count++;
            }
        }
        // Return NaN if count is 0
        return count === 0 ? NaN : sum / count;
    },
    sum: function (frame) {
        var sum = 0;
        for (var i = 0; i < frame.length; i++) {
            // Ignore NaN
            sum += frame[i] || 0;
        }
        return sum;
    },
    max: function (frame) {
        var max = -Infinity;
        for (var i = 0; i < frame.length; i++) {
            frame[i] > max && (max = frame[i]);
        }
        // NaN will cause illegal axis extent.
        return isFinite(max) ? max : NaN;
    },
    min: function (frame) {
        var min = Infinity;
        for (var i = 0; i < frame.length; i++) {
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

var indexSampler = function (frame, value) {
    return Math.round(frame.length / 2);
};

export default function (seriesType) {
    return {

        seriesType: seriesType,

        modifyOutputEnd: true,

        reset: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var sampling = seriesModel.get('sampling');
            var coordSys = seriesModel.coordinateSystem;
            // Only cartesian2d support down sampling
            if (coordSys.type === 'cartesian2d' && sampling) {
                var baseAxis = coordSys.getBaseAxis();
                var valueAxis = coordSys.getOtherAxis(baseAxis);
                var extent = baseAxis.getExtent();
                // Coordinste system has been resized
                var size = Math.abs(extent[1] - extent[0]);
                var rate = Math.round(data.count() / size);
                if (rate > 1) {
                    var sampler;
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
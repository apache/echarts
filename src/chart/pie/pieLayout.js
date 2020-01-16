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


import {parsePercent, linearMap} from '../../util/number';
import * as layout from '../../util/layout';
import labelLayout from './labelLayout';
import * as zrUtil from 'zrender/src/core/util';

var PI2 = Math.PI * 2;
var RADIAN = Math.PI / 180;

function getViewRect(seriesModel, api) {
    return layout.getLayoutRect(
        seriesModel.getBoxLayoutParams(), {
            width: api.getWidth(),
            height: api.getHeight()
        }
    );
}

export default function (seriesType, ecModel, api, payload) {
    ecModel.eachSeriesByType(seriesType, function (seriesModel) {
        var data = seriesModel.getData();
        var valueDim = data.mapDimension('value');
        var viewRect = getViewRect(seriesModel, api);

        var center = seriesModel.get('center');
        var radius = seriesModel.get('radius');

        if (!zrUtil.isArray(radius)) {
            radius = [0, radius];
        }
        if (!zrUtil.isArray(center)) {
            center = [center, center];
        }

        var width = parsePercent(viewRect.width, api.getWidth());
        var height = parsePercent(viewRect.height, api.getHeight());
        var size = Math.min(width, height);
        var cx = parsePercent(center[0], width) + viewRect.x;
        var cy = parsePercent(center[1], height) + viewRect.y;
        var r0 = parsePercent(radius[0], size / 2);
        var r = parsePercent(radius[1], size / 2);

        var startAngle = -seriesModel.get('startAngle') * RADIAN;

        var minAngle = seriesModel.get('minAngle') * RADIAN;

        var validDataCount = 0;
        data.each(valueDim, function (value) {
            !isNaN(value) && validDataCount++;
        });

        var sum = 0;
        var max = data._rawExtent[1];
        var tempMax = 0;
        var trueValueArray = [];
        var extent = data.getDataExtent(valueDim);

        if(data.hostModel && data.hostModel.option && data.hostModel.option.data && data.hostModel.option.data.length && data.hostModel.option.data.length > 0){
            var dataArray = data.hostModel.option.data;
            for(var i = 0; i < dataArray.length; i++){
                if(dataArray[i].value instanceof Array){
                    tempMax = 0;
                    for(var j = 0; j < dataArray[i].value.length; j++){
                        tempMax += dataArray[i].value[j];
                    }
                    sum += tempMax;
                    if(tempMax > max){
                        extent[1] = tempMax;
                    }
                    trueValueArray.push(tempMax);
                }else{
                    if(!isNaN(dataArray[i].value)){
                        sum += dataArray[i].value;
                        trueValueArray.push(dataArray[i].value);
                    }else{
                        if(!isNaN(dataArray[i])){
                            sum += dataArray[i];
                            trueValueArray.push(dataArray[i]);
                        }
                    }
                }
            }
        }
        extent[0] = 0;

        // Sum may be 0
        var unitRadian = Math.PI / (sum || validDataCount) * 2;

        var clockwise = seriesModel.get('clockwise');

        var roseType = seriesModel.get('roseType');
        var stillShowZeroSum = seriesModel.get('stillShowZeroSum');

        // In the case some sector angle is smaller than minAngle
        var restAngle = PI2;
        var valueSumLargerThanMinAngle = 0;

        var currentAngle = startAngle;
        var dir = clockwise ? 1 : -1;

        data.each(valueDim, function (value, idx) {
            var angle;
            if (isNaN(trueValueArray[idx])) {
                data.setItemLayout(idx, {
                    angle: NaN,
                    startAngle: NaN,
                    endAngle: NaN,
                    clockwise: clockwise,
                    cx: cx,
                    cy: cy,
                    r0: r0,
                    r: roseType
                        ? NaN
                        : r,
                    viewRect: viewRect
                });
                return;
            }

            // FIXME 兼容 2.0 但是 roseType 是 area 的时候才是这样？
            if (roseType !== 'area') {
                angle = (sum === 0 && stillShowZeroSum)
                    ? unitRadian : (trueValueArray[idx] * unitRadian);
            }
            else {
                angle = PI2 / validDataCount;
            }

            if (angle < minAngle) {
                angle = minAngle;
                restAngle -= minAngle;
            }
            else {
                valueSumLargerThanMinAngle += trueValueArray[idx];
            }

            var endAngle = currentAngle + dir * angle;
            data.setItemLayout(idx, {
                angle: angle,
                startAngle: currentAngle,
                endAngle: endAngle,
                clockwise: clockwise,
                cx: cx,
                cy: cy,
                r0: r0,
                r: roseType
                    ? linearMap(trueValueArray[idx], extent, [r0, r])
                    : r
            });

            currentAngle = endAngle;
        });

        // Some sector is constrained by minAngle
        // Rest sectors needs recalculate angle
        if (restAngle < PI2 && validDataCount) {
            // Average the angle if rest angle is not enough after all angles is
            // Constrained by minAngle
            if (restAngle <= 1e-3) {
                var angle = PI2 / validDataCount;
                data.each(valueDim, function (value, idx) {
                    if (!isNaN(trueValueArray[idx])) {
                        var layout = data.getItemLayout(idx);
                        layout.angle = angle;
                        layout.startAngle = startAngle + dir * idx * angle;
                        layout.endAngle = startAngle + dir * (idx + 1) * angle;
                    }
                });
            }
            else {
                unitRadian = restAngle / valueSumLargerThanMinAngle;
                currentAngle = startAngle;
                data.each(valueDim, function (value, idx) {
                    if (!isNaN(trueValueArray[idx])) {
                        var layout = data.getItemLayout(idx);
                        var angle = layout.angle === minAngle
                            ? minAngle : trueValueArray[idx] * unitRadian;
                        layout.startAngle = currentAngle;
                        layout.endAngle = currentAngle + dir * angle;
                        currentAngle += dir * angle;
                    }
                });
            }
        }

        labelLayout(seriesModel, r, viewRect.width, viewRect.height, viewRect.x, viewRect.y);
    });
}

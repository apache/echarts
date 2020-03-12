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

// TODO clockwise

import * as zrUtil from 'zrender/src/core/util';
import IndicatorAxis from './IndicatorAxis';
import IntervalScale from '../../scale/Interval';
import * as numberUtil from '../../util/number';
import {
    getScaleExtent,
    niceScaleExtent
} from '../axisHelper';
import CoordinateSystemManager from '../../CoordinateSystem';
import { CoordinateSystemMaster, CoordinateSystem } from '../CoordinateSystem';
import RadarModel from './RadarModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { ScaleDataValue } from '../../util/types';
import { ParsedModelFinder } from '../../util/model';


class Radar implements CoordinateSystem, CoordinateSystemMaster {

    readonly type: 'radar'
    /**
     *
     * Radar dimensions
     */
    readonly dimensions: string[] = []

    cx: number

    cy: number

    r: number

    r0: number

    startAngle: number

    private _model: RadarModel;

    private _indicatorAxes: IndicatorAxis[];

    constructor(radarModel: RadarModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this._indicatorAxes = zrUtil.map(radarModel.getIndicatorModels(), function (indicatorModel, idx) {
            var dim = 'indicator_' + idx;
            var indicatorAxis = new IndicatorAxis(dim,
                new IntervalScale()
                // (indicatorModel.get('axisType') === 'log') ? new LogScale() : new IntervalScale()
            );
            indicatorAxis.name = indicatorModel.get('name');
            // Inject model and axis
            indicatorAxis.model = indicatorModel;
            indicatorModel.axis = indicatorAxis;
            this.dimensions.push(dim);
            return indicatorAxis;
        }, this);

        this.resize(radarModel, api);
    }

    getIndicatorAxes() {
        return this._indicatorAxes;
    }

    dataToPoint(value: ScaleDataValue, indicatorIndex: number) {
        var indicatorAxis = this._indicatorAxes[indicatorIndex];

        return this.coordToPoint(indicatorAxis.dataToCoord(value), indicatorIndex);
    }

    // TODO: API should be coordToPoint([coord, indicatorIndex])
    coordToPoint(coord: number, indicatorIndex: number) {
        var indicatorAxis = this._indicatorAxes[indicatorIndex];
        var angle = indicatorAxis.angle;
        var x = this.cx + coord * Math.cos(angle);
        var y = this.cy - coord * Math.sin(angle);
        return [x, y];
    }

    pointToData(pt: number[]) {
        var dx = pt[0] - this.cx;
        var dy = pt[1] - this.cy;
        var radius = Math.sqrt(dx * dx + dy * dy);
        dx /= radius;
        dy /= radius;

        var radian = Math.atan2(-dy, dx);

        // Find the closest angle
        // FIXME index can calculated directly
        var minRadianDiff = Infinity;
        var closestAxis;
        var closestAxisIdx = -1;
        for (var i = 0; i < this._indicatorAxes.length; i++) {
            var indicatorAxis = this._indicatorAxes[i];
            var diff = Math.abs(radian - indicatorAxis.angle);
            if (diff < minRadianDiff) {
                closestAxis = indicatorAxis;
                closestAxisIdx = i;
                minRadianDiff = diff;
            }
        }

        return [closestAxisIdx, +(closestAxis && closestAxis.coordToData(radius))];
    }

    resize(radarModel: RadarModel, api: ExtensionAPI) {
        var center = radarModel.get('center');
        var viewWidth = api.getWidth();
        var viewHeight = api.getHeight();
        var viewSize = Math.min(viewWidth, viewHeight) / 2;
        this.cx = numberUtil.parsePercent(center[0], viewWidth);
        this.cy = numberUtil.parsePercent(center[1], viewHeight);

        this.startAngle = radarModel.get('startAngle') * Math.PI / 180;

        // radius may be single value like `20`, `'80%'`, or array like `[10, '80%']`
        var radius = radarModel.get('radius');
        if (typeof radius === 'string' || typeof radius === 'number') {
            radius = [0, radius];
        }
        this.r0 = numberUtil.parsePercent(radius[0], viewSize);
        this.r = numberUtil.parsePercent(radius[1], viewSize);

        zrUtil.each(this._indicatorAxes, function (indicatorAxis, idx) {
            indicatorAxis.setExtent(this.r0, this.r);
            var angle = (this.startAngle + idx * Math.PI * 2 / this._indicatorAxes.length);
            // Normalize to [-PI, PI]
            angle = Math.atan2(Math.sin(angle), Math.cos(angle));
            indicatorAxis.angle = angle;
        }, this);
    }

    update(ecModel: GlobalModel, api: ExtensionAPI) {
        var indicatorAxes = this._indicatorAxes;
        var radarModel = this._model;
        zrUtil.each(indicatorAxes, function (indicatorAxis) {
            indicatorAxis.scale.setExtent(Infinity, -Infinity);
        });
        ecModel.eachSeriesByType('radar', function (radarSeries, idx) {
            if (radarSeries.get('coordinateSystem') !== 'radar'
                // @ts-ignore
                || ecModel.getComponent('radar', radarSeries.get('radarIndex')) !== radarModel
            ) {
                return;
            }
            var data = radarSeries.getData();
            zrUtil.each(indicatorAxes, function (indicatorAxis) {
                indicatorAxis.scale.unionExtentFromData(data, data.mapDimension(indicatorAxis.dim));
            });
        }, this);

        var splitNumber = radarModel.get('splitNumber');

        function increaseInterval(interval: number) {
            var exp10 = Math.pow(10, Math.floor(Math.log(interval) / Math.LN10));
            // Increase interval
            var f = interval / exp10;
            if (f === 2) {
                f = 5;
            }
            else { // f is 2 or 5
                f *= 2;
            }
            return f * exp10;
        }
        // Force all the axis fixing the maxSplitNumber.
        zrUtil.each(indicatorAxes, function (indicatorAxis, idx) {
            var rawExtent = getScaleExtent(indicatorAxis.scale, indicatorAxis.model);
            niceScaleExtent(indicatorAxis.scale, indicatorAxis.model);

            var axisModel = indicatorAxis.model;
            var scale = indicatorAxis.scale as IntervalScale;
            var fixedMin = axisModel.getMin() as number;
            var fixedMax = axisModel.getMax() as number;
            var interval = scale.getInterval();

            if (fixedMin != null && fixedMax != null) {
                // User set min, max, divide to get new interval
                scale.setExtent(+fixedMin, +fixedMax);
                scale.setInterval(
                    (fixedMax - fixedMin) / splitNumber
                );
            }
            else if (fixedMin != null) {
                var max;
                // User set min, expand extent on the other side
                do {
                    max = fixedMin + interval * splitNumber;
                    scale.setExtent(+fixedMin, max);
                    // Interval must been set after extent
                    // FIXME
                    scale.setInterval(interval);

                    interval = increaseInterval(interval);
                } while (max < rawExtent[1] && isFinite(max) && isFinite(rawExtent[1]));
            }
            else if (fixedMax != null) {
                var min;
                // User set min, expand extent on the other side
                do {
                    min = fixedMax - interval * splitNumber;
                    scale.setExtent(min, +fixedMax);
                    scale.setInterval(interval);
                    interval = increaseInterval(interval);
                } while (min > rawExtent[0] && isFinite(min) && isFinite(rawExtent[0]));
            }
            else {
                var nicedSplitNumber = scale.getTicks().length - 1;
                if (nicedSplitNumber > splitNumber) {
                    interval = increaseInterval(interval);
                }
                // PENDING
                var center = Math.ceil((rawExtent[0] + rawExtent[1]) / 2 / interval) * interval;
                var halfSplitNumber = Math.round(splitNumber / 2);
                scale.setExtent(
                    numberUtil.round(center - halfSplitNumber * interval),
                    numberUtil.round(center + (splitNumber - halfSplitNumber) * interval)
                );
                scale.setInterval(interval);
            }
        });
    }

    convertToPixel(ecModel: GlobalModel, finder: ParsedModelFinder, value: ScaleDataValue[]): never {
        console.warn('Not implemented.');
        return null as never;
    }
    convertFromPixel(ecModel: GlobalModel, finder: ParsedModelFinder, pixel: number[]): never {
        console.warn('Not implemented.');
        return null as never;
    }
    containPoint(point: number[]): boolean {
        console.warn('Not implemented.');
        return false;
    }
    /**
     * Radar dimensions is based on the data
     */
    static dimensions: string[] = []

    static create(ecModel: GlobalModel, api: ExtensionAPI) {
        var radarList: Radar[] = [];
        ecModel.eachComponent('radar', function (radarModel: RadarModel) {
            var radar = new Radar(radarModel, ecModel, api);
            radarList.push(radar);
            radarModel.coordinateSystem = radar;
        });
        ecModel.eachSeriesByType('radar', function (radarSeries) {
            if (radarSeries.get('coordinateSystem') === 'radar') {
                // Inject coordinate system
                // @ts-ignore
                radarSeries.coordinateSystem = radarList[radarSeries.get('radarIndex') || 0];
            }
        });
        return radarList;
    }
}


CoordinateSystemManager.register('radar', Radar);

export default Radar;
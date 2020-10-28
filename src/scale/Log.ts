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

import * as zrUtil from 'zrender/src/core/util';
import Scale from './Scale';
import * as numberUtil from '../util/number';
import * as scaleHelper from './helper';

// Use some method of IntervalScale
import IntervalScale from './Interval';
import List from '../data/List';
import { DimensionName, ScaleTick } from '../util/types';

const scaleProto = Scale.prototype;
// FIXME:TS refactor: not good to call it directly with `this`?
const intervalScaleProto = IntervalScale.prototype;

const getPrecisionSafe = numberUtil.getPrecisionSafe;
const roundingErrorFix = numberUtil.round;

const mathFloor = Math.floor;
const mathCeil = Math.ceil;
const mathPow = Math.pow;

const mathLog = Math.log;

class LogScale extends Scale {
    static type = 'log';
    readonly type = 'log';

    base = 10;

    private _originalScale: IntervalScale = new IntervalScale();

    private _fixMin: boolean;
    private _fixMax: boolean;

    // FIXME:TS actually used by `IntervalScale`
    private _interval: number = 0;
    // FIXME:TS actually used by `IntervalScale`
    private _niceExtent: [number, number];


    /**
     * @param Whether expand the ticks to niced extent.
     */
    getTicks(expandToNicedExtent: boolean): ScaleTick[] {
        const originalScale = this._originalScale;
        const extent = this._extent;
        const originalExtent = originalScale.getExtent();

        const ticks = intervalScaleProto.getTicks.call(this, expandToNicedExtent);

        return zrUtil.map(ticks, function (tick) {
            const val = tick.value;
            let powVal = numberUtil.round(mathPow(this.base, val));

            // Fix #4158
            powVal = (val === extent[0] && this._fixMin)
                ? fixRoundingError(powVal, originalExtent[0])
                : powVal;
            powVal = (val === extent[1] && this._fixMax)
                ? fixRoundingError(powVal, originalExtent[1])
                : powVal;

            return {
                value: powVal
            };
        }, this);
    }

    setExtent(start: number, end: number): void {
        const base = this.base;
        start = mathLog(start) / mathLog(base);
        end = mathLog(end) / mathLog(base);
        intervalScaleProto.setExtent.call(this, start, end);
    }

    /**
     * @return {number} end
     */
    getExtent() {
        const base = this.base;
        const extent = scaleProto.getExtent.call(this);
        extent[0] = mathPow(base, extent[0]);
        extent[1] = mathPow(base, extent[1]);

        // Fix #4158
        const originalScale = this._originalScale;
        const originalExtent = originalScale.getExtent();
        this._fixMin && (extent[0] = fixRoundingError(extent[0], originalExtent[0]));
        this._fixMax && (extent[1] = fixRoundingError(extent[1], originalExtent[1]));

        return extent;
    }

    unionExtent(extent: [number, number]): void {
        this._originalScale.unionExtent(extent);

        const base = this.base;
        extent[0] = mathLog(extent[0]) / mathLog(base);
        extent[1] = mathLog(extent[1]) / mathLog(base);
        scaleProto.unionExtent.call(this, extent);
    }

    unionExtentFromData(data: List, dim: DimensionName): void {
        // TODO
        // filter value that <= 0
        this.unionExtent(data.getApproximateExtent(dim));
    }

    /**
     * Update interval and extent of intervals for nice ticks
     * @param approxTickNum default 10 Given approx tick number
     */
    niceTicks(approxTickNum: number): void {
        approxTickNum = approxTickNum || 10;
        const extent = this._extent;
        const span = extent[1] - extent[0];
        if (span === Infinity || span <= 0) {
            return;
        }

        let interval = numberUtil.quantity(span);
        const err = approxTickNum / span * interval;

        // Filter ticks to get closer to the desired count.
        if (err <= 0.5) {
            interval *= 10;
        }

        // Interval should be integer
        while (!isNaN(interval) && Math.abs(interval) < 1 && Math.abs(interval) > 0) {
            interval *= 10;
        }

        const niceExtent = [
            numberUtil.round(mathCeil(extent[0] / interval) * interval),
            numberUtil.round(mathFloor(extent[1] / interval) * interval)
        ] as [number, number];

        this._interval = interval;
        this._niceExtent = niceExtent;
    }

    niceExtent(opt: {
        splitNumber: number, // By default 5.
        fixMin?: boolean,
        fixMax?: boolean,
        minInterval?: number,
        maxInterval?: number
    }): void {
        intervalScaleProto.niceExtent.call(this, opt);

        this._fixMin = opt.fixMin;
        this._fixMax = opt.fixMax;
    }

    parse(val: any): number {
        return val;
    }

    contain(val: number): boolean {
        val = mathLog(val) / mathLog(this.base);
        return scaleHelper.contain(val, this._extent);
    }

    normalize(val: number): number {
        val = mathLog(val) / mathLog(this.base);
        return scaleHelper.normalize(val, this._extent);
    }

    scale(val: number): number {
        val = scaleHelper.scale(val, this._extent);
        return mathPow(this.base, val);
    }

    getMinorTicks: IntervalScale['getMinorTicks'];
    getLabel: IntervalScale['getLabel'];
}

const proto = LogScale.prototype;
proto.getMinorTicks = intervalScaleProto.getMinorTicks;
proto.getLabel = intervalScaleProto.getLabel;


function fixRoundingError(val: number, originalVal: number): number {
    return roundingErrorFix(val, getPrecisionSafe(originalVal));
}


Scale.registerClass(LogScale);

export default LogScale;

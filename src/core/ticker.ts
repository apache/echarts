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

/* global performance, requestIdleCallback */

import { isFunction, noop } from 'zrender/src/core/util';
import { ZRenderType } from 'zrender/src/zrender';
import { ScheduleOptionInternal } from './Scheduler';


export type ShouldYield = () => boolean;
export type RequireMoreTick = () => void;
export type OnTick = (
    shouldYield: ShouldYield,
    requireMoreTick: RequireMoreTick
) => void;
// The return type of `now()`, in ms.
type TimeSinceOrigin = number;
export type CollectStatisticOnFrame = () => StatisticDataOnFrame;
export type StatisticDataOnFrame = {
    sampleProcessedDataCount: number;
    samplePipelineStep: number;
};
export type RuntimeStatistic = Ticker['_statistic'];


export class Ticker {

    private _zr: ZRenderType;
    private _onTick: OnTick;
    private _senderPort: MessagePort;
    private _scheduleOpt: ScheduleOptionInternal;


    private _collectStatisticOnFrame: CollectStatisticOnFrame;
    private _statistic = {
        lastFrameStartTime: 0,
        lastFrameCost: 0,
        lastIdleCost: 0,
        lastIdleHappened: false,
        sampleProcessedDataCount: 0,
        samplePipelineStep: 0,
        dataProcessedPerFrame: new AverageCounter(1),
        recentOnTickExeTimeAvg: new AverageCounter(1)
    };

    constructor(
        zr: ZRenderType,
        scheduleOpt: ScheduleOptionInternal,
        onTick: OnTick,
        collectStatisticOnFrame: CollectStatisticOnFrame
    ) {
        this._zr = zr;
        this._collectStatisticOnFrame = collectStatisticOnFrame;
        this._onTick = (shouldYield, requireMoreTick) => {
            const startTime = now();
            onTick(shouldYield, requireMoreTick);
            this._statistic.recentOnTickExeTimeAvg.addData(now() - startTime);
        };
        this._scheduleOpt = scheduleOpt || {} as ScheduleOptionInternal;
    }

    start(): void {
        if (this._scheduleOpt.ticker === 'messageChannel') {
            this._startForMessageChannel();
        }
        else {
            this._startForFrame();
        }
    }

    private _startForFrame(): void {
        // In the previous version we use 1ms for long time.
        const timeQuota = this._scheduleOpt.timeQuota || 1;
        let startTime: TimeSinceOrigin;

        function shouldYield(): boolean {
            return now() - startTime > timeQuota;
        }

        this._zr.animation.on('frame', () => {
            startTime = now();

            this._statisticOnFrameStart(startTime);
            this._onTick(shouldYield, noop);
            this._collectStatistic();
        });
    }

    private _startForMessageChannel(): void {
        this._zr.animation.on('frame', () => {
            this._statisticOnFrameStart(now());
            this._collectStatistic();
        });

        const channel = new MessageChannel();
        this._senderPort = channel.port2;
        let doesMoreTickRequired = false;

        // By defualt use the empirical value used by react fiber for long time: 5ms
        const timeQuota = this._scheduleOpt.timeQuota || 5;
        let startTime: TimeSinceOrigin;

        function shouldYield(): boolean {
            return now() - startTime > timeQuota;
        }
        function requireMoreTick(): void {
            doesMoreTickRequired = true;
        }

        channel.port1.onmessage = () => {
            startTime = now();
            doesMoreTickRequired = false;

            this._onTick(shouldYield, requireMoreTick);

            if (doesMoreTickRequired) {
                this._senderPort.postMessage(null);
            }
        };

        this._senderPort.postMessage(null);
    }

    private _statisticOnFrameStart(frameStartTime: number) {
        if (!this._statistic.lastIdleHappened) {
            this._statistic.lastIdleCost = 0;
        }

        if (this._statistic.lastFrameStartTime) {
            this._statistic.lastFrameCost = frameStartTime - this._statistic.lastFrameStartTime;
        }
        this._statistic.lastFrameStartTime = frameStartTime;
        this._statistic.lastIdleHappened = false;

        // PENDING: polyfill for safari
        // @ts-ignore
        if (typeof requestIdleCallback === 'function') {
            // @ts-ignore
            requestIdleCallback(deadline => {
                this._statistic.lastIdleHappened = true;
                this._statistic.lastIdleCost = deadline.timeRemaining();
            });
        }
    }

    private _collectStatistic() {
        const statistic = this._statistic;
        const {
            sampleProcessedDataCount,
            samplePipelineStep
        } = this._collectStatisticOnFrame();
        if (statistic.sampleProcessedDataCount != null) {
            statistic.dataProcessedPerFrame.addData(sampleProcessedDataCount - statistic.sampleProcessedDataCount);
        }
        statistic.samplePipelineStep = samplePipelineStep;
        statistic.sampleProcessedDataCount = sampleProcessedDataCount;
    }

    getRuntimeStatistic(): RuntimeStatistic {
        return this._statistic;
    }

    getRecentFrameCost(): number {
        return this._statistic.lastFrameCost;
    }

    getRecentIdleCost(): number {
        return this._statistic.lastIdleCost;
    }

}

/**
 * Return time since a time origin (document start or 19700101) in ms.
 * So can only be compared with the result returned by this method.
 */
const now: (() => TimeSinceOrigin) =
    (typeof performance === 'object' && isFunction(performance.now))
        ? () => performance.now()
        : () => +new Date();

export function isMessageChannelTickerAvailable(): boolean {
    return typeof MessageChannel === 'function';
}

class AverageCounter {

    private _lastAvg: number;
    private _avgSum = 0;
    private _count = 0;
    private _avgSize: number;

    constructor(avgSize: number) {
        this._avgSize = avgSize;
    }

    addData(data: number): void {
        this._avgSum += data / this._avgSize;
        this._count++;
        if (this._count >= this._avgSize) {
            this._lastAvg = this._avgSum;
            this._count = this._avgSum = 0;
        }
    }

    getLastAvg(): number {
        return this._lastAvg;
    }
}

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

/**
 * Linear continuous scale
 * http://en.wikipedia.org/wiki/Level_of_measurement
 */

// FIXME only one data

import Scale from './Scale';
import OrdinalMeta from '../data/OrdinalMeta';
import List from '../data/List';
import * as scaleHelper from './helper';
import {
    OrdinalRawValue,
    OrdinalNumber,
    DimensionLoose,
    OrdinalSortInfo,
    OrdinalScaleTick,
    ScaleTick
} from '../util/types';
import { AxisBaseOption } from '../coord/axisCommonTypes';
import { isArray, map, isObject } from 'zrender/src/core/util';

type OrdinalScaleSetting = {
    ordinalMeta?: OrdinalMeta | AxisBaseOption['data'];
    extent?: [number, number];
};

class OrdinalScale extends Scale<OrdinalScaleSetting> {

    static type = 'ordinal';
    readonly type = 'ordinal';

    private _ordinalMeta: OrdinalMeta;

    /**
     * For example:
     * Given original ordinal data:
     * ```js
     * option = {
     *     xAxis: {
     *         // Their raw ordinal numbers are:
     *         //      0    1    2    3    4    5
     *         data: ['a', 'b', 'c', 'd', 'e', 'f']
     *     },
     *     yAxis: {}
     *     series: {
     *         type: 'bar',
     *         data: [
     *             ['d', 110], // ordinalNumber: 3
     *             ['c', 660], // ordinalNumber: 2
     *             ['f', 220], // ordinalNumber: 5
     *             ['e', 550]  // ordinalNumber: 4
     *         ],
     *         realtimeSort: true
     *     }
     * };
     * ```
     * After realtime sorted (order by yValue desc):
     * ```js
     * _ordinalNumbersByTick: [
     *     2, // tick: 0, yValue: 660
     *     5, // tick: 1, yValue: 220
     *     3, // tick: 2, yValue: 110
     *     4, // tick: 3, yValue: 550
     *     0, // tick: 4, yValue: -
     *     1, // tick: 5, yValue: -
     * ],
     * _ticksByOrdinalNumber: [
     *     4, // ordinalNumber: 0, yValue: -
     *     5, // ordinalNumber: 1, yValue: -
     *     0, // ordinalNumber: 2, yValue: 660
     *     2, // ordinalNumber: 3, yValue: 110
     *     3, // ordinalNumber: 4, yValue: 550
     *     1, // ordinalNumber: 5, yValue: 220
     * ]
     * ```
     * The index of this array is from `0` to `ordinalMeta.categories.length`.
     *
     * @see `Ordinal['getRawOrdinalNumber']`
     * @see `OrdinalSortInfo`
     */
    private _ordinalNumbersByTick: OrdinalNumber[];

    /**
     * This is the inverted map of `_ordinalNumbersByTick`.
     * The index of this array is from `0` to `ordinalMeta.categories.length`.
     *
     * @see `Ordinal['_ordinalNumbersByTick']`
     * @see `Ordinal['_getTickNumber']`
     * @see `OrdinalSortInfo`
     */
    private _ticksByOrdinalNumber: number[];


    constructor(setting?: OrdinalScaleSetting) {
        super(setting);

        let ordinalMeta = this.getSetting('ordinalMeta');
        // Caution: Should not use instanceof, consider ec-extensions using
        // import approach to get OrdinalMeta class.
        if (!ordinalMeta) {
            ordinalMeta = new OrdinalMeta({});
        }
        if (isArray(ordinalMeta)) {
            ordinalMeta = new OrdinalMeta({
                categories: map(ordinalMeta, item => (isObject(item) ? item.value : item))
            });
        }
        this._ordinalMeta = ordinalMeta as OrdinalMeta;
        this._extent = this.getSetting('extent') || [0, ordinalMeta.categories.length - 1];
    }

    parse(val: OrdinalRawValue | OrdinalNumber): OrdinalNumber {
        return typeof val === 'string'
            ? this._ordinalMeta.getOrdinal(val)
            // val might be float.
            : Math.round(val);
    }

    contain(rank: OrdinalRawValue | OrdinalNumber): boolean {
        rank = this.parse(rank);
        return scaleHelper.contain(rank, this._extent)
            && this._ordinalMeta.categories[rank] != null;
    }

    /**
     * Normalize given rank or name to linear [0, 1]
     * @param val raw ordinal number.
     * @return normalized value in [0, 1].
     */
    normalize(val: OrdinalRawValue | OrdinalNumber): number {
        val = this._getTickNumber(this.parse(val));
        return scaleHelper.normalize(val, this._extent);
    }

    /**
     * @param val normalized value in [0, 1].
     * @return raw ordinal number.
     */
    scale(val: number): OrdinalNumber {
        val = Math.round(scaleHelper.scale(val, this._extent));
        return this.getRawOrdinalNumber(val);
    }

    getTicks(): OrdinalScaleTick[] {
        const ticks = [];
        const extent = this._extent;
        let rank = extent[0];

        while (rank <= extent[1]) {
            ticks.push({
                value: rank
            });
            rank++;
        }

        return ticks;
    }

    getMinorTicks(splitNumber: number): number[][] {
        // Not support.
        return;
    }

    /**
     * @see `Ordinal['_ordinalNumbersByTick']`
     */
    setSortInfo(info: OrdinalSortInfo): void {
        if (info == null) {
            this._ordinalNumbersByTick = this._ticksByOrdinalNumber = null;
            return;
        }

        const infoOrdinalNumbers = info.ordinalNumbers;
        const ordinalsByTick = this._ordinalNumbersByTick = [] as OrdinalNumber[];
        const ticksByOrdinal = this._ticksByOrdinalNumber = [] as number[];

        // Unnecessary support negative tick in `realtimeSort`.
        let tickNum = 0;
        const allCategoryLen = this._ordinalMeta.categories.length;
        for (const len = Math.min(allCategoryLen, infoOrdinalNumbers.length); tickNum < len; ++tickNum) {
            const ordinalNumber = infoOrdinalNumbers[tickNum];
            ordinalsByTick[tickNum] = ordinalNumber;
            ticksByOrdinal[ordinalNumber] = tickNum;
        }
        // Handle that `series.data` only covers part of the `axis.category.data`.
        let unusedOrdinal = 0;
        for (; tickNum < allCategoryLen; ++tickNum) {
            while (ticksByOrdinal[unusedOrdinal] != null) {
                unusedOrdinal++;
            };
            ordinalsByTick.push(unusedOrdinal);
            ticksByOrdinal[unusedOrdinal] = tickNum;
        }
    }

    private _getTickNumber(ordinal: OrdinalNumber): number {
        const ticksByOrdinalNumber = this._ticksByOrdinalNumber;
        // also support ordinal out of range of `ordinalMeta.categories.length`,
        // where ordinal numbers are used as tick value directly.
        return (ticksByOrdinalNumber && ordinal >= 0 && ordinal < ticksByOrdinalNumber.length)
            ? ticksByOrdinalNumber[ordinal]
            : ordinal;
    }

    /**
     * @usage
     * ```js
     * const ordinalNumber = ordinalScale.getRawOrdinalNumber(tickVal);
     *
     * // case0
     * const rawOrdinalValue = axisModel.getCategories()[ordinalNumber];
     * // case1
     * const rawOrdinalValue = this._ordinalMeta.categories[ordinalNumber];
     * // case2
     * const coord = axis.dataToCoord(ordinalNumber);
     * ```
     *
     * @param {OrdinalNumber} tickNumber index of display
     */
    getRawOrdinalNumber(tickNumber: number): OrdinalNumber {
        const ordinalNumbersByTick = this._ordinalNumbersByTick;
        // tickNumber may be out of range, e.g., when axis max is larger than `ordinalMeta.categories.length`.,
        // where ordinal numbers are used as tick value directly.
        return (ordinalNumbersByTick && tickNumber >= 0 && tickNumber < ordinalNumbersByTick.length)
            ? ordinalNumbersByTick[tickNumber]
            : tickNumber;
    }

    /**
     * Get item on tick
     */
    getLabel(tick: ScaleTick): string {
        if (!this.isBlank()) {
            const ordinalNumber = this.getRawOrdinalNumber(tick.value);
            const cateogry = this._ordinalMeta.categories[ordinalNumber];
            // Note that if no data, ordinalMeta.categories is an empty array.
            // Return empty if it's not exist.
            return cateogry == null ? '' : cateogry + '';
        }
    }

    count(): number {
        return this._extent[1] - this._extent[0] + 1;
    }

    unionExtentFromData(data: List, dim: DimensionLoose) {
        this.unionExtent(data.getApproximateExtent(dim));
    }

    /**
     * @override
     * If value is in extent range
     */
    isInExtentRange(value: OrdinalNumber): boolean {
        value = this._getTickNumber(value);
        return this._extent[0] <= value && this._extent[1] >= value;
    }

    getOrdinalMeta(): OrdinalMeta {
        return this._ordinalMeta;
    }

    niceTicks() {}

    niceExtent() {}

}

Scale.registerClass(OrdinalScale);

export default OrdinalScale;

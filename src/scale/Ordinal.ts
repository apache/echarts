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

import Scale from './Scale';
import OrdinalMeta from '../data/OrdinalMeta';
import {
    OrdinalRawValue,
    OrdinalNumber,
    OrdinalSortInfo,
    OrdinalScaleTick,
    ScaleTick,
} from '../util/types';
import { CategoryAxisBaseOption } from '../coord/axisCommonTypes';
import { isArray, map, isObject, isString } from 'zrender/src/core/util';
import { mathMin, mathRound } from '../util/number';
import {
    DecoratedScaleMapperMethods,
    decorateScaleMapper, enableScaleMapperFreeze, getScaleExtentForTickUnsafe, initBreakOrLinearMapper,
    ScaleMapper, ScaleMapperGeneric
} from './scaleMapper';


type OrdinalScaleSetting = {
    ordinalMeta?: OrdinalMeta | CategoryAxisBaseOption['data'];
    extent?: number[];
};

/**
 * @final NEVER inherit me!
 */
interface OrdinalScale extends ScaleMapperGeneric<OrdinalScale> {
    _mapper: ScaleMapper;
}
class OrdinalScale extends Scale<OrdinalScale> {

    static type = 'ordinal';
    readonly type = 'ordinal' as const;

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
     * NOTICE:
     *  - The index of `_ordinalNumbersByTick` is "tick number", i.e., `tick.value`,
     *    rather than the index of `scale.getTicks()`, though commonly they are the same,
     *    except that the `_extent[0]` is delibrately set to be not zero.
     *  - Currently we only support that the index of `_ordinalNumbersByTick` is
     *    from `0` to `ordinalMeta.categories.length - 1`.
     *  - `OrdinalNumber` is always from `0` to `ordinalMeta.categories.length - 1`.
     *
     * @see `Ordinal['getRawOrdinalNumber']`
     * @see `OrdinalSortInfo`
     */
    private _ordinalNumbersByTick: OrdinalNumber[];

    /**
     * This is the inverted map of `_ordinalNumbersByTick`.
     * The index is `OrdinalNumber`, which is from `0` to `ordinalMeta.categories.length - 1`.
     * after `_ticksByOrdinalNumber` is initialized.
     *
     * @see `Ordinal['_ordinalNumbersByTick']`
     * @see `Ordinal['_getTickNumber']`
     * @see `OrdinalSortInfo`
     */
    private _ticksByOrdinalNumber: number[];


    constructor(setting: OrdinalScaleSetting) {
        super();

        this.parse = OrdinalScale.parse;

        decorateScaleMapper(this, OrdinalScale.decoratedMethods);

        let ordinalMeta = setting.ordinalMeta;
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

        // Create an interval LinearScaleMapper, and decorate it.
        const res = initBreakOrLinearMapper(
            null,
            null, // Do not support break in OrdinalScale yet.
            setting.extent || [0, ordinalMeta.categories.length - 1]
        );
        this._mapper = res.mapper;

        enableScaleMapperFreeze(this, res.mapper);
    }

    private static parse(this: OrdinalScale, val: OrdinalRawValue | OrdinalNumber): OrdinalNumber {
        // Caution: Math.round(null) will return `0` rather than `NaN`
        if (val == null) {
            val = NaN;
        }
        else if (isString(val)) {
            val = this._ordinalMeta.getOrdinal(val);
            if (val == null) {
                val = NaN;
            }
        }
        else {
            // The val from user input might be float.
            val = mathRound(val);
        }
        return val;
    }

    static decoratedMethods: DecoratedScaleMapperMethods<OrdinalScale> = {

        needTransform() {
            return this._mapper.needTransform();
        },

        contain(this: OrdinalScale, val: OrdinalNumber): boolean {
            return this._mapper.contain(this._getTickNumber(val))
                && val >= 0 && val < this._ordinalMeta.categories.length;
        },

        normalize(this: OrdinalScale, val: OrdinalNumber): number {
            val = this._getTickNumber(val);
            return this._mapper.normalize(val);
        },

        scale(this: OrdinalScale, val: number): OrdinalNumber {
            val = mathRound(this._mapper.scale(val));
            return this.getRawOrdinalNumber(val);
        },

        transformIn(val, opt) {
            return this._mapper.transformIn(val, opt);
        },

        transformOut(val, opt) {
            return this._mapper.transformOut(val, opt);
        },

        getExtent() {
            return this._mapper.getExtent();
        },

        getExtentUnsafe(kind, depth) {
            return this._mapper.getExtentUnsafe(kind, depth);
        },

        setExtent(start, end) {
            return this._mapper.setExtent(start, end);
        },

        setExtent2(kind, start, end) {
            return this._mapper.setExtent2(kind, start, end);
        },

    };

    getTicks(): OrdinalScaleTick[] {
        const ticks = [];
        const extent = getScaleExtentForTickUnsafe(this._mapper);
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
        for (const len = mathMin(allCategoryLen, infoOrdinalNumbers.length); tickNum < len; ++tickNum) {
            const ordinalNumber = ordinalsByTick[tickNum] = infoOrdinalNumbers[tickNum];
            ticksByOrdinal[ordinalNumber] = tickNum;
        }
        // Handle that `series.data` only covers part of the `axis.category.data`.
        let unusedOrdinal = 0;
        for (; tickNum < allCategoryLen; ++tickNum) {
            while (ticksByOrdinal[unusedOrdinal] != null) {
                unusedOrdinal++;
            };
            ordinalsByTick[tickNum] = unusedOrdinal;
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
     * const ordinalNumber = ordinalScale.getRawOrdinalNumber(tick.value);
     * // case0
     * const rawOrdinalValue = axisModel.getCategories()[ordinalNumber];
     * // case1
     * const rawOrdinalValue = this._ordinalMeta.categories[ordinalNumber];
     * // case2
     * const coord = axis.dataToCoord(ordinalNumber);
     * ```
     *
     * @param tickNumber This is `scale.getTicks()[i].value`.
     */
    getRawOrdinalNumber(tickNumber: number): OrdinalNumber {
        const ordinalNumbersByTick = this._ordinalNumbersByTick;
        // tickNumber may be out of range, e.g., when axis max is larger than `ordinalMeta.categories.length`,
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
            const category = this._ordinalMeta.categories[ordinalNumber];
            // Note that if no data, ordinalMeta.categories is an empty array.
            // Return empty if it's not exist.
            return category == null ? '' : category + '';
        }
    }

    count(): number {
        const extent = getScaleExtentForTickUnsafe(this._mapper);
        return extent[1] - extent[0] + 1;
    }

    getOrdinalMeta(): OrdinalMeta {
        return this._ordinalMeta;
    }

}

Scale.registerClass(OrdinalScale);

export default OrdinalScale;

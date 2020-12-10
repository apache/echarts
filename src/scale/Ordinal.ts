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
    private _categorySortInfo: OrdinalSortInfo[];

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
     */
    normalize(val: OrdinalRawValue | OrdinalNumber): number {
        val = this.getCategoryIndex(this.parse(val));
        return scaleHelper.normalize(val, this._extent);
    }

    scale(val: number): OrdinalNumber {
        val = this.getCategoryIndex(val);
        return Math.round(scaleHelper.scale(val, this._extent));
    }

    getTicks(): OrdinalScaleTick[] {
        const ticks = [];
        const extent = this._extent;
        let rank = extent[0];

        while (rank <= extent[1]) {
            ticks.push({
                value: this.getCategoryIndex(rank)
            });
            rank++;
        }

        return ticks;
    }

    getMinorTicks(splitNumber: number): number[][] {
        // Not support.
        return;
    }

    setCategorySortInfo(info: OrdinalSortInfo[]): void {
        this._categorySortInfo = info;
    }

    getCategorySortInfo(): OrdinalSortInfo[] {
        return this._categorySortInfo;
    }

    /**
     * Get display order after sort
     *
     * @param {OrdinalNumber} n index of raw data
     */
    getCategoryIndex(n: OrdinalNumber): OrdinalNumber {
        const categorySortInfo = this._categorySortInfo;
        if (categorySortInfo) {
            // Sorted
            return categorySortInfo[n]
                ? categorySortInfo[n].beforeSortIndex
                : -1;
        }
        else {
            // Not sorted
            return n;
        }
    }

    /**
     * Get raw data index
     *
     * @param {OrdinalNumber} displayIndex index of display
     */
    getRawIndex(displayIndex: OrdinalNumber): OrdinalNumber {
        const categorySortInfo = this._categorySortInfo;
        if (categorySortInfo) {
            // Sorted
            return categorySortInfo[displayIndex]
                // In range, return ordinalNumber
                ? categorySortInfo[displayIndex].ordinalNumber
                // Out of range, e.g., when axis max is larger than cagetory number
                : -1;
        }
        else {
            // Not sorted
            return displayIndex;
        }
    }

    /**
     * Get item on rank n
     */
    getLabel(tick: ScaleTick): string {
        if (!this.isBlank()) {
            const rawIndex = this.getRawIndex(tick.value);
            const cateogry = this._ordinalMeta.categories[rawIndex];
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
    isInExtentRange(value: number): boolean {
        value = this.getCategoryIndex(value);
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

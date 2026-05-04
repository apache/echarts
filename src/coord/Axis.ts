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

import {each, map} from 'zrender/src/core/util';
import {linearMap} from '../util/number';
import {
    createAxisTicks,
    createAxisLabels,
    calculateCategoryInterval,
    AxisLabelsComputingContext,
    AxisTickLabelComputingKind,
    createAxisLabelsComputingContext,
    AxisLabelInfoDetermined,
} from './axisTickLabelBuilder';
import Scale, { ScaleGetTicksOpt } from '../scale/Scale';
import { DimensionName, NullUndefined, ScaleDataValue, ScaleTick } from '../util/types';
import OrdinalScale from '../scale/Ordinal';
import Model from '../model/Model';
import {
    AxisBaseOption, AxisTickOptionUnion, CategoryAxisBaseOption,
    CategoryTickLabelSplitBuildingOption, OptionAxisType
} from './axisCommonTypes';
import { AxisBaseModel } from './AxisBaseModel';
import { isOrdinalScale } from '../scale/helper';
import { calcBandWidth } from './axisBand';
import { getTickValueOutermost } from './axisHelper';

const NORMALIZED_EXTENT = [0, 1] as [number, number];

export interface AxisTickCoord {
    coord: number;
    tickValue: ScaleTick['value'];
    // `true` if onBand fixed.
    onBand?: boolean;
}

/**
 * Base class of Axis.
 *
 * Lifetime: recreate for each main process.
 * [NOTICE]: Some caches is stored on the axis instance (e.g., `axisTickLabelBuilder.ts`, `scaleRawExtentInfo.ts`),
 *  which is based on this lifetime.
 */
class Axis {

    /**
     * Axis type
     *  - 'category'
     *  - 'value'
     *  - 'time'
     *  - 'log'
     */
    type: OptionAxisType;

    // Axis dimension. Such as 'x', 'y', 'z', 'angle', 'radius'.
    // The name must be globally unique across different coordinate systems.
    // But they may be not enumerable, e.g., in Radar and Parallel, axis
    // number is not static.
    readonly dim: DimensionName;

    // Axis scale
    scale: Scale;

    // Make sure that `extent[0] > extent[1]` only if `inverse: true`.
    // The unit is pixel, but not necessarily the global pixel,
    //  probably need to transform (usually rotate) to global pixel.
    private _extent: [number, number];

    // Injected outside
    model: AxisBaseModel;
    // NOTICE: Must ensure `true` is only available on 'category' axis.
    onBand: CategoryAxisBaseOption['boundaryGap'] = false;
    // Make sure that `extent[0] > extent[1]` only if `inverse: true`.
    // `inverse` can be inferred by `extent` unless `extent[0] === extent[1]`.
    inverse: AxisBaseOption['inverse'] = false;

    // To be injected outside. May change - do not use it outside of echarts.
    __alignTo: Axis | NullUndefined;


    constructor(dim: DimensionName, scale: Scale, extent: [number, number]) {
        this.dim = dim;
        this.scale = scale;
        this._extent = extent || [0, 0];
    }

    /**
     * If axis extent contain given coord
     */
    contain(coord: number): boolean {
        const extent = this._extent;
        const min = Math.min(extent[0], extent[1]);
        const max = Math.max(extent[0], extent[1]);
        return coord >= min && coord <= max;
    }

    /**
     * If axis extent contain given data
     */
    containData(data: ScaleDataValue): boolean {
        return this.scale.contain(this.scale.parse(data));
    }

    /**
     * Get coord extent.
     */
    getExtent(): [number, number] {
        return this._extent.slice() as [number, number];
    }

    /**
     * Set coord extent
     */
    setExtent(start: number, end: number): void {
        const extent = this._extent;
        extent[0] = start;
        extent[1] = end;
    }

    /**
     * Convert data to coord. Data is the rank if it has an ordinal scale
     */
    dataToCoord(data: ScaleDataValue, clamp?: boolean): number {
        const scale = this.scale;
        data = scale.normalize(scale.parse(data));
        return linearMap(data, NORMALIZED_EXTENT, makeExtentWithBands(this), clamp);
    }

    /**
     * Convert coord to data. Data is the rank if it has an ordinal scale
     */
    coordToData(coord: number, clamp?: boolean): number {
        const t = linearMap(coord, makeExtentWithBands(this), NORMALIZED_EXTENT, clamp);
        return this.scale.scale(t);
    }

    /**
     * Convert pixel point to data in axis
     */
    pointToData(point: number[], clamp?: boolean): number {
        // Should be implemented in derived class if necessary.
        return;
    }

    /**
     * Different from `zrUtil.map(axis.getTicks(), axis.dataToCoord, axis)`,
     * `axis.getTicksCoords` considers `onBand`, which is used by
     * `boundaryGap:true` of category axis and splitLine and splitArea.
     * @param opt.tickModel default: axis.model.getModel('axisTick')
     */
    getTicksCoords(opt?: {
        tickModel?: Model<CategoryTickLabelSplitBuildingOption>,
        breakTicks?: ScaleGetTicksOpt['breakTicks'],
        pruneByBreak?: ScaleGetTicksOpt['pruneByBreak']
    }): AxisTickCoord[] {
        opt = opt || {};
        const tickModel = opt.tickModel || this.getTickModel();

        const result = createAxisTicks(this, tickModel as AxisBaseModel, {
            breakTicks: opt.breakTicks,
            pruneByBreak: opt.pruneByBreak,
        });
        const preTicksCoords = map(result.ticks, function (tick) {
            return {
                coord: this.dataToCoord(getTickValueOutermost(this.scale, tick)),
                tick,
            };
        }, this);

        const alignWithLabel = (tickModel as Model<CategoryAxisBaseOption['axisTick']>).get('alignWithLabel');

        const onBandModified = fixOnBandTicksCoords(
            this,
            preTicksCoords,
            alignWithLabel,
        );

        return map(preTicksCoords, function (item) {
            return {
                coord: item.coord,
                tickValue: item.tick.value,
                onBand: onBandModified,
            };
        });
    }

    getMinorTicksCoords(): AxisTickCoord[][] {
        if (isOrdinalScale(this.scale)) {
            // Category axis doesn't support minor ticks
            return [];
        }

        const minorTickModel = this.model.getModel('minorTick');
        let splitNumber = minorTickModel.get('splitNumber');
        // Protection.
        if (!(splitNumber > 0 && splitNumber < 100)) {
            splitNumber = 5;
        }
        const minorTicks = this.scale.getMinorTicks(splitNumber);
        const minorTicksCoords = map(minorTicks, function (minorTicksGroup) {
            return map(minorTicksGroup, function (minorTick) {
                return {
                    coord: this.dataToCoord(minorTick),
                    tickValue: minorTick,
                };
            }, this);
        }, this);
        return minorTicksCoords;
    }

    getViewLabels(
        ctx?: AxisLabelsComputingContext
    ): AxisLabelInfoDetermined[] {
        ctx = ctx || createAxisLabelsComputingContext(AxisTickLabelComputingKind.determine);
        return createAxisLabels(this, ctx).labels;
    }

    getLabelModel(): Model<AxisBaseOption['axisLabel']> {
        return this.model.getModel('axisLabel');
    }

    /**
     * Notice here we only get the default tick model. For splitLine
     * or splitArea, we should pass the splitLineModel or splitAreaModel
     * manually when calling `getTicksCoords`.
     * In GL, this method may be overridden to:
     * `axisModel.getModel('axisTick', grid3DModel.getModel('axisTick'));`
     */
    getTickModel(): Model<AxisTickOptionUnion> {
        return this.model.getModel('axisTick');
    }

    /**
     * @deprecated Use `calcBandWidth` instead.
     */
    getBandWidth(): number {
        return calcBandWidth(this, {min: 1}).w;
        // NOTICE: Do not add logic here. Implement everthing in `calcBandWidth`.
    }

    /**
     * Get axis rotate, by degree.
     */
    getRotate: () => number;

    /**
     * Only be called in category axis.
     * Can be overridden, consider other axes like in 3D.
     * @return Auto interval for category axis tick and label
     */
    calculateCategoryInterval(ctx?: AxisLabelsComputingContext): number {
        ctx = ctx || createAxisLabelsComputingContext(AxisTickLabelComputingKind.determine);
        return calculateCategoryInterval(this, ctx);
    }

}

function makeExtentWithBands(axis: Axis): number[] {
    const extent = axis.getExtent();
    if (axis.onBand) {
        const size = extent[1] - extent[0];
        const margin = size / (axis.scale as OrdinalScale).count() / 2;
        extent[0] += margin;
        extent[1] -= margin;
    }
    return extent;
}

/**
 * `axis.onBand: true` (i.e., `boundaryGap: true` in ec option) and `CategoryTickLabelSplitIntervalOption`
 *  affects `axisTick`/`axisLabel`/`splitLine`/`splitArea`.
 *
 * Currently, the visual result is best only when `axisTick/splitLine/splitArea.interval === 0`.
 * The typical case is:
 *      |---|---|---|     <= This is the input `preTicksCoords`
 *      0   1   2   3        (having been added half band width by `makeExtentWithBands`).
 *    |---|---|---|---|  <= This is the result.
 *      0   1   2   3
 *
 * When `interval > 0`, the visual result may be odd for `axisLabel` and `customValues`, but acceptable
 * for `axisTick` `splitLine` and `splitArea`:
 *      |---~---|---~---~---|---|    <= This is the input `preTicksCoords`; `interval: 2; min: 1; max: 7`.
 *      ₁   ₂   3   ₄   ₅   6   ₇       Subscript numbers (`₀`, `₁`, `₃`) indicate axis labels are hidden
 *                                      (by default settings) due to off-interval.
 *                                      A tilde (`~`) indicates a tick ignored due to off-interval.
 *    |---~---|---~---~---|---~---|  <= This is the result.
 *      ₁   ₂   3   ₄   ₅   6   ₇
 *
 * NOTE:
 *  - A inappropriate result may cause misleading (e.g., split 2 bars of a single data item when there
 *    are two bar series).
 *  - See also #11176 #11186 .
 * PENDING:
 *  - The show/hide of `axisLabel` may be optimized when `interval > 1 and be an even number`,
 *    but that may introduce complex and still not perfect in odd number, and may not necessary if
 *    `axisTick: {show: false}` and `axisLabel` can auto hidden when overlapping.
 */
function fixOnBandTicksCoords(
    axis: Axis,
    preTicksCoords: {
        coord: AxisTickCoord['coord'],
        tick: ScaleTick
    }[],
    alignWithLabel: boolean,
    // return: whether coords are modified according to `onBand`.
): boolean {
    const ticksLen = preTicksCoords.length;

    if (!axis.onBand || alignWithLabel || !ticksLen) {
        return false;
    }

    // Assume:
    //  - If `onBand: true`, `bandWidth` has been calculated by `ticksLen + 1` rather than `ticksLen`.
    //  - If `interval > 0`, some ticks may be ignored, but `ticksCoords` has always included boundary
    //    ticks of axis extent, and be `offInterval: true` if off-interval.
    //  - No need to consider breaks, since axis break is not supported in category axis.
    const bandWidth = calcBandWidth(axis).w;
    if (!bandWidth) {
        return false;
    }

    each(preTicksCoords, function (ticksItem) {
        ticksItem.coord -= bandWidth / 2;
    });

    const dataExtent = axis.scale.getExtent();
    const oldLast = preTicksCoords[ticksLen - 1];
    if (oldLast.tick.offInterval) {
        preTicksCoords.pop();
    }
    preTicksCoords.push({
        coord: oldLast.coord + bandWidth,
        tick: {value: dataExtent[1] + 1},
    });

    return true;
}

export default Axis;

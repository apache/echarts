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
import OrdinalScale from '../scale/Ordinal';
import IntervalScale from '../scale/Interval';
import Scale from '../scale/Scale';
import {
    prepareLayoutBarSeries,
    makeColumnLayout,
    retrieveColumnLayout
} from '../layout/barGrid';

import TimeScale from '../scale/Time';
import Model from '../model/Model';
import { AxisBaseModel } from './AxisBaseModel';
import LogScale from '../scale/Log';
import type Axis from './Axis';
import {
    AxisBaseOption,
    CategoryAxisBaseOption,
    LogAxisBaseOption,
    TimeAxisLabelFormatterOption,
    AxisBaseOptionCommon,
    AxisLabelCategoryFormatter,
    AxisLabelValueFormatter,
    AxisLabelFormatterExtraParams,
} from './axisCommonTypes';
import CartesianAxisModel from './cartesian/AxisModel';
import SeriesData from '../data/SeriesData';
import { getStackedDimension } from '../data/helper/dataStackHelper';
import { Dictionary, DimensionName, ScaleTick } from '../util/types';
import { ensureScaleRawExtentInfo, ScaleRawExtentResult } from './scaleRawExtentInfo';
import { parseTimeAxisLabelFormatter } from '../util/time';
import { getScaleBreakHelper } from '../scale/break';
import { error } from '../util/log';
import { isIntervalScale, isTimeScale } from '../scale/helper';


type BarWidthAndOffset = ReturnType<typeof makeColumnLayout>;

/**
 * Prepare axis scale extent before niced.
 * Item of returned array can only be number (including Infinity and NaN).
 *
 * CAVEAT:
 *  This function has side-effect.
 *
 * FIXME:
 *  Refector to decouple `unionExtentFromData` and irregular value handling from `scale`.
 *  Merge `unionAxisExtentFromData` and `unionExtentFromData`.
 *  Refector `ensureScaleRawExtentInfo`.
 */
export function adoptScaleExtentOptionAndPrepare(
    scale: Scale,
    model: AxisBaseModel,
    // Typically: data extent from all series on this axis.
    // Can be obtained by `scale.unionExtentFromData(); scale.getExtent()`;
    dataExtent: number[]
): ScaleRawExtentResult {
    const rawExtentResult = ensureScaleRawExtentInfo(scale, model, dataExtent).calculate();

    scale.setBlank(rawExtentResult.isBlank);

    let min = rawExtentResult.min;
    let max = rawExtentResult.max;

    // If bars are placed on a base axis of type time or interval account for axis boundary overflow and current axis
    // is base axis
    // FIXME
    // (1) Consider support value axis, where below zero and axis `onZero` should be handled properly.
    // (2) Refactor the logic with `barGrid`. Is it not need to `makeBarWidthAndOffsetInfo` twice with different extent?
    //     Should not depend on series type `bar`?
    // (3) Fix that might overlap when using dataZoom.
    // (4) Consider other chart types using `barGrid`?
    // See #6728, #4862, `test/bar-overflow-time-plot.html`
    const ecModel = model.ecModel;
    if (ecModel && (isTimeScale(scale) /* || scaleType === 'interval' */)) {
        const barSeriesModels = prepareLayoutBarSeries('bar', ecModel);
        let isBaseAxisAndHasBarSeries = false;

        zrUtil.each(barSeriesModels, function (seriesModel) {
            isBaseAxisAndHasBarSeries = isBaseAxisAndHasBarSeries || seriesModel.getBaseAxis() === model.axis;
        });

        if (isBaseAxisAndHasBarSeries) {
            // Calculate placement of bars on axis. TODO should be decoupled
            // with barLayout
            const barWidthAndOffset = makeColumnLayout(barSeriesModels);

            // Adjust axis min and max to account for overflow
            const adjustedScale = adjustScaleForOverflow(min, max, model as CartesianAxisModel, barWidthAndOffset);
            min = adjustedScale.min;
            max = adjustedScale.max;
        }
    }

    rawExtentResult.min = min;
    rawExtentResult.max = max;

    return rawExtentResult;
}

function adjustScaleForOverflow(
    min: number,
    max: number,
    model: CartesianAxisModel,  // Only support cartesian coord yet.
    barWidthAndOffset: BarWidthAndOffset
) {

    // Get Axis Length
    const axisExtent = model.axis.getExtent();
    const axisLength = Math.abs(axisExtent[1] - axisExtent[0]);

    // Get bars on current base axis and calculate min and max overflow
    const barsOnCurrentAxis = retrieveColumnLayout(barWidthAndOffset, model.axis);
    if (barsOnCurrentAxis === undefined) {
        return {min: min, max: max};
    }

    let minOverflow = Infinity;
    zrUtil.each(barsOnCurrentAxis, function (item) {
        minOverflow = Math.min(item.offset, minOverflow);
    });
    let maxOverflow = -Infinity;
    zrUtil.each(barsOnCurrentAxis, function (item) {
        maxOverflow = Math.max(item.offset + item.width, maxOverflow);
    });
    minOverflow = Math.abs(minOverflow);
    maxOverflow = Math.abs(maxOverflow);
    const totalOverFlow = minOverflow + maxOverflow;

    // Calculate required buffer based on old range and overflow
    const oldRange = max - min;
    const oldRangePercentOfNew = (1 - (minOverflow + maxOverflow) / axisLength);
    const overflowBuffer = ((oldRange / oldRangePercentOfNew) - oldRange);

    max += overflowBuffer * (maxOverflow / totalOverFlow);
    min -= overflowBuffer * (minOverflow / totalOverFlow);

    return {min: min, max: max};
}

export function niceScaleExtent(
    scale: Scale,
    inModel: AxisBaseModel,
    // Typically: data extent from all series on this axis, which can be obtained by
    //  `scale.unionExtentFromData(...); scale.getExtent();`.
    dataExtent: number[],
): void {
    const model = inModel as AxisBaseModel<LogAxisBaseOption>;
    const extentInfo = adoptScaleExtentOptionAndPrepare(scale, model, dataExtent);

    const isInterval = isIntervalScale(scale);
    const isIntervalOrTime = isInterval || isTimeScale(scale);

    scale.setBreaksFromOption(retrieveAxisBreaksOption(model));
    scale.setExtent(extentInfo.min, extentInfo.max);
    scale.calcNiceExtent({
        splitNumber: model.get('splitNumber'),
        fixMinMax: [extentInfo.minFixed, extentInfo.maxFixed],
        minInterval: isIntervalOrTime ? model.get('minInterval') : null,
        maxInterval: isIntervalOrTime ? model.get('maxInterval') : null
    });

    // If some one specified the min, max. And the default calculated interval
    // is not good enough. He can specify the interval. It is often appeared
    // in angle axis with angle 0 - 360. Interval calculated in interval scale is hard
    // to be 60.
    // In `xxxAxis.type: 'log'`, ec option `xxxAxis.interval` requires a logarithm-applied
    // value rather than a value in the raw scale.
    const interval = model.get('interval');
    if (interval != null && (scale as IntervalScale).setInterval) {
        (scale as IntervalScale).setInterval({interval});
    }
}

export function createScaleByModel(model: AxisBaseModel): Scale {
    const axisType = model.get('type');
    switch (axisType) {
        case 'category':
            return new OrdinalScale({
                ordinalMeta: model.getOrdinalMeta
                    ? model.getOrdinalMeta()
                    : model.getCategories(),
                extent: [Infinity, -Infinity]
            });
        case 'time':
            return new TimeScale({
                locale: model.ecModel.getLocaleModel(),
                useUTC: model.ecModel.get('useUTC'),
            });
        case 'log':
            // See also #3749
            return new LogScale((model as AxisBaseModel<LogAxisBaseOption>).get('logBase'));
        default:
            // case 'value'/'interval', or others.
            return new (Scale.getClass(axisType) || IntervalScale)();
    }
}

/**
 * Check if the axis cross 0
 */
export function ifAxisCrossZero(axis: Axis) {
    const dataExtent = axis.scale.getExtent();
    const min = dataExtent[0];
    const max = dataExtent[1];
    return !((min > 0 && max > 0) || (min < 0 && max < 0));
}

/**
 * @param axis
 * @return Label formatter function.
 *         param: {number} tickValue,
 *         param: {number} idx, the index in all ticks.
 *                         If category axis, this param is not required.
 *         return: {string} label string.
 */
export function makeLabelFormatter(axis: Axis): (tick: ScaleTick, idx?: number) => string {
    const labelFormatter = axis.getLabelModel().get('formatter');

    if (axis.type === 'time') {
        const parsed = parseTimeAxisLabelFormatter(labelFormatter as TimeAxisLabelFormatterOption);
        return function (tick: ScaleTick, idx: number) {
            return (axis.scale as TimeScale).getFormattedLabel(tick, idx, parsed);
        };
    }
    else if (zrUtil.isString(labelFormatter)) {
        return function (tick: ScaleTick) {
            // For category axis, get raw value; for numeric axis,
            // get formatted label like '1,333,444'.
            const label = axis.scale.getLabel(tick);
            const text = labelFormatter.replace('{value}', label != null ? label : '');
            return text;
        };
    }
    else if (zrUtil.isFunction(labelFormatter)) {
        if (axis.type === 'category') {
            return function (tick: ScaleTick, idx: number) {
                // The original intention of `idx` is "the index of the tick in all ticks".
                // But the previous implementation of category axis do not consider the
                // `axisLabel.interval`, which cause that, for example, the `interval` is
                // `1`, then the ticks "name5", "name7", "name9" are displayed, where the
                // corresponding `idx` are `0`, `2`, `4`, but not `0`, `1`, `2`. So we keep
                // the definition here for back compatibility.
                return (labelFormatter as AxisLabelCategoryFormatter)(
                    getAxisRawValue<true>(axis, tick),
                    tick.value - axis.scale.getExtent()[0],
                    null // Using `null` just for backward compat.
                );
            };
        }
        const scaleBreakHelper = getScaleBreakHelper();
        return function (tick: ScaleTick, idx: number) {
            // Using `null` just for backward compat. It's been found that in the `test/axis-customTicks.html`,
            // there is a formatter `function (value, index, revers = true) { ... }`. Although the third param
            // `revers` is incorrect and always `null`, changing it might introduce a breaking change.
            let extra: AxisLabelFormatterExtraParams | null = null;
            if (scaleBreakHelper) {
                extra = scaleBreakHelper.makeAxisLabelFormatterParamBreak(extra, tick.break);
            }
            return (labelFormatter as AxisLabelValueFormatter)(
                getAxisRawValue<false>(axis, tick),
                idx,
                extra
            );
        };
    }
    else {
        return function (tick: ScaleTick) {
            return axis.scale.getLabel(tick);
        };
    }
}

export function getAxisRawValue<TIsCategory extends boolean>(axis: Axis, tick: ScaleTick):
    TIsCategory extends true ? string : number {
    // In category axis with data zoom, tick is not the original
    // index of axis.data. So tick should not be exposed to user
    // in category axis.
    return axis.type === 'category' ? axis.scale.getLabel(tick) : tick.value as any;
}

/**
 * @param model axisLabelModel or axisTickModel
 */
export function getOptionCategoryInterval(
    model: Model<AxisBaseOption['axisLabel']>
): CategoryAxisBaseOption['axisLabel']['interval'] {
    const interval = (model as Model<CategoryAxisBaseOption['axisLabel']>).get('interval');
    return interval == null ? 'auto' : interval;
}

/**
 * Set `categoryInterval` as 0 implicitly indicates that
 * show all labels regardless of overlap.
 * @param {Object} axis axisModel.axis
 */
export function shouldShowAllLabels(axis: Axis): boolean {
    return axis.type === 'category'
        && getOptionCategoryInterval(axis.getLabelModel()) === 0;
}

export function getDataDimensionsOnAxis(data: SeriesData, axisDim: string): DimensionName[] {
    // Remove duplicated dat dimensions caused by `getStackedDimension`.
    const dataDimMap = {} as Dictionary<boolean>;
    // Currently `mapDimensionsAll` will contain stack result dimension ('__\0ecstackresult').
    // PENDING: is it reasonable? Do we need to remove the original dim from "coord dim" since
    // there has been stacked result dim?
    zrUtil.each(data.mapDimensionsAll(axisDim), function (dataDim) {
        // For example, the extent of the original dimension
        // is [0.1, 0.5], the extent of the `stackResultDimension`
        // is [7, 9], the final extent should NOT include [0.1, 0.5],
        // because there is no graphic corresponding to [0.1, 0.5].
        // See the case in `test/area-stack.html` `main1`, where area line
        // stack needs `yAxis` not start from 0.
        dataDimMap[getStackedDimension(data, dataDim)] = true;
    });
    return zrUtil.keys(dataDimMap);
}

/**
 * FIXME: refactor - merge with `Scale#unionExtentFromData`
 */
export function unionAxisExtentFromData(dataExtent: number[], data: SeriesData, axisDim: string): void {
    if (data) {
        zrUtil.each(getDataDimensionsOnAxis(data, axisDim), function (dim) {
            const seriesExtent = data.getApproximateExtent(dim);
            seriesExtent[0] < dataExtent[0] && (dataExtent[0] = seriesExtent[0]);
            seriesExtent[1] > dataExtent[1] && (dataExtent[1] = seriesExtent[1]);
        });
    }
}

export function isNameLocationCenter(nameLocation: AxisBaseOptionCommon['nameLocation']) {
    return nameLocation === 'middle' || nameLocation === 'center';
}

export function shouldAxisShow(axisModel: AxisBaseModel): boolean {
    return axisModel.getShallow('show');
}

export function retrieveAxisBreaksOption(model: AxisBaseModel): AxisBaseOptionCommon['breaks'] {
    const option = model.get('breaks', true);
    if (option != null) {
        if (!getScaleBreakHelper()) {
            if (__DEV__) {
                error(
                    'Must `import {AxisBreak} from "echarts/features"; use(AxisBreak);` first if using breaks option.'
                );
            }
            return undefined;
        }
        if (!isSupportAxisBreak(model.axis)) {
            if (__DEV__) {
                error(`Axis '${model.axis.dim}'-'${model.axis.type}' does not support break.`);
            }
            return undefined;
        }
        return option;
    }
}

function isSupportAxisBreak(axis: Axis): boolean {
    // The polar radius axis can also support break feasibly. Do not do it until the requirements are met.
    return (axis.dim === 'x' || axis.dim === 'y' || axis.dim === 'z' || axis.dim === 'single')
        && axis.type !== 'category';
}

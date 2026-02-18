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
import IntervalScale, { IntervalScaleConfig } from '../scale/Interval';
import Scale from '../scale/Scale';

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
    OptionAxisType,
    AXIS_TYPES,
} from './axisCommonTypes';
import SeriesData from '../data/SeriesData';
import { getStackedDimension } from '../data/helper/dataStackHelper';
import { Dictionary, DimensionName, NullUndefined, ScaleTick } from '../util/types';
import { ScaleExtentFixMinMax } from './scaleRawExtentInfo';
import { parseTimeAxisLabelFormatter } from '../util/time';
import { getScaleBreakHelper } from '../scale/break';
import { error } from '../util/log';
import {
    extentDiffers, isLogScale, isOrdinalScale
} from '../scale/helper';
import { AxisModelExtendedInCreator } from './axisModelCreator';
import { initExtentForUnion, makeInner } from '../util/model';
import { ComponentModel } from '../echarts.simple';
import { SCALE_EXTENT_KIND_EFFECTIVE, SCALE_MAPPER_DEPTH_OUT_OF_BREAK } from '../scale/scaleMapper';


const axisInner = makeInner<{
    noOnMyZero: SuppressOnAxisZeroReason;
}, Axis>();

type SuppressOnAxisZeroReason = {
    dz?: boolean;
    base?: boolean
};


export function determineAxisType(
    model: Model<Pick<AxisBaseOption, 'type'>>
): OptionAxisType {
    let type = model.get('type') as OptionAxisType;
    if (// In ec option, `xxxAxis.type` may be undefined.
        type == null
        // PENDING: Theoretically, a customized `Scale` is probably impossible, since
        // the interface of `Scale` does not guarantee stability. But we still literally
        // support it for backward compat, though type incorrect.
        || (!zrUtil.hasOwn(AXIS_TYPES, type) && !Scale.getClass(type))
    ) {
        type = 'value';
    }
    return type;
}

export function createScaleByModel(
    model:
        Model<
            // Expect `Pick<AxisBaseOptionCommon, 'type'>`,
            // but be lenient for user's invalid input.
            {type?: string}
            & Pick<LogAxisBaseOption, 'logBase'>
            & Pick<AxisBaseOptionCommon, 'breaks'>
        >
        & Partial<Pick<
            AxisModelExtendedInCreator,
            'getOrdinalMeta' | 'getCategories'
        >>,
    type: OptionAxisType,
    coordSysSupportAxisBreaks: boolean,
): Scale {

    const breakHelper = getScaleBreakHelper();
    let breakOption;
    if (breakHelper) {
        breakOption = retrieveAxisBreaksOption(model, type, coordSysSupportAxisBreaks);
    }

    switch (type) {
        case 'category':
            return new OrdinalScale({
                ordinalMeta: model.getOrdinalMeta
                    ? model.getOrdinalMeta()
                    : model.getCategories(),
                extent: initExtentForUnion(),
            });
        case 'time':
            return new TimeScale({
                locale: model.ecModel.getLocaleModel(),
                useUTC: model.ecModel.get('useUTC'),
                breakOption,
            });
        case 'log':
            // See also #3749
            return new LogScale({
                logBase: model.get('logBase'),
                breakOption,
            });
        case 'value':
            return new IntervalScale({
                breakOption
            });
        default:
            // case others.
            return new (Scale.getClass(type) || IntervalScale)({});
    }
}

/**
 * Check if the axis cross 0
 */
export function ifAxisCrossZero(axis: Axis) {
    // NOTE: Although the portion out of "effective" portion may also cross zero
    // (see `SCALE_EXTENT_KIND_MAPPING`), that is commonly meaningless, so we use
    // `SCALE_EXTENT_KIND_EFFECTIVE`
    const dataExtent = axis.scale.getExtentUnsafe(SCALE_EXTENT_KIND_EFFECTIVE, null);
    const min = dataExtent[0];
    const max = dataExtent[1];
    return !((min > 0 && max > 0) || (min < 0 && max < 0));
}

export function suppressOnAxisZero(axis: Axis, reason: Partial<SuppressOnAxisZeroReason>): void {
    zrUtil.defaults(axisInner(axis).noOnMyZero || (axisInner(axis).noOnMyZero = {}), reason);
}

/**
 * `true`: Prevent orthoganal axes from positioning at the zero point of this axis.
 */
export function isOnAxisZeroSuppressed(axis: Axis): boolean {
    const dontOnAxisZero = axisInner(axis).noOnMyZero;
    // Empirically, onZero causes weired effect when dataZoom is used on an "base axis". Consider
    // bar series as an example. And also consider when `SCALE_EXTENT_KIND_MAPPING` is used, where
    // the axis line is likely to cross the series shapes unexpectedly.
    return dontOnAxisZero && dontOnAxisZero.dz && dontOnAxisZero.base;
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
    const scale = axis.scale;
    return (isOrdinalScale(scale) ? scale.getLabel(tick) : tick.value) as any;
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

export function isNameLocationCenter(nameLocation: AxisBaseOptionCommon['nameLocation']) {
    return nameLocation === 'middle' || nameLocation === 'center';
}

export function shouldAxisShow(axisModel: AxisBaseModel): boolean {
    return axisModel.getShallow('show');
}

export function retrieveAxisBreaksOption(
    model: Model<Pick<AxisBaseOptionCommon, 'breaks'>>,
    axisType: OptionAxisType,
    coordSysSupportAxisBreaks: boolean,
): AxisBaseOptionCommon['breaks'] {
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
        if (!coordSysSupportAxisBreaks || !isAxisTypeSupportAxisBreak(axisType)) {
            if (__DEV__) { // Users have provided `breaks` in ec option but not supported.
                const axisInfo = (model instanceof ComponentModel)
                    ? ` ${model.type}[${model.componentIndex}]`
                    : '';
                error(`Axis${axisInfo} does not support break.`);
            }
            return undefined;
        }
        return option;
    }
}

function isAxisTypeSupportAxisBreak(axisType: OptionAxisType): boolean {
    return axisType !== 'category';
}

export function updateIntervalOrLogScaleForNiceOrAligned(
    scale: IntervalScale | LogScale,
    fixMinMax: ScaleExtentFixMinMax,
    oldIntervalExtent: number[],
    newIntervalExtent: number[],
    oldOutermostExtent: number[] | NullUndefined,
    cfg: IntervalScaleConfig
): void {
    const isTargetLogScale = isLogScale(scale);
    const intervalStub = isTargetLogScale ? scale.intervalStub : scale;
    intervalStub.setExtent(newIntervalExtent[0], newIntervalExtent[1]);

    if (isTargetLogScale) {
        // Sync intervalStub extent to the outermost extent (i.e., `powStub` for `LogScale`).
        const powStub = scale.powStub;
        const opt = {depth: SCALE_MAPPER_DEPTH_OUT_OF_BREAK} as const;
        let minPow = scale.transformOut(newIntervalExtent[0], opt);
        let maxPow = scale.transformOut(newIntervalExtent[1], opt);
        // Log transform is probably not inversible by rounding error, which causes min/max tick may be
        // displayed as `5.999999999999999` unexpectedly when min/max are required to be fixed (specified
        // by users or by dataZoom). Therefore we set `powStub` with respect to `oldOutermostExtent` if
        // interval extent is not changed. But `intervalStub` should not be inversely changed by this
        // handling, otherwise its monotonicity between `niceExtent` and `extent` may be broken and cause
        // unexpected ticks generation.
        const extentChanged = extentDiffers(oldIntervalExtent, newIntervalExtent);
        // NOTE: extent may still be changed even when min/max are required to be fixed,
        // e.g., by `intervalScaleEnsureValidExtent`.
        if (fixMinMax[0] && !extentChanged[0]) {
            minPow = oldOutermostExtent[0];
        }
        if (fixMinMax[1] && !extentChanged[1]) {
            maxPow = oldOutermostExtent[1];
        }
        powStub.setExtent(minPow, maxPow);
    }

    intervalStub.setConfig(cfg);
}

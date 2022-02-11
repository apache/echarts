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

import Displayable from 'zrender/src/graphic/Displayable';
import { ImageProps, ImageStyleProps } from 'zrender/src/graphic/Image';
import { PathProps, PathStyleProps } from 'zrender/src/graphic/Path';
import { ZRenderType } from 'zrender/src/zrender';
import { BarGridLayoutOptionForCustomSeries, BarGridLayoutResult } from '../../layout/barGrid';
import {
    AnimationOption,
    BlurScope,
    CallbackDataParams,
    Dictionary,
    DimensionLoose,
    ItemStyleOption,
    LabelOption,
    OptionDataValue,
    OrdinalRawValue,
    ParsedValue,
    SeriesDataType,
    SeriesEncodeOptionMixin,
    SeriesOnCalendarOptionMixin,
    SeriesOnCartesianOptionMixin,
    SeriesOnGeoOptionMixin,
    SeriesOnPolarOptionMixin,
    SeriesOnSingleOptionMixin,
    SeriesOption,
    TextCommonOption,
    ZRStyleProps
} from '../../util/types';
import Element from 'zrender/src/Element';
import SeriesData, { DefaultDataVisual } from '../../data/SeriesData';
import GlobalModel from '../../model/Global';
import createSeriesData from '../helper/createSeriesData';
import { makeInner } from '../../util/model';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import SeriesModel from '../../model/Series';
import {
    Arc,
    BezierCurve,
    Circle,
    CompoundPath,
    Ellipse,
    Line,
    Polygon,
    Polyline,
    Rect,
    Ring,
    Sector
} from '../../util/graphic';
import { TextProps, TextStyleProps } from 'zrender/src/graphic/Text';
import { GroupProps } from 'zrender/src/graphic/Group';
import {
    TransitionOptionMixin,
    TransitionBaseDuringAPI,
    TransitionDuringAPI
} from '../../animation/customGraphicTransition';
import { TransformProp } from 'zrender/src/core/Transformable';
import { ElementKeyframeAnimationOption } from '../../animation/customGraphicKeyframeAnimation';

export type CustomExtraElementInfo = Dictionary<unknown>;

// Also compat with ec4, where
// `visual('color') visual('borderColor')` is supported.
export const STYLE_VISUAL_TYPE = {
    color: 'fill',
    borderColor: 'stroke'
} as const;
export type StyleVisualProps = keyof typeof STYLE_VISUAL_TYPE;

export const NON_STYLE_VISUAL_PROPS = {
    symbol: 1,
    symbolSize: 1,
    symbolKeepAspect: 1,
    legendIcon: 1,
    visualMeta: 1,
    liftZ: 1,
    decal: 1
} as const;
export type NonStyleVisualProps = keyof typeof NON_STYLE_VISUAL_PROPS;

// Do not declare "Dictionary" in ElementTransitionOptions to restrict the type check.
type ShapeMorphingOption = {
    /**
     * If do shape morphing animation when type is changed.
     * Only available on path.
     */
    morph?: boolean
};

export interface CustomBaseElementOption extends Partial<Pick<
    Element, TransformProp | 'silent' | 'ignore' | 'textConfig'
>> {
    // element type, required.
    type: string;
    id?: string;
    // For animation diff.
    name?: string;
    info?: CustomExtraElementInfo;
    // `false` means remove the textContent.
    textContent?: CustomTextOption | false;
    // `false` means remove the clipPath
    clipPath?: CustomBaseZRPathOption | false;
    // `extra` can be set in any el option for custom prop for annimation duration.
    extra?: Dictionary<unknown> & TransitionOptionMixin;
    // updateDuringAnimation
    during?(params: TransitionBaseDuringAPI): void;

    enterAnimation?: AnimationOption
    updateAnimation?: AnimationOption
    leaveAnimation?: AnimationOption
};

export interface CustomDisplayableOption extends CustomBaseElementOption, Partial<Pick<
    Displayable, 'zlevel' | 'z' | 'z2' | 'invisible'
>> {
    style?: ZRStyleProps;
    during?(params: TransitionDuringAPI): void;
    /**
     * @deprecated
     */
    // `false` means remove emphasis trigger.
    styleEmphasis?: ZRStyleProps | false;
    emphasis?: CustomDisplayableOptionOnState;
    blur?: CustomDisplayableOptionOnState;
    select?: CustomDisplayableOptionOnState;
}
export interface CustomDisplayableOptionOnState extends Partial<Pick<
    Displayable, TransformProp | 'textConfig' | 'z2'
>> {
    // `false` means remove emphasis trigger.
    style?: ZRStyleProps | false;
}
export interface CustomGroupOption extends CustomBaseElementOption, TransitionOptionMixin<GroupProps>{
    type: 'group';
    width?: number;
    height?: number;
    // @deprecated
    diffChildrenByName?: boolean;
    children: CustomElementOption[];
    $mergeChildren?: false | 'byName' | 'byIndex';

    keyframeAnimation?: ElementKeyframeAnimationOption<GroupProps> | ElementKeyframeAnimationOption<GroupProps>[]
}
export interface CustomBaseZRPathOption<T extends PathProps['shape'] = PathProps['shape']>
    extends CustomDisplayableOption, ShapeMorphingOption, TransitionOptionMixin<PathProps & {shape: T}> {
    autoBatch?: boolean;
    shape?: T & TransitionOptionMixin<T>;
    style?: PathProps['style'] & TransitionOptionMixin<PathStyleProps>
    during?(params: TransitionDuringAPI<PathStyleProps, T>): void;

    keyframeAnimation?: ElementKeyframeAnimationOption<PathProps & { shape: T }>
        | ElementKeyframeAnimationOption<PathProps & { shape: T }>[]
}

interface BuiltinShapes {
    circle: Partial<Circle['shape']>
    rect: Partial<Rect['shape']>
    sector: Partial<Sector['shape']>
    polygon: Partial<Polygon['shape']>
    polyline: Partial<Polyline['shape']>
    line: Partial<Line['shape']>
    arc: Partial<Arc['shape']>
    bezierCurve: Partial<BezierCurve['shape']>
    ring: Partial<Ring['shape']>
    ellipse: Partial<Ellipse['shape']>
    compoundPath: Partial<CompoundPath['shape']>
}

interface CustomSVGPathShapeOption {
    // SVG Path, like 'M0,0 L0,-20 L70,-1 L70,0 Z'
    pathData?: string;
    // "d" is the alias of `pathData` follows the SVG convention.
    d?: string;
    layout?: 'center' | 'cover';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}
export interface CustomSVGPathOption extends CustomBaseZRPathOption<CustomSVGPathShapeOption> {
    type: 'path';
}

interface CustomBuitinPathOption<T extends keyof BuiltinShapes>
    extends CustomBaseZRPathOption<BuiltinShapes[T]> {
    type: T
}
type CreateCustomBuitinPathOption<T extends keyof BuiltinShapes> = T extends any
    ? CustomBuitinPathOption<T> : never;

export type CustomPathOption = CreateCustomBuitinPathOption<keyof BuiltinShapes>
    | CustomSVGPathOption;

export interface CustomImageOptionOnState extends CustomDisplayableOptionOnState {
    style?: ImageStyleProps;
}
export interface CustomImageOption extends CustomDisplayableOption, TransitionOptionMixin<ImageProps> {
    type: 'image';
    style?: ImageStyleProps & TransitionOptionMixin<ImageStyleProps>;
    emphasis?: CustomImageOptionOnState;
    blur?: CustomImageOptionOnState;
    select?: CustomImageOptionOnState;

    keyframeAnimation?: ElementKeyframeAnimationOption<ImageProps> | ElementKeyframeAnimationOption<ImageProps>[]
}

export interface CustomTextOptionOnState extends CustomDisplayableOptionOnState {
    style?: TextStyleProps;
}
export interface CustomTextOption extends CustomDisplayableOption, TransitionOptionMixin<TextProps> {
    type: 'text';
    style?: TextStyleProps & TransitionOptionMixin<TextStyleProps>;
    emphasis?: CustomTextOptionOnState;
    blur?: CustomTextOptionOnState;
    select?: CustomTextOptionOnState;

    keyframeAnimation?: ElementKeyframeAnimationOption<TextProps> | ElementKeyframeAnimationOption<TextProps>[]
}

export type CustomElementOption = CustomPathOption
    | CustomImageOption
    | CustomTextOption
    | CustomGroupOption;

// Can only set focus, blur on the root element.
export type CustomRootElementOption = CustomElementOption & {
    focus?: 'none' | 'self' | 'series' | ArrayLike<number>
    blurScope?: BlurScope

    emphasisDisabled?: boolean
};

export type CustomElementOptionOnState = CustomDisplayableOptionOnState
    | CustomImageOptionOnState;

export interface CustomSeriesRenderItemAPI extends
        CustomSeriesRenderItemCoordinateSystemAPI {

    // Methods from ExtensionAPI.
    // NOTE: Not using Pick<ExtensionAPI> here because we don't want to bundle ExtensionAPI into the d.ts
    getWidth(): number
    getHeight(): number
    getZr(): ZRenderType
    getDevicePixelRatio(): number

    value(dim: DimensionLoose, dataIndexInside?: number): ParsedValue;
    ordinalRawValue(dim: DimensionLoose, dataIndexInside?: number): ParsedValue | OrdinalRawValue;
    /**
     * @deprecated
     */
    style(userProps?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps;
    /**
     * @deprecated
     */
    styleEmphasis(userProps?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps;
    visual<VT extends NonStyleVisualProps | StyleVisualProps>(
        visualType: VT,
        dataIndexInside?: number
    ): VT extends NonStyleVisualProps ? DefaultDataVisual[VT]
        : VT extends StyleVisualProps ? PathStyleProps[typeof STYLE_VISUAL_TYPE[VT]]
        : void;
    barLayout(opt: BarGridLayoutOptionForCustomSeries): BarGridLayoutResult;
    currentSeriesIndices(): number[];
    font(opt: Pick<TextCommonOption, 'fontStyle' | 'fontWeight' | 'fontSize' | 'fontFamily'>): string;
}
export interface CustomSeriesRenderItemParamsCoordSys {
    type: string;
    // And extra params for each coordinate systems.
}
export interface CustomSeriesRenderItemCoordinateSystemAPI {
    coord(
        data: OptionDataValue | OptionDataValue[],
        clamp?: boolean
    ): number[];
    size?(
        dataSize: OptionDataValue | OptionDataValue[],
        dataItem?: OptionDataValue | OptionDataValue[]
    ): number | number[];
}

export type WrapEncodeDefRet = Dictionary<number[]>;

export interface CustomSeriesRenderItemParams {
    context: Dictionary<unknown>;
    dataIndex: number;
    seriesId: string;
    seriesName: string;
    seriesIndex: number;
    coordSys: CustomSeriesRenderItemParamsCoordSys;
    encode: WrapEncodeDefRet;

    dataIndexInside: number;
    dataInsideLength: number;

    actionType?: string;
}

export type CustomSeriesRenderItemReturn = CustomRootElementOption | undefined | null;

export type CustomSeriesRenderItem = (
    params: CustomSeriesRenderItemParams,
    api: CustomSeriesRenderItemAPI
) => CustomSeriesRenderItemReturn;

export interface CustomSeriesOption extends
    SeriesOption<unknown>,    // don't support StateOption in custom series.
    SeriesEncodeOptionMixin,
    SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin,
    SeriesOnSingleOptionMixin,
    SeriesOnGeoOptionMixin,
    SeriesOnCalendarOptionMixin {

    type?: 'custom'

    // If set as 'none', do not depends on coord sys.
    coordinateSystem?: string | 'none';

    renderItem?: CustomSeriesRenderItem;

    /**
     * @deprecated
     */
    itemStyle?: ItemStyleOption;
    /**
     * @deprecated
     */
    label?: LabelOption;

    /**
     * @deprecated
     */
    emphasis?: {
        /**
         * @deprecated
         */
        itemStyle?: ItemStyleOption;
        /**
         * @deprecated
         */
        label?: LabelOption;
    }

    // Only works on polar and cartesian2d coordinate system.
    clip?: boolean;
}

export const customInnerStore = makeInner<{
    info: CustomExtraElementInfo;
    customPathData: string;
    customGraphicType: string;
    customImagePath: CustomImageOption['style']['image'];
    // customText: string;
    txConZ2Set: number;
    option: CustomElementOption;
}, Element>();

export default class CustomSeriesModel extends SeriesModel<CustomSeriesOption> {

    static type = 'series.custom';
    readonly type = CustomSeriesModel.type;

    static dependencies = ['grid', 'polar', 'geo', 'singleAxis', 'calendar'];

    // preventAutoZ = true;

    currentZLevel: number;
    currentZ: number;

    static defaultOption: CustomSeriesOption = {
        coordinateSystem: 'cartesian2d', // Can be set as 'none'
        // zlevel: 0,
        z: 2,
        legendHoverLink: true,

        // Custom series will not clip by default.
        // Some case will use custom series to draw label
        // For example https://echarts.apache.org/examples/en/editor.html?c=custom-gantt-flight
        clip: false

        // Cartesian coordinate system
        // xAxisIndex: 0,
        // yAxisIndex: 0,

        // Polar coordinate system
        // polarIndex: 0,

        // Geo coordinate system
        // geoIndex: 0,
    };

    optionUpdated() {
        this.currentZLevel = this.get('zlevel', true);
        this.currentZ = this.get('z', true);
    }

    getInitialData(option: CustomSeriesOption, ecModel: GlobalModel): SeriesData {
        return createSeriesData(null, this);
    }

    getDataParams(dataIndex: number, dataType?: SeriesDataType, el?: Element): CallbackDataParams & {
        info: CustomExtraElementInfo
    } {
        const params = super.getDataParams(dataIndex, dataType) as ReturnType<CustomSeriesModel['getDataParams']>;
        el && (params.info = customInnerStore(el).info);
        return params;
    }
}

export type PrepareCustomInfo = (coordSys: CoordinateSystem) => {
    coordSys: CustomSeriesRenderItemParamsCoordSys;
    api: CustomSeriesRenderItemCoordinateSystemAPI
};

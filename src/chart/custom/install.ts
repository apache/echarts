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

import {
    hasOwn, assert, isString, retrieve2, retrieve3, defaults, each,
    keys, isArrayLike, bind, isFunction, eqNaN, indexOf, clone
} from 'zrender/src/core/util';
import * as graphicUtil from '../../util/graphic';
import { setDefaultStateProxy, enableHoverEmphasis } from '../../util/states';
import * as labelStyleHelper from '../../label/labelStyle';
import {getDefaultLabel} from '../helper/labelHelper';
import createListFromArray from '../helper/createListFromArray';
import {getLayoutOnAxis, BarGridLayoutResult, BarGridLayoutOptionForCustomSeries} from '../../layout/barGrid';
import DataDiffer, { DataDiffMode } from '../../data/DataDiffer';
import SeriesModel from '../../model/Series';
import Model from '../../model/Model';
import ChartView from '../../view/Chart';
import {createClipPath} from '../helper/createClipPathFromCoordSys';
import {
    EventQueryItem, SeriesOption, SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin, SeriesOnSingleOptionMixin, SeriesOnGeoOptionMixin,
    SeriesOnCalendarOptionMixin, ItemStyleOption, SeriesEncodeOptionMixin,
    DimensionLoose,
    ParsedValue,
    Dictionary,
    CallbackDataParams,
    Payload,
    StageHandlerProgressParams,
    LabelOption,
    ViewRootGroup,
    OptionDataValue,
    ZRStyleProps,
    DisplayState,
    ECElement,
    DisplayStateNonNormal,
    BlurScope,
    SeriesDataType,
    OrdinalRawValue,
    PayloadAnimationPart,
    DecalObject,
    InnerDecalObject,
    TextCommonOption,
    ECActionEvent
} from '../../util/types';
import Element, { ElementProps, ElementTextConfig } from 'zrender/src/Element';
import prepareCartesian2d from '../../coord/cartesian/prepareCustom';
import prepareGeo from '../../coord/geo/prepareCustom';
import prepareSingleAxis from '../../coord/single/prepareCustom';
import preparePolar from '../../coord/polar/prepareCustom';
import prepareCalendar from '../../coord/calendar/prepareCustom';
import List, { DefaultDataVisual } from '../../data/List';
import GlobalModel from '../../model/Global';
import { makeInner, normalizeToArray } from '../../util/model';
import ExtensionAPI from '../../core/ExtensionAPI';
import Displayable from 'zrender/src/graphic/Displayable';
import Axis2D from '../../coord/cartesian/Axis2D';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { PathProps, PathStyleProps } from 'zrender/src/graphic/Path';
import { ImageStyleProps } from 'zrender/src/graphic/Image';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import { TextStyleProps } from 'zrender/src/graphic/Text';
import {
    convertToEC4StyleForCustomSerise,
    isEC4CompatibleStyle,
    convertFromEC4CompatibleStyle,
    LegacyStyleProps,
    warnDeprecated
} from '../../util/styleCompat';
import Transformable from 'zrender/src/core/Transformable';
import { ItemStyleProps } from '../../model/mixin/itemStyle';
import { cloneValue } from 'zrender/src/animation/Animator';
import { warn, throwError } from '../../util/log';
import {
    combine, isInAnyMorphing, morphPath, isCombiningPath, CombineSeparateConfig, separate, CombineSeparateResult
} from 'zrender/src/tool/morphPath';
import { AnimationEasing } from 'zrender/src/animation/easing';
import * as matrix from 'zrender/src/core/matrix';
import { PatternObject } from 'zrender/src/graphic/Pattern';
import { createOrUpdatePatternFromDecal } from '../../util/decal';
import { ZRenderType } from 'zrender/src/zrender';
import { EChartsExtensionInstallRegisters } from '../../extension';


const inner = makeInner<{
    info: CustomExtraElementInfo;
    customPathData: string;
    customGraphicType: string;
    customImagePath: CustomImageOption['style']['image'];
    // customText: string;
    txConZ2Set: number;
    leaveToProps: ElementProps;
    // Can morph: "morph" specified in option and el is Path.
    canMorph: boolean;
    userDuring: CustomBaseElementOption['during'];
}, Element>();

type CustomExtraElementInfo = Dictionary<unknown>;
const TRANSFORM_PROPS = {
    x: 1,
    y: 1,
    scaleX: 1,
    scaleY: 1,
    originX: 1,
    originY: 1,
    rotation: 1
} as const;
type TransformProp = keyof typeof TRANSFORM_PROPS;
const transformPropNamesStr = keys(TRANSFORM_PROPS).join(', ');

// Do not declare "Dictionary" in TransitionAnyOption to restrict the type check.
type TransitionAnyOption = {
    transition?: TransitionAnyProps;
    enterFrom?: Dictionary<unknown>;
    leaveTo?: Dictionary<unknown>;
};
type TransitionAnyProps = string | string[];
type TransitionTransformOption = {
    transition?: ElementRootTransitionProp | ElementRootTransitionProp[];
    enterFrom?: Dictionary<unknown>;
    leaveTo?: Dictionary<unknown>;
};
type ElementRootTransitionProp = TransformProp | 'shape' | 'extra' | 'style';
type ShapeMorphingOption = {
    /**
     * If do shape morphing animation when type is changed.
     * Only available on path.
     */
    morph?: boolean
};

interface CustomBaseElementOption extends Partial<Pick<
    Element, TransformProp | 'silent' | 'ignore' | 'textConfig'
>>, TransitionTransformOption {
    // element type, mandatory.
    type: string;
    id?: string;
    // For animation diff.
    name?: string;
    info?: CustomExtraElementInfo;
    // `false` means remove the textContent.
    textContent?: CustomTextOption | false;
    // `false` means remove the clipPath
    clipPath?: CustomZRPathOption | false;
    // `extra` can be set in any el option for custom prop for annimation duration.
    extra?: TransitionAnyOption;
    // updateDuringAnimation
    during?(params: typeof customDuringAPI): void;

    focus?: 'none' | 'self' | 'series' | ArrayLike<number>
    blurScope?: BlurScope
};
interface CustomDisplayableOption extends CustomBaseElementOption, Partial<Pick<
    Displayable, 'zlevel' | 'z' | 'z2' | 'invisible'
>> {
    style?: ZRStyleProps & TransitionAnyOption;
    // `false` means remove emphasis trigger.
    styleEmphasis?: ZRStyleProps | false;
    emphasis?: CustomDisplayableOptionOnState;
    blur?: CustomDisplayableOptionOnState;
    select?: CustomDisplayableOptionOnState;
}
interface CustomDisplayableOptionOnState extends Partial<Pick<
    Displayable, TransformProp | 'textConfig' | 'z2'
>> {
    // `false` means remove emphasis trigger.
    style?: (ZRStyleProps & TransitionAnyOption) | false;
}
interface CustomGroupOption extends CustomBaseElementOption {
    type: 'group';
    width?: number;
    height?: number;
    // @deprecated
    diffChildrenByName?: boolean;
    // Can only set focus, blur on the root element.
    children: Omit<CustomElementOption, 'focus' | 'blurScope'>[];
    $mergeChildren: false | 'byName' | 'byIndex';
}
interface CustomZRPathOption extends CustomDisplayableOption, ShapeMorphingOption {
    shape?: PathProps['shape'] & TransitionAnyOption;
    style?: CustomDisplayableOption['style'] & {
        decal?: DecalObject;
        // Only internal usage. Any user specified value will be overwritten.
        __decalPattern?: PatternObject;
    };
}
interface CustomSVGPathOption extends CustomDisplayableOption, ShapeMorphingOption {
    type: 'path';
    shape?: {
        // SVG Path, like 'M0,0 L0,-20 L70,-1 L70,0 Z'
        pathData?: string;
        // "d" is the alias of `pathData` follows the SVG convention.
        d?: string;
        layout?: 'center' | 'cover';
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    } & TransitionAnyOption;
}
interface CustomImageOption extends CustomDisplayableOption {
    type: 'image';
    style?: ImageStyleProps & TransitionAnyOption;
    emphasis?: CustomImageOptionOnState;
    blur?: CustomImageOptionOnState;
    select?: CustomImageOptionOnState;
}
interface CustomImageOptionOnState extends CustomDisplayableOptionOnState {
    style?: ImageStyleProps & TransitionAnyOption;
}
interface CustomTextOption extends CustomDisplayableOption {
    type: 'text';
}
type CustomElementOption = CustomZRPathOption | CustomSVGPathOption | CustomImageOption | CustomTextOption;
type CustomElementOptionOnState = CustomDisplayableOptionOnState | CustomImageOptionOnState;


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
    style(userProps?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps;
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
interface CustomSeriesRenderItemParamsCoordSys {
    type: string;
    // And extra params for each coordinate systems.
}
interface CustomSeriesRenderItemCoordinateSystemAPI {
    coord(
        data: OptionDataValue | OptionDataValue[],
        clamp?: boolean
    ): number[];
    size?(
        dataSize: OptionDataValue | OptionDataValue[],
        dataItem: OptionDataValue | OptionDataValue[]
    ): number | number[];
}
export interface CustomSeriesRenderItemParams {
    context: Dictionary<unknown>;
    seriesId: string;
    seriesName: string;
    seriesIndex: number;
    coordSys: CustomSeriesRenderItemParamsCoordSys;
    dataInsideLength: number;
    encode: WrapEncodeDefRet;
}
type CustomSeriesRenderItem = (
    params: CustomSeriesRenderItemParams,
    api: CustomSeriesRenderItemAPI
) => CustomElementOption;

interface CustomSeriesStateOption {
    itemStyle?: ItemStyleOption;
    label?: LabelOption;
}

export interface CustomSeriesOption extends
    SeriesOption<never>,    // don't support StateOption in custom series.
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

    // Only works on polar and cartesian2d coordinate system.
    clip?: boolean;
}

interface LegacyCustomSeriesOption extends SeriesOption<CustomSeriesStateOption>, CustomSeriesStateOption {}


interface LooseElementProps extends ElementProps {
    style?: ZRStyleProps;
    shape?: Dictionary<unknown>;
}

// Also compat with ec4, where
// `visual('color') visual('borderColor')` is supported.
const STYLE_VISUAL_TYPE = {
    color: 'fill',
    borderColor: 'stroke'
} as const;
type StyleVisualProps = keyof typeof STYLE_VISUAL_TYPE;

const NON_STYLE_VISUAL_PROPS = {
    symbol: 1,
    symbolSize: 1,
    symbolKeepAspect: 1,
    legendSymbol: 1,
    visualMeta: 1,
    liftZ: 1,
    decal: 1
} as const;
type NonStyleVisualProps = keyof typeof NON_STYLE_VISUAL_PROPS;

const EMPHASIS = 'emphasis' as const;
const NORMAL = 'normal' as const;
const BLUR = 'blur' as const;
const SELECT = 'select' as const;
const STATES = [NORMAL, EMPHASIS, BLUR, SELECT] as const;
const PATH_ITEM_STYLE = {
    normal: ['itemStyle'],
    emphasis: [EMPHASIS, 'itemStyle'],
    blur: [BLUR, 'itemStyle'],
    select: [SELECT, 'itemStyle']
} as const;
const PATH_LABEL = {
    normal: ['label'],
    emphasis: [EMPHASIS, 'label'],
    blur: [BLUR, 'label'],
    select: [SELECT, 'label']
} as const;
// Use prefix to avoid index to be the same as el.name,
// which will cause weird update animation.
const GROUP_DIFF_PREFIX = 'e\0\0';

type AttachedTxInfo = {
    isLegacy: boolean;
    normal: {
        cfg: ElementTextConfig;
        conOpt: CustomElementOption | false;
    };
    emphasis: {
        cfg: ElementTextConfig;
        conOpt: CustomElementOptionOnState;
    };
    blur: {
        cfg: ElementTextConfig;
        conOpt: CustomElementOptionOnState;
    };
    select: {
        cfg: ElementTextConfig;
        conOpt: CustomElementOptionOnState;
    };
};
const attachedTxInfoTmp = {
    normal: {},
    emphasis: {},
    blur: {},
    select: {}
} as AttachedTxInfo;

const LEGACY_TRANSFORM_PROPS = {
    position: ['x', 'y'],
    scale: ['scaleX', 'scaleY'],
    origin: ['originX', 'originY']
} as const;
type LegacyTransformProp = keyof typeof LEGACY_TRANSFORM_PROPS;

export type PrepareCustomInfo = (coordSys: CoordinateSystem) => {
    coordSys: CustomSeriesRenderItemParamsCoordSys;
    api: CustomSeriesRenderItemCoordinateSystemAPI
};

const tmpTransformable = new Transformable();

/**
 * To reduce total package size of each coordinate systems, the modules `prepareCustom`
 * of each coordinate systems are not required by each coordinate systems directly, but
 * required by the module `custom`.
 *
 * prepareInfoForCustomSeries {Function}: optional
 *     @return {Object} {coordSys: {...}, api: {
 *         coord: function (data, clamp) {}, // return point in global.
 *         size: function (dataSize, dataItem) {} // return size of each axis in coordSys.
 *     }}
 */
const prepareCustoms: Dictionary<PrepareCustomInfo> = {
    cartesian2d: prepareCartesian2d,
    geo: prepareGeo,
    singleAxis: prepareSingleAxis,
    polar: preparePolar,
    calendar: prepareCalendar
};

class CustomSeriesModel extends SeriesModel<CustomSeriesOption> {

    static type = 'series.custom';
    readonly type = CustomSeriesModel.type;

    static dependencies = ['grid', 'polar', 'geo', 'singleAxis', 'calendar'];

    // preventAutoZ = true;

    currentZLevel: number;
    currentZ: number;

    static defaultOption: CustomSeriesOption = {
        coordinateSystem: 'cartesian2d', // Can be set as 'none'
        zlevel: 0,
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

    getInitialData(option: CustomSeriesOption, ecModel: GlobalModel): List {
        return createListFromArray(this.getSource(), this);
    }

    getDataParams(dataIndex: number, dataType?: SeriesDataType, el?: Element): CallbackDataParams & {
        info: CustomExtraElementInfo
    } {
        const params = super.getDataParams(dataIndex, dataType) as ReturnType<CustomSeriesModel['getDataParams']>;
        el && (params.info = inner(el).info);
        return params;
    }
}



class CustomSeriesView extends ChartView {

    static type = 'custom';
    readonly type = CustomSeriesView.type;

    private _data: List;


    render(
        customSeries: CustomSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ): void {
        const oldData = this._data;
        const data = customSeries.getData();
        const group = this.group;
        const renderItem = makeRenderItem(customSeries, data, ecModel, api);

        // By default, merge mode is applied. In most cases, custom series is
        // used in the scenario that data amount is not large but graphic elements
        // is complicated, where merge mode is probably necessary for optimization.
        // For example, reuse graphic elements and only update the transform when
        // roam or data zoom according to `actionType`.

        const transOpt = customSeries.__transientTransitionOpt;

        // Enable user to disable transition animation by both set
        // `from` and `to` dimension as `null`/`undefined`.
        if (transOpt && (transOpt.from == null || transOpt.to == null)) {
            oldData && oldData.each(function (oldIdx) {
                doRemoveEl(oldData.getItemGraphicEl(oldIdx), customSeries, group);
            });
            data.each(function (newIdx) {
                createOrUpdateItem(
                    api, null, newIdx, renderItem(newIdx, payload), customSeries, group, data, null
                );
            });
        }
        else {
            const morphPreparation = new MorphPreparation(customSeries, transOpt);
            const diffMode: DataDiffMode = transOpt ? 'multiple' : 'oneToOne';

            (new DataDiffer(
                oldData ? oldData.getIndices() : [],
                data.getIndices(),
                createGetKey(oldData, diffMode, transOpt && transOpt.from),
                createGetKey(data, diffMode, transOpt && transOpt.to),
                null,
                diffMode
            ))
            .add(function (newIdx) {
                createOrUpdateItem(
                    api, null, newIdx, renderItem(newIdx, payload), customSeries, group,
                    data, null
                );
            })
            .remove(function (oldIdx) {
                doRemoveEl(oldData.getItemGraphicEl(oldIdx), customSeries, group);
            })
            .update(function (newIdx, oldIdx) {
                morphPreparation.reset('oneToOne');
                let oldEl = oldData.getItemGraphicEl(oldIdx);
                morphPreparation.findAndAddFrom(oldEl);

                // PENDING:
                // if may morph, currently we alway recreate the whole el.
                // because if reuse some of the el in the group tree, the old el has to
                // be removed from the group, and consequently we can not calculate
                // the "global transition" of the old element.
                // But is there performance issue?
                if (morphPreparation.hasFrom()) {
                    removeElementDirectly(oldEl, group);
                    oldEl = null;
                }
                createOrUpdateItem(
                    api, oldEl, newIdx, renderItem(newIdx, payload), customSeries, group,
                    data, morphPreparation
                );
                morphPreparation.applyMorphing();
            })
            .updateManyToOne(function (newIdx, oldIndices) {
                morphPreparation.reset('manyToOne');
                for (let i = 0; i < oldIndices.length; i++) {
                    const oldEl = oldData.getItemGraphicEl(oldIndices[i]);
                    morphPreparation.findAndAddFrom(oldEl);
                    removeElementDirectly(oldEl, group);
                }
                createOrUpdateItem(
                    api, null, newIdx, renderItem(newIdx, payload), customSeries, group,
                    data, morphPreparation
                );
                morphPreparation.applyMorphing();
            })
            .updateOneToMany(function (newIndices, oldIdx) {
                morphPreparation.reset('oneToMany');
                const newLen = newIndices.length;
                const oldEl = oldData.getItemGraphicEl(oldIdx);
                morphPreparation.findAndAddFrom(oldEl);
                removeElementDirectly(oldEl, group);

                for (let i = 0; i < newLen; i++) {
                    createOrUpdateItem(
                        api, null, newIndices[i], renderItem(newIndices[i], payload), customSeries, group,
                        data, morphPreparation
                    );
                }
                morphPreparation.applyMorphing();
            })
            .execute();
        }

        // Do clipping
        const clipPath = customSeries.get('clip', true)
            ? createClipPath(customSeries.coordinateSystem, false, customSeries)
            : null;
        if (clipPath) {
            group.setClipPath(clipPath);
        }
        else {
            group.removeClipPath();
        }

        this._data = data;
    }

    incrementalPrepareRender(
        customSeries: CustomSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ): void {
        this.group.removeAll();
        this._data = null;
    }

    incrementalRender(
        params: StageHandlerProgressParams,
        customSeries: CustomSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ): void {
        const data = customSeries.getData();
        const renderItem = makeRenderItem(customSeries, data, ecModel, api);
        function setIncrementalAndHoverLayer(el: Displayable) {
            if (!el.isGroup) {
                el.incremental = true;
                el.ensureState('emphasis').hoverLayer = true;
            }
        }
        for (let idx = params.start; idx < params.end; idx++) {
            const el = createOrUpdateItem(
                null, null, idx, renderItem(idx, payload), customSeries, this.group, data, null
            );
            el.traverse(setIncrementalAndHoverLayer);
        }
    }

    filterForExposedEvent(
        eventType: string, query: EventQueryItem, targetEl: Element, packedEvent: ECActionEvent
    ): boolean {
        const elementName = query.element;
        if (elementName == null || targetEl.name === elementName) {
            return true;
        }

        // Enable to give a name on a group made by `renderItem`, and listen
        // events that triggerd by its descendents.
        while ((targetEl = (targetEl.__hostTarget || targetEl.parent)) && targetEl !== this.group) {
            if (targetEl.name === elementName) {
                return true;
            }
        }

        return false;
    }
}


function createGetKey(
    data: List,
    diffMode: DataDiffMode,
    dimension: DimensionLoose
) {
    if (!data) {
        return;
    }

    if (diffMode === 'oneToOne') {
        return function (rawIdx: number, dataIndex: number) {
            return data.getId(dataIndex);
        };
    }

    const diffByDimName = data.getDimension(dimension);
    const dimInfo = data.getDimensionInfo(diffByDimName);

    if (!dimInfo) {
        let errMsg = '';
        if (__DEV__) {
            errMsg = `${dimension} is not a valid dimension.`;
        }
        throwError(errMsg);
    }
    const ordinalMeta = dimInfo.ordinalMeta;
    return function (rawIdx: number, dataIndex: number) {
        let key = data.get(diffByDimName, dataIndex);
        if (ordinalMeta) {
            key = ordinalMeta.categories[key as number];
        }
        return (key == null || eqNaN(key))
            ? rawIdx + ''
            : '_ec_' + key;
    };
}


function createEl(elOption: CustomElementOption): Element {
    const graphicType = elOption.type;
    let el;

    // Those graphic elements are not shapes. They should not be
    // overwritten by users, so do them first.
    if (graphicType === 'path') {
        const shape = (elOption as CustomSVGPathOption).shape;
        // Using pathRect brings convenience to users sacle svg path.
        const pathRect = (shape.width != null && shape.height != null)
            ? {
                x: shape.x || 0,
                y: shape.y || 0,
                width: shape.width,
                height: shape.height
            } as RectLike
            : null;
        const pathData = getPathData(shape);
        // Path is also used for icon, so layout 'center' by default.
        el = graphicUtil.makePath(pathData, null, pathRect, shape.layout || 'center');
        inner(el).customPathData = pathData;
    }
    else if (graphicType === 'image') {
        el = new graphicUtil.Image({});
        inner(el).customImagePath = (elOption as CustomImageOption).style.image;
    }
    else if (graphicType === 'text') {
        el = new graphicUtil.Text({});
        // inner(el).customText = (elOption.style as TextStyleProps).text;
    }
    else if (graphicType === 'group') {
        el = new graphicUtil.Group();
    }
    else if (graphicType === 'compoundPath') {
        throw new Error('"compoundPath" is not supported yet.');
    }
    else {
        const Clz = graphicUtil.getShapeClass(graphicType);
        if (!Clz) {
            let errMsg = '';
            if (__DEV__) {
                errMsg = 'graphic type "' + graphicType + '" can not be found.';
            }
            throwError(errMsg);
        }
        el = new Clz();
    }

    inner(el).customGraphicType = graphicType;
    el.name = elOption.name;

    // Compat ec4: the default z2 lift is 1. If changing the number,
    // some cases probably be broken: hierarchy layout along z, like circle packing,
    // where emphasis only intending to modify color/border rather than lift z2.
    (el as ECElement).z2EmphasisLift = 1;
    (el as ECElement).z2SelectLift = 1;

    return el;
}

/**
 * ----------------------------------------------------------
 * [STRATEGY_MERGE] Merge properties or erase all properties:
 *
 * Based on the fact that the existing zr element probably be reused, we now consider whether
 * merge or erase all properties to the exsiting elements.
 * That is, if a certain props is not specified in the lastest return of `renderItem`:
 * + "Merge" means that do not modify the value on the existing element.
 * + "Erase all" means that use a default value to the existing element.
 *
 * "Merge" might bring some unexpected state retaining for users and "erase all" seams to be
 * more safe. "erase all" force users to specify all of the props each time, which is recommanded
 * in most cases.
 * But "erase all" theoretically disables the chance of performance optimization (e.g., just
 * generete shape and style at the first time rather than always do that).
 * So we still use "merge" rather than "erase all". If users need "erase all", they can
 * simple always set all of the props each time.
 * Some "object-like" config like `textConfig`, `textContent`, `style` which are not needed for
 * every elment, so we replace them only when user specify them. And the that is a total replace.
 *
 * TODO: there is no hint of 'isFirst' to users. So the performance enhancement can not be
 * performed yet. Consider the case:
 * (1) setOption to "mergeChildren" with a smaller children count
 * (2) Use dataZoom to make an item disappear.
 * (3) User dataZoom to make the item display again. At that time, renderItem need to return the
 * full option rather than partial option to recreate the element.
 *
 * ----------------------------------------------
 * [STRATEGY_NULL] `hasOwnProperty` or `== null`:
 *
 * Ditinguishing "own property" probably bring little trouble to user when make el options.
 * So we  trade a {xx: null} or {xx: undefined} as "not specified" if possible rather than
 * "set them to null/undefined". In most cases, props can not be cleared. Some typicall
 * clearable props like `style`/`textConfig`/`textContent` we enable `false` to means
 * "clear". In some othere special cases that the prop is able to set as null/undefined,
 * but not suitable to use `false`, `hasOwnProperty` is checked.
 *
 * ---------------------------------------------
 * [STRATEGY_TRANSITION] The rule of transition:
 * + For props on the root level of a element:
 *      If there is no `transition` specified, tansform props will be transitioned by default,
 *      which is the same as the previous setting in echarts4 and suitable for the scenario
 *      of dataZoom change.
 *      If `transition` specified, only the specified props will be transitioned.
 * + For props in `shape` and `style`:
 *      Only props specified in `transition` will be transitioned.
 * + Break:
 *      Since ec5, do not make transition to shape by default, because it might result in
 *      performance issue (especially `points` of polygon) and do not necessary in most cases.
 *
 * @return if `isMorphTo`, return `allPropsFinal`.
 */
function updateElNormal(
    // Can be null/undefined
    api: ExtensionAPI,
    el: Element,
    // Whether be a morph target.
    isMorphTo: boolean,
    dataIndex: number,
    elOption: CustomElementOption,
    styleOpt: CustomElementOption['style'],
    attachedTxInfo: AttachedTxInfo,
    seriesModel: CustomSeriesModel,
    isInit: boolean,
    isTextContent: boolean
): ElementProps {
    const transFromProps = {} as ElementProps;
    const allPropsFinal = {} as ElementProps;
    const elDisplayable = el.isGroup ? null : el as Displayable;

    // If be "morph to", delay the `updateElNormal` when all of the els in
    // this data item processed. Because at that time we can get all of the
    // "morph from" and make correct separate/combine.

    !isMorphTo && prepareShapeOrExtraTransitionFrom('shape', el, null, elOption, transFromProps, isInit);
    prepareShapeOrExtraAllPropsFinal('shape', elOption, allPropsFinal);
    !isMorphTo && prepareShapeOrExtraTransitionFrom('extra', el, null, elOption, transFromProps, isInit);
    prepareShapeOrExtraAllPropsFinal('extra', elOption, allPropsFinal);
    !isMorphTo && prepareTransformTransitionFrom(el, null, elOption, transFromProps, isInit);
    prepareTransformAllPropsFinal(elOption, allPropsFinal);

    const txCfgOpt = attachedTxInfo && attachedTxInfo.normal.cfg;
    if (txCfgOpt) {
        // PENDING: whether use user object directly rather than clone?
        // TODO:5.0 textConfig transition animation?
        el.setTextConfig(txCfgOpt);
    }

    if (el.type === 'text' && styleOpt) {
        const textOptionStyle = styleOpt as TextStyleProps;
        // Compatible with ec4: if `textFill` or `textStroke` exists use them.
        hasOwn(textOptionStyle, 'textFill') && (
            textOptionStyle.fill = (textOptionStyle as any).textFill
        );
        hasOwn(textOptionStyle, 'textStroke') && (
            textOptionStyle.stroke = (textOptionStyle as any).textStroke
        );
    }

    if (styleOpt) {
        let decalPattern;
        const decalObj = isPath(el) ? (styleOpt as CustomZRPathOption['style']).decal : null;
        if (api && decalObj) {
            (decalObj as InnerDecalObject).dirty = true;
            decalPattern = createOrUpdatePatternFromDecal(decalObj, api);
        }
        // Always overwrite in case user specify this prop.
        (styleOpt as CustomZRPathOption['style']).__decalPattern = decalPattern;
    }

    !isMorphTo && prepareStyleTransitionFrom(el, null, elOption, styleOpt, transFromProps, isInit);

    if (elDisplayable) {
        hasOwn(elOption, 'invisible') && (elDisplayable.invisible = elOption.invisible);
    }

    // If `isMorphTo`, we should not update these props to el directly, otherwise,
    // when applying morph finally, the original prop are missing for making "animation from".
    if (!isMorphTo) {
        applyPropsFinal(el, allPropsFinal, styleOpt);
        applyTransitionFrom(el, dataIndex, elOption, seriesModel, transFromProps, isInit);
    }

    // Merge by default.
    hasOwn(elOption, 'silent') && (el.silent = elOption.silent);
    hasOwn(elOption, 'ignore') && (el.ignore = elOption.ignore);

    if (!isTextContent) {
        // `elOption.info` enables user to mount some info on
        // elements and use them in event handlers.
        // Update them only when user specified, otherwise, remain.
        hasOwn(elOption, 'info') && (inner(el).info = elOption.info);
    }

    styleOpt ? el.dirty() : el.markRedraw();

    return isMorphTo ? allPropsFinal : null;
}

function applyPropsFinal(
    el: Element,
    // Can be null/undefined
    allPropsFinal: ElementProps,
    styleOpt: CustomElementOption['style']
) {
    const elDisplayable = el.isGroup ? null : el as Displayable;

    if (elDisplayable && styleOpt) {

        const decalPattern = (styleOpt as CustomZRPathOption['style']).__decalPattern;
        let originalDecalObj;
        if (decalPattern) {
            originalDecalObj = (styleOpt as CustomZRPathOption['style']).decal;
            (styleOpt as any).decal = decalPattern;
        }

        // PENDING: here the input style object is used directly.
        // Good for performance but bad for compatibility control.
        elDisplayable.useStyle(styleOpt);

        if (decalPattern) {
            (styleOpt as CustomZRPathOption['style']).decal = originalDecalObj;
        }

        // When style object changed, how to trade the existing animation?
        // It is probably conplicated and not needed to cover all the cases.
        // But still need consider the case:
        // (1) When using init animation on `style.opacity`, and before the animation
        //     ended users triggers an update by mousewhell. At that time the init
        //     animation should better be continued rather than terminated.
        //     So after `useStyle` called, we should change the animation target manually
        //     to continue the effect of the init animation.
        // (2) PENDING: If the previous animation targeted at a `val1`, and currently we need
        //     to update the value to `val2` and no animation declared, should be terminate
        //     the previous animation or just modify the target of the animation?
        //     Therotically That will happen not only on `style` but also on `shape` and
        //     `transfrom` props. But we haven't handle this case at present yet.
        // (3) PENDING: Is it proper to visit `animators` and `targetName`?
        const animators = elDisplayable.animators;
        for (let i = 0; i < animators.length; i++) {
            const animator = animators[i];
            // targetName is the "topKey".
            if (animator.targetName === 'style') {
                animator.changeTarget(elDisplayable.style);
            }
        }
    }

    // Set el to the final state firstly.
    allPropsFinal && el.attr(allPropsFinal);
}

function applyTransitionFrom(
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    // Can be null/undefined
    transFromProps: ElementProps,
    isInit: boolean
): void {
    if (transFromProps) {
        // Do not use `el.updateDuringAnimation` here becuase `el.updateDuringAnimation` will
        // be called mutiple time in each animation frame. For example, if both "transform" props
        // and shape props and style props changed, it will generate three animator and called
        // one-by-one in each animation frame.
        // We use the during in `animateTo/From` params.
        const userDuring = elOption.during;
        // For simplicity, if during not specified, the previous during will not work any more.
        inner(el).userDuring = userDuring;
        const cfgDuringCall = userDuring ? bind(duringCall, { el: el, userDuring: userDuring }) : null;
        const cfg = {
            dataIndex: dataIndex,
            isFrom: true,
            during: cfgDuringCall
        };
        isInit
            ? graphicUtil.initProps(el, transFromProps, seriesModel, cfg)
            : graphicUtil.updateProps(el, transFromProps, seriesModel, cfg);
    }
}


// See [STRATEGY_TRANSITION]
function prepareShapeOrExtraTransitionFrom(
    mainAttr: 'shape' | 'extra',
    el: Element,
    morphFromEl: graphicUtil.Path,
    elOption: CustomElementOption,
    transFromProps: LooseElementProps,
    isInit: boolean
): void {

    const attrOpt: Dictionary<unknown> & TransitionAnyOption = (elOption as any)[mainAttr];
    if (!attrOpt) {
        return;
    }

    const elPropsInAttr = (el as LooseElementProps)[mainAttr];
    let transFromPropsInAttr: Dictionary<unknown>;

    const enterFrom = attrOpt.enterFrom;
    if (isInit && enterFrom) {
        !transFromPropsInAttr && (transFromPropsInAttr = transFromProps[mainAttr] = {});
        const enterFromKeys = keys(enterFrom);
        for (let i = 0; i < enterFromKeys.length; i++) {
            // `enterFrom` props are not necessarily also declared in `shape`/`style`/...,
            // for example, `opacity` can only declared in `enterFrom` but not in `style`.
            const key = enterFromKeys[i];
            // Do not clone, animator will perform that clone.
            transFromPropsInAttr[key] = enterFrom[key];
        }
    }

    if (!isInit
        && elPropsInAttr
        // Just ignore shape animation in morphing.
        && !(morphFromEl != null && mainAttr === 'shape')
    ) {
        if (attrOpt.transition) {
            !transFromPropsInAttr && (transFromPropsInAttr = transFromProps[mainAttr] = {});
            const transitionKeys = normalizeToArray(attrOpt.transition);
            for (let i = 0; i < transitionKeys.length; i++) {
                const key = transitionKeys[i];
                const elVal = elPropsInAttr[key];
                if (__DEV__) {
                    checkNonStyleTansitionRefer(key, (attrOpt as any)[key], elVal);
                }
                // Do not clone, see `checkNonStyleTansitionRefer`.
                transFromPropsInAttr[key] = elVal;
            }
        }
        else if (indexOf(elOption.transition, mainAttr) >= 0) {
            !transFromPropsInAttr && (transFromPropsInAttr = transFromProps[mainAttr] = {});
            const elPropsInAttrKeys = keys(elPropsInAttr);
            for (let i = 0; i < elPropsInAttrKeys.length; i++) {
                const key = elPropsInAttrKeys[i];
                const elVal = elPropsInAttr[key];
                if (isNonStyleTransitionEnabled((attrOpt as any)[key], elVal)) {
                    transFromPropsInAttr[key] = elVal;
                }
            }
        }
    }

    const leaveTo = attrOpt.leaveTo;
    if (leaveTo) {
        const leaveToProps = getOrCreateLeaveToPropsFromEl(el);
        const leaveToPropsInAttr: Dictionary<unknown> = leaveToProps[mainAttr] || (leaveToProps[mainAttr] = {});
        const leaveToKeys = keys(leaveTo);
        for (let i = 0; i < leaveToKeys.length; i++) {
            const key = leaveToKeys[i];
            leaveToPropsInAttr[key] = leaveTo[key];
        }
    }
}

function prepareShapeOrExtraAllPropsFinal(
    mainAttr: 'shape' | 'extra',
    elOption: CustomElementOption,
    allProps: LooseElementProps
): void {
    const attrOpt: Dictionary<unknown> & TransitionAnyOption = (elOption as any)[mainAttr];
    if (!attrOpt) {
        return;
    }
    const allPropsInAttr = allProps[mainAttr] = {} as Dictionary<unknown>;
    const keysInAttr = keys(attrOpt);
    for (let i = 0; i < keysInAttr.length; i++) {
        const key = keysInAttr[i];
        // To avoid share one object with different element, and
        // to avoid user modify the object inexpectedly, have to clone.
        allPropsInAttr[key] = cloneValue((attrOpt as any)[key]);
    }
}

// See [STRATEGY_TRANSITION].
function prepareTransformTransitionFrom(
    el: Element,
    morphFromEl: graphicUtil.Path,
    elOption: CustomElementOption,
    transFromProps: ElementProps,
    isInit: boolean
): void {
    const enterFrom = elOption.enterFrom;
    if (isInit && enterFrom) {
        const enterFromKeys = keys(enterFrom);
        for (let i = 0; i < enterFromKeys.length; i++) {
            const key = enterFromKeys[i] as TransformProp;
            if (__DEV__) {
                checkTransformPropRefer(key, 'el.enterFrom');
            }
            // Do not clone, animator will perform that clone.
            transFromProps[key] = enterFrom[key] as number;
        }
    }

    if (!isInit) {
        // If morphing, force transition all transform props.
        // otherwise might have incorrect morphing animation.
        if (morphFromEl) {
            const fromTransformable = calcOldElLocalTransformBasedOnNewElParent(morphFromEl, el);
            setTransformPropToTransitionFrom(transFromProps, 'x', fromTransformable);
            setTransformPropToTransitionFrom(transFromProps, 'y', fromTransformable);
            setTransformPropToTransitionFrom(transFromProps, 'scaleX', fromTransformable);
            setTransformPropToTransitionFrom(transFromProps, 'scaleY', fromTransformable);
            setTransformPropToTransitionFrom(transFromProps, 'originX', fromTransformable);
            setTransformPropToTransitionFrom(transFromProps, 'originY', fromTransformable);
            setTransformPropToTransitionFrom(transFromProps, 'rotation', fromTransformable);
        }
        else if (elOption.transition) {
            const transitionKeys = normalizeToArray(elOption.transition);
            for (let i = 0; i < transitionKeys.length; i++) {
                const key = transitionKeys[i];
                if (key === 'style' || key === 'shape' || key === 'extra') {
                    continue;
                }
                const elVal = el[key];
                if (__DEV__) {
                    checkTransformPropRefer(key, 'el.transition');
                    checkNonStyleTansitionRefer(key, elOption[key], elVal);
                }
                // Do not clone, see `checkNonStyleTansitionRefer`.
                transFromProps[key] = elVal;
            }
        }
        // This default transition see [STRATEGY_TRANSITION]
        else {
            setTransformPropToTransitionFrom(transFromProps, 'x', el);
            setTransformPropToTransitionFrom(transFromProps, 'y', el);
        }
    }

    const leaveTo = elOption.leaveTo;
    if (leaveTo) {
        const leaveToProps = getOrCreateLeaveToPropsFromEl(el);
        const leaveToKeys = keys(leaveTo);
        for (let i = 0; i < leaveToKeys.length; i++) {
            const key = leaveToKeys[i] as TransformProp;
            if (__DEV__) {
                checkTransformPropRefer(key, 'el.leaveTo');
            }
            leaveToProps[key] = leaveTo[key] as number;
        }
    }
}

function prepareTransformAllPropsFinal(
    elOption: CustomElementOption,
    allProps: ElementProps
): void {
    setLagecyTransformProp(elOption, allProps, 'position');
    setLagecyTransformProp(elOption, allProps, 'scale');
    setLagecyTransformProp(elOption, allProps, 'origin');
    setTransformProp(elOption, allProps, 'x');
    setTransformProp(elOption, allProps, 'y');
    setTransformProp(elOption, allProps, 'scaleX');
    setTransformProp(elOption, allProps, 'scaleY');
    setTransformProp(elOption, allProps, 'originX');
    setTransformProp(elOption, allProps, 'originY');
    setTransformProp(elOption, allProps, 'rotation');
}

// See [STRATEGY_TRANSITION].
function prepareStyleTransitionFrom(
    el: Element,
    morphFromEl: graphicUtil.Path,
    elOption: CustomElementOption,
    styleOpt: CustomElementOption['style'],
    transFromProps: LooseElementProps,
    isInit: boolean
): void {
    if (!styleOpt) {
        return;
    }

    // At present in "many-to-one"/"one-to-many" case, to not support "many" have
    // different styles and make style transitions. That might be a rare case.
    const fromEl = morphFromEl || el;

    const fromElStyle = (fromEl as LooseElementProps).style as LooseElementProps['style'];
    let transFromStyleProps: LooseElementProps['style'];

    const enterFrom = styleOpt.enterFrom;
    if (isInit && enterFrom) {
        const enterFromKeys = keys(enterFrom);
        !transFromStyleProps && (transFromStyleProps = transFromProps.style = {});
        for (let i = 0; i < enterFromKeys.length; i++) {
            const key = enterFromKeys[i];
            // Do not clone, animator will perform that clone.
            (transFromStyleProps as any)[key] = enterFrom[key];
        }
    }

    if (!isInit && fromElStyle) {
        if (styleOpt.transition) {
            const transitionKeys = normalizeToArray(styleOpt.transition);
            !transFromStyleProps && (transFromStyleProps = transFromProps.style = {});
            for (let i = 0; i < transitionKeys.length; i++) {
                const key = transitionKeys[i];
                const elVal = (fromElStyle as any)[key];
                // Do not clone, see `checkNonStyleTansitionRefer`.
                (transFromStyleProps as any)[key] = elVal;
            }
        }
        else if (
            (el as Displayable).getAnimationStyleProps
            && indexOf(elOption.transition, 'style') >= 0
        ) {
            const animationProps = (el as Displayable).getAnimationStyleProps();
            const animationStyleProps = animationProps ? animationProps.style : null;
            if (animationStyleProps) {
                !transFromStyleProps && (transFromStyleProps = transFromProps.style = {});
                const styleKeys = keys(styleOpt);
                for (let i = 0; i < styleKeys.length; i++) {
                    const key = styleKeys[i];
                    if ((animationStyleProps as Dictionary<unknown>)[key]) {
                        const elVal = (fromElStyle as any)[key];
                        (transFromStyleProps as any)[key] = elVal;
                    }
                }
            }
        }
    }

    const leaveTo = styleOpt.leaveTo;
    if (leaveTo) {
        const leaveToKeys = keys(leaveTo);
        const leaveToProps = getOrCreateLeaveToPropsFromEl(el);
        const leaveToStyleProps = leaveToProps.style || (leaveToProps.style = {});
        for (let i = 0; i < leaveToKeys.length; i++) {
            const key = leaveToKeys[i];
            (leaveToStyleProps as any)[key] = leaveTo[key];
        }
    }
}

/**
 * If make "transform"(x/y/scaleX/scaleY/orient/originX/originY) transition between
 * two path elements that have different hierarchy, before we retrieve the "from" props,
 * we have to calculate the local transition of the "oldPath" based on the parent of
 * the "newPath".
 * At present, the case only happend in "morphing". Without morphing, the transform
 * transition are all between elements in the same hierarchy, where this kind of process
 * is not needed.
 *
 * [CAVEAT]:
 * This method makes sense only if: (very tricky)
 * (1) "newEl" has been added to its final parent.
 * (2) Local transform props of "newPath.parent" are not at their final value but already
 * have been at the "from value".
 *     This is currently ensured by:
 *     (2.1) "graphicUtil.animationFrom", which will set the element to the "from value"
 *     immediately.
 *     (2.2) "morph" option is not allowed to be set on Group, so all of the groups have
 *     been finished their "updateElNormal" when calling this method in morphing process.
 */
function calcOldElLocalTransformBasedOnNewElParent(oldEl: Element, newEl: Element): Transformable {
    if (!oldEl || oldEl === newEl || oldEl.parent === newEl.parent) {
        return oldEl;
    }

    // Not sure oldEl is rendered (may have "lazyUpdate"),
    // so always call `getComputedTransform`.
    const tmpM = tmpTransformable.transform
        || (tmpTransformable.transform = matrix.identity([]));

    const oldGlobalTransform = oldEl.getComputedTransform();
    oldGlobalTransform
        ? matrix.copy(tmpM, oldGlobalTransform)
        : matrix.identity(tmpM);

    const newParent = newEl.parent;
    if (newParent) {
        newParent.getComputedTransform();
    }

    tmpTransformable.originX = oldEl.originX;
    tmpTransformable.originY = oldEl.originY;
    tmpTransformable.parent = newParent;
    tmpTransformable.decomposeTransform();

    return tmpTransformable;
}

let checkNonStyleTansitionRefer: (propName: string, optVal: unknown, elVal: unknown) => void;
if (__DEV__) {
    checkNonStyleTansitionRefer = function (propName: string, optVal: unknown, elVal: unknown): void {
        if (!isArrayLike(optVal)) {
            assert(
                optVal != null && isFinite(optVal as number),
                'Prop `' + propName + '` must refer to a finite number or ArrayLike for transition.'
            );
        }
        else {
            // Try not to copy array for performance, but if user use the same object in different
            // call of `renderItem`, it will casue animation transition fail.
            assert(
                optVal !== elVal,
                'Prop `' + propName + '` must use different Array object each time for transition.'
            );
        }
    };
}

function isNonStyleTransitionEnabled(optVal: unknown, elVal: unknown): boolean {
    // The same as `checkNonStyleTansitionRefer`.
    return !isArrayLike(optVal)
        ? (optVal != null && isFinite(optVal as number))
        : optVal !== elVal;
}

let checkTransformPropRefer: (key: string, usedIn: string) => void;
if (__DEV__) {
    checkTransformPropRefer = function (key: string, usedIn: string): void {
        assert(
            hasOwn(TRANSFORM_PROPS, key),
            'Prop `' + key + '` is not a permitted in `' + usedIn + '`. '
                + 'Only `' + keys(TRANSFORM_PROPS).join('`, `') + '` are permitted.'
        );
    };
}

function getOrCreateLeaveToPropsFromEl(el: Element): LooseElementProps {
    const innerEl = inner(el);
    return innerEl.leaveToProps || (innerEl.leaveToProps = {});
}

// Use it to avoid it be exposed to user.
const tmpDuringScope = {} as {
    el: Element;
    isShapeDirty: boolean;
    isStyleDirty: boolean;
};
const customDuringAPI = {
    // Usually other props do not need to be changed in animation during.
    setTransform(key: TransformProp, val: unknown) {
        if (__DEV__) {
            assert(hasOwn(TRANSFORM_PROPS, key), 'Only ' + transformPropNamesStr + ' available in `setTransform`.');
        }
        tmpDuringScope.el[key] = val as number;
        return this;
    },
    getTransform(key: TransformProp): unknown {
        if (__DEV__) {
            assert(hasOwn(TRANSFORM_PROPS, key), 'Only ' + transformPropNamesStr + ' available in `getTransform`.');
        }
        return tmpDuringScope.el[key];
    },
    setShape(key: string, val: unknown) {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const shape = (tmpDuringScope.el as graphicUtil.Path).shape
            || ((tmpDuringScope.el as graphicUtil.Path).shape = {});
        shape[key] = val;
        tmpDuringScope.isShapeDirty = true;
        return this;
    },
    getShape(key: string): unknown {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const shape = (tmpDuringScope.el as graphicUtil.Path).shape;
        if (shape) {
            return shape[key];
        }
    },
    setStyle(key: string, val: unknown) {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const style = (tmpDuringScope.el as Displayable).style;
        if (style) {
            if (__DEV__) {
                if (eqNaN(val)) {
                    warn('style.' + key + ' must not be assigned with NaN.');
                }
            }
            style[key] = val;
            tmpDuringScope.isStyleDirty = true;
        }
        return this;
    },
    getStyle(key: string): unknown {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const style = (tmpDuringScope.el as Displayable).style;
        if (style) {
            return style[key];
        }
    },
    setExtra(key: string, val: unknown) {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const extra = (tmpDuringScope.el as LooseElementProps).extra
            || ((tmpDuringScope.el as LooseElementProps).extra = {});
        extra[key] = val;
        return this;
    },
    getExtra(key: string): unknown {
        if (__DEV__) {
            assertNotReserved(key);
        }
        const extra = (tmpDuringScope.el as LooseElementProps).extra;
        if (extra) {
            return extra[key];
        }
    }
};

function assertNotReserved(key: string) {
    if (__DEV__) {
        if (key === 'transition' || key === 'enterFrom' || key === 'leaveTo') {
            throw new Error('key must not be "' + key + '"');
        }
    }
}

function duringCall(
    this: {
        el: Element;
        userDuring: CustomBaseElementOption['during']
    }
): void {
    // Do not provide "percent" until some requirements come.
    // Because consider thies case:
    // enterFrom: {x: 100, y: 30}, transition: 'x'.
    // And enter duration is different from update duration.
    // Thus it might be confused about the meaning of "percent" in during callback.
    const scope = this;
    const el = scope.el;
    if (!el) {
        return;
    }
    // If el is remove from zr by reason like legend, during still need to called,
    // becuase el will be added back to zr and the prop value should not be incorrect.

    const newstUserDuring = inner(el).userDuring;
    const scopeUserDuring = scope.userDuring;
    // Ensured a during is only called once in each animation frame.
    // If a during is called multiple times in one frame, maybe some users' calulation logic
    // might be wrong (not sure whether this usage exists).
    // The case of a during might be called twice can be: by default there is a animator for
    // 'x', 'y' when init. Before the init animation finished, call `setOption` to start
    // another animators for 'style'/'shape'/'extra'.
    if (newstUserDuring !== scopeUserDuring) {
        // release
        scope.el = scope.userDuring = null;
        return;
    }

    tmpDuringScope.el = el;
    tmpDuringScope.isShapeDirty = false;
    tmpDuringScope.isStyleDirty = false;

    // Give no `this` to user in "during" calling.
    scopeUserDuring(customDuringAPI);

    if (tmpDuringScope.isShapeDirty && (el as graphicUtil.Path).dirtyShape) {
        (el as graphicUtil.Path).dirtyShape();
    }
    if (tmpDuringScope.isStyleDirty && (el as Displayable).dirtyStyle) {
        (el as Displayable).dirtyStyle();
    }
    // markRedraw() will be called by default in during.
    // FIXME `this.markRedraw();` directly ?

    // FIXME: if in future meet the case that some prop will be both modified in `during` and `state`,
    // consider the issue that the prop might be incorrect when return to "normal" state.
}

function updateElOnState(
    state: DisplayStateNonNormal,
    el: Element,
    elStateOpt: CustomElementOptionOnState,
    styleOpt: CustomElementOptionOnState['style'],
    attachedTxInfo: AttachedTxInfo,
    isRoot: boolean,
    isTextContent: boolean
): void {
    const elDisplayable = el.isGroup ? null : el as Displayable;
    const txCfgOpt = attachedTxInfo && attachedTxInfo[state].cfg;

    // PENDING:5.0 support customize scale change and transition animation?

    if (elDisplayable) {
        // By default support auto lift color when hover whether `emphasis` specified.
        const stateObj = elDisplayable.ensureState(state);
        if (styleOpt === false) {
            const existingEmphasisState = elDisplayable.getState(state);
            if (existingEmphasisState) {
                existingEmphasisState.style = null;
            }
        }
        else {
            // style is needed to enable defaut emphasis.
            stateObj.style = styleOpt || null;
        }
        // If `elOption.styleEmphasis` or `elOption.emphasis.style` is `false`,
        // remove hover style.
        // If `elOption.textConfig` or `elOption.emphasis.textConfig` is null/undefined, it does not
        // make sense. So for simplicity, we do not ditinguish `hasOwnProperty` and null/undefined.
        if (txCfgOpt) {
            stateObj.textConfig = txCfgOpt;
        }

        setDefaultStateProxy(elDisplayable);
    }
}

function updateZ(
    el: Element,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    attachedTxInfo: AttachedTxInfo
): void {
    // Group not support textContent and not support z yet.
    if (el.isGroup) {
        return;
    }

    const elDisplayable = el as Displayable;
    const currentZ = seriesModel.currentZ;
    const currentZLevel = seriesModel.currentZLevel;
    // Always erase.
    elDisplayable.z = currentZ;
    elDisplayable.zlevel = currentZLevel;
    // z2 must not be null/undefined, otherwise sort error may occur.
    const optZ2 = elOption.z2;
    optZ2 != null && (elDisplayable.z2 = optZ2 || 0);

    for (let i = 0; i < STATES.length; i++) {
        updateZForEachState(elDisplayable, elOption, STATES[i]);
    }
}

function updateZForEachState(
    elDisplayable: Displayable,
    elOption: CustomDisplayableOption,
    state: DisplayState
): void {
    const isNormal = state === NORMAL;
    const elStateOpt = isNormal ? elOption : retrieveStateOption(elOption, state as DisplayStateNonNormal);
    const optZ2 = elStateOpt ? elStateOpt.z2 : null;
    let stateObj;
    if (optZ2 != null) {
        // Do not `ensureState` until required.
        stateObj = isNormal ? elDisplayable : elDisplayable.ensureState(state);
        stateObj.z2 = optZ2 || 0;
    }
}

function setLagecyTransformProp(
    elOption: CustomElementOption,
    targetProps: Partial<Pick<Transformable, TransformProp>>,
    legacyName: LegacyTransformProp,
    fromTransformable?: Transformable // If provided, retrieve from the element.
): void {
    const legacyArr = (elOption as any)[legacyName];
    const xyName = LEGACY_TRANSFORM_PROPS[legacyName];
    if (legacyArr) {
        if (fromTransformable) {
            targetProps[xyName[0]] = fromTransformable[xyName[0]];
            targetProps[xyName[1]] = fromTransformable[xyName[1]];
        }
        else {
            targetProps[xyName[0]] = legacyArr[0];
            targetProps[xyName[1]] = legacyArr[1];
        }
    }
}

function setTransformProp(
    elOption: CustomElementOption,
    allProps: Partial<Pick<Transformable, TransformProp>>,
    name: TransformProp,
    fromTransformable?: Transformable // If provided, retrieve from the element.
): void {
    if (elOption[name] != null) {
        allProps[name] = fromTransformable ? fromTransformable[name] : elOption[name];
    }
}

function setTransformPropToTransitionFrom(
    transitionFrom: Partial<Pick<Transformable, TransformProp>>,
    name: TransformProp,
    fromTransformable?: Transformable // If provided, retrieve from the element.
): void {
    if (fromTransformable) {
        transitionFrom[name] = fromTransformable[name];
    }
}


function makeRenderItem(
    customSeries: CustomSeriesModel,
    data: List<CustomSeriesModel>,
    ecModel: GlobalModel,
    api: ExtensionAPI
) {
    const renderItem = customSeries.get('renderItem');
    const coordSys = customSeries.coordinateSystem;
    let prepareResult = {} as ReturnType<PrepareCustomInfo>;

    if (coordSys) {
        if (__DEV__) {
            assert(renderItem, 'series.render is required.');
            assert(
                coordSys.prepareCustoms || prepareCustoms[coordSys.type],
                'This coordSys does not support custom series.'
            );
        }

        // `coordSys.prepareCustoms` is used for external coord sys like bmap.
        prepareResult = coordSys.prepareCustoms
            ? coordSys.prepareCustoms(coordSys)
            : prepareCustoms[coordSys.type](coordSys);
    }

    const userAPI = defaults({
        getWidth: api.getWidth,
        getHeight: api.getHeight,
        getZr: api.getZr,
        getDevicePixelRatio: api.getDevicePixelRatio,
        value: value,
        style: style,
        ordinalRawValue: ordinalRawValue,
        styleEmphasis: styleEmphasis,
        visual: visual,
        barLayout: barLayout,
        currentSeriesIndices: currentSeriesIndices,
        font: font
    }, prepareResult.api || {}) as CustomSeriesRenderItemAPI;

    const userParams: CustomSeriesRenderItemParams = {
        // The life cycle of context: current round of rendering.
        // The global life cycle is probably not necessary, because
        // user can store global status by themselves.
        context: {},
        seriesId: customSeries.id,
        seriesName: customSeries.name,
        seriesIndex: customSeries.seriesIndex,
        coordSys: prepareResult.coordSys,
        dataInsideLength: data.count(),
        encode: wrapEncodeDef(customSeries.getData())
    };

    // If someday intending to refactor them to a class, should consider do not
    // break change: currently these attribute member are encapsulated in a closure
    // so that do not need to force user to call these method with a scope.

    // Do not support call `api` asynchronously without dataIndexInside input.
    let currDataIndexInside: number;
    let currItemModel: Model<LegacyCustomSeriesOption>;
    let currItemStyleModels: Partial<Record<DisplayState, Model<LegacyCustomSeriesOption['itemStyle']>>> = {};
    let currLabelModels: Partial<Record<DisplayState, Model<LegacyCustomSeriesOption['label']>>> = {};

    const seriesItemStyleModels = {} as Record<DisplayState, Model<LegacyCustomSeriesOption['itemStyle']>>;

    const seriesLabelModels = {} as Record<DisplayState, Model<LegacyCustomSeriesOption['label']>>;

    for (let i = 0; i < STATES.length; i++) {
        const stateName = STATES[i];
        seriesItemStyleModels[stateName] = (customSeries as Model<LegacyCustomSeriesOption>)
            .getModel(PATH_ITEM_STYLE[stateName]);
        seriesLabelModels[stateName] = (customSeries as Model<LegacyCustomSeriesOption>)
            .getModel(PATH_LABEL[stateName]);
    }

    function getItemModel(dataIndexInside: number): Model<LegacyCustomSeriesOption> {
        return dataIndexInside === currDataIndexInside
            ? (currItemModel || (currItemModel = data.getItemModel(dataIndexInside)))
            : data.getItemModel(dataIndexInside);
    }
    function getItemStyleModel(dataIndexInside: number, state: DisplayState) {
        return !data.hasItemOption
            ? seriesItemStyleModels[state]
            : dataIndexInside === currDataIndexInside
            ? (currItemStyleModels[state] || (
                currItemStyleModels[state] = getItemModel(dataIndexInside).getModel(PATH_ITEM_STYLE[state])
            ))
            : getItemModel(dataIndexInside).getModel(PATH_ITEM_STYLE[state]);
    }
    function getLabelModel(dataIndexInside: number, state: DisplayState) {
        return !data.hasItemOption
            ? seriesLabelModels[state]
            : dataIndexInside === currDataIndexInside
            ? (currLabelModels[state] || (
                currLabelModels[state] = getItemModel(dataIndexInside).getModel(PATH_LABEL[state])
            ))
            : getItemModel(dataIndexInside).getModel(PATH_LABEL[state]);
    }

    return function (dataIndexInside: number, payload: Payload): CustomElementOption {
        currDataIndexInside = dataIndexInside;
        currItemModel = null;
        currItemStyleModels = {};
        currLabelModels = {};

        return renderItem && renderItem(
            defaults({
                dataIndexInside: dataIndexInside,
                dataIndex: data.getRawIndex(dataIndexInside),
                // Can be used for optimization when zoom or roam.
                actionType: payload ? payload.type : null
            }, userParams),
            userAPI
        );
    };

    /**
     * @public
     * @param dim by default 0.
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function value(dim?: DimensionLoose, dataIndexInside?: number): ParsedValue {
        dataIndexInside == null && (dataIndexInside = currDataIndexInside);
        return data.get(data.getDimension(dim || 0), dataIndexInside);
    }

    /**
     * @public
     * @param dim by default 0.
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function ordinalRawValue(dim?: DimensionLoose, dataIndexInside?: number): ParsedValue | OrdinalRawValue {
        dataIndexInside == null && (dataIndexInside = currDataIndexInside);
        const dimInfo = data.getDimensionInfo(dim || 0);
        if (!dimInfo) {
            return;
        }
        const val = data.get(dimInfo.name, dataIndexInside);
        const ordinalMeta = dimInfo && dimInfo.ordinalMeta;
        return ordinalMeta
            ? ordinalMeta.categories[val as number]
            : val;
    }

    /**
     * @deprecated The orgininal intention of `api.style` is enable to set itemStyle
     * like other series. But it not necessary and not easy to give a strict definition
     * of what it return. And since echarts5 it needs to be make compat work. So
     * deprecates it since echarts5.
     *
     * By default, `visual` is applied to style (to support visualMap).
     * `visual.color` is applied at `fill`. If user want apply visual.color on `stroke`,
     * it can be implemented as:
     * `api.style({stroke: api.visual('color'), fill: null})`;
     *
     * [Compat]: since ec5, RectText has been separated from its hosts el.
     * so `api.style()` will only return the style from `itemStyle` but not handle `label`
     * any more. But `series.label` config is never published in doc.
     * We still compat it in `api.style()`. But not encourage to use it and will still not
     * to pulish it to doc.
     * @public
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function style(userProps?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps {
        if (__DEV__) {
            warnDeprecated('api.style', 'Please write literal style directly instead.');
        }

        dataIndexInside == null && (dataIndexInside = currDataIndexInside);

        const style = data.getItemVisual(dataIndexInside, 'style');
        const visualColor = style && style.fill;
        const opacity = style && style.opacity;

        let itemStyle = getItemStyleModel(dataIndexInside, NORMAL).getItemStyle();
        visualColor != null && (itemStyle.fill = visualColor);
        opacity != null && (itemStyle.opacity = opacity);

        const opt = {inheritColor: isString(visualColor) ? visualColor : '#000'};
        const labelModel = getLabelModel(dataIndexInside, NORMAL);
        // Now that the feture of "auto adjust text fill/stroke" has been migrated to zrender
        // since ec5, we should set `isAttached` as `false` here and make compat in
        // `convertToEC4StyleForCustomSerise`.
        const textStyle = labelStyleHelper.createTextStyle(labelModel, null, opt, false, true);
        textStyle.text = labelModel.getShallow('show')
            ? retrieve2(
                customSeries.getFormattedLabel(dataIndexInside, NORMAL),
                getDefaultLabel(data, dataIndexInside)
            )
            : null;
        const textConfig = labelStyleHelper.createTextConfig(labelModel, opt, false);

        preFetchFromExtra(userProps, itemStyle);
        itemStyle = convertToEC4StyleForCustomSerise(itemStyle, textStyle, textConfig);

        userProps && applyUserPropsAfter(itemStyle, userProps);
        (itemStyle as LegacyStyleProps).legacy = true;

        return itemStyle;
    }

    /**
     * @deprecated The reason see `api.style()`
     * @public
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function styleEmphasis(userProps?: ZRStyleProps, dataIndexInside?: number): ZRStyleProps {
        if (__DEV__) {
            warnDeprecated('api.styleEmphasis', 'Please write literal style directly instead.');
        }

        dataIndexInside == null && (dataIndexInside = currDataIndexInside);

        let itemStyle = getItemStyleModel(dataIndexInside, EMPHASIS).getItemStyle();
        const labelModel = getLabelModel(dataIndexInside, EMPHASIS);
        const textStyle = labelStyleHelper.createTextStyle(labelModel, null, null, true, true);
        textStyle.text = labelModel.getShallow('show')
            ? retrieve3(
                customSeries.getFormattedLabel(dataIndexInside, EMPHASIS),
                customSeries.getFormattedLabel(dataIndexInside, NORMAL),
                getDefaultLabel(data, dataIndexInside)
            )
            : null;
        const textConfig = labelStyleHelper.createTextConfig(labelModel, null, true);

        preFetchFromExtra(userProps, itemStyle);
        itemStyle = convertToEC4StyleForCustomSerise(itemStyle, textStyle, textConfig);

        userProps && applyUserPropsAfter(itemStyle, userProps);
        (itemStyle as LegacyStyleProps).legacy = true;

        return itemStyle;
    }

    function applyUserPropsAfter(itemStyle: ZRStyleProps, extra: ZRStyleProps): void {
        for (const key in extra) {
            if (hasOwn(extra, key)) {
                (itemStyle as any)[key] = (extra as any)[key];
            }
        }
    }

    function preFetchFromExtra(extra: ZRStyleProps, itemStyle: ItemStyleProps): void {
        // A trick to retrieve those props firstly, which are used to
        // apply auto inside fill/stroke in `convertToEC4StyleForCustomSerise`.
        // (It's not reasonable but only for a degree of compat)
        if (extra) {
            (extra as any).textFill && ((itemStyle as any).textFill = (extra as any).textFill);
            (extra as any).textPosition && ((itemStyle as any).textPosition = (extra as any).textPosition);
        }
    }

    /**
     * @public
     * @param dataIndexInside by default `currDataIndexInside`.
     */
    function visual<VT extends NonStyleVisualProps | StyleVisualProps>(
        visualType: VT,
        dataIndexInside?: number
    ): VT extends NonStyleVisualProps ? DefaultDataVisual[VT]
            : VT extends StyleVisualProps ? PathStyleProps[typeof STYLE_VISUAL_TYPE[VT]]
            : never {

        dataIndexInside == null && (dataIndexInside = currDataIndexInside);

        if (hasOwn(STYLE_VISUAL_TYPE, visualType)) {
            const style = data.getItemVisual(dataIndexInside, 'style');
            return style
                ? style[STYLE_VISUAL_TYPE[visualType as StyleVisualProps]] as any
                : null;
        }
        // Only support these visuals. Other visual might be inner tricky
        // for performance (like `style`), do not expose to users.
        if (hasOwn(NON_STYLE_VISUAL_PROPS, visualType)) {
            return data.getItemVisual(dataIndexInside, visualType as NonStyleVisualProps) as any;
        }
    }

    /**
     * @public
     * @return If not support, return undefined.
     */
    function barLayout(
        opt: Omit<Parameters<typeof getLayoutOnAxis>[0], 'axis'>
    ): ReturnType<typeof getLayoutOnAxis> {
        if (coordSys.type === 'cartesian2d') {
            const baseAxis = coordSys.getBaseAxis() as Axis2D;
            return getLayoutOnAxis(defaults({axis: baseAxis}, opt));
        }
    }

    /**
     * @public
     */
    function currentSeriesIndices(): ReturnType<GlobalModel['getCurrentSeriesIndices']> {
        return ecModel.getCurrentSeriesIndices();
    }

    /**
     * @public
     * @return font string
     */
    function font(
        opt: Parameters<typeof labelStyleHelper.getFont>[0]
    ): ReturnType<typeof labelStyleHelper.getFont> {
        return labelStyleHelper.getFont(opt, ecModel);
    }
}

type WrapEncodeDefRet = Dictionary<number[]>;

function wrapEncodeDef(data: List<CustomSeriesModel>): WrapEncodeDefRet {
    const encodeDef = {} as WrapEncodeDefRet;
    each(data.dimensions, function (dimName, dataDimIndex) {
        const dimInfo = data.getDimensionInfo(dimName);
        if (!dimInfo.isExtraCoord) {
            const coordDim = dimInfo.coordDim;
            const dataDims = encodeDef[coordDim] = encodeDef[coordDim] || [];
            dataDims[dimInfo.coordDimIndex] = dataDimIndex;
        }
    });
    return encodeDef;
}

function createOrUpdateItem(
    api: ExtensionAPI,
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    group: ViewRootGroup,
    data: List<CustomSeriesModel>,
    morphPreparation: MorphPreparation
): Element {
    // [Rule]
    // If `renderItem` returns `null`/`undefined`/`false`, remove the previous el if existing.
    //     (It seems that violate the "merge" principle, but most of users probably intuitively
    //     regard "return;" as "show nothing element whatever", so make a exception to meet the
    //     most cases.)
    // The rule or "merge" see [STRATEGY_MERGE].

    // If `elOption` is `null`/`undefined`/`false` (when `renderItem` returns nothing).
    if (!elOption) {
        removeElementDirectly(el, group);
        return;
    }
    el = doCreateOrUpdateEl(api, el, dataIndex, elOption, seriesModel, group, true, morphPreparation);
    el && data.setItemGraphicEl(dataIndex, el);

    enableHoverEmphasis(el, elOption.focus, elOption.blurScope);

    return el;
}

function doCreateOrUpdateEl(
    api: ExtensionAPI,
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    group: ViewRootGroup,
    isRoot: boolean,
    morphPreparation: MorphPreparation
): Element {

    if (__DEV__) {
        assert(elOption, 'should not have an null/undefined element setting');
    }

    let toBeReplacedIdx = -1;
    if (
        el && (
            doesElNeedRecreate(el, elOption)
            // || (
            //     // PENDING: even in one-to-one mapping case, if el is marked as morph,
            //     // do not sure whether the el will be mapped to another el with different
            //     // hierarchy in Group tree. So always recreate el rather than reuse the el.
            //     morphPreparation && morphPreparation.isOneToOneFrom(el)
            // )
        )
    ) {
        // Should keep at the original index, otherwise "merge by index" will be incorrect.
        toBeReplacedIdx = group.childrenRef().indexOf(el);
        el = null;
    }

    const elIsNewCreated = !el;

    if (!el) {
        el = createEl(elOption);
    }
    else {
        // FIMXE:NEXT unified clearState?
        // If in some case the performance issue arised, consider
        // do not clearState but update cached normal state directly.
        el.clearStates();
    }

    const canMorph = inner(el).canMorph = (elOption as CustomZRPathOption).morph && isPath(el);
    const thisElIsMorphTo = canMorph && morphPreparation && morphPreparation.hasFrom();

    // Use update animation when morph is enabled.
    const isInit = elIsNewCreated && !thisElIsMorphTo;

    attachedTxInfoTmp.normal.cfg = attachedTxInfoTmp.normal.conOpt =
        attachedTxInfoTmp.emphasis.cfg = attachedTxInfoTmp.emphasis.conOpt =
        attachedTxInfoTmp.blur.cfg = attachedTxInfoTmp.blur.conOpt =
        attachedTxInfoTmp.select.cfg = attachedTxInfoTmp.select.conOpt = null;

    attachedTxInfoTmp.isLegacy = false;

    doCreateOrUpdateAttachedTx(
        el, dataIndex, elOption, seriesModel, isInit, attachedTxInfoTmp
    );

    doCreateOrUpdateClipPath(
        el, dataIndex, elOption, seriesModel, isInit
    );

    const pendingAllPropsFinal = updateElNormal(
        api,
        el,
        thisElIsMorphTo,
        dataIndex,
        elOption,
        elOption.style,
        attachedTxInfoTmp,
        seriesModel,
        isInit,
        false
    );

    if (thisElIsMorphTo) {
        morphPreparation.addTo(el as graphicUtil.Path, elOption, dataIndex, pendingAllPropsFinal);
    }

    for (let i = 0; i < STATES.length; i++) {
        const stateName = STATES[i];
        if (stateName !== NORMAL) {
            const otherStateOpt = retrieveStateOption(elOption, stateName);
            const otherStyleOpt = retrieveStyleOptionOnState(elOption, otherStateOpt, stateName);
            updateElOnState(stateName, el, otherStateOpt, otherStyleOpt, attachedTxInfoTmp, isRoot, false);
        }
    }

    updateZ(el, elOption, seriesModel, attachedTxInfoTmp);

    if (elOption.type === 'group') {
        mergeChildren(
            api, el as graphicUtil.Group, dataIndex, elOption as CustomGroupOption, seriesModel, morphPreparation
        );
    }

    if (toBeReplacedIdx >= 0) {
        group.replaceAt(el, toBeReplacedIdx);
    }
    else {
        group.add(el);
    }

    return el;
}

// `el` must not be null/undefined.
function doesElNeedRecreate(el: Element, elOption: CustomElementOption): boolean {
    const elInner = inner(el);
    const elOptionType = elOption.type;
    const elOptionShape = (elOption as CustomZRPathOption).shape;
    const elOptionStyle = elOption.style;
    return (
        // If `elOptionType` is `null`, follow the merge principle.
        (elOptionType != null
            && elOptionType !== elInner.customGraphicType
        )
        || (elOptionType === 'path'
            && hasOwnPathData(elOptionShape)
            && getPathData(elOptionShape) !== elInner.customPathData
        )
        || (elOptionType === 'image'
            && hasOwn(elOptionStyle, 'image')
            && (elOptionStyle as CustomImageOption['style']).image !== elInner.customImagePath
        )
        // // FIXME test and remove this restriction?
        // || (elOptionType === 'text'
        //     && hasOwn(elOptionStyle, 'text')
        //     && (elOptionStyle as TextStyleProps).text !== elInner.customText
        // )
    );
}

function doCreateOrUpdateClipPath(
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    isInit: boolean
): void {
    // Based on the "merge" principle, if no clipPath provided,
    // do nothing. The exists clip will be totally removed only if
    // `el.clipPath` is `false`. Otherwise it will be merged/replaced.
    const clipPathOpt = elOption.clipPath;
    if (clipPathOpt === false) {
        if (el && el.getClipPath()) {
            el.removeClipPath();
        }
    }
    else if (clipPathOpt) {
        let clipPath = el.getClipPath();
        if (clipPath && doesElNeedRecreate(clipPath, clipPathOpt)) {
            clipPath = null;
        }
        if (!clipPath) {
            clipPath = createEl(clipPathOpt) as graphicUtil.Path;
            if (__DEV__) {
                assert(
                    clipPath instanceof graphicUtil.Path,
                    'Only any type of `path` can be used in `clipPath`, rather than ' + clipPath.type + '.'
                );
            }
            el.setClipPath(clipPath);
        }
        updateElNormal(
            null, clipPath, null, dataIndex, clipPathOpt, null, null, seriesModel, isInit, false
        );
    }
    // If not define `clipPath` in option, do nothing unnecessary.
}

function doCreateOrUpdateAttachedTx(
    el: Element,
    dataIndex: number,
    elOption: CustomElementOption,
    seriesModel: CustomSeriesModel,
    isInit: boolean,
    attachedTxInfo: AttachedTxInfo
): void {
    // group do not support textContent temporarily untill necessary.
    if (el.isGroup) {
        return;
    }

    // Normal must be called before emphasis, for `isLegacy` detection.
    processTxInfo(elOption, null, attachedTxInfo);
    processTxInfo(elOption, EMPHASIS, attachedTxInfo);

    // If `elOption.textConfig` or `elOption.textContent` is null/undefined, it does not make sence.
    // So for simplicity, if "elOption hasOwnProperty of them but be null/undefined", we do not
    // trade them as set to null to el.
    // Especially:
    // `elOption.textContent: false` means remove textContent.
    // `elOption.textContent.emphasis.style: false` means remove the style from emphasis state.
    let txConOptNormal = attachedTxInfo.normal.conOpt as CustomElementOption | false;
    const txConOptEmphasis = attachedTxInfo.emphasis.conOpt as CustomElementOptionOnState;
    const txConOptBlur = attachedTxInfo.blur.conOpt as CustomElementOptionOnState;
    const txConOptSelect = attachedTxInfo.select.conOpt as CustomElementOptionOnState;

    if (txConOptNormal != null || txConOptEmphasis != null || txConOptSelect != null || txConOptBlur != null) {
        let textContent = el.getTextContent();
        if (txConOptNormal === false) {
            textContent && el.removeTextContent();
        }
        else {
            txConOptNormal = attachedTxInfo.normal.conOpt = txConOptNormal || {type: 'text'};
            if (!textContent) {
                textContent = createEl(txConOptNormal) as graphicUtil.Text;
                el.setTextContent(textContent);
            }
            else {
                // If in some case the performance issue arised, consider
                // do not clearState but update cached normal state directly.
                textContent.clearStates();
            }
            const txConStlOptNormal = txConOptNormal && txConOptNormal.style;

            updateElNormal(
                null, textContent, null, dataIndex, txConOptNormal, txConStlOptNormal, null, seriesModel, isInit, true
            );
            for (let i = 0; i < STATES.length; i++) {
                const stateName = STATES[i];
                if (stateName !== NORMAL) {
                    const txConOptOtherState = attachedTxInfo[stateName].conOpt as CustomElementOptionOnState;
                    updateElOnState(
                        stateName,
                        textContent,
                        txConOptOtherState,
                        retrieveStyleOptionOnState(txConOptNormal, txConOptOtherState, stateName),
                        null, false, true
                    );
                }
            }

            txConStlOptNormal ? textContent.dirty() : textContent.markRedraw();
        }
    }
}

function processTxInfo(
    elOption: CustomElementOption,
    state: DisplayStateNonNormal,
    attachedTxInfo: AttachedTxInfo
): void {
    const stateOpt = !state ? elOption : retrieveStateOption(elOption, state);
    const styleOpt = !state ? elOption.style : retrieveStyleOptionOnState(elOption, stateOpt, EMPHASIS);

    const elType = elOption.type;
    let txCfg = stateOpt ? stateOpt.textConfig : null;
    const txConOptNormal = elOption.textContent;
    let txConOpt: CustomElementOption | CustomElementOptionOnState =
        !txConOptNormal ? null : !state ? txConOptNormal : retrieveStateOption(txConOptNormal, state);

    if (styleOpt && (
        // Because emphasis style has little info to detect legacy,
        // if normal is legacy, emphasis is trade as legacy.
        attachedTxInfo.isLegacy
        || isEC4CompatibleStyle(styleOpt, elType, !!txCfg, !!txConOpt)
    )) {
        attachedTxInfo.isLegacy = true;
        const convertResult = convertFromEC4CompatibleStyle(styleOpt, elType, !state);
        // Explicitly specified `textConfig` and `textContent` has higher priority than
        // the ones generated by legacy style. Otherwise if users use them and `api.style`
        // at the same time, they not both work and hardly to known why.
        if (!txCfg && convertResult.textConfig) {
            txCfg = convertResult.textConfig;
        }
        if (!txConOpt && convertResult.textContent) {
            txConOpt = convertResult.textContent;
        }
    }

    if (!state && txConOpt) {
        const txConOptNormal = txConOpt as CustomElementOption;
        // `textContent: {type: 'text'}`, the "type" is easy to be missing. So we tolerate it.
        !txConOptNormal.type && (txConOptNormal.type = 'text');
        if (__DEV__) {
            // Do not tolerate incorret type for forward compat.
            txConOptNormal.type !== 'text' && assert(
                txConOptNormal.type === 'text',
                'textContent.type must be "text"'
            );
        }
    }

    const info = !state ? attachedTxInfo.normal : attachedTxInfo[state];
    info.cfg = txCfg;
    info.conOpt = txConOpt;
}

function retrieveStateOption(
    elOption: CustomElementOption, state: DisplayStateNonNormal
): CustomElementOptionOnState {
    return !state ? elOption : elOption ? elOption[state] : null;
}

function retrieveStyleOptionOnState(
    stateOptionNormal: CustomElementOption,
    stateOption: CustomElementOptionOnState,
    state: DisplayStateNonNormal
): CustomElementOptionOnState['style'] {
    let style = stateOption && stateOption.style;
    if (style == null && state === EMPHASIS && stateOptionNormal) {
        style = stateOptionNormal.styleEmphasis;
    }
    return style;
}


// Usage:
// (1) By default, `elOption.$mergeChildren` is `'byIndex'`, which indicates that
//     the existing children will not be removed, and enables the feature that
//     update some of the props of some of the children simply by construct
//     the returned children of `renderItem` like:
//     `var children = group.children = []; children[3] = {opacity: 0.5};`
// (2) If `elOption.$mergeChildren` is `'byName'`, add/update/remove children
//     by child.name. But that might be lower performance.
// (3) If `elOption.$mergeChildren` is `false`, the existing children will be
//     replaced totally.
// (4) If `!elOption.children`, following the "merge" principle, nothing will happen.
//
// For implementation simpleness, do not provide a direct way to remove sinlge
// child (otherwise the total indicies of the children array have to be modified).
// User can remove a single child by set its `ignore` as `true`.
function mergeChildren(
    api: ExtensionAPI,
    el: graphicUtil.Group,
    dataIndex: number,
    elOption: CustomGroupOption,
    seriesModel: CustomSeriesModel,
    morphPreparation: MorphPreparation
): void {

    const newChildren = elOption.children;
    const newLen = newChildren ? newChildren.length : 0;
    const mergeChildren = elOption.$mergeChildren;
    // `diffChildrenByName` has been deprecated.
    const byName = mergeChildren === 'byName' || elOption.diffChildrenByName;
    const notMerge = mergeChildren === false;

    // For better performance on roam update, only enter if necessary.
    if (!newLen && !byName && !notMerge) {
        return;
    }

    if (byName) {
        diffGroupChildren({
            api: api,
            oldChildren: el.children() || [],
            newChildren: newChildren || [],
            dataIndex: dataIndex,
            seriesModel: seriesModel,
            group: el,
            morphPreparation: morphPreparation
        });
        return;
    }

    notMerge && el.removeAll();

    // Mapping children of a group simply by index, which
    // might be better performance.
    let index = 0;
    for (; index < newLen; index++) {
        newChildren[index] && doCreateOrUpdateEl(
            api,
            el.childAt(index),
            dataIndex,
            newChildren[index],
            seriesModel,
            el,
            false,
            morphPreparation
        );
    }
    for (let i = el.childCount() - 1; i >= index; i--) {
        // Do not supprot leave elements that are not mentioned in the latest
        // `renderItem` return. Otherwise users may not have a clear and simple
        // concept that how to contorl all of the elements.
        doRemoveEl(el.childAt(i), seriesModel, el);
    }
}

type DiffGroupContext = {
    api: ExtensionAPI;
    oldChildren: Element[];
    newChildren: CustomElementOption[];
    dataIndex: number;
    seriesModel: CustomSeriesModel;
    group: graphicUtil.Group;
    morphPreparation: MorphPreparation;
};
function diffGroupChildren(context: DiffGroupContext) {
    (new DataDiffer(
        context.oldChildren,
        context.newChildren,
        getKey,
        getKey,
        context
    ))
        .add(processAddUpdate)
        .update(processAddUpdate)
        .remove(processRemove)
        .execute();
}

function getKey(item: Element, idx: number): string {
    const name = item && item.name;
    return name != null ? name : GROUP_DIFF_PREFIX + idx;
}

function processAddUpdate(
    this: DataDiffer<DiffGroupContext>,
    newIndex: number,
    oldIndex?: number
): void {
    const context = this.context;
    const childOption = newIndex != null ? context.newChildren[newIndex] : null;
    const child = oldIndex != null ? context.oldChildren[oldIndex] : null;

    doCreateOrUpdateEl(
        context.api,
        child,
        context.dataIndex,
        childOption,
        context.seriesModel,
        context.group,
        false,
        context.morphPreparation
    );
}

function processRemove(this: DataDiffer<DiffGroupContext>, oldIndex: number): void {
    const context = this.context;
    const child = context.oldChildren[oldIndex];
    doRemoveEl(child, context.seriesModel, context.group);
}

function doRemoveEl(
    el: Element,
    seriesModel: CustomSeriesModel,
    group: ViewRootGroup
): void {
    if (el) {
        const leaveToProps = inner(el).leaveToProps;
        leaveToProps
            ? graphicUtil.updateProps(el, leaveToProps, seriesModel, {
                cb: function () {
                    group.remove(el);
                }
            })
            : group.remove(el);
    }
}

/**
 * @return SVG Path data.
 */
function getPathData(shape: CustomSVGPathOption['shape']): string {
    // "d" follows the SVG convention.
    return shape && (shape.pathData || shape.d);
}

function hasOwnPathData(shape: CustomSVGPathOption['shape']): boolean {
    return shape && (hasOwn(shape, 'pathData') || hasOwn(shape, 'd'));
}

function isPath(el: Element): el is graphicUtil.Path {
    return el && el instanceof graphicUtil.Path;
}

function removeElementDirectly(el: Element, group: ViewRootGroup): void {
    el && group.remove(el);
}


type MorphPreparationType = 'oneToOne' | 'oneToMany' | 'manyToOne';

/**
 * Any morph-potential el should added by `morphPreparation.addTo(el)`.
 * And they may apply morph or not when `morphPreparation.applyMorphing()`.
 * But at least, all of the "to" elements will apply all of the updates
 * as `doCreateOrUpdateItem` did.
 */
class MorphPreparation {
    private _type: MorphPreparationType;
    private _fromList: graphicUtil.Path[] = [];
    private _toList: graphicUtil.Path[] = [];
    private _toElOptionList: CustomElementOption[] = [];
    private _allPropsFinalList: ElementProps[] = [];
    private _toDataIndices: number[] = [];
    private _transOpt: SeriesModel['__transientTransitionOpt'];
    private _seriesModel: CustomSeriesModel;
    // Key: `toDataIndex`, not `toIdx`
    private _morphConfigList: CombineSeparateConfig[] = [];

    constructor(
        seriesModel: CustomSeriesModel,
        transOpt: SeriesModel['__transientTransitionOpt']
    ) {
        this._seriesModel = seriesModel;
        this._transOpt = transOpt;
    }

    hasFrom(): boolean {
        return !!this._fromList.length;
    }

    // isOneToOneFrom(el: Element): boolean {
    //     if (el && inner(el).canMorph) {
    //         const fromList = this._fromList;
    //         for (let i = 0; i < fromList.length; i++) {
    //             if (fromList[i] === el) {
    //                 return true;
    //             }
    //         }
    //     }
    // }

    findAndAddFrom(el: Element): void {
        if (!el) {
            return;
        }
        if (inner(el).canMorph) {
            this._fromList.push(el as graphicUtil.Path);
        }
        if (el.isGroup) {
            const children = (el as graphicUtil.Group).childrenRef();
            for (let i = 0; i < children.length; i++) {
                this.findAndAddFrom(children[i]);
            }
        }
    }

    addTo(
        path: graphicUtil.Path,
        elOption: CustomElementOption,
        dataIndex: number,
        allPropsFinal: ElementProps
    ): void {
        if (path) {
            this._toList.push(path);
            this._toElOptionList.push(elOption);
            this._toDataIndices.push(dataIndex);
            this._allPropsFinalList.push(allPropsFinal);
        }
    }

    applyMorphing(): void {
        // [MORPHING_LOGIC_HINT]
        // Pay attention to the order:
        // (A) Apply `allPropsFinal` and `styleOption` to "to".
        //     (Then "to" becomes to the final state.)
        // (B) Apply `morphPath`/`combine`/`separate`.
        //     (Based on the current state of "from" and the final state of "to".)
        //     (Then we may get "from.subList" or "to.subList".)
        // (C) Copy the related props from "from" to "from.subList", from "to" to "to.subList".
        // (D) Collect `transitionFromProps` for "to" and "to.subList"
        //     (Based on "from" or "from.subList".)
        // (E) Apply `transitionFromProps` to "to" and "to.subList"
        //     (It might change the prop values to the first frame value.)
        // Case_I:
        //     If (D) should be after (C), we use sequence: A - B - C - D - E
        // Case_II:
        //     If (A) should be after (D), we use sequence: D - A - B - C - E

        // [MORPHING_LOGIC_HINT]
        // zrender `morphPath`/`combine`/`separate` only manages the shape animation.
        // Other props (like transfrom, style transition) will handled in echarts).

        // [MORPHING_LOGIC_HINT]
        // Make sure `applyPropsFinal` always be called for "to".

        const type = this._type;
        const fromList = this._fromList;
        const toList = this._toList;
        const toListLen = toList.length;
        const fromListLen = fromList.length;

        if (!fromListLen || !toListLen) {
            return;
        }

        if (type === 'oneToOne') {
            // In one-to-one case, we by default apply a simple rule:
            // map "from" and "to" one by one.
            // For this case: old_data_item_el and new_data_item_el
            // has the same hierarchy of group tree but only some path type changed.
            for (let toIdx = 0; toIdx < toListLen; toIdx++) {
                this._oneToOneForSingleTo(toIdx, toIdx);
            }
        }

        else if (type === 'manyToOne') {
            // A rough strategy: if there are more than one "to", we simply divide "fromList" equally.
            const fromSingleSegLen = Math.max(1, Math.floor(fromListLen / toListLen));
            for (
                let toIdx = 0, fromIdxStart = 0;
                toIdx < toListLen;
                toIdx++, fromIdxStart += fromSingleSegLen
            ) {
                const fromCount = toIdx + 1 >= toListLen
                    ? fromListLen - fromIdxStart
                    : fromSingleSegLen;
                this._manyToOneForSingleTo(
                    toIdx, fromIdxStart >= fromListLen ? null : fromIdxStart, fromCount
                );
            }
        }

        else if (type === 'oneToMany') {
            // A rough strategy: if there are more than one "from", we simply divide "toList" equally.
            const toSingleSegLen = Math.max(1, Math.floor(toListLen / fromListLen));
            for (
                let toIdxStart = 0, fromIdx = 0;
                toIdxStart < toListLen;
                toIdxStart += toSingleSegLen, fromIdx++
            ) {
                const toCount = toIdxStart + toSingleSegLen >= toListLen
                    ? toListLen - toIdxStart
                    : toSingleSegLen;
                this._oneToManyForSingleFrom(
                    toIdxStart, toCount, fromIdx >= fromListLen ? null : fromIdx
                );
            }
        }
    }

    private _oneToOneForSingleTo(
        // "to" must NOT be null/undefined.
        toIdx: number,
        // May `fromIdx >= this._fromList.length`
        fromIdx: number
    ): void {
        const to = this._toList[toIdx];
        const toElOption = this._toElOptionList[toIdx];
        const toDataIndex = this._toDataIndices[toIdx];
        const allPropsFinal = this._allPropsFinalList[toIdx];
        const from = this._fromList[fromIdx];

        const elAnimationConfig = this._getOrCreateMorphConfig(toDataIndex);
        const morphDuration = elAnimationConfig.duration;

        if (from && isCombiningPath(from)) {
            applyPropsFinal(to, allPropsFinal, toElOption.style);

            if (morphDuration) {
                const combineResult = combine([from], to, elAnimationConfig, copyPropsWhenDivided);
                this._processResultIndividuals(combineResult, toIdx, null);
            }
            // The target el will not be displayed and transition from multiple path.
            // transition on the target el does not make sense.
        }
        else {
            const morphFrom = (
                morphDuration
                // from === to usually happen in scenarios where internal update like
                // "dataZoom", "legendToggle" happen. If from is not in any morphing,
                // we do not need to call `morphPath`.
                && from
                && (from !== to || isInAnyMorphing(from))
            ) ? from : null;

            // See [Case_II] above.
            // In this case, there is probably `from === to`. And the `transitionFromProps` collecting
            // does not depends on morphing. So we collect `transitionFromProps` first.
            const transFromProps = {} as ElementProps;
            prepareShapeOrExtraTransitionFrom('shape', to, morphFrom, toElOption, transFromProps, false);
            prepareShapeOrExtraTransitionFrom('extra', to, morphFrom, toElOption, transFromProps, false);
            prepareTransformTransitionFrom(to, morphFrom, toElOption, transFromProps, false);
            prepareStyleTransitionFrom(to, morphFrom, toElOption, toElOption.style, transFromProps, false);

            applyPropsFinal(to, allPropsFinal, toElOption.style);

            if (morphFrom) {
                morphPath(morphFrom, to, elAnimationConfig);
            }
            applyTransitionFrom(to, toDataIndex, toElOption, this._seriesModel, transFromProps, false);
        }
    }

    private _manyToOneForSingleTo(
        // "to" must NOT be null/undefined.
        toIdx: number,
        // May be null.
        fromIdxStart: number,
        fromCount: number
    ): void {
        const to = this._toList[toIdx];
        const toElOption = this._toElOptionList[toIdx];
        const allPropsFinal = this._allPropsFinalList[toIdx];

        applyPropsFinal(to, allPropsFinal, toElOption.style);

        const elAnimationConfig = this._getOrCreateMorphConfig(this._toDataIndices[toIdx]);
        if (elAnimationConfig.duration && fromIdxStart != null) {
            const combineFromList = [];
            for (let fromIdx = fromIdxStart; fromIdx < fromCount; fromIdx++) {
                combineFromList.push(this._fromList[fromIdx]);
            }
            const combineResult = combine(combineFromList, to, elAnimationConfig, copyPropsWhenDivided);
            this._processResultIndividuals(combineResult, toIdx, null);
        }
    }

    private _oneToManyForSingleFrom(
        // "to" must NOT be null/undefined.
        toIdxStart: number,
        toCount: number,
        // May be null
        fromIdx: number
    ): void {
        const from = fromIdx == null ? null : this._fromList[fromIdx];
        const toList = this._toList;

        const separateToList = [];
        for (let toIdx = toIdxStart; toIdx < toCount; toIdx++) {
            const to = toList[toIdx];
            applyPropsFinal(to, this._allPropsFinalList[toIdx], this._toElOptionList[toIdx].style);
            separateToList.push(to);
        }

        const elAnimationConfig = this._getOrCreateMorphConfig(this._toDataIndices[toIdxStart]);
        if (elAnimationConfig.duration && from) {
            const separateResult = separate(from, separateToList, elAnimationConfig, copyPropsWhenDivided);
            this._processResultIndividuals(separateResult, toIdxStart, toCount);
        }
    }

    private _processResultIndividuals(
        combineSeparateResult: CombineSeparateResult,
        toIdxStart: number,
        toCount: number
    ): void {
        const isSeparate = toCount != null;

        for (let i = 0; i < combineSeparateResult.count; i++) {
            const fromIndividual = combineSeparateResult.fromIndividuals[i];
            const toIndividual = combineSeparateResult.toIndividuals[i];
            // Here it's a trick:
            // For "combine" case, all of the `toIndividuals` map to the same `toIdx`.
            // For "separate" case, the `toIndividuals` map to some certain segment of `_toList` accurately.
            const toIdx = toIdxStart + (isSeparate ? i : 0);

            const toElOption = this._toElOptionList[toIdx];
            const dataIndex = this._toDataIndices[toIdx];

            const transFromProps = {} as ElementProps;
            prepareTransformTransitionFrom(
                toIndividual, fromIndividual, toElOption, transFromProps, false
            );
            prepareStyleTransitionFrom(
                toIndividual, fromIndividual, toElOption, toElOption.style, transFromProps, false
            );
            applyTransitionFrom(
                toIndividual, dataIndex, toElOption, this._seriesModel, transFromProps, false
            );
        }
    }

    _getOrCreateMorphConfig(dataIndex: number): CombineSeparateConfig {
        const morphConfigList = this._morphConfigList;
        let config = morphConfigList[dataIndex];
        if (config) {
            return config;
        }

        let duration: number;
        let easing: AnimationEasing;
        let delay: number;
        const seriesModel = this._seriesModel;
        const transOpt = this._transOpt;

        if (seriesModel.isAnimationEnabled()) {
            // PENDING: refactor? this is the same logic as `src/util/graphic.ts#animateOrSetProps`.
            let animationPayload: PayloadAnimationPart;
            if (seriesModel && seriesModel.ecModel) {
                const updatePayload = seriesModel.ecModel.getUpdatePayload();
                animationPayload = (updatePayload && updatePayload.animation) as PayloadAnimationPart;
            }
            if (animationPayload) {
                duration = animationPayload.duration || 0;
                easing = animationPayload.easing || 'cubicOut';
                delay = animationPayload.delay || 0;
            }
            else {
                easing = seriesModel.get('animationEasingUpdate');
                const delayOption = seriesModel.get('animationDelayUpdate');
                delay = isFunction(delayOption) ? delayOption(dataIndex) : delayOption;
                const durationOption = seriesModel.get('animationDurationUpdate');
                duration = isFunction(durationOption) ? durationOption(dataIndex) : durationOption;
            }
        }

        config = {
            duration: duration || 0,
            delay: delay,
            easing: easing,
            dividingMethod: transOpt ? transOpt.dividingMethod : null
        };
        morphConfigList[dataIndex] = config;

        return config;
    }

    reset(type: MorphPreparationType): void {
        // `this._morphConfigList` can be kept. It only related to `dataIndex`.
        this._type = type;
        this._fromList.length =
            this._toList.length =
            this._toElOptionList.length =
            this._allPropsFinalList.length =
            this._toDataIndices.length = 0;
    }
}

function copyPropsWhenDivided(
    srcPath: graphicUtil.Path,
    tarPath: graphicUtil.Path,
    willClone: boolean
): void {
    // Do not copy transform props.
    // Sub paths are transfrom based on their host path.
    // tarPath.x = srcPath.x;
    // tarPath.y = srcPath.y;
    // tarPath.scaleX = srcPath.scaleX;
    // tarPath.scaleY = srcPath.scaleY;
    // tarPath.originX = srcPath.originX;
    // tarPath.originY = srcPath.originY;

    // If just carry the style, will not be modifed, so do not copy.
    tarPath.style = willClone
        ? clone(srcPath.style)
        : srcPath.style;

    tarPath.zlevel = srcPath.zlevel;
    tarPath.z = srcPath.z;
    tarPath.z2 = srcPath.z2;
}

export function install(registers: EChartsExtensionInstallRegisters) {
    registers.registerChartView(CustomSeriesView);
    registers.registerSeriesModel(CustomSeriesModel);
}
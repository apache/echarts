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
    retrieve, defaults, extend, each, isObject, isString, isNumber, isFunction, retrieve2,
    assert,
    map,
} from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import {getECData} from '../../util/innerStore';
import {createTextStyle} from '../../label/labelStyle';
import Model from '../../model/Model';
import {isRadianAroundZero, remRadian} from '../../util/number';
import {createSymbol, normalizeSymbolOffset} from '../../util/symbol';
import * as matrixUtil from 'zrender/src/core/matrix';
import {applyTransform as v2ApplyTransform} from 'zrender/src/core/vector';
import {
    isNameLocationCenter, shouldShowAllLabels,
} from '../../coord/axisHelper';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import {
    ZRTextVerticalAlign, ZRTextAlign, ECElement, ColorString,
    VisualAxisBreak,
    ParsedAxisBreak,
    NullUndefined,
    DimensionName,
} from '../../util/types';
import {
    AxisBaseOption, AxisBaseOptionCommon, AxisLabelBaseOptionNuance
} from '../../coord/axisCommonTypes';
import type Element from 'zrender/src/Element';
import { PathProps, PathStyleProps } from 'zrender/src/graphic/Path';
import OrdinalScale from '../../scale/Ordinal';
import {
    hideOverlap,
    LabelLayoutInfoComputed,
    labelIntersect,
    LabelIntersectionCheckInfo,
    prepareIntersectionCheckInfo,
    LabelLayoutInfoAll,
    ensureLabelLayoutInfoComputed,
    LabelLayoutInfoRaw,
    LABEL_LAYOUT_INFO_KIND_RAW,
    rollbackToLabelLayoutInfoRaw,
    LABEL_LAYOUT_INFO_KIND_COMPUTED,
} from '../../label/labelLayoutHelper';
import ExtensionAPI from '../../core/ExtensionAPI';
import { makeInner } from '../../util/model';
import { getAxisBreakHelper } from './axisBreakHelper';
import { AXIS_BREAK_EXPAND_ACTION_TYPE, BaseAxisBreakPayload } from './axisAction';
import { getScaleBreakHelper } from '../../scale/break';
import BoundingRect from 'zrender/src/core/BoundingRect';
import Point from 'zrender/src/core/Point';
import { copyTransform } from 'zrender/src/core/Transformable';
import {
    AxisLabelsComputingContext, AxisTickLabelComputingKind, createAxisLabelsComputingContext
} from '../../coord/axisTickLabelBuilder';
import { AxisTickCoord } from '../../coord/Axis';


const PI = Math.PI;

type AxisIndexKey = 'xAxisIndex' | 'yAxisIndex' | 'radiusAxisIndex'
    | 'angleAxisIndex' | 'singleAxisIndex';

type AxisEventData = {
    componentType: string
    componentIndex: number
    targetType: 'axisName' | 'axisLabel'
    name?: string
    value?: string | number
    dataIndex?: number
    tickIndex?: number
} & {
    break?: {
        start: ParsedAxisBreak['vmin'],
        end: ParsedAxisBreak['vmax'],
    }
} & {
    [key in AxisIndexKey]?: number
};

type AxisLabelText = graphic.Text & {
    __fullText: string
    __truncatedText: string
} & ECElement;

const getLabelInner = makeInner<{
    break: VisualAxisBreak;
    tickValue: number;
    layoutRotation: number;
}, graphic.Text>();

const getTickInner = makeInner<{
    onBand: AxisTickCoord['onBand']
    tickValue: AxisTickCoord['tickValue']
}, graphic.Line>();


/**
 * @see {AxisBuilder}
 */
export interface AxisBuilderCfg {
    /**
     * @mandatory
     * The origin of the axis, in the global pixel coords.
     */
    position: number[]
    /**
     * @mandatory
     * The rotation of the axis from the "standard axis" ([0, 0]-->[abs(axisExtent[1]-axisExtent[0]), 0]).
     * In radian.
     * Like always, a positive rotation represents rotating anticlockwisely from
     * the "standard axis" , and a negative rotation represents clockwise.
     * e.g.,
     * rotation 0 means an axis towards screen-right.
     * rotation Math.PI/4 means an axis towards screen-top-right.
     */
    rotation: number
    /**
     * `nameDirection` or `tickDirection` or `labelDirection` are used when
     * `nameLocation` is 'middle' or 'center'.
     * values:
     *  - `1` means ticks or labels are below the "standard axis" ([0, 0]-->[abs(axisExtent[1]-axisExtent[0]), 0]).
     *  - `-1` means they are above the "standard axis".
     */
    nameDirection?: -1 | 1
    tickDirection?: -1 | 1
    labelDirection?: -1 | 1
    /**
     * `labelOffset` means the offset between labels and the axis line, which is
     * useful when 'onZero: true', where the axis line is in the grid rect and
     * labels are outside the grid rect.
     */
    labelOffset?: number
    /**
     * If not specified, get from axisModel.
     */
    axisLabelShow?: boolean
    /**
     * Works on axisLine.show: 'auto'. true by default.
     */
    axisLineAutoShow?: boolean;
    /**
     * Works on axisTick.show: 'auto'. true by default.
     */
    axisTickAutoShow?: boolean;

    /**
     * default get from axisModel.
     */
    axisName?: string

    axisNameAvailableWidth?: number
    /**
     * by degree, default get from axisModel.
     */
    labelRotate?: number

    strokeContainThreshold?: number

    nameTruncateMaxWidth?: number

    silent?: boolean
}

/**
 * Use it prior to `AxisBuilderCfg`. If settings in `AxisBuilderCfg` need to be preprocessed
 * and shared by different methods, put them here.
 */
interface AxisBuilderCfgDetermined {
    raw: AxisBuilderCfg,

    position: AxisBuilderCfg['position']
    rotation: AxisBuilderCfg['rotation']

    nameDirection: AxisBuilderCfg['nameDirection']
    tickDirection: AxisBuilderCfg['tickDirection']
    labelDirection: AxisBuilderCfg['labelDirection']

    silent: AxisBuilderCfg['silent']
    labelOffset: AxisBuilderCfg['labelOffset']

    axisName: AxisBaseOptionCommon['name'];
    nameLocation: AxisBaseOption['nameLocation']
    shouldNameMoveOverlap: boolean
    optionHideOverlap: AxisBaseOption['axisLabel']['hideOverlap']
}

/**
 * The context of this axisBuilder instance, never shared between axisBuilder instances.
 * @see AxisBuilderSharedContext
 */
interface AxisBuilderLocalContext {
    labelLayoutList?: LabelLayoutInfoAll[] | NullUndefined
    labelGroup?: graphic.Group
    axisLabelsCreationContext?: AxisLabelsComputingContext
    nameEl?: graphic.Text | NullUndefined
}

export type AxisBuilderSharedContextRecord = {
    // Represents axis rotation. The magnitude is 1.
    dirVec?: Point,
    transGroup?: AxisBuilder['_transformGroup'],
    // Used for overlap detection for both self and other axes.
    // Sorted in ascending order of the distance to transformGroup.x/y.
    // This sorting is for OBB intersection checking.
    labelInfoList?: LabelLayoutInfoComputed[]
    // `stOccupiedRect` is based on the "standard axis".
    // If no label, be `NullUndefined`.
    // - When `nameLocation` is 'center', `stOccupiedRect` is the unoin of labels, and is used for the case
    //   below, where even if the `name` does not intersect with `1,000,000`, it is still pulled left to avoid
    //   the overlap with `stOccupiedRect`.
    //        1,000,000 -
    //      n           |
    //      a     1,000 -
    //      m           |
    //      e         0 -----------
    // - When `nameLocaiton` is 'start'/'end', `stOccupiedRect` is not used, becuase they are not likely to overlap.
    //   Additionally, these cases need to be considered:
    //      If axis labels rotating, axis names should not be pulled by the union rect of labels.
    //          ----|-----|   axis name with
    //              1     5   big height
    //                0     0
    //                  0     0
    //      Axis line and axis labels should not be unoined to one rect for overlap detection, because of
    //      the most common case below (The axis name is inserted into the indention to save space):
    //          ----|------------|  A axis name
    //          1,000,000   300,000,000
    stOccupiedRect?: BoundingRect | NullUndefined;
    // Only used in __DEV__ mode.
    ready: Partial<Record<AxisBuilderAxisPartName, boolean>>
};

/**
 * A context shared by difference axisBuilder instances.
 * For cross-axes overlap resolving.
 * @see AxisBuilderLocalContext
 */
export class AxisBuilderSharedContext {
    /**
     * [CAUTION] Do not modify this data structure outside this class.
     */
    recordMap: {
        [axisDimension: DimensionName]: AxisBuilderSharedContextRecord[] // List index: axisIndex
    } = {};

    constructor(resolveAxisNameOverlap: AxisBuilderSharedContext['resolveAxisNameOverlap']) {
        this.resolveAxisNameOverlap = resolveAxisNameOverlap;
    }

    ensureRecord(axisModel: AxisBaseModel): AxisBuilderSharedContextRecord {
        const dim = axisModel.axis.dim;
        const idx = axisModel.componentIndex;
        const recordMap = this.recordMap;
        const records = recordMap[dim] || (recordMap[dim] = []);
        return (records[idx] || (records[idx] = {ready: {}}));
    }

    /**
     * Overlap resolution strategy. May vary for different coordinate systems.
     */
    readonly resolveAxisNameOverlap: (
        cfg: AxisBuilderCfgDetermined,
        ctx: AxisBuilderSharedContext | NullUndefined,
        axisModel: AxisBaseModel,
        nameLayoutInfo: LabelLayoutInfoComputed, // The existing has been ensured.
        nameMoveDirVec: Point,
        thisRecord: AxisBuilderSharedContextRecord // The existing has been ensured.
    ) => void;
};

/**
 * [CAUTION]
 *  1. The call of this function must be after axisLabel overlap handlings
 *     (such as `hideOverlap`, `fixMinMaxLabelShow`) and after transform calculating.
 *  2. Can be called multiple times and should be idempotent.
 */
function resetOverlapRecordToShared(
    cfg: AxisBuilderCfgDetermined,
    shared: AxisBuilderSharedContext,
    axisModel: AxisBaseModel,
    labelLayoutInfoList: LabelLayoutInfoAll[]
): void {
    const axis = axisModel.axis;
    const record = shared.ensureRecord(axisModel);
    const labelInfoList: AxisBuilderSharedContextRecord['labelInfoList'] = [];
    let stOccupiedRect: AxisBuilderSharedContextRecord['stOccupiedRect'];
    const useStOccupiedRect = hasAxisName(cfg.axisName) && isNameLocationCenter(cfg.nameLocation);

    each(labelLayoutInfoList, layout => {
        const layoutInfo = ensureLabelLayoutInfoComputed(layout);
        if (!layoutInfo || layoutInfo.label.ignore) {
            return;
        }
        labelInfoList.push(layoutInfo);

        const transGroup = record.transGroup;
        if (useStOccupiedRect) {
            // Transform to "standard axis" for creating stOccupiedRect (the label rects union).
            transGroup.transform
                ? matrixUtil.invert(_stTransTmp, transGroup.transform)
                : matrixUtil.identity(_stTransTmp);
            if (layoutInfo.transform) {
                matrixUtil.mul(_stTransTmp, _stTransTmp, layoutInfo.transform);
            }
            BoundingRect.copy(_stLabelRectTmp, layoutInfo.localRect);
            _stLabelRectTmp.applyTransform(_stTransTmp);
            stOccupiedRect
                ? stOccupiedRect.union(_stLabelRectTmp)
                : BoundingRect.copy(stOccupiedRect = new BoundingRect(0, 0, 0, 0), _stLabelRectTmp);
        }
    });

    const sortByDim = Math.abs(record.dirVec.x) > 0.1 ? 'x' : 'y';
    const sortByValue = record.transGroup[sortByDim];
    labelInfoList.sort((info1, info2) => (
        Math.abs(info1.label[sortByDim] - sortByValue) - Math.abs(info2.label[sortByDim] - sortByValue)
    ));

    if (useStOccupiedRect && stOccupiedRect) {
        const extent = axis.getExtent();
        const axisLineX = Math.min(extent[0], extent[1]);
        const axisLineWidth = Math.max(extent[0], extent[1]) - axisLineX;
        // If `nameLocation` is 'middle', enlarge axis labels boundingRect to axisLine to avoid bad
        //  case like that axis name is placed in the gap between axis labels and axis line.
        // If only one label exists, the entire band should be occupied for
        // visual consistency, so extent it to [0, canvas width].
        stOccupiedRect.union(new BoundingRect(axisLineX, 0, axisLineWidth, 1));
    }

    record.stOccupiedRect = stOccupiedRect;
    record.labelInfoList = labelInfoList;
}
const _stTransTmp = matrixUtil.create();
const _stLabelRectTmp = new BoundingRect(0, 0, 0, 0);

/**
 * The default resolver does not involve other axes within the same coordinate system.
 */
export const resolveAxisNameOverlapDefault: AxisBuilderSharedContext['resolveAxisNameOverlap'] = (
    cfg, ctx, axisModel, nameLayoutInfo, nameMoveDirVec, thisRecord
): void => {
    if (isNameLocationCenter(cfg.nameLocation)) {
        const stOccupiedRect = thisRecord.stOccupiedRect;
        if (stOccupiedRect) {
            moveIfOverlap(
                prepareIntersectionCheckInfo(stOccupiedRect, thisRecord.transGroup.transform),
                nameLayoutInfo,
                nameMoveDirVec
            );
        }
    }
    else {
        moveIfOverlapByLinearLabels(
            thisRecord.labelInfoList, thisRecord.dirVec, nameLayoutInfo, nameMoveDirVec
        );
    }
};

function moveIfOverlap(
    basedLayoutInfo: LabelIntersectionCheckInfo,
    movableLayoutInfo: LabelIntersectionCheckInfo & Pick<LabelLayoutInfoComputed, 'label'>,
    moveDirVec: Point
): void {
    const mtv = new Point();
    if (labelIntersect(basedLayoutInfo, movableLayoutInfo, mtv, {
        direction: Math.atan2(moveDirVec.y, moveDirVec.x),
        bidirectional: false,
        touchThreshold: 0.05,
    })) {
        Point.add(movableLayoutInfo.label, movableLayoutInfo.label, mtv);
    }
}

export function moveIfOverlapByLinearLabels(
    baseLayoutInfoList: (LabelIntersectionCheckInfo)[],
    baseDirVec: Point,
    movableLayoutInfo: (LabelIntersectionCheckInfo & Pick<LabelLayoutInfoComputed, 'label'>),
    moveDirVec: Point,
): void {
    // Detect and move from far to close.
    const sameDir = Point.dot(moveDirVec, baseDirVec) >= 0;
    for (let idx = 0, len = baseLayoutInfoList.length; idx < len; idx++) {
        const labelInfo = baseLayoutInfoList[sameDir ? idx : len - 1 - idx];
        moveIfOverlap(labelInfo, movableLayoutInfo, moveDirVec);
    }
}

/**
 * @caution
 * - Ensure it is called after the data processing stage finished.
 * - It might be called before `CahrtView#render`, sush as called at `CoordinateSystem#update`,
 *  thus ensure the result the same whenever it is called.
 *
 * A builder for a straight-line axis.
 *
 * A final axis is translated and rotated from a "standard axis".
 * So opt.position and opt.rotation is required.
 *
 * A "standard axis" is the axis [0,0]-->[abs(axisExtent[1]-axisExtent[0]),0]
 * for example: [0,0]-->[50,0]
 */
class AxisBuilder {

    private _axisModel: AxisBaseModel;

    private _cfg: AxisBuilderCfgDetermined;
    private _local: AxisBuilderLocalContext;
    private _shared: AxisBuilderSharedContext;

    readonly group = new graphic.Group();

    /**
     * `_transformGroup.transform` is ready to visit. (but be `NullUndefined` if no tranform.)
     */
    private _transformGroup: graphic.Group;
    private _api: ExtensionAPI;

    /**
     * [CAUTION]: axisModel.axis.extent/scale must be ready to use.
     */
    constructor(
        axisModel: AxisBaseModel,
        api: ExtensionAPI,
        opt: AxisBuilderCfg,
        shared?: AxisBuilderSharedContext,
    ) {
        this._axisModel = axisModel;
        this._api = api;
        this._local = {};
        this._shared = shared || new AxisBuilderSharedContext(resolveAxisNameOverlapDefault);

        this._resetCfgDetermined(opt);
    }

    /**
     * Regarding axis label related configurations, only the change of label.x/y is supported; other
     * changes are not necessary and not performant. To be specific, only `axis.position`
     * (and consequently `labelOffset`) and `axis.extent` can be changed, and assume everything in
     * `axisModel` are not changed.
     * Axis line related configurations can be changed since this method can only be called
     * before they are created.
     */
    updateCfg(opt: Pick<AxisBuilderCfg, 'position' | 'labelOffset'>): void {
        if (__DEV__) {
            const ready = this._shared.ensureRecord(this._axisModel).ready;
            // After that, changing cfg is not supported; avoid unnecessary complexity.
            assert(!ready.axisLine && !ready.axisTickLabelDetermine);
            // Have to be called again if cfg changed.
            ready.axisName = ready.axisTickLabelEstimate = false;
        }

        const raw = this._cfg.raw;
        raw.position = opt.position;
        raw.labelOffset = opt.labelOffset;

        this._resetCfgDetermined(raw);
    }

    /**
     * [CAUTION] For debug usage. Never change it outside!
     */
    __getRawCfg() {
        return this._cfg.raw;
    }

    private _resetCfgDetermined(raw: AxisBuilderCfg): void {
        const axisModel = this._axisModel;
        const axisModelDefaultOption = axisModel.getDefaultOption();
        // Default value
        const axisName = retrieve2(raw.axisName, axisModel.get('name'));
        const cfg = {
            raw: raw,

            position: raw.position,
            rotation: raw.rotation,

            nameDirection: retrieve2(raw.nameDirection, 1),
            tickDirection: retrieve2(raw.tickDirection, 1),
            labelDirection: retrieve2(raw.labelDirection, 1),

            labelOffset: retrieve2(raw.labelOffset, 0),
            silent: retrieve2(raw.silent, true),

            axisName: axisName,
            nameLocation: retrieve2(axisModel.get('nameLocation'), axisModelDefaultOption.nameLocation),
            shouldNameMoveOverlap: hasAxisName(axisName) && !!axisModel.get('nameMoveOverlap'),
            optionHideOverlap: axisModel.get(['axisLabel', 'hideOverlap']),
        };
        if (__DEV__) {
            assert(cfg.position != null);
            assert(cfg.rotation != null);
        }
        this._cfg = cfg;

        // FIXME Not use a separate text group?
        const transformGroup = new graphic.Group({
            x: cfg.position[0],
            y: cfg.position[1],
            rotation: cfg.rotation
        });
        transformGroup.updateTransform();
        this._transformGroup = transformGroup;

        const record = this._shared.ensureRecord(axisModel);
        record.transGroup = this._transformGroup;
        record.dirVec = new Point(Math.cos(-cfg.rotation), Math.sin(-cfg.rotation));
    }

    build(axisPartNameMap?: AxisBuilderAxisPartMap, extraParams?: {}): AxisBuilder {
        if (!axisPartNameMap) {
            axisPartNameMap = {
                axisLine: true,
                axisTickLabelEstimate: false,
                axisTickLabelDetermine: true,
                axisName: true
            };
        }

        each(AXIS_BUILDER_AXIS_PART_NAMES, partName => {
            if (axisPartNameMap[partName]) {
                builders[partName](
                    this._cfg, this._local, this._shared,
                    this._axisModel, this.group, this._transformGroup, this._api,
                    extraParams || {}
                );
            }
        });
        return this;
    }

    /**
     * Currently only get text align/verticalAlign by rotation.
     * NO `position` is involved, otherwise it have to be performed for each `updateAxisLabelChangableProps`.
     */
    static innerTextLayout(axisRotation: number, textRotation: number, direction: number) {
        const rotationDiff = remRadian(textRotation - axisRotation);
        let textAlign;
        let textVerticalAlign;

        if (isRadianAroundZero(rotationDiff)) { // Label is parallel with axis line.
            textVerticalAlign = direction > 0 ? 'top' : 'bottom';
            textAlign = 'center';
        }
        else if (isRadianAroundZero(rotationDiff - PI)) { // Label is inverse parallel with axis line.
            textVerticalAlign = direction > 0 ? 'bottom' : 'top';
            textAlign = 'center';
        }
        else {
            textVerticalAlign = 'middle';

            if (rotationDiff > 0 && rotationDiff < PI) {
                textAlign = direction > 0 ? 'right' : 'left';
            }
            else {
                textAlign = direction > 0 ? 'left' : 'right';
            }
        }

        return {
            rotation: rotationDiff,
            textAlign: textAlign as ZRTextAlign,
            textVerticalAlign: textVerticalAlign as ZRTextVerticalAlign
        };
    }

    static makeAxisEventDataBase(axisModel: AxisBaseModel) {
        const eventData = {
            componentType: axisModel.mainType,
            componentIndex: axisModel.componentIndex
        } as AxisEventData;
        eventData[axisModel.mainType + 'Index' as AxisIndexKey] = axisModel.componentIndex;
        return eventData;
    }

    static isLabelSilent(axisModel: AxisBaseModel): boolean {
        const tooltipOpt = axisModel.get('tooltip');
        return axisModel.get('silent')
            // Consider mouse cursor, add these restrictions.
            || !(
                axisModel.get('triggerEvent') || (tooltipOpt && tooltipOpt.show)
            );
    }
};

interface AxisElementsBuilder {
    (
        cfg: AxisBuilderCfgDetermined,
        local: AxisBuilderLocalContext,
        shared: AxisBuilderSharedContext,
        axisModel: AxisBaseModel,
        group: graphic.Group,
        transformGroup: AxisBuilder['_transformGroup'],
        api: ExtensionAPI,
        extraParams: AxisBuilderBuildExtraParams
    ): void
}

interface AxisBuilderBuildExtraParams {
    noPxChange?: boolean
}

// Sorted by dependency order.
const AXIS_BUILDER_AXIS_PART_NAMES = [
    'axisLine',
    'axisTickLabelEstimate',
    'axisTickLabelDetermine',
    'axisName'
] as const;
type AxisBuilderAxisPartName = typeof AXIS_BUILDER_AXIS_PART_NAMES[number];
export type AxisBuilderAxisPartMap = {[axisPartName in AxisBuilderAxisPartName]?: boolean};

const builders: Record<AxisBuilderAxisPartName, AxisElementsBuilder> = {

    axisLine(cfg, local, shared, axisModel, group, transformGroup, api) {
        if (__DEV__) {
            const ready = shared.ensureRecord(axisModel).ready;
            assert(!ready.axisLine);
            ready.axisLine = true;
        }

        let shown = axisModel.get(['axisLine', 'show']);
        if (shown === 'auto') {
            shown = true;
            if (cfg.raw.axisLineAutoShow != null) {
                shown = !!cfg.raw.axisLineAutoShow;
            }
        }
        if (!shown) {
            return;
        }

        const extent = axisModel.axis.getExtent();

        const matrix = transformGroup.transform;
        const pt1 = [extent[0], 0];
        const pt2 = [extent[1], 0];
        const inverse = pt1[0] > pt2[0];
        if (matrix) {
            v2ApplyTransform(pt1, pt1, matrix);
            v2ApplyTransform(pt2, pt2, matrix);
        }

        const lineStyle = extend(
            {
                lineCap: 'round'
            },
            axisModel.getModel(['axisLine', 'lineStyle']).getLineStyle()
        );
        const pathBaseProp: PathProps = {
            strokeContainThreshold: cfg.raw.strokeContainThreshold || 5,
            silent: true,
            z2: 1,
            style: lineStyle,
        };

        if (axisModel.get(['axisLine', 'breakLine']) && axisModel.axis.scale.hasBreaks()) {
            getAxisBreakHelper()!.buildAxisBreakLine(axisModel, group, transformGroup, pathBaseProp);
        }
        else {
            const line = new graphic.Line(extend({
                shape: {
                    x1: pt1[0],
                    y1: pt1[1],
                    x2: pt2[0],
                    y2: pt2[1]
                },
            }, pathBaseProp));
            graphic.subPixelOptimizeLine(line.shape, line.style.lineWidth);
            line.anid = 'line';
            group.add(line);
        }

        let arrows = axisModel.get(['axisLine', 'symbol']);

        if (arrows != null) {
            let arrowSize = axisModel.get(['axisLine', 'symbolSize']);

            if (isString(arrows)) {
                // Use the same arrow for start and end point
                arrows = [arrows, arrows];
            }
            if (isString(arrowSize) || isNumber(arrowSize)) {
                // Use the same size for width and height
                arrowSize = [arrowSize as number, arrowSize as number];
            }

            const arrowOffset = normalizeSymbolOffset(axisModel.get(['axisLine', 'symbolOffset']) || 0, arrowSize);

            const symbolWidth = arrowSize[0];
            const symbolHeight = arrowSize[1];

            each([{
                rotate: cfg.rotation + Math.PI / 2,
                offset: arrowOffset[0],
                r: 0
            }, {
                rotate: cfg.rotation - Math.PI / 2,
                offset: arrowOffset[1],
                r: Math.sqrt((pt1[0] - pt2[0]) * (pt1[0] - pt2[0])
                    + (pt1[1] - pt2[1]) * (pt1[1] - pt2[1]))
            }], function (point, index) {
                if (arrows[index] !== 'none' && arrows[index] != null) {
                    const symbol = createSymbol(
                        arrows[index],
                        -symbolWidth / 2,
                        -symbolHeight / 2,
                        symbolWidth,
                        symbolHeight,
                        lineStyle.stroke,
                        true
                    );

                    // Calculate arrow position with offset
                    const r = point.r + point.offset;

                    const pt = inverse ? pt2 : pt1;
                    symbol.attr({
                        rotation: point.rotate,
                        x: pt[0] + r * Math.cos(cfg.rotation),
                        y: pt[1] - r * Math.sin(cfg.rotation),
                        silent: true,
                        z2: 11
                    });
                    group.add(symbol);
                }
            });
        }
    },

    /**
     * [CAUTION] This method can be called multiple times, following the change due to `resetCfg` called
     *  in size measurement. Thus this method should be idempotent, and should be performant.
     */
    axisTickLabelEstimate(cfg, local, shared, axisModel, group, transformGroup, api, extraParams) {
        if (__DEV__) {
            const ready = shared.ensureRecord(axisModel).ready;
            assert(!ready.axisTickLabelDetermine);
            ready.axisTickLabelEstimate = true;
        }
        const needCallLayout = dealLastTickLabelResultReusable(local, group, extraParams);
        if (needCallLayout) {
            axisTickLabelLayout(
                cfg, local, shared, axisModel, group, transformGroup, api, AxisTickLabelComputingKind.estimate
            );
        }
    },

    /**
     * Finish axis tick label build.
     * Can be only called once.
     */
    axisTickLabelDetermine(cfg, local, shared, axisModel, group, transformGroup, api, extraParams) {
        if (__DEV__) {
            const ready = shared.ensureRecord(axisModel).ready;
            ready.axisTickLabelDetermine = true;
        }
        const needCallLayout = dealLastTickLabelResultReusable(local, group, extraParams);
        if (needCallLayout) {
            axisTickLabelLayout(
                cfg, local, shared, axisModel, group, transformGroup, api, AxisTickLabelComputingKind.determine
            );
        }
        const ticksEls = buildAxisMajorTicks(cfg, group, transformGroup, axisModel);
        syncLabelIgnoreToTicks(local.labelLayoutList, ticksEls);

        buildAxisMinorTicks(group, transformGroup, axisModel, cfg.tickDirection);
    },

    /**
     * [CAUTION] This method can be called multiple times, following the change due to `resetCfg` called
     *  in size measurement. Thus this method should be idempotent, and should be performant.
     */
    axisName(cfg, local, shared, axisModel, group, transformGroup, api) {
        if (__DEV__) {
            const ready = shared.ensureRecord(axisModel).ready;
            assert(ready.axisTickLabelEstimate || ready.axisTickLabelDetermine);
            ready.axisName = true;
        }

        // PENDING: need optimize for repeatedly estimate?
        if (local.nameEl) {
            group.remove(local.nameEl);
            local.nameEl = null;
        }

        const name = cfg.axisName;
        if (!hasAxisName(name)) {
            return;
        }

        const nameLocation = cfg.nameLocation;
        const nameDirection = cfg.nameDirection;
        const textStyleModel = axisModel.getModel('nameTextStyle');
        const gap = (axisModel.get('nameGap') || 0);

        const extent = axisModel.axis.getExtent();
        const gapStartEndSignal = axisModel.axis.inverse ? -1 : 1;
        const pos = new Point(0, 0);
        const nameMoveDirVec = new Point(0, 0);
        if (nameLocation === 'start') {
            pos.x = extent[0] - gapStartEndSignal * gap;
            nameMoveDirVec.x = -gapStartEndSignal;
        }
        else if (nameLocation === 'end') {
            pos.x = extent[1] + gapStartEndSignal * gap;
            nameMoveDirVec.x = gapStartEndSignal;
        }
        else { // 'middle' or 'center'
            pos.x = (extent[0] + extent[1]) / 2;
            pos.y = cfg.labelOffset + nameDirection * gap;
            nameMoveDirVec.y = nameDirection;
        }
        const mt = matrixUtil.create();
        nameMoveDirVec.transform(matrixUtil.rotate(mt, mt, cfg.rotation));

        let nameRotation = axisModel.get('nameRotate');
        if (nameRotation != null) {
            nameRotation = nameRotation * PI / 180; // To radian.
        }

        let labelLayout;
        let axisNameAvailableWidth;

        if (isNameLocationCenter(nameLocation)) {
            labelLayout = AxisBuilder.innerTextLayout(
                cfg.rotation,
                nameRotation != null ? nameRotation : cfg.rotation, // Adapt to axis.
                nameDirection
            );
        }
        else {
            labelLayout = endTextLayout(
                cfg.rotation, nameLocation, nameRotation || 0, extent
            );

            axisNameAvailableWidth = cfg.raw.axisNameAvailableWidth;
            if (axisNameAvailableWidth != null) {
                axisNameAvailableWidth = Math.abs(
                    axisNameAvailableWidth / Math.sin(labelLayout.rotation)
                );
                !isFinite(axisNameAvailableWidth) && (axisNameAvailableWidth = null);
            }
        }

        const textFont = textStyleModel.getFont();

        const truncateOpt = axisModel.get('nameTruncate', true) || {};
        const ellipsis = truncateOpt.ellipsis;
        const maxWidth = retrieve(
            cfg.raw.nameTruncateMaxWidth, truncateOpt.maxWidth, axisNameAvailableWidth
        );

        const textEl = new graphic.Text({
            x: pos.x,
            y: pos.y,
            rotation: labelLayout.rotation,
            silent: AxisBuilder.isLabelSilent(axisModel),
            style: createTextStyle(textStyleModel, {
                text: name,
                font: textFont,
                overflow: 'truncate',
                width: maxWidth,
                ellipsis,
                fill: textStyleModel.getTextColor()
                    || axisModel.get(['axisLine', 'lineStyle', 'color']) as ColorString,
                align: textStyleModel.get('align')
                    || labelLayout.textAlign,
                verticalAlign: textStyleModel.get('verticalAlign')
                    || labelLayout.textVerticalAlign
            }, {
                defaultTextMargin: isNameLocationCenter(nameLocation)
                    // Make axis name visually far from axis labels.
                    ? [8, 5]
                    // top/button margin is set to `0` to inserted the xAxis name into the indention
                    // above the axis labels to save space. (see example below.)
                    : [0, 5],
            }),
            z2: 1
        }) as AxisLabelText;

        graphic.setTooltipConfig({
            el: textEl,
            componentModel: axisModel,
            itemName: name
        });

        textEl.__fullText = name;
        // Id for animation
        textEl.anid = 'name';

        if (axisModel.get('triggerEvent')) {
            const eventData = AxisBuilder.makeAxisEventDataBase(axisModel);
            eventData.targetType = 'axisName';
            eventData.name = name;
            getECData(textEl).eventData = eventData;
        }

        transformGroup.add(textEl);
        textEl.updateTransform();

        local.nameEl = textEl;
        group.add(textEl);

        textEl.decomposeTransform();

        if (cfg.shouldNameMoveOverlap) {
            const nameLayoutInfo = ensureLabelLayoutInfoComputed({
                kind: LABEL_LAYOUT_INFO_KIND_RAW,
                label: textEl,
                priority: textEl.z2,
                defaultAttr: {ignore: textEl.ignore}
            });
            if (nameLayoutInfo) {
                const record = shared.ensureRecord(axisModel);
                if (__DEV__) {
                    assert(record.labelInfoList);
                }
                shared.resolveAxisNameOverlap(cfg, shared, axisModel, nameLayoutInfo, nameMoveDirVec, record);
            }
        }
    }

};

function axisTickLabelLayout(
    cfg: AxisBuilderCfgDetermined,
    local: AxisBuilderLocalContext,
    shared: AxisBuilderSharedContext,
    axisModel: AxisBaseModel,
    group: graphic.Group,
    transformGroup: AxisBuilder['_transformGroup'],
    api: ExtensionAPI,
    kind: AxisTickLabelComputingKind
): void {
    if (!axisLabelBuildResultExists(local)) {
        buildAxisLabel(cfg, local, group, kind, axisModel, api);
    }

    const labelLayoutList = local.labelLayoutList;

    updateAxisLabelChangableProps(cfg, axisModel, labelLayoutList, transformGroup);

    adjustBreakLabels(axisModel, cfg.rotation, labelLayoutList);

    const optionHideOverlap = cfg.optionHideOverlap;

    fixMinMaxLabelShow(axisModel, labelLayoutList, optionHideOverlap);

    if (optionHideOverlap) {
        // This bit fixes the label overlap issue for the time chart.
        // See https://github.com/apache/echarts/issues/14266 for more.
        hideOverlap(labelLayoutList);
    }

    // Always call it even this axis has no name, since it serves in overlapping detection on other axis.
    resetOverlapRecordToShared(cfg, shared, axisModel, labelLayoutList);
};

function endTextLayout(
    rotation: number, textPosition: AxisBaseOptionCommon['nameLocation'], textRotate: number, extent: number[]
) {
    const rotationDiff = remRadian(textRotate - rotation);
    let textAlign: ZRTextAlign;
    let textVerticalAlign: ZRTextVerticalAlign;
    const inverse = extent[0] > extent[1];
    const onLeft = (textPosition === 'start' && !inverse)
        || (textPosition !== 'start' && inverse);

    if (isRadianAroundZero(rotationDiff - PI / 2)) {
        textVerticalAlign = onLeft ? 'bottom' : 'top';
        textAlign = 'center';
    }
    else if (isRadianAroundZero(rotationDiff - PI * 1.5)) {
        textVerticalAlign = onLeft ? 'top' : 'bottom';
        textAlign = 'center';
    }
    else {
        textVerticalAlign = 'middle';
        if (rotationDiff < PI * 1.5 && rotationDiff > PI / 2) {
            textAlign = onLeft ? 'left' : 'right';
        }
        else {
            textAlign = onLeft ? 'right' : 'left';
        }
    }

    return {
        rotation: rotationDiff,
        textAlign: textAlign,
        textVerticalAlign: textVerticalAlign
    };
}

/**
 * Assume `labelLayoutList` has no `label.ignore: true`.
 * Assume `labelLayoutList` have been sorted by value ascending order.
 */
function fixMinMaxLabelShow(
    axisModel: AxisBaseModel,
    labelLayoutList: LabelLayoutInfoAll[],
    optionHideOverlap: AxisBaseOption['axisLabel']['hideOverlap']
) {
    if (shouldShowAllLabels(axisModel.axis)) {
        return;
    }

    // FIXME
    // Have not consider onBand yet, where tick els is more than label els.
    // Assert no ignore in labels.

    function deal(
        showMinMaxLabel: boolean,
        outmostLabelIdx: number,
        innerLabelIdx: number,
    ) {
        const outmostLabelLayout = labelLayoutList[outmostLabelIdx];
        const innerLabelLayout = labelLayoutList[innerLabelIdx];
        if (!outmostLabelLayout || !innerLabelLayout) {
            return;
        }

        if (showMinMaxLabel === false) {
            ignoreEl(outmostLabelLayout.label);
        }
        // If `optionHideOverlap === false`, do not hide anything.
        // e.g., in category axis, hide some label is not reasonable.
        // And currently the bounding rect of text might not accurate enough,
        // might slightly bigger, which causes false positive.
        else if (optionHideOverlap !== false) {
            // In most fonts the glyph does not reach the boundary of the bouding rect.
            // This is needed to avoid too aggressive to hide two elements that meet at the edge
            // due to compact layout by the same bounding rect or OBB.
            const touchThreshold = 0.1;
            // This treatment is for backward compatibility. And `!optionHideOverlap` implies that
            // the user accepts the visual touch between adjacent labels, thus "hide min/max label"
            // should be conservative, since the space might be sufficient in this case.
            const ignoreMargin = !optionHideOverlap;
            const ensureOpt = ignoreMargin ? {variantCopy: {ignoreMargin}} : null;

            let anyIgnored = false;
            if (outmostLabelLayout.suggestIgnore) {
                ignoreEl(outmostLabelLayout.label);
                anyIgnored = true;
            }
            if (innerLabelLayout.suggestIgnore) {
                ignoreEl(innerLabelLayout.label);
                anyIgnored = true;
            }

            if (!anyIgnored && labelIntersect(
                ensureLabelLayoutInfoComputed(outmostLabelLayout, ensureOpt),
                ensureLabelLayoutInfoComputed(innerLabelLayout, ensureOpt),
                null,
                {touchThreshold}
            )) {
                if (showMinMaxLabel) {
                    ignoreEl(innerLabelLayout.label);
                }
                else {
                    ignoreEl(outmostLabelLayout.label);
                }
            }
        }
    }

    // If min or max are user set, we need to check
    // If the tick on min(max) are overlap on their neighbour tick
    // If they are overlapped, we need to hide the min(max) tick label
    const showMinLabel = axisModel.get(['axisLabel', 'showMinLabel']);
    const showMaxLabel = axisModel.get(['axisLabel', 'showMaxLabel']);
    const labelsLen = labelLayoutList.length;
    deal(showMinLabel, 0, 1);
    deal(showMaxLabel, labelsLen - 1, labelsLen - 2);
}

// PENDING: is it necessary to display a tick while the cooresponding label is ignored?
function syncLabelIgnoreToTicks(
    labelLayoutList: LabelLayoutInfoAll[],
    tickEls: graphic.Line[],
) {
    each(labelLayoutList, labelLayout => {
        if (labelLayout && labelLayout.label.ignore) {
            for (let idx = 0; idx < tickEls.length; idx++) {
                const tickEl = tickEls[idx];
                // Assume small array, linear search is fine for performance.
                // PENDING: measure?
                const tickInner = getTickInner(tickEl);
                const labelInner = getLabelInner(labelLayout.label);
                if (tickInner.tickValue != null
                    && !tickInner.onBand
                    && tickInner.tickValue === labelInner.tickValue
                ) {
                    ignoreEl(tickEl);
                    return;
                }
            }
        }
    });
}

function ignoreEl(el: Element) {
    el && (el.ignore = true);
}

function createTicks(
    ticksCoords: AxisTickCoord[],
    tickTransform: matrixUtil.MatrixArray,
    tickEndCoord: number,
    tickLineStyle: PathStyleProps,
    anidPrefix: string
): graphic.Line[] {
    const tickEls = [];
    const pt1: number[] = [];
    const pt2: number[] = [];
    for (let i = 0; i < ticksCoords.length; i++) {
        const tickCoord = ticksCoords[i].coord;

        pt1[0] = tickCoord;
        pt1[1] = 0;
        pt2[0] = tickCoord;
        pt2[1] = tickEndCoord;

        if (tickTransform) {
            v2ApplyTransform(pt1, pt1, tickTransform);
            v2ApplyTransform(pt2, pt2, tickTransform);
        }
        // Tick line, Not use group transform to have better line draw
        const tickEl = new graphic.Line({
            shape: {
                x1: pt1[0],
                y1: pt1[1],
                x2: pt2[0],
                y2: pt2[1]
            },
            style: tickLineStyle,
            z2: 2,
            autoBatch: true,
            silent: true
        });
        graphic.subPixelOptimizeLine(tickEl.shape, tickEl.style.lineWidth);
        tickEl.anid = anidPrefix + '_' + ticksCoords[i].tickValue;
        tickEls.push(tickEl);

        const inner = getTickInner(tickEl);
        inner.onBand = !!ticksCoords[i].onBand;
        inner.tickValue = ticksCoords[i].tickValue;
    }
    return tickEls;
}

function buildAxisMajorTicks(
    cfg: AxisBuilderCfgDetermined,
    group: graphic.Group,
    transformGroup: AxisBuilder['_transformGroup'],
    axisModel: AxisBaseModel
): graphic.Line[] {
    const axis = axisModel.axis;

    const tickModel = axisModel.getModel('axisTick');

    let shown = tickModel.get('show');
    if (shown === 'auto') {
        shown = true;
        if (cfg.raw.axisTickAutoShow != null) {
            shown = !!cfg.raw.axisTickAutoShow;
        }
    }
    if (!shown || axis.scale.isBlank()) {
        return [];
    }

    const lineStyleModel = tickModel.getModel('lineStyle');
    const tickEndCoord = cfg.tickDirection * tickModel.get('length');

    const ticksCoords = axis.getTicksCoords();

    const ticksEls = createTicks(ticksCoords, transformGroup.transform, tickEndCoord, defaults(
        lineStyleModel.getLineStyle(),
        {
            stroke: axisModel.get(['axisLine', 'lineStyle', 'color'])
        }
    ), 'ticks');

    for (let i = 0; i < ticksEls.length; i++) {
        group.add(ticksEls[i]);
    }

    return ticksEls;
}

function buildAxisMinorTicks(
    group: graphic.Group,
    transformGroup: AxisBuilder['_transformGroup'],
    axisModel: AxisBaseModel,
    tickDirection: number
) {
    const axis = axisModel.axis;

    const minorTickModel = axisModel.getModel('minorTick');

    if (!minorTickModel.get('show') || axis.scale.isBlank()) {
        return;
    }

    const minorTicksCoords = axis.getMinorTicksCoords();
    if (!minorTicksCoords.length) {
        return;
    }

    const lineStyleModel = minorTickModel.getModel('lineStyle');
    const tickEndCoord = tickDirection * minorTickModel.get('length');

    const minorTickLineStyle = defaults(
        lineStyleModel.getLineStyle(),
        defaults(
            axisModel.getModel('axisTick').getLineStyle(),
            {
                stroke: axisModel.get(['axisLine', 'lineStyle', 'color'])
            }
        )
    );

    for (let i = 0; i < minorTicksCoords.length; i++) {
        const minorTicksEls = createTicks(
            minorTicksCoords[i], transformGroup.transform, tickEndCoord, minorTickLineStyle, 'minorticks_' + i
        );
        for (let k = 0; k < minorTicksEls.length; k++) {
            group.add(minorTicksEls[k]);
        }
    }
}

// Return whether need to call `axisTickLabelLayout` again.
function dealLastTickLabelResultReusable(
    local: AxisBuilderLocalContext,
    group: graphic.Group,
    extraParams: AxisBuilderBuildExtraParams
): boolean {
    if (axisLabelBuildResultExists(local)) {
        const axisLabelsCreationContext = local.axisLabelsCreationContext;
        if (__DEV__) {
            assert(local.labelGroup && axisLabelsCreationContext);
        }
        const noPxChangeTryDetermine = axisLabelsCreationContext.out.noPxChangeTryDetermine;
        if (extraParams.noPxChange) {
            let canDetermine = true;
            for (let idx = 0; idx < noPxChangeTryDetermine.length; idx++) {
                canDetermine = canDetermine && noPxChangeTryDetermine[idx]();
            }
            if (canDetermine) {
                return false;
            }
        }
        if (noPxChangeTryDetermine.length) {
            // Remove the result of `buildAxisLabel`
            group.remove(local.labelGroup);
            axisLabelBuildResultSet(local, null, null, null);
        }
    }
    return true;
}

function buildAxisLabel(
    cfg: AxisBuilderCfgDetermined,
    local: AxisBuilderLocalContext,
    group: graphic.Group,
    kind: AxisTickLabelComputingKind,
    axisModel: AxisBaseModel,
    api: ExtensionAPI
): void {
    const axis = axisModel.axis;
    const show = retrieve(cfg.raw.axisLabelShow, axisModel.get(['axisLabel', 'show']));
    const labelGroup = new graphic.Group();
    group.add(labelGroup);
    const axisLabelCreationCtx = createAxisLabelsComputingContext(kind);

    if (!show || axis.scale.isBlank()) {
        axisLabelBuildResultSet(local, [], labelGroup, axisLabelCreationCtx);
        return;
    }

    const labelModel = axisModel.getModel('axisLabel');
    const labels = axis.getViewLabels(axisLabelCreationCtx);

    // Special label rotate.
    const labelRotation = (
        retrieve(cfg.raw.labelRotate, labelModel.get('rotate')) || 0
    ) * PI / 180;

    const labelLayout = AxisBuilder.innerTextLayout(cfg.rotation, labelRotation, cfg.labelDirection);
    const rawCategoryData = axisModel.getCategories && axisModel.getCategories(true);

    const labelEls: graphic.Text[] = [];
    const triggerEvent = axisModel.get('triggerEvent');
    let z2Min = Infinity;
    let z2Max = -Infinity;

    each(labels, function (labelItem, index) {
        const tickValue = axis.scale.type === 'ordinal'
            ? (axis.scale as OrdinalScale).getRawOrdinalNumber(labelItem.tickValue)
            : labelItem.tickValue;
        const formattedLabel = labelItem.formattedLabel;
        const rawLabel = labelItem.rawLabel;

        let itemLabelModel = labelModel;
        if (rawCategoryData && rawCategoryData[tickValue]) {
            const rawCategoryItem = rawCategoryData[tickValue];
            if (isObject(rawCategoryItem) && rawCategoryItem.textStyle) {
                itemLabelModel = new Model(
                    rawCategoryItem.textStyle, labelModel, axisModel.ecModel
                );
            }
        }

        const textColor = itemLabelModel.getTextColor() as AxisBaseOption['axisLabel']['color']
            || axisModel.get(['axisLine', 'lineStyle', 'color']);

        const align = itemLabelModel.getShallow('align', true)
            || labelLayout.textAlign;
        const alignMin = retrieve2(
            itemLabelModel.getShallow('alignMinLabel', true),
            align
        );
        const alignMax = retrieve2(
            itemLabelModel.getShallow('alignMaxLabel', true),
            align
        );

        const verticalAlign = itemLabelModel.getShallow('verticalAlign', true)
            || itemLabelModel.getShallow('baseline', true)
            || labelLayout.textVerticalAlign;
        const verticalAlignMin = retrieve2(
            itemLabelModel.getShallow('verticalAlignMinLabel', true),
            verticalAlign
        );
        const verticalAlignMax = retrieve2(
            itemLabelModel.getShallow('verticalAlignMaxLabel', true),
            verticalAlign
        );
        const z2 = 10 + (labelItem.time?.level || 0);
        z2Min = Math.min(z2Min, z2);
        z2Max = Math.max(z2Max, z2);

        const textEl = new graphic.Text({
            // --- transform props start ---
            // All of the transform props MUST not be set here, but should be set in
            // `updateAxisLabelChangableProps`, because they may change in estimation,
            // and need to calculate based on global coord sys by `decomposeTransform`.
            x: 0,
            y: 0,
            rotation: 0,
            // --- transform props end ---

            silent: AxisBuilder.isLabelSilent(axisModel),
            z2: z2,
            style: createTextStyle<AxisLabelBaseOptionNuance>(itemLabelModel, {
                text: formattedLabel,
                align: index === 0
                    ? alignMin
                    : index === labels.length - 1 ? alignMax : align,
                verticalAlign: index === 0
                    ? verticalAlignMin
                    : index === labels.length - 1 ? verticalAlignMax : verticalAlign,
                fill: isFunction(textColor)
                    ? textColor(
                        // (1) In category axis with data zoom, tick is not the original
                        // index of axis.data. So tick should not be exposed to user
                        // in category axis.
                        // (2) Compatible with previous version, which always use formatted label as
                        // input. But in interval scale the formatted label is like '223,445', which
                        // maked user replace ','. So we modify it to return original val but remain
                        // it as 'string' to avoid error in replacing.
                        axis.type === 'category'
                            ? rawLabel
                            : axis.type === 'value'
                            ? tickValue + ''
                            : tickValue,
                        index
                    )
                    : textColor as string,
            })
        });

        textEl.anid = 'label_' + tickValue;

        const inner = getLabelInner(textEl);
        inner.break = labelItem.break;
        inner.tickValue = tickValue;
        inner.layoutRotation = labelLayout.rotation;

        graphic.setTooltipConfig({
            el: textEl,
            componentModel: axisModel,
            itemName: formattedLabel,
            formatterParamsExtra: {
                isTruncated: () => textEl.isTruncated,
                value: rawLabel,
                tickIndex: index
            }
        });

        // Pack data for mouse event
        if (triggerEvent) {
            const eventData = AxisBuilder.makeAxisEventDataBase(axisModel);
            eventData.targetType = 'axisLabel';
            eventData.value = rawLabel;
            eventData.tickIndex = index;
            if (labelItem.break) {
                eventData.break = {
                    // type: labelItem.break.type,
                    start: labelItem.break.parsedBreak.vmin,
                    end: labelItem.break.parsedBreak.vmax,
                };
            }
            if (axis.type === 'category') {
                eventData.dataIndex = tickValue;
            }

            getECData(textEl).eventData = eventData;

            if (labelItem.break) {
                addBreakEventHandler(axisModel, api, textEl, labelItem.break);
            }
        }

        labelEls.push(textEl);
        labelGroup.add(textEl);
    });

    const labelLayoutList: LabelLayoutInfoRaw[] = map(labelEls, label => ({
        kind: LABEL_LAYOUT_INFO_KIND_RAW,
        label,
        priority: getLabelInner(label).break
            ? label.z2 + (z2Max - z2Min + 1) // Make break labels be highest priority.
            : label.z2,
        defaultAttr: {
            ignore: label.ignore
        },
    }));

    axisLabelBuildResultSet(local, labelLayoutList, labelGroup, axisLabelCreationCtx);
}

// Indicate that `axisTickLabelLayout` has been called.
function axisLabelBuildResultExists(local: AxisBuilderLocalContext) {
    return !!local.labelLayoutList;
}
function axisLabelBuildResultSet(
    local: AxisBuilderLocalContext,
    labelLayoutList: AxisBuilderLocalContext['labelLayoutList'],
    labelGroup: AxisBuilderLocalContext['labelGroup'],
    axisLabelsCreationContext: AxisBuilderLocalContext['axisLabelsCreationContext']
): void {
    // Ensure the same lifetime.
    local.labelLayoutList = labelLayoutList;
    local.labelGroup = labelGroup;
    local.axisLabelsCreationContext = axisLabelsCreationContext;
}

function updateAxisLabelChangableProps(
    cfg: AxisBuilderCfgDetermined,
    axisModel: AxisBaseModel,
    labelLayoutList: LabelLayoutInfoAll[],
    transformGroup: graphic.Group,
): void {
    const labelMargin = axisModel.get(['axisLabel', 'margin']);
    each(labelLayoutList, (layoutInfo, idx) => {
        if (!layoutInfo) {
            return;
        }

        const labelEl = layoutInfo.label;
        const inner = getLabelInner(labelEl);

        // See the comment in `suggestIgnore`.
        layoutInfo.suggestIgnore = labelEl.ignore;
        // Currently no `ignore:true` is set in `buildAxisLabel`
        // But `ignore:true` may be set subsequently for overlap handling, thus reset it here.
        labelEl.ignore = false;

        copyTransform(_tmpLayoutEl, _tmpLayoutElReset);
        _tmpLayoutEl.x = axisModel.axis.dataToCoord(inner.tickValue);
        _tmpLayoutEl.y = cfg.labelOffset + cfg.labelDirection * labelMargin;
        _tmpLayoutEl.rotation = inner.layoutRotation;

        transformGroup.add(_tmpLayoutEl);
        _tmpLayoutEl.updateTransform();
        transformGroup.remove(_tmpLayoutEl);
        _tmpLayoutEl.decomposeTransform();

        copyTransform(labelEl, _tmpLayoutEl);
        labelEl.markRedraw();

        if (layoutInfo.kind === LABEL_LAYOUT_INFO_KIND_COMPUTED) {
            rollbackToLabelLayoutInfoRaw(layoutInfo);
        }
    });
}
const _tmpLayoutEl = new graphic.Rect();
const _tmpLayoutElReset = new graphic.Rect();

function hasAxisName(axisName: AxisBuilderCfgDetermined['axisName']): boolean {
    return !!axisName;
}

function addBreakEventHandler(
    axisModel: AxisBaseModel,
    api: ExtensionAPI,
    textEl: graphic.Text,
    visualBreak: VisualAxisBreak
): void {
    textEl.on('click', params => {
        const payload: BaseAxisBreakPayload = {
            type: AXIS_BREAK_EXPAND_ACTION_TYPE,
            breaks: [{
                start: visualBreak.parsedBreak.breakOption.start,
                end: visualBreak.parsedBreak.breakOption.end,
            }]
        };
        payload[`${axisModel.axis.dim}AxisIndex`] = axisModel.componentIndex;
        api.dispatchAction(payload);
    });
}

function adjustBreakLabels(
    axisModel: AxisBaseModel,
    axisRotation: AxisBuilderCfgDetermined['rotation'],
    labelLayoutList: LabelLayoutInfoAll[]
): void {
    const scaleBreakHelper = getScaleBreakHelper();
    if (!scaleBreakHelper) {
        return;
    }
    const breakLabelIndexPairs = scaleBreakHelper.retrieveAxisBreakPairs(
        labelLayoutList,
        layoutInfo => layoutInfo && getLabelInner(layoutInfo.label).break,
        true
    );
    const moveOverlap = axisModel.get(['breakLabelLayout', 'moveOverlap'], true);
    if (moveOverlap === true || moveOverlap === 'auto') {
        each(breakLabelIndexPairs, idxPair => {
            getAxisBreakHelper()!.adjustBreakLabelPair(axisModel.axis.inverse, axisRotation, [
                ensureLabelLayoutInfoComputed(labelLayoutList[idxPair[0]]),
                ensureLabelLayoutInfoComputed(labelLayoutList[idxPair[1]])
            ]);
        });
    }
}

export default AxisBuilder;

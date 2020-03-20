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

import {retrieve, defaults, extend, each, isObject} from 'zrender/src/core/util';
import * as formatUtil from '../../util/format';
import * as graphic from '../../util/graphic';
import Model from '../../model/Model';
import {isRadianAroundZero, remRadian} from '../../util/number';
import {createSymbol} from '../../util/symbol';
import * as matrixUtil from 'zrender/src/core/matrix';
import {applyTransform as v2ApplyTransform} from 'zrender/src/core/vector';
import {shouldShowAllLabels} from '../../coord/axisHelper';
import { AxisBaseModel } from '../../coord/AxisBaseModel';
import { ZRTextVerticalAlign, ZRTextAlign, ECElement } from '../../util/types';
import { AxisBaseOption } from '../../coord/axisCommonTypes';
import { StyleProps } from 'zrender/src/graphic/Style';
import Element from 'zrender/src/Element';


const PI = Math.PI;

type AxisIndexKey = 'xAxisIndex' | 'yAxisIndex' | 'radiusAxisIndex'
    | 'angleAxisIndex' | 'singleAxisIndex';

type AxisEventData = {
    componentType: string
    componentIndex: number
    targetType: 'axisName' | 'axisLabel'
    name?: string
    value?: string | number
} & {
    [key in AxisIndexKey]?: number
};

type LabelFormatterParams = {
    componentType: string
    name: string
    $vars: ['name']
} & {
    [key in AxisIndexKey]?: number
};

type AxisLabelText = graphic.Text & {
    __fullText: string
    __truncatedText: string
} & ECElement;

interface AxisBuilderCfg {
    position?: number[]
    rotation?: number
    /**
     * Used when nameLocation is 'middle' or 'center'.
     * 1 | -1
     */
    nameDirection?: number
    tickDirection?: number
    labelDirection?: number
    /**
     * Usefull when onZero.
     */
    labelOffset?: number
    /**
     * default get from axisModel.
     */
    axisLabelShow?: boolean
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

interface TickCoord {
    coord: number
    tickValue?: number
}

/**
 * A final axis is translated and rotated from a "standard axis".
 * So opt.position and opt.rotation is required.
 *
 * A standard axis is and axis from [0, 0] to [0, axisExtent[1]],
 * for example: (0, 0) ------------> (0, 50)
 *
 * nameDirection or tickDirection or labelDirection is 1 means tick
 * or label is below the standard axis, whereas is -1 means above
 * the standard axis. labelOffset means offset between label and axis,
 * which is useful when 'onZero', where axisLabel is in the grid and
 * label in outside grid.
 *
 * Tips: like always,
 * positive rotation represents anticlockwise, and negative rotation
 * represents clockwise.
 * The direction of position coordinate is the same as the direction
 * of screen coordinate.
 *
 * Do not need to consider axis 'inverse', which is auto processed by
 * axis extent.
 */
class AxisBuilder {

    axisModel: AxisBaseModel;

    opt: AxisBuilderCfg;

    readonly group = new graphic.Group();

    private _transformGroup: graphic.Group;

    constructor(axisModel: AxisBaseModel, opt?: AxisBuilderCfg) {

        this.opt = opt;

        this.axisModel = axisModel;

        // Default value
        defaults(
            opt,
            {
                labelOffset: 0,
                nameDirection: 1,
                tickDirection: 1,
                labelDirection: 1,
                silent: true
            } as AxisBuilderCfg
        );


        // FIXME Not use a seperate text group?
        let transformGroup = new graphic.Group({
            position: opt.position.slice(),
            rotation: opt.rotation
        });

        // this.group.add(transformGroup);
        // this._transformGroup = transformGroup;

        transformGroup.updateTransform();

        this._transformGroup = transformGroup;
    }

    hasBuilder(name: keyof typeof builders) {
        return !!builders[name];
    }

    add(name: keyof typeof builders) {
        builders[name](this.opt, this.axisModel, this.group, this._transformGroup);
    }

    getGroup() {
        return this.group;
    }

    static innerTextLayout(axisRotation: number, textRotation: number, direction: number) {
        let rotationDiff = remRadian(textRotation - axisRotation);
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
        let eventData = {
            componentType: axisModel.mainType,
            componentIndex: axisModel.componentIndex
        } as AxisEventData;
        eventData[axisModel.mainType + 'Index' as AxisIndexKey] = axisModel.componentIndex;
        return eventData;
    }

    static isLabelSilent(axisModel: AxisBaseModel): boolean {
        let tooltipOpt = axisModel.get('tooltip');
        return axisModel.get('silent')
            // Consider mouse cursor, add these restrictions.
            || !(
                axisModel.get('triggerEvent') || (tooltipOpt && tooltipOpt.show)
            );
    }
};

interface AxisElementsBuilder {
    (
        opt: AxisBuilderCfg,
        axisModel: AxisBaseModel,
        group: graphic.Group,
        transformGroup: graphic.Group
    ):void
}

const builders: Record<'axisLine' | 'axisTickLabel' | 'axisName', AxisElementsBuilder> = {

    axisLine(opt, axisModel, group, transformGroup) {

        if (!axisModel.get(['axisLine', 'show'])) {
            return;
        }

        let extent = axisModel.axis.getExtent();

        let matrix = transformGroup.transform;
        let pt1 = [extent[0], 0];
        let pt2 = [extent[1], 0];
        if (matrix) {
            v2ApplyTransform(pt1, pt1, matrix);
            v2ApplyTransform(pt2, pt2, matrix);
        }

        let lineStyle = extend(
            {
                lineCap: 'round'
            },
            axisModel.getModel(['axisLine', 'lineStyle']).getLineStyle()
        );

        const line = new graphic.Line({
            // Id for animation
            subPixelOptimize: true,
            shape: {
                x1: pt1[0],
                y1: pt1[1],
                x2: pt2[0],
                y2: pt2[1]
            },
            style: lineStyle,
            strokeContainThreshold: opt.strokeContainThreshold || 5,
            silent: true,
            z2: 1
        });
        line.anid = 'line';
        group.add(line);

        let arrows = axisModel.get(['axisLine', 'symbol']);
        let arrowSize = axisModel.get(['axisLine', 'symbolSize']);

        let arrowOffset = axisModel.get(['axisLine', 'symbolOffset']) || 0;
        if (typeof arrowOffset === 'number') {
            arrowOffset = [arrowOffset, arrowOffset];
        }

        if (arrows != null) {
            if (typeof arrows === 'string') {
                // Use the same arrow for start and end point
                arrows = [arrows, arrows];
            }
            if (typeof arrowSize === 'string'
                || typeof arrowSize === 'number'
            ) {
                // Use the same size for width and height
                arrowSize = [arrowSize, arrowSize];
            }

            let symbolWidth = arrowSize[0];
            let symbolHeight = arrowSize[1];

            each([{
                rotate: opt.rotation + Math.PI / 2,
                offset: arrowOffset[0],
                r: 0
            }, {
                rotate: opt.rotation - Math.PI / 2,
                offset: arrowOffset[1],
                r: Math.sqrt((pt1[0] - pt2[0]) * (pt1[0] - pt2[0])
                    + (pt1[1] - pt2[1]) * (pt1[1] - pt2[1]))
            }], function (point, index) {
                if (arrows[index] !== 'none' && arrows[index] != null) {
                    let symbol = createSymbol(
                        arrows[index],
                        -symbolWidth / 2,
                        -symbolHeight / 2,
                        symbolWidth,
                        symbolHeight,
                        lineStyle.stroke,
                        true
                    );

                    // Calculate arrow position with offset
                    let r = point.r + point.offset;
                    let pos = [
                        pt1[0] + r * Math.cos(opt.rotation),
                        pt1[1] - r * Math.sin(opt.rotation)
                    ];

                    symbol.attr({
                        rotation: point.rotate,
                        position: pos,
                        silent: true,
                        z2: 11
                    });
                    group.add(symbol);
                }
            });
        }
    },

    axisTickLabel(opt, axisModel, group, transformGroup) {

        let ticksEls = buildAxisMajorTicks(group, transformGroup, axisModel, opt.tickDirection);
        let labelEls = buildAxisLabel(group, transformGroup, axisModel, opt);

        fixMinMaxLabelShow(axisModel, labelEls, ticksEls);

        buildAxisMinorTicks(group, transformGroup, axisModel, opt.tickDirection);
    },

    axisName(opt, axisModel, group, transformGroup) {
        let name = retrieve(opt.axisName, axisModel.get('name'));

        if (!name) {
            return;
        }

        let nameLocation = axisModel.get('nameLocation');
        let nameDirection = opt.nameDirection;
        let textStyleModel = axisModel.getModel('nameTextStyle');
        let gap = axisModel.get('nameGap') || 0;

        let extent = axisModel.axis.getExtent();
        let gapSignal = extent[0] > extent[1] ? -1 : 1;
        let pos = [
            nameLocation === 'start'
                ? extent[0] - gapSignal * gap
                : nameLocation === 'end'
                ? extent[1] + gapSignal * gap
                : (extent[0] + extent[1]) / 2, // 'middle'
            // Reuse labelOffset.
            isNameLocationCenter(nameLocation) ? opt.labelOffset + nameDirection * gap : 0
        ];

        let labelLayout;

        let nameRotation = axisModel.get('nameRotate');
        if (nameRotation != null) {
            nameRotation = nameRotation * PI / 180; // To radian.
        }

        let axisNameAvailableWidth;

        if (isNameLocationCenter(nameLocation)) {
            labelLayout = AxisBuilder.innerTextLayout(
                opt.rotation,
                nameRotation != null ? nameRotation : opt.rotation, // Adapt to axis.
                nameDirection
            );
        }
        else {
            labelLayout = endTextLayout(
                opt.rotation, nameLocation, nameRotation || 0, extent
            );

            axisNameAvailableWidth = opt.axisNameAvailableWidth;
            if (axisNameAvailableWidth != null) {
                axisNameAvailableWidth = Math.abs(
                    axisNameAvailableWidth / Math.sin(labelLayout.rotation)
                );
                !isFinite(axisNameAvailableWidth) && (axisNameAvailableWidth = null);
            }
        }

        let textFont = textStyleModel.getFont();

        let truncateOpt = axisModel.get('nameTruncate', true) || {};
        let ellipsis = truncateOpt.ellipsis;
        let maxWidth = retrieve(
            opt.nameTruncateMaxWidth, truncateOpt.maxWidth, axisNameAvailableWidth
        );
        // FIXME
        // truncate rich text? (consider performance)
        let truncatedText = (ellipsis != null && maxWidth != null)
            ? formatUtil.truncateText(
                name, maxWidth, textFont, ellipsis,
                {minChar: 2, placeholder: truncateOpt.placeholder}
            )
            : name;

        let tooltipOpt = axisModel.get('tooltip', true);

        let mainType = axisModel.mainType;
        let formatterParams: LabelFormatterParams = {
            componentType: mainType,
            name: name,
            $vars: ['name']
        };
        formatterParams[mainType + 'Index' as AxisIndexKey] = axisModel.componentIndex;

        let textEl = new graphic.Text({
            position: pos,
            rotation: labelLayout.rotation,
            silent: AxisBuilder.isLabelSilent(axisModel),
            z2: 1
        }) as AxisLabelText;
        textEl.tooltip = (tooltipOpt && tooltipOpt.show)
            ? extend({
                content: name,
                formatter() {
                    return name;
                },
                formatterParams: formatterParams
            }, tooltipOpt)
            : null;
        textEl.__fullText = name;
        textEl.__truncatedText = truncatedText;
        // Id for animation
        textEl.anid = 'name';

        graphic.setTextStyle(textEl.style, textStyleModel, {
            text: truncatedText,
            textFont: textFont,
            textFill: textStyleModel.getTextColor()
                || axisModel.get(['axisLine', 'lineStyle', 'color']),
            textAlign: textStyleModel.get('align')
                || labelLayout.textAlign,
            textVerticalAlign: textStyleModel.get('verticalAlign')
                || labelLayout.textVerticalAlign
        });

        if (axisModel.get('triggerEvent')) {
            let eventData = AxisBuilder.makeAxisEventDataBase(axisModel);
            eventData.targetType = 'axisName';
            eventData.name = name;
            graphic.getECData(textEl).eventData = eventData;
        }

        // FIXME
        transformGroup.add(textEl);
        textEl.updateTransform();

        group.add(textEl);

        textEl.decomposeTransform();
    }

};

function endTextLayout(
    rotation: number, textPosition: 'start' | 'middle' | 'end', textRotate: number, extent: number[]
) {
    let rotationDiff = remRadian(textRotate - rotation);
    let textAlign: ZRTextAlign;
    let textVerticalAlign: ZRTextVerticalAlign;
    let inverse = extent[0] > extent[1];
    let onLeft = (textPosition === 'start' && !inverse)
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

function fixMinMaxLabelShow(
    axisModel: AxisBaseModel,
    labelEls: graphic.Text[],
    tickEls: graphic.Line[]
) {
    if (shouldShowAllLabels(axisModel.axis)) {
        return;
    }

    // If min or max are user set, we need to check
    // If the tick on min(max) are overlap on their neighbour tick
    // If they are overlapped, we need to hide the min(max) tick label
    let showMinLabel = axisModel.get(['axisLabel', 'showMinLabel']);
    let showMaxLabel = axisModel.get(['axisLabel', 'showMaxLabel']);

    // FIXME
    // Have not consider onBand yet, where tick els is more than label els.

    labelEls = labelEls || [];
    tickEls = tickEls || [];

    let firstLabel = labelEls[0];
    let nextLabel = labelEls[1];
    let lastLabel = labelEls[labelEls.length - 1];
    let prevLabel = labelEls[labelEls.length - 2];

    let firstTick = tickEls[0];
    let nextTick = tickEls[1];
    let lastTick = tickEls[tickEls.length - 1];
    let prevTick = tickEls[tickEls.length - 2];

    if (showMinLabel === false) {
        ignoreEl(firstLabel);
        ignoreEl(firstTick);
    }
    else if (isTwoLabelOverlapped(firstLabel, nextLabel)) {
        if (showMinLabel) {
            ignoreEl(nextLabel);
            ignoreEl(nextTick);
        }
        else {
            ignoreEl(firstLabel);
            ignoreEl(firstTick);
        }
    }

    if (showMaxLabel === false) {
        ignoreEl(lastLabel);
        ignoreEl(lastTick);
    }
    else if (isTwoLabelOverlapped(prevLabel, lastLabel)) {
        if (showMaxLabel) {
            ignoreEl(prevLabel);
            ignoreEl(prevTick);
        }
        else {
            ignoreEl(lastLabel);
            ignoreEl(lastTick);
        }
    }
}

function ignoreEl(el: Element) {
    el && (el.ignore = true);
}

function isTwoLabelOverlapped(
    current: graphic.Text,
    next: graphic.Text
) {
    // current and next has the same rotation.
    let firstRect = current && current.getBoundingRect().clone();
    let nextRect = next && next.getBoundingRect().clone();

    if (!firstRect || !nextRect) {
        return;
    }

    // When checking intersect of two rotated labels, we use mRotationBack
    // to avoid that boundingRect is enlarge when using `boundingRect.applyTransform`.
    let mRotationBack = matrixUtil.identity([]);
    matrixUtil.rotate(mRotationBack, mRotationBack, -current.rotation);

    firstRect.applyTransform(matrixUtil.mul([], mRotationBack, current.getLocalTransform()));
    nextRect.applyTransform(matrixUtil.mul([], mRotationBack, next.getLocalTransform()));

    return firstRect.intersect(nextRect);
}

function isNameLocationCenter(nameLocation: string) {
    return nameLocation === 'middle' || nameLocation === 'center';
}


function createTicks(
    ticksCoords: TickCoord[],
    tickTransform: matrixUtil.MatrixArray,
    tickEndCoord: number,
    tickLineStyle: StyleProps,
    anidPrefix: string
) {
    let tickEls = [];
    let pt1: number[] = [];
    let pt2: number[] = [];
    for (let i = 0; i < ticksCoords.length; i++) {
        let tickCoord = ticksCoords[i].coord;

        pt1[0] = tickCoord;
        pt1[1] = 0;
        pt2[0] = tickCoord;
        pt2[1] = tickEndCoord;

        if (tickTransform) {
            v2ApplyTransform(pt1, pt1, tickTransform);
            v2ApplyTransform(pt2, pt2, tickTransform);
        }
        // Tick line, Not use group transform to have better line draw
        let tickEl = new graphic.Line({
            subPixelOptimize: true,
            shape: {
                x1: pt1[0],
                y1: pt1[1],
                x2: pt2[0],
                y2: pt2[1]
            },
            style: tickLineStyle,
            z2: 2,
            silent: true
        });
        tickEl.anid = anidPrefix + '_' + ticksCoords[i].tickValue;
        tickEls.push(tickEl);
    }
    return tickEls;
}

function buildAxisMajorTicks(
    group: graphic.Group,
    transformGroup: graphic.Group,
    axisModel: AxisBaseModel,
    tickDirection: number
) {
    let axis = axisModel.axis;

    let tickModel = axisModel.getModel('axisTick');

    if (!tickModel.get('show') || axis.scale.isBlank()) {
        return;
    }

    let lineStyleModel = tickModel.getModel('lineStyle');
    let tickEndCoord = tickDirection * tickModel.get('length');

    let ticksCoords = axis.getTicksCoords();

    let ticksEls = createTicks(ticksCoords, transformGroup.transform, tickEndCoord, defaults(
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
    transformGroup: graphic.Group,
    axisModel: AxisBaseModel,
    tickDirection: number
) {
    let axis = axisModel.axis;

    let minorTickModel = axisModel.getModel('minorTick');

    if (!minorTickModel.get('show') || axis.scale.isBlank()) {
        return;
    }

    let minorTicksCoords = axis.getMinorTicksCoords();
    if (!minorTicksCoords.length) {
        return;
    }

    let lineStyleModel = minorTickModel.getModel('lineStyle');
    let tickEndCoord = tickDirection * minorTickModel.get('length');

    let minorTickLineStyle = defaults(
        lineStyleModel.getLineStyle(),
        defaults(
            axisModel.getModel('axisTick').getLineStyle(),
            {
                stroke: axisModel.get(['axisLine', 'lineStyle', 'color'])
            }
        )
    );

    for (let i = 0; i < minorTicksCoords.length; i++) {
        let minorTicksEls = createTicks(
            minorTicksCoords[i], transformGroup.transform, tickEndCoord, minorTickLineStyle, 'minorticks_' + i
        );
        for (let k = 0; k < minorTicksEls.length; k++) {
            group.add(minorTicksEls[k]);
        }
    }
}

function buildAxisLabel(
    group: graphic.Group,
    transformGroup: graphic.Group,
    axisModel: AxisBaseModel,
    opt: AxisBuilderCfg
) {
    let axis = axisModel.axis;
    let show = retrieve(opt.axisLabelShow, axisModel.get(['axisLabel', 'show']));

    if (!show || axis.scale.isBlank()) {
        return;
    }

    let labelModel = axisModel.getModel('axisLabel');
    let labelMargin = labelModel.get('margin');
    let labels = axis.getViewLabels();

    // Special label rotate.
    let labelRotation = (
        retrieve(opt.labelRotate, labelModel.get('rotate')) || 0
    ) * PI / 180;

    let labelLayout = AxisBuilder.innerTextLayout(opt.rotation, labelRotation, opt.labelDirection);
    let rawCategoryData = axisModel.getCategories && axisModel.getCategories(true);

    let labelEls: graphic.Text[] = [];
    let silent = AxisBuilder.isLabelSilent(axisModel);
    let triggerEvent = axisModel.get('triggerEvent');

    each(labels, function (labelItem, index) {
        let tickValue = labelItem.tickValue;
        let formattedLabel = labelItem.formattedLabel;
        let rawLabel = labelItem.rawLabel;

        let itemLabelModel = labelModel;
        if (rawCategoryData && rawCategoryData[tickValue]) {
            const rawCategoryItem = rawCategoryData[tickValue];
            if (isObject(rawCategoryItem) && rawCategoryItem.textStyle) {
                itemLabelModel = new Model(
                    rawCategoryItem.textStyle, labelModel, axisModel.ecModel
                );
            }
        }

        let textColor = itemLabelModel.getTextColor() as AxisBaseOption['axisLabel']['color']
            || axisModel.get(['axisLine', 'lineStyle', 'color']);

        let tickCoord = axis.dataToCoord(tickValue);
        let pos = [
            tickCoord,
            opt.labelOffset + opt.labelDirection * labelMargin
        ];

        let textEl = new graphic.Text({
            position: pos,
            rotation: labelLayout.rotation,
            silent: silent,
            z2: 10
        });
        textEl.anid = 'label_' + tickValue;

        graphic.setTextStyle(textEl.style, itemLabelModel, {
            text: formattedLabel,
            textAlign: itemLabelModel.getShallow('align', true)
                || labelLayout.textAlign,
            textVerticalAlign: itemLabelModel.getShallow('verticalAlign', true)
                || itemLabelModel.getShallow('baseline', true)
                || labelLayout.textVerticalAlign,
            textFill: typeof textColor === 'function'
                ? textColor(
                    // (1) In category axis with data zoom, tick is not the original
                    // index of axis.data. So tick should not be exposed to user
                    // in category axis.
                    // (2) Compatible with previous version, which always use formatted label as
                    // input. But in interval scale the formatted label is like '223,445', which
                    // maked user repalce ','. So we modify it to return original val but remain
                    // it as 'string' to avoid error in replacing.
                    axis.type === 'category'
                        ? rawLabel
                        : axis.type === 'value'
                        ? tickValue + ''
                        : tickValue,
                    index
                )
                : textColor
        });

        // Pack data for mouse event
        if (triggerEvent) {
            const eventData = AxisBuilder.makeAxisEventDataBase(axisModel);
            eventData.targetType = 'axisLabel';
            eventData.value = rawLabel;

            graphic.getECData(textEl).eventData = eventData;
        }

        // FIXME
        transformGroup.add(textEl);
        textEl.updateTransform();

        labelEls.push(textEl);
        group.add(textEl);

        textEl.decomposeTransform();

    });

    return labelEls;
}


export default AxisBuilder;
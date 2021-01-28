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

// TODO: move labels out of viewport.

import {
    Text as ZRText,
    BoundingRect,
    Polyline,
    updateProps,
    initProps,
    isElementRemoved
} from '../util/graphic';
import { getECData } from '../util/innerStore';
import ExtensionAPI from '../core/ExtensionAPI';
import {
    ZRTextAlign,
    ZRTextVerticalAlign,
    LabelLayoutOption,
    LabelLayoutOptionCallback,
    LabelLayoutOptionCallbackParams,
    LabelLineOption,
    Dictionary,
    ECElement,
    SeriesDataType
} from '../util/types';
import { parsePercent } from '../util/number';
import ChartView from '../view/Chart';
import Element, { ElementTextConfig } from 'zrender/src/Element';
import { RectLike } from 'zrender/src/core/BoundingRect';
import Transformable from 'zrender/src/core/Transformable';
import { updateLabelLinePoints, setLabelLineStyle, getLabelLineStatesModels } from './labelGuideHelper';
import SeriesModel from '../model/Series';
import { makeInner } from '../util/model';
import { retrieve2, each, keys, isFunction, filter, indexOf } from 'zrender/src/core/util';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import Model from '../model/Model';
import { prepareLayoutList, hideOverlap, shiftLayoutOnX, shiftLayoutOnY } from './labelLayoutHelper';
import { labelInner, animateLabelValue } from './labelStyle';

interface LabelDesc {
    label: ZRText
    labelLine: Polyline

    seriesModel: SeriesModel
    // Can be null if label doesn't represent any data.
    dataIndex?: number
    // Can be null if label doesn't represent any data.
    dataType?: SeriesDataType

    layoutOption: LabelLayoutOptionCallback | LabelLayoutOption
    computedLayoutOption: LabelLayoutOption

    hostRect: RectLike
    rect: RectLike

    priority: number

    defaultAttr: SavedLabelAttr
}

interface SavedLabelAttr {
    ignore: boolean
    labelGuideIgnore: boolean

    x: number
    y: number
    rotation: number

    style: {
        align: ZRTextAlign
        verticalAlign: ZRTextVerticalAlign
        width: number
        height: number
        fontSize: number | string

        x: number
        y: number
    }

    cursor: string

    // Configuration in attached element
    attachedPos: ElementTextConfig['position']
    attachedRot: ElementTextConfig['rotation']

}

function cloneArr(points: number[][]) {
    if (points) {
        const newPoints = [];
        for (let i = 0; i < points.length; i++) {
            newPoints.push(points[i].slice());
        }
        return newPoints;
    }
}

function prepareLayoutCallbackParams(labelItem: LabelDesc, hostEl?: Element): LabelLayoutOptionCallbackParams {
    const label = labelItem.label;
    const labelLine = hostEl && hostEl.getTextGuideLine();
    return {
        dataIndex: labelItem.dataIndex,
        dataType: labelItem.dataType,
        seriesIndex: labelItem.seriesModel.seriesIndex,
        text: labelItem.label.style.text,
        rect: labelItem.hostRect,
        labelRect: labelItem.rect,
        // x: labelAttr.x,
        // y: labelAttr.y,
        align: label.style.align,
        verticalAlign: label.style.verticalAlign,
        labelLinePoints: cloneArr(labelLine && labelLine.shape.points)
    };
}

const LABEL_OPTION_TO_STYLE_KEYS = ['align', 'verticalAlign', 'width', 'height', 'fontSize'] as const;

const dummyTransformable = new Transformable();

const labelLayoutInnerStore = makeInner<{
    oldLayout: {
        x: number,
        y: number,
        rotation: number
    },
    oldLayoutSelect?: {
        x?: number,
        y?: number,
        rotation?: number
    },
    oldLayoutEmphasis?: {
        x?: number,
        y?: number,
        rotation?: number
    },

    needsUpdateLabelLine?: boolean
}, ZRText>();

const labelLineAnimationStore = makeInner<{
    oldLayout: {
        points: number[][]
    }
}, Polyline>();

type LabelLineOptionMixin = {
    labelLine: LabelLineOption,
    emphasis: { labelLine: LabelLineOption }
};

function extendWithKeys(target: Dictionary<any>, source: Dictionary<any>, keys: string[]) {
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (source[key] != null) {
            target[key] = source[key];
        }
    }
}

const LABEL_LAYOUT_PROPS = ['x', 'y', 'rotation'];

class LabelManager {

    private _labelList: LabelDesc[] = [];
    private _chartViewList: ChartView[] = [];

    constructor() {}

    clearLabels() {
        this._labelList = [];
        this._chartViewList = [];
    }

    /**
     * Add label to manager
     */
    private _addLabel(
        dataIndex: number | null | undefined,
        dataType: SeriesDataType | null | undefined,
        seriesModel: SeriesModel,
        label: ZRText,
        layoutOption: LabelDesc['layoutOption']
    ) {
        const labelStyle = label.style;
        const hostEl = label.__hostTarget;
        const textConfig = hostEl.textConfig || {};

        // TODO: If label is in other state.
        const labelTransform = label.getComputedTransform();
        const labelRect = label.getBoundingRect().plain();
        BoundingRect.applyTransform(labelRect, labelRect, labelTransform);

        if (labelTransform) {
            dummyTransformable.setLocalTransform(labelTransform);
        }
        else {
            // Identity transform.
            dummyTransformable.x = dummyTransformable.y = dummyTransformable.rotation =
                dummyTransformable.originX = dummyTransformable.originY = 0;
            dummyTransformable.scaleX = dummyTransformable.scaleY = 1;
        }

        const host = label.__hostTarget;
        let hostRect;
        if (host) {
            hostRect = host.getBoundingRect().plain();
            const transform = host.getComputedTransform();
            BoundingRect.applyTransform(hostRect, hostRect, transform);
        }

        const labelGuide = hostRect && host.getTextGuideLine();

        this._labelList.push({
            label,
            labelLine: labelGuide,

            seriesModel,
            dataIndex,
            dataType,

            layoutOption,
            computedLayoutOption: null,

            rect: labelRect,

            hostRect,

            // Label with lower priority will be hidden when overlapped
            // Use rect size as default priority
            priority: hostRect ? hostRect.width * hostRect.height : 0,

            // Save default label attributes.
            // For restore if developers want get back to default value in callback.
            defaultAttr: {
                ignore: label.ignore,
                labelGuideIgnore: labelGuide && labelGuide.ignore,

                x: dummyTransformable.x,
                y: dummyTransformable.y,
                rotation: dummyTransformable.rotation,

                style: {
                    x: labelStyle.x,
                    y: labelStyle.y,

                    align: labelStyle.align,
                    verticalAlign: labelStyle.verticalAlign,
                    width: labelStyle.width,
                    height: labelStyle.height,

                    fontSize: labelStyle.fontSize
                },

                cursor: label.cursor,

                attachedPos: textConfig.position,
                attachedRot: textConfig.rotation
            }
        });
    }

    addLabelsOfSeries(chartView: ChartView) {
        this._chartViewList.push(chartView);

        const seriesModel = chartView.__model;

        const layoutOption = seriesModel.get('labelLayout');

        /**
         * Ignore layouting if it's not specified anything.
         */
        if (!(isFunction(layoutOption) || keys(layoutOption).length)) {
            return;
        }

        chartView.group.traverse((child) => {
            if (child.ignore) {
                return true;    // Stop traverse descendants.
            }

            // Only support label being hosted on graphic elements.
            const textEl = child.getTextContent();
            const ecData = getECData(child);
            // Can only attach the text on the element with dataIndex
            if (textEl && !(textEl as ECElement).disableLabelLayout) {
                this._addLabel(ecData.dataIndex, ecData.dataType, seriesModel, textEl, layoutOption);
            }
        });
    }

    updateLayoutConfig(api: ExtensionAPI) {
        const width = api.getWidth();
        const height = api.getHeight();

        function createDragHandler(el: Element, labelLineModel: Model) {
            return function () {
                updateLabelLinePoints(el, labelLineModel);
            };
        }
        for (let i = 0; i < this._labelList.length; i++) {
            const labelItem = this._labelList[i];
            const label = labelItem.label;
            const hostEl = label.__hostTarget;
            const defaultLabelAttr = labelItem.defaultAttr;
            let layoutOption;
            // TODO A global layout option?
            if (typeof labelItem.layoutOption === 'function') {
                layoutOption = labelItem.layoutOption(
                    prepareLayoutCallbackParams(labelItem, hostEl)
                );
            }
            else {
                layoutOption = labelItem.layoutOption;
            }

            layoutOption = layoutOption || {};
            labelItem.computedLayoutOption = layoutOption;

            const degreeToRadian = Math.PI / 180;
            if (hostEl) {
                hostEl.setTextConfig({
                    // Force to set local false.
                    local: false,
                    // Ignore position and rotation config on the host el if x or y is changed.
                    position: (layoutOption.x != null || layoutOption.y != null)
                        ? null : defaultLabelAttr.attachedPos,
                    // Ignore rotation config on the host el if rotation is changed.
                    rotation: layoutOption.rotate != null
                        ? layoutOption.rotate * degreeToRadian : defaultLabelAttr.attachedRot,
                    offset: [layoutOption.dx || 0, layoutOption.dy || 0]
                });
            }
            let needsUpdateLabelLine = false;
            if (layoutOption.x != null) {
                // TODO width of chart view.
                label.x = parsePercent(layoutOption.x, width);
                label.setStyle('x', 0);  // Ignore movement in style. TODO: origin.
                needsUpdateLabelLine = true;
            }
            else {
                label.x = defaultLabelAttr.x;
                label.setStyle('x', defaultLabelAttr.style.x);
            }

            if (layoutOption.y != null) {
                // TODO height of chart view.
                label.y = parsePercent(layoutOption.y, height);
                label.setStyle('y', 0);  // Ignore movement in style.
                needsUpdateLabelLine = true;
            }
            else {
                label.y = defaultLabelAttr.y;
                label.setStyle('y', defaultLabelAttr.style.y);
            }

            if (layoutOption.labelLinePoints) {
                const guideLine = hostEl.getTextGuideLine();
                if (guideLine) {
                    guideLine.setShape({ points: layoutOption.labelLinePoints });
                    // Not update
                    needsUpdateLabelLine = false;
                }
            }

            const labelLayoutStore = labelLayoutInnerStore(label);
            labelLayoutStore.needsUpdateLabelLine = needsUpdateLabelLine;

            label.rotation = layoutOption.rotate != null
                ? layoutOption.rotate * degreeToRadian : defaultLabelAttr.rotation;

            for (let k = 0; k < LABEL_OPTION_TO_STYLE_KEYS.length; k++) {
                const key = LABEL_OPTION_TO_STYLE_KEYS[k];
                label.setStyle(key, layoutOption[key] != null ? layoutOption[key] : defaultLabelAttr.style[key]);
            }


            if (layoutOption.draggable) {
                label.draggable = true;
                label.cursor = 'move';
                if (hostEl) {
                    let hostModel: Model<LabelLineOptionMixin> =
                        labelItem.seriesModel as SeriesModel<LabelLineOptionMixin>;
                    if (labelItem.dataIndex != null) {
                        const data = labelItem.seriesModel.getData(labelItem.dataType);
                        hostModel = data.getItemModel<LabelLineOptionMixin>(labelItem.dataIndex);
                    }
                    label.on('drag', createDragHandler(hostEl, hostModel.getModel('labelLine')));
                }
            }
            else {
                // TODO Other drag functions?
                label.off('drag');
                label.cursor = defaultLabelAttr.cursor;
            }
        }
    }

    layout(api: ExtensionAPI) {
        const width = api.getWidth();
        const height = api.getHeight();

        const labelList = prepareLayoutList(this._labelList);
        const labelsNeedsAdjustOnX = filter(labelList, function (item) {
            return item.layoutOption.moveOverlap === 'shiftX';
        });
        const labelsNeedsAdjustOnY = filter(labelList, function (item) {
            return item.layoutOption.moveOverlap === 'shiftY';
        });

        shiftLayoutOnX(labelsNeedsAdjustOnX, 0, width);
        shiftLayoutOnY(labelsNeedsAdjustOnY, 0, height);

        const labelsNeedsHideOverlap = filter(labelList, function (item) {
            return item.layoutOption.hideOverlap;
        });

        hideOverlap(labelsNeedsHideOverlap);
    }

    /**
     * Process all labels. Not only labels with layoutOption.
     */
    processLabelsOverall() {
        each(this._chartViewList, (chartView) => {
            const seriesModel = chartView.__model;
            const ignoreLabelLineUpdate = chartView.ignoreLabelLineUpdate;
            const animationEnabled = seriesModel.isAnimationEnabled();

            chartView.group.traverse((child) => {
                if (child.ignore) {
                    return true;    // Stop traverse descendants.
                }

                let needsUpdateLabelLine = !ignoreLabelLineUpdate;
                const label = child.getTextContent();
                if (!needsUpdateLabelLine && label) {
                    needsUpdateLabelLine = labelLayoutInnerStore(label).needsUpdateLabelLine;
                }
                if (needsUpdateLabelLine) {
                    this._updateLabelLine(child, seriesModel);
                }

                if (animationEnabled) {
                    this._animateLabels(child, seriesModel);
                }
            });
        });
    }

    private _updateLabelLine(el: Element, seriesModel: SeriesModel) {
        // Only support label being hosted on graphic elements.
        const textEl = el.getTextContent();
        // Update label line style.
        const ecData = getECData(el);
        const dataIndex = ecData.dataIndex;

        // Only support labelLine on the labels represent data.
        if (textEl && dataIndex != null) {
            const data = seriesModel.getData(ecData.dataType);
            const itemModel = data.getItemModel<LabelLineOptionMixin>(dataIndex);

            const defaultStyle: PathStyleProps = {};
            const visualStyle = data.getItemVisual(dataIndex, 'style');
            const visualType = data.getVisual('drawType');
            // Default to be same with main color
            defaultStyle.stroke = visualStyle[visualType];

            const labelLineModel = itemModel.getModel('labelLine');

            setLabelLineStyle(el, getLabelLineStatesModels(itemModel), defaultStyle);

            updateLabelLinePoints(el, labelLineModel);
        }
    }

    private _animateLabels(el: Element, seriesModel: SeriesModel) {
        const textEl = el.getTextContent();
        const guideLine = el.getTextGuideLine();
        // Animate
        if (textEl
            && !textEl.ignore
            && !textEl.invisible
            && !(el as ECElement).disableLabelAnimation
            && !isElementRemoved(el)
        ) {
            const layoutStore = labelLayoutInnerStore(textEl);
            const oldLayout = layoutStore.oldLayout;
            const ecData = getECData(el);
            const dataIndex = ecData.dataIndex;
            const newProps = {
                x: textEl.x,
                y: textEl.y,
                rotation: textEl.rotation
            };
            const data = seriesModel.getData(ecData.dataType);

            if (!oldLayout) {
                textEl.attr(newProps);
                // Disable fade in animation if value animation is enabled.
                if (!labelInner(textEl).valueAnimation) {
                    const oldOpacity = retrieve2(textEl.style.opacity, 1);
                    // Fade in animation
                    textEl.style.opacity = 0;
                    initProps(textEl, {
                        style: { opacity: oldOpacity }
                    }, seriesModel, dataIndex);
                }
            }
            else {
                textEl.attr(oldLayout);

                // Make sure the animation from is in the right status.
                const prevStates = el.prevStates;
                if (prevStates) {
                    if (indexOf(prevStates, 'select') >= 0) {
                        textEl.attr(layoutStore.oldLayoutSelect);
                    }
                    if (indexOf(prevStates, 'emphasis') >= 0) {
                        textEl.attr(layoutStore.oldLayoutEmphasis);
                    }
                }
                updateProps(textEl, newProps, seriesModel, dataIndex);
            }
            layoutStore.oldLayout = newProps;

            if (textEl.states.select) {
                const layoutSelect = layoutStore.oldLayoutSelect = {};
                extendWithKeys(layoutSelect, newProps, LABEL_LAYOUT_PROPS);
                extendWithKeys(layoutSelect, textEl.states.select, LABEL_LAYOUT_PROPS);
            }

            if (textEl.states.emphasis) {
                const layoutEmphasis = layoutStore.oldLayoutEmphasis = {};
                extendWithKeys(layoutEmphasis, newProps, LABEL_LAYOUT_PROPS);
                extendWithKeys(layoutEmphasis, textEl.states.emphasis, LABEL_LAYOUT_PROPS);
            }

            animateLabelValue(textEl, dataIndex, data, seriesModel, seriesModel);
        }

        if (guideLine && !guideLine.ignore && !guideLine.invisible) {
            const layoutStore = labelLineAnimationStore(guideLine);
            const oldLayout = layoutStore.oldLayout;
            const newLayout = { points: guideLine.shape.points };
            if (!oldLayout) {
                guideLine.setShape(newLayout);
                guideLine.style.strokePercent = 0;
                initProps(guideLine, {
                    style: { strokePercent: 1 }
                }, seriesModel);
            }
            else {
                guideLine.attr({ shape: oldLayout });
                updateProps(guideLine, {
                    shape: newLayout
                }, seriesModel);
            }

            layoutStore.oldLayout = newLayout;
        }
    }
}


export default LabelManager;
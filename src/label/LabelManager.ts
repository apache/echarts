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
    OrientedBoundingRect,
    Text as ZRText,
    Point,
    BoundingRect,
    getECData,
    Polyline,
    updateProps,
    initProps
} from '../util/graphic';
import { MatrixArray } from 'zrender/src/core/matrix';
import ExtensionAPI from '../ExtensionAPI';
import {
    ZRTextAlign,
    ZRTextVerticalAlign,
    LabelLayoutOption,
    LabelLayoutOptionCallback,
    LabelLayoutOptionCallbackParams,
    LabelLineOption
} from '../util/types';
import { parsePercent } from '../util/number';
import ChartView from '../view/Chart';
import Element, { ElementTextConfig } from 'zrender/src/Element';
import { RectLike } from 'zrender/src/core/BoundingRect';
import Transformable from 'zrender/src/core/Transformable';
import { updateLabelLinePoints, setLabelLineStyle } from './labelGuideHelper';
import SeriesModel from '../model/Series';
import { makeInner } from '../util/model';
import { retrieve2, each, keys } from 'zrender/src/core/util';
import { PathStyleProps } from 'zrender/src/graphic/Path';

interface DisplayedLabelItem {
    label: ZRText
    rect: BoundingRect
    localRect: BoundingRect
    obb?: OrientedBoundingRect
    axisAligned: boolean
    transform: MatrixArray
}

interface LabelLayoutDesc {
    label: ZRText
    labelLine: Polyline

    seriesModel: SeriesModel
    dataIndex: number

    layoutOption: LabelLayoutOptionCallback | LabelLayoutOption

    overlap: LabelLayoutOption['overlap']
    overlapMargin: LabelLayoutOption['overlapMargin']

    hostRect: RectLike
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

        x: number
        y: number
    }

    // Configuration in attached element
    attachedPos: ElementTextConfig['position']
    attachedRot: ElementTextConfig['rotation']

    rect: RectLike
}

function prepareLayoutCallbackParams(labelItem: LabelLayoutDesc): LabelLayoutOptionCallbackParams {
    const labelAttr = labelItem.defaultAttr;
    const label = labelItem.label;
    return {
        dataIndex: labelItem.dataIndex,
        seriesIndex: labelItem.seriesModel.seriesIndex,
        text: labelItem.label.style.text,
        rect: labelItem.hostRect,
        labelRect: labelAttr.rect,
        // x: labelAttr.x,
        // y: labelAttr.y,
        align: label.style.align,
        verticalAlign: label.style.verticalAlign
    };
}

const LABEL_OPTION_TO_STYLE_KEYS = ['align', 'verticalAlign', 'width', 'height'] as const;

const dummyTransformable = new Transformable();

const labelAnimationStore = makeInner<{
    oldLayout: {
        x: number,
        y: number,
        rotation: number
    }
}, ZRText>();

const labelLineAnimationStore = makeInner<{
    oldLayout: {
        points: number[][]
    }
}, Polyline>();

class LabelManager {

    private _labelList: LabelLayoutDesc[] = [];
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
        dataIndex: number,
        seriesModel: SeriesModel,
        label: ZRText,
        layoutOption: LabelLayoutDesc['layoutOption']
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

            layoutOption,

            hostRect,

            overlap: 'hidden',
            overlapMargin: 0,

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

                rect: labelRect,

                style: {
                    x: labelStyle.x,
                    y: labelStyle.y,

                    align: labelStyle.align,
                    verticalAlign: labelStyle.verticalAlign,
                    width: labelStyle.width,
                    height: labelStyle.height
                },

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
        if (!layoutOption || !keys(layoutOption).length) {
            return;
        }

        chartView.group.traverse((child) => {
            if (child.ignore) {
                return true;    // Stop traverse descendants.
            }

            // Only support label being hosted on graphic elements.
            const textEl = child.getTextContent();
            const dataIndex = getECData(child).dataIndex;
            // Can only attach the text on the element with dataIndex
            if (textEl && dataIndex != null) {
                this._addLabel(dataIndex, seriesModel, textEl, layoutOption);
            }
        });
    }

    updateLayoutConfig(api: ExtensionAPI) {
        const width = api.getWidth();
        const height = api.getHeight();
        for (let i = 0; i < this._labelList.length; i++) {
            const labelItem = this._labelList[i];
            const label = labelItem.label;
            const hostEl = label.__hostTarget;
            const defaultLabelAttr = labelItem.defaultAttr;
            let layoutOption;
            // TODO A global layout option?
            if (typeof labelItem.layoutOption === 'function') {
                layoutOption = labelItem.layoutOption(
                    prepareLayoutCallbackParams(labelItem)
                );
            }
            else {
                layoutOption = labelItem.layoutOption;
            }

            layoutOption = layoutOption || {};

            if (hostEl) {
                hostEl.setTextConfig({
                    // Force to set local false.
                    local: false,
                    // Ignore position and rotation config on the host el if x or y is changed.
                    position: (layoutOption.x != null || layoutOption.y != null)
                        ? null : defaultLabelAttr.attachedPos,
                    // Ignore rotation config on the host el if rotation is changed.
                    rotation: layoutOption.rotation != null ? layoutOption.rotation : defaultLabelAttr.attachedRot,
                    offset: [layoutOption.dx || 0, layoutOption.dy || 0]
                });
            }
            if (layoutOption.x != null) {
                // TODO width of chart view.
                label.x = parsePercent(layoutOption.x, width);
                label.setStyle('x', 0);  // Ignore movement in style. TODO: origin.
            }
            else {
                label.x = defaultLabelAttr.x;
                label.setStyle('x', defaultLabelAttr.style.x);
            }

            if (layoutOption.y != null) {
                // TODO height of chart view.
                label.y = parsePercent(layoutOption.y, height);
                label.setStyle('y', 0);  // Ignore movement in style.
            }
            else {
                label.y = defaultLabelAttr.y;
                label.setStyle('y', defaultLabelAttr.style.y);
            }

            label.rotation = layoutOption.rotation != null
                ? layoutOption.rotation : defaultLabelAttr.rotation;

            for (let k = 0; k < LABEL_OPTION_TO_STYLE_KEYS.length; k++) {
                const key = LABEL_OPTION_TO_STYLE_KEYS[k];
                label.setStyle(key, layoutOption[key] != null ? layoutOption[key] : defaultLabelAttr.style[key]);
            }

            labelItem.overlap = layoutOption.overlap;
            labelItem.overlapMargin = layoutOption.overlapMargin;
        }
    }

    layout() {
        // TODO: sort by priority(area)
        const labelList = this._labelList;

        const displayedLabels: DisplayedLabelItem[] = [];
        const mvt = new Point();

        // TODO, render overflow visible first, put in the displayedLabels.
        labelList.sort(function (a, b) {
            return b.priority - a.priority;
        });

        for (let i = 0; i < labelList.length; i++) {
            const labelItem = labelList[i];
            if (labelItem.defaultAttr.ignore) {
                continue;
            }

            const label = labelItem.label;
            const transform = label.getComputedTransform();
            // NOTE: Get bounding rect after getComputedTransform, or label may not been updated by the host el.
            const localRect = label.getBoundingRect();
            const isAxisAligned = !transform || (transform[1] < 1e-5 && transform[2] < 1e-5);

            const globalRect = localRect.clone();
            globalRect.applyTransform(transform);

            let obb = isAxisAligned ? new OrientedBoundingRect(localRect, transform) : null;
            let overlapped = false;
            const overlapMargin = labelItem.overlapMargin || 0;
            const marginSqr = overlapMargin * overlapMargin;
            for (let j = 0; j < displayedLabels.length; j++) {
                const existsTextCfg = displayedLabels[j];
                // Fast rejection.
                if (!globalRect.intersect(existsTextCfg.rect, mvt) && mvt.lenSquare() > marginSqr) {
                    continue;
                }

                if (isAxisAligned && existsTextCfg.axisAligned) {   // Is overlapped
                    overlapped = true;
                    break;
                }

                if (!existsTextCfg.obb) { // If self is not axis aligned. But other is.
                    existsTextCfg.obb = new OrientedBoundingRect(existsTextCfg.localRect, existsTextCfg.transform);
                }

                if (!obb) { // If self is axis aligned. But other is not.
                    obb = new OrientedBoundingRect(localRect, transform);
                }

                if (obb.intersect(existsTextCfg.obb, mvt) || mvt.lenSquare() < marginSqr) {
                    overlapped = true;
                    break;
                }
            }

            const labelLine = labelItem.labelLine;
            // TODO Callback to determine if this overlap should be handled?
            if (overlapped
                && labelItem.layoutOption
                && (labelItem.layoutOption as LabelLayoutOption).overlap === 'hidden'
            ) {
                label.hide();
                labelLine && labelLine.hide();
            }
            else {
                label.attr('ignore', labelItem.defaultAttr.ignore);
                labelLine && labelLine.attr('ignore', labelItem.defaultAttr.labelGuideIgnore);

                displayedLabels.push({
                    label,
                    rect: globalRect,
                    localRect,
                    obb,
                    axisAligned: isAxisAligned,
                    transform
                });
            }

        }
    }

    /**
     * Process all labels. Not only labels with layoutOption.
     */
    processLabelsOverall() {
        each(this._chartViewList, (chartView) => {
            const seriesModel = chartView.__model;
            const animationEnabled = seriesModel.isAnimationEnabled();
            const ignoreLabelLineUpdate = chartView.ignoreLabelLineUpdate;

            chartView.group.traverse((child) => {
                if (child.ignore) {
                    return true;    // Stop traverse descendants.
                }

                if (!ignoreLabelLineUpdate) {
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

        if (textEl && dataIndex != null) {
            const data = seriesModel.getData(ecData.dataType);
            const itemModel = data.getItemModel<{
                labelLine: LabelLineOption,
                emphasis: { labelLine: LabelLineOption }
            }>(dataIndex);

            const defaultStyle: PathStyleProps = {};
            const visualStyle = data.getItemVisual(dataIndex, 'style');
            const visualType = data.getVisual('drawType');
            // Default to be same with main color
            defaultStyle.stroke = visualStyle[visualType];

            const labelLineModel = itemModel.getModel('labelLine');

            setLabelLineStyle(el, {
                normal: labelLineModel,
                emphasis: itemModel.getModel(['emphasis', 'labelLine'])
            }, defaultStyle);


            updateLabelLinePoints(el, labelLineModel);
        }
    }

    private _animateLabels(el: Element, seriesModel: SeriesModel) {
        const textEl = el.getTextContent();
        const guideLine = el.getTextGuideLine();
        // Animate
        if (textEl && !textEl.ignore && !textEl.invisible) {
            const layoutStore = labelAnimationStore(textEl);
            const oldLayout = layoutStore.oldLayout;
            const newProps = {
                x: textEl.x,
                y: textEl.y,
                rotation: textEl.rotation
            };
            if (!oldLayout) {
                textEl.attr(newProps);
                const oldOpacity = retrieve2(textEl.style.opacity, 1);
                // Fade in animation
                textEl.style.opacity = 0;
                initProps(textEl, {
                    style: { opacity: oldOpacity }
                }, seriesModel);
            }
            else {
                textEl.attr(oldLayout);
                updateProps(textEl, newProps, seriesModel);
            }
            layoutStore.oldLayout = newProps;
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
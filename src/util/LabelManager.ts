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

import { OrientedBoundingRect, Text as ZRText, Point, BoundingRect, getECData } from './graphic';
import { MatrixArray } from 'zrender/src/core/matrix';
import ExtensionAPI from '../ExtensionAPI';
import {
    ZRTextAlign,
    ZRTextVerticalAlign,
    LabelLayoutOption,
    LabelLayoutOptionCallback,
    LabelLayoutOptionCallbackParams
} from './types';
import { parsePercent } from './number';
import ChartView from '../view/Chart';
import { ElementTextConfig } from 'zrender/src/Element';
import { RectLike } from 'zrender/src/core/BoundingRect';
import Transformable from 'zrender/src/core/Transformable';

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
    seriesIndex: number
    dataIndex: number
    layoutOption: LabelLayoutOptionCallback | LabelLayoutOption

    overlap: LabelLayoutOption['overlap']
    overlapMargin: LabelLayoutOption['overlapMargin']

    hostRect: RectLike
    priority: number

    defaultAttr: SavedLabelAttr
}

interface SavedLabelAttr {
    x: number
    y: number
    rotation: number

    align: ZRTextAlign
    verticalAlign: ZRTextVerticalAlign
    width: number
    height: number

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
        seriesIndex: labelItem.seriesIndex,
        text: labelItem.label.style.text,
        rect: labelItem.hostRect,
        labelRect: labelAttr.rect,
        x: labelAttr.x,
        y: labelAttr.y,
        align: label.style.align,
        verticalAlign: label.style.verticalAlign
    };
}

const LABEL_OPTION_TO_STYLE_KEYS = ['align', 'verticalAlign', 'width', 'height'] as const;

const dummyTransformable = new Transformable();

class LabelManager {

    private _labelList: LabelLayoutDesc[] = [];

    constructor() {}

    clearLabels() {
        this._labelList = [];
    }

    /**
     * Add label to manager
     * @param dataIndex
     * @param seriesIndex
     * @param label
     * @param layoutOption
     */
    addLabel(dataIndex: number, seriesIndex: number, label: ZRText, layoutOption: LabelLayoutDesc['layoutOption']) {
        const labelStyle = label.style;
        const hostEl = label.__hostTarget;
        const textConfig = hostEl.textConfig || {};

        const labelTransform = label.getComputedTransform();
        const labelRect = label.getBoundingRect().plain();
        BoundingRect.applyTransform(labelRect, labelRect, labelTransform);

        dummyTransformable.setLocalTransform(labelTransform);

        const host = label.__hostTarget;
        let hostRect;
        if (host) {
            hostRect = host.getBoundingRect().plain();
            const transform = host.getComputedTransform();
            BoundingRect.applyTransform(hostRect, hostRect, transform);
        }

        this._labelList.push({
            seriesIndex,
            dataIndex,
            label,
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
                x: dummyTransformable.x,
                y: dummyTransformable.y,
                rotation: dummyTransformable.rotation,

                rect: labelRect,

                align: labelStyle.align,
                verticalAlign: labelStyle.verticalAlign,
                width: labelStyle.width,
                height: labelStyle.height,

                attachedPos: textConfig.position,
                attachedRot: textConfig.rotation
            }
        });

    }

    addLabelsOfSeries(chartView: ChartView) {
        const seriesModel = chartView.__model;
        const layoutOption = seriesModel.get('labelLayout');
        chartView.group.traverse((child) => {
            if (child.ignore) {
                return true;    // Stop traverse descendants.
            }

            // Only support label being hosted on graphic elements.
            const textEl = child.getTextContent();
            const dataIndex = getECData(child).dataIndex;
            if (textEl && dataIndex != null) {
                this.addLabel(dataIndex, seriesModel.seriesIndex, textEl, layoutOption);
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
                    // Ignore position and rotation config on the host el if x or y is changed.
                    position: (layoutOption.x != null || layoutOption.y != null)
                        ? null : defaultLabelAttr.attachedPos,
                    // Ignore rotation config on the host el if rotation is changed.
                    rotation: layoutOption.rotation != null ? null : defaultLabelAttr.attachedRot,
                    offset: [layoutOption.dx || 0, layoutOption.dy || 0]
                });
            }
            label.x = layoutOption.x != null
                ? parsePercent(layoutOption.x, width)
                // Restore to default value if developers don't given a value.
                : defaultLabelAttr.x;

            label.y = layoutOption.y != null
                ? parsePercent(layoutOption.y, height)
                : defaultLabelAttr.y;

            label.rotation = layoutOption.rotation != null
                ? layoutOption.rotation : defaultLabelAttr.rotation;

            for (let k = 0; k < LABEL_OPTION_TO_STYLE_KEYS.length; k++) {
                const key = LABEL_OPTION_TO_STYLE_KEYS[k];
                label.setStyle(key, layoutOption[key] != null ? layoutOption[key] : defaultLabelAttr[key]);
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

        labelList.sort(function (a, b) {
            return b.priority - a.priority;
        });

        for (let i = 0; i < labelList.length; i++) {
            const labelItem = labelList[i];
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

            // TODO Callback to determine if this overlap should be handled?
            if (overlapped) {
                // label.setStyle({ opacity: 0.1 });
                // label.z = 0;
                // Use invisible instead of ignore because ignored label won't be updated in the host.
                label.attr('invisible', true);
            }
            else {
                // TODO Restore z
                // label.setStyle({ opacity: 1 });
                label.attr('invisible', false);

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
}




export default LabelManager;
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
import SeriesModel from '../model/Series';
import ChartView from '../view/Chart';

interface DisplayedLabelItem {
    label: ZRText
    rect: BoundingRect
    localRect: BoundingRect
    obb?: OrientedBoundingRect
    axisAligned: boolean
    transform: MatrixArray
}

interface LabelItem {
    label: ZRText
    seriesIndex: number
    dataIndex: number
    layoutOption: LabelLayoutOptionCallback | LabelLayoutOption
}

interface LabelLayoutInnerConfig {
    overlap: LabelLayoutOption['overlap']
    overlapMargin: LabelLayoutOption['overlapMargin']
}

interface SavedLabelAttr {
    x?: number
    y?: number
    rotation?: number
    align?: ZRTextAlign
    verticalAlign?: ZRTextVerticalAlign
    width?: number
    height?: number
}

function prepareLayoutCallbackParams(
    label: ZRText,
    dataIndex: number,
    seriesIndex: number
): LabelLayoutOptionCallbackParams {
    const host = label.__hostTarget;
    const labelTransform = label.getComputedTransform();
    const labelRect = label.getBoundingRect().plain();
    BoundingRect.applyTransform(labelRect, labelRect, labelTransform);
    let x = 0;
    let y = 0;
    if (labelTransform) {
        x = labelTransform[4];
        y = labelTransform[5];
    }

    let hostRect;
    if (host) {
        hostRect = host.getBoundingRect().plain();
        const transform = host.getComputedTransform();
        BoundingRect.applyTransform(hostRect, hostRect, transform);
    }

    return {
        dataIndex,
        seriesIndex,
        text: label.style.text,
        rect: hostRect,
        labelRect: labelRect,
        x, y,
        align: label.style.align,
        verticalAlign: label.style.verticalAlign
    };
}

const LABEL_OPTION_TO_STYLE_KEYS = ['align', 'verticalAlign', 'width', 'height'] as const;

class LabelManager {

    private _labelList: LabelItem[] = [];
    private _labelLayoutConfig: LabelLayoutInnerConfig[] = [];

    // Save default label attributes.
    // For restore if developers want get back to default value in callback.
    private _defaultLabelAttr: SavedLabelAttr[] = [];

    constructor() {}

    clearLabels() {
        this._labelList = [];
        this._labelLayoutConfig = [];
    }

    /**
     * Add label to manager
     * @param dataIndex
     * @param seriesIndex
     * @param label
     * @param layoutOption
     */
    addLabel(dataIndex: number, seriesIndex: number, label: ZRText, layoutOption: LabelItem['layoutOption']) {
        this._labelList.push({
            seriesIndex,
            dataIndex,
            label,
            layoutOption
        });
        // Push an empty config. Will be updated in updateLayoutConfig
        this._labelLayoutConfig.push({} as LabelLayoutInnerConfig);

        const labelStyle = label.style;
        this._defaultLabelAttr.push({
            x: label.x,
            y: label.y,
            rotation: label.rotation,
            align: labelStyle.align,
            verticalAlign: labelStyle.verticalAlign,
            width: labelStyle.width,
            height: labelStyle.height
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
            const layoutConfig = this._labelLayoutConfig[i];
            const defaultLabelAttr = this._defaultLabelAttr[i];
            let layoutOption;
            if (typeof labelItem.layoutOption === 'function') {
                layoutOption = labelItem.layoutOption(
                    prepareLayoutCallbackParams(label, labelItem.dataIndex, labelItem.seriesIndex)
                );
            }
            else {
                layoutOption = labelItem.layoutOption;
            }

            layoutOption = layoutOption || {};
            // if (hostEl) {
            //         // Ignore position and rotation config on the host el.
            //     hostEl.setTextConfig({
            //         position: null,
            //         rotation: null
            //     });
            // }
            // label.x = layoutOption.x != null
            //     ? parsePercent(layoutOption.x, width)
            //     // Restore to default value if developers don't given a value.
            //     : defaultLabelAttr.x;

            // label.y = layoutOption.y != null
            //     ? parsePercent(layoutOption.y, height)
            //     : defaultLabelAttr.y;

            // label.rotation = layoutOption.rotation != null
            //     ? layoutOption.rotation : defaultLabelAttr.rotation;

            // label.x += layoutOption.dx || 0;
            // label.y += layoutOption.dy || 0;

            // for (let k = 0; k < LABEL_OPTION_TO_STYLE_KEYS.length; k++) {
            //     const key = LABEL_OPTION_TO_STYLE_KEYS[k];
            //     label.setStyle(key, layoutOption[key] != null ? layoutOption[key] : defaultLabelAttr[key]);
            // }

            layoutConfig.overlap = layoutOption.overlap;
            layoutConfig.overlapMargin = layoutOption.overlapMargin;
        }
    }

    layout() {
        // TODO: sort by priority
        const labelList = this._labelList;

        const displayedLabels: DisplayedLabelItem[] = [];
        const mvt = new Point();

        for (let i = 0; i < labelList.length; i++) {
            const labelItem = labelList[i];
            const layoutConfig = this._labelLayoutConfig[i];
            const label = labelItem.label;
            const transform = label.getComputedTransform();
            // NOTE: Get bounding rect after getComputedTransform, or label may not been updated by the host el.
            const localRect = label.getBoundingRect();
            const isAxisAligned = !transform || (transform[1] < 1e-5 && transform[2] < 1e-5);

            const globalRect = localRect.clone();
            globalRect.applyTransform(transform);

            let obb = isAxisAligned ? new OrientedBoundingRect(localRect, transform) : null;
            let overlapped = false;
            const overlapMargin = layoutConfig.overlapMargin || 0;
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

            if (overlapped) {
                label.hide();
            }
            else {
                label.show();
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
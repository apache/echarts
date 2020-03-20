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

import * as graphic from '../../util/graphic';
import * as layout from '../../util/layout';
import {wrapTreePathInfo} from '../helper/treeHelper';
import TreemapSeriesModel, { TreemapSeriesNodeItemOption, TreemapSeriesOption } from './TreemapSeries';
import ExtensionAPI from '../../ExtensionAPI';
import { TreeNode } from '../../data/Tree';
import { curry, defaults } from 'zrender/src/core/util';
import { ZRElementEvent, BoxLayoutOptionMixin } from '../../util/types';
import Element from 'zrender/src/Element';
import Model from '../../model/Model';

const TEXT_PADDING = 8;
const ITEM_GAP = 8;
const ARRAY_LENGTH = 5;

interface OnSelectCallback {
    (node: TreeNode, e: ZRElementEvent): void
}

interface LayoutParam {
    pos: BoxLayoutOptionMixin
    box: {
        width: number,
        height: number
    }
    emptyItemWidth: number
    totalWidth: number
    renderList: {
        node: TreeNode,
        text: string
        width: number
    }[]
}

type BreadcrumbItemStyleModel = Model<TreemapSeriesOption['breadcrumb']['itemStyle']>;
type BreadcrumbTextStyleModel = Model<TreemapSeriesOption['breadcrumb']['itemStyle']['textStyle']>;

class Breadcrumb {

    group = new graphic.Group();

    constructor(containerGroup: graphic.Group) {
        containerGroup.add(this.group);
    }

    render(
        seriesModel: TreemapSeriesModel,
        api: ExtensionAPI,
        targetNode: TreeNode,
        onSelect: OnSelectCallback
    ) {
        let model = seriesModel.getModel('breadcrumb');
        let thisGroup = this.group;

        thisGroup.removeAll();

        if (!model.get('show') || !targetNode) {
            return;
        }

        let normalStyleModel = model.getModel('itemStyle');
        // let emphasisStyleModel = model.getModel('emphasis.itemStyle');
        let textStyleModel = normalStyleModel.getModel('textStyle');

        let layoutParam: LayoutParam = {
            pos: {
                left: model.get('left'),
                right: model.get('right'),
                top: model.get('top'),
                bottom: model.get('bottom')
            },
            box: {
                width: api.getWidth(),
                height: api.getHeight()
            },
            emptyItemWidth: model.get('emptyItemWidth'),
            totalWidth: 0,
            renderList: []
        };

        this._prepare(targetNode, layoutParam, textStyleModel);
        this._renderContent(seriesModel, layoutParam, normalStyleModel, textStyleModel, onSelect);

        layout.positionElement(thisGroup, layoutParam.pos, layoutParam.box);
    }

    /**
     * Prepare render list and total width
     * @private
     */
    _prepare(targetNode: TreeNode, layoutParam: LayoutParam, textStyleModel: BreadcrumbTextStyleModel) {
        for (let node = targetNode; node; node = node.parentNode) {
            let text = node.getModel<TreemapSeriesNodeItemOption>().get('name');
            let textRect = textStyleModel.getTextRect(text);
            let itemWidth = Math.max(
                textRect.width + TEXT_PADDING * 2,
                layoutParam.emptyItemWidth
            );
            layoutParam.totalWidth += itemWidth + ITEM_GAP;
            layoutParam.renderList.push({
                node: node,
                text: text,
                width: itemWidth
            });
        }
    }

    /**
     * @private
     */
    _renderContent(
        seriesModel: TreemapSeriesModel,
        layoutParam: LayoutParam,
        normalStyleModel: BreadcrumbItemStyleModel,
        textStyleModel: BreadcrumbTextStyleModel,
        onSelect: OnSelectCallback
    ) {
        // Start rendering.
        let lastX = 0;
        let emptyItemWidth = layoutParam.emptyItemWidth;
        let height = seriesModel.get(['breadcrumb', 'height']);
        let availableSize = layout.getAvailableSize(layoutParam.pos, layoutParam.box);
        let totalWidth = layoutParam.totalWidth;
        let renderList = layoutParam.renderList;

        for (let i = renderList.length - 1; i >= 0; i--) {
            let item = renderList[i];
            let itemNode = item.node;
            let itemWidth = item.width;
            let text = item.text;

            // Hdie text and shorten width if necessary.
            if (totalWidth > availableSize.width) {
                totalWidth -= itemWidth - emptyItemWidth;
                itemWidth = emptyItemWidth;
                text = null;
            }

            let el = new graphic.Polygon({
                shape: {
                    points: makeItemPoints(
                        lastX, 0, itemWidth, height,
                        i === renderList.length - 1, i === 0
                    )
                },
                style: defaults(
                    normalStyleModel.getItemStyle(),
                    {
                        lineJoin: 'bevel',
                        text: text,
                        textFill: textStyleModel.getTextColor(),
                        textFont: textStyleModel.getFont()
                    }
                ),
                z: 10,
                onclick: curry(onSelect, itemNode)
            });
            this.group.add(el);

            packEventData(el, seriesModel, itemNode);

            lastX += itemWidth + ITEM_GAP;
        }
    }

    remove() {
        this.group.removeAll();
    }
}

function makeItemPoints(x: number, y: number, itemWidth: number, itemHeight: number, head: boolean, tail: boolean) {
    let points = [
        [head ? x : x - ARRAY_LENGTH, y],
        [x + itemWidth, y],
        [x + itemWidth, y + itemHeight],
        [head ? x : x - ARRAY_LENGTH, y + itemHeight]
    ];
    !tail && points.splice(2, 0, [x + itemWidth + ARRAY_LENGTH, y + itemHeight / 2]);
    !head && points.push([x, y + itemHeight / 2]);
    return points;
}

// Package custom mouse event.
function packEventData(el: Element, seriesModel: TreemapSeriesModel, itemNode: TreeNode) {
    graphic.getECData(el).eventData = {
        componentType: 'series',
        componentSubType: 'treemap',
        componentIndex: seriesModel.componentIndex,
        seriesIndex: seriesModel.componentIndex,
        seriesName: seriesModel.name,
        seriesType: 'treemap',
        selfType: 'breadcrumb', // Distinguish with click event on treemap node.
        nodeData: {
            dataIndex: itemNode && itemNode.dataIndex,
            name: itemNode && itemNode.name
        },
        treePathInfo: itemNode && wrapTreePathInfo(itemNode, seriesModel)
    };
}

export default Breadcrumb;
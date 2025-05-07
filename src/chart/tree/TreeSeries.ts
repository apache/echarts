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

import SeriesModel from '../../model/Series';
import Tree from '../../data/Tree';
import {
    SeriesOption,
    SymbolOptionMixin,
    BoxLayoutOptionMixin,
    RoamOptionMixin,
    LineStyleOption,
    ItemStyleOption,
    SeriesLabelOption,
    OptionDataValue,
    StatesOptionMixin,
    OptionDataItemObject,
    CallbackDataParams,
    DefaultEmphasisFocus
} from '../../util/types';
import SeriesData from '../../data/SeriesData';
import View from '../../coord/View';
import { LayoutRect } from '../../util/layout';
import Model from '../../model/Model';
import { createTooltipMarkup } from '../../component/tooltip/tooltipMarkup';
import { wrapTreePathInfo } from '../helper/treeHelper';

interface CurveLineStyleOption extends LineStyleOption{
    curveness?: number
}

export interface TreeSeriesStateOption<TCbParams = never> {
    itemStyle?: ItemStyleOption<TCbParams>
    /**
     * Line style of the edge between node and it's parent.
     */
    lineStyle?: CurveLineStyleOption
    label?: SeriesLabelOption
}

interface TreeStatesMixin {
    emphasis?: {
        focus?: DefaultEmphasisFocus | 'ancestor' | 'descendant' | 'relative'
        scale?: boolean
    }
}

export interface TreeSeriesNodeItemOption extends SymbolOptionMixin<CallbackDataParams>,
    TreeSeriesStateOption<CallbackDataParams>,
    StatesOptionMixin<TreeSeriesStateOption<CallbackDataParams>, TreeStatesMixin>,
    OptionDataItemObject<OptionDataValue> {

    children?: TreeSeriesNodeItemOption[]

    collapsed?: boolean

    link?: string
    target?: string
}

/**
 * Configuration of leaves nodes.
 */
export interface TreeSeriesLeavesOption
    extends TreeSeriesStateOption, StatesOptionMixin<TreeSeriesStateOption, TreeStatesMixin> {
}

export interface TreeSeriesOption extends
    SeriesOption<TreeSeriesStateOption, TreeStatesMixin>, TreeSeriesStateOption,
    SymbolOptionMixin<CallbackDataParams>, BoxLayoutOptionMixin, RoamOptionMixin {
    type?: 'tree'

    layout?: 'orthogonal' | 'radial'

    edgeShape?: 'polyline' | 'curve'

    /**
     * Available when edgeShape is polyline
     */
    edgeForkPosition?: string | number

    nodeScaleRatio?: number

    /**
     * The orient of orthoginal layout, can be setted to 'LR', 'TB', 'RL', 'BT'.
     * and the backward compatibility configuration 'horizontal = LR', 'vertical = TB'.
     */
    orient?: 'LR' | 'TB' | 'RL' | 'BT' | 'horizontal' | 'vertical'

    expandAndCollapse?: boolean

    /**
     * The initial expanded depth of tree
     */
    initialTreeDepth?: number

    leaves?: TreeSeriesLeavesOption

    data?: TreeSeriesNodeItemOption[]
}

export interface TreeAncestors {
    name: string
    dataIndex: number
    value: number
}

export interface TreeSeriesCallbackDataParams extends CallbackDataParams {
    collapsed: boolean;
    treeAncestors?: TreeAncestors[]
}

class TreeSeriesModel extends SeriesModel<TreeSeriesOption> {
    static readonly type = 'series.tree';

    // can support the position parameters 'left', 'top','right','bottom', 'width',
    // 'height' in the setOption() with 'merge' mode normal.
    static readonly layoutMode = 'box';

    coordinateSystem: View;

    layoutInfo: LayoutRect;

    hasSymbolVisual = true;

    // Do it self.
    ignoreStyleOnData = true;

    /**
     * Init a tree data structure from data in option series
     */
    getInitialData(option: TreeSeriesOption): SeriesData {

        // create a virtual root
        const root: TreeSeriesNodeItemOption = {
            name: option.name,
            children: option.data
        };

        const leaves = option.leaves || {};
        const leavesModel = new Model(leaves, this, this.ecModel);

        const tree = Tree.createTree(root, this, beforeLink);

        function beforeLink(nodeData: SeriesData) {
            nodeData.wrapMethod('getItemModel', function (model, idx) {
                const node = tree.getNodeByDataIndex(idx);
                if (!(node && node.children.length && node.isExpand)) {
                    model.parentModel = leavesModel;
                }
                return model;
            });
        }

        let treeDepth = 0;

        tree.eachNode('preorder', function (node) {
            if (node.depth > treeDepth) {
                treeDepth = node.depth;
            }
        });

        const expandAndCollapse = option.expandAndCollapse;
        const expandTreeDepth = (expandAndCollapse && option.initialTreeDepth >= 0)
            ? option.initialTreeDepth : treeDepth;

        tree.root.eachNode('preorder', function (node) {
            const item = node.hostTree.data.getRawDataItem(node.dataIndex) as TreeSeriesNodeItemOption;
            // Add item.collapsed != null, because users can collapse node original in the series.data.
            node.isExpand = (item && item.collapsed != null)
                ? !item.collapsed
                : node.depth <= expandTreeDepth;
        });

        return tree.data;
    }

    /**
     * Make the configuration 'orient' backward compatibly, with 'horizontal = LR', 'vertical = TB'.
     * @returns {string} orient
     */
    getOrient() {
        let orient = this.get('orient');
        if (orient === 'horizontal') {
            orient = 'LR';
        }
        else if (orient === 'vertical') {
            orient = 'TB';
        }
        return orient;
    }

    setZoom(zoom: number) {
        this.option.zoom = zoom;
    }

    setCenter(center: number[]) {
        this.option.center = center;
    }

    formatTooltip(
        dataIndex: number,
        multipleSeries: boolean,
        dataType: string
    ) {
        const tree = this.getData().tree;
        const realRoot = tree.root.children[0];
        let node = tree.getNodeByDataIndex(dataIndex);
        const value = node.getValue();
        let name = node.name;
        while (node && (node !== realRoot)) {
            name = node.parentNode.name + '.' + name;
            node = node.parentNode;
        }

        return createTooltipMarkup('nameValue', {
            name: name,
            value: value,
            noValue: isNaN(value as number) || value == null
        });
    }

    // Add tree path to tooltip param
    getDataParams(dataIndex: number) {
        const params = super.getDataParams.apply(this, arguments as any) as TreeSeriesCallbackDataParams;

        const node = this.getData().tree.getNodeByDataIndex(dataIndex);
        params.treeAncestors = wrapTreePathInfo(node, this);
        params.collapsed = !node.isExpand;

        return params;
    }

    static defaultOption: TreeSeriesOption = {
        // zlevel: 0,
        z: 2,
        coordinateSystem: 'view',

        // the position of the whole view
        left: '12%',
        top: '12%',
        right: '12%',
        bottom: '12%',

        // the layout of the tree, two value can be selected, 'orthogonal' or 'radial'
        layout: 'orthogonal',

        // value can be 'polyline'
        edgeShape: 'curve',

        edgeForkPosition: '50%',

        // true | false | 'move' | 'scale', see module:component/helper/RoamController.
        roam: false,

        // Symbol size scale ratio in roam
        nodeScaleRatio: 0.4,

        // Default on center of graph
        center: null,

        zoom: 1,

        orient: 'LR',

        symbol: 'emptyCircle',

        symbolSize: 7,

        expandAndCollapse: true,

        initialTreeDepth: 2,

        lineStyle: {
            color: '#ccc',
            width: 1.5,
            curveness: 0.5
        },

        itemStyle: {
            color: 'lightsteelblue',
            // borderColor: '#c23531',
            borderWidth: 1.5
        },

        label: {
            show: true
        },

        animationEasing: 'linear',

        animationDuration: 700,

        animationDurationUpdate: 500
    };
}

export default TreeSeriesModel;
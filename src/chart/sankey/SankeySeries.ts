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
import createGraphFromNodeEdge from '../helper/createGraphFromNodeEdge';
import {encodeHTML} from '../../util/format';
import Model from '../../model/Model';
import { __DEV__ } from '../../config';
import {
    SeriesOption,
    BoxLayoutOptionMixin,
    OptionDataValue,
    LabelOption,
    ItemStyleOption,
    LineStyleOption,
    LayoutOrient,
    ColorString,
    StatesOptionMixin,
    OptionDataItemObject
} from '../../util/types';
import GlobalModel from '../../model/Global';
import List from '../../data/List';
import { LayoutRect } from '../../util/layout';

type FocusNodeAdjacency = boolean | 'inEdges' | 'outEdges' | 'allEdges';

export interface SankeyNodeStateOption {
    label?: LabelOption
    itemStyle?: ItemStyleOption
}

export interface SankeyEdgeStateOption {
    lineStyle?: SankeyEdgeStyleOption
}

interface SankeyBothStateOption extends SankeyNodeStateOption, SankeyEdgeStateOption {
}

interface SankeyEdgeStyleOption extends LineStyleOption {
    curveness?: number
}

interface ExtraStateOption {
    emphasis?: {
        focus?: 'adjacency'
    }
}

export interface SankeyNodeItemOption extends SankeyNodeStateOption,
    StatesOptionMixin<SankeyNodeStateOption, ExtraStateOption>,
    OptionDataItemObject<OptionDataValue> {
    id?: string

    localX?: number
    localY?: number

    depth?: number

    draggable?: boolean

    focusNodeAdjacency?: FocusNodeAdjacency
}

export interface SankeyEdgeItemOption
    extends SankeyEdgeStateOption, StatesOptionMixin<SankeyEdgeStateOption, ExtraStateOption> {
    /**
     * Name or index of source node.
     */
    source?: string | number
    /**
     * Name or index of target node.
     */
    target?: string | number

    focusNodeAdjacency?: FocusNodeAdjacency
}

export interface SankeyLevelOption {
    depth: number
}

export interface SankeySeriesOption
    extends SeriesOption<SankeyBothStateOption, ExtraStateOption>, SankeyBothStateOption,
    BoxLayoutOptionMixin {
    type?: 'sankey'

    /**
     * color will be linear mapped.
     */
    color?: ColorString[]

    coordinateSystem?: 'view'

    orient?: LayoutOrient
    /**
     * The width of the node
     */
    nodeWidth?: number
    /**
     * The vertical distance between two nodes
     */
    nodeGap?: number

    /**
     * Control if the node can move or not
     */
    draggable?: boolean
    /**
     * Will be allEdges if true.
     */
    focusNodeAdjacency?: FocusNodeAdjacency
    /**
     * The number of iterations to change the position of the node
     */
    layoutIterations?: number

    nodeAlign?: 'justify' | 'left' | 'right'    // TODO justify should be auto

    data?: SankeyNodeItemOption[]
    nodes?: SankeyNodeItemOption[]

    edges?: SankeyEdgeItemOption[]
    links?: SankeyEdgeItemOption[]

    levels?: SankeyLevelOption[]
}

class SankeySeriesModel extends SeriesModel<SankeySeriesOption> {
    static readonly type = 'series.sankey';
    readonly type = SankeySeriesModel.type;

    levelModels: Model<SankeyLevelOption>[];

    layoutInfo: LayoutRect;

    /**
     * Init a graph data structure from data in option series
     *
     * @param  {Object} option  the object used to config echarts view
     * @return {module:echarts/data/List} storage initial data
     */
    getInitialData(option: SankeySeriesOption, ecModel: GlobalModel) {
        const links = option.edges || option.links;
        const nodes = option.data || option.nodes;
        const levels = option.levels;
        this.levelModels = [];
        const levelModels = this.levelModels;

        for (let i = 0; i < levels.length; i++) {
            if (levels[i].depth != null && levels[i].depth >= 0) {
                levelModels[levels[i].depth] = new Model(levels[i], this, ecModel);
            }
            else {
                if (__DEV__) {
                    throw new Error('levels[i].depth is mandatory and should be natural number');
                }
            }
        }
        if (nodes && links) {
            const graph = createGraphFromNodeEdge(nodes, links, this, true, beforeLink);
            return graph.data;
        }
        function beforeLink(nodeData: List, edgeData: List) {
            nodeData.wrapMethod('getItemModel', function (model: Model, idx: number) {
                const seriesModel = model.parentModel as SankeySeriesModel;
                const layout = seriesModel.getData().getItemLayout(idx);
                if (layout) {
                    const nodeDepth = layout.depth;
                    const levelModel = seriesModel.levelModels[nodeDepth];
                    if (levelModel) {
                        model.parentModel = levelModel;
                    }
                }
                return model;
            });

            edgeData.wrapMethod('getItemModel', function (model: Model, idx: number) {
                const seriesModel = model.parentModel as SankeySeriesModel;
                const edge = seriesModel.getGraph().getEdgeByIndex(idx);
                const layout = edge.node1.getLayout();
                if (layout) {
                    const depth = layout.depth;
                    const levelModel = seriesModel.levelModels[depth];
                    if (levelModel) {
                        model.parentModel = levelModel;
                    }
                }
                return model;
            });
        }
    }

    setNodePosition(dataIndex: number, localPosition: number[]) {
        const dataItem = this.option.data[dataIndex];
        dataItem.localX = localPosition[0];
        dataItem.localY = localPosition[1];
    }

    /**
     * Return the graphic data structure
     *
     * @return graphic data structure
     */
    getGraph() {
        return this.getData().graph;
    }

    /**
     * Get edge data of graphic data structure
     *
     * @return data structure of list
     */
    getEdgeData() {
        return this.getGraph().edgeData;
    }

    /**
     * @override
     */
    formatTooltip(dataIndex: number, multipleSeries: boolean, dataType: 'node' | 'edge') {
        // dataType === 'node' or empty do not show tooltip by default
        if (dataType === 'edge') {
            const params = this.getDataParams(dataIndex, dataType);
            const rawDataOpt = params.data;
            let html = rawDataOpt.source + ' -- ' + rawDataOpt.target;
            if (params.value) {
                html += ' : ' + params.value;
            }
            return encodeHTML(html);
        }
        else if (dataType === 'node') {
            const node = this.getGraph().getNodeByIndex(dataIndex);
            const value = node.getLayout().value;
            const name = this.getDataParams(dataIndex, dataType).data.name;
            const html = value ? name + ' : ' + value : '';
            return encodeHTML(html);
        }
        return super.formatTooltip(dataIndex, multipleSeries);
    }

    optionUpdated() {
        const option = this.option;
        if (option.focusNodeAdjacency === true) {
            option.focusNodeAdjacency = 'allEdges';
        }
    }

    // Override Series.getDataParams()
    getDataParams(dataIndex: number, dataType: 'node' | 'edge') {
        const params = super.getDataParams(dataIndex, dataType);
        if (params.value == null && dataType === 'node') {
            const node = this.getGraph().getNodeByIndex(dataIndex);
            const nodeValue = node.getLayout().value;
            params.value = nodeValue;
        }
        return params;
    }

    static defaultOption: SankeySeriesOption = {
        zlevel: 0,
        z: 2,

        coordinateSystem: 'view',

        left: '5%',
        top: '5%',
        right: '20%',
        bottom: '5%',

        orient: 'horizontal',

        nodeWidth: 20,

        nodeGap: 8,
        draggable: true,

        focusNodeAdjacency: false,

        layoutIterations: 32,

        label: {
            show: true,
            position: 'right',
            color: '#000',
            fontSize: 12
        },

        levels: [],

        nodeAlign: 'justify',

        itemStyle: {
            borderWidth: 1,
            borderColor: '#333'
        },

        lineStyle: {
            color: '#314656',
            opacity: 0.2,
            curveness: 0.5
        },

        emphasis: {
            label: {
                show: true
            },
            lineStyle: {
                opacity: 0.5
            }
        },

        select: {
            itemStyle: {
                borderColor: '#212121'
            }
        },

        animationEasing: 'linear',

        animationDuration: 1000
    };
}

SeriesModel.registerClass(SankeySeriesModel);

export default SankeySeriesModel;
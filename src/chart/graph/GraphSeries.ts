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

import List from '../../data/List';
import * as zrUtil from 'zrender/src/core/util';
import {defaultEmphasis} from '../../util/model';
import Model from '../../model/Model';
import {encodeHTML} from '../../util/format';
import createGraphFromNodeEdge from '../helper/createGraphFromNodeEdge';
import LegendVisualProvider from '../../visual/LegendVisualProvider';
import {
    SeriesOption,
    SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin,
    SeriesOnCalendarOptionMixin,
    SeriesOnGeoOptionMixin,
    SeriesOnSingleOptionMixin,
    OptionDataValue,
    RoamOptionMixin,
    LabelOption,
    ItemStyleOption,
    LineStyleOption,
    SymbolOptionMixin,
    BoxLayoutOptionMixin,
    LabelFormatterCallback,
    Dictionary
} from '../../util/types';
import SeriesModel from '../../model/Series';
import Graph from '../../data/Graph';
import GlobalModel from '../../model/Global';
import { VectorArray } from 'zrender/src/core/vector';
import { ForceLayoutInstance } from './forceLayout';

type GraphDataValue = OptionDataValue | OptionDataValue[]

interface GraphEdgeLineStyleOption extends LineStyleOption {
    curveness: number
}
export interface GraphNodeItemOption extends SymbolOptionMixin {
    id?: string
    name?: string
    value?: GraphDataValue

    itemStyle?: ItemStyleOption
    label?: LabelOption

    emphasis?: {
        itemStyle?: ItemStyleOption
        label?: LabelOption
    }

    /**
     * Fixed x position
     */
    x?: number
    /**
     * Fixed y position
     */
    y?: number

    /**
     * If this node is fixed during force layout.
     */
    fixed?: boolean

    /**
     * Index or name of category
     */
    category?: number | string

    draggable?: boolean

    focusNodeAdjacency?: boolean
}

export interface GraphEdgeItemOption {
    /**
     * Name or index of source node.
     */
    source?: string | number
    /**
     * Name or index of target node.
     */
    target?: string | number

    value?: number

    lineStyle?: GraphEdgeLineStyleOption
    label?: LabelOption

    emphasis?: {
        lineStyle?: GraphEdgeLineStyleOption
        label?: LabelOption
    }

    /**
     * Symbol of both line ends
     */
    symbol?: string | string[]

    symbolSize?: number | number[]

    ignoreForceLayout?: boolean

    focusNodeAdjacency?: boolean
}

export interface GraphCategoryItemOption extends SymbolOptionMixin {
    name?: string

    value?: OptionDataValue

    itemStyle?: ItemStyleOption
    label?: LabelOption

    emphasis?: {
        itemStyle?: ItemStyleOption
        label?: LabelOption
    }
}

interface GraphSeriesOption extends SeriesOption,
    SeriesOnCartesianOptionMixin, SeriesOnPolarOptionMixin, SeriesOnCalendarOptionMixin,
    SeriesOnGeoOptionMixin, SeriesOnSingleOptionMixin,
    SymbolOptionMixin,
    RoamOptionMixin,
    BoxLayoutOptionMixin {

    type?: 'graph'

    coordinateSystem?: string

    hoverAnimation?: boolean
    legendHoverLink?: boolean

    layout?: 'none' | 'force' | 'circular'

    data?: GraphNodeItemOption[]
    nodes?: GraphNodeItemOption[]

    edges?: GraphEdgeItemOption[]
    links?: GraphEdgeItemOption[]

    categories?: GraphCategoryItemOption[]

    focusNodeAdjacency?: boolean

    /**
     * Symbol size scale ratio in roam
     */
    nodeScaleRatio: 0.6,

    draggable?: boolean

    edgeSymbol: string | string[]
    edgeSymbolSize: number | number[]

    edgeLabel?: LabelOption & {
        formatter?: LabelFormatterCallback | string
    }
    label?: LabelOption & {
        formatter?: LabelFormatterCallback | string
    }

    itemStyle?: ItemStyleOption
    lineStyle?: GraphEdgeLineStyleOption

    emphasis?: {
        label?: LabelOption
        edgeLabel?: LabelOption
        itemStyle?: ItemStyleOption
        lineStyle?: LineStyleOption
    }

    // Configuration of circular layout
    circular?: {
        rotateLabel?: boolean
    }

    // Configuration of force directed layout
    force: {
        initLayout: 'circular' | 'none'
        // Node repulsion. Can be an array to represent range.
        repulsion: number | number[]
        gravity: number
        // Initial friction
        friction: number

        // Edge length. Can be an array to represent range.
        edgeLength: number | number[]

        layoutAnimation: boolean
    }
}

class GraphSeriesModel extends SeriesModel<GraphSeriesOption> {
    static readonly type = 'series.graph'
    readonly type = GraphSeriesModel.type

    private _categoriesData: List
    private _categoriesModels: Model<GraphCategoryItemOption>[]

    /**
     * Preserved points during layouting
     */
    preservedPoints?: Dictionary<VectorArray>

    forceLayout?: ForceLayoutInstance

    init(option: GraphSeriesOption) {
        super.init.apply(this, arguments as any);

        var self = this;
        function getCategoriesData() {
            return self._categoriesData;
        }
        // Provide data for legend select
        this.legendVisualProvider = new LegendVisualProvider(
            getCategoriesData, getCategoriesData
        );

        this.fillDataTextStyle(option.edges || option.links);

        this._updateCategoriesData();
    }

    mergeOption(option: GraphSeriesOption) {
        super.mergeOption.apply(this, arguments as any);

        this.fillDataTextStyle(option.edges || option.links);

        this._updateCategoriesData();
    }

    mergeDefaultAndTheme(option: GraphSeriesOption) {
        super.mergeDefaultAndTheme.apply(this, arguments as any);
        defaultEmphasis(option, 'edgeLabel', ['show']);
    }

    getInitialData(option: GraphSeriesOption, ecModel: GlobalModel) {
        var edges = option.edges || option.links || [];
        var nodes = option.data || option.nodes || [];
        var self = this;

        if (nodes && edges) {
            return createGraphFromNodeEdge(nodes, edges, this, true, beforeLink).data;
        }

        function beforeLink(nodeData: List, edgeData: List) {
            // Overwrite nodeData.getItemModel to
            nodeData.wrapMethod('getItemModel', function (model) {
                var categoriesModels = self._categoriesModels;
                var categoryIdx = model.getShallow('category');
                var categoryModel = categoriesModels[categoryIdx];
                if (categoryModel) {
                    categoryModel.parentModel = model.parentModel;
                    model.parentModel = categoryModel;
                }
                return model;
            });

            var edgeLabelModel = self.getModel('edgeLabel');
            // For option `edgeLabel` can be found by label.xxx.xxx on item mode.
            var fakeSeriesModel = new Model(
                {label: edgeLabelModel.option},
                edgeLabelModel.parentModel,
                ecModel
            );
            var emphasisEdgeLabelModel = self.getModel(['emphasis', 'edgeLabel']);
            var emphasisFakeSeriesModel = new Model(
                {emphasis: {label: emphasisEdgeLabelModel.option}},
                emphasisEdgeLabelModel.parentModel,
                ecModel
            );

            edgeData.wrapMethod('getItemModel', function (model) {
                model.customizeGetParent(edgeGetParent);
                return model;
            });

            function edgeGetParent(this: Model, path: string | string[]) {
                const pathArr = this.parsePath(path);
                return (pathArr && pathArr[0] === 'label')
                    ? fakeSeriesModel
                    : (pathArr && pathArr[0] === 'emphasis' && pathArr[1] === 'label')
                    ? emphasisFakeSeriesModel
                    : this.parentModel;
            }
        }
    }

    getGraph(): Graph {
        return this.getData().graph;
    }

    getEdgeData(): List {
        return this.getGraph().edgeData;
    }

    getCategoriesData(): List {
        return this._categoriesData;
    }

    /**
     * @override
     */
    formatTooltip(dataIndex: number, multipleSeries: boolean, dataType: string) {
        if (dataType === 'edge') {
            var nodeData = this.getData();
            var params = this.getDataParams(dataIndex, dataType);
            var edge = nodeData.graph.getEdgeByIndex(dataIndex);
            var sourceName = nodeData.getName(edge.node1.dataIndex);
            var targetName = nodeData.getName(edge.node2.dataIndex);

            var html = [];
            sourceName != null && html.push(sourceName);
            targetName != null && html.push(targetName);
            var htmlStr = encodeHTML(html.join(' > '));

            if (params.value) {
                htmlStr += ' : ' + encodeHTML(params.value);
            }
            return htmlStr;
        }
        else { // dataType === 'node' or empty
            return super.formatTooltip.apply(this, arguments as any);
        }
    }

    _updateCategoriesData() {
        var categories = zrUtil.map(this.option.categories || [], function (category) {
            // Data must has value
            return category.value != null ? category : zrUtil.extend({
                value: 0
            }, category);
        });
        var categoriesData = new List(['value'], this);
        categoriesData.initData(categories);

        this._categoriesData = categoriesData;

        this._categoriesModels = categoriesData.mapArray(function (idx) {
            return categoriesData.getItemModel(idx);
        });
    }

    setZoom(zoom: number) {
        this.option.zoom = zoom;
    }

    setCenter(center: number[]) {
        this.option.center = center;
    }

    isAnimationEnabled() {
        return super.isAnimationEnabled()
            // Not enable animation when do force layout
            && !(this.get('layout') === 'force' && this.get(['force', 'layoutAnimation']));
    }

    static defaultOption: GraphSeriesOption = {
        zlevel: 0,
        z: 2,

        coordinateSystem: 'view',

        // Default option for all coordinate systems
        // xAxisIndex: 0,
        // yAxisIndex: 0,
        // polarIndex: 0,
        // geoIndex: 0,

        legendHoverLink: true,

        hoverAnimation: true,

        layout: null,

        focusNodeAdjacency: false,

        // Configuration of circular layout
        circular: {
            rotateLabel: false
        },
        // Configuration of force directed layout
        force: {
            initLayout: null,
            // Node repulsion. Can be an array to represent range.
            repulsion: [0, 50],
            gravity: 0.1,
            // Initial friction
            friction: 0.6,

            // Edge length. Can be an array to represent range.
            edgeLength: 30,

            layoutAnimation: true
        },

        left: 'center',
        top: 'center',
        // right: null,
        // bottom: null,
        // width: '80%',
        // height: '80%',

        symbol: 'circle',
        symbolSize: 10,

        edgeSymbol: ['none', 'none'],
        edgeSymbolSize: 10,
        edgeLabel: {
            position: 'middle'
        },

        draggable: false,

        roam: false,

        // Default on center of graph
        center: null,

        zoom: 1,
        // Symbol size scale ratio in roam
        nodeScaleRatio: 0.6,
        // cursor: null,

        // categories: [],

        // data: []
        // Or
        // nodes: []
        //
        // links: []
        // Or
        // edges: []

        label: {
            show: false,
            formatter: '{b}'
        },

        itemStyle: {},

        lineStyle: {
            color: '#aaa',
            width: 1,
            curveness: 0,
            opacity: 0.5
        },
        emphasis: {
            label: {
                show: true
            }
        }
    }
}

export default GraphSeriesModel;
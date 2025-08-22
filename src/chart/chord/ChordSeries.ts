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
    SeriesOption,
    SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin,
    ComponentOnCalendarOptionMixin,
    ComponentOnMatrixOptionMixin,
    SeriesOnGeoOptionMixin,
    SeriesOnSingleOptionMixin,
    OptionDataValue,
    RoamOptionMixin,
    SeriesLabelOption,
    ItemStyleOption,
    LineStyleOption,
    SymbolOptionMixin,
    BoxLayoutOptionMixin,
    CircleLayoutOptionMixin,
    SeriesLineLabelOption,
    StatesOptionMixin,
    GraphEdgeItemObject,
    OptionDataValueNumeric,
    CallbackDataParams,
    DefaultEmphasisFocus
} from '../../util/types';
import Model from '../../model/Model';
import SeriesModel from '../../model/Series';
import GlobalModel from '../../model/Global';
import SeriesData from '../../data/SeriesData';
import createGraphFromNodeEdge from '../helper/createGraphFromNodeEdge';
import Graph from '../../data/Graph';
import { LineDataVisual } from '../../visual/commonVisualTypes';
import { createTooltipMarkup } from '../../component/tooltip/tooltipMarkup';
import LegendVisualProvider from '../../visual/LegendVisualProvider';
import * as zrUtil from 'zrender/src/core/util';

interface ExtraEmphasisState {
    /**
     * For focus on nodes:
     * - self: Focus self node, and all edges connected to it.
     * - adjacency: Focus self nodes and two edges (source and target)
     *   connected to the focused node.
     *
     * For focus on edges:
     * - self: Focus self edge, and all nodes connected to it.
     * - adjacency: Focus self edge and all edges connected to it and all
     *   nodes connected to these edges.
     */
    focus?: DefaultEmphasisFocus | 'adjacency'
}

interface ChordStatesMixin {
    emphasis?: ExtraEmphasisState
}

interface ChordEdgeStatesMixin {
    emphasis?: ExtraEmphasisState
}

type ChordDataValue = OptionDataValue | OptionDataValue[];

export interface ChordItemStyleOption<TCbParams = never> extends ItemStyleOption<TCbParams> {
    borderRadius?: (number | string)[] | number | string
}

export interface ChordNodeStateOption<TCbParams = never> {
    itemStyle?: ChordItemStyleOption<TCbParams>
    label?: ChordNodeLabelOption
}

export interface ChordNodeItemOption extends ChordNodeStateOption,
    StatesOptionMixin<ChordNodeStateOption, ChordStatesMixin> {

    id?: string
    name?: string
    value?: ChordDataValue
}

export interface ChordEdgeLineStyleOption extends LineStyleOption {
    curveness?: number
}

export interface ChordNodeLabelOption extends Omit<SeriesLabelOption<CallbackDataParams>, 'position'> {
    silent?: boolean
    position?: SeriesLabelOption['position'] | 'outside'
}

export interface ChordEdgeStateOption {
    lineStyle?: ChordEdgeLineStyleOption
    label?: SeriesLineLabelOption
}

export interface ChordEdgeItemOption extends ChordEdgeStateOption,
    StatesOptionMixin<ChordEdgeStateOption, ChordEdgeStatesMixin>,
    GraphEdgeItemObject<OptionDataValueNumeric> {

    value?: number
}

export interface ChordSeriesOption
    extends SeriesOption<ChordNodeStateOption<CallbackDataParams>, ChordStatesMixin>,
    SeriesOnCartesianOptionMixin, SeriesOnPolarOptionMixin,
    ComponentOnCalendarOptionMixin, ComponentOnMatrixOptionMixin,
    SeriesOnGeoOptionMixin, SeriesOnSingleOptionMixin,
    SymbolOptionMixin<CallbackDataParams>,
    RoamOptionMixin,
    BoxLayoutOptionMixin,
    CircleLayoutOptionMixin
{
    type?: 'chord'

    coordinateSystem?: 'none'

    legendHoverLink?: boolean

    clockwise?: boolean
    startAngle?: number
    endAngle?: number | 'auto'
    padAngle?: number
    minAngle?: number

    data?: (ChordNodeItemOption | ChordDataValue)[]
    nodes?: (ChordNodeItemOption | ChordDataValue)[]

    edges?: ChordEdgeItemOption[]
    links?: ChordEdgeItemOption[]

    edgeLabel?: SeriesLineLabelOption
    label?: ChordNodeLabelOption

    itemStyle?: ChordItemStyleOption<CallbackDataParams>
    lineStyle?: ChordEdgeLineStyleOption

    emphasis?: {
        focus?: Exclude<ChordNodeItemOption['emphasis'], undefined>['focus']
        scale?: boolean | number
        label?: SeriesLabelOption
        edgeLabel?: SeriesLabelOption
        itemStyle?: ItemStyleOption
        lineStyle?: LineStyleOption
    }

    blur?: {
        label?: SeriesLabelOption
        edgeLabel?: SeriesLabelOption
        itemStyle?: ItemStyleOption
        lineStyle?: LineStyleOption
    }

    select?: {
        label?: SeriesLabelOption
        edgeLabel?: SeriesLabelOption
        itemStyle?: ItemStyleOption
        lineStyle?: LineStyleOption
    }
}

class ChordSeriesModel extends SeriesModel<ChordSeriesOption> {

    static type = 'series.chord';
    readonly type = ChordSeriesModel.type;

    init(option: ChordSeriesOption) {
        super.init.apply(this, arguments as any);
        this.fillDataTextStyle(option.edges || option.links);

        // Enable legend selection for each data item
        this.legendVisualProvider = new LegendVisualProvider(
            zrUtil.bind(this.getData, this), zrUtil.bind(this.getRawData, this)
        );
    }

    mergeOption(option: ChordSeriesOption) {
        super.mergeOption.apply(this, arguments as any);
        this.fillDataTextStyle(option.edges || option.links);
    }

    getInitialData(option: ChordSeriesOption, ecModel: GlobalModel): SeriesData {
        const edges = option.edges || option.links || [];
        const nodes = option.data || option.nodes || [];

        if (nodes && edges) {
            const graph = createGraphFromNodeEdge(nodes as ChordNodeItemOption[], edges, this, true, beforeLink);
            return graph.data;
        }

        function beforeLink(nodeData: SeriesData, edgeData: SeriesData) {
            // TODO Inherit resolveParentPath by default in Model#getModel?
            const oldGetModel = Model.prototype.getModel;
            function newGetModel(this: Model, path: any, parentModel?: Model) {
                const model = oldGetModel.call(this, path, parentModel);
                model.resolveParentPath = resolveParentPath;
                return model;
            }

            edgeData.wrapMethod('getItemModel', function (model: Model) {
                model.resolveParentPath = resolveParentPath;
                model.getModel = newGetModel;
                return model;
            });

            function resolveParentPath(this: Model, pathArr: readonly string[]): string[] {
                if (pathArr && (pathArr[0] === 'label' || pathArr[1] === 'label')) {
                    const newPathArr = pathArr.slice();
                    if (pathArr[0] === 'label') {
                        newPathArr[0] = 'edgeLabel';
                    }
                    else if (pathArr[1] === 'label') {
                        newPathArr[1] = 'edgeLabel';
                    }
                    return newPathArr;
                }
                return pathArr as string[];
            }
        }
    }

    getGraph(): Graph {
        return this.getData().graph;
    }

    getEdgeData() {
        return this.getGraph().edgeData as SeriesData<ChordSeriesModel, LineDataVisual>;
    }

    formatTooltip(
        dataIndex: number,
        multipleSeries: boolean,
        dataType: string
    ) {
        const params = this.getDataParams(dataIndex, dataType as 'node' | 'edge');

        if (dataType === 'edge') {
            const nodeData = this.getData();
            const edge = nodeData.graph.getEdgeByIndex(dataIndex);
            const sourceName = nodeData.getName(edge.node1.dataIndex);
            const targetName = nodeData.getName(edge.node2.dataIndex);

            const nameArr = [];
            sourceName != null && nameArr.push(sourceName);
            targetName != null && nameArr.push(targetName);

            return createTooltipMarkup('nameValue', {
                name: nameArr.join(' > '),
                value: params.value,
                noValue: params.value == null
            });
        }
        // dataType === 'node' or empty
        return createTooltipMarkup('nameValue', {
            name: params.name,
            value: params.value,
            noValue: params.value == null
        });
    }

    getDataParams(dataIndex: number, dataType: 'node' | 'edge') {
        const params = super.getDataParams(dataIndex, dataType);
        if (dataType === 'node') {
            const nodeData = this.getData();
            const node = this.getGraph().getNodeByIndex(dataIndex);
            // Set name if not already set
            if (params.name == null) {
                params.name = nodeData.getName(dataIndex);
            }
            // Set value if not already set
            if (params.value == null) {
                const nodeValue = node.getLayout().value;
                params.value = nodeValue;
            }
        }
        return params;
    }

    static defaultOption: ChordSeriesOption = {
        // zlevel: 0,
        z: 2,

        coordinateSystem: 'none',

        legendHoverLink: true,
        colorBy: 'data',

        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: null,
        height: null,

        center: ['50%', '50%'],
        radius: ['70%', '80%'],
        clockwise: true,

        startAngle: 90,
        endAngle: 'auto',
        minAngle: 0,
        padAngle: 3,

        itemStyle: {
            borderRadius: [0, 0, 5, 5]
        },

        lineStyle: {
            width: 0,
            color: 'source',
            opacity: 0.2
        },

        label: {
            show: true,
            position: 'outside',
            distance: 5
        },

        emphasis: {
            focus: 'adjacency',
            lineStyle: {
                opacity: 0.5
            }
        }
    };
}

export default ChordSeriesModel;

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

import * as zrUtil from 'zrender/src/core/util';
import {
    SeriesOption,
    SeriesOnCartesianOptionMixin,
    SeriesOnPolarOptionMixin,
    SeriesOnCalendarOptionMixin,
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
    DefaultEmphasisFocus,
    ZRColor
} from '../../util/types';
import Model from '../../model/Model';
import SeriesModel from '../../model/Series';
import GlobalModel from '../../model/Global';
import SeriesData from '../../data/SeriesData';
import createGraphFromNodeEdge from '../helper/createGraphFromNodeEdge';
import Graph from '../../data/Graph';
import { LineDataVisual } from '../../visual/commonVisualTypes';

interface ChordStatesMixin {
    emphasis?: DefaultEmphasisFocus
}

interface ChordEdgeStatesMixin {
    emphasis?: DefaultEmphasisFocus
}

type ChordDataValue = OptionDataValue | OptionDataValue[];

export interface ChordItemStyleOption<TCbParams = never> extends ItemStyleOption<TCbParams> {
    borderRadius?: (number | string)[] | number | string
}

export interface ChordNodeStateOption<TCbParams = never> {
    itemStyle?: ChordItemStyleOption<TCbParams>
    label?: SeriesLabelOption
}

export interface ChordNodeItemOption extends ChordNodeStateOption,
    StatesOptionMixin<ChordNodeStateOption, ChordStatesMixin> {

    id?: string
    name?: string
    value?: ChordDataValue
}

export interface ChordEdgeLineStyleOption<Clr = ZRColor> extends LineStyleOption {
    curveness?: number
    color: 'source' | 'target' | 'gradient' | Clr
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
    SeriesOnCartesianOptionMixin, SeriesOnPolarOptionMixin, SeriesOnCalendarOptionMixin,
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
    label?: SeriesLabelOption

    itemStyle?: ChordItemStyleOption<CallbackDataParams>
    lineStyle?: ChordEdgeLineStyleOption
}

class ChordSeriesModel extends SeriesModel<ChordSeriesOption> {

    static type = 'series.chord';
    readonly type = ChordSeriesModel.type;

    init(option: ChordSeriesOption) {
        super.init.apply(this, arguments as any);
    }

    getInitialData(option: ChordSeriesOption, ecModel: GlobalModel): SeriesData {
        const edges = option.edges || option.links || [];
        const nodes = option.data || option.nodes || [];

        if (nodes && edges) {
            // auto curveness
            // initCurvenessList(this);
            const graph = createGraphFromNodeEdge(nodes as ChordNodeItemOption[], edges, this, true, beforeLink);
            zrUtil.each(graph.edges, function (edge) {
                // createEdgeMapForCurveness(edge.node1, edge.node2, this, edge.dataIndex);
            }, this);
            return graph.data;
        }

        function beforeLink(nodeData: SeriesData, edgeData: SeriesData) {
            // Overwrite nodeData.getItemModel to
            // nodeData.wrapMethod('getItemModel', function (model) {

            // });

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

        startAngle: 90,
        endAngle: 'auto',
        minAngle: 0,
        padAngle: 3,

        itemStyle: {
            borderRadius: [0, 0, 5, 5]
        },

        lineStyle: {
            color: 'source',
            opacity: 0.5
        }
    };
}

export default ChordSeriesModel;

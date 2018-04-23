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
import createGraphFromNodeMatrix from '../helper/createGraphFromNodeMatrix';

var ChordSeries = SeriesModel.extend({

    type: 'series.chord',

    getInitialData: function (option) {
        var edges = option.edges || option.links;
        var nodes = option.data || option.nodes;
        var matrix = option.matrix;
        if (nodes && edges) {
            var graph = createGraphFromNodeEdge(nodes, edges, this, true);
            return graph.data;
        }
        else if (nodes && matrix) {
            var graph = createGraphFromNodeMatrix(nodes, matrix, this, true);
            return graph.data;
        }
    },

    /**
     * @return {module:echarts/data/Graph}
     */
    getGraph: function () {
        return this.getData().graph;
    },

    /**
     * @return {module:echarts/data/List}
     */
    getEdgeData: function () {
        return this.getGraph().edgeData;
    },

    defaultOption: {
        center: ['50%', '50%'],
        radius: ['65%', '75%'],
        //
        // layout: 'circular',

        sort: 'none',
        sortSub: 'none',
        padding: 0.02,
        startAngle: 90,
        clockwise: true,

        itemStyle: {},

        emphasis: {
            itemStyle: {},
            chordStyle: {}
        },

        chordStyle: {}
    }
});

export default ChordSeries;

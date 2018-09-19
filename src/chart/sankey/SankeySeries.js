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

/**
 * @file Get initial data and define sankey view's series model
 * @author Deqing Li(annong035@gmail.com)
 */

import SeriesModel from '../../model/Series';
import createGraphFromNodeEdge from '../helper/createGraphFromNodeEdge';
import {encodeHTML} from '../../util/format';

var SankeySeries = SeriesModel.extend({

    type: 'series.sankey',

    layoutInfo: null,

    /**
     * Init a graph data structure from data in option series
     *
     * @param  {Object} option  the object used to config echarts view
     * @return {module:echarts/data/List} storage initial data
     */
    getInitialData: function (option) {
        var links = option.edges || option.links;
        var nodes = option.data || option.nodes;
        if (nodes && links) {
            var graph = createGraphFromNodeEdge(nodes, links, this, true);
            return graph.data;
        }
    },

    setNodePosition: function (dataIndex, localPosition) {
        var dataItem = this.option.data[dataIndex];
        dataItem.localX = localPosition[0];
        dataItem.localY = localPosition[1];
    },

    /**
     * Return the graphic data structure
     *
     * @return {module:echarts/data/Graph} graphic data structure
     */
    getGraph: function () {
        return this.getData().graph;
    },

    /**
     * Get edge data of graphic data structure
     *
     * @return {module:echarts/data/List} data structure of list
     */
    getEdgeData: function () {
        return this.getGraph().edgeData;
    },

    /**
     * @override
     */
    formatTooltip: function (dataIndex, multipleSeries, dataType) {
        // dataType === 'node' or empty do not show tooltip by default
        if (dataType === 'edge') {
            var params = this.getDataParams(dataIndex, dataType);
            var rawDataOpt = params.data;
            var html = rawDataOpt.source + ' -- ' + rawDataOpt.target;
            if (params.value) {
                html += ' : ' + params.value;
            }
            return encodeHTML(html);
        }

        return SankeySeries.superCall(this, 'formatTooltip', dataIndex, multipleSeries);
    },

    optionUpdated: function () {
        var option = this.option;
        if (option.focusNodeAdjacency === true) {
            option.focusNodeAdjacency = 'allEdges';
        }
    },

    defaultOption: {
        zlevel: 0,
        z: 2,

        coordinateSystem: 'view',

        layout: null,

        // The position of the whole view
        left: '5%',
        top: '5%',
        right: '20%',
        bottom: '5%',

        // Value can be 'vertical'
        orient: 'horizontal',

        // The dx of the node
        nodeWidth: 20,

        // The vertical distance between two nodes
        nodeGap: 8,

        // Control if the node can move or not
        draggable: true,

        // Value can be 'inEdges', 'outEdges', 'allEdges', true (the same as 'allEdges').
        focusNodeAdjacency: false,

        // The number of iterations to change the position of the node
        layoutIterations: 32,

        label: {
            show: true,
            position: 'right',
            color: '#000',
            fontSize: 12
        },

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
                opacity: 0.6
            }
        },

        animationEasing: 'linear',

        animationDuration: 1000
    }

});

export default SankeySeries;
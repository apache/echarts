define(function (require) {

    'use strict';

    var SeriesModel = require('../../model/Series');
    var createGraphFromNodeEdge = require('../helper/createGraphFromNodeEdge');

    var SankeySeries = SeriesModel.extend({

        type: 'series.sankey',

        layoutInfo: null,

        getInitialData: function (option, ecModel) {
            var links = option.edges || option.links;
            var nodes = option.data || option.nodes;
            if (nodes && links) {
                var graph = createGraphFromNodeEdge(nodes, links, this, true);
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
         * return {module:echarts/data/List}
         */
        getEdgeData: function() {
            return this.getGraph().edgeData;
        },

        /**
         * @override
         */
        formatTooltip: function (dataIndex, multipleSeries, dataType) {
            if (dataType === 'edge') {
                var params = this.getDataParams(dataIndex, dataType);
                var rawDataOpt = params.data;
                var html = rawDataOpt.source + ' -- ' + rawDataOpt.target;
                if (params.value) {
                    html += ' : ' + params.value;
                }
                return html;
            }
            else {
                return SankeySeries.superCall(this, 'formatTooltip', dataIndex, multipleSeries);
            }
            // dataType === 'node' or empty do not show tooltip by default.
        },

        defaultOption: {
            zlevel: 0,
            z: 2,

            coordinateSystem: 'view',

            layout : null,

            // the position of the whole view
            left: '5%',
            top: '5%',
            right: '20%',
            bottom: '5%',

            // the dx of the node
            nodeWidth: 20,

            // the distance between two nodes
            nodeGap: 8,

            // the number of iterations to change the position of the node
            layoutIterations: 32,

            label: {
                normal: {
                    show: true,
                    position: 'right',
                    textStyle: {
                        color: '#000',
                        fontSize: 12
                    }
                },
                emphasis: {
                    show: true
                }
            },

            itemStyle: {
                normal: {
                    borderWidth: 1,
                    borderColor: '#333'
                }
            },

            lineStyle: {
                normal: {
                    colorMode:'default',
                    color: '#314656',
                    opacity: 0.2,
                    curveness: 0.5
                },
                emphasis: {
                    opacity: 0.6
                }
            },

            animationEasing: 'linear',

            animationDuration: 1000
        }

    });

    return SankeySeries;
});
define(function (require) {

    var SeriesModel = require('../../model/Series');
    var createGraphFromNodeEdge = require('../helper/createGraphFromNodeEdge');
    var createGraphFromNodeMatrix = require('../helper/createGraphFromNodeMatrix');

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

            itemStyle: {
                normal: {},
                emphasis: {}
            },

            chordStyle: {
                normal: {},
                emphasis: {}
            }
        }
    });

    return ChordSeries;
});
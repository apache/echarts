define(function (require) {

    'use strict';

    var SeriesModel = require('../../model/Series');
    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');

    var createGraphFromNodeEdge = require('../helper/createGraphFromNodeEdge');

    var seriesModelProto = SeriesModel.prototype;

    return SeriesModel.extend({

        type: 'series.graph',

        init: function (option) {
            seriesModelProto.init.apply(this, arguments);

            // Provide data for legend select
            this.legendDataProvider = function () {
                return this._categoriesData;
            };

            this._updateCategoriesData();
        },

        mergeOption: function (option) {
            seriesModelProto.mergeOption.apply(this, arguments);

            this._updateCategoriesData();
        },

        getInitialData: function (option, ecModel) {
            var edges = option.edges || option.links;
            var nodes = option.data || option.nodes;
            if (nodes && edges) {
                var graph = createGraphFromNodeEdge(nodes, edges, this, true);
                return graph.data;
            }
        },

        restoreData: function () {
            seriesModelProto.restoreData.apply(this, arguments);
            this.getGraph().restoreData();
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

        /**
         * @return {module:echarts/data/List}
         */
        getCategoriesData: function () {
            return this._categoriesData;
        },

        _updateCategoriesData: function () {
            var categories = zrUtil.map(this.option.categories || [], function (category) {
                // Data must has value
                return category.value != null ? category : zrUtil.extend({value : 0}, category);
            });
            var categoriesData = new List(['value'], this);
            categoriesData.initData(categories);

            this._categoriesData = categoriesData;
        },

        /**
         * @param {number} zoom
         */
        setRoamZoom: function (zoom) {
            var roamDetail = this.option.roamDetail;
            roamDetail && (roamDetail.zoom = zoom);
        },

        /**
         * @param {number} x
         * @param {number} y
         */
        setRoamPan: function (x, y) {
            var roamDetail = this.option.roamDetail;
            if (roamDetail) {
                roamDetail.x = x;
                roamDetail.y = y;
            }
        },

        defaultOption: {
            zlevel: 0,
            z: 2,

            color: ['#5793f3', '#d14a61', '#fd9c35', '#675bba', '#fec42c',
                    '#dd4444', '#d4df5a', '#cd4870'],

            coordinateSystem: 'view',

            legendHoverLink: true,

            hoverAnimation: true,

            layout: null,

            x: 'center',
            y: 'center',
            x2: null,
            y2: null,
            // width: '80%',
            // height: '80%',

            symbol: 'circle',
            symbolSize: 10,

            // roam: false,

            roamDetail: {
                x: 0,
                y: 0,
                zoom: 1
            },

            // Symbol size scale ratio in roam
            nodeScaleRatio: 0.6,

            // Line width scale ratio in roam
            edgeScaleRatio: 0.1,

            // categories: [],

            // data: []
            // Or
            // nodes: []
            //
            // links: []
            // Or
            // edges: []

            label: {
                normal: {
                    show: false
                },
                emphasis: {
                    show: true
                }
            },

            itemStyle: {
                normal: {},
                emphasis: {}
            },

            lineStyle: {
                normal: {
                    color: '#aaa',
                    width: 1,
                    curveness: 0,
                    opacity: 0.5
                },
                emphasis: {}
            }
        }
   });

});
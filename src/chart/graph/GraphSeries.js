define(function (require) {

    'use strict';

    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');

    var createGraphFromNodeEdge = require('../helper/createGraphFromNodeEdge');

    var GraphSeries = require('../../echarts').extendSeriesModel({

        type: 'series.graph',

        init: function (option) {
            GraphSeries.superApply(this, 'init', arguments);

            // Provide data for legend select
            this.legendDataProvider = function () {
                return this._categoriesData;
            };

            this._updateCategoriesData();
        },

        mergeOption: function (option) {
            GraphSeries.superApply(this, 'mergeOption', arguments);

            this._updateCategoriesData();
        },

        getInitialData: function (option, ecModel) {
            var edges = option.edges || option.links;
            var nodes = option.data || option.nodes;
            if (nodes && edges) {
                var graph = createGraphFromNodeEdge(nodes, edges, this, true);
                var list = graph.data;
                var self = this;
                // Overwrite list.getItemModel to
                list.wrapMethod('getItemModel', function (model) {
                    var categoriesModels = self._categoriesModels;
                    var categoryIdx = model.getShallow('category');
                    var categoryModel = categoriesModels[categoryIdx];
                    if (categoryModel) {
                        categoryModel.parentModel = model.parentModel;
                        model.parentModel = categoryModel;
                    }
                    return model;
                });
                return list;
            }
        },

        restoreData: function () {
            GraphSeries.superApply(this, 'restoreData', arguments);
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
                return category.value != null ? category : zrUtil.extend({
                    value: 0
                }, category);
            });
            var categoriesData = new List(['value'], this);
            categoriesData.initData(categories);

            this._categoriesData = categoriesData;

            this._categoriesModels = categoriesData.mapArray(function (idx) {
                return categoriesData.getItemModel(idx, true);
            });
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

            color: ['#61a0a8', '#d14a61', '#fd9c35', '#675bba', '#fec42c',
                    '#dd4444', '#fd9c35', '#cd4870'],

            coordinateSystem: 'view',

            legendHoverLink: true,

            hoverAnimation: true,

            layout: null,

            // Configuration of force
            force: {
                initLayout: null,
                repulsion: 50,
                gravity: 0.1,
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

            draggable: false,

            roam: false,
            roamDetail: {
                x: 0,
                y: 0,
                zoom: 1
            },

            // Symbol size scale ratio in roam
            nodeScaleRatio: 0.6,

            // Line width scale ratio in roam
            // edgeScaleRatio: 0.1,

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

    return GraphSeries;
});
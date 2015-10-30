define(function (require) {

    'use strict';

    var SeriesModel = require('../../model/Series');
    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');

    var createGraphFromNodeEdge = require('../helper/createGraphFromNodeEdge');

    return SeriesModel.extend({

        type: 'series.graph',

        init: function (option) {
            SeriesModel.prototype.init.apply(this, arguments);

            this._udpateCategoriesData();

            // Provide data for legend select
            this.legendDataProvider = function () {
                return this._categoriesData;
            };
        },

        mergeOption: function (option) {
            SeriesModel.prototype.mergeOption.apply(this, arguments);

            this._udpateCategoriesData();
        },

        _udpateCategoriesData: function () {
            var categories = zrUtil.map(this.option.categories || [], function (category) {
                // Data must has value
                return category.value != null ? category : zrUtil.extend({value : 0}, category);
            });
            var categoriesData = new List(['value'], this);
            categoriesData.initData(categories);

            this._categoriesData = categoriesData;
        },

        getInitialData: function (option, ecModel) {
            var edges = option.edges || option.links;
            var nodes = option.data || option.nodes;
            if (nodes && edges) {
                var graph = createGraphFromNodeEdge(nodes, edges, this, true);
                return graph.data;
            }
        },

        /**
         * Get category model by index
         * @param  {number} id Category index
         * @return {module:echarts/model/Model}
         */
        getCategoriesData: function () {
            return this._categoriesData;
        },

        defaultOption: {
            zlevel: 0,
            z: 2,
            
            coordinateSystem: 'view',

            layout: null,

            x: 'center',
            y: 'center',
            x2: null,
            y2: null,
            width: '90%',
            height: '90%',

            symbol: 'circle',
            symbolSize: 10,

            roam: true,

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
                    show: false
                }
            },

            itemStyle: {
                normal: {
                },
                emphasis: {
                }
            },

            lineStyle: {
                normal: {
                    color: '#aaa',
                    width: 1,
                    curveness: 0,
                    opacity: 0.5
                },
                emphasis: {
                }
            }
        }
   });

});
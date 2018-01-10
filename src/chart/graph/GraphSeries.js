import * as echarts from '../../echarts';
import List from '../../data/List';
import * as zrUtil from 'zrender/src/core/util';
import {defaultEmphasis} from '../../util/model';
import Model from '../../model/Model';
import {encodeHTML} from '../../util/format';
import createGraphFromNodeEdge from '../helper/createGraphFromNodeEdge';

var GraphSeries = echarts.extendSeriesModel({

    type: 'series.graph',

    init: function (option) {
        GraphSeries.superApply(this, 'init', arguments);

        // Provide data for legend select
        this.legendDataProvider = function () {
            return this._categoriesData;
        };

        this.fillDataTextStyle(option.edges || option.links);

        this._updateCategoriesData();
    },

    mergeOption: function (option) {
        GraphSeries.superApply(this, 'mergeOption', arguments);

        this.fillDataTextStyle(option.edges || option.links);

        this._updateCategoriesData();
    },

    mergeDefaultAndTheme: function (option) {
        GraphSeries.superApply(this, 'mergeDefaultAndTheme', arguments);
        defaultEmphasis(option, ['edgeLabel'], ['show']);
    },

    getInitialData: function (option, ecModel) {
        var edges = option.edges || option.links || [];
        var nodes = option.data || option.nodes || [];
        var self = this;

        if (nodes && edges) {
            return createGraphFromNodeEdge(nodes, edges, this, true, beforeLink).data;
        }

        function beforeLink(nodeData, edgeData) {
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

            edgeData.wrapMethod('getItemModel', function (model) {
                model.customizeGetParent(edgeGetParent);
                return model;
            });

            function edgeGetParent(path) {
                path = this.parsePath(path);
                return (path && path[0] === 'label')
                    ? fakeSeriesModel
                    : this.parentModel;
            }
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

    /**
     * @return {module:echarts/data/List}
     */
    getCategoriesData: function () {
        return this._categoriesData;
    },

    /**
     * @override
     */
    formatTooltip: function (dataIndex, multipleSeries, dataType) {
        if (dataType === 'edge') {
            var nodeData = this.getData();
            var params = this.getDataParams(dataIndex, dataType);
            var edge = nodeData.graph.getEdgeByIndex(dataIndex);
            var sourceName = nodeData.getName(edge.node1.dataIndex);
            var targetName = nodeData.getName(edge.node2.dataIndex);

            var html = [];
            sourceName != null && html.push(sourceName);
            targetName != null && html.push(targetName);
            html = encodeHTML(html.join(' > '));

            if (params.value) {
                html += ' : ' + encodeHTML(params.value);
            }
            return html;
        }
        else { // dataType === 'node' or empty
            return GraphSeries.superApply(this, 'formatTooltip', arguments);
        }
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

    setZoom: function (zoom) {
        this.option.zoom = zoom;
    },

    setCenter: function (center) {
        this.option.center = center;
    },

    isAnimationEnabled: function () {
        return GraphSeries.superCall(this, 'isAnimationEnabled')
            // Not enable animation when do force layout
            && !(this.get('layout') === 'force' && this.get('force.layoutAnimation'));
    },

    defaultOption: {
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
});

export default GraphSeries;
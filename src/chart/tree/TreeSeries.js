/**
 * @file Create data struct and define tree view's series model
 */

define(function (require) {

    var SeriesModel = require('../../model/Series');
    var Tree = require('../../data/Tree');

    return SeriesModel.extend({

        type: 'series.tree',

        layoutInfo: null,

        /**
         * Init a tree data structure from data in option series
         * @param  {Object} option  the object used to config echarts view
         * @return {module:echarts/data/List} storage initial data
         */
        getInitialData: function (option) {

            //create an virtual root
            var root = {name: option.name, children: option.data};

            var leaves = option.leaves || {};

            var treeOption = {};

            treeOption.leaves = leaves;

            var tree = Tree.createTree(root, this, treeOption);

            var treeDepth = 0;

            tree.eachNode('preorder', function (node) {
                if (node.depth > treeDepth) {
                    treeDepth = node.depth;
                }
            });

            var expandAndCollapse = option.expandAndCollapse;
            var expandTreeDepth = expandAndCollapse ? (option.initialTreeDepth >= 1 ? option.initialTreeDepth : 1) : treeDepth;

            tree.root.eachNode('preorder', function (node) {
                if (node.depth <= expandTreeDepth) {
                    node.isExpand = true;
                }
                else {
                    node.isExpand = false;
                }
            });

            return tree.data;
        },

        defaultOption: {
            zlevel: 0,
            z: 2,

            // the position of the whole view
            left: '12%',
            top: '12%',
            right: '12%',
            bottom: '12%',

            // the layout of the tree, two value can be selected, 'orthogonal' or 'radial'
            layout: 'orthogonal',

            // the orient of orthoginal layout, can be setted to 'horizontal' or 'vertical'
            orient: 'horizontal',

            symbol: 'emptyRect',

            symbolSize: 7,

            expandAndCollapse: true,

            initialTreeDepth: 1,

            lineStyle: {
                normal: {
                    color: '#ccc',
                    width: 1.5,
                    curveness: 0.5
                }
            },

            itemStyle: {
                normal: {
                    color: 'lightsteelblue',
                    borderColor: '#c23531',
                    borderWidth: 1.5
                }
            },

            label: {
                normal: {
                    show: true,
                    fontSize: 9,
                    color: '#555'
                }
            },

            leaves: {
                label: {
                    normal: {
                        show: true
                    }
                }
            },

            animation: true,

            animationEasing: 'linear',

            animationDuration: 800,

            animationDurationUpdate: 1000
        }
    });
});
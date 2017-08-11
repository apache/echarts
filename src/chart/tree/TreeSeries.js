/**
 * @file Create data struct and define tree view's series model
 */

define(function (require) {

    var SeriesModel = require('../../model/Series');
    var Tree = require('../../data/Tree');

    return SeriesModel.extend({

        type: 'series.tree',

        layoutInfo: null,

        // nodeToShow: null,

        /**
         * Init a tree data structure from data in option series
         *
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

            // var realRoot = tree.root.children[0];
            var treeDepth = option.initialTreeDepth >= 1 ? option.initialTreeDepth : 1;

            tree.root.eachNode('preorder', function (node) {
                if (node.depth <= treeDepth) {
                    node.isExpand = true;
                }
                else {
                    node.isExpand = false;
                }
            });

            return tree.data;
        },

        // /**
        //  * This function specify the node to be showed initially
        //  * @param  {Object} option  the series option
        //  * @return {Array}
        //  */
        // getInitialShowNode: function (option) {

        //     var treeDepth = option.initialTreeDepth + 1;
        //     var tree = this.getData().tree;
        //     var realRoot = tree.root.children[0];

        //     // var nodeToShow = this.nodeToShow = [];

        //     realRoot.eachNode('preorder', function (node) {
        //         if (node.depth <= treeDepth) {
        //             // nodeToShow.push(node);
        //             node.isExpand = true;
        //         }
        //         else {
        //             node.isExpand = false;
        //         }
        //     });

        //     // return nodeToShow;
        // },

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
            orient: 'vertical',

            symbol: 'emptyCircle',

            // the radius of the node circle
            // nodeRadius: 2.5,
            symbolSize: 8,


            expandAndCollapse: true,

            initialTreeDepth: 1,

            lineStyle: {
                normal: {
                    color: '#ccc',
                    width: 1.5,
                    curveness: 0.6
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
                    position: 'left',
                    textStyle: {
                        color: '#555'
                    }
                }
            },

            leaves: {
                label: {
                    normal: {
                        show: true,
                        position: 'right'
                    }
                }
            },

            animationEasing: 'linear',

            animationDuration: 1000
        }

    });

});
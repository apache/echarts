/**
 * @file Create data struct and define tree view's series model
 */

import SeriesModel from '../../model/Series';
import Tree from '../../data/Tree';
import {encodeHTML} from '../../util/format';

export default SeriesModel.extend({

    type: 'series.tree',

    layoutInfo: null,

    // can support the position parameters 'left', 'top','right','bottom', 'width',
    // 'height' in the setOption() with 'merge' mode normal.
    layoutMode: 'box',

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
        var expandTreeDepth = (expandAndCollapse && option.initialTreeDepth >= 0)
            ? option.initialTreeDepth : treeDepth;

        tree.root.eachNode('preorder', function (node) {
            var item = node.hostTree.data.getRawDataItem(node.dataIndex);
            node.isExpand = (item && item.collapsed != null)
                ? !item.collapsed
                : node.depth <= expandTreeDepth;
        });

        return tree.data;
    },

    /**
     * @override
     * @param {number} dataIndex
     */
    formatTooltip: function (dataIndex) {
        var tree = this.getData().tree;
        var realRoot = tree.root.children[0];
        var node = tree.getNodeByDataIndex(dataIndex);
        var value = node.getValue();
        var name = node.name;
        while (node && (node !== realRoot)) {
            name = node.parentNode.name + '.' + name;
            node = node.parentNode;
        }
        return encodeHTML(name + (
            (isNaN(value) || value == null) ? '' : ' : ' + value
        ));
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

        symbol: 'emptyCircle',

        symbolSize: 7,

        expandAndCollapse: true,

        initialTreeDepth: 2,

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

        animationEasing: 'linear',

        animationDuration: 700,

        animationDurationUpdate: 1000
    }
});
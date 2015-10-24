define(function(require) {

    var SeriesModel = require('../../model/Series');
    var Tree = require('../../data/Tree');
    var zrUtil = require('zrender/core/util');

    return SeriesModel.extend({

        type: 'series.treemap',

        dependencies: ['grid', 'polar'],

        defaultOption: {
            calculable: false,
            clickable: true,
            // center: ['50%', '50%'],             // not supported in ec3.
            size: ['80%', '80%'],               // deprecated, compatible with ec2.
            x: 'center',
            y: 'middle',
            x2: null,
            y2: null,
            width: '80%',
            height: '80%',
            sort: 'desc',                         // Can be null or 'asc' or 'desc'
            clipWindow: 'origin',                      // 缩放时窗口大小。'origin' or 'fullscreen'
            squareRatio: 0.5 * (1 + Math.sqrt(5)), // golden ratio
            root: '',
            colorDimension: 'value',                    // 默认第一个维度。
            zoomStep: 10,                         // 0表示不zoom。
            zoomToNodeRatio: 0.2 * 0.2,                 // zoom to node时 node占可视区域的面积比例。
            breadcrumb: {
                show: true,
                itemStyle: {
                    normal: {
                        textStyle: {}
                    },
                    emphasis: {
                        textStyle: {}
                    }
                }
            },
            label: {
                normal: {
                    show: true,
                    x: 5,
                    y: 12,
                    textStyle: {
                        align: 'left',
                        color: '#000',
                        fontFamily: 'Arial',
                        fontSize: 13,
                        fontStyle: 'normal',
                        fontWeight: 'normal'
                    }
                }
            },
            itemStyle: {
                normal: {
                    color: null,         // 各异 可以为数组，表示同一level的color 选取列表。
                    colorA: null,        // 默认不设置 可以为数组，表示同一level的color alpha 选取范围。
                    colorS: null,        // 默认不设置 可以为数组，表示同一level的color alpha 选取范围。
                    colorMapping: 'byIndex', // 'byIndex' or 'byValue'
                    borderWidth: 0,
                    borderColor: 'rgba(0,0,0,0)',
                    gapWidth: 0,
                    gapColor: 'rgba(0,0,0,0)' // 和borderColor恒相同。
                },
                emphasis: {}
            },
            visibleMin: 5,     // Less than this threshold, node will not be rendered.
            levels: []         // Each item: {
                               //     visibleMin, itemStyle, colorDimension
                               // }
        },

        /**
         * @override
         */
        getInitialData: function (option, ecModel) {
            var data = option.data || [];

            // Create a virtual root.
            var root = {name: '', children: option.data};

            completeTreeValue(root, zrUtil.isArray((data[0] || {}).value));

            // FIXME
            // sereis.mergeOption 的 getInitData是否放在merge后，从而能直接获取merege后的结果而非手动判断。
            var levels = option.levels || (this.option || {}).levels || [];

            // Make sure always a new tree is created when setOption,
            // in TreemapView, we check whether oldTree === newTree
            // to choose mappings approach among old shapes and new shapes.
            return Tree.createTree(root, this, levels).list;
        },

        /**
         * @public
         */
        getViewRoot: function () {
            var optionRoot = this.option.root;
            var treeRoot = this.getData().tree.root;
            return optionRoot && treeRoot.getNodeByName(optionRoot) || treeRoot;
        }

    });

    /**
     * @param {Object} dataNode
     */
    function completeTreeValue(dataNode, isArrayValue) {
        // Postorder travel tree.
        // If value of none-leaf node is not set,
        // calculate it by suming up the value of all children.
        var sum = 0;

        zrUtil.each(dataNode.children, function (child) {

            completeTreeValue(child, isArrayValue);

            var childValue = child.value;
            zrUtil.isArray(childValue) && (childValue = childValue[0]);

            sum += childValue;
        });

        var thisValue = dataNode.value;

        if (isArrayValue) {
            if (!zrUtil.isArray(thisValue)) {
                dataNode.value = [];
            }
            else {
                thisValue = thisValue[0];
            }
        }

        if (thisValue == null || isNaN(thisValue)) {
            thisValue = sum;
        }
        // Value should not less than 0.
        if (thisValue < 0) {
            thisValue = 0;
        }

        isArrayValue
            ? (dataNode.value[0] = thisValue)
            : (dataNode.value = thisValue);
    }

});
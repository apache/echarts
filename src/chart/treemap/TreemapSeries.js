define(function(require) {

    var SeriesModel = require('../../model/Series');
    var Tree = require('../../data/Tree');
    var zrUtil = require('zrender/core/util');
    var Model = require('../../model/Model');

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

            completeTreeValue(data);

            // FIXME
            // sereis.mergeOption 的 getInitData是否放在merge后，从而能直接获取merege后的结果而非手动判断。
            var levels = option.levels || (this.option || {}).levels || [];

            return Tree.createTree(data, this, levels).list;
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
     * @param {Array.<Object>} data
     * @return {number} Sum value of all children.
     */
    function completeTreeValue(data) {
        // Postorder travel tree.
        // If value of none-leaf node is not set,
        // calculate it by suming up the value of all children.
        var sum = 0;

        zrUtil.each(data, function (dataItem) {
            var isArrayValue = zrUtil.isArray(dataItem.value);
            var itemValue = dataItem.value;
            isArrayValue && (itemValue = itemValue[0]);

            var children = dataItem.children;
            if (children && (itemValue == null || isNaN(itemValue))) {
                itemValue = completeTreeValue(children);
            }

            // Value should not less than 0.
            if (itemValue < 0) {
                itemValue = 0;
            }

            isArrayValue
                ? (dataItem.value[0] = itemValue)
                : (dataItem.value = itemValue);

            sum += itemValue;
        });

        return sum;
    }

});
define(function(require) {

    var SeriesModel = require('../../model/Series');
    var Tree = require('../../data/Tree');
    var zrUtil = require('zrender/core/util');
    var Model = require('../../model/Model');
    var formatUtil = require('../../util/format');
    var helper = require('./helper');
    var encodeHTML = formatUtil.encodeHTML;
    var addCommas = formatUtil.addCommas;


    return SeriesModel.extend({

        type: 'series.treemap',

        dependencies: ['grid', 'polar'],

        /**
         * @type {module:echarts/data/Tree~Node}
         */
        _viewRoot: null,

        defaultOption: {
            // center: ['50%', '50%'],          // not supported in ec3.
            // size: ['80%', '80%'],            // deprecated, compatible with ec2.
            left: 'center',
            top: 'middle',
            right: null,
            bottom: null,
            width: '80%',
            height: '80%',
            sort: true,                         // Can be null or false or true
                                                // (order by desc default, asc not supported yet (strange effect))
            clipWindow: 'origin',               // Size of clipped window when zooming. 'origin' or 'fullscreen'
            squareRatio: 0.5 * (1 + Math.sqrt(5)), // golden ratio
            leafDepth: null,                    // Nodes on depth from root are regarded as leaves.
                                                // Count from zero (zero represents only view root).
            visualDimension: 0,                 // Can be 0, 1, 2, 3.
            zoomToNodeRatio: 0.32 * 0.32,       // Be effective when using zoomToNode. Specify the proportion of the
                                                // target node area in the view area.
            roam: true,                         // true, false, 'scale' or 'zoom', 'move'.
            nodeClick: 'zoomToNode',            // Leaf node click behaviour: 'zoomToNode', 'link', false.
                                                // If leafDepth is set and clicking a node which has children but
                                                // be on left depth, the behaviour would be changing root. Otherwise
                                                // use behavious defined above.
            animation: true,
            animationDurationUpdate: 900,
            animationEasing: 'quinticInOut',
            breadcrumb: {
                show: true,
                height: 22,
                left: 'center',
                top: 'bottom',
                // right
                // bottom
                emptyItemWidth: 25,             // Width of empty node.
                itemStyle: {
                    normal: {
                        color: 'rgba(0,0,0,0.7)', //'#5793f3',
                        borderColor: 'rgba(255,255,255,0.7)',
                        borderWidth: 1,
                        shadowColor: 'rgba(150,150,150,1)',
                        shadowBlur: 3,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0,
                        textStyle: {
                            color: '#fff'
                        }
                    },
                    emphasis: {
                        textStyle: {}
                    }
                }
            },
            label: {
                normal: {
                    show: true,
                    position: ['50%', '50%'], // Can be 5, '5%' or position stirng like 'insideTopLeft', ...
                    textStyle: {
                        align: 'center',
                        baseline: 'middle',
                        color: '#fff',
                        ellipsis: true
                    }
                }
            },
            itemStyle: {
                normal: {
                    color: null,            // Can be 'none' if not necessary.
                    colorAlpha: null,       // Can be 'none' if not necessary.
                    colorSaturation: null,  // Can be 'none' if not necessary.
                    borderWidth: 0,
                    gapWidth: 0,
                    borderColor: '#fff',
                    borderColorSaturation: null // If specified, borderColor will be ineffective, and the
                                                // border color is evaluated by color of current node and
                                                // borderColorSaturation.
                },
                emphasis: {

                }
            },
            color: 'none',              // Array. Specify color list of each level.
                                        // level[0].color would be global color list.
            colorAlpha: null,           // Array. Specify color alpha range of each level, like [0.2, 0.8]
            colorSaturation: null,      // Array. Specify color saturation of each level, like [0.2, 0.5]
            colorMappingBy: 'index',    // 'value' or 'index' or 'id'.
            visibleMin: 10,             // If area less than this threshold (unit: pixel^2), node will not
                                        // be rendered. Only works when sort is 'asc' or 'desc'.
            childrenVisibleMin: null,   // If area of a node less than this threshold (unit: pixel^2),
                                        // grandchildren will not show.
                                        // Why grandchildren? If not grandchildren but children,
                                        // some siblings show children and some not,
                                        // the appearance may be mess and not consistent,
            levels: []                  // Each item: {
                                        //     visibleMin, itemStyle, visualDimension, label
                                        // }
            // data: {
            //      value: [],
            //      children: [],
            //      link: 'http://xxx.xxx.xxx',
            //      target: 'blank' or 'self'
            // }
        },

        /**
         * @override
         */
        getInitialData: function (option, ecModel) {
            var data = option.data || [];
            var rootName = option.name;
            rootName == null && (rootName = option.name);

            // Create a virtual root.
            var root = {name: rootName, children: option.data};
            var value0 = (data[0] || {}).value;

            completeTreeValue(root, zrUtil.isArray(value0) ? value0.length : -1);

            // FIXME
            // sereis.mergeOption 的 getInitData是否放在merge后，从而能直接获取merege后的结果而非手动判断。
            var levels = option.levels || [];

            levels = option.levels = setDefault(levels, ecModel);

            // Make sure always a new tree is created when setOption,
            // in TreemapView, we check whether oldTree === newTree
            // to choose mappings approach among old shapes and new shapes.
            return Tree.createTree(root, this, levels).data;
        },

        optionUpdated: function () {
            this.resetViewRoot();
        },

        /**
         * @override
         * @param {number} dataIndex
         * @param {boolean} [mutipleSeries=false]
         */
        formatTooltip: function (dataIndex) {
            var data = this.getData();
            var value = this.getRawValue(dataIndex);
            var formattedValue = zrUtil.isArray(value)
                ? addCommas(value[0]) : addCommas(value);
            var name = data.getName(dataIndex);

            return encodeHTML(name) + ': ' + formattedValue;
        },

        /**
         * Add tree path to tooltip param
         *
         * @override
         * @param {number} dataIndex
         * @return {Object}
         */
        getDataParams: function (dataIndex) {
            var params = SeriesModel.prototype.getDataParams.apply(this, arguments);

            var data = this.getData();
            var node = data.tree.getNodeByDataIndex(dataIndex);
            var treePathInfo = params.treePathInfo = [];

            while (node) {
                var nodeDataIndex = node.dataIndex;
                treePathInfo.push({
                    name: node.name,
                    dataIndex: nodeDataIndex,
                    value: this.getRawValue(nodeDataIndex)
                });
                node = node.parentNode;
            }

            treePathInfo.reverse();

            return params;
        },

        /**
         * @public
         * @param {Object} layoutInfo {
         *                                x: containerGroup x
         *                                y: containerGroup y
         *                                width: containerGroup width
         *                                height: containerGroup height
         *                            }
         */
        setLayoutInfo: function (layoutInfo) {
            /**
             * @readOnly
             * @type {Object}
             */
            this.layoutInfo = this.layoutInfo || {};
            zrUtil.extend(this.layoutInfo, layoutInfo);
        },

        /**
         * @param  {string} id
         * @return {number} index
         */
        mapIdToIndex: function (id) {
            // A feature is implemented:
            // index is monotone increasing with the sequence of
            // input id at the first time.
            // This feature can make sure that each data item and its
            // mapped color have the same index between data list and
            // color list at the beginning, which is useful for user
            // to adjust data-color mapping.

            /**
             * @private
             * @type {Object}
             */
            var idIndexMap = this._idIndexMap;

            if (!idIndexMap) {
                idIndexMap = this._idIndexMap = {};
                /**
                 * @private
                 * @type {number}
                 */
                this._idIndexMapCount = 0;
            }

            var index = idIndexMap[id];
            if (index == null) {
                idIndexMap[id] = index = this._idIndexMapCount++;
            }

            return index;
        },

        getViewRoot: function () {
            return this._viewRoot;
        },

        /**
         * @param {module:echarts/data/Tree~Node} [viewRoot]
         * @return {string} direction 'drilldown' or 'rollup'
         */
        resetViewRoot: function (viewRoot) {
            viewRoot
                ? (this._viewRoot = viewRoot)
                : (viewRoot = this._viewRoot);

            var root = this.getData().tree.root;

            if (!viewRoot
                || (viewRoot !== root && !root.contains(viewRoot))
            ) {
                this._viewRoot = root;
            }
        }
    });

    /**
     * @param {Object} dataNode
     */
    function completeTreeValue(dataNode, arrValueLength) {
        // Postorder travel tree.
        // If value of none-leaf node is not set,
        // calculate it by suming up the value of all children.
        var sum = 0;

        zrUtil.each(dataNode.children, function (child) {

            completeTreeValue(child, arrValueLength);

            var childValue = child.value;
            zrUtil.isArray(childValue) && (childValue = childValue[0]);

            sum += childValue;
        });

        var thisValue = dataNode.value;

        if (arrValueLength >= 0) {
            if (!zrUtil.isArray(thisValue)) {
                dataNode.value = new Array(arrValueLength);
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

        arrValueLength >= 0
            ? (dataNode.value[0] = thisValue)
            : (dataNode.value = thisValue);
    }

    /**
     * set default to level configuration
     */
    function setDefault(levels, ecModel) {
        var globalColorList = ecModel.get('color');

        if (!globalColorList) {
            return;
        }

        levels = levels || [];
        var hasColorDefine;
        zrUtil.each(levels, function (levelDefine) {
            var model = new Model(levelDefine);
            var modelColor = model.get('color');
            if (model.get('itemStyle.normal.color')
                || (modelColor && modelColor !== 'none')
            ) {
                hasColorDefine = true;
            }
        });

        if (!hasColorDefine) {
            var level0 = levels[0] || (levels[0] = {});
            level0.color = globalColorList.slice();
        }

        return levels;
    }

});
/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as zrUtil from 'zrender/src/core/util';
import SeriesModel from '../../model/Series';
import Tree from '../../data/Tree';
import Model from '../../model/Model';
import {encodeHTML, addCommas} from '../../util/format';
import {wrapTreePathInfo} from '../helper/treeHelper';

export default SeriesModel.extend({

    type: 'series.treemap',

    layoutMode: 'box',

    dependencies: ['grid', 'polar'],

    preventUsingHoverLayer: true,

    /**
     * @type {module:echarts/data/Tree~Node}
     */
    _viewRoot: null,

    defaultOption: {
        // Disable progressive rendering
        progressive: 0,
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
        drillDownIcon: '▶',                 // Use html character temporarily because it is complicated
                                            // to align specialized icon. ▷▶❒❐▼✚

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
        },
        label: {
            show: true,
            // Do not use textDistance, for ellipsis rect just the same as treemap node rect.
            distance: 0,
            padding: 5,
            position: 'inside', // Can be [5, '5%'] or position stirng like 'insideTopLeft', ...
            // formatter: null,
            color: '#fff',
            ellipsis: true
            // align
            // verticalAlign
        },
        upperLabel: {                   // Label when node is parent.
            show: false,
            position: [0, '50%'],
            height: 20,
            // formatter: null,
            color: '#fff',
            ellipsis: true,
            // align: null,
            verticalAlign: 'middle'
        },
        itemStyle: {
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
            upperLabel: {
                show: true,
                position: [0, '50%'],
                color: '#fff',
                ellipsis: true,
                verticalAlign: 'middle'
            }
        },

        visualDimension: 0,                 // Can be 0, 1, 2, 3.
        visualMin: null,
        visualMax: null,

        color: [],                  // + treemapSeries.color should not be modified. Please only modified
                                    // level[n].color (if necessary).
                                    // + Specify color list of each level. level[0].color would be global
                                    // color list if not specified. (see method `setDefault`).
                                    // + But set as a empty array to forbid fetch color from global palette
                                    // when using nodeModel.get('color'), otherwise nodes on deep level
                                    // will always has color palette set and are not able to inherit color
                                    // from parent node.
                                    // + TreemapSeries.color can not be set as 'none', otherwise effect
                                    // legend color fetching (see seriesColor.js).
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
        // Create a virtual root.
        var root = {name: option.name, children: option.data};

        completeTreeValue(root);

        var levels = option.levels || [];

        levels = option.levels = setDefault(levels, ecModel);

        var treeOption = {};

        treeOption.levels = levels;

        // Make sure always a new tree is created when setOption,
        // in TreemapView, we check whether oldTree === newTree
        // to choose mappings approach among old shapes and new shapes.
        return Tree.createTree(root, this, treeOption).data;
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

        return encodeHTML(name + ': ' + formattedValue);
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

        var node = this.getData().tree.getNodeByDataIndex(dataIndex);
        params.treePathInfo = wrapTreePathInfo(node, this);

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
            idIndexMap = this._idIndexMap = zrUtil.createHashMap();
            /**
             * @private
             * @type {number}
             */
            this._idIndexMapCount = 0;
        }

        var index = idIndexMap.get(id);
        if (index == null) {
            idIndexMap.set(id, index = this._idIndexMapCount++);
        }

        return index;
    },

    getViewRoot: function () {
        return this._viewRoot;
    },

    /**
     * @param {module:echarts/data/Tree~Node} [viewRoot]
     */
    resetViewRoot: function (viewRoot) {
        viewRoot
            ? (this._viewRoot = viewRoot)
            : (viewRoot = this._viewRoot);

        var root = this.getRawData().tree.root;

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
function completeTreeValue(dataNode) {
    // Postorder travel tree.
    // If value of none-leaf node is not set,
    // calculate it by suming up the value of all children.
    var sum = 0;

    zrUtil.each(dataNode.children, function (child) {

        completeTreeValue(child);

        var childValue = child.value;
        zrUtil.isArray(childValue) && (childValue = childValue[0]);

        sum += childValue;
    });

    var thisValue = dataNode.value;
    if (zrUtil.isArray(thisValue)) {
        thisValue = thisValue[0];
    }

    if (thisValue == null || isNaN(thisValue)) {
        thisValue = sum;
    }
    // Value should not less than 0.
    if (thisValue < 0) {
        thisValue = 0;
    }

    zrUtil.isArray(dataNode.value)
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

        if (model.get('itemStyle.color')
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

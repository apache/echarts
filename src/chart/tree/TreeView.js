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

/**
 * @file  This file used to draw tree view
 */

import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import SymbolClz from '../helper/Symbol';
import {radialCoordinate} from './layoutHelper';
import * as echarts from '../../echarts';

export default echarts.extendChartView({

    type: 'tree',

    /**
     * Init the chart
     * @override
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     */
    init: function (ecModel, api) {

        /**
         * @private
         * @type {module:echarts/data/Tree}
         */
        this._oldTree;

        /**
         * @private
         * @type {module:zrender/container/Group}
         */
        this._mainGroup = new graphic.Group();

        this.group.add(this._mainGroup);
    },

    render: function (seriesModel, ecModel, api, payload) {

        var data = seriesModel.getData();

        var layoutInfo = seriesModel.layoutInfo;

        var group = this._mainGroup;

        var layout = seriesModel.get('layout');

        if (layout === 'radial') {
            group.attr('position', [layoutInfo.x + layoutInfo.width / 2, layoutInfo.y + layoutInfo.height / 2]);
        }
        else {
            group.attr('position', [layoutInfo.x, layoutInfo.y]);
        }

        var oldData = this._data;

        var seriesScope = {
            expandAndCollapse: seriesModel.get('expandAndCollapse'),
            layout: layout,
            orient: seriesModel.getOrient(),
            curvature: seriesModel.get('lineStyle.curveness'),
            symbolRotate: seriesModel.get('symbolRotate'),
            symbolOffset: seriesModel.get('symbolOffset'),
            hoverAnimation: seriesModel.get('hoverAnimation'),
            useNameLabel: true,
            fadeIn: true
        };

        data.diff(oldData)
            .add(function (newIdx) {
                if (symbolNeedsDraw(data, newIdx)) {
                    // create node and edge
                    updateNode(data, newIdx, null, group, seriesModel, seriesScope);
                }
            })
            .update(function (newIdx, oldIdx) {
                var symbolEl = oldData.getItemGraphicEl(oldIdx);
                if (!symbolNeedsDraw(data, newIdx)) {
                    symbolEl && removeNode(oldData, oldIdx, symbolEl, group, seriesModel, seriesScope);
                    return;
                }
                // update  node and edge
                updateNode(data, newIdx, symbolEl, group, seriesModel, seriesScope);
            })
            .remove(function (oldIdx) {
                var symbolEl = oldData.getItemGraphicEl(oldIdx);
                // When remove a collapsed node of subtree, since the collapsed
                // node haven't been initialized with a symbol element,
                // you can't found it's symbol element through index.
                // so if we want to remove the symbol element we should insure
                // that the symbol element is not null.
                if (symbolEl) {
                    removeNode(oldData, oldIdx, symbolEl, group, seriesModel, seriesScope);
                }
            })
            .execute();

        if (seriesScope.expandAndCollapse === true) {
            data.eachItemGraphicEl(function (el, dataIndex) {
                el.off('click').on('click', function () {
                    api.dispatchAction({
                        type: 'treeExpandAndCollapse',
                        seriesId: seriesModel.id,
                        dataIndex: dataIndex
                    });
                });
            });
        }

        this._data = data;
    },

    dispose: function () {},

    remove: function () {
        this._mainGroup.removeAll();
        this._data = null;
    }

});

function symbolNeedsDraw(data, dataIndex) {
    var layout = data.getItemLayout(dataIndex);

    return layout
        && !isNaN(layout.x) && !isNaN(layout.y)
        && data.getItemVisual(dataIndex, 'symbol') !== 'none';
}

function getTreeNodeStyle(node, itemModel, seriesScope) {
    seriesScope.itemModel = itemModel;
    seriesScope.itemStyle = itemModel.getModel('itemStyle').getItemStyle();
    seriesScope.hoverItemStyle = itemModel.getModel('emphasis.itemStyle').getItemStyle();
    seriesScope.lineStyle = itemModel.getModel('lineStyle').getLineStyle();
    seriesScope.labelModel = itemModel.getModel('label');
    seriesScope.hoverLabelModel = itemModel.getModel('emphasis.label');

    if (node.isExpand === false && node.children.length !== 0) {
        seriesScope.symbolInnerColor = seriesScope.itemStyle.fill;
    }
    else {
        seriesScope.symbolInnerColor = '#fff';
    }

    return seriesScope;
}

function updateNode(data, dataIndex, symbolEl, group, seriesModel, seriesScope) {
    var isInit = !symbolEl;
    var node = data.tree.getNodeByDataIndex(dataIndex);
    var itemModel = node.getModel();
    var seriesScope = getTreeNodeStyle(node, itemModel, seriesScope);
    var virtualRoot = data.tree.root;

    var source = node.parentNode === virtualRoot ? node : node.parentNode || node;
    var sourceSymbolEl = data.getItemGraphicEl(source.dataIndex);
    var sourceLayout = source.getLayout();
    var sourceOldLayout = sourceSymbolEl
        ? {
            x: sourceSymbolEl.position[0],
            y: sourceSymbolEl.position[1],
            rawX: sourceSymbolEl.__radialOldRawX,
            rawY: sourceSymbolEl.__radialOldRawY
        }
        : sourceLayout;
    var targetLayout = node.getLayout();

    if (isInit) {
        symbolEl = new SymbolClz(data, dataIndex, seriesScope);
        symbolEl.attr('position', [sourceOldLayout.x, sourceOldLayout.y]);
    }
    else {
        symbolEl.updateData(data, dataIndex, seriesScope);
    }

    symbolEl.__radialOldRawX = symbolEl.__radialRawX;
    symbolEl.__radialOldRawY = symbolEl.__radialRawY;
    symbolEl.__radialRawX = targetLayout.rawX;
    symbolEl.__radialRawY = targetLayout.rawY;

    group.add(symbolEl);
    data.setItemGraphicEl(dataIndex, symbolEl);
    graphic.updateProps(symbolEl, {
        position: [targetLayout.x, targetLayout.y]
    }, seriesModel);

    var symbolPath = symbolEl.getSymbolPath();

    if (seriesScope.layout === 'radial') {
        var realRoot = virtualRoot.children[0];
        var rootLayout = realRoot.getLayout();
        var length = realRoot.children.length;
        var rad;
        var isLeft;

        if (targetLayout.x === rootLayout.x && node.isExpand === true) {
            var center = {};
            center.x = (realRoot.children[0].getLayout().x + realRoot.children[length - 1].getLayout().x) / 2;
            center.y = (realRoot.children[0].getLayout().y + realRoot.children[length - 1].getLayout().y) / 2;
            rad = Math.atan2(center.y - rootLayout.y, center.x - rootLayout.x);
            if (rad < 0) {
                rad = Math.PI * 2 + rad;
            }
            isLeft = center.x < rootLayout.x;
            if (isLeft) {
                rad = rad - Math.PI;
            }
        }
        else {
            rad = Math.atan2(targetLayout.y - rootLayout.y, targetLayout.x - rootLayout.x);
            if (rad < 0) {
                rad = Math.PI * 2 + rad;
            }
            if (node.children.length === 0 || (node.children.length !== 0 && node.isExpand === false)) {
                isLeft = targetLayout.x < rootLayout.x;
                if (isLeft) {
                    rad = rad - Math.PI;
                }
            }
            else {
                isLeft = targetLayout.x > rootLayout.x;
                if (!isLeft) {
                    rad = rad - Math.PI;
                }
            }
        }

        var textPosition = isLeft ? 'left' : 'right';
        symbolPath.setStyle({
            textPosition: textPosition,
            textRotation: -rad,
            textOrigin: 'center',
            verticalAlign: 'middle'
        });
    }

    if (node.parentNode && node.parentNode !== virtualRoot) {
        var edge = symbolEl.__edge;
        if (!edge) {
            edge = symbolEl.__edge = new graphic.BezierCurve({
                shape: getEdgeShape(seriesScope, sourceOldLayout, sourceOldLayout),
                style: zrUtil.defaults({opacity: 0}, seriesScope.lineStyle)
            });
        }

        graphic.updateProps(edge, {
            shape: getEdgeShape(seriesScope, sourceLayout, targetLayout),
            style: {opacity: 1}
        }, seriesModel);

        group.add(edge);
    }
}

function removeNode(data, dataIndex, symbolEl, group, seriesModel, seriesScope) {
    var node = data.tree.getNodeByDataIndex(dataIndex);
    var virtualRoot = data.tree.root;
    var itemModel = node.getModel();
    var seriesScope = getTreeNodeStyle(node, itemModel, seriesScope);

    var source = node.parentNode === virtualRoot ? node : node.parentNode || node;
    var sourceLayout;
    while (sourceLayout = source.getLayout(), sourceLayout == null) {
        source = source.parentNode === virtualRoot ? source : source.parentNode || source;
    }

    graphic.updateProps(symbolEl, {
        position: [sourceLayout.x + 1, sourceLayout.y + 1]
    }, seriesModel, function () {
        group.remove(symbolEl);
        data.setItemGraphicEl(dataIndex, null);
    });

    symbolEl.fadeOut(null, {keepLabel: true});

    var edge = symbolEl.__edge;
    if (edge) {
        graphic.updateProps(edge, {
            shape: getEdgeShape(seriesScope, sourceLayout, sourceLayout),
            style: {
                opacity: 0
            }
        }, seriesModel, function () {
            group.remove(edge);
        });
    }
}

function getEdgeShape(seriesScope, sourceLayout, targetLayout) {
    var cpx1;
    var cpy1;
    var cpx2;
    var cpy2;
    var orient = seriesScope.orient;

    if (seriesScope.layout === 'radial') {
        var x1 = sourceLayout.rawX;
        var y1 = sourceLayout.rawY;
        var x2 = targetLayout.rawX;
        var y2 = targetLayout.rawY;

        var radialCoor1 = radialCoordinate(x1, y1);
        var radialCoor2 = radialCoordinate(x1, y1 + (y2 - y1) * seriesScope.curvature);
        var radialCoor3 = radialCoordinate(x2, y2 + (y1 - y2) * seriesScope.curvature);
        var radialCoor4 = radialCoordinate(x2, y2);

        return {
            x1: radialCoor1.x,
            y1: radialCoor1.y,
            x2: radialCoor4.x,
            y2: radialCoor4.y,
            cpx1: radialCoor2.x,
            cpy1: radialCoor2.y,
            cpx2: radialCoor3.x,
            cpy2: radialCoor3.y
        };
    }
    else {
        var x1 = sourceLayout.x;
        var y1 = sourceLayout.y;
        var x2 = targetLayout.x;
        var y2 = targetLayout.y;

        if (orient === 'LR' || orient === 'RL') {
            cpx1 = x1 + (x2 - x1) * seriesScope.curvature;
            cpy1 = y1;
            cpx2 = x2 + (x1 - x2) * seriesScope.curvature;
            cpy2 = y2;
        }
        if (orient === 'TB' || orient === 'BT') {
            cpx1 = x1;
            cpy1 = y1 + (y2 - y1) * seriesScope.curvature;
            cpx2 = x2;
            cpy2 = y2 + (y1 - y2) * seriesScope.curvature;
        }
        return {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            cpx1: cpx1,
            cpy1: cpy1,
            cpx2: cpx2,
            cpy2: cpy2
        };
    }
}
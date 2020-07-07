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
import * as graphic from '../../util/graphic';
import SymbolClz from '../helper/Symbol';
import {radialCoordinate} from './layoutHelper';
import * as echarts from '../../echarts';
import * as bbox from 'zrender/src/core/bbox';
import View from '../../coord/View';
import * as roamHelper from '../../component/helper/roamHelper';
import RoamController from '../../component/helper/RoamController';
import {onIrrelevantElement} from '../../component/helper/cursorHelper';
import { __DEV__ } from '../../config';
import {parsePercent} from '../../util/number';

var TreeShape = graphic.extendShape({
    shape: {
        parentPoint: [],
        childPoints: [],
        orient: '',
        forkPosition: ''
    },

    style: {
        stroke: '#000',
        fill: null
    },

    buildPath: function (ctx, shape) {
        var childPoints = shape.childPoints;
        var childLen = childPoints.length;
        var parentPoint = shape.parentPoint;
        var firstChildPos = childPoints[0];
        var lastChildPos = childPoints[childLen - 1];

        if (childLen === 1) {
            ctx.moveTo(parentPoint[0], parentPoint[1]);
            ctx.lineTo(firstChildPos[0], firstChildPos[1]);
            return;
        }

        var orient = shape.orient;
        var forkDim = (orient === 'TB' || orient === 'BT') ? 0 : 1;
        var otherDim = 1 - forkDim;
        var forkPosition = parsePercent(shape.forkPosition, 1);
        var tmpPoint = [];
        tmpPoint[forkDim] = parentPoint[forkDim];
        tmpPoint[otherDim] = parentPoint[otherDim] + (lastChildPos[otherDim] - parentPoint[otherDim]) * forkPosition;

        ctx.moveTo(parentPoint[0], parentPoint[1]);
        ctx.lineTo(tmpPoint[0], tmpPoint[1]);
        ctx.moveTo(firstChildPos[0], firstChildPos[1]);
        tmpPoint[forkDim] = firstChildPos[forkDim];
        ctx.lineTo(tmpPoint[0], tmpPoint[1]);
        tmpPoint[forkDim] = lastChildPos[forkDim];
        ctx.lineTo(tmpPoint[0], tmpPoint[1]);
        ctx.lineTo(lastChildPos[0], lastChildPos[1]);

        for (var i = 1; i < childLen - 1; i++) {
            var point = childPoints[i];
            ctx.moveTo(point[0], point[1]);
            tmpPoint[forkDim] = point[forkDim];
            ctx.lineTo(tmpPoint[0], tmpPoint[1]);
        }
    }
});

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

        /**
         * @private
         * @type {module:echarts/componet/helper/RoamController}
         */
        this._controller = new RoamController(api.getZr());

        this._controllerHost = {target: this.group};

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

        this._updateViewCoordSys(seriesModel, layoutInfo, layout);
        this._updateController(seriesModel, ecModel, api);

        var oldData = this._data;

        var seriesScope = {
            expandAndCollapse: seriesModel.get('expandAndCollapse'),
            layout: layout,
            edgeShape: seriesModel.get('edgeShape'),
            edgeForkPosition: seriesModel.get('edgeForkPosition'),
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
                    // Create node and edge
                    updateNode(data, newIdx, null, group, seriesModel, seriesScope);
                }
            })
            .update(function (newIdx, oldIdx) {
                var symbolEl = oldData.getItemGraphicEl(oldIdx);
                if (!symbolNeedsDraw(data, newIdx)) {
                    symbolEl && removeNode(oldData, oldIdx, symbolEl, group, seriesModel, seriesScope);
                    return;
                }
                // Update node and edge
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

        this._nodeScaleRatio = seriesModel.get('nodeScaleRatio');

        this._updateNodeAndLinkScale(seriesModel);

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

    _updateViewCoordSys: function (seriesModel) {
        var data = seriesModel.getData();
        var points = [];
        data.each(function (idx) {
            var layout = data.getItemLayout(idx);
            if (layout && !isNaN(layout.x) && !isNaN(layout.y)) {
                points.push([+layout.x, +layout.y]);
            }
        });
        var min = [];
        var max = [];
        bbox.fromPoints(points, min, max);

        // If don't Store min max when collapse the root node after roam,
        // the root node will disappear.
        var oldMin = this._min;
        var oldMax = this._max;

        // If width or height is 0
        if (max[0] - min[0] === 0) {
            min[0] = oldMin ? oldMin[0] : min[0] - 1;
            max[0] = oldMax ? oldMax[0] : max[0] + 1;
        }
        if (max[1] - min[1] === 0) {
            min[1] = oldMin ? oldMin[1] : min[1] - 1;
            max[1] = oldMax ? oldMax[1] : max[1] + 1;
        }

        var viewCoordSys = seriesModel.coordinateSystem = new View();
        viewCoordSys.zoomLimit = seriesModel.get('scaleLimit');

        viewCoordSys.setBoundingRect(min[0], min[1], max[0] - min[0], max[1] - min[1]);

        viewCoordSys.setCenter(seriesModel.get('center'));
        viewCoordSys.setZoom(seriesModel.get('zoom'));

        // Here we use viewCoordSys just for computing the 'position' and 'scale' of the group
        this.group.attr({
            position: viewCoordSys.position,
            scale: viewCoordSys.scale
        });

        this._viewCoordSys = viewCoordSys;
        this._min = min;
        this._max = max;
    },

    _updateController: function (seriesModel, ecModel, api) {
        var controller = this._controller;
        var controllerHost = this._controllerHost;
        var group = this.group;
        controller.setPointerChecker(function (e, x, y) {
            var rect = group.getBoundingRect();
            rect.applyTransform(group.transform);
            return rect.contain(x, y)
                && !onIrrelevantElement(e, api, seriesModel);
        });

        controller.enable(seriesModel.get('roam'));
        controllerHost.zoomLimit = seriesModel.get('scaleLimit');
        controllerHost.zoom = seriesModel.coordinateSystem.getZoom();

        controller
            .off('pan')
            .off('zoom')
            .on('pan', function (e) {
                roamHelper.updateViewOnPan(controllerHost, e.dx, e.dy);
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'treeRoam',
                    dx: e.dx,
                    dy: e.dy
                });
            }, this)
            .on('zoom', function (e) {
                roamHelper.updateViewOnZoom(controllerHost, e.scale, e.originX, e.originY);
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'treeRoam',
                    zoom: e.scale,
                    originX: e.originX,
                    originY: e.originY
                });
                this._updateNodeAndLinkScale(seriesModel);
            }, this);
    },

    _updateNodeAndLinkScale: function (seriesModel) {
        var data = seriesModel.getData();

        var nodeScale = this._getNodeGlobalScale(seriesModel);
        var invScale = [nodeScale, nodeScale];

        data.eachItemGraphicEl(function (el, idx) {
            el.attr('scale', invScale);
        });
    },

    _getNodeGlobalScale: function (seriesModel) {
        var coordSys = seriesModel.coordinateSystem;
        if (coordSys.type !== 'view') {
            return 1;
        }

        var nodeScaleRatio = this._nodeScaleRatio;

        var groupScale = coordSys.scale;
        var groupZoom = (groupScale && groupScale[0]) || 1;
        // Scale node when zoom changes
        var roamZoom = coordSys.getZoom();
        var nodeScale = (roamZoom - 1) * nodeScaleRatio + 1;

        return nodeScale / groupZoom;
    },

    dispose: function () {
        this._controller && this._controller.dispose();
        this._controllerHost = {};
    },

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
        var rotate = seriesScope.labelModel.get('rotate');
        var labelRotateRadian = rotate * (Math.PI / 180);

        symbolPath.setStyle({
            textPosition: seriesScope.labelModel.get('position') || textPosition,
            textRotation: rotate == null ? -rad : labelRotateRadian,
            textOrigin: 'center',
            verticalAlign: 'middle'
        });
    }

    drawEdge(
        seriesModel, node, virtualRoot, symbolEl, sourceOldLayout,
        sourceLayout, targetLayout, group, seriesScope
    );

}

function drawEdge(
    seriesModel, node, virtualRoot, symbolEl, sourceOldLayout,
    sourceLayout, targetLayout, group, seriesScope
) {

    var edgeShape = seriesScope.edgeShape;
    var edge = symbolEl.__edge;
    if (edgeShape === 'curve') {
        if (node.parentNode && node.parentNode !== virtualRoot) {
            if (!edge) {
                edge = symbolEl.__edge = new graphic.BezierCurve({
                    shape: getEdgeShape(seriesScope, sourceOldLayout, sourceOldLayout),
                    style: zrUtil.defaults({opacity: 0, strokeNoScale: true}, seriesScope.lineStyle)
                });
            }

            graphic.updateProps(edge, {
                shape: getEdgeShape(seriesScope, sourceLayout, targetLayout),
                style: zrUtil.defaults({opacity: 1}, seriesScope.lineStyle)
            }, seriesModel);
        }
    }
    else if (edgeShape === 'polyline') {
        if (seriesScope.layout === 'orthogonal') {
            if (node !== virtualRoot && node.children && (node.children.length !== 0) && (node.isExpand === true)) {
                var children = node.children;
                var childPoints = [];
                for (var i = 0; i < children.length; i++) {
                    var childLayout = children[i].getLayout();
                    childPoints.push([childLayout.x, childLayout.y]);
                }

                if (!edge) {
                    edge = symbolEl.__edge = new TreeShape({
                        shape: {
                            parentPoint: [targetLayout.x, targetLayout.y],
                            childPoints: [[targetLayout.x, targetLayout.y]],
                            orient: seriesScope.orient,
                            forkPosition: seriesScope.edgeForkPosition
                        },
                        style: zrUtil.defaults({opacity: 0, strokeNoScale: true}, seriesScope.lineStyle)
                    });
                }
                graphic.updateProps(edge, {
                    shape: {
                        parentPoint: [targetLayout.x, targetLayout.y],
                        childPoints: childPoints
                    },
                    style: zrUtil.defaults({opacity: 1}, seriesScope.lineStyle)
                }, seriesModel);
            }
        }
        else {
            if (__DEV__) {
                throw new Error('The polyline edgeShape can only be used in orthogonal layout');
            }
        }
    }
    group.add(edge);
}

function removeNode(data, dataIndex, symbolEl, group, seriesModel, seriesScope) {
    var node = data.tree.getNodeByDataIndex(dataIndex);
    var virtualRoot = data.tree.root;
    var itemModel = node.getModel();
    var seriesScope = getTreeNodeStyle(node, itemModel, seriesScope);

    var source = node.parentNode === virtualRoot ? node : node.parentNode || node;
    var edgeShape = seriesScope.edgeShape;
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

    var sourceSymbolEl = data.getItemGraphicEl(source.dataIndex);
    var sourceEdge = sourceSymbolEl.__edge;

    // 1. when expand the sub tree, delete the children node should delete the edge of
    // the source at the same time. because the polyline edge shape is only owned by the source.
    // 2.when the node is the only children of the source, delete the node should delete the edge of
    // the source at the same time. the same reason as above.
    var edge = symbolEl.__edge
        || ((source.isExpand === false || source.children.length === 1) ? sourceEdge : undefined);

    var edgeShape = seriesScope.edgeShape;

    if (edge) {
        if (edgeShape === 'curve') {
            graphic.updateProps(edge, {
                shape: getEdgeShape(seriesScope, sourceLayout, sourceLayout),
                style: {
                    opacity: 0
                }
            }, seriesModel, function () {
                group.remove(edge);
            });
        }
        else if (edgeShape === 'polyline' && seriesScope.layout === 'orthogonal') {
            graphic.updateProps(edge, {
                shape: {
                    parentPoint: [sourceLayout.x, sourceLayout.y],
                    childPoints: [[sourceLayout.x, sourceLayout.y]]
                },
                style: {
                    opacity: 0
                }
            }, seriesModel, function () {
                group.remove(edge);
            });
        }
    }
}

function getEdgeShape(seriesScope, sourceLayout, targetLayout) {
    var cpx1;
    var cpy1;
    var cpx2;
    var cpy2;
    var orient = seriesScope.orient;
    var x1;
    var x2;
    var y1;
    var y2;

    if (seriesScope.layout === 'radial') {
        x1 = sourceLayout.rawX;
        y1 = sourceLayout.rawY;
        x2 = targetLayout.rawX;
        y2 = targetLayout.rawY;

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
        x1 = sourceLayout.x;
        y1 = sourceLayout.y;
        x2 = targetLayout.x;
        y2 = targetLayout.y;

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

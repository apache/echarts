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

import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import SymbolDraw from '../helper/SymbolDraw';
import LineDraw from '../helper/LineDraw';
import RoamController from '../../component/helper/RoamController';
import * as roamHelper from '../../component/helper/roamHelper';
import {onIrrelevantElement} from '../../component/helper/cursorHelper';
import * as graphic from '../../util/graphic';
import adjustEdge from './adjustEdge';


var nodeOpacityPath = ['itemStyle', 'opacity'];
var lineOpacityPath = ['lineStyle', 'opacity'];

function getItemOpacity(item, opacityPath) {
    return item.getVisual('opacity') || item.getModel().get(opacityPath);
}

function fadeOutItem(item, opacityPath, opacityRatio) {
    var el = item.getGraphicEl();

    var opacity = getItemOpacity(item, opacityPath);
    if (opacityRatio != null) {
        opacity == null && (opacity = 1);
        opacity *= opacityRatio;
    }

    el.downplay && el.downplay();
    el.traverse(function (child) {
        if (child.type !== 'group') {
            child.setStyle('opacity', opacity);
        }
    });
}

function fadeInItem(item, opacityPath) {
    var opacity = getItemOpacity(item, opacityPath);
    var el = item.getGraphicEl();

    el.highlight && el.highlight();
    el.traverse(function (child) {
        if (child.type !== 'group') {
            child.setStyle('opacity', opacity);
        }
    });
}

export default echarts.extendChartView({

    type: 'graph',

    init: function (ecModel, api) {
        var symbolDraw = new SymbolDraw();
        var lineDraw = new LineDraw();
        var group = this.group;

        this._controller = new RoamController(api.getZr());
        this._controllerHost = {target: group};

        group.add(symbolDraw.group);
        group.add(lineDraw.group);

        this._symbolDraw = symbolDraw;
        this._lineDraw = lineDraw;

        this._firstRender = true;
    },

    render: function (seriesModel, ecModel, api) {
        var coordSys = seriesModel.coordinateSystem;

        this._model = seriesModel;
        this._nodeScaleRatio = seriesModel.get('nodeScaleRatio');

        var symbolDraw = this._symbolDraw;
        var lineDraw = this._lineDraw;

        var group = this.group;

        if (coordSys.type === 'view') {
            var groupNewProp = {
                position: coordSys.position,
                scale: coordSys.scale
            };
            if (this._firstRender) {
                group.attr(groupNewProp);
            }
            else {
                graphic.updateProps(group, groupNewProp, seriesModel);
            }
        }
        // Fix edge contact point with node
        adjustEdge(seriesModel.getGraph(), this._getNodeGlobalScale(seriesModel));

        var data = seriesModel.getData();
        symbolDraw.updateData(data);

        var edgeData = seriesModel.getEdgeData();
        lineDraw.updateData(edgeData);

        this._updateNodeAndLinkScale();

        this._updateController(seriesModel, ecModel, api);

        clearTimeout(this._layoutTimeout);
        var forceLayout = seriesModel.forceLayout;
        var layoutAnimation = seriesModel.get('force.layoutAnimation');
        if (forceLayout) {
            this._startForceLayoutIteration(forceLayout, layoutAnimation);
        }

        data.eachItemGraphicEl(function (el, idx) {
            var itemModel = data.getItemModel(idx);
            // Update draggable
            el.off('drag').off('dragend');
            var draggable = itemModel.get('draggable');
            if (draggable) {
                el.on('drag', function () {
                    if (forceLayout) {
                        forceLayout.warmUp();
                        !this._layouting
                            && this._startForceLayoutIteration(forceLayout, layoutAnimation);
                        forceLayout.setFixed(idx);
                        // Write position back to layout
                        data.setItemLayout(idx, el.position);
                    }
                }, this).on('dragend', function () {
                    if (forceLayout) {
                        forceLayout.setUnfixed(idx);
                    }
                }, this);
            }
            el.setDraggable(draggable && forceLayout);

            el.off('mouseover', el.__focusNodeAdjacency);
            el.off('mouseout', el.__unfocusNodeAdjacency);

            if (itemModel.get('focusNodeAdjacency')) {
                el.on('mouseover', el.__focusNodeAdjacency = function () {
                    api.dispatchAction({
                        type: 'focusNodeAdjacency',
                        seriesId: seriesModel.id,
                        dataIndex: el.dataIndex
                    });
                });
                el.on('mouseout', el.__unfocusNodeAdjacency = function () {
                    api.dispatchAction({
                        type: 'unfocusNodeAdjacency',
                        seriesId: seriesModel.id
                    });
                });

            }

        }, this);

        data.graph.eachEdge(function (edge) {
            var el = edge.getGraphicEl();

            el.off('mouseover', el.__focusNodeAdjacency);
            el.off('mouseout', el.__unfocusNodeAdjacency);

            if (edge.getModel().get('focusNodeAdjacency')) {
                el.on('mouseover', el.__focusNodeAdjacency = function () {
                    api.dispatchAction({
                        type: 'focusNodeAdjacency',
                        seriesId: seriesModel.id,
                        edgeDataIndex: edge.dataIndex
                    });
                });
                el.on('mouseout', el.__unfocusNodeAdjacency = function () {
                    api.dispatchAction({
                        type: 'unfocusNodeAdjacency',
                        seriesId: seriesModel.id
                    });
                });
            }
        });

        var circularRotateLabel = seriesModel.get('layout') === 'circular'
            && seriesModel.get('circular.rotateLabel');
        var cx = data.getLayout('cx');
        var cy = data.getLayout('cy');
        data.eachItemGraphicEl(function (el, idx) {
            var symbolPath = el.getSymbolPath();
            if (circularRotateLabel) {
                var pos = data.getItemLayout(idx);
                var rad = Math.atan2(pos[1] - cy, pos[0] - cx);
                if (rad < 0) {
                    rad = Math.PI * 2 + rad;
                }
                var isLeft = pos[0] < cx;
                if (isLeft) {
                    rad = rad - Math.PI;
                }
                var textPosition = isLeft ? 'left' : 'right';
                symbolPath.setStyle({
                    textRotation: -rad,
                    textPosition: textPosition,
                    textOrigin: 'center'
                });
                symbolPath.hoverStyle && (symbolPath.hoverStyle.textPosition = textPosition);
            }
            else {
                symbolPath.setStyle({
                    textRotation: 0
                });
            }
        });

        this._firstRender = false;
    },

    dispose: function () {
        this._controller && this._controller.dispose();
        this._controllerHost = {};
    },

    focusNodeAdjacency: function (seriesModel, ecModel, api, payload) {
        var data = this._model.getData();
        var graph = data.graph;
        var dataIndex = payload.dataIndex;
        var edgeDataIndex = payload.edgeDataIndex;

        var node = graph.getNodeByIndex(dataIndex);
        var edge = graph.getEdgeByIndex(edgeDataIndex);

        if (!node && !edge) {
            return;
        }

        graph.eachNode(function (node) {
            fadeOutItem(node, nodeOpacityPath, 0.1);
        });
        graph.eachEdge(function (edge) {
            fadeOutItem(edge, lineOpacityPath, 0.1);
        });

        if (node) {
            fadeInItem(node, nodeOpacityPath);
            zrUtil.each(node.edges, function (adjacentEdge) {
                if (adjacentEdge.dataIndex < 0) {
                    return;
                }
                fadeInItem(adjacentEdge, lineOpacityPath);
                fadeInItem(adjacentEdge.node1, nodeOpacityPath);
                fadeInItem(adjacentEdge.node2, nodeOpacityPath);
            });
        }
        if (edge) {
            fadeInItem(edge, lineOpacityPath);
            fadeInItem(edge.node1, nodeOpacityPath);
            fadeInItem(edge.node2, nodeOpacityPath);
        }
    },

    unfocusNodeAdjacency: function (seriesModel, ecModel, api, payload) {
        var graph = this._model.getData().graph;

        graph.eachNode(function (node) {
            fadeOutItem(node, nodeOpacityPath);
        });
        graph.eachEdge(function (edge) {
            fadeOutItem(edge, lineOpacityPath);
        });
    },

    _startForceLayoutIteration: function (forceLayout, layoutAnimation) {
        var self = this;
        (function step() {
            forceLayout.step(function (stopped) {
                self.updateLayout(self._model);
                (self._layouting = !stopped) && (
                    layoutAnimation
                        ? (self._layoutTimeout = setTimeout(step, 16))
                        : step()
                );
            });
        })();
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

        if (seriesModel.coordinateSystem.type !== 'view') {
            controller.disable();
            return;
        }
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
                    type: 'graphRoam',
                    dx: e.dx,
                    dy: e.dy
                });
            })
            .on('zoom', function (e) {
                roamHelper.updateViewOnZoom(controllerHost, e.scale, e.originX, e.originY);
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'graphRoam',
                    zoom: e.scale,
                    originX: e.originX,
                    originY: e.originY
                });
                this._updateNodeAndLinkScale();
                adjustEdge(seriesModel.getGraph(), this._getNodeGlobalScale(seriesModel));
                this._lineDraw.updateLayout();
            }, this);
    },

    _updateNodeAndLinkScale: function () {
        var seriesModel = this._model;
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

    updateLayout: function (seriesModel) {
        adjustEdge(seriesModel.getGraph(), this._getNodeGlobalScale(seriesModel));

        this._symbolDraw.updateLayout();
        this._lineDraw.updateLayout();
    },

    remove: function (ecModel, api) {
        this._symbolDraw && this._symbolDraw.remove();
        this._lineDraw && this._lineDraw.remove();
    }
});
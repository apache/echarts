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
import SymbolDraw from '../helper/SymbolDraw';
import LineDraw from '../helper/LineDraw';
import RoamController, { RoamControllerHost } from '../../component/helper/RoamController';
import * as roamHelper from '../../component/helper/roamHelper';
import {onIrrelevantElement} from '../../component/helper/cursorHelper';
import * as graphic from '../../util/graphic';
import adjustEdge from './adjustEdge';
import {getNodeGlobalScale} from './graphHelper';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import GraphSeriesModel, { GraphNodeItemOption, GraphEdgeItemOption } from './GraphSeries';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import View from '../../coord/View';
import { GraphNode, GraphEdge } from '../../data/Graph';
import Displayable from 'zrender/src/graphic/Displayable';
import Symbol from '../helper/Symbol';
import Model from '../../model/Model';
import { Payload } from '../../util/types';
import { LineLabel } from '../helper/Line';

const FOCUS_ADJACENCY = '__focusNodeAdjacency';
const UNFOCUS_ADJACENCY = '__unfocusNodeAdjacency';

const nodeOpacityPath = ['itemStyle', 'opacity'] as const;
const lineOpacityPath = ['lineStyle', 'opacity'] as const;

interface FocusNodePayload extends Payload {
    dataIndex: number
    edgeDataIndex: number
}

function isViewCoordSys(coordSys: CoordinateSystem): coordSys is View {
    return coordSys.type === 'view';
}

function getItemOpacity(
    item: GraphNode | GraphEdge,
    opacityPath: typeof nodeOpacityPath | typeof lineOpacityPath
): number {
    var opacity = item.getVisual('opacity');
    return opacity != null
        ? opacity : item.getModel<any>().get(opacityPath);
}

function fadeOutItem(
    item: GraphNode | GraphEdge,
    opacityPath: typeof nodeOpacityPath | typeof lineOpacityPath,
    opacityRatio?: number
) {
    var el = item.getGraphicEl() as Symbol;   // TODO Symbol?
    var opacity = getItemOpacity(item, opacityPath);

    if (opacityRatio != null) {
        opacity == null && (opacity = 1);
        opacity *= opacityRatio;
    }

    el.downplay && el.downplay();
    el.traverse(function (child: LineLabel) {
        if (!child.isGroup) {
            var opct = child.lineLabelOriginalOpacity;
            if (opct == null || opacityRatio != null) {
                opct = opacity;
            }
            child.setStyle('opacity', opct);
        }
    });
}

function fadeInItem(
    item: GraphNode | GraphEdge,
    opacityPath: typeof nodeOpacityPath | typeof lineOpacityPath
) {
    var opacity = getItemOpacity(item, opacityPath);
    var el = item.getGraphicEl() as Symbol;
    // Should go back to normal opacity first, consider hoverLayer,
    // where current state is copied to elMirror, and support
    // emphasis opacity here.
    el.traverse(function (child: Displayable) {
        !child.isGroup && child.setStyle('opacity', opacity);
    });
    el.highlight && el.highlight();
}

class GraphView extends ChartView {

    static readonly type = 'graph'
    readonly type = GraphView.type

    private _symbolDraw: SymbolDraw
    private _lineDraw: LineDraw

    private _controller: RoamController
    private _controllerHost: RoamControllerHost

    private _firstRender: boolean

    private _model: GraphSeriesModel

    private _layoutTimeout: number
    private _unfocusDelayTimer: number

    private _layouting: boolean

    init(ecModel: GlobalModel, api: ExtensionAPI) {
        var symbolDraw = new SymbolDraw();
        var lineDraw = new LineDraw();
        var group = this.group;

        this._controller = new RoamController(api.getZr());
        this._controllerHost = {
            target: group
        } as RoamControllerHost;

        group.add(symbolDraw.group);
        group.add(lineDraw.group);

        this._symbolDraw = symbolDraw;
        this._lineDraw = lineDraw;

        this._firstRender = true;
    }

    render(seriesModel: GraphSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        var graphView = this;
        var coordSys = seriesModel.coordinateSystem;

        this._model = seriesModel;

        var symbolDraw = this._symbolDraw;
        var lineDraw = this._lineDraw;

        var group = this.group;

        if (isViewCoordSys(coordSys)) {
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
        adjustEdge(seriesModel.getGraph(), getNodeGlobalScale(seriesModel));

        var data = seriesModel.getData();
        symbolDraw.updateData(data);

        var edgeData = seriesModel.getEdgeData();
        lineDraw.updateData(edgeData);

        this._updateNodeAndLinkScale();

        this._updateController(seriesModel, ecModel, api);

        clearTimeout(this._layoutTimeout);
        var forceLayout = seriesModel.forceLayout;
        var layoutAnimation = seriesModel.get(['force', 'layoutAnimation']);
        if (forceLayout) {
            this._startForceLayoutIteration(forceLayout, layoutAnimation);
        }

        data.eachItemGraphicEl((el: Symbol, idx) => {
            var itemModel = data.getItemModel(idx) as Model<GraphNodeItemOption>;
            // Update draggable
            el.off('drag').off('dragend');
            var draggable = itemModel.get('draggable');
            if (draggable) {
                el.on('drag', () => {
                    if (forceLayout) {
                        forceLayout.warmUp();
                        !this._layouting
                            && this._startForceLayoutIteration(forceLayout, layoutAnimation);
                        forceLayout.setFixed(idx);
                        // Write position back to layout
                        data.setItemLayout(idx, el.position);
                    }
                }).on('dragend', () => {
                    if (forceLayout) {
                        forceLayout.setUnfixed(idx);
                    }
                });
            }
            el.setDraggable(draggable && !!forceLayout);

            (el as any)[FOCUS_ADJACENCY] && el.off('mouseover', (el as any)[FOCUS_ADJACENCY]);
            (el as any)[UNFOCUS_ADJACENCY] && el.off('mouseout', (el as any)[UNFOCUS_ADJACENCY]);

            if (itemModel.get('focusNodeAdjacency')) {
                el.on('mouseover', (el as any)[FOCUS_ADJACENCY] = function () {
                    graphView._clearTimer();
                    api.dispatchAction({
                        type: 'focusNodeAdjacency',
                        seriesId: seriesModel.id,
                        dataIndex: graphic.getECData(el).dataIndex
                    });
                });
                el.on('mouseout', (el as any)[UNFOCUS_ADJACENCY] = function () {
                    graphView._dispatchUnfocus(api);
                });
            }

        });

        data.graph.eachEdge(function (edge) {
            var el = edge.getGraphicEl();

            (el as any)[FOCUS_ADJACENCY] && el.off('mouseover', (el as any)[FOCUS_ADJACENCY]);
            (el as any)[UNFOCUS_ADJACENCY] && el.off('mouseout', (el as any)[UNFOCUS_ADJACENCY]);

            if (edge.getModel<GraphEdgeItemOption>().get('focusNodeAdjacency')) {
                el.on('mouseover', (el as any)[FOCUS_ADJACENCY] = function () {
                    graphView._clearTimer();
                    api.dispatchAction({
                        type: 'focusNodeAdjacency',
                        seriesId: seriesModel.id,
                        edgeDataIndex: edge.dataIndex
                    });
                });
                el.on('mouseout', (el as any)[UNFOCUS_ADJACENCY] = function () {
                    graphView._dispatchUnfocus(api);
                });
            }
        });

        var circularRotateLabel = seriesModel.get('layout') === 'circular'
            && seriesModel.get(['circular', 'rotateLabel']);
        var cx = data.getLayout('cx');
        var cy = data.getLayout('cy');
        data.eachItemGraphicEl(function (el: Symbol, idx) {
            var itemModel = data.getItemModel<GraphNodeItemOption>(idx);
            var labelRotate = itemModel.get(['label', 'rotate']) || 0;
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
                graphic.modifyLabelStyle(
                    symbolPath,
                    {
                        textRotation: -rad,
                        textPosition: textPosition,
                        textOrigin: 'center'
                    },
                    {
                        textPosition: textPosition
                    }
                );
            }
            else {
                graphic.modifyLabelStyle(
                    symbolPath,
                    {
                        textRotation: labelRotate *= Math.PI / 180
                    }
                );
            }
        });

        this._firstRender = false;
    }

    dispose() {
        this._controller && this._controller.dispose();
        this._controllerHost = null;
        this._clearTimer();
    }

    _dispatchUnfocus(api: ExtensionAPI) {
        var self = this;
        this._clearTimer();
        this._unfocusDelayTimer = setTimeout(function () {
            self._unfocusDelayTimer = null;
            api.dispatchAction({
                type: 'unfocusNodeAdjacency',
                seriesId: self._model.id
            });
        }, 500) as any;

    }

    _clearTimer() {
        if (this._unfocusDelayTimer) {
            clearTimeout(this._unfocusDelayTimer);
            this._unfocusDelayTimer = null;
        }
    }

    focusNodeAdjacency(
        seriesModel: GraphSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: FocusNodePayload
    ) {
        var data = seriesModel.getData();
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
    }

    unfocusNodeAdjacency(
        seriesModel: GraphSeriesModel
    ) {
        var graph = seriesModel.getData().graph;

        graph.eachNode(function (node) {
            fadeOutItem(node, nodeOpacityPath);
        });
        graph.eachEdge(function (edge) {
            fadeOutItem(edge, lineOpacityPath);
        });
    }

    _startForceLayoutIteration(
        forceLayout: GraphSeriesModel['forceLayout'],
        layoutAnimation?: boolean
    ) {
        var self = this;
        (function step() {
            forceLayout.step(function (stopped) {
                self.updateLayout(self._model);
                (self._layouting = !stopped) && (
                    layoutAnimation
                        ? (self._layoutTimeout = setTimeout(step, 16) as any)
                        : step()
                );
            });
        })();
    }

    _updateController(
        seriesModel: GraphSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        var controller = this._controller;
        var controllerHost = this._controllerHost;
        var group = this.group;

        controller.setPointerChecker(function (e, x, y) {
            var rect = group.getBoundingRect();
            rect.applyTransform(group.transform);
            return rect.contain(x, y)
                && !onIrrelevantElement(e, api, seriesModel);
        });

        if (!isViewCoordSys(seriesModel.coordinateSystem)) {
            controller.disable();
            return;
        }
        controller.enable(seriesModel.get('roam'));
        controllerHost.zoomLimit = seriesModel.get('scaleLimit');
        controllerHost.zoom = seriesModel.coordinateSystem.getZoom();

        controller
            .off('pan')
            .off('zoom')
            .on('pan', (e) => {
                roamHelper.updateViewOnPan(controllerHost, e.dx, e.dy);
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'graphRoam',
                    dx: e.dx,
                    dy: e.dy
                });
            })
            .on('zoom', (e) => {
                roamHelper.updateViewOnZoom(controllerHost, e.scale, e.originX, e.originY);
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'graphRoam',
                    zoom: e.scale,
                    originX: e.originX,
                    originY: e.originY
                });
                this._updateNodeAndLinkScale();
                adjustEdge(seriesModel.getGraph(), getNodeGlobalScale(seriesModel));
                this._lineDraw.updateLayout();
            });
    }

    _updateNodeAndLinkScale() {
        var seriesModel = this._model;
        var data = seriesModel.getData();

        var nodeScale = getNodeGlobalScale(seriesModel);
        var invScale = [nodeScale, nodeScale];

        data.eachItemGraphicEl(function (el, idx) {
            el.attr('scale', invScale);
        });
    }

    updateLayout(seriesModel: GraphSeriesModel) {
        adjustEdge(seriesModel.getGraph(), getNodeGlobalScale(seriesModel));

        this._symbolDraw.updateLayout();
        this._lineDraw.updateLayout();
    }

    remove(ecModel: GlobalModel, api: ExtensionAPI) {
        this._symbolDraw && this._symbolDraw.remove();
        this._lineDraw && this._lineDraw.remove();
    }
}

ChartView.registerClass(GraphView);

export default GraphView;
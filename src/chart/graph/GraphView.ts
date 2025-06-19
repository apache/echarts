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

import SymbolDraw, { ListForSymbolDraw } from '../helper/SymbolDraw';
import LineDraw from '../helper/LineDraw';
import RoamController from '../../component/helper/RoamController';
import {
    updateViewOnZoom,
    updateViewOnPan,
    RoamControllerHost,
    RoamPayload
} from '../../component/helper/roamHelper';
import * as graphic from '../../util/graphic';
import adjustEdge from './adjustEdge';
import {getNodeGlobalScale} from './graphHelper';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import GraphSeriesModel, { GraphNodeItemOption, GraphEdgeItemOption } from './GraphSeries';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import View from '../../coord/View';
import Symbol from '../helper/Symbol';
import SeriesData from '../../data/SeriesData';
import Line from '../helper/Line';
import { getECData } from '../../util/innerStore';

import { simpleLayoutEdge } from './simpleLayoutHelper';
import { circularLayout, rotateNodeLabel } from './circularLayoutHelper';
import { clone, extend } from 'zrender/src/core/util';
import ECLinePath from '../helper/LinePath';
import { NullUndefined } from '../../util/types';
import { getThumbnailBridge, ThumbnailBridge } from '../../component/helper/thumbnailBridge';

function isViewCoordSys(coordSys: CoordinateSystem): coordSys is View {
    return coordSys.type === 'view';
}

class GraphView extends ChartView {

    static readonly type = 'graph';
    readonly type = GraphView.type;

    private _symbolDraw: SymbolDraw;
    private _lineDraw: LineDraw;

    private _controller: RoamController;
    private _controllerHost: RoamControllerHost;

    private _firstRender: boolean;

    private _model: GraphSeriesModel;

    private _api: ExtensionAPI;

    private _layoutTimeout: number;

    private _layouting: boolean;

    private _mainGroup: graphic.Group;

    private _active: boolean;

    init(ecModel: GlobalModel, api: ExtensionAPI) {
        const symbolDraw = new SymbolDraw();
        const lineDraw = new LineDraw();
        const group = this.group;
        const mainGroup = new graphic.Group();
        this._controller = new RoamController(api.getZr());
        this._controllerHost = {
            target: mainGroup
        } as RoamControllerHost;

        mainGroup.add(symbolDraw.group);
        mainGroup.add(lineDraw.group);
        group.add(mainGroup);

        this._symbolDraw = symbolDraw;
        this._lineDraw = lineDraw;

        this._mainGroup = mainGroup;

        this._firstRender = true;
    }

    render(seriesModel: GraphSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const coordSys = seriesModel.coordinateSystem;
        let isForceLayout = false;

        this._model = seriesModel;
        this._api = api;
        this._active = true;

        const thumbnailInfo = this._getThumbnailInfo();
        if (thumbnailInfo) {
            thumbnailInfo.bridge.reset(api);
        }

        const symbolDraw = this._symbolDraw;
        const lineDraw = this._lineDraw;
        if (isViewCoordSys(coordSys)) {
            const groupNewProp = {
                x: coordSys.x, y: coordSys.y,
                scaleX: coordSys.scaleX, scaleY: coordSys.scaleY
            };
            if (this._firstRender) {
                this._mainGroup.attr(groupNewProp);
            }
            else {
                graphic.updateProps(this._mainGroup, groupNewProp, seriesModel);
            }
        }
        // Fix edge contact point with node
        adjustEdge(seriesModel.getGraph(), getNodeGlobalScale(seriesModel));

        const data = seriesModel.getData();
        symbolDraw.updateData(data as ListForSymbolDraw);

        const edgeData = seriesModel.getEdgeData();
        // TODO: TYPE
        lineDraw.updateData(edgeData as SeriesData);

        this._updateNodeAndLinkScale();

        this._updateController(null, seriesModel, api);

        clearTimeout(this._layoutTimeout);
        const forceLayout = seriesModel.forceLayout;
        const layoutAnimation = seriesModel.get(['force', 'layoutAnimation']);
        if (forceLayout) {
            isForceLayout = true;
            this._startForceLayoutIteration(forceLayout, api, layoutAnimation);
        }

        const layout = seriesModel.get('layout');

        data.graph.eachNode((node) => {
            const idx = node.dataIndex;
            const el = node.getGraphicEl() as Symbol;
            const itemModel = node.getModel<GraphNodeItemOption>();

            if (!el) {
                return;
            }

            // Update draggable
            el.off('drag').off('dragend');
            const draggable = itemModel.get('draggable');
            if (draggable) {
                el.on('drag', (e) => {
                    switch (layout) {
                        case 'force':
                            forceLayout.warmUp();
                            !this._layouting
                                && this._startForceLayoutIteration(forceLayout, api, layoutAnimation);
                            forceLayout.setFixed(idx);
                            // Write position back to layout
                            data.setItemLayout(idx, [el.x, el.y]);
                            break;
                        case 'circular':
                            data.setItemLayout(idx, [el.x, el.y]);
                            // mark node fixed
                            node.setLayout({ fixed: true }, true);
                            // recalculate circular layout
                            circularLayout(seriesModel, 'symbolSize', node, [e.offsetX, e.offsetY]);
                            this.updateLayout(seriesModel);
                            break;
                        case 'none':
                        default:
                            data.setItemLayout(idx, [el.x, el.y]);
                            // update edge
                            simpleLayoutEdge(seriesModel.getGraph(), seriesModel);
                            this.updateLayout(seriesModel);
                            break;
                    }
                }).on('dragend', () => {
                    if (forceLayout) {
                        forceLayout.setUnfixed(idx);
                    }
                });
            }
            el.setDraggable(draggable, !!itemModel.get('cursor'));

            const focus = itemModel.get(['emphasis', 'focus']);

            if (focus === 'adjacency') {
                getECData(el).focus = node.getAdjacentDataIndices();
            }
        });

        data.graph.eachEdge(function (edge) {
            const el = edge.getGraphicEl() as Line;
            const focus = edge.getModel<GraphEdgeItemOption>().get(['emphasis', 'focus']);

            if (!el) {
                return;
            }

            if (focus === 'adjacency') {
                getECData(el).focus = {
                    edge: [edge.dataIndex],
                    node: [edge.node1.dataIndex, edge.node2.dataIndex]
                };
            }
        });

        const circularRotateLabel = seriesModel.get('layout') === 'circular'
            && seriesModel.get(['circular', 'rotateLabel']);
        const cx = data.getLayout('cx');
        const cy = data.getLayout('cy');
        data.graph.eachNode((node) => {
            rotateNodeLabel(node, circularRotateLabel, cx, cy);
        });

        this._firstRender = false;
        // Force layout will render thumbnail when layout is finished.
        if (!isForceLayout) {
            this._renderThumbnail(seriesModel, api, this._symbolDraw, this._lineDraw);
        }
    }

    dispose() {
        this.remove();

        this._controller && this._controller.dispose();
        this._controllerHost = null;
    }

    private _startForceLayoutIteration(
        forceLayout: GraphSeriesModel['forceLayout'],
        api: ExtensionAPI,
        layoutAnimation?: boolean
    ) {
        const self = this;
        let firstRendered = false;
        (function step() {
            forceLayout.step(function (stopped) {
                self.updateLayout(self._model);
                if (stopped || !firstRendered) {
                    firstRendered = true;
                    self._renderThumbnail(self._model, api, self._symbolDraw, self._lineDraw);
                }
                (self._layouting = !stopped) && (
                    layoutAnimation
                        ? (self._layoutTimeout = setTimeout(step, 16) as any)
                        : step()
                );
            });
        })();
    }

    private _updateController(
        clipRect: graphic.BoundingRect | NullUndefined,
        seriesModel: GraphSeriesModel,
        api: ExtensionAPI
    ) {
        const controller = this._controller;
        const controllerHost = this._controllerHost;
        const coordSys = seriesModel.coordinateSystem;

        if (!isViewCoordSys(coordSys)) {
            controller.disable();
            return;
        }
        controller.enable(seriesModel.get('roam'), {
            api,
            zInfo: {component: seriesModel},
            triggerInfo: {
                roamTrigger: seriesModel.get('roamTrigger'),
                isInSelf: (e, x, y) => coordSys.containPoint([x, y]),
                isInClip: (e, x, y) => !clipRect || clipRect.contain(x, y),
            },
        });
        controllerHost.zoomLimit = seriesModel.get('scaleLimit');
        controllerHost.zoom = coordSys.getZoom();

        controller
            .off('pan')
            .off('zoom')
            .on('pan', (e) => {
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'graphRoam',
                    dx: e.dx,
                    dy: e.dy
                });
            })
            .on('zoom', (e) => {
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'graphRoam',
                    zoom: e.scale,
                    originX: e.originX,
                    originY: e.originY
                });
            });
    }

    /**
     * A performance shortcut - called by action handler to update the view directly
     * without any data/visual processing (which are assumed to be unchanged), while
     * ensuring consistent behavior between internal and external action triggers.
     */
    updateViewOnPan(
        seriesModel: GraphSeriesModel,
        api: ExtensionAPI,
        params: Pick<RoamPayload, 'dx' | 'dy'>
    ): void {
        if (!this._active) {
            return;
        }
        updateViewOnPan(this._controllerHost, params.dx, params.dy);
        this._updateThumbnailWindow();
    }

    /**
     * A performance shortcut - called by action handler to update the view directly
     * without any data/visual processing (which are assumed to be unchanged), while
     * ensuring consistent behavior between internal and external action triggers.
     */
    updateViewOnZoom(
        seriesModel: GraphSeriesModel,
        api: ExtensionAPI,
        params: Pick<RoamPayload, 'zoom' | 'originX' | 'originY'>
    ) {
        if (!this._active) {
            return;
        }
        updateViewOnZoom(this._controllerHost, params.zoom, params.originX, params.originY);
        this._updateNodeAndLinkScale();
        adjustEdge(seriesModel.getGraph(), getNodeGlobalScale(seriesModel));
        this._lineDraw.updateLayout();
        // Only update label layout on zoom
        api.updateLabelLayout();
        this._updateThumbnailWindow();
    }

    private _updateNodeAndLinkScale() {
        const seriesModel = this._model;
        const data = seriesModel.getData();

        const nodeScale = getNodeGlobalScale(seriesModel);

        data.eachItemGraphicEl(function (el: Symbol, idx) {
            el && el.setSymbolScale(nodeScale);
        });
    }

    updateLayout(seriesModel: GraphSeriesModel) {
        if (!this._active) {
            return;
        }

        adjustEdge(seriesModel.getGraph(), getNodeGlobalScale(seriesModel));

        this._symbolDraw.updateLayout();
        this._lineDraw.updateLayout();
    }

    remove() {
        this._active = false;
        clearTimeout(this._layoutTimeout);
        this._layouting = false;
        this._layoutTimeout = null;

        this._symbolDraw && this._symbolDraw.remove();
        this._lineDraw && this._lineDraw.remove();
        this._controller && this._controller.disable();
    }

    /**
     * Get thumbnail data structure only if supported.
     */
    private _getThumbnailInfo(): {
        bridge: ThumbnailBridge
        coordSys: View
    } | NullUndefined {
        const model = this._model;
        const coordSys = model.coordinateSystem;
        if (coordSys.type !== 'view') {
            return;
        }
        const bridge = getThumbnailBridge(model);
        if (!bridge) {
            return;
        }
        return {
            bridge,
            coordSys: coordSys as View,
        };
    }

    private _updateThumbnailWindow() {
        const info = this._getThumbnailInfo();
        if (info) {
            info.bridge.updateWindow(info.coordSys.transform, this._api);
        }
    }

    private _renderThumbnail(
        seriesModel: GraphSeriesModel,
        api: ExtensionAPI,
        symbolDraw: SymbolDraw,
        lineDraw: LineDraw
    ) {
        const info = this._getThumbnailInfo();
        if (!info) {
            return;
        }

        const bridgeGroup = new graphic.Group();
        const symbolNodes = symbolDraw.group.children();
        const lineNodes = lineDraw.group.children();

        const lineGroup = new graphic.Group();
        const symbolGroup = new graphic.Group();
        bridgeGroup.add(symbolGroup);
        bridgeGroup.add(lineGroup);

        // TODO: reuse elemenents for performance in large graph?
        for (let i = 0; i < symbolNodes.length; i++) {
            const node = symbolNodes[i];
            const sub = (node as graphic.Group).children()[0];
            const x = (node as Symbol).x;
            const y = (node as Symbol).y;
            const subShape = clone((sub as graphic.Path).shape);
            const shape = extend(subShape, {
                width: sub.scaleX,
                height: sub.scaleY,
                x: x - sub.scaleX / 2,
                y: y - sub.scaleY / 2
            });
            const style = clone((sub as graphic.Path).style);
            const subThumbnail = new (sub as any).constructor({
                shape,
                style,
                z2: 151
            });
            symbolGroup.add(subThumbnail);
        }

        for (let i = 0; i < lineNodes.length; i++) {
            const node = lineNodes[i];
            const line = (node as graphic.Group).children()[0];
            const style = clone((line as ECLinePath).style);
            const shape = clone((line as ECLinePath).shape);
            const lineThumbnail = new ECLinePath({
                style,
                shape,
                z2: 151
            });
            lineGroup.add(lineThumbnail);
        }

        info.bridge.renderContent({
            api,
            roamType: seriesModel.get('roam'),
            viewportRect: null,
            group: bridgeGroup,
            targetTrans: info.coordSys.transform,
        });
    }
}

export default GraphView;


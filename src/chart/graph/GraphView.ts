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
    RoamControllerHost
} from '../../component/helper/roamHelper';
import {onIrrelevantElement} from '../../component/helper/cursorHelper';
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
import Thumbnail from './Thumbnail';

import { simpleLayoutEdge } from './simpleLayoutHelper';
import { circularLayout, rotateNodeLabel } from './circularLayoutHelper';
import { clone, extend } from 'zrender/src/core/util';
import ECLinePath from '../helper/LinePath';

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

    private _layoutTimeout: number;

    private _layouting: boolean;

    private _thumbnail: Thumbnail = new Thumbnail();

    private _mainGroup: graphic.Group;

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

        this._updateController(seriesModel, ecModel, api);

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
        isForceLayout || this._renderThumbnail(seriesModel, api, this._symbolDraw, this._lineDraw);
    }

    dispose() {
        this.remove();

        this._controller && this._controller.dispose();
        this._controllerHost = null;
        this._thumbnail.dispose();
    }

    private _startForceLayoutIteration(
        forceLayout: GraphSeriesModel['forceLayout'],
        api: ExtensionAPI,
        layoutAnimation?: boolean
    ) {
        const self = this;
        (function step() {
            forceLayout.step(function (stopped) {
                if (stopped) {
                    self._renderThumbnail(self._model, api, self._symbolDraw, self._lineDraw);
                }
                self.updateLayout(self._model);
                (self._layouting = !stopped) && (
                    layoutAnimation
                        ? (self._layoutTimeout = setTimeout(step, 16) as any)
                        : step()
                );
            });
        })();
    }

    private _updateController(
        seriesModel: GraphSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        const controller = this._controller;
        const controllerHost = this._controllerHost;
        const group = this.group;

        controller.setPointerChecker((e, x, y) => {
            const rect = group.getBoundingRect();
            rect.applyTransform(group.transform);
            return rect.contain(x, y)
                && !this._thumbnail.contain(x, y)
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
                this._updateViewOnPan(seriesModel, api, e.dx, e.dy);
            })
            .on('zoom', (e) => {
                this._updateViewOnZoom(seriesModel, api, e.scale, e.originX, e.originY);
            });
    }

    private _updateViewOnPan(
        seriesModel: GraphSeriesModel,
        api: ExtensionAPI,
        dx: number,
        dy: number
    ): void {
        updateViewOnPan(this._controllerHost, dx, dy);
        api.dispatchAction({
            seriesId: seriesModel.id,
            type: 'graphRoam',
            dx: dx,
            dy: dy
        });
        this._thumbnail.updateWindow();
    }

    private _updateViewOnZoom(
        seriesModel: GraphSeriesModel,
        api: ExtensionAPI,
        scale: number,
        originX: number,
        originY: number
    ) {
        updateViewOnZoom(this._controllerHost, scale, originX, originY);
        api.dispatchAction({
            seriesId: seriesModel.id,
            type: 'graphRoam',
            zoom: scale,
            originX: originX,
            originY: originY
        });
        this._updateNodeAndLinkScale();
        adjustEdge(seriesModel.getGraph(), getNodeGlobalScale(seriesModel));
        this._lineDraw.updateLayout();
        // Only update label layout on zoom
        api.updateLabelLayout();
        this._thumbnail.updateWindow();
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
        adjustEdge(seriesModel.getGraph(), getNodeGlobalScale(seriesModel));

        this._symbolDraw.updateLayout();
        this._lineDraw.updateLayout();
    }

    remove() {
        clearTimeout(this._layoutTimeout);
        this._layouting = false;
        this._layoutTimeout = null;

        this._symbolDraw && this._symbolDraw.remove();
        this._lineDraw && this._lineDraw.remove();
        this._controller && this._controller.disable();
        this._thumbnail.remove();
    }

    // TODO: register thumbnail (consider code size).
    private _renderThumbnail(
        seriesModel: GraphSeriesModel,
        api: ExtensionAPI,
        symbolDraw: SymbolDraw,
        lineDraw: LineDraw
    ) {
        const thumbnail = this._thumbnail;
        this.group.add(thumbnail.group);

        const renderThumbnailContent = (viewGroup: graphic.Group) => {
            const symbolNodes = symbolDraw.group.children();
            const lineNodes = lineDraw.group.children();

            const lineGroup = new graphic.Group();
            const symbolGroup = new graphic.Group();
            viewGroup.add(symbolGroup);
            viewGroup.add(lineGroup);

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
        };

        thumbnail.render({
            seriesModel,
            api,
            roamType: seriesModel.get('roam'),
            z2Setting: {
                background: 150,
                window: 160
            },
            seriesBoundingRect: this._mainGroup.getBoundingRect(),
            renderThumbnailContent
        });

        thumbnail
            .off('pan')
            .off('zoom')
            .on('pan', (event) => {
                this._updateViewOnPan(seriesModel, api, event.dx, event.dy);
            })
            .on('zoom', (event) => {
                this._updateViewOnZoom(seriesModel, api, event.scale, event.originX, event.originY);
            });
    }
}

export default GraphView;


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

import * as graphic from '../../util/graphic';
import * as zrUtil from 'zrender/src/core/util';
import { LayoutOrient, Payload } from '../../util/types';
import { PathProps } from 'zrender/src/graphic/Path';
import SankeySeriesModel, { SankeyEdgeItemOption, SankeyNodeItemOption } from './SankeySeries';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { GraphNode, GraphEdge } from '../../data/Graph';
import { GraphNodeItemOption, GraphEdgeItemOption } from '../graph/GraphSeries';
import List from '../../data/List';
import { RectLike } from 'zrender/src/core/BoundingRect';

const nodeOpacityPath = ['itemStyle', 'opacity'] as const;
const hoverNodeOpacityPath = ['emphasis', 'itemStyle', 'opacity'] as const;
const lineOpacityPath = ['lineStyle', 'opacity'] as const;
const hoverLineOpacityPath = ['emphasis', 'lineStyle', 'opacity'] as const;

interface FocusNodeAdjacencyPayload extends Payload {
    dataIndex?: number
    edgeDataIndex?: number
}

interface SankeyEl extends graphic.Path {
    downplay(): void
    highlight(): void

    focusNodeAdjHandler(): void
    unfocusNodeAdjHandler(): void
}

function getItemOpacity(
    item: GraphNode | GraphEdge,
    opacityPath: readonly string[]
): number {
    return item.getVisual('opacity')
        // TODO: TYPE
        || item.getModel<GraphNodeItemOption>().get(opacityPath as typeof nodeOpacityPath);
}

function fadeOutItem(
    item: GraphNode | GraphEdge,
    opacityPath: readonly string[],
    opacityRatio?: number
) {
    const el = item.getGraphicEl() as SankeyEl;
    let opacity = getItemOpacity(item, opacityPath);

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

function fadeInItem(
    item: GraphNode | GraphEdge,
    opacityPath: readonly string[]
) {
    const opacity = getItemOpacity(item, opacityPath);
    const el = item.getGraphicEl() as SankeyEl;

    // Support emphasis here.
    el.highlight && el.highlight();

    el.traverse(function (child) {
        if (child.type !== 'group') {
            child.setStyle('opacity', opacity);
        }
    });
}

class SankeyPathShape {
    x1 = 0;
    y1 = 0;

    x2 = 0;
    y2 = 0;

    cpx1 = 0;
    cpy1 = 0;

    cpx2 = 0;
    cpy2 = 0;

    extent = 0;
    orient: LayoutOrient;
}

interface SankeyPathProps extends PathProps {
    shape?: Partial<SankeyPathShape>
}

class SankeyPath extends graphic.Path<SankeyPathProps> {
    shape: SankeyPathShape;

    constructor(opts?: SankeyPathProps) {
        super(opts);
    }

    getDefaultShape() {
        return new SankeyPathShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: SankeyPathShape) {
        const extent = shape.extent;
        ctx.moveTo(shape.x1, shape.y1);
        ctx.bezierCurveTo(
            shape.cpx1, shape.cpy1,
            shape.cpx2, shape.cpy2,
            shape.x2, shape.y2
        );
        if (shape.orient === 'vertical') {
            ctx.lineTo(shape.x2 + extent, shape.y2);
            ctx.bezierCurveTo(
                shape.cpx2 + extent, shape.cpy2,
                shape.cpx1 + extent, shape.cpy1,
                shape.x1 + extent, shape.y1
            );
        }
        else {
            ctx.lineTo(shape.x2, shape.y2 + extent);
            ctx.bezierCurveTo(
                shape.cpx2, shape.cpy2 + extent,
                shape.cpx1, shape.cpy1 + extent,
                shape.x1, shape.y1 + extent
            );
        }
        ctx.closePath();
    }

    highlight() {
        this.trigger('emphasis');
    }

    downplay() {
        this.trigger('normal');
    }
}

class SankeyView extends ChartView {

    static readonly type = 'sankey';
    readonly type = SankeyView.type;

    private _model: SankeySeriesModel;

    private _focusAdjacencyDisabled = false;

    private _data: List;

    private _unfocusDelayTimer: number;

    render(seriesModel: SankeySeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const sankeyView = this;
        const graph = seriesModel.getGraph();
        const group = this.group;
        const layoutInfo = seriesModel.layoutInfo;
        // view width
        const width = layoutInfo.width;
        // view height
        const height = layoutInfo.height;
        const nodeData = seriesModel.getData();
        const edgeData = seriesModel.getData('edge');
        const orient = seriesModel.get('orient');

        this._model = seriesModel;

        group.removeAll();

        group.attr('position', [layoutInfo.x, layoutInfo.y]);

        // generate a bezire Curve for each edge
        graph.eachEdge(function (edge) {
            const curve = new SankeyPath();
            const ecData = graphic.getECData(curve);
            ecData.dataIndex = edge.dataIndex;
            ecData.seriesIndex = seriesModel.seriesIndex;
            ecData.dataType = 'edge';
            const edgeModel = edge.getModel<SankeyEdgeItemOption>();
            const lineStyleModel = edgeModel.getModel('lineStyle');
            const curvature = lineStyleModel.get('curveness');
            const n1Layout = edge.node1.getLayout();
            const node1Model = edge.node1.getModel<SankeyNodeItemOption>();
            const dragX1 = node1Model.get('localX');
            const dragY1 = node1Model.get('localY');
            const n2Layout = edge.node2.getLayout();
            const node2Model = edge.node2.getModel<SankeyNodeItemOption>();
            const dragX2 = node2Model.get('localX');
            const dragY2 = node2Model.get('localY');
            const edgeLayout = edge.getLayout();
            let x1: number;
            let y1: number;
            let x2: number;
            let y2: number;
            let cpx1: number;
            let cpy1: number;
            let cpx2: number;
            let cpy2: number;

            curve.shape.extent = Math.max(1, edgeLayout.dy);
            curve.shape.orient = orient;

            if (orient === 'vertical') {
                x1 = (dragX1 != null ? dragX1 * width : n1Layout.x) + edgeLayout.sy;
                y1 = (dragY1 != null ? dragY1 * height : n1Layout.y) + n1Layout.dy;
                x2 = (dragX2 != null ? dragX2 * width : n2Layout.x) + edgeLayout.ty;
                y2 = dragY2 != null ? dragY2 * height : n2Layout.y;
                cpx1 = x1;
                cpy1 = y1 * (1 - curvature) + y2 * curvature;
                cpx2 = x2;
                cpy2 = y1 * curvature + y2 * (1 - curvature);
            }
            else {
                x1 = (dragX1 != null ? dragX1 * width : n1Layout.x) + n1Layout.dx;
                y1 = (dragY1 != null ? dragY1 * height : n1Layout.y) + edgeLayout.sy;
                x2 = dragX2 != null ? dragX2 * width : n2Layout.x;
                y2 = (dragY2 != null ? dragY2 * height : n2Layout.y) + edgeLayout.ty;
                cpx1 = x1 * (1 - curvature) + x2 * curvature;
                cpy1 = y1;
                cpx2 = x1 * curvature + x2 * (1 - curvature);
                cpy2 = y2;
            }

            curve.setShape({
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2,
                cpx1: cpx1,
                cpy1: cpy1,
                cpx2: cpx2,
                cpy2: cpy2
            });

            curve.setStyle(lineStyleModel.getItemStyle());
            // Special color, use source node color or target node color
            switch (curve.style.fill) {
                case 'source':
                    curve.style.fill = edge.node1.getVisual('color');
                    break;
                case 'target':
                    curve.style.fill = edge.node2.getVisual('color');
                    break;
            }

            graphic.enableHoverEmphasis(
                curve,
                edgeModel.getModel(['emphasis', 'lineStyle']).getItemStyle()
            );

            group.add(curve);

            edgeData.setItemGraphicEl(edge.dataIndex, curve);
        });

        // Generate a rect for each node
        graph.eachNode(function (node) {
            const layout = node.getLayout();
            const itemModel = node.getModel<SankeyNodeItemOption>();
            const dragX = itemModel.get('localX');
            const dragY = itemModel.get('localY');
            const labelModel = itemModel.getModel('label');
            const labelHoverModel = itemModel.getModel(['emphasis', 'label']);

            const rect = new graphic.Rect({
                shape: {
                    x: dragX != null ? dragX * width : layout.x,
                    y: dragY != null ? dragY * height : layout.y,
                    width: layout.dx,
                    height: layout.dy
                },
                style: itemModel.getModel('itemStyle').getItemStyle()
            });

            const hoverStyle = itemModel.getModel(['emphasis', 'itemStyle']).getItemStyle();

            graphic.setLabelStyle(
                rect, labelModel, labelHoverModel,
                {
                    labelFetcher: seriesModel,
                    labelDataIndex: node.dataIndex,
                    defaultText: node.id
                }
            );

            rect.setStyle('fill', node.getVisual('color'));

            graphic.enableHoverEmphasis(rect, hoverStyle);

            group.add(rect);

            nodeData.setItemGraphicEl(node.dataIndex, rect);

            graphic.getECData(rect).dataType = 'node';
        });

        nodeData.eachItemGraphicEl(function (el: graphic.Rect & SankeyEl, dataIndex: number) {
            const itemModel = nodeData.getItemModel<SankeyNodeItemOption>(dataIndex);
            if (itemModel.get('draggable')) {
                el.drift = function (this: typeof el, dx, dy) {
                    sankeyView._focusAdjacencyDisabled = true;
                    this.shape.x += dx;
                    this.shape.y += dy;
                    this.dirty();
                    api.dispatchAction({
                        type: 'dragNode',
                        seriesId: seriesModel.id,
                        dataIndex: nodeData.getRawIndex(dataIndex),
                        localX: this.shape.x / width,
                        localY: this.shape.y / height
                    });
                };
                el.ondragend = function () {
                    sankeyView._focusAdjacencyDisabled = false;
                };
                el.draggable = true;
                el.cursor = 'move';
            }

            el.highlight = function () {
                this.trigger('emphasis');
            };

            el.downplay = function () {
                this.trigger('normal');
            };

            el.focusNodeAdjHandler && el.off('mouseover', el.focusNodeAdjHandler);
            el.unfocusNodeAdjHandler && el.off('mouseout', el.unfocusNodeAdjHandler);

            if (itemModel.get('focusNodeAdjacency')) {
                el.on('mouseover', el.focusNodeAdjHandler = function () {
                    if (!sankeyView._focusAdjacencyDisabled) {
                        sankeyView._clearTimer();
                        api.dispatchAction({
                            type: 'focusNodeAdjacency',
                            seriesId: seriesModel.id,
                            dataIndex: graphic.getECData(el).dataIndex
                        });
                    }
                });

                el.on('mouseout', el.unfocusNodeAdjHandler = function () {
                    if (!sankeyView._focusAdjacencyDisabled) {
                        sankeyView._dispatchUnfocus(api);
                    }
                });
            }
        });

        edgeData.eachItemGraphicEl(function (el: SankeyPath & SankeyEl, dataIndex) {
            const edgeModel = edgeData.getItemModel<GraphEdgeItemOption>(dataIndex);

            el.focusNodeAdjHandler && el.off('mouseover', el.focusNodeAdjHandler);
            el.unfocusNodeAdjHandler && el.off('mouseout', el.unfocusNodeAdjHandler);

            if (edgeModel.get('focusNodeAdjacency')) {
                el.on('mouseover', el.focusNodeAdjHandler = function () {
                    if (!sankeyView._focusAdjacencyDisabled) {
                        sankeyView._clearTimer();
                        api.dispatchAction({
                            type: 'focusNodeAdjacency',
                            seriesId: seriesModel.id,
                            edgeDataIndex: graphic.getECData(el).dataIndex
                        });
                    }
                });

                el.on('mouseout', el.unfocusNodeAdjHandler = function () {
                    if (!sankeyView._focusAdjacencyDisabled) {
                        sankeyView._dispatchUnfocus(api);
                    }
                });
            }
        });

        if (!this._data && seriesModel.get('animation')) {
            group.setClipPath(createGridClipShape(group.getBoundingRect(), seriesModel, function () {
                group.removeClipPath();
            }));
        }

        this._data = seriesModel.getData();
    }

    dispose() {
        this._clearTimer();
    }

    _dispatchUnfocus(api: ExtensionAPI) {
        const self = this;
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
        seriesModel: SankeySeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: FocusNodeAdjacencyPayload
    ) {
        const data = seriesModel.getData();
        const graph = data.graph;
        const dataIndex = payload.dataIndex;
        const itemModel = data.getItemModel<SankeyNodeItemOption>(dataIndex);
        const edgeDataIndex = payload.edgeDataIndex;

        if (dataIndex == null && edgeDataIndex == null) {
            return;
        }
        const node = graph.getNodeByIndex(dataIndex);
        const edge = graph.getEdgeByIndex(edgeDataIndex);

        graph.eachNode(function (node) {
            fadeOutItem(node, nodeOpacityPath, 0.1);
        });
        graph.eachEdge(function (edge) {
            fadeOutItem(edge, lineOpacityPath, 0.1);
        });

        if (node) {
            fadeInItem(node, hoverNodeOpacityPath);
            const focusNodeAdj = itemModel.get('focusNodeAdjacency');
            if (focusNodeAdj === 'outEdges') {
                zrUtil.each(node.outEdges, function (edge) {
                    if (edge.dataIndex < 0) {
                        return;
                    }
                    fadeInItem(edge, hoverLineOpacityPath);
                    fadeInItem(edge.node2, hoverNodeOpacityPath);
                });
            }
            else if (focusNodeAdj === 'inEdges') {
                zrUtil.each(node.inEdges, function (edge) {
                    if (edge.dataIndex < 0) {
                        return;
                    }
                    fadeInItem(edge, hoverLineOpacityPath);
                    fadeInItem(edge.node1, hoverNodeOpacityPath);
                });
            }
            else if (focusNodeAdj === 'allEdges') {
                zrUtil.each(node.edges, function (edge) {
                    if (edge.dataIndex < 0) {
                        return;
                    }
                    fadeInItem(edge, hoverLineOpacityPath);
                    (edge.node1 !== node) && fadeInItem(edge.node1, hoverNodeOpacityPath);
                    (edge.node2 !== node) && fadeInItem(edge.node2, hoverNodeOpacityPath);
                });
            }
        }
        if (edge) {
            fadeInItem(edge, hoverLineOpacityPath);
            fadeInItem(edge.node1, hoverNodeOpacityPath);
            fadeInItem(edge.node2, hoverNodeOpacityPath);
        }
    }

    unfocusNodeAdjacency(
        seriesModel: SankeySeriesModel
    ) {
        const graph = seriesModel.getGraph();

        graph.eachNode(function (node) {
            fadeOutItem(node, nodeOpacityPath);
        });
        graph.eachEdge(function (edge) {
            fadeOutItem(edge, lineOpacityPath);
        });
    }
}

// Add animation to the view
function createGridClipShape(rect: RectLike, seriesModel: SankeySeriesModel, cb: () => void) {
    const rectEl = new graphic.Rect({
        shape: {
            x: rect.x - 10,
            y: rect.y - 10,
            width: 0,
            height: rect.height + 20
        }
    });
    graphic.initProps(rectEl, {
        shape: {
            width: rect.width + 20
        }
    }, seriesModel, cb);

    return rectEl;
}

ChartView.registerClass(SankeyView);

export default SankeyView;
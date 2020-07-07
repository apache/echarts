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
import { enterEmphasis, leaveEmphasis, enableHoverEmphasis } from '../../util/states';
import * as zrUtil from 'zrender/src/core/util';
import { LayoutOrient, Payload } from '../../util/types';
import { PathProps } from 'zrender/src/graphic/Path';
import SankeySeriesModel, { SankeyEdgeItemOption, SankeyNodeItemOption } from './SankeySeries';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { GraphNode, GraphEdge } from '../../data/Graph';
import { GraphEdgeItemOption } from '../graph/GraphSeries';
import List from '../../data/List';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { setLabelStyle } from '../../label/labelStyle';

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

function fadeInItem(nodeOrEdge: GraphNode | GraphEdge) {
    const el = nodeOrEdge.getGraphicEl();
    if (el) {
        el.removeState('blur');
    }
}

function fadeOutItem(nodeOrEdge: GraphNode | GraphEdge) {
    const el = nodeOrEdge.getGraphicEl();
    if (el) {
        el.useState('blur');
    }
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
        enterEmphasis(this);
    }

    downplay() {
        leaveEmphasis(this);
    }
}

class SankeyView extends ChartView {

    static readonly type = 'sankey';
    readonly type = SankeyView.type;

    private _model: SankeySeriesModel;

    private _focusAdjacencyDisabled = false;

    private _data: List;

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

        group.x = layoutInfo.x;
        group.y = layoutInfo.y;

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

            curve.useStyle(lineStyleModel.getItemStyle());
            // Special color, use source node color or target node color
            switch (curve.style.fill) {
                case 'source':
                    curve.style.fill = edge.node1.getVisual('color');
                    break;
                case 'target':
                    curve.style.fill = edge.node2.getVisual('color');
                    break;
            }

            enableHoverEmphasis(
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

            setLabelStyle(
                rect, labelModel, labelHoverModel,
                {
                    labelFetcher: seriesModel,
                    labelDataIndex: node.dataIndex,
                    defaultText: node.id
                }
            );

            rect.setStyle('fill', node.getVisual('color'));

            enableHoverEmphasis(rect, hoverStyle);

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
                enterEmphasis(this);
            };

            el.downplay = function () {
                leaveEmphasis(this);
            };

            el.focusNodeAdjHandler && el.off('mouseover', el.focusNodeAdjHandler);
            el.unfocusNodeAdjHandler && el.off('mouseout', el.unfocusNodeAdjHandler);

            if (itemModel.get('focusNodeAdjacency')) {
                el.on('mouseover', el.focusNodeAdjHandler = function () {
                    if (!sankeyView._focusAdjacencyDisabled) {
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

        if (!this._data && seriesModel.isAnimationEnabled()) {
            group.setClipPath(createGridClipShape(group.getBoundingRect(), seriesModel, function () {
                group.removeClipPath();
            }));
        }

        this._data = seriesModel.getData();
    }

    dispose() {
    }

    _dispatchUnfocus(api: ExtensionAPI) {
        const self = this;
        api.dispatchAction({
            type: 'unfocusNodeAdjacency',
            seriesId: self._model.id
        });
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
        const edgeDataIndex = payload.edgeDataIndex;

        if (dataIndex == null && edgeDataIndex == null) {
            return;
        }
        const node = graph.getNodeByIndex(dataIndex);
        const edge = graph.getEdgeByIndex(edgeDataIndex);

        graph.eachNode(function (node) {
            fadeOutItem(node);
        });
        graph.eachEdge(function (edge) {
            fadeOutItem(edge);
        });

        if (node) {
            const itemModel = data.getItemModel<SankeyNodeItemOption>(dataIndex);
            fadeInItem(node);
            const focusNodeAdj = itemModel.get('focusNodeAdjacency');
            if (focusNodeAdj === 'outEdges') {
                zrUtil.each(node.outEdges, function (edge) {
                    if (edge.dataIndex < 0) {
                        return;
                    }
                    fadeInItem(edge);
                    fadeInItem(edge.node2);
                });
            }
            else if (focusNodeAdj === 'inEdges') {
                zrUtil.each(node.inEdges, function (edge) {
                    if (edge.dataIndex < 0) {
                        return;
                    }
                    fadeInItem(edge);
                    fadeInItem(edge.node1);
                });
            }
            else if (focusNodeAdj === 'allEdges') {
                zrUtil.each(node.edges, function (edge) {
                    if (edge.dataIndex < 0) {
                        return;
                    }
                    fadeInItem(edge);
                    (edge.node1 !== node) && fadeInItem(edge.node1);
                    (edge.node2 !== node) && fadeInItem(edge.node2);
                });
            }
        }
        if (edge) {
            fadeInItem(edge);
            fadeInItem(edge.node1);
            fadeInItem(edge.node2);
        }
    }

    unfocusNodeAdjacency(
        seriesModel: SankeySeriesModel
    ) {
        const graph = seriesModel.getGraph();

        graph.eachNode(function (node) {
            fadeInItem(node);
        });
        graph.eachEdge(function (edge) {
            fadeInItem(edge);
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
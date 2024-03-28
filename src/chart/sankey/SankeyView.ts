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
import { enterEmphasis, leaveEmphasis, toggleHoverEmphasis, setStatesStylesFromModel } from '../../util/states';
import { LayoutOrient, ECElement } from '../../util/types';
import type { PathProps, PathStyleProps } from 'zrender/src/graphic/Path';
import SankeySeriesModel, { SankeyEdgeItemOption, SankeyNodeItemOption } from './SankeySeries';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesData from '../../data/SeriesData';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import { getECData } from '../../util/innerStore';
import { isString, retrieve3 } from 'zrender/src/core/util';
import type { GraphEdge } from '../../data/Graph';
import RoamController, { RoamControllerHost } from '../../component/helper/RoamController';
import {onIrrelevantElement} from '../../component/helper/cursorHelper';
import * as roamHelper from '../../component/helper/roamHelper';
import SymbolClz from '../helper/Symbol';
import * as bbox from 'zrender/src/core/bbox';
import View from '../../coord/View';

type SankeySymbol = SymbolClz & {
    __edge: graphic.BezierCurve | SankeyPath

    __radialOldRawX: number
    __radialOldRawY: number
    __radialRawX: number
    __radialRawY: number

    __oldX: number
    __oldY: number
};

interface SanKeyNodeLayout {
    x: number
    y: number
    rawX: number
    rawY: number
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

    private _controller: RoamController;
    private _controllerHost: RoamControllerHost;
    private _nodeScaleRatio: number;
    private _mainGroup = new graphic.Group();

    private _model: SankeySeriesModel;

    private _focusAdjacencyDisabled = false;

    private _data: SeriesData;

    private _min: number[];
    private _max: number[];
    

    init(ecModel: GlobalModel, api: ExtensionAPI) {
        this._controller = new RoamController(api.getZr());

        this._controllerHost = {
            target: this.group
        } as RoamControllerHost;

        this.group.add(this._mainGroup);
    }

    render(seriesModel: SankeySeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();
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
            const ecData = getECData(curve);
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
            applyCurveStyle(curve.style, orient, edge);


            const defaultEdgeLabelText = `${edgeModel.get('value')}`;
            const edgeLabelStateModels = getLabelStatesModels(edgeModel, 'edgeLabel');

            setLabelStyle(
                curve, edgeLabelStateModels,
                {
                    labelFetcher: {
                        getFormattedLabel(dataIndex, stateName, dataType, labelDimIndex, formatter, extendParams) {
                            return seriesModel.getFormattedLabel(
                                dataIndex, stateName, 'edge',
                                labelDimIndex,
                                // ensure edgeLabel formatter is provided
                                // to prevent the inheritance from `label.formatter` of the series
                                retrieve3(
                                    formatter,
                                    edgeLabelStateModels.normal && edgeLabelStateModels.normal.get('formatter'),
                                    defaultEdgeLabelText
                                ),
                                extendParams
                            );
                        }
                    },
                    labelDataIndex: edge.dataIndex,
                    defaultText: defaultEdgeLabelText
                }
            );
            curve.setTextConfig({ position: 'inside' });

            const emphasisModel = edgeModel.getModel('emphasis');

            setStatesStylesFromModel(curve, edgeModel, 'lineStyle', (model) => {
                const style = model.getItemStyle();

                applyCurveStyle(style, orient, edge);

                return style;
            });

            group.add(curve);

            edgeData.setItemGraphicEl(edge.dataIndex, curve);

            const focus = emphasisModel.get('focus');
            toggleHoverEmphasis(
                curve,
                focus === 'adjacency' ? edge.getAdjacentDataIndices()
                : focus === 'trajectory' ? edge.getTrajectoryDataIndices()
                : focus,
                emphasisModel.get('blurScope'),
                emphasisModel.get('disabled')
            );
        });

        // Generate a rect for each node
        graph.eachNode(function (node) {
            const layout = node.getLayout();
            const itemModel = node.getModel<SankeyNodeItemOption>();
            const dragX = itemModel.get('localX');
            const dragY = itemModel.get('localY');
            const emphasisModel = itemModel.getModel('emphasis');

            const rect = new graphic.Rect({
                shape: {
                    x: dragX != null ? dragX * width : layout.x,
                    y: dragY != null ? dragY * height : layout.y,
                    width: layout.dx,
                    height: layout.dy
                },
                style: itemModel.getModel('itemStyle').getItemStyle(),
                z2: 10
            });

            setLabelStyle(
                rect, getLabelStatesModels(itemModel),
                {
                    labelFetcher: {
                        getFormattedLabel(dataIndex, stateName) {
                            return seriesModel.getFormattedLabel(dataIndex, stateName, 'node');
                        }
                    },
                    labelDataIndex: node.dataIndex,
                    defaultText: node.id
                }
            );

            (rect as ECElement).disableLabelAnimation = true;

            rect.setStyle('fill', node.getVisual('color'));
            rect.setStyle('decal', node.getVisual('style').decal);

            setStatesStylesFromModel(rect, itemModel);

            group.add(rect);

            nodeData.setItemGraphicEl(node.dataIndex, rect);

            getECData(rect).dataType = 'node';

            const focus = emphasisModel.get('focus');
            toggleHoverEmphasis(
                rect,
                focus === 'adjacency'
                    ? node.getAdjacentDataIndices()
                    : focus === 'trajectory'
                    ? node.getTrajectoryDataIndices()
                    : focus,
                emphasisModel.get('blurScope'),
                emphasisModel.get('disabled')
            );
        });

        nodeData.eachItemGraphicEl(function (el: graphic.Rect, dataIndex: number) {
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
        });

        if (!this._data && seriesModel.isAnimationEnabled()) {
            group.setClipPath(createGridClipShape(group.getBoundingRect(), seriesModel, function () {
                group.removeClipPath();
            }));
        }

        const oldData = this._data;

        data.diff(oldData)
            .add(function (newIdx) {
                // console.log('add', symbolNeedsDraw(data, newIdx));
                if (symbolNeedsDraw(data, newIdx)) {
                    // Create node and edge
                    updateNode(data, newIdx, null, group, seriesModel);
                }
            })
            .update(function (newIdx, oldIdx) {
                const symbolEl = oldData.getItemGraphicEl(oldIdx) as SankeySymbol;
                // console.log('update', symbolEl);
                if (!symbolNeedsDraw(data, newIdx)) {
                    symbolEl && removeNode(oldData, oldIdx, symbolEl, group, seriesModel);
                    return;
                }
                // Update node and edge
                updateNode(data, newIdx, symbolEl, group, seriesModel);
            })
            .remove(function (oldIdx) {
                console.log('remove', 'remove');
                const symbolEl = oldData.getItemGraphicEl(oldIdx) as SankeySymbol;
                // When remove a collapsed node of subtree, since the collapsed
                // node haven't been initialized with a symbol element,
                // you can't found it's symbol element through index.
                // so if we want to remove the symbol element we should insure
                // that the symbol element is not null.
                if (symbolEl) {
                    removeNode(oldData, oldIdx, symbolEl, group, seriesModel);
                }
            })
            .execute();

        this._updateViewCoordSys(seriesModel, api);
        this._updateController(seriesModel, ecModel, api);

        this._nodeScaleRatio = seriesModel.get('nodeScaleRatio');
        this._updateNodeAndLinkScale(seriesModel);

        this._data = data;
    }

    _updateController(
        seriesModel: SankeySeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) { 
        const controller = this._controller;
        const controllerHost = this._controllerHost;
        const group = this.group;
        controller.setPointerChecker(function (e, x, y) {
            const rect = group.getBoundingRect();
            rect.applyTransform(group.transform);
            return rect.contain(x, y)
                && !onIrrelevantElement(e, api, seriesModel);
        });

        // console.log('roam', seriesModel.get('roam'));
        // console.log('scaleLimit', seriesModel.get('scaleLimit'));

        controller.enable(seriesModel.get('roam'));
        controllerHost.zoomLimit = seriesModel.get('scaleLimit');
        controllerHost.zoom = seriesModel.coordinateSystem.getZoom();

        controller
            .off('pan')
            .off('zoom')
            .on('pan', (e) => {
                // console.log('pan', e);
                roamHelper.updateViewOnPan(controllerHost, e.dx, e.dy);
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'treeRoam',
                    dx: e.dx,
                    dy: e.dy
                });
            })
            .on('zoom', (e) => {
                // console.log('zoom', e);
                roamHelper.updateViewOnZoom(controllerHost, e.scale, e.originX, e.originY);
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'treeRoam',
                    zoom: e.scale,
                    originX: e.originX,
                    originY: e.originY
                });
                this._updateNodeAndLinkScale(seriesModel);
                // Only update label layout on zoom
                api.updateLabelLayout();
            });
    }

    _updateNodeAndLinkScale(seriesModel: SankeySeriesModel) {
        const data = seriesModel.getData();

        const nodeScale = this._getNodeGlobalScale(seriesModel);

        // data.eachItemGraphicEl(function (el: SymbolClz, idx) {
        //     el.setSymbolScale(nodeScale);
        // });
    }

    _getNodeGlobalScale(seriesModel: SankeySeriesModel) {
        // console.log('1')
        const coordSys = seriesModel.coordinateSystem;
        if (coordSys.type !== 'view') {
            return 1;
        }
        const nodeScaleRatio = this._nodeScaleRatio;

        const groupZoom = coordSys.scaleX || 1;
        // Scale node when zoom changes
        const roamZoom = coordSys.getZoom();
        const nodeScale = (roamZoom - 1) * nodeScaleRatio + 1;

        return nodeScale / groupZoom;
    }

    _updateViewCoordSys(seriesModel: SankeySeriesModel, api: ExtensionAPI) {
        const data = seriesModel.getData();
        const points: number[][] = [];
        data.each(function (idx) {
            const layout = data.getItemLayout(idx);
            if (layout && !isNaN(layout.x) && !isNaN(layout.y)) {
                points.push([+layout.x, +layout.y]);
            }
        });
        const min: number[] = [];
        const max: number[] = [];
        bbox.fromPoints(points, min, max);

        // If don't Store min max when collapse the root node after roam,
        // the root node will disappear.
        const oldMin = this._min;
        const oldMax = this._max;

        // If width or height is 0
        if (max[0] - min[0] === 0) {
            min[0] = oldMin ? oldMin[0] : min[0] - 1;
            max[0] = oldMax ? oldMax[0] : max[0] + 1;
        }
        if (max[1] - min[1] === 0) {
            min[1] = oldMin ? oldMin[1] : min[1] - 1;
            max[1] = oldMax ? oldMax[1] : max[1] + 1;
        }

        const viewCoordSys = seriesModel.coordinateSystem = new View();
        viewCoordSys.zoomLimit = seriesModel.get('scaleLimit');

        viewCoordSys.setBoundingRect(min[0], min[1], max[0] - min[0], max[1] - min[1]);

        viewCoordSys.setCenter(seriesModel.get('center'), api);
        viewCoordSys.setZoom(seriesModel.get('zoom'));

        // Here we use viewCoordSys just for computing the 'position' and 'scale' of the group
        this.group.attr({
            x: viewCoordSys.x,
            y: viewCoordSys.y,
            scaleX: viewCoordSys.scaleX,
            scaleY: viewCoordSys.scaleY
        });

        this._min = min;
        this._max = max;
    }

    dispose() {
        this._controller && this._controller.dispose();
        this._controllerHost = null;
    }

    remove() {
        this._mainGroup.removeAll();
        this._data = null;
    }
}

function updateNode(
    data: SeriesData,
    dataIndex: number,
    symbolEl: SankeySymbol,
    group: graphic.Group,
    seriesModel: SankeySeriesModel
) {
    // data.setItemGraphicEl(dataIndex, symbolEl);
}

function removeNode(
    data: SeriesData,
    dataIndex: number,
    symbolEl: SankeySymbol,
    group: graphic.Group,
    seriesModel: SankeySeriesModel
) {
    
}

function symbolNeedsDraw(data: SeriesData, dataIndex: number) {
    const layout = data.getItemLayout(dataIndex);

    return layout
        && !isNaN(layout.x) && !isNaN(layout.y);
}

/**
 * Special color, use source node color or target node color
 * @param curveProps curve's style to parse
 * @param orient direction
 * @param edge current curve data
 */
function applyCurveStyle(curveProps: PathStyleProps, orient: 'horizontal' | 'vertical', edge: GraphEdge) {
    switch (curveProps.fill) {
        case 'source':
            curveProps.fill = edge.node1.getVisual('color');
            curveProps.decal = edge.node1.getVisual('style').decal;
            break;
        case 'target':
            curveProps.fill = edge.node2.getVisual('color');
            curveProps.decal = edge.node2.getVisual('style').decal;
            break;
        case 'gradient':
            const sourceColor = edge.node1.getVisual('color');
            const targetColor = edge.node2.getVisual('color');
            if (isString(sourceColor) && isString(targetColor)) {
                curveProps.fill = new graphic.LinearGradient(
                    0, 0, +(orient === 'horizontal'), +(orient === 'vertical'), [{
                        color: sourceColor,
                        offset: 0
                    }, {
                        color: targetColor,
                        offset: 1
                    }]
                );
            }
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

export default SankeyView;

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
import * as bbox from 'zrender/src/core/bbox';
import View from '../../coord/View';
import * as roamHelper from '../../component/helper/roamHelper';
import RoamController, { RoamControllerHost } from '../../component/helper/RoamController';
import {onIrrelevantElement} from '../../component/helper/cursorHelper';
import { __DEV__ } from '../../config';
import {parsePercent} from '../../util/number';
import ChartView from '../../view/Chart';
import TreeSeriesModel, { TreeSeriesOption, TreeSeriesNodeItemOption } from './TreeSeries';
import Path, { PathProps, PathStyleProps } from 'zrender/src/graphic/Path';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import Tree, { TreeNode } from '../../data/Tree';
import List from '../../data/List';
import Model from '../../model/Model';
import { ColorString } from '../../util/types';

type TreeSymbol = SymbolClz & {
    __edge: graphic.BezierCurve | TreePath

    __radialOldRawX: number
    __radialOldRawY: number
    __radialRawX: number
    __radialRawY: number
};

interface TreeSeriesScope extends Pick<
    TreeSeriesOption,
    'expandAndCollapse' | 'edgeShape' | 'edgeForkPosition'
    | 'layout' | 'orient' | 'symbolRotate' | 'symbolOffset' | 'hoverAnimation'
> {
    curvature: number
    useNameLabel: boolean
    fadeIn: boolean

    itemModel: Model<TreeSeriesNodeItemOption>
    itemStyle: PathStyleProps
    hoverItemStyle: PathStyleProps
    lineStyle: PathStyleProps
    labelModel: Model<TreeSeriesNodeItemOption['label']>
    hoverLabelModel: Model<TreeSeriesNodeItemOption['label']>
    symbolInnerColor: ColorString
}

class TreeEdgeShape {
    parentPoint: number[] = [];
    childPoints: number[][] = [];
    orient: TreeSeriesOption['orient'];
    forkPosition: TreeSeriesOption['edgeForkPosition'];
}

interface TreeEdgePathProps extends PathProps {
    shape?: Partial<TreeEdgeShape>
}

interface TreeNodeLayout {
    x: number
    y: number
    rawX: number
    rawY: number
}

class TreePath extends Path<TreeEdgePathProps> {
    shape: TreeEdgeShape;
    constructor(opts?: TreeEdgePathProps) {
        super(opts);
    }

    getDefaultStyle() {
        return {
            stroke: '#000',
            fill: null as string
        };
    }

    getDefaultShape() {
        return new TreeEdgeShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: TreeEdgeShape) {
        const childPoints = shape.childPoints;
        const childLen = childPoints.length;
        const parentPoint = shape.parentPoint;
        const firstChildPos = childPoints[0];
        const lastChildPos = childPoints[childLen - 1];

        if (childLen === 1) {
            ctx.moveTo(parentPoint[0], parentPoint[1]);
            ctx.lineTo(firstChildPos[0], firstChildPos[1]);
            return;
        }

        const orient = shape.orient;
        const forkDim = (orient === 'TB' || orient === 'BT') ? 0 : 1;
        const otherDim = 1 - forkDim;
        const forkPosition = parsePercent(shape.forkPosition, 1);
        const tmpPoint = [];
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

        for (let i = 1; i < childLen - 1; i++) {
            const point = childPoints[i];
            ctx.moveTo(point[0], point[1]);
            tmpPoint[forkDim] = point[forkDim];
            ctx.lineTo(tmpPoint[0], tmpPoint[1]);
        }
    }
}

class TreeView extends ChartView {

    static readonly type = 'tree';
    readonly type = TreeView.type;

    private _oldTree: Tree;
    private _mainGroup = new graphic.Group();

    private _controller: RoamController;
    private _controllerHost: RoamControllerHost;

    private _data: List<TreeSeriesModel>;

    private _nodeScaleRatio: number;
    private _min: number[];
    private _max: number[];

    private _viewCoordSys: View;

    init(ecModel: GlobalModel, api: ExtensionAPI) {


        this._controller = new RoamController(api.getZr());

        this._controllerHost = {
            target: this.group
        } as RoamControllerHost;

        this.group.add(this._mainGroup);
    }

    render(
        seriesModel: TreeSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        const data = seriesModel.getData();

        const layoutInfo = seriesModel.layoutInfo;

        const group = this._mainGroup;

        const layout = seriesModel.get('layout');

        if (layout === 'radial') {
            group.attr('position', [layoutInfo.x + layoutInfo.width / 2, layoutInfo.y + layoutInfo.height / 2]);
        }
        else {
            group.attr('position', [layoutInfo.x, layoutInfo.y]);
        }

        this._updateViewCoordSys(seriesModel);
        this._updateController(seriesModel, ecModel, api);

        const oldData = this._data;

        const seriesScope = {
            expandAndCollapse: seriesModel.get('expandAndCollapse'),
            layout: layout,
            edgeShape: seriesModel.get('edgeShape'),
            edgeForkPosition: seriesModel.get('edgeForkPosition'),
            orient: seriesModel.getOrient(),
            curvature: seriesModel.get(['lineStyle', 'curveness']),
            symbolRotate: seriesModel.get('symbolRotate'),
            symbolOffset: seriesModel.get('symbolOffset'),
            hoverAnimation: seriesModel.get('hoverAnimation'),
            useNameLabel: true,
            fadeIn: true
        } as TreeSeriesScope;

        data.diff(oldData)
            .add(function (newIdx) {
                if (symbolNeedsDraw(data, newIdx)) {
                    // Create node and edge
                    updateNode(data, newIdx, null, group, seriesModel, seriesScope);
                }
            })
            .update(function (newIdx, oldIdx) {
                const symbolEl = oldData.getItemGraphicEl(oldIdx) as TreeSymbol;
                if (!symbolNeedsDraw(data, newIdx)) {
                    symbolEl && removeNode(oldData, oldIdx, symbolEl, group, seriesModel, seriesScope);
                    return;
                }
                // Update node and edge
                updateNode(data, newIdx, symbolEl, group, seriesModel, seriesScope);
            })
            .remove(function (oldIdx) {
                const symbolEl = oldData.getItemGraphicEl(oldIdx) as TreeSymbol;
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
    }

    _updateViewCoordSys(seriesModel: TreeSeriesModel) {
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
    }

    _updateController(
        seriesModel: TreeSeriesModel,
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
                    type: 'treeRoam',
                    dx: e.dx,
                    dy: e.dy
                });
            })
            .on('zoom', (e) => {
                roamHelper.updateViewOnZoom(controllerHost, e.scale, e.originX, e.originY);
                api.dispatchAction({
                    seriesId: seriesModel.id,
                    type: 'treeRoam',
                    zoom: e.scale,
                    originX: e.originX,
                    originY: e.originY
                });
                this._updateNodeAndLinkScale(seriesModel);
            });
    }

    _updateNodeAndLinkScale(seriesModel: TreeSeriesModel) {
        const data = seriesModel.getData();

        const nodeScale = this._getNodeGlobalScale(seriesModel);
        const invScale = [nodeScale, nodeScale];

        data.eachItemGraphicEl(function (el, idx) {
            el.attr('scale', invScale);
        });
    }

    _getNodeGlobalScale(seriesModel: TreeSeriesModel) {
        const coordSys = seriesModel.coordinateSystem;
        if (coordSys.type !== 'view') {
            return 1;
        }

        const nodeScaleRatio = this._nodeScaleRatio;

        const groupScale = coordSys.scale;
        const groupZoom = (groupScale && groupScale[0]) || 1;
        // Scale node when zoom changes
        const roamZoom = coordSys.getZoom();
        const nodeScale = (roamZoom - 1) * nodeScaleRatio + 1;

        return nodeScale / groupZoom;
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

function symbolNeedsDraw(data: List, dataIndex: number) {
    const layout = data.getItemLayout(dataIndex);

    return layout
        && !isNaN(layout.x) && !isNaN(layout.y)
        && data.getItemVisual(dataIndex, 'symbol') !== 'none';
}

function getTreeNodeStyle(
    node: TreeNode,
    itemModel: Model<TreeSeriesNodeItemOption>,
    seriesScope: TreeSeriesScope
): TreeSeriesScope {
    seriesScope.itemModel = itemModel;
    seriesScope.itemStyle = itemModel.getModel('itemStyle').getItemStyle();
    seriesScope.hoverItemStyle = itemModel.getModel(['emphasis', 'itemStyle']).getItemStyle();
    seriesScope.lineStyle = itemModel.getModel('lineStyle').getLineStyle();
    seriesScope.labelModel = itemModel.getModel('label');
    seriesScope.hoverLabelModel = itemModel.getModel(['emphasis', 'label']);

    if (node.isExpand === false && node.children.length !== 0) {
        seriesScope.symbolInnerColor = seriesScope.itemStyle.fill as ColorString;
    }
    else {
        seriesScope.symbolInnerColor = '#fff';
    }
    return seriesScope;
}

function updateNode(
    data: List,
    dataIndex: number,
    symbolEl: TreeSymbol,
    group: graphic.Group,
    seriesModel: TreeSeriesModel,
    seriesScope: TreeSeriesScope
) {
    const isInit = !symbolEl;
    const node = data.tree.getNodeByDataIndex(dataIndex);
    const itemModel = node.getModel();
    seriesScope = getTreeNodeStyle(node, itemModel, seriesScope);
    const virtualRoot = data.tree.root;

    const source = node.parentNode === virtualRoot ? node : node.parentNode || node;
    const sourceSymbolEl = data.getItemGraphicEl(source.dataIndex) as TreeSymbol;
    const sourceLayout = source.getLayout() as TreeNodeLayout;
    const sourceOldLayout = sourceSymbolEl
        ? {
            x: sourceSymbolEl.position[0],
            y: sourceSymbolEl.position[1],
            rawX: sourceSymbolEl.__radialOldRawX,
            rawY: sourceSymbolEl.__radialOldRawY
        }
        : sourceLayout;
    const targetLayout = node.getLayout();

    if (isInit) {
        symbolEl = new SymbolClz(data, dataIndex, seriesScope) as TreeSymbol;
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

    const symbolPath = symbolEl.getSymbolPath();

    if (seriesScope.layout === 'radial') {
        const realRoot = virtualRoot.children[0];
        const rootLayout = realRoot.getLayout();
        const length = realRoot.children.length;
        let rad;
        let isLeft;

        if (targetLayout.x === rootLayout.x && node.isExpand === true) {
            const center = {
                x: (realRoot.children[0].getLayout().x + realRoot.children[length - 1].getLayout().x) / 2,
                y: (realRoot.children[0].getLayout().y + realRoot.children[length - 1].getLayout().y) / 2
            };
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

        const textPosition = isLeft ? 'left' as const : 'right' as const;
        const rotate = seriesScope.labelModel.get('rotate');
        const labelRotateRadian = rotate * (Math.PI / 180);

        const textContent = symbolPath.getTextContent();
        if (textContent) {
            symbolPath.setTextConfig({
                position: seriesScope.labelModel.get('position') || textPosition,
                rotation: rotate == null ? -rad : labelRotateRadian
                // textOrigin: 'center',
            });
            textContent.setStyle('verticalAlign', 'middle');
        }

    }

    drawEdge(
        seriesModel, node, virtualRoot, symbolEl, sourceOldLayout,
        sourceLayout, targetLayout, group, seriesScope
    );

}

function drawEdge(
    seriesModel: TreeSeriesModel,
    node: TreeNode,
    virtualRoot: TreeNode,
    symbolEl: TreeSymbol,
    sourceOldLayout: TreeNodeLayout,
    sourceLayout: TreeNodeLayout,
    targetLayout: TreeNodeLayout,
    group: graphic.Group,
    seriesScope: TreeSeriesScope
) {

    const edgeShape = seriesScope.edgeShape;
    let edge = symbolEl.__edge;
    if (edgeShape === 'curve') {
        if (node.parentNode && node.parentNode !== virtualRoot) {
            if (!edge) {
                edge = symbolEl.__edge = new graphic.BezierCurve({
                    shape: getEdgeShape(seriesScope, sourceOldLayout, sourceOldLayout),
                    style: zrUtil.defaults({opacity: 0, strokeNoScale: true}, seriesScope.lineStyle)
                });
            }

            graphic.updateProps(edge as Path, {
                shape: getEdgeShape(seriesScope, sourceLayout, targetLayout),
                style: {opacity: 1}
            }, seriesModel);
        }
    }
    else if (edgeShape === 'polyline') {
        if (seriesScope.layout === 'orthogonal') {
            if (node !== virtualRoot && node.children && (node.children.length !== 0) && (node.isExpand === true)) {
                const children = node.children;
                const childPoints = [];
                for (let i = 0; i < children.length; i++) {
                    const childLayout = children[i].getLayout();
                    childPoints.push([childLayout.x, childLayout.y]);
                }

                if (!edge) {
                    edge = symbolEl.__edge = new TreePath({
                        shape: {
                            parentPoint: [targetLayout.x, targetLayout.y],
                            childPoints: [[targetLayout.x, targetLayout.y]],
                            orient: seriesScope.orient,
                            forkPosition: seriesScope.edgeForkPosition
                        },
                        style: zrUtil.defaults({opacity: 0, strokeNoScale: true}, seriesScope.lineStyle)
                    });
                }
                graphic.updateProps(edge as Path, {
                    shape: {
                        parentPoint: [targetLayout.x, targetLayout.y],
                        childPoints: childPoints
                    },
                    style: {opacity: 1}
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

function removeNode(
    data: List,
    dataIndex: number,
    symbolEl: TreeSymbol,
    group: graphic.Group,
    seriesModel: TreeSeriesModel,
    seriesScope: TreeSeriesScope
) {
    const node = data.tree.getNodeByDataIndex(dataIndex);
    const virtualRoot = data.tree.root;
    const itemModel = node.getModel();
    seriesScope = getTreeNodeStyle(node, itemModel, seriesScope);

    let source = node.parentNode === virtualRoot ? node : node.parentNode || node;
    // let edgeShape = seriesScope.edgeShape;
    let sourceLayout;
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

    const sourceSymbolEl = data.getItemGraphicEl(source.dataIndex) as TreeSymbol;
    const sourceEdge = sourceSymbolEl.__edge;

    // 1. when expand the sub tree, delete the children node should delete the edge of
    // the source at the same time. because the polyline edge shape is only owned by the source.
    // 2.when the node is the only children of the source, delete the node should delete the edge of
    // the source at the same time. the same reason as above.
    const edge = symbolEl.__edge
        || ((source.isExpand === false || source.children.length === 1) ? sourceEdge : undefined);

    const edgeShape = seriesScope.edgeShape;

    if (edge) {
        if (edgeShape === 'curve') {
            graphic.updateProps(edge as Path, {
                shape: getEdgeShape(seriesScope, sourceLayout, sourceLayout),
                style: {
                    opacity: 0
                }
            }, seriesModel, function () {
                group.remove(edge);
            });
        }
        else if (edgeShape === 'polyline' && seriesScope.layout === 'orthogonal') {
            graphic.updateProps(edge as Path, {
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

function getEdgeShape(seriesScope: TreeSeriesScope, sourceLayout: TreeNodeLayout, targetLayout: TreeNodeLayout) {
    let cpx1: number;
    let cpy1: number;
    let cpx2: number;
    let cpy2: number;
    const orient = seriesScope.orient;
    let x1: number;
    let x2: number;
    let y1: number;
    let y2: number;

    if (seriesScope.layout === 'radial') {
        x1 = sourceLayout.rawX;
        y1 = sourceLayout.rawY;
        x2 = targetLayout.rawX;
        y2 = targetLayout.rawY;

        const radialCoor1 = radialCoordinate(x1, y1);
        const radialCoor2 = radialCoordinate(x1, y1 + (y2 - y1) * seriesScope.curvature);
        const radialCoor3 = radialCoordinate(x2, y2 + (y1 - y2) * seriesScope.curvature);
        const radialCoor4 = radialCoordinate(x2, y2);

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

ChartView.registerClass(TreeView);

export default TreeView;
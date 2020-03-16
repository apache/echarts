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

import {bind, each, indexOf, curry, extend, retrieve, clone} from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import DataDiffer from '../../data/DataDiffer';
import * as helper from '../helper/treeHelper';
import Breadcrumb from './Breadcrumb';
import RoamController, { RoamEventParams } from '../../component/helper/RoamController';
import BoundingRect, { RectLike } from 'zrender/src/core/BoundingRect';
import * as matrix from 'zrender/src/core/matrix';
import * as animationUtil from '../../util/animation';
import makeStyleMapper from '../../model/mixin/makeStyleMapper';
import ChartView from '../../view/Chart';
import Tree, { TreeNode } from '../../data/Tree';
import TreemapSeriesModel, { TreemapSeriesNodeItemOption } from './TreemapSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import Model from '../../model/Model';
import { LayoutRect } from '../../util/layout';
import { TreemapLayoutNode } from './treemapLayout';
import Element from 'zrender/src/Element';
import Displayable from 'zrender/src/graphic/Displayable';
import { makeInner } from '../../util/model';
import { PathProps } from 'zrender/src/graphic/Path';
import { TreeSeriesNodeItemOption } from '../tree/TreeSeries';
import {
    TreemapRootToNodePayload,
    TreemapMovePayload,
    TreemapRenderPayload,
    TreemapZoomToNodePayload
} from './treemapAction';
import { StyleProps } from 'zrender/src/graphic/Style';
import { ColorString } from '../../util/types';

const Group = graphic.Group;
const Rect = graphic.Rect;

const DRAG_THRESHOLD = 3;
const PATH_LABEL_NOAMAL = ['label'] as const;
const PATH_LABEL_EMPHASIS = ['emphasis', 'label'] as const;
const PATH_UPPERLABEL_NORMAL = ['upperLabel'] as const;
const PATH_UPPERLABEL_EMPHASIS = ['emphasis', 'upperLabel'] as const;
const Z_BASE = 10; // Should bigger than every z.
const Z_BG = 1;
const Z_CONTENT = 2;

const getItemStyleEmphasis = makeStyleMapper([
    ['fill', 'color'],
    // `borderColor` and `borderWidth` has been occupied,
    // so use `stroke` to indicate the stroke of the rect.
    ['stroke', 'strokeColor'],
    ['lineWidth', 'strokeWidth'],
    ['shadowBlur'],
    ['shadowOffsetX'],
    ['shadowOffsetY'],
    ['shadowColor']
]);
const getItemStyleNormal = function (model: Model<TreemapSeriesNodeItemOption['itemStyle']>): StyleProps {
    // Normal style props should include emphasis style props.
    var itemStyle = getItemStyleEmphasis(model) as StyleProps;
    // Clear styles set by emphasis.
    itemStyle.stroke = itemStyle.fill = itemStyle.lineWidth = null;
    return itemStyle;
};

interface RenderElementStorage {
    nodeGroup: graphic.Group[]
    background: graphic.Rect[]
    content: graphic.Rect[]
}

type LastCfgStorage = {
    [key in keyof RenderElementStorage]: LastCfg[]
    // nodeGroup: {
    //     old: Pick<graphic.Group, 'position'>[]
    //     fadein: boolean
    // }[]
    // background: {
    //     old: Pick<graphic.Rect, 'shape'>
    //     fadein: boolean
    // }[]
    // content: {
    //     old: Pick<graphic.Rect, 'shape'>
    //     fadein: boolean
    // }[]
}

interface FoundTargetInfo {
    node: TreeNode

    offsetX?: number
    offsetY?: number
}

interface RenderResult {
    lastsForAnimation: LastCfgStorage
    willInvisibleEls?: graphic.Rect[]
    willDeleteEls: RenderElementStorage
    renderFinally: () => void
}

interface ReRoot {
    rootNodeGroup: graphic.Group
    direction: 'drillDown' | 'rollUp'
}

interface LastCfg {
    oldPos?: graphic.Group['position']
    oldShape?: graphic.Rect['shape']
    fadein: boolean
}

const inner = makeInner<{
    nodeWidth: number
    nodeHeight: number
    willDelete: boolean
}, Element>();

class TreemapView extends ChartView {

    static type = 'treemap'
    type = TreemapView.type

    private _containerGroup: graphic.Group
    private _breadcrumb: Breadcrumb
    private _controller: RoamController

    private _oldTree: Tree

    private _state: 'ready' | 'animating' = 'ready'

    private _storage = createStorage() as RenderElementStorage;

    seriesModel: TreemapSeriesModel
    api: ExtensionAPI
    ecModel: GlobalModel

    /**
     * @override
     */
    render(
        seriesModel: TreemapSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: TreemapZoomToNodePayload | TreemapRenderPayload | TreemapMovePayload | TreemapRootToNodePayload
    ) {

        var models = ecModel.findComponents({
            mainType: 'series', subType: 'treemap', query: payload
        });
        if (indexOf(models, seriesModel) < 0) {
            return;
        }

        this.seriesModel = seriesModel;
        this.api = api;
        this.ecModel = ecModel;

        var types = ['treemapZoomToNode', 'treemapRootToNode'];
        var targetInfo = helper
            .retrieveTargetInfo(payload, types, seriesModel);
        var payloadType = payload && payload.type;
        var layoutInfo = seriesModel.layoutInfo;
        var isInit = !this._oldTree;
        var thisStorage = this._storage;

        // Mark new root when action is treemapRootToNode.
        var reRoot = (payloadType === 'treemapRootToNode' && targetInfo && thisStorage)
            ? {
                rootNodeGroup: thisStorage.nodeGroup[targetInfo.node.getRawIndex()],
                direction: (payload as TreemapRootToNodePayload).direction
            }
            : null;

        var containerGroup = this._giveContainerGroup(layoutInfo);

        var renderResult = this._doRender(containerGroup, seriesModel, reRoot);
        (
            !isInit && (
                !payloadType
                || payloadType === 'treemapZoomToNode'
                || payloadType === 'treemapRootToNode'
            )
        )
            ? this._doAnimation(containerGroup, renderResult, seriesModel, reRoot)
            : renderResult.renderFinally();

        this._resetController(api);

        this._renderBreadcrumb(seriesModel, api, targetInfo);
    }

    /**
     * @private
     */
    _giveContainerGroup(layoutInfo: LayoutRect) {
        var containerGroup = this._containerGroup;
        if (!containerGroup) {
            // FIXME
            // 加一层containerGroup是为了clip，但是现在clip功能并没有实现。
            containerGroup = this._containerGroup = new Group();
            this._initEvents(containerGroup);
            this.group.add(containerGroup);
        }
        containerGroup.attr('position', [layoutInfo.x, layoutInfo.y]);

        return containerGroup;
    }

    /**
     * @private
     */
    _doRender(containerGroup: graphic.Group, seriesModel: TreemapSeriesModel, reRoot: ReRoot): RenderResult {
        var thisTree = seriesModel.getData().tree;
        var oldTree = this._oldTree;

        // Clear last shape records.
        var lastsForAnimation = createStorage() as LastCfgStorage;
        var thisStorage = createStorage() as RenderElementStorage;
        var oldStorage = this._storage;
        var willInvisibleEls: RenderResult['willInvisibleEls'] = [];

        function doRenderNode(thisNode: TreeNode, oldNode: TreeNode, parentGroup: graphic.Group, depth: number) {
            return renderNode(
                seriesModel,
                thisStorage, oldStorage, reRoot,
                lastsForAnimation, willInvisibleEls,
                thisNode, oldNode, parentGroup, depth
            );
        }

        // Notice: when thisTree and oldTree are the same tree (see list.cloneShallow),
        // the oldTree is actually losted, so we can not find all of the old graphic
        // elements from tree. So we use this stragegy: make element storage, move
        // from old storage to new storage, clear old storage.

        dualTravel(
            thisTree.root ? [thisTree.root] : [],
            (oldTree && oldTree.root) ? [oldTree.root] : [],
            containerGroup,
            thisTree === oldTree || !oldTree,
            0
        );

        // Process all removing.
        var willDeleteEls = clearStorage(oldStorage) as RenderElementStorage;

        this._oldTree = thisTree;
        this._storage = thisStorage;

        return {
            lastsForAnimation,
            willDeleteEls,
            renderFinally
        };

        function dualTravel(
            thisViewChildren: TreemapLayoutNode[],
            oldViewChildren: TreemapLayoutNode[],
            parentGroup: graphic.Group,
            sameTree: boolean,
            depth: number
        ) {
            // When 'render' is triggered by action,
            // 'this' and 'old' may be the same tree,
            // we use rawIndex in that case.
            if (sameTree) {
                oldViewChildren = thisViewChildren;
                each(thisViewChildren, function (child, index) {
                    !child.isRemoved() && processNode(index, index);
                });
            }
            // Diff hierarchically (diff only in each subtree, but not whole).
            // because, consistency of view is important.
            else {
                (new DataDiffer(oldViewChildren, thisViewChildren, getKey, getKey))
                    .add(processNode)
                    .update(processNode)
                    .remove(curry(processNode, null))
                    .execute();
            }

            function getKey(node: TreeNode) {
                // Identify by name or raw index.
                return node.getId();
            }

            function processNode(newIndex: number, oldIndex?: number) {
                var thisNode = newIndex != null ? thisViewChildren[newIndex] : null;
                var oldNode = oldIndex != null ? oldViewChildren[oldIndex] : null;

                var group = doRenderNode(thisNode, oldNode, parentGroup, depth);

                group && dualTravel(
                    thisNode && thisNode.viewChildren || [],
                    oldNode && oldNode.viewChildren || [],
                    group,
                    sameTree,
                    depth + 1
                );
            }
        }

        function clearStorage(storage: RenderElementStorage) {
            var willDeleteEls = createStorage() as RenderElementStorage;
            storage && each(storage, function (store, storageName) {
                var delEls = willDeleteEls[storageName];
                each(store, function (el) {
                    el && (delEls.push(el as any), inner(el).willDelete = true);
                });
            });
            return willDeleteEls;
        }

        function renderFinally() {
            each(willDeleteEls, function (els) {
                each(els, function (el) {
                    el.parent && el.parent.remove(el);
                });
            });
            each(willInvisibleEls, function (el) {
                el.invisible = true;
                // Setting invisible is for optimizing, so no need to set dirty,
                // just mark as invisible.
                el.dirty();
            });
        }
    }

    /**
     * @private
     */
    _doAnimation(
        containerGroup: graphic.Group,
        renderResult: RenderResult,
        seriesModel: TreemapSeriesModel,
        reRoot: ReRoot
    ) {
        if (!seriesModel.get('animation')) {
            return;
        }

        var duration = seriesModel.get('animationDurationUpdate');
        var easing = seriesModel.get('animationEasing');
        var animationWrap = animationUtil.createWrap();

        // Make delete animations.
        each(renderResult.willDeleteEls, function (store, storageName) {
            each(store, function (el, rawIndex) {
                if ((el as Displayable).invisible) {
                    return;
                }

                var parent = el.parent; // Always has parent, and parent is nodeGroup.
                var target: PathProps;
                var innerStore = inner(parent);

                if (reRoot && reRoot.direction === 'drillDown') {
                    target = parent === reRoot.rootNodeGroup
                        // This is the content element of view root.
                        // Only `content` will enter this branch, because
                        // `background` and `nodeGroup` will not be deleted.
                        ? {
                            shape: {
                                x: 0,
                                y: 0,
                                width: innerStore.nodeWidth,
                                height: innerStore.nodeHeight
                            },
                            style: {
                                opacity: 0
                            }
                        }
                        // Others.
                        : {style: {opacity: 0}};
                }
                else {
                    var targetX = 0;
                    var targetY = 0;

                    if (!innerStore.willDelete) {
                        // Let node animate to right-bottom corner, cooperating with fadeout,
                        // which is appropriate for user understanding.
                        // Divided by 2 for reRoot rolling up effect.
                        targetX = innerStore.nodeWidth / 2;
                        targetY = innerStore.nodeHeight / 2;
                    }

                    target = storageName === 'nodeGroup'
                        ? {position: [targetX, targetY], style: {opacity: 0}}
                        : {
                            shape: {x: targetX, y: targetY, width: 0, height: 0},
                            style: {opacity: 0}
                        };
                }
                // @ts-ignore
                target && animationWrap.add(el, target, duration, easing);
            });
        });

        // Make other animations
        each(this._storage, function (store, storageName) {
            each(store, function (el, rawIndex) {
                var last = renderResult.lastsForAnimation[storageName][rawIndex];
                var target: PathProps = {};

                if (!last) {
                    return;
                }

                if (el instanceof graphic.Group) {
                    if (last.oldPos) {
                        target.position = el.position.slice();
                        el.attr('position', last.oldPos);
                    }
                }
                else {
                    if (last.oldShape) {
                        target.shape = extend({}, el.shape);
                        el.setShape(last.oldShape);
                    }

                    if (last.fadein) {
                        el.setStyle('opacity', 0);
                        target.style = {opacity: 1};
                    }
                    // When animation is stopped for succedent animation starting,
                    // el.style.opacity might not be 1
                    else if (el.style.opacity !== 1) {
                        target.style = {opacity: 1};
                    }
                }

                // @ts-ignore
                animationWrap.add(el, target, duration, easing);
            });
        }, this);

        this._state = 'animating';

        animationWrap
            .done(bind(function () {
                this._state = 'ready';
                renderResult.renderFinally();
            }, this))
            .start();
    }

    /**
     * @private
     */
    _resetController(api: ExtensionAPI) {
        var controller = this._controller;

        // Init controller.
        if (!controller) {
            controller = this._controller = new RoamController(api.getZr());
            controller.enable(this.seriesModel.get('roam'));
            controller.on('pan', bind(this._onPan, this));
            controller.on('zoom', bind(this._onZoom, this));
        }

        var rect = new BoundingRect(0, 0, api.getWidth(), api.getHeight());
        controller.setPointerChecker(function (e, x, y) {
            return rect.contain(x, y);
        });
    }

    /**
     * @private
     */
    _clearController() {
        var controller = this._controller;
        if (controller) {
            controller.dispose();
            controller = null;
        }
    }

    /**
     * @private
     */
    _onPan(e: RoamEventParams['pan']) {
        if (this._state !== 'animating'
            && (Math.abs(e.dx) > DRAG_THRESHOLD || Math.abs(e.dy) > DRAG_THRESHOLD)
        ) {
            // These param must not be cached.
            var root = this.seriesModel.getData().tree.root;

            if (!root) {
                return;
            }

            var rootLayout = root.getLayout();

            if (!rootLayout) {
                return;
            }

            this.api.dispatchAction({
                type: 'treemapMove',
                from: this.uid,
                seriesId: this.seriesModel.id,
                rootRect: {
                    x: rootLayout.x + e.dx, y: rootLayout.y + e.dy,
                    width: rootLayout.width, height: rootLayout.height
                }
            });
        }
    }

    /**
     * @private
     */
    _onZoom(e: RoamEventParams['zoom']) {
        var mouseX = e.originX;
        var mouseY = e.originY;

        if (this._state !== 'animating') {
            // These param must not be cached.
            var root = this.seriesModel.getData().tree.root;

            if (!root) {
                return;
            }

            var rootLayout = root.getLayout();

            if (!rootLayout) {
                return;
            }

            var rect = new BoundingRect(
                rootLayout.x, rootLayout.y, rootLayout.width, rootLayout.height
            );
            var layoutInfo = this.seriesModel.layoutInfo;

            // Transform mouse coord from global to containerGroup.
            mouseX -= layoutInfo.x;
            mouseY -= layoutInfo.y;

            // Scale root bounding rect.
            var m = matrix.create();
            matrix.translate(m, m, [-mouseX, -mouseY]);
            matrix.scale(m, m, [e.scale, e.scale]);
            matrix.translate(m, m, [mouseX, mouseY]);

            rect.applyTransform(m);

            this.api.dispatchAction({
                type: 'treemapRender',
                from: this.uid,
                seriesId: this.seriesModel.id,
                rootRect: {
                    x: rect.x, y: rect.y,
                    width: rect.width, height: rect.height
                }
            });
        }
    }

    /**
     * @private
     */
    _initEvents(containerGroup: graphic.Group) {
        containerGroup.on('click', (e) => {
            if (this._state !== 'ready') {
                return;
            }

            var nodeClick = this.seriesModel.get('nodeClick', true);

            if (!nodeClick) {
                return;
            }

            var targetInfo = this.findTarget(e.offsetX, e.offsetY);

            if (!targetInfo) {
                return;
            }

            var node = targetInfo.node;
            if (node.getLayout().isLeafRoot) {
                this._rootToNode(targetInfo);
            }
            else {
                if (nodeClick === 'zoomToNode') {
                    this._zoomToNode(targetInfo);
                }
                else if (nodeClick === 'link') {
                    var itemModel = node.hostTree.data.getItemModel<TreeSeriesNodeItemOption>(node.dataIndex);
                    var link = itemModel.get('link', true);
                    var linkTarget = itemModel.get('target', true) || 'blank';
                    link && window.open(link, linkTarget);
                }
            }

        }, this);
    }

    /**
     * @private
     */
    _renderBreadcrumb(seriesModel: TreemapSeriesModel, api: ExtensionAPI, targetInfo: FoundTargetInfo) {
        if (!targetInfo) {
            targetInfo = seriesModel.get('leafDepth', true) != null
                ? {node: seriesModel.getViewRoot()}
                // FIXME
                // better way?
                // Find breadcrumb tail on center of containerGroup.
                : this.findTarget(api.getWidth() / 2, api.getHeight() / 2);

            if (!targetInfo) {
                targetInfo = {node: seriesModel.getData().tree.root};
            }
        }

        (this._breadcrumb || (this._breadcrumb = new Breadcrumb(this.group)))
            .render(seriesModel, api, targetInfo.node, (node) => {
                if (this._state !== 'animating') {
                    helper.aboveViewRoot(seriesModel.getViewRoot(), node)
                        ? this._rootToNode({node: node})
                        : this._zoomToNode({node: node});
                }
            });
    }

    /**
     * @override
     */
    remove() {
        this._clearController();
        this._containerGroup && this._containerGroup.removeAll();
        this._storage = createStorage() as RenderElementStorage;
        this._state = 'ready';
        this._breadcrumb && this._breadcrumb.remove();
    }

    dispose() {
        this._clearController();
    }

    /**
     * @private
     */
    _zoomToNode(targetInfo: FoundTargetInfo) {
        this.api.dispatchAction({
            type: 'treemapZoomToNode',
            from: this.uid,
            seriesId: this.seriesModel.id,
            targetNode: targetInfo.node
        });
    }

    /**
     * @private
     */
    _rootToNode(targetInfo: FoundTargetInfo) {
        this.api.dispatchAction({
            type: 'treemapRootToNode',
            from: this.uid,
            seriesId: this.seriesModel.id,
            targetNode: targetInfo.node
        });
    }

    /**
     * @public
     * @param {number} x Global coord x.
     * @param {number} y Global coord y.
     * @return {Object} info If not found, return undefined;
     * @return {number} info.node Target node.
     * @return {number} info.offsetX x refer to target node.
     * @return {number} info.offsetY y refer to target node.
     */
    findTarget(x: number, y: number): FoundTargetInfo {
        var targetInfo;
        var viewRoot = this.seriesModel.getViewRoot();

        viewRoot.eachNode({attr: 'viewChildren', order: 'preorder'}, function (node) {
            var bgEl = this._storage.background[node.getRawIndex()];
            // If invisible, there might be no element.
            if (bgEl) {
                var point = bgEl.transformCoordToLocal(x, y);
                var shape = bgEl.shape;

                // For performance consideration, dont use 'getBoundingRect'.
                if (shape.x <= point[0]
                    && point[0] <= shape.x + shape.width
                    && shape.y <= point[1]
                    && point[1] <= shape.y + shape.height
                ) {
                    targetInfo = {
                        node: node,
                        offsetX: point[0],
                        offsetY: point[1]
                    };
                }
                else {
                    return false; // Suppress visit subtree.
                }
            }
        }, this);

        return targetInfo;
    }
}

/**
 * @inner
 */
function createStorage(): RenderElementStorage | LastCfgStorage {
    return {
        nodeGroup: [],
        background: [],
        content: []
    };
}

/**
 * @inner
 * @return Return undefined means do not travel further.
 */
function renderNode(
    seriesModel: TreemapSeriesModel,
    thisStorage: RenderElementStorage,
    oldStorage: RenderElementStorage,
    reRoot: ReRoot,
    lastsForAnimation: RenderResult['lastsForAnimation'],
    willInvisibleEls: RenderResult['willInvisibleEls'],
    thisNode: TreeNode,
    oldNode: TreeNode,
    parentGroup: graphic.Group,
    depth: number
) {
    // Whether under viewRoot.
    if (!thisNode) {
        // Deleting nodes will be performed finally. This method just find
        // element from old storage, or create new element, set them to new
        // storage, and set styles.
        return;
    }

    // -------------------------------------------------------------------
    // Start of closure variables available in "Procedures in renderNode".

    var thisLayout = thisNode.getLayout();
    var data = seriesModel.getData();
    var nodeModel = thisNode.getModel<TreemapSeriesNodeItemOption>();

    // Only for enabling highlight/downplay. Clear firstly.
    // Because some node will not be rendered.
    data.setItemGraphicEl(thisNode.dataIndex, null);

    if (!thisLayout || !thisLayout.isInView) {
        return;
    }

    var thisWidth = thisLayout.width;
    var thisHeight = thisLayout.height;
    var borderWidth = thisLayout.borderWidth;
    var thisInvisible = thisLayout.invisible;

    var thisRawIndex = thisNode.getRawIndex();
    var oldRawIndex = oldNode && oldNode.getRawIndex();

    var thisViewChildren = thisNode.viewChildren;
    var upperHeight = thisLayout.upperHeight;
    var isParent = thisViewChildren && thisViewChildren.length;
    var itemStyleNormalModel = nodeModel.getModel('itemStyle');
    var itemStyleEmphasisModel = nodeModel.getModel(['emphasis', 'itemStyle']);

    // End of closure ariables available in "Procedures in renderNode".
    // -----------------------------------------------------------------

    // Node group
    var group = giveGraphic('nodeGroup', Group);

    if (!group) {
        return;
    }

    parentGroup.add(group);
    // x,y are not set when el is above view root.
    group.attr('position', [thisLayout.x || 0, thisLayout.y || 0]);
    inner(group).nodeWidth = thisWidth;
    inner(group).nodeHeight = thisHeight;

    if (thisLayout.isAboveViewRoot) {
        return group;
    }

    // Background
    var bg = giveGraphic('background', Rect, depth, Z_BG);
    bg && renderBackground(group, bg, isParent && thisLayout.upperHeight);

    // No children, render content.
    if (isParent) {
        // Because of the implementation about "traverse" in graphic hover style, we
        // can not set hover listener on the "group" of non-leaf node. Otherwise the
        // hover event from the descendents will be listenered.
        if (graphic.isHighDownDispatcher(group)) {
            graphic.setAsHighDownDispatcher(group, false);
        }
        if (bg) {
            graphic.setAsHighDownDispatcher(bg, true);
            // Only for enabling highlight/downplay.
            data.setItemGraphicEl(thisNode.dataIndex, bg);
        }
    }
    else {
        var content = giveGraphic('content', Rect, depth, Z_CONTENT);
        content && renderContent(group, content);

        if (bg && graphic.isHighDownDispatcher(bg)) {
            graphic.setAsHighDownDispatcher(bg, false);
        }
        graphic.setAsHighDownDispatcher(group, true);
        // Only for enabling highlight/downplay.
        data.setItemGraphicEl(thisNode.dataIndex, group);
    }

    return group;

    // ----------------------------
    // | Procedures in renderNode |
    // ----------------------------

    function renderBackground(group: graphic.Group, bg: graphic.Rect, useUpperLabel: boolean) {
        let ecData = graphic.getECData(bg);
        // For tooltip.
        ecData.dataIndex = thisNode.dataIndex;
        ecData.seriesIndex = seriesModel.seriesIndex;

        bg.setShape({x: 0, y: 0, width: thisWidth, height: thisHeight});

        if (thisInvisible) {
            // If invisible, do not set visual, otherwise the element will
            // change immediately before animation. We think it is OK to
            // remain its origin color when moving out of the view window.
            processInvisible(content);
        }
        else {
            var visualBorderColor = thisNode.getVisual('borderColor', true);
            var emphasisBorderColor = itemStyleEmphasisModel.get('borderColor');
            var normalStyle = getItemStyleNormal(itemStyleNormalModel);
            normalStyle.fill = visualBorderColor;
            var emphasisStyle = getItemStyleEmphasis(itemStyleEmphasisModel);
            emphasisStyle.fill = emphasisBorderColor;

            if (useUpperLabel) {
                var upperLabelWidth = thisWidth - 2 * borderWidth;

                prepareText(
                    normalStyle, emphasisStyle, visualBorderColor, upperLabelWidth, upperHeight,
                    {x: borderWidth, y: 0, width: upperLabelWidth, height: upperHeight}
                );
            }
            // For old bg.
            else {
                normalStyle.text = emphasisStyle.text = null;
            }

            bg.setStyle(normalStyle);
            graphic.setElementHoverStyle(bg, emphasisStyle);
        }

        group.add(bg);
    }

    function renderContent(group: graphic.Group, content: graphic.Rect) {
        let ecData = graphic.getECData(content);
        // For tooltip.
        ecData.dataIndex = thisNode.dataIndex;
        ecData.seriesIndex = seriesModel.seriesIndex;

        var contentWidth = Math.max(thisWidth - 2 * borderWidth, 0);
        var contentHeight = Math.max(thisHeight - 2 * borderWidth, 0);

        content.culling = true;
        content.setShape({
            x: borderWidth,
            y: borderWidth,
            width: contentWidth,
            height: contentHeight
        });

        if (thisInvisible) {
            // If invisible, do not set visual, otherwise the element will
            // change immediately before animation. We think it is OK to
            // remain its origin color when moving out of the view window.
            processInvisible(content);
        }
        else {
            var visualColor = thisNode.getVisual('color', true);
            var normalStyle = getItemStyleNormal(itemStyleNormalModel);
            normalStyle.fill = visualColor;
            var emphasisStyle = getItemStyleEmphasis(itemStyleEmphasisModel);

            prepareText(normalStyle, emphasisStyle, visualColor, contentWidth, contentHeight);

            content.setStyle(normalStyle);
            graphic.setElementHoverStyle(content, emphasisStyle);
        }

        group.add(content);
    }

    function processInvisible(element: graphic.Rect) {
        // Delay invisible setting utill animation finished,
        // avoid element vanish suddenly before animation.
        !element.invisible && willInvisibleEls.push(element);
    }

    function prepareText(
        normalStyle: StyleProps,
        emphasisStyle: StyleProps,
        visualColor: ColorString,
        width: number,
        height: number,
        upperLabelRect?: RectLike
    ) {
        var text = retrieve(
            seriesModel.getFormattedLabel(
                thisNode.dataIndex, 'normal', null, null, upperLabelRect ? 'upperLabel' : 'label'
            ),
            nodeModel.get('name')
        );
        if (!upperLabelRect && thisLayout.isLeafRoot) {
            var iconChar = seriesModel.get('drillDownIcon', true);
            text = iconChar ? iconChar + ' ' + text : text;
        }

        var normalLabelModel = nodeModel.getModel(
            upperLabelRect ? PATH_UPPERLABEL_NORMAL : PATH_LABEL_NOAMAL
        );
        var emphasisLabelModel = nodeModel.getModel(
            upperLabelRect ? PATH_UPPERLABEL_EMPHASIS : PATH_LABEL_EMPHASIS
        );

        var isShow = normalLabelModel.getShallow('show');

        graphic.setLabelStyle(
            normalStyle, emphasisStyle, normalLabelModel, emphasisLabelModel,
            {
                defaultText: isShow ? text : null,
                autoColor: visualColor,
                isRectText: true
            }
        );

        upperLabelRect && (normalStyle.textRect = clone(upperLabelRect));

        normalStyle.truncate = (isShow && normalLabelModel.get('ellipsis'))
            ? {
                outerWidth: width,
                outerHeight: height,
                minChar: 2
            }
            : null;
    }

    function giveGraphic<T extends graphic.Group | graphic.Rect>(
        storageName: keyof RenderElementStorage,
        Ctor: {new(): T},
        depth?: number,
        z?: number
    ): T {
        var element = oldRawIndex != null && oldStorage[storageName][oldRawIndex];
        var lasts = lastsForAnimation[storageName];

        if (element) {
            // Remove from oldStorage
            oldStorage[storageName][oldRawIndex] = null;
            prepareAnimationWhenHasOld(lasts, element);
        }
        // If invisible and no old element, do not create new element (for optimizing).
        else if (!thisInvisible) {
            element = new Ctor();
            if (element instanceof Displayable) {
                element.z = calculateZ(depth, z);
            }
            prepareAnimationWhenNoOld(lasts, element);
        }

        // Set to thisStorage
        return (thisStorage[storageName][thisRawIndex] = element) as T;
    }

    function prepareAnimationWhenHasOld(lasts: LastCfg[], element: graphic.Group | graphic.Rect) {
        var lastCfg = lasts[thisRawIndex] = {} as LastCfg;
        if (element instanceof Group) {
            lastCfg.oldPos = element.position.slice();
        }
        else {
            lastCfg.oldShape = extend({}, element.shape);
        }
    }

    // If a element is new, we need to find the animation start point carefully,
    // otherwise it will looks strange when 'zoomToNode'.
    function prepareAnimationWhenNoOld(lasts: LastCfg[], element: graphic.Group | graphic.Rect) {
        var lastCfg = lasts[thisRawIndex] = {} as LastCfg;
        var parentNode = thisNode.parentNode;
        var isGroup = element instanceof graphic.Group;

        if (parentNode && (!reRoot || reRoot.direction === 'drillDown')) {
            var parentOldX = 0;
            var parentOldY = 0;

            // New nodes appear from right-bottom corner in 'zoomToNode' animation.
            // For convenience, get old bounding rect from background.
            var parentOldBg = lastsForAnimation.background[parentNode.getRawIndex()];
            if (!reRoot && parentOldBg && parentOldBg.oldShape) {
                parentOldX = parentOldBg.oldShape.width;
                parentOldY = parentOldBg.oldShape.height;
            }

            // When no parent old shape found, its parent is new too,
            // so we can just use {x:0, y:0}.
            if (isGroup) {
                lastCfg.oldPos = [0, parentOldY];
            }
            else {
                lastCfg.oldShape = {x: parentOldX, y: parentOldY, width: 0, height: 0};
            }
        }

        // Fade in, user can be aware that these nodes are new.
        lastCfg.fadein = !isGroup;
    }

}

// We can not set all backgroud with the same z, Because the behaviour of
// drill down and roll up differ background creation sequence from tree
// hierarchy sequence, which cause that lowser background element overlap
// upper ones. So we calculate z based on depth.
// Moreover, we try to shrink down z interval to [0, 1] to avoid that
// treemap with large z overlaps other components.
function calculateZ(depth: number, zInLevel: number) {
    var zb = depth * Z_BASE + zInLevel;
    return (zb - 1) / zb;
}

ChartView.registerClass(TreemapView);
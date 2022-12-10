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

import {bind, each, indexOf, curry, extend, normalizeCssArray, isFunction} from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import {getECData} from '../../util/innerStore';
import {
    isHighDownDispatcher,
    setAsHighDownDispatcher,
    setDefaultStateProxy,
    enableHoverFocus,
    Z2_EMPHASIS_LIFT
} from '../../util/states';
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
import ExtensionAPI from '../../core/ExtensionAPI';
import Model from '../../model/Model';
import { LayoutRect } from '../../util/layout';
import { TreemapLayoutNode } from './treemapLayout';
import Element from 'zrender/src/Element';
import Displayable from 'zrender/src/graphic/Displayable';
import { makeInner, convertOptionIdName } from '../../util/model';
import { PathStyleProps, PathProps } from 'zrender/src/graphic/Path';
import { TreeSeriesNodeItemOption } from '../tree/TreeSeries';
import {
    TreemapRootToNodePayload,
    TreemapMovePayload,
    TreemapRenderPayload,
    TreemapZoomToNodePayload
} from './treemapAction';
import { ColorString, ECElement } from '../../util/types';
import { windowOpen } from '../../util/format';
import { TextStyleProps } from 'zrender/src/graphic/Text';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';

const Group = graphic.Group;
const Rect = graphic.Rect;

const DRAG_THRESHOLD = 3;
const PATH_LABEL_NOAMAL = 'label';
const PATH_UPPERLABEL_NORMAL = 'upperLabel';
// Should larger than emphasis states lift z
const Z2_BASE = Z2_EMPHASIS_LIFT * 10; // Should bigger than every z2.
const Z2_BG = Z2_EMPHASIS_LIFT * 2;
const Z2_CONTENT = Z2_EMPHASIS_LIFT * 3;

const getStateItemStyle = makeStyleMapper([
    ['fill', 'color'],
    // `borderColor` and `borderWidth` has been occupied,
    // so use `stroke` to indicate the stroke of the rect.
    ['stroke', 'strokeColor'],
    ['lineWidth', 'strokeWidth'],
    ['shadowBlur'],
    ['shadowOffsetX'],
    ['shadowOffsetY'],
    ['shadowColor']
    // Option decal is in `DecalObject` but style.decal is in `PatternObject`.
    // So do not transfer decal directly.
]);
const getItemStyleNormal = function (model: Model<TreemapSeriesNodeItemOption['itemStyle']>): PathStyleProps {
    // Normal style props should include emphasis style props.
    const itemStyle = getStateItemStyle(model) as PathStyleProps;
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
};

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
    oldX?: number
    oldY?: number
    oldShape?: graphic.Rect['shape']
    fadein: boolean
}

const inner = makeInner<{
    nodeWidth: number
    nodeHeight: number
    willDelete: boolean
}, Element>();

class TreemapView extends ChartView {

    static type = 'treemap';
    type = TreemapView.type;

    private _containerGroup: graphic.Group;
    private _breadcrumb: Breadcrumb;
    private _controller: RoamController;

    private _oldTree: Tree;

    private _state: 'ready' | 'animating' = 'ready';

    private _storage = createStorage() as RenderElementStorage;

    seriesModel: TreemapSeriesModel;
    api: ExtensionAPI;
    ecModel: GlobalModel;

    /**
     * @override
     */
    render(
        seriesModel: TreemapSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: TreemapZoomToNodePayload | TreemapRenderPayload | TreemapMovePayload | TreemapRootToNodePayload
    ) {

        const models = ecModel.findComponents({
            mainType: 'series', subType: 'treemap', query: payload
        });
        if (indexOf(models, seriesModel) < 0) {
            return;
        }

        this.seriesModel = seriesModel;
        this.api = api;
        this.ecModel = ecModel;

        const types = ['treemapZoomToNode', 'treemapRootToNode'];
        const targetInfo = helper
            .retrieveTargetInfo(payload, types, seriesModel);
        const payloadType = payload && payload.type;
        const layoutInfo = seriesModel.layoutInfo;
        const isInit = !this._oldTree;
        const thisStorage = this._storage;

        // Mark new root when action is treemapRootToNode.
        const reRoot = (payloadType === 'treemapRootToNode' && targetInfo && thisStorage)
            ? {
                rootNodeGroup: thisStorage.nodeGroup[targetInfo.node.getRawIndex()],
                direction: (payload as TreemapRootToNodePayload).direction
            }
            : null;

        const containerGroup = this._giveContainerGroup(layoutInfo);
        const hasAnimation = seriesModel.get('animation');

        const renderResult = this._doRender(containerGroup, seriesModel, reRoot);
        (
            hasAnimation && !isInit && (
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

    private _giveContainerGroup(layoutInfo: LayoutRect) {
        let containerGroup = this._containerGroup;
        if (!containerGroup) {
            // FIXME
            // 加一层containerGroup是为了clip，但是现在clip功能并没有实现。
            containerGroup = this._containerGroup = new Group();
            this._initEvents(containerGroup);
            this.group.add(containerGroup);
        }
        containerGroup.x = layoutInfo.x;
        containerGroup.y = layoutInfo.y;

        return containerGroup;
    }

    private _doRender(containerGroup: graphic.Group, seriesModel: TreemapSeriesModel, reRoot: ReRoot): RenderResult {
        const thisTree = seriesModel.getData().tree;
        const oldTree = this._oldTree;

        // Clear last shape records.
        const lastsForAnimation = createStorage() as LastCfgStorage;
        const thisStorage = createStorage() as RenderElementStorage;
        const oldStorage = this._storage;
        const willInvisibleEls: RenderResult['willInvisibleEls'] = [];

        function doRenderNode(thisNode: TreeNode, oldNode: TreeNode, parentGroup: graphic.Group, depth: number) {
            return renderNode(
                seriesModel,
                thisStorage, oldStorage, reRoot,
                lastsForAnimation, willInvisibleEls,
                thisNode, oldNode, parentGroup, depth
            );
        }

        // Notice: When thisTree and oldTree are the same tree (see list.cloneShallow),
        // the oldTree is actually losted, so we cannot find all of the old graphic
        // elements from tree. So we use this strategy: make element storage, move
        // from old storage to new storage, clear old storage.

        dualTravel(
            thisTree.root ? [thisTree.root] : [],
            (oldTree && oldTree.root) ? [oldTree.root] : [],
            containerGroup,
            thisTree === oldTree || !oldTree,
            0
        );

        // Process all removing.
        const willDeleteEls = clearStorage(oldStorage) as RenderElementStorage;

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
                const thisNode = newIndex != null ? thisViewChildren[newIndex] : null;
                const oldNode = oldIndex != null ? oldViewChildren[oldIndex] : null;

                const group = doRenderNode(thisNode, oldNode, parentGroup, depth);

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
            const willDeleteEls = createStorage() as RenderElementStorage;
            storage && each(storage, function (store, storageName) {
                const delEls = willDeleteEls[storageName];
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

    private _doAnimation(
        containerGroup: graphic.Group,
        renderResult: RenderResult,
        seriesModel: TreemapSeriesModel,
        reRoot: ReRoot
    ) {
        const durationOption = seriesModel.get('animationDurationUpdate');
        const easingOption = seriesModel.get('animationEasing');
        // TODO: do not support function until necessary.
        const duration = (isFunction(durationOption) ? 0 : durationOption) || 0;
        const easing = (isFunction(easingOption) ? null : easingOption) || 'cubicOut';
        const animationWrap = animationUtil.createWrap();

        // Make delete animations.
        each(renderResult.willDeleteEls, function (store, storageName) {
            each(store, function (el, rawIndex) {
                if ((el as Displayable).invisible) {
                    return;
                }

                const parent = el.parent; // Always has parent, and parent is nodeGroup.
                let target: PathProps;
                const innerStore = inner(parent);

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
                    let targetX = 0;
                    let targetY = 0;

                    if (!innerStore.willDelete) {
                        // Let node animate to right-bottom corner, cooperating with fadeout,
                        // which is appropriate for user understanding.
                        // Divided by 2 for reRoot rolling up effect.
                        targetX = innerStore.nodeWidth / 2;
                        targetY = innerStore.nodeHeight / 2;
                    }

                    target = storageName === 'nodeGroup'
                        ? {x: targetX, y: targetY, style: {opacity: 0}}
                        : {
                            shape: {x: targetX, y: targetY, width: 0, height: 0},
                            style: {opacity: 0}
                        };
                }

                // TODO: do not support delay until necessary.
                target && animationWrap.add(el, target, duration, 0, easing);
            });
        });

        // Make other animations
        each(this._storage, function (store, storageName) {
            each(store, function (el, rawIndex) {
                const last = renderResult.lastsForAnimation[storageName][rawIndex];
                const target: PathProps = {};

                if (!last) {
                    return;
                }

                if (el instanceof graphic.Group) {
                    if (last.oldX != null) {
                        target.x = el.x;
                        target.y = el.y;
                        el.x = last.oldX;
                        el.y = last.oldY;
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

                animationWrap.add(el, target, duration, 0, easing);
            });
        }, this);

        this._state = 'animating';

        animationWrap
            .finished(bind(function () {
                this._state = 'ready';
                renderResult.renderFinally();
            }, this))
            .start();
    }

    private _resetController(api: ExtensionAPI) {
        let controller = this._controller;

        // Init controller.
        if (!controller) {
            controller = this._controller = new RoamController(api.getZr());
            controller.enable(this.seriesModel.get('roam'));
            controller.on('pan', bind(this._onPan, this));
            controller.on('zoom', bind(this._onZoom, this));
        }

        const rect = new BoundingRect(0, 0, api.getWidth(), api.getHeight());
        controller.setPointerChecker(function (e, x, y) {
            return rect.contain(x, y);
        });
    }

    private _clearController() {
        let controller = this._controller;
        if (controller) {
            controller.dispose();
            controller = null;
        }
    }

    private _onPan(e: RoamEventParams['pan']) {
        if (this._state !== 'animating'
            && (Math.abs(e.dx) > DRAG_THRESHOLD || Math.abs(e.dy) > DRAG_THRESHOLD)
        ) {
            // These param must not be cached.
            const root = this.seriesModel.getData().tree.root;

            if (!root) {
                return;
            }

            const rootLayout = root.getLayout();

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
            } as TreemapMovePayload);
        }
    }

    private _onZoom(e: RoamEventParams['zoom']) {
        let mouseX = e.originX;
        let mouseY = e.originY;

        if (this._state !== 'animating') {
            // These param must not be cached.
            const root = this.seriesModel.getData().tree.root;

            if (!root) {
                return;
            }

            const rootLayout = root.getLayout();

            if (!rootLayout) {
                return;
            }

            const rect = new BoundingRect(
                rootLayout.x, rootLayout.y, rootLayout.width, rootLayout.height
            );
            const layoutInfo = this.seriesModel.layoutInfo;

            // Transform mouse coord from global to containerGroup.
            mouseX -= layoutInfo.x;
            mouseY -= layoutInfo.y;

            // Scale root bounding rect.
            const m = matrix.create();
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
            } as TreemapRenderPayload);
        }
    }

    private _initEvents(containerGroup: graphic.Group) {
        containerGroup.on('click', (e) => {
            if (this._state !== 'ready') {
                return;
            }

            const nodeClick = this.seriesModel.get('nodeClick', true);

            if (!nodeClick) {
                return;
            }

            const targetInfo = this.findTarget(e.offsetX, e.offsetY);

            if (!targetInfo) {
                return;
            }

            const node = targetInfo.node;
            if (node.getLayout().isLeafRoot) {
                this._rootToNode(targetInfo);
            }
            else {
                if (nodeClick === 'zoomToNode') {
                    this._zoomToNode(targetInfo);
                }
                else if (nodeClick === 'link') {
                    const itemModel = node.hostTree.data.getItemModel<TreeSeriesNodeItemOption>(node.dataIndex);
                    const link = itemModel.get('link', true);
                    const linkTarget = itemModel.get('target', true) || 'blank';
                    link && windowOpen(link, linkTarget);
                }
            }

        }, this);
    }

    private _renderBreadcrumb(seriesModel: TreemapSeriesModel, api: ExtensionAPI, targetInfo: FoundTargetInfo) {
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

    private _zoomToNode(targetInfo: FoundTargetInfo) {
        this.api.dispatchAction({
            type: 'treemapZoomToNode',
            from: this.uid,
            seriesId: this.seriesModel.id,
            targetNode: targetInfo.node
        });
    }

    private _rootToNode(targetInfo: FoundTargetInfo) {
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
        let targetInfo;
        const viewRoot = this.seriesModel.getViewRoot();

        viewRoot.eachNode({attr: 'viewChildren', order: 'preorder'}, function (node) {
            const bgEl = this._storage.background[node.getRawIndex()];
            // If invisible, there might be no element.
            if (bgEl) {
                const point = bgEl.transformCoordToLocal(x, y);
                const shape = bgEl.shape;

                // For performance consideration, don't use 'getBoundingRect'.
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

    const thisLayout = thisNode.getLayout();
    const data = seriesModel.getData();
    const nodeModel = thisNode.getModel<TreemapSeriesNodeItemOption>();

    // Only for enabling highlight/downplay. Clear firstly.
    // Because some node will not be rendered.
    data.setItemGraphicEl(thisNode.dataIndex, null);

    if (!thisLayout || !thisLayout.isInView) {
        return;
    }

    const thisWidth = thisLayout.width;
    const thisHeight = thisLayout.height;
    const borderWidth = thisLayout.borderWidth;
    const thisInvisible = thisLayout.invisible;

    const thisRawIndex = thisNode.getRawIndex();
    const oldRawIndex = oldNode && oldNode.getRawIndex();

    const thisViewChildren = thisNode.viewChildren;
    const upperHeight = thisLayout.upperHeight;
    const isParent = thisViewChildren && thisViewChildren.length;
    const itemStyleNormalModel = nodeModel.getModel('itemStyle');
    const itemStyleEmphasisModel = nodeModel.getModel(['emphasis', 'itemStyle']);
    const itemStyleBlurModel = nodeModel.getModel(['blur', 'itemStyle']);
    const itemStyleSelectModel = nodeModel.getModel(['select', 'itemStyle']);
    const borderRadius = itemStyleNormalModel.get('borderRadius') || 0;

    // End of closure ariables available in "Procedures in renderNode".
    // -----------------------------------------------------------------

    // Node group
    const group = giveGraphic('nodeGroup', Group);

    if (!group) {
        return;
    }

    parentGroup.add(group);
    // x,y are not set when el is above view root.
    group.x = thisLayout.x || 0;
    group.y = thisLayout.y || 0;
    group.markRedraw();
    inner(group).nodeWidth = thisWidth;
    inner(group).nodeHeight = thisHeight;

    if (thisLayout.isAboveViewRoot) {
        return group;
    }

    // Background
    const bg = giveGraphic('background', Rect, depth, Z2_BG);
    bg && renderBackground(group, bg, isParent && thisLayout.upperLabelHeight);

    const emphasisModel = nodeModel.getModel('emphasis');
    const focus = emphasisModel.get('focus');
    const blurScope = emphasisModel.get('blurScope');
    const isDisabled = emphasisModel.get('disabled');

    const focusOrIndices =
        focus === 'ancestor' ? thisNode.getAncestorsIndices()
        : focus === 'descendant' ? thisNode.getDescendantIndices()
        : focus;

    // No children, render content.
    if (isParent) {
        // Because of the implementation about "traverse" in graphic hover style, we
        // can not set hover listener on the "group" of non-leaf node. Otherwise the
        // hover event from the descendents will be listenered.
        if (isHighDownDispatcher(group)) {
            setAsHighDownDispatcher(group, false);
        }
        if (bg) {
            setAsHighDownDispatcher(bg, !isDisabled);
            // Only for enabling highlight/downplay.
            data.setItemGraphicEl(thisNode.dataIndex, bg);

            enableHoverFocus(bg, focusOrIndices, blurScope);
        }
    }
    else {
        const content = giveGraphic('content', Rect, depth, Z2_CONTENT);
        content && renderContent(group, content);

        (bg as ECElement).disableMorphing = true;

        if (bg && isHighDownDispatcher(bg)) {
            setAsHighDownDispatcher(bg, false);
        }
        setAsHighDownDispatcher(group, !isDisabled);
        // Only for enabling highlight/downplay.
        data.setItemGraphicEl(thisNode.dataIndex, group);

        enableHoverFocus(group, focusOrIndices, blurScope);
    }

    return group;

    // ----------------------------
    // | Procedures in renderNode |
    // ----------------------------

    function renderBackground(group: graphic.Group, bg: graphic.Rect, useUpperLabel: boolean) {
        const ecData = getECData(bg);
        // For tooltip.
        ecData.dataIndex = thisNode.dataIndex;
        ecData.seriesIndex = seriesModel.seriesIndex;

        bg.setShape({x: 0, y: 0, width: thisWidth, height: thisHeight, r: borderRadius});

        if (thisInvisible) {
            // If invisible, do not set visual, otherwise the element will
            // change immediately before animation. We think it is OK to
            // remain its origin color when moving out of the view window.
            processInvisible(bg);
        }
        else {
            bg.invisible = false;
            const style = thisNode.getVisual('style') as PathStyleProps;
            const visualBorderColor = style.stroke;
            const normalStyle = getItemStyleNormal(itemStyleNormalModel);
            normalStyle.fill = visualBorderColor;
            const emphasisStyle = getStateItemStyle(itemStyleEmphasisModel);
            emphasisStyle.fill = itemStyleEmphasisModel.get('borderColor');
            const blurStyle = getStateItemStyle(itemStyleBlurModel);
            blurStyle.fill = itemStyleBlurModel.get('borderColor');
            const selectStyle = getStateItemStyle(itemStyleSelectModel);
            selectStyle.fill = itemStyleSelectModel.get('borderColor');

            if (useUpperLabel) {
                const upperLabelWidth = thisWidth - 2 * borderWidth;

                prepareText(
                    // PENDING: convert ZRColor to ColorString for text.
                    bg, visualBorderColor as ColorString, style.opacity,
                    {x: borderWidth, y: 0, width: upperLabelWidth, height: upperHeight}
                );
            }
            // For old bg.
            else {
                bg.removeTextContent();
            }

            bg.setStyle(normalStyle);

            bg.ensureState('emphasis').style = emphasisStyle;
            bg.ensureState('blur').style = blurStyle;
            bg.ensureState('select').style = selectStyle;
            setDefaultStateProxy(bg);
        }

        group.add(bg);
    }

    function renderContent(group: graphic.Group, content: graphic.Rect) {
        const ecData = getECData(content);
        // For tooltip.
        ecData.dataIndex = thisNode.dataIndex;
        ecData.seriesIndex = seriesModel.seriesIndex;

        const contentWidth = Math.max(thisWidth - 2 * borderWidth, 0);
        const contentHeight = Math.max(thisHeight - 2 * borderWidth, 0);

        content.culling = true;
        content.setShape({
            x: borderWidth,
            y: borderWidth,
            width: contentWidth,
            height: contentHeight,
            r: borderRadius
        });

        if (thisInvisible) {
            // If invisible, do not set visual, otherwise the element will
            // change immediately before animation. We think it is OK to
            // remain its origin color when moving out of the view window.
            processInvisible(content);
        }
        else {
            content.invisible = false;
            const nodeStyle = thisNode.getVisual('style') as PathStyleProps;
            const visualColor = nodeStyle.fill;
            const normalStyle = getItemStyleNormal(itemStyleNormalModel);
            normalStyle.fill = visualColor;
            normalStyle.decal = nodeStyle.decal;
            const emphasisStyle = getStateItemStyle(itemStyleEmphasisModel);
            const blurStyle = getStateItemStyle(itemStyleBlurModel);
            const selectStyle = getStateItemStyle(itemStyleSelectModel);

            // PENDING: convert ZRColor to ColorString for text.
            prepareText(content, visualColor as ColorString, nodeStyle.opacity, null);

            content.setStyle(normalStyle);
            content.ensureState('emphasis').style = emphasisStyle;
            content.ensureState('blur').style = blurStyle;
            content.ensureState('select').style = selectStyle;
            setDefaultStateProxy(content);
        }

        group.add(content);
    }

    function processInvisible(element: graphic.Rect) {
        // Delay invisible setting utill animation finished,
        // avoid element vanish suddenly before animation.
        !element.invisible && willInvisibleEls.push(element);
    }

    function prepareText(
        rectEl: graphic.Rect,
        visualColor: ColorString,
        visualOpacity: number,
        // Can be null/undefined
        upperLabelRect: RectLike
    ) {
        const normalLabelModel = nodeModel.getModel(
            upperLabelRect ? PATH_UPPERLABEL_NORMAL : PATH_LABEL_NOAMAL
        );

        const defaultText = convertOptionIdName(nodeModel.get('name'), null);

        const isShow = normalLabelModel.getShallow('show');

        setLabelStyle(
            rectEl,
            getLabelStatesModels(nodeModel, upperLabelRect ? PATH_UPPERLABEL_NORMAL : PATH_LABEL_NOAMAL),
            {
                defaultText: isShow ? defaultText : null,
                inheritColor: visualColor,
                defaultOpacity: visualOpacity,
                labelFetcher: seriesModel,
                labelDataIndex: thisNode.dataIndex
            }
        );

        const textEl = rectEl.getTextContent();
        if (!textEl) {
            return;
        }
        const textStyle = textEl.style;
        const textPadding = normalizeCssArray(textStyle.padding || 0);

        if (upperLabelRect) {
            rectEl.setTextConfig({
                layoutRect: upperLabelRect
            });
            (textEl as ECElement).disableLabelLayout = true;
        }
        textEl.beforeUpdate = function () {
            const width = Math.max(
                (upperLabelRect ? upperLabelRect.width : rectEl.shape.width) - textPadding[1] - textPadding[3], 0
            );
            const height = Math.max(
                (upperLabelRect ? upperLabelRect.height : rectEl.shape.height) - textPadding[0] - textPadding[2], 0
            );
            if (textStyle.width !== width || textStyle.height !== height) {
                textEl.setStyle({
                    width,
                    height
                });
            }
        };

        textStyle.truncateMinChar = 2;
        textStyle.lineOverflow = 'truncate';

        addDrillDownIcon(textStyle, upperLabelRect, thisLayout);
        const textEmphasisState = textEl.getState('emphasis');
        addDrillDownIcon(textEmphasisState ? textEmphasisState.style : null, upperLabelRect, thisLayout);
    }

    function addDrillDownIcon(style: TextStyleProps, upperLabelRect: RectLike, thisLayout: any) {
        const text = style ? style.text : null;
        if (!upperLabelRect && thisLayout.isLeafRoot && text != null) {
            const iconChar = seriesModel.get('drillDownIcon', true);
            style.text = iconChar ? iconChar + ' ' + text : text;
        }
    }

    function giveGraphic<T extends graphic.Group | graphic.Rect>(
        storageName: keyof RenderElementStorage,
        Ctor: {new(): T},
        depth?: number,
        z?: number
    ): T {
        let element = oldRawIndex != null && oldStorage[storageName][oldRawIndex];
        const lasts = lastsForAnimation[storageName];

        if (element) {
            // Remove from oldStorage
            oldStorage[storageName][oldRawIndex] = null;
            prepareAnimationWhenHasOld(lasts, element);
        }
        // If invisible and no old element, do not create new element (for optimizing).
        else if (!thisInvisible) {
            element = new Ctor();
            if (element instanceof Displayable) {
                element.z2 = calculateZ2(depth, z);
            }
            prepareAnimationWhenNoOld(lasts, element);
        }

        // Set to thisStorage
        return (thisStorage[storageName][thisRawIndex] = element) as T;
    }

    function prepareAnimationWhenHasOld(lasts: LastCfg[], element: graphic.Group | graphic.Rect) {
        const lastCfg = lasts[thisRawIndex] = {} as LastCfg;
        if (element instanceof Group) {
            lastCfg.oldX = element.x;
            lastCfg.oldY = element.y;
        }
        else {
            lastCfg.oldShape = extend({}, element.shape);
        }
    }

    // If a element is new, we need to find the animation start point carefully,
    // otherwise it will looks strange when 'zoomToNode'.
    function prepareAnimationWhenNoOld(lasts: LastCfg[], element: graphic.Group | graphic.Rect) {
        const lastCfg = lasts[thisRawIndex] = {} as LastCfg;
        const parentNode = thisNode.parentNode;
        const isGroup = element instanceof graphic.Group;

        if (parentNode && (!reRoot || reRoot.direction === 'drillDown')) {
            let parentOldX = 0;
            let parentOldY = 0;

            // New nodes appear from right-bottom corner in 'zoomToNode' animation.
            // For convenience, get old bounding rect from background.
            const parentOldBg = lastsForAnimation.background[parentNode.getRawIndex()];
            if (!reRoot && parentOldBg && parentOldBg.oldShape) {
                parentOldX = parentOldBg.oldShape.width;
                parentOldY = parentOldBg.oldShape.height;
            }

            // When no parent old shape found, its parent is new too,
            // so we can just use {x:0, y:0}.
            if (isGroup) {
                lastCfg.oldX = 0;
                lastCfg.oldY = parentOldY;
            }
            else {
                lastCfg.oldShape = {x: parentOldX, y: parentOldY, width: 0, height: 0};
            }
        }

        // Fade in, user can be aware that these nodes are new.
        lastCfg.fadein = !isGroup;
    }

}

// We cannot set all background with the same z, because the behaviour of
// drill down and roll up differ background creation sequence from tree
// hierarchy sequence, which cause lower background elements to overlap
// upper ones. So we calculate z based on depth.
// Moreover, we try to shrink down z interval to [0, 1] to avoid that
// treemap with large z overlaps other components.
function calculateZ2(depth: number, z2InLevel: number) {
    return depth * Z2_BASE + z2InLevel;
}

export default TreemapView;

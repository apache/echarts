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
import * as graphic from '../../util/graphic';
import DataDiffer from '../../data/DataDiffer';
import * as helper from '../helper/treeHelper';
import Breadcrumb from './Breadcrumb';
import RoamController from '../../component/helper/RoamController';
import BoundingRect from 'zrender/src/core/BoundingRect';
import * as matrix from 'zrender/src/core/matrix';
import * as animationUtil from '../../util/animation';
import makeStyleMapper from '../../model/mixin/makeStyleMapper';

var bind = zrUtil.bind;
var Group = graphic.Group;
var Rect = graphic.Rect;
var each = zrUtil.each;

var DRAG_THRESHOLD = 3;
var PATH_LABEL_NOAMAL = ['label'];
var PATH_LABEL_EMPHASIS = ['emphasis', 'label'];
var PATH_UPPERLABEL_NORMAL = ['upperLabel'];
var PATH_UPPERLABEL_EMPHASIS = ['emphasis', 'upperLabel'];
var Z_BASE = 10; // Should bigger than every z.
var Z_BG = 1;
var Z_CONTENT = 2;

var getItemStyleEmphasis = makeStyleMapper([
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
var getItemStyleNormal = function (model) {
    // Normal style props should include emphasis style props.
    var itemStyle = getItemStyleEmphasis(model);
    // Clear styles set by emphasis.
    itemStyle.stroke = itemStyle.fill = itemStyle.lineWidth = null;
    return itemStyle;
};

export default echarts.extendChartView({

    type: 'treemap',

    /**
     * @override
     */
    init: function (o, api) {

        /**
         * @private
         * @type {module:zrender/container/Group}
         */
        this._containerGroup;

        /**
         * @private
         * @type {Object.<string, Array.<module:zrender/container/Group>>}
         */
        this._storage = createStorage();

        /**
         * @private
         * @type {module:echarts/data/Tree}
         */
        this._oldTree;

        /**
         * @private
         * @type {module:echarts/chart/treemap/Breadcrumb}
         */
        this._breadcrumb;

        /**
         * @private
         * @type {module:echarts/component/helper/RoamController}
         */
        this._controller;

        /**
         * 'ready', 'animating'
         * @private
         */
        this._state = 'ready';
    },

    /**
     * @override
     */
    render: function (seriesModel, ecModel, api, payload) {

        var models = ecModel.findComponents({
            mainType: 'series', subType: 'treemap', query: payload
        });
        if (zrUtil.indexOf(models, seriesModel) < 0) {
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
                direction: payload.direction
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
    },

    /**
     * @private
     */
    _giveContainerGroup: function (layoutInfo) {
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
    },

    /**
     * @private
     */
    _doRender: function (containerGroup, seriesModel, reRoot) {
        var thisTree = seriesModel.getData().tree;
        var oldTree = this._oldTree;

        // Clear last shape records.
        var lastsForAnimation = createStorage();
        var thisStorage = createStorage();
        var oldStorage = this._storage;
        var willInvisibleEls = [];

        var doRenderNode = zrUtil.curry(
            renderNode, seriesModel,
            thisStorage, oldStorage, reRoot,
            lastsForAnimation, willInvisibleEls
        );

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
        var willDeleteEls = clearStorage(oldStorage);

        this._oldTree = thisTree;
        this._storage = thisStorage;

        return {
            lastsForAnimation: lastsForAnimation,
            willDeleteEls: willDeleteEls,
            renderFinally: renderFinally
        };

        function dualTravel(thisViewChildren, oldViewChildren, parentGroup, sameTree, depth) {
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
                    .remove(zrUtil.curry(processNode, null))
                    .execute();
            }

            function getKey(node) {
                // Identify by name or raw index.
                return node.getId();
            }

            function processNode(newIndex, oldIndex) {
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

        function clearStorage(storage) {
            var willDeleteEls = createStorage();
            storage && each(storage, function (store, storageName) {
                var delEls = willDeleteEls[storageName];
                each(store, function (el) {
                    el && (delEls.push(el), el.__tmWillDelete = 1);
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
    },

    /**
     * @private
     */
    _doAnimation: function (containerGroup, renderResult, seriesModel, reRoot) {
        if (!seriesModel.get('animation')) {
            return;
        }

        var duration = seriesModel.get('animationDurationUpdate');
        var easing = seriesModel.get('animationEasing');
        var animationWrap = animationUtil.createWrap();

        // Make delete animations.
        each(renderResult.willDeleteEls, function (store, storageName) {
            each(store, function (el, rawIndex) {
                if (el.invisible) {
                    return;
                }

                var parent = el.parent; // Always has parent, and parent is nodeGroup.
                var target;

                if (reRoot && reRoot.direction === 'drillDown') {
                    target = parent === reRoot.rootNodeGroup
                        // This is the content element of view root.
                        // Only `content` will enter this branch, because
                        // `background` and `nodeGroup` will not be deleted.
                        ? {
                            shape: {
                                x: 0,
                                y: 0,
                                width: parent.__tmNodeWidth,
                                height: parent.__tmNodeHeight
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

                    if (!parent.__tmWillDelete) {
                        // Let node animate to right-bottom corner, cooperating with fadeout,
                        // which is appropriate for user understanding.
                        // Divided by 2 for reRoot rolling up effect.
                        targetX = parent.__tmNodeWidth / 2;
                        targetY = parent.__tmNodeHeight / 2;
                    }

                    target = storageName === 'nodeGroup'
                        ? {position: [targetX, targetY], style: {opacity: 0}}
                        : {
                            shape: {x: targetX, y: targetY, width: 0, height: 0},
                            style: {opacity: 0}
                        };
                }

                target && animationWrap.add(el, target, duration, easing);
            });
        });

        // Make other animations
        each(this._storage, function (store, storageName) {
            each(store, function (el, rawIndex) {
                var last = renderResult.lastsForAnimation[storageName][rawIndex];
                var target = {};

                if (!last) {
                    return;
                }

                if (storageName === 'nodeGroup') {
                    if (last.old) {
                        target.position = el.position.slice();
                        el.attr('position', last.old);
                    }
                }
                else {
                    if (last.old) {
                        target.shape = zrUtil.extend({}, el.shape);
                        el.setShape(last.old);
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
    },

    /**
     * @private
     */
    _resetController: function (api) {
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
    },

    /**
     * @private
     */
    _clearController: function () {
        var controller = this._controller;
        if (controller) {
            controller.dispose();
            controller = null;
        }
    },

    /**
     * @private
     */
    _onPan: function (e) {
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
    },

    /**
     * @private
     */
    _onZoom: function (e) {
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
    },

    /**
     * @private
     */
    _initEvents: function (containerGroup) {
        containerGroup.on('click', function (e) {
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
                    var itemModel = node.hostTree.data.getItemModel(node.dataIndex);
                    var link = itemModel.get('link', true);
                    var linkTarget = itemModel.get('target', true) || 'blank';
                    link && window.open(link, linkTarget);
                }
            }

        }, this);
    },

    /**
     * @private
     */
    _renderBreadcrumb: function (seriesModel, api, targetInfo) {
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
            .render(seriesModel, api, targetInfo.node, bind(onSelect, this));

        function onSelect(node) {
            if (this._state !== 'animating') {
                helper.aboveViewRoot(seriesModel.getViewRoot(), node)
                    ? this._rootToNode({node: node})
                    : this._zoomToNode({node: node});
            }
        }
    },

    /**
     * @override
     */
    remove: function () {
        this._clearController();
        this._containerGroup && this._containerGroup.removeAll();
        this._storage = createStorage();
        this._state = 'ready';
        this._breadcrumb && this._breadcrumb.remove();
    },

    dispose: function () {
        this._clearController();
    },

    /**
     * @private
     */
    _zoomToNode: function (targetInfo) {
        this.api.dispatchAction({
            type: 'treemapZoomToNode',
            from: this.uid,
            seriesId: this.seriesModel.id,
            targetNode: targetInfo.node
        });
    },

    /**
     * @private
     */
    _rootToNode: function (targetInfo) {
        this.api.dispatchAction({
            type: 'treemapRootToNode',
            from: this.uid,
            seriesId: this.seriesModel.id,
            targetNode: targetInfo.node
        });
    },

    /**
     * @public
     * @param {number} x Global coord x.
     * @param {number} y Global coord y.
     * @return {Object} info If not found, return undefined;
     * @return {number} info.node Target node.
     * @return {number} info.offsetX x refer to target node.
     * @return {number} info.offsetY y refer to target node.
     */
    findTarget: function (x, y) {
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
                    targetInfo = {node: node, offsetX: point[0], offsetY: point[1]};
                }
                else {
                    return false; // Suppress visit subtree.
                }
            }
        }, this);

        return targetInfo;
    }

});

/**
 * @inner
 */
function createStorage() {
    return {nodeGroup: [], background: [], content: []};
}

/**
 * @inner
 * @return Return undefined means do not travel further.
 */
function renderNode(
    seriesModel, thisStorage, oldStorage, reRoot,
    lastsForAnimation, willInvisibleEls,
    thisNode, oldNode, parentGroup, depth
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
    var itemStyleNormalModel = thisNode.getModel('itemStyle');
    var itemStyleEmphasisModel = thisNode.getModel('emphasis.itemStyle');

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
    group.__tmNodeWidth = thisWidth;
    group.__tmNodeHeight = thisHeight;

    if (thisLayout.isAboveViewRoot) {
        return group;
    }

    var nodeModel = thisNode.getModel();

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

    function renderBackground(group, bg, useUpperLabel) {
        // For tooltip.
        bg.dataIndex = thisNode.dataIndex;
        bg.seriesIndex = seriesModel.seriesIndex;

        bg.setShape({x: 0, y: 0, width: thisWidth, height: thisHeight});

        if (thisInvisible) {
            // If invisible, do not set visual, otherwise the element will
            // change immediately before animation. We think it is OK to
            // remain its origin color when moving out of the view window.
            processInvisible(bg);
        }
        else {
            bg.invisible = false;
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

    function renderContent(group, content) {
        // For tooltip.
        content.dataIndex = thisNode.dataIndex;
        content.seriesIndex = seriesModel.seriesIndex;

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
            content.invisible = false;
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

    function processInvisible(element) {
        // Delay invisible setting utill animation finished,
        // avoid element vanish suddenly before animation.
        !element.invisible && willInvisibleEls.push(element);
    }

    function prepareText(normalStyle, emphasisStyle, visualColor, width, height, upperLabelRect) {
        var text = zrUtil.retrieve(
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

        upperLabelRect && (normalStyle.textRect = zrUtil.clone(upperLabelRect));

        normalStyle.truncate = (isShow && normalLabelModel.get('ellipsis'))
            ? {
                outerWidth: width,
                outerHeight: height,
                minChar: 2
            }
            : null;
    }

    function giveGraphic(storageName, Ctor, depth, z) {
        var element = oldRawIndex != null && oldStorage[storageName][oldRawIndex];
        var lasts = lastsForAnimation[storageName];

        if (element) {
            // Remove from oldStorage
            oldStorage[storageName][oldRawIndex] = null;
            prepareAnimationWhenHasOld(lasts, element, storageName);
        }
        // If invisible and no old element, do not create new element (for optimizing).
        else if (!thisInvisible) {
            element = new Ctor({z: calculateZ(depth, z)});
            element.__tmDepth = depth;
            element.__tmStorageName = storageName;
            prepareAnimationWhenNoOld(lasts, element, storageName);
        }

        // Set to thisStorage
        return (thisStorage[storageName][thisRawIndex] = element);
    }

    function prepareAnimationWhenHasOld(lasts, element, storageName) {
        var lastCfg = lasts[thisRawIndex] = {};
        lastCfg.old = storageName === 'nodeGroup'
            ? element.position.slice()
            : zrUtil.extend({}, element.shape);
    }

    // If a element is new, we need to find the animation start point carefully,
    // otherwise it will looks strange when 'zoomToNode'.
    function prepareAnimationWhenNoOld(lasts, element, storageName) {
        var lastCfg = lasts[thisRawIndex] = {};
        var parentNode = thisNode.parentNode;

        if (parentNode && (!reRoot || reRoot.direction === 'drillDown')) {
            var parentOldX = 0;
            var parentOldY = 0;

            // New nodes appear from right-bottom corner in 'zoomToNode' animation.
            // For convenience, get old bounding rect from background.
            var parentOldBg = lastsForAnimation.background[parentNode.getRawIndex()];
            if (!reRoot && parentOldBg && parentOldBg.old) {
                parentOldX = parentOldBg.old.width;
                parentOldY = parentOldBg.old.height;
            }

            // When no parent old shape found, its parent is new too,
            // so we can just use {x:0, y:0}.
            lastCfg.old = storageName === 'nodeGroup'
                ? [0, parentOldY]
                : {x: parentOldX, y: parentOldY, width: 0, height: 0};
        }

        // Fade in, user can be aware that these nodes are new.
        lastCfg.fadein = storageName !== 'nodeGroup';
    }

}

// We can not set all backgroud with the same z, Because the behaviour of
// drill down and roll up differ background creation sequence from tree
// hierarchy sequence, which cause that lowser background element overlap
// upper ones. So we calculate z based on depth.
// Moreover, we try to shrink down z interval to [0, 1] to avoid that
// treemap with large z overlaps other components.
function calculateZ(depth, zInLevel) {
    var zb = depth * Z_BASE + zInLevel;
    return (zb - 1) / zb;
}

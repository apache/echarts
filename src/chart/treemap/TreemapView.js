 define(function(require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var DataDiffer = require('../../data/DataDiffer');
    var helper = require('./helper');
    var Breadcrumb = require('./Breadcrumb');
    var RoamController = require('../../component/helper/RoamController');
    var BoundingRect = require('zrender/core/BoundingRect');
    var matrix = require('zrender/core/matrix');
    var animationUtil = require('../../util/animation');
    var bind = zrUtil.bind;
    var Group = graphic.Group;
    var Rect = graphic.Rect;
    var each = zrUtil.each;

    var DRAG_THRESHOLD = 3;

    return require('../../echarts').extendChartView({

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

            /**
             * @private
             * @type {boolean}
             */
            this._mayClick;
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

            var targetInfo = helper.retrieveTargetInfo(payload, seriesModel);
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
            containerGroup.position = [layoutInfo.x, layoutInfo.y];

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
            var willVisibleEls = [];
            var willDeleteEls = [];
            var renderNode = bind(
                this._renderNode, this,
                thisStorage, oldStorage, reRoot,
                lastsForAnimation, willInvisibleEls, willVisibleEls
            );
            var viewRoot = seriesModel.getViewRoot();
            var viewPath = helper.getPathToRoot(viewRoot);

            // Notice: when thisTree and oldTree are the same tree (see list.cloneShadow),
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

            function dualTravel(thisViewChildren, oldViewChildren, parentGroup, sameTree, viewPathIndex) {
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

                    // Whether under viewRoot.
                    if (!thisNode
                        || isNaN(viewPathIndex)
                        || (viewPathIndex < viewPath.length && viewPath[viewPathIndex] !== thisNode)
                    ) {
                        // Deleting nodes will be performed finally. This method just find
                        // element from old storage, or create new element, set them to new
                        // storage, and set styles.
                        return;
                    }

                    var group = renderNode(thisNode, oldNode, parentGroup);

                    group && dualTravel(
                        thisNode && thisNode.viewChildren || [],
                        oldNode && oldNode.viewChildren || [],
                        group,
                        sameTree,
                        viewPathIndex + 1
                    );
                }
            }

            function clearStorage(storage) {
                var willDeleteEls = createStorage();
                storage && each(storage, function (store, storageName) {
                    var delEls = willDeleteEls[storageName];
                    each(store, function (el) {
                        el && (delEls.push(el), el.__tmWillDelete = storageName);
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
                // Theoritically there is no intersection between willInvisibleEls
                // and willVisibleEls have, but we set visible after for robustness.
                each(willInvisibleEls, function (el) {
                    el.invisible = true;
                    // Setting invisible is for optimizing, so no need to set dirty,
                    // just mark as invisible.
                    el.dirty();
                });
                each(willVisibleEls, function (el) {
                    el.invisible = false;
                    el.__tmWillVisible = false;
                    el.dirty();
                });
            }
        },

        /**
         * @private
         */
        _renderNode: function (
            thisStorage, oldStorage, reRoot,
            lastsForAnimation, willInvisibleEls, willVisibleEls,
            thisNode, oldNode, parentGroup
        ) {
            var thisRawIndex = thisNode && thisNode.getRawIndex();
            var oldRawIndex = oldNode && oldNode.getRawIndex();

            var layout = thisNode.getLayout();
            var thisWidth = layout.width;
            var thisHeight = layout.height;
            var invisible = layout.invisible;

            // Node group
            var group = giveGraphic('nodeGroup', Group);
            if (!group) {
                return;
            }
            parentGroup.add(group);
            group.position = [layout.x, layout.y];
            group.__tmNodeWidth = thisWidth;
            group.__tmNodeHeight = thisHeight;

            // Background
            var bg = giveGraphic('background', Rect, 0);
            if (bg) {
                bg.setShape({x: 0, y: 0, width: thisWidth, height: thisHeight});
                updateStyle(bg, {fill: thisNode.getVisual('borderColor', true)});
                group.add(bg);
            }

            var thisViewChildren = thisNode.viewChildren;

            // No children, render content.
            if (!thisViewChildren || !thisViewChildren.length) {
                var borderWidth = layout.borderWidth;
                var content = giveGraphic('content', Rect, 3);
                if (content) {
                    var contentWidth = Math.max(thisWidth - 2 * borderWidth, 0);
                    var contentHeight = Math.max(thisHeight - 2 * borderWidth, 0);
                    var labelModel = thisNode.getModel('label.normal');
                    var textStyleModel = thisNode.getModel('label.normal.textStyle');
                    var hoverStyle = thisNode.getModel('itemStyle.emphasis').getItemStyle();
                    var text = thisNode.getModel().get('name');
                    var textRect = textStyleModel.getTextRect(text);
                    var showLabel = labelModel.get('show');

                    if (!showLabel || textRect.height > contentHeight) {
                        text = '';
                    }
                    else if (textRect.width > contentWidth) {
                        text = textStyleModel.get('ellipsis')
                            ? textStyleModel.ellipsis(text, contentWidth) : '';
                    }

                    graphic.setHoverStyle(content, hoverStyle);

                    // For tooltip.
                    content.dataIndex = thisNode.dataIndex;
                    content.seriesIndex = this.seriesModel.seriesIndex;

                    content.culling = true;
                    content.setShape({
                        x: borderWidth,
                        y: borderWidth,
                        width: contentWidth,
                        height: contentHeight
                    });

                    updateStyle(content, {
                        fill: thisNode.getVisual('color', true),
                        text: text,
                        textPosition: labelModel.get('position'),
                        textFill: textStyleModel.getTextColor(),
                        textAlign: textStyleModel.get('align'),
                        textVerticalAlign: textStyleModel.get('baseline'),
                        textFont: textStyleModel.getFont()
                    });
                    group.add(content);
                }
            }

            return group;

            function giveGraphic(storageName, Ctor, z) {
                var element = oldRawIndex != null && oldStorage[storageName][oldRawIndex];
                var lasts = lastsForAnimation[storageName];

                if (element) {
                    // Remove from oldStorage
                    oldStorage[storageName][oldRawIndex] = null;
                    prepareAnimationWhenHasOld(lasts, element, storageName);
                }
                // If invisible and no old element, do not create new element (for optimizing).
                else if (!invisible) {
                    element = new Ctor({z: z});
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
                // New background do not animate but delay show.
                if (storageName === 'background') {
                    element.invisible = true;
                    element.__tmWillVisible = true;
                    willVisibleEls.push(element);
                }
                else {
                    var lastCfg = lasts[thisRawIndex] = {};
                    var parentNode = thisNode.parentNode;

                    if (parentNode && (!reRoot || reRoot.direction === 'drilldown')) {
                        var parentOldX = 0;
                        var parentOldY = 0;
                        // For convenience, get old bounding rect from background.
                        var parentOldBg = lastsForAnimation.background[parentNode.getRawIndex()];

                        if (parentOldBg && parentOldBg.old) {
                            parentOldX = parentOldBg.old.width / 2; // Devided by 2 for reRoot effect.
                            parentOldY = parentOldBg.old.height / 2;
                        }
                        // When no parent old shape found, its parent is new too,
                        // so we can just use {x:0, y:0}.
                        lastCfg.old = storageName === 'nodeGroup'
                            ? [parentOldX, parentOldY]
                            : {x: parentOldX, y: parentOldY, width: 0, height: 0};
                    }

                    // Fade in, user can be aware that these nodes are new.
                    lastCfg.fadein = storageName !== 'nodeGroup';
                }
            }

            function updateStyle(element, style) {
                if (!invisible) {
                    // If invisible, do not set visual, otherwise the element will
                    // change immediately before animation. We think it is OK to
                    // remain its origin color when moving out of the view window.
                    element.setStyle(style);
                    if (!element.__tmWillVisible) {
                        element.invisible = false;
                    }
                }
                else {
                    // Delay invisible setting utill animation finished,
                    // avoid element vanish suddenly before animation.
                    !element.invisible && willInvisibleEls.push(element);
                }
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
                    var storageName;

                    if (el.invisible || !(storageName = el.__tmWillDelete)) {
                        return;
                    }

                    var parent = el.parent; // Always has parent, and parent is nodeGroup.
                    var target;

                    if (reRoot && reRoot.direction === 'drilldown') {
                        if (parent === reRoot.rootNodeGroup) {
                            // Only 'content' will enter this branch, but not nodeGroup.
                            target = {
                                shape: {
                                    x: 0, y: 0,
                                    width: parent.__tmNodeWidth, height: parent.__tmNodeHeight
                                }
                            };
                            el.z = 2;
                        }
                        else {
                            target = {style: {opacity: 0}};
                            el.z = 1;
                        }
                    }
                    else {
                        var targetX = 0;
                        var targetY = 0;

                        if (!parent.__tmWillDelete) {
                            // Let node animate to right-bottom corner, cooperating with fadeout,
                            // which is appropriate for user understanding.
                            // Divided by 2 for reRoot rollup effect.
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
                            el.position = last.old;
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

            controller.rect = new BoundingRect(0, 0, api.getWidth(), api.getHeight());
        },

        /**
         * @private
         */
        _clearController: function () {
            var controller = this._controller;
            if (controller) {
                controller.off('pan').off('zoom');
                controller = null;
            }
        },

        /**
         * @private
         */
        _onPan: function (dx, dy) {
            this._mayClick = false;

            if (this._state !== 'animating'
                && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
            ) {
                // These param must not be cached.
                var viewRoot = this.seriesModel.getViewRoot();

                if (!viewRoot) {
                    return;
                }

                var rootLayout = viewRoot.getLayout();

                if (!rootLayout) {
                    return;
                }

                this.api.dispatchAction({
                    type: 'treemapMove',
                    from: this.uid,
                    seriesId: this.seriesModel.id,
                    rootRect: {
                        x: rootLayout.x + dx, y: rootLayout.y + dy,
                        width: rootLayout.width, height: rootLayout.height
                    }
                });
            }
        },

        /**
         * @private
         */
        _onZoom: function (scale, mouseX, mouseY) {
            this._mayClick = false;

            if (this._state !== 'animating') {
                // These param must not be cached.
                var viewRoot = this.seriesModel.getViewRoot();

                if (!viewRoot) {
                    return;
                }

                var rootLayout = viewRoot.getLayout();

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
                matrix.scale(m, m, [scale, scale]);
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
            // FIXME
            // 不用click以及silent的原因是，animate时视图设置silent true来避免click生效，
            // 但是animate中，按下鼠标，animate结束后（silent设回为false）松开鼠标，
            // 还是会触发click，期望是不触发。

            // Mousedown occurs when drag start, and mouseup occurs when drag end,
            // click event should not be triggered in that case.

            containerGroup.on('mousedown', function (e) {
                this._state === 'ready' && (this._mayClick = true);
            }, this);
            containerGroup.on('mouseup', function (e) {
                if (this._mayClick) {
                    this._mayClick = false;
                    this._state === 'ready' && onClick.call(this, e);
                }
            }, this);

            function onClick(e) {
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
            }
        },

        /**
         * @private
         */
        _renderBreadcrumb: function (seriesModel, api, targetInfo) {
            if (!targetInfo) {
                // Find breadcrumb tail on center of containerGroup.
                targetInfo = this.findTarget(api.getWidth() / 2, api.getHeight() / 2);

                if (!targetInfo) {
                    targetInfo = {node: seriesModel.getData().tree.root};
                }
            }

            (this._breadcrumb || (this._breadcrumb = new Breadcrumb(this.group, bind(onSelect, this))))
                .render(seriesModel, api, targetInfo.node);

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

    function createStorage() {
        return {nodeGroup: [], background: [], content: []};
    }

});
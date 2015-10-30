 define(function(require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var DataDiffer = require('../../data/DataDiffer');
    var helper = require('./helper');
    var parsePercent = require('../../util/number').parsePercent;
    var Breadcrumb = require('./Breadcrumb');
    var RoamController = require('../../component/helper/RoamController');
    var BoundingRect = require('zrender/core/BoundingRect');
    var matrix = require('zrender/core/matrix');
    var bind = zrUtil.bind;
    var Group = graphic.Group;
    var Rect = graphic.Rect;

    var ANIMATION_DURATION = 5700;
    var EASING;// = 'cubicOut';
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
            if (helper.irrelevant(payload, seriesModel)) {
                return;
            }

            this.seriesModel = seriesModel;
            this.api = api;
            this.ecModel = ecModel;

            var payloadType = payload && payload.type;
            var layoutInfo = seriesModel.layoutInfo;

            var containerGroup = this._giveContainerGroup(layoutInfo);

            var renderResult = this._doRender(containerGroup, seriesModel);

            (!payloadType || payloadType === 'treemapZoomToNode')
                ? this._doAnimation(containerGroup, renderResult)
                : renderResult.renderFinally();

            this._resetController(api);

            var targetInfo = helper.retrieveTargetNodeInfo(payload, seriesModel);
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
        _doRender: function (containerGroup, seriesModel) {
            var thisTree = seriesModel.getData().tree;
            var oldTree = this._oldTree;

            // Clear last shape records.
            var lastShapes = createStorage();
            var thisStorage = createStorage();
            var oldStorage = this._storage;
            var willInvisibleEls = [];
            var willDeleteEls = [];
            var renderNode = bind(
                this._renderNode, this,
                thisStorage, oldStorage, lastShapes, willInvisibleEls
            );
            var viewRoot = seriesModel.getViewRoot();

            // Notice: when thisTree and oldTree are the same tree (see list.cloneShadow),
            // the oldTree is actually losted, so we can not find all of the old graphic
            // elements from tree. So we use this stragegy: make element storage, move
            // from old storage to new storage, clear old storage.

            dualTravel(
                thisTree.root ? [thisTree.root] : [],
                (oldTree && oldTree.root) ? [oldTree.root] : [],
                containerGroup,
                thisTree === oldTree || !oldTree,
                viewRoot === thisTree.root
            );

            // Process all removing.
            var willDeleteEls = clearStorage(oldStorage);

            this._oldTree = thisTree;
            this._storage = thisStorage;

            return {
                lastShapes: lastShapes,
                willDeleteEls: willDeleteEls,
                renderFinally: renderFinally
            };

            function dualTravel(thisViewChildren, oldViewChildren, parentGroup, sameTree, inView) {
                // When 'render' is triggered by action,
                // 'this' and 'old' may be the same tree,
                // we use rawIndex in that case.
                if (sameTree) {
                    oldViewChildren = thisViewChildren;
                    zrUtil.each(thisViewChildren, function (child, index) {
                        !child.isRemoved() && processNode(index, index);
                    });
                }
                // Diff hierarchically (diff only in each subtree, but not whole).
                // because, consistency of view is important.
                else {
                    (new DataDiffer(oldViewChildren, thisViewChildren, getKey))
                        .add(processNode)
                        .update(processNode)
                        .remove(zrUtil.curry(processNode, null))
                        .execute();
                }

                function getKey(node) {
                    // Identify by name or raw index.
                    return node.name != null ? node.name : node.getRawIndex();
                }

                function processNode(newIndex, oldIndex) {
                    var thisNode = newIndex != null ? thisViewChildren[newIndex] : null;
                    var oldNode = oldIndex != null ? oldViewChildren[oldIndex] : null;

                    // Whether under viewRoot.
                    var subInView = inView || thisNode === viewRoot;
                    // If not under viewRoot, only remove.
                    if (!subInView) {
                        thisNode = null;
                    }

                    var group = renderNode(thisNode, oldNode, parentGroup);

                    dualTravel(
                        thisNode && thisNode.viewChildren || [],
                        oldNode && oldNode.viewChildren || [],
                        group,
                        sameTree,
                        subInView
                    );
                }
            }

            function clearStorage(storage) {
                var willDeleteEls = [];
                storage && zrUtil.each(storage, function (store) {
                    zrUtil.each(store, function (el) {
                        el && willDeleteEls.push(el);
                    });
                });
                return willDeleteEls;
            }

            function renderFinally() {
                zrUtil.each(willDeleteEls, function (el) {
                    el.parent && el.parent.remove(el);
                });
                zrUtil.each(willInvisibleEls, function (el) {
                    el.invisible = true;
                });
            }
        },

        /**
         * @private
         */
        _renderNode: function (
            thisStorage, oldStorage, lastShapes, willInvisibleEls,
            thisNode, oldNode, parentGroup
        ) {
            var thisRawIndex = thisNode && thisNode.getRawIndex();
            var oldRawIndex = oldNode && oldNode.getRawIndex();

            if (!thisNode) {
                return;
            }

            var layout = thisNode.getLayout();
            var thisWidth = layout.width;
            var thisHeight = layout.height;
            var invisible = layout.invisible;

            // Node group
            var group = giveGraphic('nodeGroup', Group, 'position');
            parentGroup.add(group);
            group.position = [layout.x, layout.y];

            // Background
            var bg = giveGraphic('background', Rect, 'shape');
            bg.setShape({x: 0, y: 0, width: thisWidth, height: thisHeight});
            updateStyle(bg, {fill: thisNode.getVisual('borderColor', true)});
            group.add(bg);

            var thisViewChildren = thisNode.viewChildren;

            // No children, render content.
            if (!thisViewChildren || !thisViewChildren.length) {
                var borderWidth = layout.borderWidth;

                var content = giveGraphic('content', Rect, 'shape');
                var contentWidth = Math.max(thisWidth - 2 * borderWidth, 0);
                var contentHeight = Math.max(thisHeight - 2 * borderWidth, 0);
                var labelModel = thisNode.getModel('label.normal');
                var textStyleModel = thisNode.getModel('label.normal.textStyle');
                var text = thisNode.getModel().get('name');
                var textRect = textStyleModel.getTextRect(text);
                var showLabel = labelModel.get('show');

                if (!showLabel
                    || (
                        showLabel !== 'always'
                        && (textRect.width > contentWidth || textRect.height > contentHeight)
                    )
                ) {
                    text = '';
                }

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
                    textPosition: this._getTextPosition(labelModel, thisWidth, thisHeight),
                    textFill: textStyleModel.get('color'),
                    textAlign: textStyleModel.get('align'),
                    textFont: textStyleModel.getFont()
                });
                group.add(content);
            }

            return group;

            function giveGraphic(storage, Ctor, type) {
                var shape = oldRawIndex != null && oldStorage && oldStorage[storage][oldRawIndex];

                if (shape) {
                    // Remove from oldStorage
                    oldStorage && (oldStorage[storage][oldRawIndex] = null);
                    var lastCfg = lastShapes[storage][thisRawIndex] = {};
                    lastCfg[type] = type === 'position'
                         ? shape.position.slice() : zrUtil.extend({}, shape.shape);
                }
                else {
                    shape = new Ctor();
                }

                // Set to thisStorage
                return thisStorage[storage][thisRawIndex] = shape;
            }

            function updateStyle(element, style) {
                if (!invisible) {
                    // If invisible, do not set visual, otherwise the element will
                    // change immediately before animation. We think it is OK to
                    // remain its origin color when moving out of the view window.
                    element.setStyle(style);
                    element.invisible = false;
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
        _getTextPosition: function (labelModel, nodeWidth, nodeHeight) {
            var position = labelModel.get('position');

            if (zrUtil.isArray(position)) {
                position = [
                    parsePercent(position[0], nodeWidth),
                    parsePercent(position[1], nodeHeight)
                ];
            }
            return position;
        },

        /**
         * @private
         */
        _doAnimation: function (containerGroup, renderResult) {
            if (!this.ecModel.get('animation')) {
                return;
            }

            var animationCount = 0;
            var that = this;

            zrUtil.each(this._storage, function (shapes, key) {
                zrUtil.each(shapes, function (el, index) {
                    var last = renderResult.lastShapes[key][index];
                    if (!last) {
                        return;
                    }
                    if (last.position) {
                        var target = el.position.slice();
                        el.position = last.position;
                        el.animateTo({position: target}, ANIMATION_DURATION, EASING, done);
                        animationCount++;
                    }
                    else if (last.shape) {
                        var target = zrUtil.extend({}, el.shape);
                        el.setShape(last.shape);
                        el.animateTo({shape: target}, ANIMATION_DURATION, EASING, done);
                        animationCount++;
                    }
                });
            });

            zrUtil.each(renderResult.willDeleteEls, function (el) {
                if (!el.invisible) {
                    el.animateTo({shape: {x: 0, y: 0, width: 0, height: 0}}, ANIMATION_DURATION, EASING, done);
                    animationCount++;
                }
            });

            if (animationCount) {
                this._state = 'animating';
            }

            function done() {
                animationCount--;
                if (!animationCount) {
                    that._state = 'ready';
                    renderResult.renderFinally();
                }
            }
        },

        /**
         * @private
         */
        _resetController: function (api) {
            var controller = this._controller;

            // Init controller.
            if (!controller) {
                controller = this._controller = new RoamController(api.getZr());
                controller.on('pan', bind(handle, this, this._onPan));
                controller.on('zoom', bind(handle, this, this._onZoom));
            }

            function handle(handler) {
                this._mayClick = false;
                return handler.apply(this, Array.prototype.slice.call(arguments, 1));
            }

            controller.rect = new BoundingRect(0, 0, api.getWidth(), api.getHeight());

            if (!this.seriesModel.get('roam')) {
                controller.off('pan').off('zoom');
                this._controller = null;
                return;
            }
        },

        /**
         * @private
         */
        _onPan: function (dx, dy) {
            if (this._state !== 'animating'
                && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
            ) {
                // These param must not be cached.
                var viewRoot = this.seriesModel.getViewRoot();

                if (!viewRoot) {
                    return;
                }

                var rootLayout = viewRoot.getLayout();

                this.api.dispatch({
                    type: 'treemapMove',
                    from: this.uid,
                    seriesId: this.seriesModel.uid,
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
            if (this._state !== 'animating' && !this._controller.isDragging()) {
                // These param must not be cached.
                var viewRoot = this.seriesModel.getViewRoot();

                if (!viewRoot) {
                    return;
                }

                var rootLayout = viewRoot.getLayout();
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

                this.api.dispatch({
                    type: 'treemapRender',
                    from: this.uid,
                    seriesId: this.seriesModel.uid,
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
            var that = this;

            // Mousedown occurs when drag start, and mouseup occurs when drag end,
            // click event should not be triggered in that case.

            containerGroup.on('mousedown', function (e) {
                that._state === 'ready' && (that._mayClick = true);
            });
            containerGroup.on('mouseup', function (e) {
                if (that._mayClick) {
                    that._mayClick = false;
                    that._state === 'ready' && onClick(e);
                }
            });

            function onClick(e) {
                var targetInfo = that.findTarget(e.offsetX, e.offsetY);
                if (targetInfo) {
                    that._zoomToNode(targetInfo);
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

            (this._breadcrumb || (this._breadcrumb = new Breadcrumb(this.group, onSelect)))
                .render(seriesModel, api, targetInfo.node);

            var that = this;
            function onSelect(node) {
                that._zoomToNode({node: node});
            }
        },

        /**
         * @override
         */
        remove: function () {
            this._containerGroup.removeAll();
            this._storage = createStorage();
            this._state = 'ready';
            this._breadcrumb && this._breadcrumb.remove();
        },

        /**
         * @private
         */
        _zoomToNode: function (targetInfo) {
            this.api.dispatch({
                type: 'treemapZoomToNode',
                from: this.uid,
                seriesId: this.seriesModel.uid,
                targetInfo: targetInfo
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
                var bgShape = this._storage.background[node.getRawIndex()];
                var point = bgShape.transformCoordToLocal(x, y);
                var shape = bgShape.shape;

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
            }, this);

            return targetInfo;
        }

    });

    function createStorage() {
        return {nodeGroup: [], background: [], content: []};
    }

});
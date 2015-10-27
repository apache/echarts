 define(function(require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var layout = require('../../util/layout');
    var DataDiffer = require('../../data/DataDiffer');
    var modelUtil = require('../../util/model');
    var helper = require('./helper');
    var Breadcrumb = require('./Breadcrumb');
    var RoamController = require('../../component/helper/RoamController');
    var BoundingRect = require('zrender/core/BoundingRect');
    var matrix = require('zrender/core/matrix');
    var bind = zrUtil.bind;
    var Group = graphic.Group;
    var Rect = graphic.Rect;

    var ANIMATION_DURATION = 700;
    var EASING = 'cubicOut';
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
            this._storage;

            /**
             * @private
             * @type {Object.<string, Array.<module:zrender/container/Group>>}
             */
            this._lastShapes;

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
             * 'ready', 'dragging', 'animating'
             * @private
             */
            this._state = 'ready';
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

            var thisTree = seriesModel.getData().tree;
            var containerGroup = this._containerGroup;
            var lastContainerPosition;
            var containerSize = seriesModel.containerSize;

            if (!containerGroup) {
                containerGroup = this._containerGroup = new Group();
                this._initEvents(containerGroup);
                this.group.add(containerGroup);
            }
            else {
                // First rendering do not animate.
                lastContainerPosition = containerGroup.position.slice();
            }

            var positionInfo = layout.parsePositionInfo(
                {
                    x: seriesModel.get('x'),
                    y: seriesModel.get('y'),
                    x2: seriesModel.get('x2'),
                    y2: seriesModel.get('y2'),
                    width: containerSize[0],
                    height: containerSize[1]
                },
                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );
            containerGroup.position = [positionInfo.x, positionInfo.y];

            this._doRender(thisTree, containerGroup, seriesModel);

            var targetInfo = helper.retrieveTargetNodeInfo(payload, seriesModel);
            var viewRect = payload && payload.type === 'treemapRender' && payload.viewRect;

            this._positionRoot(containerGroup, positionInfo, thisTree.root, viewRect, targetInfo);

            this._doAnimation(payload, containerGroup, lastContainerPosition);

            this._initController(positionInfo, thisTree.root, seriesModel, api);

            this._renderBreadcrumb(seriesModel, api, targetInfo);
        },

        /**
         * @private
         */
        _doRender: function (thisTree, containerGroup, seriesModel) {
            var oldTree = this._oldTree;

            // Clear last shape records.
            this._lastShapes = {nodeGroup: [], background: [], content: []};
            var thisStorage = {nodeGroup: [], background: [], content: []};
            var oldStorage = this._storage;
            var renderNode = bind(this._renderNode, this);
            var viewRoot = seriesModel.getViewRoot();

            dualTravel(
                thisTree.root ? [thisTree.root] : [],
                (oldTree && oldTree.root) ? [oldTree.root] : [],
                containerGroup,
                thisTree === oldTree || !oldTree,
                viewRoot === thisTree.root
            );

            // Process all removing.
            clearStorage(oldStorage);

            this._oldTree = thisTree;
            this._storage = thisStorage;


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
                        .remove(zrUtil.curry(processNode, null));
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

                    var group = renderNode(
                        thisNode, oldNode, parentGroup, thisStorage, oldStorage
                    );
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
                storage && zrUtil.each(storage, function (store) {
                    zrUtil.each(store, function (shape) {
                        shape && shape.parent && shape.parent.remove(shape);
                    });
                });
            }
        },

        /**
         * @private
         */
        _renderNode: function (thisNode, oldNode, parentGroup, thisStorage, oldStorage) {
            var thisRawIndex = thisNode && thisNode.getRawIndex();
            var oldRawIndex = oldNode && oldNode.getRawIndex();
            var lastShapes = this._lastShapes;

            if (!thisNode) {
                return;
            }

            var layout = thisNode.getLayout();
            var thisWidth = layout.width;
            var thisHeight = layout.height;

            // Node group
            var group = giveGraphic('nodeGroup', Group, 'position');
            parentGroup.add(group);
            group.position = [layout.x, layout.y];

            var itemStyleModel = thisNode.getModel('itemStyle.normal');
            var borderColor = itemStyleModel.get('borderColor') || itemStyleModel.get('gapColor');

            // Background
            var bg = giveGraphic('background', Rect, 'shape');
            bg.setShape({x: 0, y: 0, width: thisWidth, height: thisHeight});
            bg.setStyle({fill: borderColor});
            group.add(bg);

            var thisViewChildren = thisNode.viewChildren;

            // No children, render content.
            if (!thisViewChildren || !thisViewChildren.length) {
                var borderWidth = layout.borderWidth;

                var content = giveGraphic('content', Rect, 'shape');
                var contentWidth = Math.max(thisWidth - 2 * borderWidth, 0);
                var contentHeight = Math.max(thisHeight - 2 * borderWidth, 0);
                var textStyleModel = thisNode.getModel('label.normal.textStyle');
                var text = thisNode.getModel().get('name');
                var textRect = textStyleModel.getTextRect(text);

                if (textRect.width > contentWidth || textRect.height > contentHeight) {
                    text = '';
                }

                content.culling = true;
                content.setShape({
                    x: borderWidth,
                    y: borderWidth,
                    width: contentWidth,
                    height: contentHeight
                });
                content.setStyle({
                    fill: thisNode.getVisual('color', true),
                    text: text,
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
                    // FIXME
                    // 太多函数？
                    shape = new Ctor();
                }

                // Set to thisStorage
                return thisStorage[storage][thisRawIndex] = shape;
            }
        },

        /**
         * @private
         */
        _doAnimation: function (payload, containerGroup, lastContainerPosition) {
            if (!this.ecModel.get('animation')
                || (payload && payload.type === 'treemapRender')
            ) {
                return;
            }

            var lastShapes = this._lastShapes;
            var animationCount = 0;
            var that = this;

            zrUtil.each(this._storage, function (shapes, key) {
                zrUtil.each(shapes, function (shape, index) {
                    var last = lastShapes[key][index];
                    if (!last) {
                        return;
                    }
                    if (last.position) {
                        var target = shape.position.slice();
                        shape.position = last.position;
                        shape.animateTo({position: target}, ANIMATION_DURATION, EASING, done);
                        animationCount++;
                    }
                    else if (last.shape) {
                        var target = zrUtil.extend({}, shape.shape);
                        shape.setShape(last.shape);
                        shape.animateTo({shape: target}, ANIMATION_DURATION, EASING, done);
                        animationCount++;
                    }
                });
            });

            if (lastContainerPosition) {
                var target = containerGroup.position.slice();
                containerGroup.position = lastContainerPosition;
                containerGroup.animateTo({position: target}, ANIMATION_DURATION, EASING, done);
                animationCount++;
            }

            if (animationCount) {
                this._state = 'animating';
            }
            function done() {
                animationCount--;
                if (!animationCount) {
                    that._state = 'ready';
                }
            }
        },

        /**
         * @private
         */
        _initController: function (positionInfo, root, seriesModel, api) {
            var controller = this._controller;
            var nodeGroups = this._storage.nodeGroup;
            var rootGroup = nodeGroups[root.getRawIndex()];
            var containerGroup = this._containerGroup;

            // Init controller.
            if (!controller) {
                controller = this._controller = new RoamController(api.getZr());
                controller.on('pan', bind(onPan, this));
                controller.on('zoom', bind(onZoom, this));
                controller.rect = new BoundingRect(0, 0, api.getWidth(), api.getHeight());
            }

            if (!seriesModel.get('roam')) {
                controller.off('pan').off('zoom');
                this._controller = null;
                return;
            }

            function onPan(dx, dy) {
                if (this._state !== 'animating'
                    && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
                ) {
                    // FIXME
                    // 找个好点的方法？
                    this._state = 'dragging';
                    var pos = rootGroup.position;
                    pos[0] += dx;
                    pos[1] += dy;
                    rootGroup.dirty();

                    // Update breadcrumb when drag move.
                    this._renderBreadcrumb(seriesModel, api);
                }
            }

            function onZoom(scale, mouseX, mouseY) {
                if (this._state !== 'animating' && this._state !== 'dragging') {
                    // var rect = this.group.getBoundingRect([containerGroup]);
                    var rect = containerGroup.getBoundingRect();

                    mouseX -= positionInfo.x;
                    mouseY -= positionInfo.y;

                    // Recalculate bounding rect.
                    var m = matrix.create();
                    matrix.translate(m, m, [-mouseX, -mouseY]);
                    matrix.scale(m, m, [scale, scale]);
                    matrix.translate(m, m, [mouseX, mouseY]);

                    rect.applyTransform(m);

                    this.api.dispatch({
                        type: 'treemapRender',
                        from: this.uid,
                        seriesId: this.seriesModel.uid,
                        viewRect: {
                            x: rect.x, y: rect.y, width: rect.width, height: rect.height
                        }
                    });
                }
            }
        },

        /**
         * @private
         */
        _initEvents: function (containerGroup, clickCallback) {
            // FIXME
            // 不用click以及silent的原因是，animate时视图设置silent true来避免click生效，
            // 但是animate中，按下鼠标，animate结束后（silent设回为false）松开鼠标，
            // 还是会触发click，期望是不触发。
            var maybeClick = false;
            var that = this;

            containerGroup.on('mousedown', function (e) {
                if (that._state === 'ready') {
                    maybeClick = true;
                }
            });
            containerGroup.on('mouseup', function (e) {
                if (that._state !== 'ready') {
                    that._state === 'dragging' && (that._state = 'ready');
                    return;
                }
                if (maybeClick) {
                    maybeClick = false;
                    onClick(e);
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
            this.group.removeAll();
            this._containerGroup = null;
            this._storage = null;
            this._oldTree = null;

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
                var nodeGroup = this._storage.nodeGroup[node.getRawIndex()];
                var point = nodeGroup.transformCoordToLocal(x, y);
                if (nodeGroup.getBoundingRect().contain(point[0], point[1])) {
                    targetInfo = {node: node, offsetX: point[0], offsetY: point[1]};
                }
                else {
                    return false; // Suppress visit subtree.
                }
            }, this);

            return targetInfo;
        },

        /**
         * @private
         */
        _positionRoot: function(containerGroup, positionInfo, root, viewRect, targetInfo) {
            var nodeGroups = this._storage.nodeGroup;
            var rootGroup = nodeGroups[root.getRawIndex()];

            if (viewRect) {
                rootGroup.position = [viewRect.x, viewRect.y];
                return;
            }

            if (!targetInfo) {
                rootGroup.position = [0, 0];
                return;
            }

            // If targetInfo is fetched by 'retrieveTargetNodeInfo',
            // old tree and new tree are the same tree,
            // so we can use raw index of targetInfo.node to find shape from storage.

            var targetNode = targetInfo.node;

            var targetGroup = nodeGroups[targetNode.getRawIndex()];

            if (!targetGroup) {
                rootGroup.position = [0, 0];
                return;
            }

            var targetRect = targetGroup.getBoundingRect();
            var targetCenter = modelUtil.transformCoordToAncestor(
                [targetRect.width / 2, targetRect.height / 2], targetGroup, containerGroup
            );
            rootGroup.position = [
                positionInfo.width / 2 - targetCenter[0],
                positionInfo.height / 2 - targetCenter[1]
            ];
        }

    });

});
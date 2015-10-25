 define(function(require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var layout = require('../../util/layout');
    var DataDiffer = require('../../data/DataDiffer');
    var modelUtil = require('../../util/model');
    var helper = require('./helper');
    var Breadcrumb = require('./Breadcrumb');
    var Group = graphic.Group;
    var Rect = graphic.Rect;

    return require('../../echarts').extendChartView({

        type: 'treemap',

        /**
         * @override
         */
        init: function () {

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
             * @type {module:echarts/data/Tree}
             */
            this._oldTree;

            /**
             * @private
             * @type {module:echarts/chart/treemap/Breadcrumb}
             */
            this._breadcrumb;
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

            var thisTree = seriesModel.getData().tree;
            var containerGroup = this._containerGroup;

            if (!containerGroup) {
                containerGroup = this._containerGroup = new Group({
                    onclick: zrUtil.bind(this._onClick, this)
                });
                this.group.add(containerGroup);
            }

            this._doRender(thisTree, containerGroup, seriesModel);

            layout.positionGroup(
                containerGroup,
                {
                    x: seriesModel.get('x'),
                    y: seriesModel.get('y'),
                    x2: seriesModel.get('x2'),
                    y2: seriesModel.get('y2')
                },
                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );

            var targetInfo = helper.retrieveTargetInfo(payload, seriesModel);

            this._positionRoot(containerGroup, thisTree.root, targetInfo);

            this._renderBreadcrumb(seriesModel, api, targetInfo);
        },

        /**
         * @private
         */
        _doRender: function (thisTree, containerGroup, seriesModel) {
            var oldTree = this._oldTree;

            var thisStorage = {nodeGroup: [], background: [], content: []};
            var oldStorage = this._storage;
            var renderNode = zrUtil.bind(this._renderNode, this);
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

            if (!thisNode) {
                return;
            }

            var layout = thisNode.getLayout();
            var thisWidth = layout.width;
            var thisHeight = layout.height;

            var group = giveGraphic('nodeGroup', Group);
            group.position = [layout.x, layout.y];
            parentGroup.add(group);

            var itemStyleModel = thisNode.getModel('itemStyle.normal');
            var borderColor = itemStyleModel.get('borderColor') || itemStyleModel.get('gapColor');

            // Background
            var background = giveGraphic('background', Rect);
            background.setShape({x: 0, y: 0, width: thisWidth, height: thisHeight});
            background.setStyle({fill: borderColor});
            group.add(background);

            var thisViewChildren = thisNode.viewChildren;

            // No children, render content.
            if (!thisViewChildren || !thisViewChildren.length) {
                var borderWidth = layout.borderWidth;

                var content = giveGraphic('content', Rect);
                content.setShape({
                    x: borderWidth,
                    y: borderWidth,
                    width: Math.max(thisWidth - 2 * borderWidth, 0),
                    height: Math.max(thisHeight - 2 * borderWidth, 0)
                });
                content.setStyle({
                    fill: thisNode.getVisual('color', true)
                });

                group.add(content);
            }

            return group;

            function giveGraphic(storage, Ctor) {
                var shape = oldRawIndex != null && oldStorage && oldStorage[storage][oldRawIndex];

                if (shape) {
                    // Remove from oldStorage
                    oldStorage && (oldStorage[storage][oldRawIndex] = null);
                }
                else {
                    shape = new Ctor();
                }

                // Set to thisStorage
                return thisStorage[storage][thisRawIndex] = shape;
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
        _onClick: function (e) {
            var targetInfo = this.findTarget(e.offsetX, e.offsetY);

            if (targetInfo) {
                this._zoomToNode(targetInfo);
            }
        },

        /**
         * @private
         */
        _zoomToNode: function (targetInfo) {
            this.api.dispatch({
                type: 'zoomToNode',
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
        _positionRoot: function(containerGroup, root, targetInfo) {
            var nodeGroups = this._storage.nodeGroup;

            var rootGroup = nodeGroups[root.getRawIndex()];

            if (!targetInfo) {
                rootGroup.position = [0, 0];
                return;
            }

            // If targetInfo is fetched by 'retrieveTargetInfo',
            // old tree and new tree are the same tree,
            // so we can use raw index of targetInfo.node to find shape from storage.

            var targetNode = targetInfo.node;
            var containerRect = containerGroup.getBoundingRect();

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
                containerRect.width / 2 - targetCenter[0],
                containerRect.height / 2 - targetCenter[1]
            ];
        }

    });

});
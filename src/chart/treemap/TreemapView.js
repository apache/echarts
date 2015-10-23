 define(function(require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var layout = require('../../util/layout');
    var DataDiffer = require('../../data/DataDiffer');
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
            this._drawGroup;

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
        },

        /**
         * @override
         */
        render: function (seriesModel, ecModel, api) {
            this.seriesModel = seriesModel;

            var drawGroup = this._drawGroup;

            if (!drawGroup) {
                drawGroup = this._drawGroup = new Group({
                    onclick: zrUtil.bind(this._onClick, this)
                });
                this.group.add(drawGroup);
            }

            var thisTree = seriesModel.getData().tree;
            var oldTree = this._oldTree;
            this._storage = [];

            var thisStorage = {nodeGroup: [], background: [], content: []};
            var oldStorage = this._storage;
            var renderNode = zrUtil.bind(this._renderNode, this);
            var viewRoot = seriesModel.getViewRoot();

            dualTravel(
                [thisTree.root],
                oldTree ? [oldTree.root] : [],
                drawGroup,
                viewRoot === thisTree.root
            );

            this._oldTree = thisTree;
            this._storage = thisStorage;

            layout.positionGroup(
                drawGroup,
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

            function dualTravel(thisViewChildren, oldViewChildren, parentGroup, inView) {
                // When update, 'this' and 'old' are in the same tree.
                if (thisViewChildren === oldViewChildren
                    || !thisViewChildren.length
                    || !oldViewChildren.length
                ) {
                    zrUtil.each(thisViewChildren, function (child, index) {
                        processNode(index, index);
                    });
                }
                // When setOption, data changed, use data differ.
                else {
                    // Diff hierarchically (diff only in each subtree, but not whole).
                    // because, consistency of view is important.
                    (new DataDiffer(
                        oldViewChildren,
                        thisViewChildren,
                        function (node) {
                            // Identify by name or raw index.
                            return node.name != null ? node.name : node.getRawIndex();
                        }
                    ))
                    .add(function (newIndex) {
                        processNode(newIndex);
                    })
                    .update(function (newIndex, oldIndex) {
                        processNode(newIndex, oldIndex);
                    })
                    .remove(function (oldIndex) {
                        processNode(null, oldIndex);
                    });
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
                        subInView
                    );
                }
            }
        },

        /**
         * @private
         */
        _renderNode: function (thisNode, oldNode, parentGroup, thisStorage, oldStorage) {
            // FIXME
            // 考虑 viewRoot ??????????????
            var thisRawIndex = thisNode && thisNode.getRawIndex();
            var oldRawIndex = oldNode && oldNode.getRawIndex();

            if (!thisNode) {
                oldNode && oldStorage && parentGroup.remove(oldStorage.nodeGroup[oldRawIndex]);
                return;
            }

            var layout = thisNode.getLayout();
            var thisWidth = layout.width;
            var thisHeight = layout.height;

            var group = makeGraphic('nodeGroup', Group);
            group.position = [layout.x, layout.y];
            parentGroup.add(group);

            var itemStyleModel = thisNode.getModel('itemStyle.normal');
            var borderColor = itemStyleModel.get('borderColor') || itemStyleModel.get('gapColor');

            // Background
            var background = makeGraphic('background', Rect);
            background.setShape({x: 0, y: 0, width: thisWidth, height: thisHeight});
            background.setStyle({fill: borderColor});
            group.add(background);

            var thisViewChildren = thisNode.viewChildren;

            // No children, render content.
            if (!thisViewChildren || !thisViewChildren.length) {
                var borderWidth = layout.borderWidth;

                var content = makeGraphic('content', Rect);
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
            // Remove old content for children rendering.
            else {
                var content = (oldNode && oldStorage)
                    ? oldStorage.content[oldRawIndex] : null;
                content && group.remove(content);
            }

            return group;

            function makeGraphic(storage, Ctor) {
                return thisStorage[storage][thisRawIndex] = (oldNode && oldStorage)
                    ? oldStorage[storage][oldRawIndex]
                    : new Ctor({});
            }
        },

        /**
         * @override
         */
        remove: function () {
            this.group.removeAll();
            this._drawGroup = null;
            this._storage = null;
            this._oldTree = null;
        },

        /**
         * @private
         */
        _onClick: function (e) {

            var zoomStep = this.seriesModel.get('zoomToNode');

            var targetInfo = this.findTarget(e.offsetX, e.offsetY);

            if (!targetInfo) {
                return;
            }

            if (zoomStep <= 0) {
                return;
            }

            this.api.dispatch({
                type: 'zoomToNode',
                from: this.uid,
                targetNode: ''
            });
        },

        /**
         * @public
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
        }

    });
});
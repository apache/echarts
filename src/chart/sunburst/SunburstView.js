import * as zrUtil from 'zrender/src/core/util';
import ChartView from '../../view/Chart';
import SunburstPiece from './SunburstPiece';
import DataDiffer from '../../data/DataDiffer';

var ROOT_TO_NODE_ACTION = 'sunburstRootToNode';

var SunburstView = ChartView.extend({

    type: 'sunburst',

    init: function () {
        /**
         * @private
         * @type {module:echarts/data/Node}
         */
        this._oldRoot;
    },

    render: function (seriesModel, ecModel, api, payload) {
        var that = this;

        this.seriesModel = seriesModel;
        this.api = api;
        this.ecModel = ecModel;

        var virtualRoot = seriesModel.getData().tree.root;

        var oldRoot = this._oldRoot;
        var newRoot = seriesModel.getViewRoot();

        var group = this.group;

        var renderLabelForZeroData = seriesModel.get('renderLabelForZeroData');

        dualTravel(
            newRoot ? [newRoot] : [],
            oldRoot ? [oldRoot] : []
        );

        renderRollUp(virtualRoot, newRoot);

        this._initEvents();

        this._oldRoot = newRoot;

        function dualTravel(newChildren, oldChildren) {
            if (newChildren.length === 0 && oldChildren.length === 0) {
                return;
            }

            new DataDiffer(oldChildren, newChildren, getKey, getKey)
                .add(processNode)
                .update(processNode)
                .remove(zrUtil.curry(processNode, null))
                .execute();

            function getKey(node) {
                return node.getId();
            }

            function processNode(newId, oldId) {
                var newNode = newId == null ? null : newChildren[newId];
                var oldNode = oldId == null ? null : oldChildren[oldId];

                doRenderNode(newNode, oldNode);

                dualTravel(
                    newNode && newNode.children || [],
                    oldNode && oldNode.children || []
                );
            }
        }

        function doRenderNode(newNode, oldNode) {
            if (!renderLabelForZeroData && newNode && !newNode.getValue()) {
                // Not render data with value 0
                newNode = null;
            }

            if (newNode !== virtualRoot) {
                if (oldNode && oldNode.piece) {
                    if (newNode) {
                        // Update
                        oldNode.piece
                            .updateData(false, newNode, seriesModel, ecModel);
                        return;
                    }
                }
                else {
                    if (newNode) {
                        // Add
                        var piece = new SunburstPiece(
                            newNode,
                            seriesModel,
                            ecModel
                        );
                        group.add(piece);
                        return;
                    }
                }
            }
            // Remove
            removeNode(oldNode);
        }

        function removeNode(node) {
            if (!node) {
                return;
            }

            if (node.piece) {
                group.remove(node.piece);
                node.piece = null;
            }
            zrUtil.each(node.children, function (child) {
                removeNode(child);
            });
        }

        function renderRollUp(virtualRoot, viewRoot) {
            if (virtualRoot !== viewRoot) {
                // Render
                if (virtualRoot.piece) {
                    // Update
                    virtualRoot.piece
                        .updateData(false, virtualRoot, seriesModel, ecModel);
                }
                else {
                    // Add
                    virtualRoot.piece = new SunburstPiece(
                        virtualRoot,
                        seriesModel,
                        ecModel
                    );
                    group.add(virtualRoot.piece);
                }

                virtualRoot.piece.on('click', function (e) {
                    that._rootToNode(viewRoot.parentNode);
                });
            }
            else if (virtualRoot.piece) {
                // Remove
                group.remove(virtualRoot.piece);
                virtualRoot.piece = null;
            }
        }
    },

    dispose: function () {
    },

    /**
     * @private
     */
    _initEvents: function () {
        var that = this;

        this.group.on('click', function (e) {
            var nodeClick = that.seriesModel.get('nodeClick', true);

            if (!nodeClick) {
                return;
            }

            if (nodeClick === 'zoomToNode') {
                var targetFound = false;
                var viewRoot = that.seriesModel.getViewRoot();
                viewRoot.eachNode(function (node) {
                    if (!targetFound
                        && node.piece && node.piece.childAt(0) === e.target
                    ) {
                        that._rootToNode(node);
                        targetFound = true;
                    }
                });
            }
        });
    },

    /**
     * @private
     */
    _rootToNode: function (node) {
        this.api.dispatchAction({
            type: ROOT_TO_NODE_ACTION,
            from: this.uid,
            seriesId: this.seriesModel.id,
            targetNode: node
        });
    },

    /**
     * @implement
     */
    containPoint: function (point, seriesModel) {
        var treeRoot = seriesModel.getData();
        var itemLayout = treeRoot.getItemLayout(0);
        if (itemLayout) {
            var dx = point[0] - itemLayout.cx;
            var dy = point[1] - itemLayout.cy;
            var radius = Math.sqrt(dx * dx + dy * dy);
            return radius <= itemLayout.r && radius >= itemLayout.r0;
        }
    }

});

export default SunburstView;

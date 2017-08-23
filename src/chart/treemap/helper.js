define(function (require) {

    var zrUtil = require('zrender/core/util');

    var helper = {

        retrieveTargetInfo: function (payload, seriesModel) {
            if (payload
                && (
                    payload.type === 'treemapZoomToNode'
                    || payload.type === 'treemapRootToNode'
                )
            ) {
                var root = seriesModel.getData().tree.root;
                var targetNode = payload.targetNode;
                if (targetNode && root.contains(targetNode)) {
                    return {node: targetNode};
                }

                var targetNodeId = payload.targetNodeId;
                if (targetNodeId != null && (targetNode = root.getNodeById(targetNodeId))) {
                    return {node: targetNode};
                }
            }
        },

        // Not includes the given node at the last item.
        getPathToRoot: function (node) {
            var path = [];
            while (node) {
                node = node.parentNode;
                node && path.push(node);
            }
            return path.reverse();
        },

        aboveViewRoot: function (viewRoot, node) {
            var viewPath = helper.getPathToRoot(viewRoot);
            return zrUtil.indexOf(viewPath, node) >= 0;
        },

        // From root to the input node (the input node will be included).
        wrapTreePathInfo: function (node, seriesModel) {
            var treePathInfo = [];

            while (node) {
                var nodeDataIndex = node.dataIndex;
                treePathInfo.push({
                    name: node.name,
                    dataIndex: nodeDataIndex,
                    value: seriesModel.getRawValue(nodeDataIndex)
                });
                node = node.parentNode;
            }

            treePathInfo.reverse();

            return treePathInfo;
        }
    };

    return helper;
});
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

        getPathToRoot: function (node) {
            var path = [];
            while (node) {
                path.push(node);
                node = node.parentNode;
            }
            return path.reverse();
        },

        aboveViewRoot: function (viewRoot, node) {
            var viewPath = helper.getPathToRoot(viewRoot);
            return helper.aboveViewRootByViewPath(viewPath, node);
        },

        // viewPath should obtained from getPathToRoot(viewRoot)
        aboveViewRootByViewPath: function (viewPath, node) {
            var index = zrUtil.indexOf(viewPath, node);
            // The last one is viewRoot
            return index >= 0 && index !== viewPath.length - 1;
        }

    };

    return helper;
});
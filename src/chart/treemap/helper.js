define(function (require) {

    var helper = {

        retrieveTargetInfo: function (payload, seriesModel) {
            if (!payload || payload.type !== 'treemapZoomToNode') {
                return;
            }

            var root = seriesModel.getData().tree.root;
            var targetNode = payload.targetNode;
            if (targetNode && root.contains(targetNode)) {
                return {node: targetNode};
            }

            var targetNodeId = payload.targetNodeId;
            if (targetNodeId != null && (targetNode = root.getNodeById(targetNodeId))) {
                return {node: targetNode};
            }

            return null;
        }

    };

    return helper;
});
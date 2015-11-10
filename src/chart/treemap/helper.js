define(function (require) {

    var helper = {

        irrelevant: function (payload, seriesModel) {
            // It is irrelavant only when seriesID or seriesName is
            // specified and not equals to seriesModel's.
            return payload
                && (
                    payload.seriesId != null
                    ? seriesModel.getId() !== payload.seriesId
                    : payload.seriesName != null
                    // FIXME
                    // seriesModel.getId() ???
                    ? payload.seriesName !== seriesModel.get('name')
                    : false
                );

        },

        retrieveTargetInfo: function (payload, seriesModel) {
            if (helper.irrelevant(payload, seriesModel)) {
                return;
            }
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
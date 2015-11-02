define(function (require) {

    var helper = {

        irrelevant: function (payload, seriesModel) {
            // It is irrelavant only when seriesUID or seriesId is
            // specified and not equals to seriesModel's.
            return payload
                && (
                    payload.seriesUID != null
                    ? seriesModel.uid !== payload.seriesUID
                    : payload.seriesId != null
                    // FIXME
                    // seriesModel.getId() ???
                    ? payload.seriesId !== seriesModel.get('name')
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
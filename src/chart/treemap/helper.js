define(function (require) {

    return {

        irrelevant: function (payload, seriesModel) {
            return payload && payload.seriesId && seriesModel.uid !== payload.seriesId;
        },

        retrieveTargetNodeInfo: function (payload, seriesModel) {
            if (payload && payload.seriesId && seriesModel.uid !== payload.seriesId) {
                return;
            }
            if (!payload || payload.type !== 'treemapZoomToNode') {
                return;
            }

            // FIXME
            // 从payload中传来node是否合适？
            var root = seriesModel.getData().tree.root;
            var targetInfo = payload.targetInfo;
            if (!targetInfo || !root.contains(targetInfo.node)) {
                return;
            }

            return targetInfo;
        }

    };
});
define(function (require) {

    var echarts = require('../../echarts');

    echarts.registerAction({
        type: 'treeExpandAndCollapse',
        event: 'treeExpandAndCollapse',
        update: 'update'
    }, function (payload, ecModel) {
        ecModel.eachComponent({mainType: 'series', subType: 'tree', query: payload}, function (seriesModel) {
            var dataIndex = payload.dataIndex;
            var tree = seriesModel.getData().tree;
            var node = tree.getNodeByDataIndex(dataIndex);
            if (node.isExpand) {
                node.isExpand = false;
            }
            else {
                node.isExpand = true;
            }
        });
    });

});
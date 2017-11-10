import * as echarts from '../../echarts';

echarts.registerAction({
    type: 'treeExpandAndCollapse',
    event: 'treeExpandAndCollapse',
    update: 'update'
}, function (payload, ecModel) {
    ecModel.eachComponent({mainType: 'series', subType: 'tree', query: payload}, function (seriesModel) {
        var dataIndex = payload.dataIndex;
        var tree = seriesModel.getData().tree;
        var node = tree.getNodeByDataIndex(dataIndex);
        node.isExpand = !node.isExpand;

    });
});

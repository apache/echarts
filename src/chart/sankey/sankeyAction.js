import * as echarts from '../../echarts';

echarts.registerAction({
    type: 'dragNode',
    event: 'dragNode',
    // here can only use 'update' now, other value is not support in echarts.
    update: 'update'
}, function (payload, ecModel) {
    ecModel.eachComponent({mainType: 'series', subType: 'sankey', query: payload}, function (seriesModel) {
        seriesModel.setNodePosition(payload.dataIndex, [payload.localX, payload.localY]);
    });
});

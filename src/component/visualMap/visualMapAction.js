/**
 * @file Data range action
 */

var echarts = require('../../echarts');

var actionInfo = {
    type: 'selectDataRange',
    event: 'dataRangeSelected',
    // FIXME use updateView appears wrong
    update: 'update'
};

echarts.registerAction(actionInfo, function (payload, ecModel) {

    ecModel.eachComponent({mainType: 'visualMap', query: payload}, function (model) {
        model.setSelected(payload.selected);
    });

});

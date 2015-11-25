define(function (require) {

    var echarts = require('../../echarts');
    var roamHelper = require('../../action/roamHelper');

    var actionInfo = {
        type: 'graphRoam',
        event: 'graphRoam',
        update: 'none'
    };

    /**
     * @payload
     * @property {string} name Series name
     * @property {number} [dx]
     * @property {number} [dy]
     * @property {number} [zoom]
     * @property {number} [originX]
     * @property {number} [originY]
     */

    echarts.registerAction(actionInfo, function (payload, ecModel) {
        ecModel.eachComponent({mainType: 'series', query: payload}, function (seriesModel) {
            var coordSys = seriesModel.coordinateSystem;

            var roamDetailModel = seriesModel.getModel('roamDetail');
            var res = roamHelper.calcPanAndZoom(roamDetailModel, payload);

            seriesModel.setRoamPan
                && seriesModel.setRoamPan(res.x, res.y);

            seriesModel.setRoamZoom
                && seriesModel.setRoamZoom(res.zoom);

            coordSys && coordSys.setPan(res.x, res.y);
            coordSys && coordSys.setZoom(res.zoom);
        });
    });
});
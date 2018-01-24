import * as echarts from '../../echarts';
import {updateCenterAndZoom} from '../../action/roamHelper';

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

        var res = updateCenterAndZoom(coordSys, payload);

        seriesModel.setCenter
            && seriesModel.setCenter(res.center);

        seriesModel.setZoom
            && seriesModel.setZoom(res.zoom);
    });
});


/**
 * @payload
 * @property {number} [seriesIndex]
 * @property {string} [seriesId]
 * @property {string} [seriesName]
 * @property {number} [dataIndex]
 */
echarts.registerAction({
    type: 'focusNodeAdjacency',
    event: 'focusNodeAdjacency',
    update: 'series.graph:focusNodeAdjacency'
}, function () {});

/**
 * @payload
 * @property {number} [seriesIndex]
 * @property {string} [seriesId]
 * @property {string} [seriesName]
 */
echarts.registerAction({
    type: 'unfocusNodeAdjacency',
    event: 'unfocusNodeAdjacency',
    update: 'series.graph:unfocusNodeAdjacency'
}, function () {});

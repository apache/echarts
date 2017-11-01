/**
 * BMap component extension
 */

import * as echarts from 'echarts';
import BMapCoordSys from './BMapCoordSys';

import './BMapModel';
import './BMapView';

echarts.registerCoordinateSystem('bmap', BMapCoordSys);

// Action
echarts.registerAction({
    type: 'bmapRoam',
    event: 'bmapRoam',
    update: 'updateLayout'
}, function (payload, ecModel) {
    ecModel.eachComponent('bmap', function (bMapModel) {
        var bmap = bMapModel.getBMap();
        var center = bmap.getCenter();
        bMapModel.setCenterAndZoom([center.lng, center.lat], bmap.getZoom());
    });
});

export var version = '1.0.0';

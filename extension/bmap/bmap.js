/**
 * BMap component extension
 */
define(function (require) {

    require('echarts').registerCoordinateSystem(
        'bmap', require('./BMapCoordSys')
    );
    require('./BMapModel');
    require('./BMapView');

    // Action
    require('echarts').registerAction({
        type: 'bmapRoam',
        event: 'bmapRoam',
        update: 'updateLayout'
    }, function () {
        // Do nothing
        // console.log(payload);
    });
});
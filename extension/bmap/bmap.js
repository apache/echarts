var echarts = require("echarts");

var BMapCoordSys = require("./BMapCoordSys");

require("./BMapModel");

require("./BMapView");

/**
 * BMap component extension
 */
echarts.registerCoordinateSystem('bmap', BMapCoordSys); // Action

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
var version = '1.0.0';
exports.version = version;
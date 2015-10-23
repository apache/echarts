/**
 * @file Treemap action
 */
define(function(require) {

    // var zrUtil = require('zrender/core/util');
    var echarts = require('../../echarts');
    // var modelUtil = require('../../util/model');

    var actionInfo = {
        type: 'zoomToNode',
        update: 'updateView'
    };

    echarts.registerAction(actionInfo, function (payload, ecModel) {
        // do nothing
    });

});
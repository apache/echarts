/**
 * @file Treemap action
 */
define(function(require) {

    var echarts = require('../../echarts');

    var noop = function () {};

    echarts.registerAction({type: 'treemapZoomToNode', update: 'updateView'}, noop);
    echarts.registerAction({type: 'treemapRender', update: 'updateView'}, noop);
    echarts.registerAction({type: 'treemapMove', update: 'updateView'}, noop);

});
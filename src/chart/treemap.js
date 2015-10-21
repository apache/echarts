define(function (require) {

    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');

    require('./treemap/TreemapSeries');
    require('./treemap/TreemapView');

    echarts.registerVisualCoding('chart', require('./treemap/treemapVisual'));

    echarts.registerLayout(require('./treemap/TreemapLayout'), true);
});
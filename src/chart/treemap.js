define(function (require) {

    var echarts = require('../echarts');

    require('./treemap/TreemapSeries');
    require('./treemap/TreemapView');
    require('./treemap/TreemapAction');

    echarts.registerVisualCoding('chart', require('./treemap/treemapVisual'));

    echarts.registerLayout(require('./treemap/TreemapLayout'), true);
});
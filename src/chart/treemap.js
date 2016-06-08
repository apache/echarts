define(function (require) {

    var echarts = require('../echarts');

    require('./treemap/TreemapSeries');
    require('./treemap/TreemapView');
    require('./treemap/treemapAction');

    echarts.registerVisual(require('./treemap/treemapVisual'));

    echarts.registerLayout(require('./treemap/treemapLayout'));
});
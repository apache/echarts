define(function (require) {

    var echarts = require('../echarts');

    require('./sankey/SankeySeries');
    require('./sankey/SankeyView');
    echarts.registerLayout(require('./sankey/sankeyLayout'));
    echarts.registerVisual(require('./sankey/sankeyVisual'));
});
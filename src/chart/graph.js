define(function (require) {

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');

    require('./graph/GraphSeries');
    require('./graph/GraphView');

    require('./graph/roamAction');

    echarts.registerProcessor('filter', require('./graph/categoryFilter'));

    echarts.registerVisualCoding('chart', zrUtil.curry(
        require('../visual/symbol'), 'graph', 'circle', null
    ));
    echarts.registerVisualCoding('chart', require('./graph/categoryVisual'));

    echarts.registerLayout(require('./graph/simpleLayout'));
    echarts.registerLayout(require('./graph/circularLayout'));
    echarts.registerLayout(require('./graph/forceLayout'));

    // Graph view coordinate system
    echarts.registerCoordinateSystem('graphView', {
        create: require('./graph/createView')
    });
});
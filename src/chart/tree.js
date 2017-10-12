define(function (require) {

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');

    require('./tree/TreeSeries');
    require('./tree/TreeView');
    require('./tree/treeAction');

    echarts.registerVisual(zrUtil.curry(
        require('../visual/symbol'), 'tree', 'circle', null
    ));

    echarts.registerLayout(require('./tree/orthogonalLayout'));
    echarts.registerLayout(require('./tree/radialLayout'));

});
define(function (require) {

    var echarts = require('../echarts');

    require('./tree/TreeSeries');
    require('./tree/TreeView');
    echarts.registerLayout(require('./tree/orthogonalLayout'));

});
define(function (require) {

    var echarts = require('../echarts');

    require('../component/parallel');

    require('./parallel/ParallelSeries');
    require('./parallel/ParallelView');

    echarts.registerVisualCoding('chart', require('./parallel/parallelVisual'));

});
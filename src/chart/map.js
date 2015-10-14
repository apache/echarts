define(function (require) {

    var echarts = require('../echarts');

    require('./map/MapSeries');

    require('./map/MapView');

    echarts.registerLayout(require('./map/mapSymbolLayout'));

    echarts.registerVisualCoding('chart', require('./map/mapVisual'));

    echarts.registerProcessor('statistic', require('./map/mapDataStatistic'));
});
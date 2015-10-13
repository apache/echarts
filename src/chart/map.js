define(function (require) {

    var echarts = require('../echarts');

    require('./map/MapSeries');

    require('./map/MapView');

    echarts.registerProcessor('statistic', require('./map/mapDataStatistic'));
});
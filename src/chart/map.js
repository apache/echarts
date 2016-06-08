define(function (require) {

    var echarts = require('../echarts');
    var PRIORITY = echarts.PRIORITY;

    require('./map/MapSeries');

    require('./map/MapView');

    require('../action/geoRoam');

    require('../coord/geo/geoCreator');

    echarts.registerLayout(require('./map/mapSymbolLayout'));

    echarts.registerVisual(require('./map/mapVisual'));

    echarts.registerProcessor(PRIORITY.PROCESSOR.STATISTIC, require('./map/mapDataStatistic'));

    echarts.registerPreprocessor(require('./map/backwardCompat'));

    require('../action/createDataSelectAction')('map', [{
        type: 'mapToggleSelect',
        event: 'mapselectchanged',
        method: 'toggleSelected'
    }, {
        type: 'mapSelect',
        event: 'mapselected',
        method: 'select'
    }, {
        type: 'mapUnSelect',
        event: 'mapunselected',
        method: 'unSelect'
    }]);
});
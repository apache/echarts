import * as echarts from '../echarts';

import './map/MapSeries';
import './map/MapView';
import '../action/geoRoam';
import '../coord/geo/geoCreator';

import mapSymbolLayout from './map/mapSymbolLayout';
import mapVisual from './map/mapVisual';
import mapDataStatistic from './map/mapDataStatistic';
import backwardCompat from './map/backwardCompat';
import createDataSelectAction from '../action/createDataSelectAction';

echarts.registerLayout(mapSymbolLayout);
echarts.registerVisual(mapVisual);
echarts.registerProcessor(echarts.PRIORITY.PROCESSOR.STATISTIC, mapDataStatistic);
echarts.registerPreprocessor(backwardCompat);

createDataSelectAction('map', [{
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
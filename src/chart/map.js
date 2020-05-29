/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

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
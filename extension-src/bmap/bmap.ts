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

// @ts-nocheck
/**
 * BMap component extension
 */

import * as echarts from 'echarts';
import BMapCoordSys from './BMapCoordSys';

import './BMapModel';
import './BMapView';

echarts.registerCoordinateSystem('bmap', BMapCoordSys);

// Action
echarts.registerAction({
    type: 'bmapRoam',
    event: 'bmapRoam',
    update: 'updateLayout'
}, function (payload, ecModel) {
    ecModel.eachComponent('bmap', function (bMapModel) {
        const bmap = bMapModel.getBMap();
        const center = bmap.getCenter();
        bMapModel.setCenterAndZoom([center.lng, center.lat], bmap.getZoom());
    });
});

export const version = '1.0.0';

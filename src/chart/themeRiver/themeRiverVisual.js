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

/**
 * @file Visual encoding for themeRiver view
 * @author  Deqing Li(annong035@gmail.com)
 */

import {createHashMap} from 'zrender/src/core/util';

export default function (ecModel) {
    ecModel.eachSeriesByType('themeRiver', function (seriesModel) {
        var data = seriesModel.getData();
        var rawData = seriesModel.getRawData();
        var colorList = seriesModel.get('color');
        var idxMap = createHashMap();

        data.each(function (idx) {
            idxMap.set(data.getRawIndex(idx), idx);
        });

        rawData.each(function (rawIndex) {
            var name = rawData.getName(rawIndex);
            var color = colorList[(seriesModel.nameMap.get(name) - 1) % colorList.length];

            rawData.setItemVisual(rawIndex, 'color', color);

            var idx = idxMap.get(rawIndex);

            if (idx != null) {
                data.setItemVisual(idx, 'color', color);
            }
        });
    });
}
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

import * as zrUtil from 'zrender/src/core/util';

// FIXME 公用？
/**
 * @param {Array.<module:echarts/data/List>} datas
 * @param {string} statisticType 'average' 'sum'
 * @inner
 */
function dataStatistics(datas, statisticType) {
    var dataNameMap = {};

    zrUtil.each(datas, function (data) {
        data.each(data.mapDimension('value'), function (value, idx) {
            // Add prefix to avoid conflict with Object.prototype.
            var mapKey = 'ec-' + data.getName(idx);
            dataNameMap[mapKey] = dataNameMap[mapKey] || [];
            if (!isNaN(value)) {
                dataNameMap[mapKey].push(value);
            }
        });
    });

    return datas[0].map(datas[0].mapDimension('value'), function (value, idx) {
        var mapKey = 'ec-' + datas[0].getName(idx);
        var sum = 0;
        var min = Infinity;
        var max = -Infinity;
        var len = dataNameMap[mapKey].length;
        for (var i = 0; i < len; i++) {
            min = Math.min(min, dataNameMap[mapKey][i]);
            max = Math.max(max, dataNameMap[mapKey][i]);
            sum += dataNameMap[mapKey][i];
        }
        var result;
        if (statisticType === 'min') {
            result = min;
        }
        else if (statisticType === 'max') {
            result = max;
        }
        else if (statisticType === 'average') {
            result = sum / len;
        }
        else {
            result = sum;
        }
        return len === 0 ? NaN : result;
    });
}

export default function (ecModel) {
    var seriesGroups = {};
    ecModel.eachSeriesByType('map', function (seriesModel) {
        var hostGeoModel = seriesModel.getHostGeoModel();
        var key = hostGeoModel ? 'o' + hostGeoModel.id : 'i' + seriesModel.getMapType();
        (seriesGroups[key] = seriesGroups[key] || []).push(seriesModel);
    });

    zrUtil.each(seriesGroups, function (seriesList, key) {
        var data = dataStatistics(
            zrUtil.map(seriesList, function (seriesModel) {
                return seriesModel.getData();
            }),
            seriesList[0].get('mapValueCalculation')
        );

        for (var i = 0; i < seriesList.length; i++) {
            seriesList[i].originalData = seriesList[i].getData();
        }

        // FIXME Put where?
        for (var i = 0; i < seriesList.length; i++) {
            seriesList[i].seriesGroup = seriesList;
            seriesList[i].needsDrawMap = i === 0 && !seriesList[i].getHostGeoModel();

            seriesList[i].setData(data.cloneShallow());
            seriesList[i].mainSeries = seriesList[0];
        }
    });
}
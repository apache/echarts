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
import List from '../../data/List';
import MapSeries, { MapValueCalculationType } from './MapSeries';
import GlobalModel from '../../model/Global';

// FIXME 公用？
function dataStatistics(datas: List[], statisticType: MapValueCalculationType): List {
    const dataNameMap = {} as {[mapKey: string]: number[]};

    zrUtil.each(datas, function (data) {
        data.each(data.mapDimension('value'), function (value: number, idx) {
            // Add prefix to avoid conflict with Object.prototype.
            const mapKey = 'ec-' + data.getName(idx);
            dataNameMap[mapKey] = dataNameMap[mapKey] || [];
            if (!isNaN(value)) {
                dataNameMap[mapKey].push(value);
            }
        });
    });

    return datas[0].map(datas[0].mapDimension('value'), function (value, idx) {
        const mapKey = 'ec-' + datas[0].getName(idx);
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        const len = dataNameMap[mapKey].length;
        for (let i = 0; i < len; i++) {
            min = Math.min(min, dataNameMap[mapKey][i]);
            max = Math.max(max, dataNameMap[mapKey][i]);
            sum += dataNameMap[mapKey][i];
        }
        let result;
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

export default function mapDataStatistic(ecModel: GlobalModel): void {
    const seriesGroups = {} as {[key: string]: MapSeries[]};
    ecModel.eachSeriesByType('map', function (seriesModel: MapSeries) {
        const hostGeoModel = seriesModel.getHostGeoModel();
        const key = hostGeoModel ? 'o' + hostGeoModel.id : 'i' + seriesModel.getMapType();
        (seriesGroups[key] = seriesGroups[key] || []).push(seriesModel);
    });

    zrUtil.each(seriesGroups, function (seriesList, key) {
        const data = dataStatistics(
            zrUtil.map(seriesList, function (seriesModel) {
                return seriesModel.getData();
            }),
            seriesList[0].get('mapValueCalculation')
        );

        for (let i = 0; i < seriesList.length; i++) {
            seriesList[i].originalData = seriesList[i].getData();
        }

        // FIXME Put where?
        for (let i = 0; i < seriesList.length; i++) {
            seriesList[i].seriesGroup = seriesList;
            seriesList[i].needsDrawMap = i === 0 && !seriesList[i].getHostGeoModel();

            seriesList[i].setData(data.cloneShallow());
            seriesList[i].mainSeries = seriesList[0];
        }
    });
}
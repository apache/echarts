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
import SeriesData from '../../data/SeriesData';
import { buildAllMapSeriesGroups, getMainMapSeries, MapValueCalculationType, SERIES_TYPE_MAP } from './MapSeries';
import GlobalModel from '../../model/Global';
import { createSimpleOverallStageHandler } from '../../util/model';

// FIXME 公用？
function dataStatistics(datas: SeriesData[], statisticType: MapValueCalculationType): SeriesData {
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

export const mapDataStatisticStageHandler = createSimpleOverallStageHandler(SERIES_TYPE_MAP, mapDataStatistic);

function mapDataStatistic(ecModel: GlobalModel): void {
    zrUtil.each(buildAllMapSeriesGroups(ecModel), function (seriesGroup) {
        const mainSeries = getMainMapSeries(seriesGroup);
        if (!mainSeries) {
            return;
        }
        const data = dataStatistics(
            zrUtil.map(seriesGroup.f, function (seriesModel) {
                return seriesModel.getData();
            }),
            // PENDING: It has long been using `seriesGroup[0]` here, but if the first map series
            // is filtered out by legend, `seriesGroup[0]` is the second series in ec option, therefore,
            // this definition is not reasonable enough for users.
            mainSeries.get('mapValueCalculation')
        );

        zrUtil.each(seriesGroup.f, function (series) {
            series.seriesGroup = seriesGroup;
            series.originalData = series.getData();
            series.setData(data.cloneShallow());
        });
    });
}

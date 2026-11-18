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


import { EChartsType, registerMap } from '@/src/echarts';
import { GeoJSON } from '@/src/coord/geo/geoTypes';
import CartesianAxisModel from '@/src/coord/cartesian/AxisModel';
import RadarModel from '@/src/coord/radar/RadarModel';
import GeoModel from '@/src/coord/geo/GeoModel';
import { makeLabelFormatter } from '@/src/coord/axisHelper';
import { createChart, getECModel } from '../../core/utHelper';

describe('string formatter templates', function () {

    const geoJson: GeoJSON = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10]]]
            },
            properties: { name: 'A' }
        }]
    };
    registerMap('string_formatter_test', geoJson);

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    it.each(['$&', '$$', '$`', '$\'', 'ordinary text'])('keeps %s in category axis labels', text => {
        const name = 'Item ' + text;
        chart.setOption({
            xAxis: { type: 'category', data: [name], axisLabel: { formatter: 'Label: {value}' } },
            yAxis: {},
            series: [{ type: 'bar', data: [1] }]
        });
        const axis = (getECModel(chart).getComponent('xAxis', 0) as CartesianAxisModel).axis;
        expect(makeLabelFormatter(axis)({ value: 0 })).toBe('Label: ' + name);
    });

    it.each(['$&', '$$', '$`', '$\'', 'ordinary text'])('keeps %s in radar indicator names', text => {
        const name = 'Indicator ' + text;
        chart.setOption({
            radar: {
                indicator: [{ name: name, max: 10 }, { name: 'B', max: 10 }, { name: 'C', max: 10 }],
                axisName: { formatter: 'Name: {value}' }
            },
            series: [{ type: 'radar', data: [{ value: [1, 2, 3] }] }]
        });
        const radarModel = getECModel(chart).getComponent('radar', 0) as RadarModel;
        expect(radarModel.getIndicatorModels()[0].get('name')).toBe('Name: ' + name);
    });

    it.each(['$&', '$$', '$`', '$\'', 'ordinary text'])('keeps %s in geo region labels', text => {
        const name = 'Region ' + text;
        chart.setOption({
            geo: { map: 'string_formatter_test', label: { formatter: 'Geo: {a}' } }
        });
        const geoModel = getECModel(chart).getComponent('geo', 0) as GeoModel;
        expect(geoModel.getFormattedLabel(name, 'normal')).toBe('Geo: ' + name);
    });
});

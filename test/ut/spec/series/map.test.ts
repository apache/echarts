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


import { registerMap } from '../../../../src/echarts';
import { GeoJSON } from '../../../../src/coord/geo/geoTypes';
import { createChart } from '../../core/utHelper';


describe('map', function () {

    function square(name: string, x: number): GeoJSON['features'][number] {
        return {
            type: 'Feature',
            properties: { name },
            geometry: {
                type: 'Polygon',
                coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]]
            }
        };
    }

    registerMap('map_test_layout', {
        type: 'FeatureCollection',
        features: [square('A', 0), square('B', 1), square('C', 2)]
    });

    function getValuesByName(seriesLayoutBy: 'row' | 'column', source: (string | number)[][]) {
        const chart = createChart();
        try {
            chart.setOption({
                animation: false,
                dataset: { source },
                series: [{
                    type: 'map',
                    map: 'map_test_layout',
                    seriesLayoutBy,
                    encode: { itemName: 0, value: 1 }
                }]
            });
            const data = (chart as any).getModel().getSeriesByIndex(0).getData();
            const valueDim = data.mapDimension('value');
            const result: Record<string, number> = {};
            data.each(function (idx: number) {
                result[data.getName(idx)] = data.get(valueDim, idx);
            });
            return result;
        }
        finally {
            chart.dispose();
        }
    }

    it('should read dataset in column layout and complete missing regions', function () {
        expect(getValuesByName('column', [
            ['name', 'val'],
            ['A', 10],
            ['B', 20]
        ])).toEqual({ A: 10, B: 20, C: NaN });
    });

    it('should read dataset in row layout and complete missing regions', function () {
        expect(getValuesByName('row', [
            ['name', 'A', 'B'],
            ['val', 10, 20]
        ])).toEqual({ A: 10, B: 20, C: NaN });
    });

});

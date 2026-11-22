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

import { createChart, getECModel } from '../../core/utHelper';
import ThemeRiverSeriesModel from '@/src/chart/themeRiver/ThemeRiverSeries';

describe('themeRiver boundaryGap', function () {
    (['horizontal', 'vertical'] as const).forEach(function (orient) {
        it('recalculates percentage gaps after resizing ' + orient + ' charts', function () {
            const chart = createChart({width: 240, height: 390});
            const fresh = createChart({width: 400, height: 300});
            const option = {
                animation: false,
                singleAxis: {type: 'time' as const, orient, top: 20, bottom: 30},
                series: [{
                    type: 'themeRiver' as const,
                    data: [
                        ['2015/11/08', 10, 'a'], ['2015/11/09', 15, 'a'],
                        ['2015/11/08', 35, 'b'], ['2015/11/09', 36, 'b']
                    ]
                }]
            };

            try {
                chart.setOption(option);
                chart.resize({width: 400, height: 300});
                fresh.setOption(option);

                const series = getECModel(chart).getSeriesByIndex(0) as ThemeRiverSeriesModel;
                const data = series.getData();
                const expected = getECModel(fresh).getSeriesByIndex(0).getData();
                expect(series.get('boundaryGap')).toEqual(['10%', '10%']);
                expect(data.getLayout('layoutInfo')).toEqual(expected.getLayout('layoutInfo'));
                for (let i = 0; i < data.count(); i++) {
                    expect(data.getItemLayout(i)).toEqual(expected.getItemLayout(i));
                }
            }
            finally {
                chart.dispose();
                fresh.dispose();
            }
        });
    });
});

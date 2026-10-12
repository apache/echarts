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

import { createChart, removeChart } from '../../core/utHelper';
import { EChartsType } from '@/src/echarts';

describe('pie universalTransition', function () {

    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart({ width: 400, height: 300 });
    });

    afterEach(function () {
        removeChart(chart);
    });

    function pieWithSeriesKey(groups: string[]) {
        return {
            series: [{
                type: 'pie',
                universalTransition: {
                    enabled: true,
                    seriesKey: groups.map(group => 'metric-' + group)
                },
                data: groups.map((group, idx) => ({ name: group, value: idx + 1 }))
            }]
        };
    }

    // An array seriesKey whose members no longer match the previous update (e.g. a pie whose
    // categories shrink after filtering) must skip the transition instead of throwing.
    it('should not throw when an array seriesKey has members missing from the old series', function () {
        chart.setOption(pieWithSeriesKey(['A', 'B']));

        expect(() => chart.setOption(pieWithSeriesKey(['B']), { replaceMerge: ['series'] })).not.toThrow();
        // The old series snapshot must be refreshed too, or every later update throws again.
        expect(() => chart.setOption(pieWithSeriesKey(['B']), { replaceMerge: ['series'] })).not.toThrow();
        expect((chart as any).getModel().getSeriesByIndex(0).getData().count()).toBe(1);
    });

});

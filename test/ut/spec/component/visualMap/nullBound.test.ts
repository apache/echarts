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

import { createChart } from '../../../core/utHelper';


describe('visualMap_nullBound', function () {
    it('does not throw when line visualMap piece bound is null', function () {
        const chart = createChart();

        expect(function () {
            chart.setOption({
                xAxis: {},
                yAxis: {},
                visualMap: {
                    type: 'piecewise',
                    pieces: [{
                        lte: null as any,
                        color: '#ff0000'
                    }]
                },
                series: [{
                    type: 'line',
                    data: [1, 2, 3, 4]
                }]
            });
        }).not.toThrow();

        chart.dispose();
    });
});

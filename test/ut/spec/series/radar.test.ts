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

import { createChart } from '../../core/utHelper';

describe('radar', function () {

    it('should start the entry animation of symbols from the center', function () {
        const chart = createChart({width: 400, height: 400});
        try {
            chart.setOption({
                radar: { center: [200, 200], indicator: [{ max: 10 }, { max: 10 }, { max: 10 }] },
                series: [{ type: 'radar', data: [{ value: [10, 10, 10] }] }]
            });
            const series = (chart as any).getModel().getSeriesByIndex(0);
            const symbol = series.getData().getItemGraphicEl(0).childAt(2).childAt(0);
            expect([symbol.x, symbol.y]).toEqual([200, 200]);
        }
        finally {
            chart.dispose();
        }
    });

});

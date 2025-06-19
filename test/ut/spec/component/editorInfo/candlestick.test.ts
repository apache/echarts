
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

import { isChartElementHaveEditorInfo, ChartWaitTest } from '../../../core/editorInfoUtHelper';

const chartsWaitTest: ChartWaitTest[] = [
  {
    describeText: 'editorInfo/candlestick',
    charts: [{
      options: {
        xAxis: {
          data: ['2017-10-24', '2017-10-25', '2017-10-26', '2017-10-27']
        },
        yAxis: {},
        series: [
          {
            type: 'candlestick',
            data: [
              [20, 34, 10, 38],
              [40, 35, 30, 50],
              [31, 38, 33, 44],
              [38, 15, 5, 42]
            ]
          }
        ]
      },
      cases: [{
        describeText: 'series-candlestick-candlestick',
        editorInfo: {
          component: 'series',
          subType: 'candlestick',
          element: 'candlestick',
          componentIndex: 0
        }
      }, {
        describeText: 'series-candlestick-dataIndex',
        editorInfo: {
          component: 'series',
          subType: 'candlestick',
          element: 'candlestick',
          componentIndex: 0,
          dataIndex: 3
        }
      }]
    }]
  }
];
isChartElementHaveEditorInfo(chartsWaitTest);


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
    describeText: 'editorInfo/pictorialBar',
    charts: [{
      options: {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'none'
          }
        },
        xAxis: {
          data: ['驯鹿', '火箭', '飞机', '高铁', '轮船', '汽车', '跑步', '步行'],
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: {
            color: '#e54035'
          }
        },
        yAxis: {
          splitLine: { show: false },
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { show: false }
        },
        color: ['#e54035'],
        series: [
          {
            type: 'pictorialBar',
            barCategoryGap: '-130%',
            // symbol: 'path://M0,10 L10,10 L5,0 L0,10 z',
            symbol: 'path://M0,10 L10,10 C5.5,10 5.5,5 5,0 C4.5,5 4.5,10 0,10 z',
            itemStyle: {
              opacity: 0.5
            },
            emphasis: {
              itemStyle: {
                opacity: 1
              }
            },
            data: [123, 60, 25, 18, 12, 9, 2, 1],
            z: 10
          }
        ]
      },
      cases: [{
        describeText: 'series-pictorialBar-symbolPath',
        editorInfo: {
          component: 'series',
          subType: 'pictorialBar',
          element: 'symbolPath'
        }
      }, {
        describeText: 'series-pictorialBar-symbolPath-dataIndex',
        editorInfo: {
          component: 'series',
          subType: 'pictorialBar',
          element: 'symbolPath',
          dataIndex: 7
        }
      }]
    }]
  }
];
isChartElementHaveEditorInfo(chartsWaitTest);

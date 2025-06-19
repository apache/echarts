
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
    describeText: 'editorInfo/gauge',
    charts: [{
      options: {
        series: [
          {
            type: 'gauge',
            progress: {
              show: true,
              width: 18
            },
            axisLine: {
              lineStyle: {
                width: 18
              }
            },
            axisTick: {
              show: true
            },
            splitLine: {
              length: 15,
              lineStyle: {
                width: 2,
                color: '#999'
              }
            },
            axisLabel: {
              distance: 25,
              color: '#999',
              fontSize: 20
            },
            anchor: {
              show: true,
              showAbove: true,
              size: 25,
              itemStyle: {
                borderWidth: 10
              }
            },
            pointer: {
              show: true
            },
            title: {
              show: true
            },
            detail: {
              valueAnimation: true,
              fontSize: 80,
              offsetCenter: [0, '70%']
            },
            data: [
              {
                value: 70,
                title: {
                  show: true
                },
                name: 'gauge title',
                detail: {
                  show: true
                }
              }
            ]
          }
        ]
      },
      cases: [{
        describeText: 'series-gauge-sector',
        editorInfo: {
          component: 'series',
          subType: 'gauge',
          element: 'sector',
          componentIndex: 0
        }
      }, {
        describeText: 'series-gauge-splitLine',
        editorInfo: {
          component: 'series',
          subType: 'gauge',
          element: 'splitLine',
          componentIndex: 0
        }
      }, {
        describeText: 'series-gauge-label',
        editorInfo: {
          component: 'series',
          subType: 'gauge',
          element: 'label',
          componentIndex: 0
        }
      }, {
        describeText: 'series-gauge-tickLine',
        editorInfo: {
          component: 'series',
          subType: 'gauge',
          element: 'tickLine',
          componentIndex: 0
        }
      }, {
        describeText: 'series-gauge-pointer',
        editorInfo: {
          component: 'series',
          subType: 'gauge',
          element: 'pointer',
          componentIndex: 0
        }
      }, {
        describeText: 'series-gauge-progress',
        editorInfo: {
          component: 'series',
          subType: 'gauge',
          element: 'progress',
          componentIndex: 0
        }
      }, {
        describeText: 'series-gauge-anchor',
        editorInfo: {
          component: 'series',
          subType: 'gauge',
          element: 'anchor',
          componentIndex: 0
        }
      }, {
        describeText: 'series-gauge-title',
        editorInfo: {
          component: 'series',
          subType: 'gauge',
          element: 'title',
          componentIndex: 0
        }
      }, {
        describeText: 'series-gauge-detail',
        editorInfo: {
          component: 'series',
          subType: 'gauge',
          element: 'detail',
          componentIndex: 0
        }
      }]
    }]
  }
];
isChartElementHaveEditorInfo(chartsWaitTest);



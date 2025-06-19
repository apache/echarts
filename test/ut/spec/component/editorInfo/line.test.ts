
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
    describeText: 'editorInfo/line',
    charts: [{
      options: {
        xAxis: {
          type: 'category',
          data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            data: [150, 230, 224, 218, 135, 147, 260],
            type: 'line',
            label: {
              show: true,
              distance: 20
            },
            endLabel: {
              show: true
            },
            labelLine: {
              show: true,
              smooth: true
            },
            name: 'value'
          }, {
            data: [100, 200, 224, 218, 105, 107, 290],
            type: 'line',
            label: {
              show: true,
              distance: 20
            },
            endLabel: {
              show: true
            },
            labelLine: {
              show: true,
              smooth: true
            },
            name: 'value'
          }
        ]
      },
      cases: [{
        describeText: 'series-line-polyline',
        editorInfo: {
          component: 'series',
          subType: 'line',
          element: 'polyline',
          componentIndex: 0
        }
      }, {
        describeText: 'series-line-polyline-dataIndex',
        editorInfo: {
          component: 'series',
          subType: 'line',
          element: 'polyline',
          componentIndex: 0
        }
      }, {
        describeText: 'series-line-labelLine',
        editorInfo: {
          component: 'series',
          subType: 'line',
          element: 'labelLine',
          componentIndex: 0
        }
      }, {
        describeText: 'series-line-symbol',
        editorInfo: {
          component: 'series',
          subType: 'line',
          element: 'symbol',
          componentIndex: 1
        }
      }, {
        describeText: 'series-line-symbol-dataIndex',
        editorInfo: {
          component: 'series',
          subType: 'line',
          element: 'symbol',
          componentIndex: 1,
          dataIndex: 6
        }
      }, {
        describeText: 'series-line-label',
        editorInfo: {
          component: 'series',
          subType: 'line',
          element: 'label',
          componentIndex: 1
        }
      }, {
        describeText: 'series-line-label-dataIndex',
        editorInfo: {
          component: 'series',
          subType: 'line',
          element: 'label',
          componentIndex: 1,
          dataIndex: 6
        }
      }, {
        describeText: 'series-line-endLabel',
        editorInfo: {
          component: 'series',
          subType: 'line',
          element: 'endLabel',
          componentIndex: 1
        }
      }]
    }]
  }
];
isChartElementHaveEditorInfo(chartsWaitTest);

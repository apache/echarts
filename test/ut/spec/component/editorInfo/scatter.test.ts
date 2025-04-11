
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
    describeText: 'editorInfo/scatter',
    charts: [{
      options: {
        xAxis: {
          scale: true
        },
        yAxis: {
          scale: true
        },
        series: [
          {
            type: 'effectScatter',
            symbolSize: 20,
            label: {
              show: true
            },
            labelLine: {
              show: true
            },
            data: [
              [172.7, 105.2],
              [153.4, 42]
            ]
          },
          {
            type: 'scatter',
            label: {
              show: true
            },
            labelLine: {
              show: true
            },
            data: [[161.2, 51.6], [167.5, 59.0], [159.5, 49.2], [157.0, 63.0], [155.8, 53.6]]
          }
        ]
      },
      cases: [{
        describeText: 'series-scatter',
        editorInfo: {
          component: 'series',
          subType: 'scatter',
          element: 'scatter',
          componentIndex: 1
        }
      }, {
        describeText: 'series-symbol-dataIndex',
        editorInfo: {
          component: 'series',
          subType: 'scatter',
          element: 'symbol',
          componentIndex: 1,
          dataIndex: 4
        }
      }, {
        describeText: 'series-effectScatter',
        editorInfo: {
          component: 'series',
          subType: 'effectScatter',
          element: 'effectScatter',
          componentIndex: 0
        }
      }, {
        describeText: 'series-effectScatter-label',
        editorInfo: {
          component: 'series',
          subType: 'effectScatter',
          element: 'label',
          componentIndex: 0
        }
      }, {
        describeText: 'series-scatter-label',
        editorInfo: {
          component: 'series',
          subType: 'scatter',
          element: 'label',
          componentIndex: 1
        }
      }, {
        describeText: 'series-scatter-label-dataIndex',
        editorInfo: {
          component: 'series',
          subType: 'scatter',
          element: 'label',
          componentIndex: 1,
          dataIndex: 3
        }
      }]
    }]
  }
];
isChartElementHaveEditorInfo(chartsWaitTest);


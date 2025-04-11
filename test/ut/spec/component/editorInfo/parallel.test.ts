
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
    describeText: 'editorInfo/parallel',
    charts: [{
      options: {
        parallelAxis: [
          { dim: 0, name: 'Price' },
          { dim: 1, name: 'Net Weight' },
          { dim: 2, name: 'Amount' },
          {
            dim: 3,
            name: 'Score',
            type: 'category',
            data: ['Excellent', 'Good', 'OK', 'Bad']
          }
        ],
        series: {
          type: 'parallel',
          lineStyle: {
            width: 2
          },
          data: [
            [12.99, 100, 82, 'Good'],
            [9.99, 80, 77, 'OK'],
            [20, 120, 60, 'Excellent']
          ]
        }
      },
      cases: [{
        describeText: 'parallel-line',
        editorInfo: {
          component: 'series',
          subType: 'parallel',
          element: 'line',
          componentIndex: 0
        }
      }, {
        describeText: 'parallel-line-dataIndex',
        editorInfo: {
          component: 'series',
          subType: 'parallel',
          element: 'line',
          componentIndex: 0,
          dataIndex: 2
        }
      }, {
        describeText: 'parallel-axisLabel',
        editorInfo: {
          component: 'parallelAxis',
          subType: 'value',
          element: 'axisLabel',
          componentIndex: 0
        }
      }, {
        describeText: 'parallel-majorTicks',
        editorInfo: {
          component: 'parallelAxis',
          subType: 'value',
          element: 'majorTicks',
          componentIndex: 0
        }
      }, {
        describeText: 'parallel-axisName',
        editorInfo: {
          component: 'parallelAxis',
          element: 'axisName',
          subType: 'value',
          componentIndex: 0
        }
      }, {
        describeText: 'parallel-axisLine',
        editorInfo: {
          component: 'parallelAxis',
          element: 'axisLine',
          componentIndex: 0,
          subType: 'value'
        }
      }]
    }]
  }
];
isChartElementHaveEditorInfo(chartsWaitTest);

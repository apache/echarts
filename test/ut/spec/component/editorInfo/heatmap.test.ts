
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
    describeText: 'editorInfo/heatmap',
    charts: [{
      options: {
        tooltip: {
          position: 'top'
        },
        grid: {
          height: '50%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          data: [
            '12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a'
          ],
          splitArea: {
            show: true
          }
        },
        yAxis: {
          type: 'category',
          data: [
            'Saturday', 'Friday', 'Thursday',
            'Wednesday', 'Tuesday', 'Monday', 'Sunday'
          ],
          splitArea: {
            show: true
          }
        },
        visualMap: {
          min: 0,
          max: 10,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '15%'
        },
        series: [
          {
            name: 'Punch Card',
            type: 'heatmap',
            data: [[0, 0, 5], [1, 1, 6]],
            label: {
              show: true
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      },
      cases: [{
        describeText: 'series-chartOnCartesian-rect',
        editorInfo: {
          component: 'series',
          subType: 'heatmap',
          element: 'rect',
          componentIndex: 0
        }
      }, {
        describeText: 'series-chartOnCartesian-rect-dataIndex',
        editorInfo: {
          component: 'series',
          subType: 'heatmap',
          element: 'rect',
          componentIndex: 0,
          dataIndex: 1
        }
      }]
    }, {
      options: {
        'calendar': {
          'orient': 'vertical',
          'itemStyle': {
            'color': 'rgba(255,255,255,0)',
            'borderColor': 'rgb(102, 102, 102)',
            'borderWidth': 1
          },
          'splitLine': {
            'lineStyle': {
              'color': 'rgb(153, 153, 153)',
              'width': 1
            }
          },
          'yearLabel': {
            'show': true,
            'fontFamily': 'Microsoft YaHei',
            'fontSize': 12,
            'color': '#D3D3D3'
          },
          'dayLabel': {
            'show': true,
            'fontFamily': 'Microsoft YaHei',
            'fontSize': 14,
            'color': '#FFFFFF'
          },
          'monthLabel': {
            'show': true,
            'fontFamily': 'Microsoft YaHei',
            'fontSize': 12,
            'color': '#D3D3D3'
          },
          'range': [
            1640966400000,
            1643472000000
          ]
        },
        'visualMap': {
          'min': 0,
          'max': 10000,
          'type': 'piecewise',
          'orient': 'horizontal',
          'left': 'center',
          'top': 65,
          'show': false
        },
        'series': [
          {
            'type': 'heatmap',
            'name': 'value',
            'coordinateSystem': 'calendar',
            'data': [[
              '2022-01-01',
              22
            ]],
            'symbol': 'square',
            'itemStyle': {
              'borderType': 'solid',
              'borderColor': '#1890ff',
              'borderWidth': 0
            }
          }
        ],
        'type': 'basicCalendar'
      },
      cases: [{
        describeText: 'series-chartOnCalendar-rect',
        editorInfo: {
          component: 'series',
          subType: 'heatmap',
          element: 'rect',
          componentIndex: 0
        }
      }]
    }]
  }
];
isChartElementHaveEditorInfo(chartsWaitTest);


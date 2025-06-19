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
    describeText: 'editorInfo/axis',
    charts: [{
      options: {
        xAxis: {
          type: 'category',
          data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
          name: 'test',
          type: 'value',
          splitLine: {
            show: true
          },
          axisLine: {
            show: true,
            symbol: ['none', 'arrow']
          },
          minorSplitLine: {
            show: true
          },
          splitArea: {
            show: true
          },
          axisTick: {
            show: true
          },
          minorTick: {
            show: true
          }
        },
        series: [
          {
            data: [150, 230, 224, 218, 135, 147, 260],
            type: 'line'
          }
        ]
      },
      cases: [{
        describeText: 'axis-minorSplitLine',
        editorInfo: {
          component: 'yAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'minorSplitLine'
        }
      }, {
        describeText: 'axis-splitLine',
        editorInfo: {
          component: 'yAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'minorSplitLine'
        }
      }, {
        describeText: 'axis-axisName',
        editorInfo: {
          component: 'yAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'axisName'
        }
      }, {
        describeText: 'axis-minorTicks',
        editorInfo: {
          component: 'yAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'minorTicks'
        }
      }, {
        describeText: 'axis-axisLabel',
        editorInfo: {
          component: 'yAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'axisLabel'
        }
      }, {
        describeText: 'axis-axisLineSymbol',
        editorInfo: {
          component: 'yAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'axisLineSymbol'
        }
      }, {
        describeText: 'axis-axisLine',
        editorInfo: {
          component: 'yAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'axisLine'
        }
      }]
    }]
  },
  {
    describeText: 'editorInfo/radius-angle-axis',
    charts: [{
      options: {
        polar: {
          radius: [30, '80%']
        },
        angleAxis: {
          max: 4,
          startAngle: 75,
          splitLine: {
            show: true
          },
          axisLine: {
            show: true
          },
          minorSplitLine: {
            show: true
          },
          splitArea: {
            show: true
          },
          axisTick: {
            show: true
          },
          minorTick: {
            show: true
          }
        },
        radiusAxis: {
          type: 'category',
          data: ['a', 'b', 'c', 'd'],
          splitLine: {
            show: true
          },
          axisLine: {
            show: true,
            symbol: ['none', 'arrow']
          },
          splitArea: {
            show: true
          },
          axisTick: {
            show: true
          }
        },
        tooltip: {},
        series: {
          type: 'bar',
          data: [2, 1.2, 2.4, 3.6],
          coordinateSystem: 'polar',
          label: {
            show: true,
            position: 'middle',
            formatter: '{b}: {c}'
          }
        }
      },
      cases: [{
        describeText: 'angleAxis-splitArea',
        editorInfo: {
          component: 'angleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'splitArea'
        }
      }, {
        describeText: 'angleAxis-axisLabel',
        editorInfo: {
          component: 'angleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'axisLabel'
        }
      }, {
        describeText: 'radiusAxis-axisLineSymbol',
        editorInfo: {
          component: 'radiusAxis',
          componentIndex: 0,
          subType: 'category',
          element: 'axisLineSymbol'
        }
      }, {
        describeText: 'angleAxis-axisLine',
        editorInfo: {
          component: 'angleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'axisLine'
        }
      }, {
        describeText: 'angleAxis-minorSplitLine',
        editorInfo: {
          component: 'angleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'minorSplitLine'
        }
      }, {
        describeText: 'radiusAxis-splitArea',
        editorInfo: {
          component: 'radiusAxis',
          componentIndex: 0,
          subType: 'category',
          element: 'splitArea'
        }
      }, {
        describeText: 'radiusAxis-splitLine',
        editorInfo: {
          component: 'radiusAxis',
          componentIndex: 0,
          subType: 'category',
          element: 'splitLine'
        }
      }, {
        describeText: 'radiusAxis-majorTicks',
        editorInfo: {
          component: 'radiusAxis',
          componentIndex: 0,
          subType: 'category',
          element: 'majorTicks'
        }
      }, {
        describeText: 'radiusAxis-axisLabel',
        editorInfo: {
          component: 'radiusAxis',
          componentIndex: 0,
          subType: 'category',
          element: 'axisLabel'
        }
      }]
    }]
  },
  {
    describeText: 'editorInfo/single-axis',
    charts: [{
      options: {
        singleAxis: [
          {
            left: 150,
            type: 'value',
            boundaryGap: false,
            data: [],
            splitLine: {
              show: true
            },
            axisLine: {
              show: true,
              symbol: ['none', 'arrow']
            },
            minorSplitLine: {
              show: true
            },
            splitArea: {
              show: true
            },
            axisTick: {
              show: true
            },
            minorTick: {
              show: true
            },
            top: '5%',
            height: '4.2857142857142865%',
            axisLabel: {
              interval: 2
            }
          }
        ],
        series: [
          {
            singleAxisIndex: 0,
            coordinateSystem: 'singleAxis',
            type: 'scatter',
            data: [
              [0, 5],
              [1, 1],
              [2, 0],
              [3, 0],
              [4, 0],
              [5, 0],
              [6, 0],
              [7, 0],
              [8, 0],
              [9, 0],
              [10, 0],
              [11, 2],
              [12, 4],
              [13, 1],
              [14, 1],
              [15, 3],
              [16, 4],
              [17, 6],
              [18, 4],
              [19, 4],
              [20, 3],
              [21, 3],
              [22, 2],
              [23, 5]
            ]
          }
        ]
      },
      cases: [{
        describeText: 'single-axis-minorTicks',
        editorInfo: {
          component: 'singleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'minorTicks'
        }
      }, {
        describeText: 'single-axis-splitLine',
        editorInfo: {
          component: 'singleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'splitLine'
        }
      }, {
        describeText: 'single-axis-axisLabel',
        editorInfo: {
          component: 'singleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'axisLabel'
        }
      }, {
        describeText: 'single-axis-majorTicks',
        editorInfo: {
          component: 'singleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'majorTicks'
        }
      }, {
        describeText: 'single-axis-axisLineSymbol',
        editorInfo: {
          component: 'singleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'axisLineSymbol'
        }
      }, {
        describeText: 'single-axis-axisLine',
        editorInfo: {
          component: 'singleAxis',
          componentIndex: 0,
          subType: 'value',
          element: 'axisLine'
        }
      }]
    }]
  }
];
isChartElementHaveEditorInfo(chartsWaitTest);

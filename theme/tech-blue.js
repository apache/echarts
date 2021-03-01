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

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports, require('echarts/lib/echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
})(this, function(exports, echarts) {
    var log = function(msg) {
        if (typeof console !== 'undefined') {
            console && console.error && console.error(msg);
        }
    };
    if (!echarts) {
        log('ECharts is not Loaded');
        return;
    }

    var colorPalette = [
        '#4d4d4d',
        '#3a5897',
        '#007bb6',
        '#7094db',
        '#0080ff',
        '#b3b3ff',
        '#00bdec',
        '#33ccff',
        '#ccddff',
        '#eeeeee'
    ];

    var theme = {
        color: colorPalette,

        title: {
            textStyle: {
                fontWeight: 'normal',
                color: '#00aecd'
            }
        },

        visualMap: {
            color: ['#00aecd', '#a2d4e6']
        },

        toolbox: {
            color: ['#00aecd', '#00aecd', '#00aecd', '#00aecd']
        },

        tooltip: {
            backgroundColor: 'rgba(0,0,0,0.5)',
            axisPointer: {
                // Axis indicator, coordinate trigger effective
                type: 'line', // The default is a straight line： 'line' | 'shadow'
                lineStyle: {
                    // Straight line indicator style settings
                    color: '#00aecd',
                    type: 'dashed'
                },
                crossStyle: {
                    color: '#00aecd'
                },
                shadowStyle: {
                    // Shadow indicator style settings
                    color: 'rgba(200,200,200,0.3)'
                }
            }
        },

        // Area scaling controller
        dataZoom: {
            dataBackgroundColor: '#eee', // Data background color
            fillerColor: 'rgba(144,197,237,0.2)', // Fill the color
            handleColor: '#00aecd' // Handle color
        },

        timeline: {
            lineStyle: {
                color: '#00aecd'
            },
            controlStyle: {
                normal: { color: '#00aecd' },
                emphasis: { color: '#00aecd' }
            }
        },

        candlestick: {
            itemStyle: {
                color: '#ddd',
                color0: '#eee'
            },
            lineStyle: {
                width: 1,
                color: '#33ccff',
                color0: '#1bb4cf'
            },
            areaStyle: {
                color: '#7094db',
                color0: '#33ccff'
            }
        },

        chord: {
            padding: 4,
            itemStyle: {
                color: '#7094db',
                borderWidth: 1,
                borderColor: 'rgba(128, 128, 128, 0.5)'
            },
            lineStyle: {
                color: 'rgba(128, 128, 128, 0.5)'
            },
            areaStyle: {
                color: '#33ccff'
            }
        },

        graph: {
            itemStyle: {
                color: '#7094db'
            },
            linkStyle: {
                color: '#33ccff'
            }
        },

        map: {
            itemStyle: {
                color: '#7094db'
            },
            areaStyle: {
                color: '#33ccff'
            },
            label: {
                color: '#ddd'
            }
        },

        gauge: {
            axisLine: {
                lineStyle: {
                    color: [
                        [0.2, '#dddddd'],
                        [0.8, '#00aecd'],
                        [1, '#33ccff']
                    ],
                    width: 8
                }
            }
        }
    };

    echarts.registerTheme('tech-blue', theme);
});

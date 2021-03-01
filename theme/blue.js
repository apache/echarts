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
        '#1790cf',
        '#1bb2d8',
        '#99d2dd',
        '#88b0bb',
        '#1c7099',
        '#038cc4',
        '#75abd0',
        '#afd6dd'
    ];

    var theme = {
        color: colorPalette,

        title: {
            textStyle: {
                fontWeight: 'normal',
                color: '#1790cf'
            }
        },

        visualMap: {
            color: ['#1790cf', '#a2d4e6']
        },

        toolbox: {
            color: ['#1790cf', '#1790cf', '#1790cf', '#1790cf']
        },

        tooltip: {
            backgroundColor: 'rgba(0,0,0,0.5)',
            axisPointer: {
                // Axis indicator, coordinate trigger effective
                type: 'line', // The default is a straight line： 'line' | 'shadow'
                lineStyle: {
                    // Straight line indicator style settings
                    color: '#1790cf',
                    type: 'dashed'
                },
                crossStyle: {
                    color: '#1790cf'
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
            handleColor: '#1790cf' // Handle color
        },

        timeline: {
            lineStyle: {
                color: '#1790cfa'
            },
            controlStyle: {
                color: '#1790cf',
                borderColor: '#1790cf'
            }
        },

        candlestick: {
            itemStyle: {
                color: '#1bb2d8',
                color0: '#99d2dd'
            },
            lineStyle: {
                width: 1,
                color: '#1c7099',
                color0: '#88b0bb'
            },
            areaStyle: {
                color: '#1790cf',
                color0: '#1bb2d8'
            }
        },

        chord: {
            padding: 4,
            itemStyle: {
                color: '#1bb2d8',
                borderWidth: 1,
                borderColor: 'rgba(128, 128, 128, 0.5)'
            },
            lineStyle: {
                color: 'rgba(128, 128, 128, 0.5)'
            },
            areaStyle: {
                color: '#1790cf'
            }
        },

        graph: {
            itemStyle: {
                color: '#1bb2d8'
            },
            linkStyle: {
                color: '#88b0bb'
            }
        },

        map: {
            itemStyle: {
                color: '#ddd'
            },
            areaStyle: {
                color: '99d2dd'
            },
            label: {
                color: '#c12e34'
            }
        },

        gauge: {
            axisLine: {
                lineStyle: {
                    color: [
                        [0.2, '#1bb2d8'],
                        [0.8, '#1790cf'],
                        [1, '#1c7099']
                    ],
                    width: 8
                }
            }
        }
    };

    echarts.registerTheme('blue', theme);
});

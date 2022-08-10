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
        '#C1232B',
        '#27727B',
        '#FCCE10',
        '#E87C25',
        '#B5C334',
        '#FE8463',
        '#9BCA63',
        '#FAD860',
        '#F3A43B',
        '#60C0DD',
        '#D7504B',
        '#C6E579',
        '#F4E001',
        '#F0805A',
        '#26C0C0'
    ];

    var theme = {
        color: colorPalette,

        title: {
            textStyle: {
                fontWeight: 'normal',
                color: '#27727B'
            }
        },

        visualMap: {
            color: ['#C1232B', '#FCCE10']
        },

        toolbox: {
            iconStyle: {
                borderColor: colorPalette[0]
            }
        },

        tooltip: {
            backgroundColor: 'rgba(50,50,50,0.5)',
            axisPointer: {
                type: 'line',
                lineStyle: {
                    color: '#27727B',
                    type: 'dashed'
                },
                crossStyle: {
                    color: '#27727B'
                },
                shadowStyle: {
                    color: 'rgba(200,200,200,0.3)'
                }
            }
        },

        dataZoom: {
            dataBackgroundColor: 'rgba(181,195,52,0.3)',
            fillerColor: 'rgba(181,195,52,0.2)',
            handleColor: '#27727B'
        },

        categoryAxis: {
            axisLine: {
                lineStyle: {
                    color: '#27727B'
                }
            },
            splitLine: {
                show: false
            }
        },

        valueAxis: {
            axisLine: {
                show: false
            },
            splitArea: {
                show: false
            },
            splitLine: {
                lineStyle: {
                    color: ['#ccc'],
                    type: 'dashed'
                }
            }
        },

        timeline: {
            itemStyle: {
                color: '#27727B'
            },
            lineStyle: {
                color: '#27727B'
            },
            controlStyle: {
                color: '#27727B',
                borderColor: '#27727B'
            },
            symbol: 'emptyCircle',
            symbolSize: 3
        },

        line: {
            itemStyle: {
                borderWidth: 2,
                borderColor: '#fff',
                lineStyle: {
                    width: 3
                }
            },
            emphasis: {
                itemStyle: {
                    borderWidth: 0
                }
            },
            symbol: 'circle',
            symbolSize: 3.5
        },

        candlestick: {
            itemStyle: {
                color: '#c1232b',
                color0: '#b5c334'
            },
            lineStyle: {
                width: 1,
                color: '#c1232b',
                color0: '#b5c334'
            },
            areaStyle: {
                color: '#c1232b',
                color0: '#27727b'
            }
        },

        graph: {
            itemStyle: {
                color: '#c1232b'
            },
            linkStyle: {
                color: '#b5c334'
            }
        },

        map: {
            itemStyle: {
                color: '#f2385a',
                areaColor: '#ddd',
                borderColor: '#eee'
            },
            areaStyle: {
                color: '#fe994e'
            },
            label: {
                color: '#c1232b'
            }
        },

        gauge: {
            axisLine: {
                lineStyle: {
                    color: [
                        [0.2, '#B5C334'],
                        [0.8, '#27727B'],
                        [1, '#C1232B']
                    ]
                }
            },
            axisTick: {
                splitNumber: 2,
                length: 5,
                lineStyle: {
                    color: '#fff'
                }
            },
            axisLabel: {
                color: '#fff'
            },
            splitLine: {
                length: '5%',
                lineStyle: {
                    color: '#fff'
                }
            },
            title: {
                offsetCenter: [0, -20]
            }
        }
    };

    echarts.registerTheme('infographic', theme);
});

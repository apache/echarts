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
        '#5470c6',
        '#91cc75',
        '#fac858',
        '#ee6666',
        '#73c0de',
        '#3ba272',
        '#fc8452',
        '#9a60b4',
        '#ea7ccc'
    ];

    var axisCommon = function() {
        return {
            axisLine: {
                lineStyle: {
                    color: '#6E7079'
                }
            },
            axisLabel: {
                color: null
            },
            splitLine: {
                lineStyle: {
                    color: ['#E0E6F1']
                }
            },
            splitArea: {
                areaStyle: {
                    color: ['rgba(250,250,250,0.2)', 'rgba(210,219,238,0.2)']
                }
            },
            minorSplitLine: {
                color: '#F4F7FD'
            }
        };
    };

    var gradientColor = ['#f6efa6', '#d88273', '#bf444c'];

    echarts.registerTheme('v5', {
        color: colorPalette,
        gradientColor: gradientColor,

        loading: {
            textColor: 'red'
        },

        // Series

        bar: {
            defaultBarGap: '20%',
            select: {
                itemStyle: {
                    borderColor: '#212121',
                    borderWidth: 1
                }
            }
        },

        boxplot: {
            emphasis: {
                itemStyle: {
                    shadowColor: 'rgba(0,0,0,0.2)'
                }
            }
        },

        funnel: {
            bottom: 60,
            select: {
                itemStyle: {
                    borderColor: '#212121',
                    borderWidth: 1
                }
            },
            label: {
                color: 'inherit'
            }
        },

        gauge: {
            axisLine: {
                lineStyle: {
                    color: [[1, '#E6EBF8']]
                }
            },
            splitLine: {
                lineStyle: {
                    color: '#63677A'
                }
            },
            axisTick: {
                lineStyle: {
                    color: '#63677A'
                }
            },
            axisLabel: {
                color: '#464646'
            },
            anchor: {
                itemStyle: {
                    color: '#fff',
                    borderColor: '#5470c6'
                }
            },
            title: {
                color: '#464646',
            },
            detail: {
                backgroundColor: 'rgba(0,0,0,0)',
                borderColor: '#ccc',
                color: '#464646'
            }
        },

        graph: {
            lineStyle: {
                color: '#aaa'
            },
            select: {
                itemStyle: {
                    borderColor: '#212121'
                }
            }
        },

        heatmap: {
            select: {
                itemStyle: {
                    borderColor: '#212121'
                }
            }
        },

        line: {
            symbolSize: 4
        },

        pictorialBar: {
            select: {
                itemStyle: {
                    borderColor: '#212121',
                    borderWidth: 1
                }
            }
        },

        pie: {
            radius: [0, '75%'],
            labelLine: {
                length2: 15
            }
        },

        map: {
            defaultItemStyleColor: '#eee',
            label: {
                color: '#000'
            },
            itemStyle: {
                borderColor: '#444',
                areaColor: '#eee'
            },
            emphasis: {
                label: {
                    color: 'rgb(100,0,0)'
                },
                itemStyle: {
                    areaColor: 'rgba(255,215,0,0.8)'
                }
            },
            select: {
                label: {
                    color: 'rgb(100,0,0)'
                },
                itemStyle: {
                    color: 'rgba(255,215,0,0.8)'
                }
            },
        },

        sankey: {
            lineStyle: {
                color: '#314656'
            },
            select: {
                itemStyle: {
                    borderColor: '#212121'
                }
            },
        },

        scatter: {
            select: {
                itemStyle: {
                    borderColor: '#212121'
                }
            }
        },

        tree: {
            lineStyle: {
                color: '#ccc'
            }
        },

        treemap: {
            left: 'center',
            top: 'middle',
            width: '80%',
            height: '80%',
            scaleLimit: {
                max: null,
                min: null
            },
            breadcrumb: {
                top: 'bottom',
                bottom: null,
                itemStyle: {
                    color: 'rgba(0,0,0,0.7)', // '#5793f3',
                    textStyle: {
                        color: '#fff'
                    }
                },
                emphasis: {
                    itemStyle: {
                        color: 'rgba(0,0,0,0.9)' // '#5793f3',
                    }
                }
            }
        },

        // Components

        timeAxis: axisCommon(),
        logAxis: axisCommon(),
        valueAxis: axisCommon(),
        categoryAxis: (() => {
            const axis = axisCommon();
            axis.axisTick = {
                show: true
            };
            return axis;
        })(),

        axisPointer: {
            lineStyle: {
                color: '#B9BEC9'
            },
            shadowStyle: {
                color: 'rgba(210,219,238,0.2)'
            },
            label: {
                backgroundColor: 'auto',
                color: '#fff'
            },
            handle: {
                color: '#333',
                shadowBlur: 3,
                shadowColor: '#aaa',
                shadowOffsetX: 0,
                shadowOffsetY: 2,
            }
        },

        brush: {
            brushStyle: {
                color: 'rgba(210,219,238,0.3)',
                borderColor: '#D2DBEE'
            },
            defaultOutOfBrushColor: '#ddd'
        },

        calendar: {
            splitLine: {
                lineStyle: {
                    color: '#000'
                }
            },
            itemStyle: {
                borderColor: '#ccc'
            },
            dayLabel: {
                margin: '50%',
                color: '#000'
            },
            monthLabel: {
                margin: 5,
                color: '#000'
            },
            yearLabel: {
                margin: 30,
                color: '#ccc'
            }
        },

        dataZoom: {
            borderColor: '#d2dbee',
            borderRadius: 3,
            backgroundColor: 'rgba(47,69,84,0)',
            dataBackground: {
                lineStyle: {
                    color: '#d2dbee',
                    width: 0.5
                },
                areaStyle: {
                    color: '#d2dbee',
                    opacity: 0.2
                }
            },
            selectedDataBackground: {
                lineStyle: {
                    color: '#8fb0f7',
                    width: 0.5
                },
                areaStyle: {
                    color: '#8fb0f7',
                    opacity: 0.2
                }
            },
            handleStyle: {
                color: '#fff',
                borderColor: '#ACB8D1'
            },
            moveHandleStyle: {
                color: '#D2DBEE',
                opacity: 0.7
            },
            textStyle: {
                color: '#6E7079'
            },
            brushStyle: {
                color: 'rgba(135,175,274,0.15)'
            },
            emphasis: {
                handleStyle: {
                    borderColor: '#8FB0F7'
                },
                moveHandleStyle: {
                    color: '#8FB0F7',
                    opacity: 0.7
                }
            },
            defaultLocationEdgeGap: 7
        },

        geo: {
            defaultItemStyleColor: '#eee',
            label: {
                color: '#000'
            },
            itemStyle: {
                borderColor: '#444'
            },
            emphasis: {
                label: {
                    color: 'rgb(100,0,0)'
                },
                itemStyle: {
                    color: 'rgba(255,215,0,0.8)'
                }
            },
            select: {
                label: {
                    color: 'rgb(100,0,0)'
                },
                itemStyle: {
                    color: 'rgba(255,215,0,0.8)'
                }
            }
        },

        grid: {
            left: '10%',
            top: 60,
            bottom: 70,
            borderColor: '#ccc'
        },

        legend: {
            top: 0,
            bottom: null,
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',
            itemGap: 10,
            inactiveColor: '#ccc',
            inactiveBorderColor: '#ccc',
            lineStyle: {
                inactiveColor: '#ccc',
            },
            textStyle: {
                color: '#333'
            },
            selectorLabel: {
                color: '#666',
                borderColor: '#666'
            },
            emphasis: {
                selectorLabel: {
                    color: '#eee',
                    backgroundColor: '#666'
                }
            },
            pageIconColor: '#2f4554',
            pageIconInactiveColor: '#aaa',
            pageTextStyle: {
                color: '#333'
            }
        },

        radar: (() => {
            const radar = axisCommon();
            radar.radius = '75%';
            radar.axisName = {
                color: '#bbb'
            };
            radar.axisLine.lineStyle.color = '#bbb';
            return radar;
        })(),

        timeline: {
            padding: 5,
            borderColor: '#ccc',
            lineStyle: {
                color: '#DAE1F5'
            },
            label: {
                color: '#A4B1D7'
            },
            itemStyle: {
                color: '#A4B1D7',
                borderWidth: 1
            },
            checkpointStyle: {
                color: '#316bf3',
                borderColor: '#fff',
                borderWidth: 2,
                shadowBlur: 2,
                shadowOffsetX: 1,
                shadowOffsetY: 1,
                shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
            controlStyle: {
                playIcon: 'path://M31.6,53C17.5,53,6,41.5,6,27.4S17.5,1.8,31.6,1.8C45.7,1.8,57.2,13.3,57.2,27.4S45.7,53,31.6,53z M31.6,3.3 C18.4,3.3,7.5,14.1,7.5,27.4c0,13.3,10.8,24.1,24.1,24.1C44.9,51.5,55.7,40.7,55.7,27.4C55.7,14.1,44.9,3.3,31.6,3.3z M24.9,21.3 c0-2.2,1.6-3.1,3.5-2l10.5,6.1c1.899,1.1,1.899,2.9,0,4l-10.5,6.1c-1.9,1.1-3.5,0.2-3.5-2V21.3z', // jshint ignore:line
                stopIcon: 'path://M30.9,53.2C16.8,53.2,5.3,41.7,5.3,27.6S16.8,2,30.9,2C45,2,56.4,13.5,56.4,27.6S45,53.2,30.9,53.2z M30.9,3.5C17.6,3.5,6.8,14.4,6.8,27.6c0,13.3,10.8,24.1,24.101,24.1C44.2,51.7,55,40.9,55,27.6C54.9,14.4,44.1,3.5,30.9,3.5z M36.9,35.8c0,0.601-0.4,1-0.9,1h-1.3c-0.5,0-0.9-0.399-0.9-1V19.5c0-0.6,0.4-1,0.9-1H36c0.5,0,0.9,0.4,0.9,1V35.8z M27.8,35.8 c0,0.601-0.4,1-0.9,1h-1.3c-0.5,0-0.9-0.399-0.9-1V19.5c0-0.6,0.4-1,0.9-1H27c0.5,0,0.9,0.4,0.9,1L27.8,35.8L27.8,35.8z', // jshint ignore:line
                // eslint-disable-next-line max-len
                nextIcon: 'M2,18.5A1.52,1.52,0,0,1,.92,18a1.49,1.49,0,0,1,0-2.12L7.81,9.36,1,3.11A1.5,1.5,0,1,1,3,.89l8,7.34a1.48,1.48,0,0,1,.49,1.09,1.51,1.51,0,0,1-.46,1.1L3,18.08A1.5,1.5,0,0,1,2,18.5Z', // jshint ignore:line
                // eslint-disable-next-line max-len
                prevIcon: 'M10,.5A1.52,1.52,0,0,1,11.08,1a1.49,1.49,0,0,1,0,2.12L4.19,9.64,11,15.89a1.5,1.5,0,1,1-2,2.22L1,10.77A1.48,1.48,0,0,1,.5,9.68,1.51,1.51,0,0,1,1,8.58L9,.92A1.5,1.5,0,0,1,10,.5Z', // jshint ignore:line
                color: '#A4B1D7',
                borderColor: '#A4B1D7',
                borderWidth: 1
            },
            emphasis: {
                label: {
                    color: '#6f778d'
                },
                itemStyle: {
                    color: '#316BF3'
                },
                controlStyle: {
                    color: '#316BF3',
                    borderColor: '#316BF3',
                    borderWidth: 2
                }
            },
            progress: {
                lineStyle: {
                    color: '#316BF3'
                },
                itemStyle: {
                    color: '#316BF3'
                },
                label: {
                    color: '#6f778d'
                }
            },
        },

        title: {
            left: 0,
            top: 0,
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',
            textStyle: {
                color: '#464646'
            },
            subtextStyle: {
                color: '#6E7079'
            }
        },

        toolbox: {
            borderColor: '#ccc',
            padding: 5,
            itemGap: 8,
            iconStyle: {
                borderColor: '#666',
            },
            emphasis: {
                iconStyle: {
                    borderColor: '#3E98C5'
                }
            }
        },

        tooltip: {
            axisPointer: {
                crossStyle: {
                    color: '#999'
                }
            },
            textStyle: {
                color: '#666'
            },
            backgroundColor: '#fff',
            borderWidth: 1,
            defaultBorderColor: '#fff'
        },

        visualMap: {
            color: [gradientColor[2], gradientColor[1], gradientColor[0]],
            inactive: ['rgba(0,0,0,0)'],
            indicatorStyle: {
                shadowColor: 'rgba(0,0,0,0.2)'
            },
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',
            contentColor: '#5793f3',
            inactiveColor: '#aaa',
            padding: 5,
            textStyle: {
                color: '#333'
            }
        }
    });
});

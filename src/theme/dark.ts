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

const contrastColor = '#aaacbc';
const backgroundColor = '#181432';
const axisCommon = function () {
    return {
        axisLine: {
            lineStyle: {
                color: contrastColor
            }
        },
        splitLine: {
            lineStyle: {
                color: '#33324A'
            }
        },
        splitArea: {
            areaStyle: {
                color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)']
            }
        },
        minorSplitLine: {
            lineStyle: {
                color: '#20203B'
            }
        }
    };
};

const colorPalette = [
    '#4992ff',
    '#7cffb2',
    '#fddd60',
    '#ff6e76',
    '#58d9f9',
    '#05c091',
    '#ff8a45',
    '#8d48e3',
    '#dd79ff'
];
const theme = {
    darkMode: true,

    color: colorPalette,
    backgroundColor: backgroundColor,
    tooltip: {
        axisPointer: {
            lineStyle: {
                color: contrastColor
            },
            crossStyle: {
                color: contrastColor
            },
            label: {
                color: '#000'
            }
        }
    },
    legend: {
        textStyle: {
            color: contrastColor
        }
    },
    textStyle: {
        color: contrastColor
    },
    title: {
        textStyle: {
            color: '#dae0f1'
        },
        subtextStyle: {
            color: '#aaacbc'
        }
    },
    toolbox: {
        iconStyle: {
            normal: {
                borderColor: contrastColor
            }
        }
    },
    dataZoom: {
        textStyle: {
            color: contrastColor
        }
    },
    visualMap: {
        textStyle: {
            color: contrastColor
        }
    },
    timeline: {
        lineStyle: {
            color: contrastColor
        },
        itemStyle: {
            normal: {
                color: colorPalette[1]
            }
        },
        label: {
            normal: {
                textStyle: {
                    color: contrastColor
                }
            }
        },
        controlStyle: {
            normal: {
                color: contrastColor,
                borderColor: contrastColor
            }
        }
    },
    calendar: {
        itemStyle: {
            color: backgroundColor
        },
        dayLabel: {
            color: contrastColor
        },
        monthLabel: {
            color: contrastColor
        },
        yearLabel: {
            color: contrastColor
        }
    },
    timeAxis: axisCommon(),
    logAxis: axisCommon(),
    valueAxis: axisCommon(),
    categoryAxis: axisCommon(),

    line: {
        symbol: 'circle'
    },
    graph: {
        color: colorPalette
    },
    gauge: {
        title: {
            textStyle: {
                color: contrastColor
            }
        }
    },
    candlestick: {
        itemStyle: {
            normal: {
                color: '#FD1050',
                color0: '#0CF49B',
                borderColor: '#FD1050',
                borderColor0: '#0CF49B'
            }
        }
    }
};
(theme.categoryAxis.splitLine as any).show = false;

export default theme;
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

import tokens from '../visual/tokens';

const color = tokens.darkColor;
const backgroundColor = color.background;

const axisCommon = function () {
    return {
        axisLine: {
            lineStyle: {
                color: color.axisLine
            }
        },
        splitLine: {
            lineStyle: {
                color: color.axisSplitLine
            }
        },
        splitArea: {
            areaStyle: {
                color: [
                    color.backgroundTint,
                    color.backgroundTransparent
                ]
            }
        },
        minorSplitLine: {
            lineStyle: {
                color: color.axisMinorSplitLine
            }
        },
        axisLabel: {
            color: color.axisLabel
        },
        axisName: {}
    };
};
const matrixAxis = {
    label: {
        color: color.secondary
    },
    itemStyle: {
        borderColor: color.borderTint
    },
    dividerLineStyle: {
        color: color.border
    }
};

const theme = {
    darkMode: true,

    color: color.theme,
    backgroundColor: backgroundColor,
    axisPointer: {
        lineStyle: {
            color: color.border
        },
        crossStyle: {
            color: color.borderShade
        },
        label: {
            color: color.tertiary
        }
    },
    legend: {
        textStyle: {
            color: color.secondary
        },
        pageTextStyle: {
            color: color.tertiary
        }
    },
    textStyle: {
        color: color.secondary
    },
    title: {
        textStyle: {
            color: color.primary
        },
        subtextStyle: {
            color: color.quaternary
        }
    },
    toolbox: {
        iconStyle: {
            borderColor: color.accent50
        },
        feature: {
            dataView: {
                backgroundColor: backgroundColor,
                textColor: color.primary,
                textareaColor: color.background,
                textareaBorderColor: color.border,
                buttonColor: color.accent50,
                buttonTextColor: color.neutral00
            }
        }
    },
    tooltip: {
        backgroundColor: color.neutral20,
        defaultBorderColor: color.border,
        textStyle: {
            color: color.tertiary
        }
    },
    dataZoom: {
        borderColor: color.accent10,
        textStyle: {
            color: color.tertiary
        },
        brushStyle: {
            color: color.backgroundTint
        },
        handleStyle: {
            color: color.neutral00,
            borderColor: color.accent20
        },
        moveHandleStyle: {
            color: color.accent40
        },
        emphasis: {
            handleStyle: {
                borderColor: color.accent50
            }
        },
        dataBackground: {
            lineStyle: {
                color: color.accent30
            },
            areaStyle: {
                color: color.accent20
            }
        },
        selectedDataBackground: {
            lineStyle: {
                color: color.accent50
            },
            areaStyle: {
                color: color.accent30
            }
        }
    },
    visualMap: {
        textStyle: {
            color: color.secondary
        },
        handleStyle: {
            borderColor: color.neutral30
        }
    },
    timeline: {
        lineStyle: {
            color: color.accent10
        },
        label: {
            color: color.tertiary
        },
        controlStyle: {
            color: color.accent30,
            borderColor: color.accent30
        }
    },
    calendar: {
        itemStyle: {
            color: color.neutral00,
            borderColor: color.neutral20
        },
        dayLabel: {
            color: color.tertiary
        },
        monthLabel: {
            color: color.secondary
        },
        yearLabel: {
            color: color.secondary
        }
    },
    matrix: {
        x: matrixAxis,
        y: matrixAxis,
        backgroundColor: {
            borderColor: color.axisLine
        },
        body: {
            itemStyle: {
                borderColor: color.borderTint
            }
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
        color: color.theme
    },
    gauge: {
        title: {
            color: color.secondary
        },
        axisLine: {
            lineStyle: {
                color: [[1, color.neutral05]]
            }
        },
        axisLabel: {
            color: color.axisLabel
        },
        detail: {
            color: color.primary
        }
    },
    candlestick: {
        itemStyle: {
            color: '#f64e56',
            color0: '#54ea92',
            borderColor: '#f64e56',
            borderColor0: '#54ea92'
            // borderColor: '#ca2824',
            // borderColor0: '#09a443'
        }
    },
    funnel: {
        itemStyle: {
            borderColor: color.background
        }
    },
    radar: (() => {
        const radar = axisCommon();
        radar.axisName = {
            color: color.axisLabel
        };
        radar.axisLine.lineStyle.color = color.neutral20;
        return radar;
    })(),
    treemap: {
        breadcrumb: {
            itemStyle: {
                color: color.neutral20,
                textStyle: {
                    color: color.secondary
                }
            },
            emphasis: {
                itemStyle: {
                    color: color.neutral30
                }
            }
        }
    },
    sunburst: {
        itemStyle: {
            borderColor: color.background
        }
    },
    map: {
        itemStyle: {
            borderColor: color.border,
            areaColor: color.neutral10
        },
        label: {
            color: color.tertiary
        },
        emphasis: {
            label: {
                color: color.primary
            },
            itemStyle: {
                areaColor: color.highlight
            }
        },
        select: {
            label: {
                color: color.primary
            },
            itemStyle: {
                areaColor: color.highlight
            }
        }
    },
    geo: {
        itemStyle: {
            borderColor: color.border,
            areaColor: color.neutral10
        },
        emphasis: {
            label: {
                color: color.primary
            },
            itemStyle: {
                areaColor: color.highlight
            }
        },
        select: {
            label: {
                color: color.primary
            },
            itemStyle: {
                color: color.highlight
            }
        }
    }
};
(theme.categoryAxis.splitLine as any).show = false;

export default theme;

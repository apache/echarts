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

(function (root, factory) {if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
}(this, function (exports, echarts) {
    var log = function (msg) {
        if (typeof console !== 'undefined') {
            console && console.error && console.error(msg);
        }
    };
    if (!echarts) {
        log('ECharts is not Loaded');
        return;
    }

    var colorPalette = [
        '#001727','#805500','#ffff00','#ffd11a',
        '#f2d71f','#f2be19','#f3a81a','#fff5cc'
    ];

    var theme = {

        color: colorPalette,

        title: {
            textStyle: {
                fontWeight: 'normal',
				color: '#001727'
            }
        },

        visualMap: {
            color:['#001727','#805500']
        }, 

        toolbox: {
            color : ['#001727','#001727','#001727','#001727']
        },

    tooltip: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        axisPointer : {            // Axis indicator, coordinate trigger effective
            type : 'line',         // The default is a straight line： 'line' | 'shadow'
            lineStyle : {          // Straight line indicator style settings
                color: '#001727',
                type: 'dashed'
            },
            crossStyle: {
                color: '#001727'
            },
            shadowStyle : {                     // Shadow indicator style settings
                color: 'rgba(200,200,200,0.3)'
            }
        }
    },

    // Area scaling controller
    dataZoom: {
        dataBackgroundColor: '#eee',            // Data background color
        fillerColor: 'rgba(200,200,200,0.2)',   // Fill the color
        handleColor: '#001727'     // Handle color
    },

    timeline : {
        lineStyle : {
            color : '#001727'
        },
        controlStyle : {
            normal : { color : '#001727'},
            emphasis : { color : '#001727'}
        }
    },

	k: {
        itemStyle: {
            normal: {
                color: '#f2d71f',          // Yang line filled with color
                color0: '#f2be19',      // Yinxian fill color
                lineStyle: {
                    width: 1,
                    color: '#ffff00',   // Yang line border color
                    color0: '#f3a81a'   // Yinbian border color
                }
            }
        }
    },

   chord : {
        padding : 4,
        itemStyle : {
            normal : {
                borderWidth: 1,
                borderColor: 'rgba(128, 128, 128, 0.5)',
                chordStyle : {
                    lineStyle : {
                        color : 'rgba(128, 128, 128, 0.5)'
                    }
                }
            },
            emphasis : {
                borderWidth: 1,
                borderColor: 'rgba(128, 128, 128, 0.5)',
                chordStyle : {
                    lineStyle : {
                        color : 'rgba(128, 128, 128, 0.5)'
                    }
                }
            }
        }
    },

        candlestick: {
            itemStyle: {
                normal: {
                    color: '#001727',
                    color0: '#805500',
                    lineStyle: {
                        width: 1,
                        color: '#001727',
                        color0: '#805500'
                    }
                }
            }
        },

        graph: {
            color: colorPalette
        },

        map: {
        itemStyle: {
            normal: {
                areaStyle: {
                    color: '#ddd'
                },
                label: {
                    textStyle: {
                        color: '#ffd11a'
                    }
                }
            },
            emphasis: {                 // Is also selected style
                areaStyle: {
                    color: '#f2be19'
                },
                label: {
                    textStyle: {
                        color: '#ffd11a'
                    }
                }
            }
        }
    },

	force : { 
        itemStyle: {
            normal: {
                linkStyle : {
                    color : '#001727'
                }
            }
        }
    },

        gauge : {
        axisLine: {            // Coordinate axis
            show: true,        // Default display, property show control display or not
            lineStyle: {       // Attribute lineStyle controls the line style
                color: [[0.2, '#f2d71f'],[0.8, '#001727'],[1, '#ffff00']], 
                width: 8
            }
        },
        axisTick: {            // Small mark of the axis
            splitNumber: 10,   // How many segments per split subdivision
            length :12,        // Attribute length control line length
            lineStyle: {       // Attribute lineStyle controls the line style
                color: 'auto'
            }
        },
        axisLabel: {           // Axis text label, see details axis.axisLabel
            textStyle: {       // The remaining attributes use the global text style by default TEXTSTYLE
                color: 'auto'
            }
        },
        splitLine: {           // Separate lines
            length : 18,         // Attribute length control line length
            lineStyle: {       // The attribute lineStyle (see lineStyle for details) controls the line style
                color: 'auto'
            }
        },
        pointer : {
            length : '90%',
            color : 'auto'
        },
        title : {
            textStyle: {       // The remaining attributes use the global text style by default TEXTSTYLE
                color: '#333'
            }
        },
        detail : {
            textStyle: {       // The remaining attributes use the global text style by default TEXTSTYLE
                color: 'auto'
            }
        }
    }
  };
    echarts.registerTheme('bee-inspired', theme);
}));
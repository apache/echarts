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
        '#C1232B','#27727B','#FCCE10','#E87C25','#B5C334',
        '#FE8463','#9BCA63','#FAD860','#F3A43B','#60C0DD',
        '#D7504B','#C6E579','#F4E001','#F0805A','#26C0C0'
    ];

    var theme = {
        // 默认色板
        color: colorPalette,

        title: {
            textStyle: {
                fontWeight: 'normal',
                color: '#27727B'
            }
        },

        visualMap: {
            color:['#C1232B','#FCCE10']
        },

        toolbox: {
            iconStyle: {
                normal: {
                    borderColor: colorPalette[0]
                }
            }
        },

        // 提示框
        tooltip: {
            backgroundColor: 'rgba(50,50,50,0.5)',     // 提示背景颜色，默认为透明度为0.7的黑色
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'line',         // 默认为直线，可选为：'line' | 'shadow'
                lineStyle : {          // 直线指示器样式设置
                    color: '#27727B',
                    type: 'dashed'
                },
                crossStyle: {
                    color: '#27727B'
                },
                shadowStyle : {                     // 阴影指示器样式设置
                    color: 'rgba(200,200,200,0.3)'
                }
            }
        },

        // 区域缩放控制器
        dataZoom: {
            dataBackgroundColor: 'rgba(181,195,52,0.3)',            // 数据背景颜色
            fillerColor: 'rgba(181,195,52,0.2)',   // 填充颜色
            handleColor: '#27727B'    // 手柄颜色
        },

        // 网格
        grid: {
            borderWidth:0
        },

        // 类目轴
        categoryAxis: {
            axisLine: {            // 坐标轴线
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#27727B'
                }
            },
            splitLine: {           // 分隔线
                show: false
            }
        },

        // 数值型坐标轴默认参数
        valueAxis: {
            axisLine: {            // 坐标轴线
                show: false
            },
            splitArea : {
                show: false
            },
            splitLine: {           // 分隔线
                lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                    color: ['#ccc'],
                    type: 'dashed'
                }
            }
        },

        timeline: {
            lineStyle: {
                color: '#27727B'
            },
            controlStyle: {
                normal: { color : '#27727B'},
                emphasis: { color : '#27727B'}
            },
            symbol: 'emptyCircle',
            symbolSize: 3
        },

        // 折线图默认参数
        line: {
            itemStyle: {
                normal: {
                    borderWidth:2,
                    borderColor:'#fff',
                    lineStyle: {
                        width: 3
                    }
                },
                emphasis: {
                    borderWidth:0
                }
            },
            symbol: 'circle',  // 拐点图形类型
            symbolSize: 3.5           // 拐点图形大小
        },

        // K线图默认参数
        candlestick: {
            itemStyle: {
                normal: {
                    color: '#C1232B',       // 阳线填充颜色
                    color0: '#B5C334',      // 阴线填充颜色
                    lineStyle: {
                        width: 1,
                        color: '#C1232B',   // 阳线边框颜色
                        color0: '#B5C334'   // 阴线边框颜色
                    }
                }
            }
        },

        graph: {
            color: colorPalette
        },

        map: {
            label: {
                normal: {
                    textStyle: {
                        color: '#C1232B'
                    }
                },
                emphasis: {
                    textStyle: {
                        color: 'rgb(100,0,0)'
                    }
                }
            },
            itemStyle: {
                normal: {
                    areaColor: '#ddd',
                    borderColor: '#eee'
                },
                emphasis: {
                    areaColor: '#fe994e'
                }
            }
        },

        gauge : {
            center:['50%','80%'],
            radius:'100%',
            startAngle: 180,
            endAngle : 0,
            axisLine: {            // 坐标轴线
                show: true,        // 默认显示，属性show控制显示与否
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: [[0.2, '#B5C334'],[0.8, '#27727B'],[1, '#C1232B']],
                    width: '40%'
                }
            },
            axisTick: {            // 坐标轴小标记
                splitNumber: 2,   // 每份split细分多少段
                length: 5,        // 属性length控制线长
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#fff'
                }
            },
            axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: '#fff',
                    fontWeight:'bolder'
                }
            },
            splitLine: {           // 分隔线
                length: '5%',         // 属性length控制线长
                lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                    color: '#fff'
                }
            },
            pointer : {
                width : '40%',
                length: '80%',
                color: '#fff'
            },
            title : {
              offsetCenter: [0, -20],       // x, y，单位px
              textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                color: 'auto',
                fontSize: 20
              }
            },
            detail : {
                offsetCenter: [0, 0],       // x, y，单位px
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: 'auto',
                    fontSize: 40
                }
            }
        }
    };

    echarts.registerTheme('infographic', theme);
}));
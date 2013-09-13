
/**
 * echarts默认配置项
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/config',[],function() {
    // 请原谅我这样写，这显然可以直接返回个对象，但那样的话outline就显示不出来了~~
    var config = {
        // 图表类型
        CHART_TYPE_LINE: 'line',
        CHART_TYPE_BAR: 'bar',
        CHART_TYPE_SCATTER: 'scatter',
        CHART_TYPE_PIE: 'pie',
        CHART_TYPE_RADAR: 'radar',
        CHART_TYPE_MAP: 'map',
        CHART_TYPE_K: 'k',
        CHART_TYPE_ISLAND: 'island',
        CHART_TYPE_FORCE : 'force',

        // 组件类型
        COMPONENT_TYPE_TITLE: 'title',
        COMPONENT_TYPE_LEGEND: 'legend',
        COMPONENT_TYPE_DATARANGE: 'dataRange',
        COMPONENT_TYPE_DATAVIEW: 'dataView',
        COMPONENT_TYPE_DATAZOOM: 'dataZoom',
        COMPONENT_TYPE_TOOLBOX: 'toolbox',
        COMPONENT_TYPE_TOOLTIP: 'tooltip',
        COMPONENT_TYPE_GRID: 'grid',
        COMPONENT_TYPE_AXIS: 'axis',
        COMPONENT_TYPE_POLAR: 'polar',
        COMPONENT_TYPE_X_AXIS: 'xAxis',
        COMPONENT_TYPE_Y_AXIS: 'yAxis',
        COMPONENT_TYPE_AXIS_CATEGORY: 'categoryAxis',
        COMPONENT_TYPE_AXIS_VALUE: 'valueAxis',

        // 默认色板
        color: ['#ff7f50','#87cefa','#da70d6','#32cd32','#6495ed',
                '#ff69b4','#ba55d3','#cd5c5c','#ffa500','#40e0d0',
                '#1e90ff','#ff6347','#7b68ee','#00fa9a','#ffd700',
                '#6b8e23','#ff00ff','#3cb371','#b8860b','#30e0e0'],

        // 图表标题
        title: {
            text: '',
            subtext: '',
            x: 'left',                 // 水平安放位置，默认为左对齐，可选为：
                                       // 'center' ¦ 'left' ¦ 'right'
                                       // ¦ {number}（x坐标，单位px）
            y: 'top',                  // 垂直安放位置，默认为全图顶端，可选为：
                                       // 'top' ¦ 'bottom' ¦ 'center'
                                       // ¦ {number}（y坐标，单位px）
            //textAlign: null          // 水平对齐方式，默认根据x设置自动调整
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',       // 标题边框颜色
            borderWidth: 0,            // 标题边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 标题内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            itemGap: 10,               // 主副标题纵向间隔，单位px，默认为10，
            textStyle: {
                fontSize: 18,
                fontWeight: 'bolder',
                color: '#333'          // 主标题文字颜色
            },
            subtextStyle: {
                color: '#aaa'          // 副标题文字颜色
            }
        },
        
        // 图例
        legend: {
            orient: 'horizontal',      // 布局方式，默认为水平布局，可选为：
                                       // 'horizontal' ¦ 'vertical'
            x: 'center',               // 水平安放位置，默认为全图居中，可选为：
                                       // 'center' ¦ 'left' ¦ 'right'
                                       // ¦ {number}（x坐标，单位px）
            y: 'top',                  // 垂直安放位置，默认为全图顶端，可选为：
                                       // 'top' ¦ 'bottom' ¦ 'center'
                                       // ¦ {number}（y坐标，单位px）
            selectedMode: true,        // 选择模式，默认开启图例开关
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',       // 图例边框颜色
            borderWidth: 0,            // 图例边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 图例内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            itemGap: 10,               // 各个item之间的间隔，单位px，默认为10，
                                       // 横向布局时为水平间隔，纵向布局时为纵向间隔
            // data: []                // 图例内容（详见legend.data，数组中每一项代表一个item
            itemWidth: 20,             // 图例图形宽度，非标准参数
            itemHeight: 14,            // 图例图形高度，非标准参数
            textStyle: {
                color: '#333'          // 图例文字颜色
            }
        },
        
        // 值域
        dataRange: {
            orient: 'vertical',        // 布局方式，默认为垂直布局，可选为：
                                       // 'horizontal' ¦ 'vertical'
            x: 'left',                 // 水平安放位置，默认为全图左对齐，可选为：
                                       // 'center' ¦ 'left' ¦ 'right'
                                       // ¦ {number}（x坐标，单位px）
            y: 'bottom',               // 垂直安放位置，默认为全图底部，可选为：
                                       // 'top' ¦ 'bottom' ¦ 'center'
                                       // ¦ {number}（y坐标，单位px）
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',       // 值域边框颜色
            borderWidth: 0,            // 值域边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 值域内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            itemGap: 10,               // 各个item之间的间隔，单位px，默认为10，
                                       // 横向布局时为水平间隔，纵向布局时为纵向间隔
            itemWidth: 20,             // 值域图形宽度，线性渐变水平布局宽度为该值 * 10
            itemHeight: 14,            // 值域图形高度，线性渐变垂直布局高度为该值 * 10
            precision: 0,              // 小数精度，默认为0，无小数点
            // min: null,              // 最小值
            // max: null,              // 最大值
            splitNumber: 5,            // 分割段数，默认为5，为0时为线性渐变
            calculable: false,         // 是否值域漫游，启用后无视splitNumber，线性渐变
            realtime: true,
            color:['#1e90ff','#f0ffff'],//颜色 
            //text:['高','低'],           // 文本，默认为数值文本
            textStyle: {
                color: '#333'          // 值域文字颜色
            }
        },

        toolbox: {
            show : false,
            orient: 'horizontal',      // 布局方式，默认为水平布局，可选为：
                                       // 'horizontal' ¦ 'vertical'
            x: 'right',                // 水平安放位置，默认为全图右对齐，可选为：
                                       // 'center' ¦ 'left' ¦ 'right'
                                       // ¦ {number}（x坐标，单位px）
            y: 'top',                  // 垂直安放位置，默认为全图顶端，可选为：
                                       // 'top' ¦ 'bottom' ¦ 'center'
                                       // ¦ {number}（y坐标，单位px）
            color : ['#1e90ff','#22bb22','#4b0082','#d2691e'],
            backgroundColor: 'rgba(0,0,0,0)', // 工具箱背景颜色
            borderColor: '#ccc',       // 工具箱边框颜色
            borderWidth: 0,            // 工具箱边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 工具箱内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            itemGap: 10,               // 各个item之间的间隔，单位px，默认为10，
                                       // 横向布局时为水平间隔，纵向布局时为纵向间隔
            itemSize: 16,             // 工具箱图形宽度，非标准参数
            feature : {
                //mark : true,
                //dataView : {readOnly: false},
                //magicType: ['line', 'bar'],
                //restore : true,
                //saveAsImage : true
            }
        },

        // 提示框
        tooltip: {
            show: true,
            trigger: 'item',           // 触发类型，默认数据触发，见下图，可选为：'item' ¦ 'axis'
            // formatter: null         // 内容格式器：{string}（Template） ¦ {Function}
            islandFormatter: '{a} <br/>{b} : {c}',  // 数据孤岛内容格式器，非标准参数
            transitionDuration : 1,    // 动画变换时间，单位s
            showDelay: 30,             // 显示延迟，添加显示延迟可以避免频繁切换，单位ms
            hideDelay: 100,            // 隐藏延迟，单位ms
            backgroundColor: 'rgba(0,0,0,0.7)',     // 提示背景颜色，默认为透明度为0.7的黑色
            borderColor: '#333',       // 提示边框颜色
            borderRadius: 4,           // 提示边框圆角，单位px，默认为4
            borderWidth: 0,            // 提示边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 提示内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'line',         // 默认为直线，可选为：'line' | 'shadow'
                lineStyle : {          // 直线指示器样式设置
                    color: '#48b',
                    width: 2,
                    type: 'solid'
                },
                areaStyle : {                       // 阴影指示器样式设置
                    size: 'auto',                   // 阴影大小
                    color: 'rgba(150,150,150,0.3)'  // 阴影颜色
                }
            },
            textStyle: {
                color: '#fff'
            }
        },

        // 区域缩放控制器
        dataZoom: {
            show: false,
            realtime: false,
            orient: 'horizontal',          // 布局方式，默认为水平布局，可选为：
                                           // 'horizontal' ¦ 'vertical'
            backgroundColor: '#eee',       // 背景颜色
            dataBackgroundColor: '#ccc',   // 数据背景颜色
            fillerColor: 'rgba(50,205,50,0.4)',        // 填充颜色
            handleColor: 'rgba(70,130,180,0.8)'         // 手柄颜色

            // x: {number},            // 水平安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（x坐标，单位px）
            // y: {number},            // 垂直安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（y坐标，单位px）
            // width: {number},        // 指定宽度，横向布局时默认为根据grid参数适配
            // height: {number},       // 指定高度，纵向布局时默认为根据grid参数适配
            // xAxisIndex: [],         // 默认控制所有横向类目
            // yAxisIndex: [],         // 默认控制所有横向类目
            // start: 0,               // 默认为0
            // end: 100,               // 默认为全部 100%
            // zoomLock: false         // 是否锁定选择区域大小
        },

        // 网格
        grid: {
            x: 80,
            y: 60,
            x2: 80,
            y2: 60,
            // width: {totalWidth} - x - x2,
            // height: {totalHeight} - y - y2,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#ccc'
        },

        // 类目轴
        categoryAxis: {
            position: 'bottom',    // 位置
            name: '',              // 坐标轴名字，默认为空
            nameLocation: 'end',   // 坐标轴名字位置，支持'start' | 'end'
            boundaryGap: true,     // 类目起始和结束两端空白策略
            axisLine: {            // 坐标轴线
                show: true,        // 默认显示，属性show控制显示与否
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#48b',
                    width: 2,
                    type: 'solid'
                }
            },
            axisTick: {            // 坐标轴小标记
                show: false,       // 属性show控制显示与否，默认不显示
                length :4,         // 属性length控制线长
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#ccc',
                    width: 1
                }
            },
            axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
                show: true,
                interval: 'auto',
                rotate: 0,
                margin: 8,
                // formatter: null,
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: '#333'
                }
            },
            splitLine: {           // 分隔线
                show: true,        // 默认显示，属性show控制显示与否
                lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                    color: ['#ccc'],
                    width: 1,
                    type: 'solid'
                }
            },
            splitArea: {           // 分隔区域
                show: false,       // 默认不显示，属性show控制显示与否
                areaStyle: {       // 属性areaStyle（详见areaStyle）控制区域样式
                    color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)'],
                    type: 'default'
                }
            }
        },

        // 数值型坐标轴默认参数
        valueAxis: {
            position: 'left',      // 位置
            name: '',              // 坐标轴名字，默认为空
            nameLocation: 'end',   // 坐标轴名字位置，支持'start' | 'end'
            boundaryGap: [0, 0],   // 数值起始和结束两端空白策略
            // min: null,          // 最小值
            // max: null,          // 最大值
            // scale: false,       // 脱离0值比例，放大聚焦到最终_min，_max区间
            precision: 0,          // 小数精度，默认为0，无小数点
            power: 100,            // 整数精度，默认为100，个位和百位为0
            splitNumber: 5,        // 分割段数，默认为5
            axisLine: {            // 坐标轴线
                show: true,        // 默认显示，属性show控制显示与否
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#48b',
                    width: 2,
                    type: 'solid'
                }
            },
            axisTick: {            // 坐标轴小标记
                show: false,       // 属性show控制显示与否，默认不显示
                length :4,         // 属性length控制线长
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#ccc',
                    width: 1
                }
            },
            axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
                show: true,
                rotate: 0,
                margin: 8,
                // formatter: null,
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: '#333'
                }
            },
            splitLine: {           // 分隔线
                show: true,        // 默认显示，属性show控制显示与否
                lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                    color: ['#ccc'],
                    width: 1,
                    type: 'solid'
                }
            },
            splitArea: {           // 分隔区域
                show: false,       // 默认不显示，属性show控制显示与否
                areaStyle: {       // 属性areaStyle（详见areaStyle）控制区域样式
                    color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)'],
                    type: 'default'
                }
            }
        },

        polar : {
            startAngle : 90,      
            splitNumber : 5,
            name : {
                show: true,
                // formatter: null,
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: '#333'
                }
            },
            axisLine: {            // 坐标轴线
                show: true,        // 默认显示，属性show控制显示与否
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#ccc',
                    width: 1,
                    type: 'solid'
                }
            },
            axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
                show: false,
                // formatter: null,
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: '#333'
                }
            },
            splitArea : {
                show : true,
                areaStyle : {
                    color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)']
                }
            },
            splitLine : {
                show : true,
                lineStyle : {
                    width : 1,
                    color : '#ccc'
                }
            }
        },

        // 柱形图默认参数
        bar: {
            // stack: null
            xAxisIndex: 0,
            yAxisIndex: 0,
            barMinHeight: 20
            // barWidth: null        // 默认自适应
        },

        // 折线图默认参数
        line: {
            // stack: null
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: {
                normal: {
                    // color: 各异,
                    lineStyle: {
                        width: 1,
                        type: 'solid',
                        shadowColor : 'rgba(0,0,0,0)', //默认透明
                        shadowBlur: 5,
                        shadowOffsetX: 3,
                        shadowOffsetY: 3
                    }
                },
                emphasis: {
                    // color: 各异,
                }
            },
            //symbol: null,         // 拐点图形类型，非标准参数
            symbolSize: 4,          // 可计算特性参数，空数据拖拽提示图形大小
            showAllSymbol: false    // 标志图形默认只有主轴显示（随主轴标签间隔隐藏策略）
        },
        
        // K线图默认参数
        k: {
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: {
                normal: {
                    color: '#fff',       // 阳线填充颜色
                    color0: '#00aa11',    // 阴线填充颜色
                    lineStyle: {
                        width: 1,
                        color: '#ff3200',   // 阳线边框颜色
                        color0: '#00aa11' // 阴线边框颜色
                    }
                },
                emphasis: {
                    // color: 各异,
                }
            }
        },
        
        // 散点图默认参数
        scatter: {
            xAxisIndex: 0,
            yAxisIndex: 0,
            //symbol: null,      // 图形类型，非标准参数
            symbolSize: 4,       // 图形大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            large: false,        // 大规模散点图
            largeThreshold: 2000 // 大规模阀值，large为true且数据量大于largeThreshold才启用大规模模式
        },

        // 雷达图默认参数
        radar : {
            polarIndex: 0,
            itemStyle: {
                normal: {
                    // color: 各异,
                    lineStyle: {
                        width: 2,
                        type: 'solid'
                    }
                },
                emphasis: {
                    // color: 各异,
                }
            },
            //symbol: null,         // 拐点图形类型，非标准参数
            symbolSize: 2           // 可计算特性参数，空数据拖拽提示图形大小
        },

        // 饼图默认参数
        pie: {
            // center: null,                   // 默认全局居中
            // radius: [0, min(width,height) - 50],
            startAngle: 90,
            minAngle: 5,
            selectedOffset: 10,             // 选中是扇区偏移量
            // selectedMode: false,         // 选择模式，默认关闭，可选single，multiple
            itemStyle: {
                normal: {
                    label: {
                        show: true,
                        position: 'outer'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    labelLine: {
                        show: true,
                        length: 30,
                        lineStyle: {
                            // color: 各异,
                            width: 1,
                            type: 'solid'
                        }
                    }
                },
                emphasis: {
                    label: {
                        show: false,
                        position: 'outer'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    labelLine: {
                        show: false,
                        length: 40,
                        lineStyle: {
                            // color: 各异,
                            width: 1,
                            type: 'solid'
                        }
                    }
                }
            }
        },
        
        map: {
            mapType: 'china',   // 各省的mapType暂时都用中文
            mapLocation: {
                x : 'center',
                y : 'center'
                // width    // 自适应
                // height   // 自适应
            },
            // mapValueCalculation: 'sum', // 数值合并方式，默认加和，可选为：
                                           // 'sum' | 'average' | 'max' | 'min' 
            // selectedMode: false,        // 选择模式，默认关闭，可选single，multiple
            itemStyle: {
                normal: {
                    // color: 各异,
                    lineStyle: {
                        width: 2,
                        color: '#fff'
                    },
                    areaStyle: {
                        color: '#ccc'//rgba(135,206,250,0.8)
                    },
                    label: {
                        show: false,
                        textStyle: {
                            color: 'rgba(139,69,19,1)'
                        }
                    }
                },
                emphasis: {                 // 也是选中样式
                    // color: 各异,
                    lineStyle: {
                        width: 2,
                        color: '#fff'
                    },
                    areaStyle: {
                        color: 'rgba(255,215,0,0.8)'
                    },
                    label: {
                        show: false,
                        textStyle: {
                            color: 'rgba(139,69,19,1)'
                        }
                    }
                }
            }
        },
        
        force : {
            // 数据map到圆的半径的最小值和最大值
            minRadius : 10,
            maxRadius : 20,
            density : 1.0,
            attractiveness : 1.0,
            // 初始化的随机大小位置
            initSize : 300,
            // 向心力因子，越大向心力越大
            centripetal : 1,
            // 冷却因子
            coolDown : 0.99,
            // 分类里如果有样式会覆盖节点默认样式
            categories : [],
            itemStyle: {
                normal: {
                    // color: 各异,
                    label: {
                        show: false
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    nodeStyle : {
                        brushType : 'both',
                        color : '#f08c2e',
                        strokeColor : '#5182ab'
                    },
                    linkStyle : {
                        strokeColor : '#5182ab'
                    }
                },
                emphasis: {
                    // color: 各异,
                    label: {
                        show: false
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    nodeStyle : {},
                    linkStyle : {}
                }
            }
        },

        island: {
            r: 15,
            calculateStep: 0.1  // 滚轮可计算步长 0.1 = 10%
        },

        textStyle: {
            decoration: 'none',
            fontFamily: 'Arial, Verdana, sans-serif',
            fontSize: 12,
            fontStyle: 'normal',
            fontWeight: 'normal'
        },

        EVENT: {
            REFRESH: 'refresh',
            RESTORE: 'restore',
            CLICK: 'click',
            HOVER: 'hover',
            MOUSEWHEEL: 'mousewheel',
            // -------
            DATA_CHANGED: 'dataChanged',
            DATA_ZOOM: 'dataZoom',
            DATA_RANGE: 'dataRange',
            LEGEND_SELECTED: 'legendSelected',
            MAP_SELECTED: 'mapSelected',
            PIE_SELECTED: 'pieSelected',
            MAGIC_TYPE_CHANGED: 'magicTypeChanged',
            DATA_VIEW_CHANGED: 'dataViewChanged'
        },

        // 可计算特性配置，孤岛，提示颜色
        calculable: false,              // 默认开启可计算特性
        calculableColor: 'rgba(255,165,0,0.6)',       // 拖拽提示边框颜色
        calculableHolderColor: '#ccc', // 可计算占位提示颜色
        nameConnector: ' & ',
        valueConnector: ' : ',
        animation: true,
        addDataAnimation: true,         // 动态数据接口是否开启动画效果
        animationDuration: 2000,
        animationEasing: 'ExponentialOut'    //BounceOut
    };

    return config;
});
// Copyright 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


// Known Issues:
//
// * Patterns only support repeat.
// * Radial gradient are not implemented. The VML version of these look very
//   different from the canvas one.
// * Clipping paths are not implemented.
// * Coordsize. The width and height attribute have higher priority than the
//   width and height style values which isn't correct.
// * Painting mode isn't implemented.
// * Canvas width/height should is using content-box by default. IE in
//   Quirks mode will draw the canvas using border-box. Either change your
//   doctype to HTML5
//   (http://www.whatwg.org/specs/web-apps/current-work/#the-doctype)
//   or use Box Sizing Behavior from WebFX
//   (http://webfx.eae.net/dhtml/boxsizing/boxsizing.html)
// * Non uniform scaling does not correctly scale strokes.
// * Optimize. There is always room for speed improvements.

// AMD by kener.linfeng@gmail.com
define('zrender/lib/excanvas',['require'],function(require) {
    
// Only add this code if we do not already have a canvas implementation
if (!document.createElement('canvas').getContext) {

(function() {

  // alias some functions to make (compiled) code shorter
  var m = Math;
  var mr = m.round;
  var ms = m.sin;
  var mc = m.cos;
  var abs = m.abs;
  var sqrt = m.sqrt;

  // this is used for sub pixel precision
  var Z = 10;
  var Z2 = Z / 2;

  var IE_VERSION = +navigator.userAgent.match(/MSIE ([\d.]+)?/)[1];

  /**
   * This funtion is assigned to the <canvas> elements as element.getContext().
   * @this {HTMLElement}
   * @return {CanvasRenderingContext2D_}
   */
  function getContext() {
    return this.context_ ||
        (this.context_ = new CanvasRenderingContext2D_(this));
  }

  var slice = Array.prototype.slice;

  /**
   * Binds a function to an object. The returned function will always use the
   * passed in {@code obj} as {@code this}.
   *
   * Example:
   *
   *   g = bind(f, obj, a, b)
   *   g(c, d) // will do f.call(obj, a, b, c, d)
   *
   * @param {Function} f The function to bind the object to
   * @param {Object} obj The object that should act as this when the function
   *     is called
   * @param {*} var_args Rest arguments that will be used as the initial
   *     arguments when the function is called
   * @return {Function} A new function that has bound this
   */
  function bind(f, obj, var_args) {
    var a = slice.call(arguments, 2);
    return function() {
      return f.apply(obj, a.concat(slice.call(arguments)));
    };
  }

  function encodeHtmlAttribute(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function addNamespace(doc, prefix, urn) {
    if (!doc.namespaces[prefix]) {
      doc.namespaces.add(prefix, urn, '#default#VML');
    }
  }

  function addNamespacesAndStylesheet(doc) {
    addNamespace(doc, 'g_vml_', 'urn:schemas-microsoft-com:vml');
    addNamespace(doc, 'g_o_', 'urn:schemas-microsoft-com:office:office');

    // Setup default CSS.  Only add one style sheet per document
    if (!doc.styleSheets['ex_canvas_']) {
      var ss = doc.createStyleSheet();
      ss.owningElement.id = 'ex_canvas_';
      ss.cssText = 'canvas{display:inline-block;overflow:hidden;' +
          // default size is 300x150 in Gecko and Opera
          'text-align:left;width:300px;height:150px}';
    }
  }

  // Add namespaces and stylesheet at startup.
  addNamespacesAndStylesheet(document);

  var G_vmlCanvasManager_ = {
    init: function(opt_doc) {
      var doc = opt_doc || document;
      // Create a dummy element so that IE will allow canvas elements to be
      // recognized.
      doc.createElement('canvas');
      doc.attachEvent('onreadystatechange', bind(this.init_, this, doc));
    },

    init_: function(doc) {
      // find all canvas elements
      var els = doc.getElementsByTagName('canvas');
      for (var i = 0; i < els.length; i++) {
        this.initElement(els[i]);
      }
    },

    /**
     * Public initializes a canvas element so that it can be used as canvas
     * element from now on. This is called automatically before the page is
     * loaded but if you are creating elements using createElement you need to
     * make sure this is called on the element.
     * @param {HTMLElement} el The canvas element to initialize.
     * @return {HTMLElement} the element that was created.
     */
    initElement: function(el) {
      if (!el.getContext) {
        el.getContext = getContext;

        // Add namespaces and stylesheet to document of the element.
        addNamespacesAndStylesheet(el.ownerDocument);

        // Remove fallback content. There is no way to hide text nodes so we
        // just remove all childNodes. We could hide all elements and remove
        // text nodes but who really cares about the fallback content.
        el.innerHTML = '';

        // do not use inline function because that will leak memory
        el.attachEvent('onpropertychange', onPropertyChange);
        el.attachEvent('onresize', onResize);

        var attrs = el.attributes;
        if (attrs.width && attrs.width.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setWidth_(attrs.width.nodeValue);
          el.style.width = attrs.width.nodeValue + 'px';
        } else {
          el.width = el.clientWidth;
        }
        if (attrs.height && attrs.height.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setHeight_(attrs.height.nodeValue);
          el.style.height = attrs.height.nodeValue + 'px';
        } else {
          el.height = el.clientHeight;
        }
        //el.getContext().setCoordsize_()
      }
      return el;
    }
  };

  function onPropertyChange(e) {
    var el = e.srcElement;

    switch (e.propertyName) {
      case 'width':
        el.getContext().clearRect();
        el.style.width = el.attributes.width.nodeValue + 'px';
        // In IE8 this does not trigger onresize.
        el.firstChild.style.width =  el.clientWidth + 'px';
        break;
      case 'height':
        el.getContext().clearRect();
        el.style.height = el.attributes.height.nodeValue + 'px';
        el.firstChild.style.height = el.clientHeight + 'px';
        break;
    }
  }

  function onResize(e) {
    var el = e.srcElement;
    if (el.firstChild) {
      el.firstChild.style.width =  el.clientWidth + 'px';
      el.firstChild.style.height = el.clientHeight + 'px';
    }
  }

  G_vmlCanvasManager_.init();

  // precompute "00" to "FF"
  var decToHex = [];
  for (var i = 0; i < 16; i++) {
    for (var j = 0; j < 16; j++) {
      decToHex[i * 16 + j] = i.toString(16) + j.toString(16);
    }
  }

  function createMatrixIdentity() {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  function matrixMultiply(m1, m2) {
    var result = createMatrixIdentity();

    for (var x = 0; x < 3; x++) {
      for (var y = 0; y < 3; y++) {
        var sum = 0;

        for (var z = 0; z < 3; z++) {
          sum += m1[x][z] * m2[z][y];
        }

        result[x][y] = sum;
      }
    }
    return result;
  }

  function copyState(o1, o2) {
    o2.fillStyle     = o1.fillStyle;
    o2.lineCap       = o1.lineCap;
    o2.lineJoin      = o1.lineJoin;
    o2.lineWidth     = o1.lineWidth;
    o2.miterLimit    = o1.miterLimit;
    o2.shadowBlur    = o1.shadowBlur;
    o2.shadowColor   = o1.shadowColor;
    o2.shadowOffsetX = o1.shadowOffsetX;
    o2.shadowOffsetY = o1.shadowOffsetY;
    o2.strokeStyle   = o1.strokeStyle;
    o2.globalAlpha   = o1.globalAlpha;
    o2.font          = o1.font;
    o2.textAlign     = o1.textAlign;
    o2.textBaseline  = o1.textBaseline;
    o2.arcScaleX_    = o1.arcScaleX_;
    o2.arcScaleY_    = o1.arcScaleY_;
    o2.lineScale_    = o1.lineScale_;
  }

  var colorData = {
    aliceblue: '#F0F8FF',
    antiquewhite: '#FAEBD7',
    aquamarine: '#7FFFD4',
    azure: '#F0FFFF',
    beige: '#F5F5DC',
    bisque: '#FFE4C4',
    black: '#000000',
    blanchedalmond: '#FFEBCD',
    blueviolet: '#8A2BE2',
    brown: '#A52A2A',
    burlywood: '#DEB887',
    cadetblue: '#5F9EA0',
    chartreuse: '#7FFF00',
    chocolate: '#D2691E',
    coral: '#FF7F50',
    cornflowerblue: '#6495ED',
    cornsilk: '#FFF8DC',
    crimson: '#DC143C',
    cyan: '#00FFFF',
    darkblue: '#00008B',
    darkcyan: '#008B8B',
    darkgoldenrod: '#B8860B',
    darkgray: '#A9A9A9',
    darkgreen: '#006400',
    darkgrey: '#A9A9A9',
    darkkhaki: '#BDB76B',
    darkmagenta: '#8B008B',
    darkolivegreen: '#556B2F',
    darkorange: '#FF8C00',
    darkorchid: '#9932CC',
    darkred: '#8B0000',
    darksalmon: '#E9967A',
    darkseagreen: '#8FBC8F',
    darkslateblue: '#483D8B',
    darkslategray: '#2F4F4F',
    darkslategrey: '#2F4F4F',
    darkturquoise: '#00CED1',
    darkviolet: '#9400D3',
    deeppink: '#FF1493',
    deepskyblue: '#00BFFF',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1E90FF',
    firebrick: '#B22222',
    floralwhite: '#FFFAF0',
    forestgreen: '#228B22',
    gainsboro: '#DCDCDC',
    ghostwhite: '#F8F8FF',
    gold: '#FFD700',
    goldenrod: '#DAA520',
    grey: '#808080',
    greenyellow: '#ADFF2F',
    honeydew: '#F0FFF0',
    hotpink: '#FF69B4',
    indianred: '#CD5C5C',
    indigo: '#4B0082',
    ivory: '#FFFFF0',
    khaki: '#F0E68C',
    lavender: '#E6E6FA',
    lavenderblush: '#FFF0F5',
    lawngreen: '#7CFC00',
    lemonchiffon: '#FFFACD',
    lightblue: '#ADD8E6',
    lightcoral: '#F08080',
    lightcyan: '#E0FFFF',
    lightgoldenrodyellow: '#FAFAD2',
    lightgreen: '#90EE90',
    lightgrey: '#D3D3D3',
    lightpink: '#FFB6C1',
    lightsalmon: '#FFA07A',
    lightseagreen: '#20B2AA',
    lightskyblue: '#87CEFA',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#B0C4DE',
    lightyellow: '#FFFFE0',
    limegreen: '#32CD32',
    linen: '#FAF0E6',
    magenta: '#FF00FF',
    mediumaquamarine: '#66CDAA',
    mediumblue: '#0000CD',
    mediumorchid: '#BA55D3',
    mediumpurple: '#9370DB',
    mediumseagreen: '#3CB371',
    mediumslateblue: '#7B68EE',
    mediumspringgreen: '#00FA9A',
    mediumturquoise: '#48D1CC',
    mediumvioletred: '#C71585',
    midnightblue: '#191970',
    mintcream: '#F5FFFA',
    mistyrose: '#FFE4E1',
    moccasin: '#FFE4B5',
    navajowhite: '#FFDEAD',
    oldlace: '#FDF5E6',
    olivedrab: '#6B8E23',
    orange: '#FFA500',
    orangered: '#FF4500',
    orchid: '#DA70D6',
    palegoldenrod: '#EEE8AA',
    palegreen: '#98FB98',
    paleturquoise: '#AFEEEE',
    palevioletred: '#DB7093',
    papayawhip: '#FFEFD5',
    peachpuff: '#FFDAB9',
    peru: '#CD853F',
    pink: '#FFC0CB',
    plum: '#DDA0DD',
    powderblue: '#B0E0E6',
    rosybrown: '#BC8F8F',
    royalblue: '#4169E1',
    saddlebrown: '#8B4513',
    salmon: '#FA8072',
    sandybrown: '#F4A460',
    seagreen: '#2E8B57',
    seashell: '#FFF5EE',
    sienna: '#A0522D',
    skyblue: '#87CEEB',
    slateblue: '#6A5ACD',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#FFFAFA',
    springgreen: '#00FF7F',
    steelblue: '#4682B4',
    tan: '#D2B48C',
    thistle: '#D8BFD8',
    tomato: '#FF6347',
    turquoise: '#40E0D0',
    violet: '#EE82EE',
    wheat: '#F5DEB3',
    whitesmoke: '#F5F5F5',
    yellowgreen: '#9ACD32'
  };


  function getRgbHslContent(styleString) {
    var start = styleString.indexOf('(', 3);
    var end = styleString.indexOf(')', start + 1);
    var parts = styleString.substring(start + 1, end).split(',');
    // add alpha if needed
    if (parts.length != 4 || styleString.charAt(3) != 'a') {
      parts[3] = 1;
    }
    return parts;
  }

  function percent(s) {
    return parseFloat(s) / 100;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function hslToRgb(parts){
    var r, g, b, h, s, l;
    h = parseFloat(parts[0]) / 360 % 360;
    if (h < 0)
      h++;
    s = clamp(percent(parts[1]), 0, 1);
    l = clamp(percent(parts[2]), 0, 1);
    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }

    return '#' + decToHex[Math.floor(r * 255)] +
        decToHex[Math.floor(g * 255)] +
        decToHex[Math.floor(b * 255)];
  }

  function hueToRgb(m1, m2, h) {
    if (h < 0)
      h++;
    if (h > 1)
      h--;

    if (6 * h < 1)
      return m1 + (m2 - m1) * 6 * h;
    else if (2 * h < 1)
      return m2;
    else if (3 * h < 2)
      return m1 + (m2 - m1) * (2 / 3 - h) * 6;
    else
      return m1;
  }

  var processStyleCache = {};

  function processStyle(styleString) {
    if (styleString in processStyleCache) {
      return processStyleCache[styleString];
    }

    var str, alpha = 1;

    styleString = String(styleString);
    if (styleString.charAt(0) == '#') {
      str = styleString;
    } else if (/^rgb/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      var str = '#', n;
      for (var i = 0; i < 3; i++) {
        if (parts[i].indexOf('%') != -1) {
          n = Math.floor(percent(parts[i]) * 255);
        } else {
          n = +parts[i];
        }
        str += decToHex[clamp(n, 0, 255)];
      }
      alpha = +parts[3];
    } else if (/^hsl/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      str = hslToRgb(parts);
      alpha = parts[3];
    } else {
      str = colorData[styleString] || styleString;
    }
    return processStyleCache[styleString] = {color: str, alpha: alpha};
  }

  var DEFAULT_STYLE = {
    style: 'normal',
    variant: 'normal',
    weight: 'normal',
    size: 10,
    family: 'sans-serif'
  };

  // Internal text style cache
  var fontStyleCache = {};

  function processFontStyle(styleString) {
    if (fontStyleCache[styleString]) {
      return fontStyleCache[styleString];
    }

    var el = document.createElement('div');
    var style = el.style;
    try {
      style.font = styleString;
    } catch (ex) {
      // Ignore failures to set to invalid font.
    }

    return fontStyleCache[styleString] = {
      style: style.fontStyle || DEFAULT_STYLE.style,
      variant: style.fontVariant || DEFAULT_STYLE.variant,
      weight: style.fontWeight || DEFAULT_STYLE.weight,
      size: style.fontSize || DEFAULT_STYLE.size,
      family: style.fontFamily || DEFAULT_STYLE.family
    };
  }

  function getComputedStyle(style, element) {
    var computedStyle = {};

    for (var p in style) {
      computedStyle[p] = style[p];
    }

    // Compute the size
    var canvasFontSize = parseFloat(element.currentStyle.fontSize),
        fontSize = parseFloat(style.size);

    if (typeof style.size == 'number') {
      computedStyle.size = style.size;
    } else if (style.size.indexOf('px') != -1) {
      computedStyle.size = fontSize;
    } else if (style.size.indexOf('em') != -1) {
      computedStyle.size = canvasFontSize * fontSize;
    } else if(style.size.indexOf('%') != -1) {
      computedStyle.size = (canvasFontSize / 100) * fontSize;
    } else if (style.size.indexOf('pt') != -1) {
      computedStyle.size = fontSize / .75;
    } else {
      computedStyle.size = canvasFontSize;
    }

    // Different scaling between normal text and VML text. This was found using
    // trial and error to get the same size as non VML text.
    computedStyle.size *= 0.981;

    return computedStyle;
  }

  function buildStyle(style) {
    return style.style + ' ' + style.variant + ' ' + style.weight + ' ' +
        style.size + 'px ' + style.family;
  }

  var lineCapMap = {
    'butt': 'flat',
    'round': 'round'
  };

  function processLineCap(lineCap) {
    return lineCapMap[lineCap] || 'square';
  }

  /**
   * This class implements CanvasRenderingContext2D interface as described by
   * the WHATWG.
   * @param {HTMLElement} canvasElement The element that the 2D context should
   * be associated with
   */
  function CanvasRenderingContext2D_(canvasElement) {
    this.m_ = createMatrixIdentity();

    this.mStack_ = [];
    this.aStack_ = [];
    this.currentPath_ = [];

    // Canvas context properties
    this.strokeStyle = '#000';
    this.fillStyle = '#000';

    this.lineWidth = 1;
    this.lineJoin = 'miter';
    this.lineCap = 'butt';
    this.miterLimit = Z * 1;
    this.globalAlpha = 1;
    this.font = '10px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.canvas = canvasElement;

    var cssText = 'width:' + canvasElement.clientWidth + 'px;height:' +
        canvasElement.clientHeight + 'px;overflow:hidden;position:absolute';
    var el = canvasElement.ownerDocument.createElement('div');
    el.style.cssText = cssText;
    canvasElement.appendChild(el);

    var overlayEl = el.cloneNode(false);
    // Use a non transparent background.
    overlayEl.style.backgroundColor = 'red';
    overlayEl.style.filter = 'alpha(opacity=0)';
    canvasElement.appendChild(overlayEl);

    this.element_ = el;
    this.arcScaleX_ = 1;
    this.arcScaleY_ = 1;
    this.lineScale_ = 1;
  }

  var contextPrototype = CanvasRenderingContext2D_.prototype;
  contextPrototype.clearRect = function() {
    if (this.textMeasureEl_) {
      this.textMeasureEl_.removeNode(true);
      this.textMeasureEl_ = null;
    }
    this.element_.innerHTML = '';
  };

  contextPrototype.beginPath = function() {
    // TODO: Branch current matrix so that save/restore has no effect
    //       as per safari docs.
    this.currentPath_ = [];
  };

  contextPrototype.moveTo = function(aX, aY) {
    var p = getCoords(this, aX, aY);
    this.currentPath_.push({type: 'moveTo', x: p.x, y: p.y});
    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.lineTo = function(aX, aY) {
    var p = getCoords(this, aX, aY);
    this.currentPath_.push({type: 'lineTo', x: p.x, y: p.y});

    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.bezierCurveTo = function(aCP1x, aCP1y,
                                            aCP2x, aCP2y,
                                            aX, aY) {
    var p = getCoords(this, aX, aY);
    var cp1 = getCoords(this, aCP1x, aCP1y);
    var cp2 = getCoords(this, aCP2x, aCP2y);
    bezierCurveTo(this, cp1, cp2, p);
  };

  // Helper function that takes the already fixed cordinates.
  function bezierCurveTo(self, cp1, cp2, p) {
    self.currentPath_.push({
      type: 'bezierCurveTo',
      cp1x: cp1.x,
      cp1y: cp1.y,
      cp2x: cp2.x,
      cp2y: cp2.y,
      x: p.x,
      y: p.y
    });
    self.currentX_ = p.x;
    self.currentY_ = p.y;
  }

  contextPrototype.quadraticCurveTo = function(aCPx, aCPy, aX, aY) {
    // the following is lifted almost directly from
    // http://developer.mozilla.org/en/docs/Canvas_tutorial:Drawing_shapes

    var cp = getCoords(this, aCPx, aCPy);
    var p = getCoords(this, aX, aY);

    var cp1 = {
      x: this.currentX_ + 2.0 / 3.0 * (cp.x - this.currentX_),
      y: this.currentY_ + 2.0 / 3.0 * (cp.y - this.currentY_)
    };
    var cp2 = {
      x: cp1.x + (p.x - this.currentX_) / 3.0,
      y: cp1.y + (p.y - this.currentY_) / 3.0
    };

    bezierCurveTo(this, cp1, cp2, p);
  };

  contextPrototype.arc = function(aX, aY, aRadius,
                                  aStartAngle, aEndAngle, aClockwise) {
    aRadius *= Z;
    var arcType = aClockwise ? 'at' : 'wa';

    var xStart = aX + mc(aStartAngle) * aRadius - Z2;
    var yStart = aY + ms(aStartAngle) * aRadius - Z2;

    var xEnd = aX + mc(aEndAngle) * aRadius - Z2;
    var yEnd = aY + ms(aEndAngle) * aRadius - Z2;

    // IE won't render arches drawn counter clockwise if xStart == xEnd.
    if (xStart == xEnd && !aClockwise) {
      xStart += 0.125; // Offset xStart by 1/80 of a pixel. Use something
                       // that can be represented in binary
    }

    var p = getCoords(this, aX, aY);
    var pStart = getCoords(this, xStart, yStart);
    var pEnd = getCoords(this, xEnd, yEnd);

    this.currentPath_.push({type: arcType,
                           x: p.x,
                           y: p.y,
                           radius: aRadius,
                           xStart: pStart.x,
                           yStart: pStart.y,
                           xEnd: pEnd.x,
                           yEnd: pEnd.y});

  };

  contextPrototype.rect = function(aX, aY, aWidth, aHeight) {
    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
  };

  contextPrototype.strokeRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.stroke();

    this.currentPath_ = oldPath;
  };

  contextPrototype.fillRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.fill();

    this.currentPath_ = oldPath;
  };

  contextPrototype.createLinearGradient = function(aX0, aY0, aX1, aY1) {
    var gradient = new CanvasGradient_('gradient');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    return gradient;
  };

  contextPrototype.createRadialGradient = function(aX0, aY0, aR0,
                                                   aX1, aY1, aR1) {
    var gradient = new CanvasGradient_('gradientradial');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.r0_ = aR0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    gradient.r1_ = aR1;
    return gradient;
  };

  contextPrototype.drawImage = function(image, var_args) {
    var dx, dy, dw, dh, sx, sy, sw, sh;

    // to find the original width we overide the width and height
    var oldRuntimeWidth = image.runtimeStyle.width;
    var oldRuntimeHeight = image.runtimeStyle.height;
    image.runtimeStyle.width = 'auto';
    image.runtimeStyle.height = 'auto';

    // get the original size
    var w = image.width;
    var h = image.height;

    // and remove overides
    image.runtimeStyle.width = oldRuntimeWidth;
    image.runtimeStyle.height = oldRuntimeHeight;

    if (arguments.length == 3) {
      dx = arguments[1];
      dy = arguments[2];
      sx = sy = 0;
      sw = dw = w;
      sh = dh = h;
    } else if (arguments.length == 5) {
      dx = arguments[1];
      dy = arguments[2];
      dw = arguments[3];
      dh = arguments[4];
      sx = sy = 0;
      sw = w;
      sh = h;
    } else if (arguments.length == 9) {
      sx = arguments[1];
      sy = arguments[2];
      sw = arguments[3];
      sh = arguments[4];
      dx = arguments[5];
      dy = arguments[6];
      dw = arguments[7];
      dh = arguments[8];
    } else {
      throw Error('Invalid number of arguments');
    }

    var d = getCoords(this, dx, dy);

    var w2 = sw / 2;
    var h2 = sh / 2;

    var vmlStr = [];

    var W = 10;
    var H = 10;

    // For some reason that I've now forgotten, using divs didn't work
    vmlStr.push(' <g_vml_:group',
                ' coordsize="', Z * W, ',', Z * H, '"',
                ' coordorigin="0,0"' ,
                ' style="width:', W, 'px;height:', H, 'px;position:absolute;');

    // If filters are necessary (rotation exists), create them
    // filters are bog-slow, so only create them if abbsolutely necessary
    // The following check doesn't account for skews (which don't exist
    // in the canvas spec (yet) anyway.

    if (this.m_[0][0] != 1 || this.m_[0][1] ||
        this.m_[1][1] != 1 || this.m_[1][0]) {
      var filter = [];

      // Note the 12/21 reversal
      filter.push('M11=', this.m_[0][0], ',',
                  'M12=', this.m_[1][0], ',',
                  'M21=', this.m_[0][1], ',',
                  'M22=', this.m_[1][1], ',',
                  'Dx=', mr(d.x / Z), ',',
                  'Dy=', mr(d.y / Z), '');

      // Bounding box calculation (need to minimize displayed area so that
      // filters don't waste time on unused pixels.
      var max = d;
      var c2 = getCoords(this, dx + dw, dy);
      var c3 = getCoords(this, dx, dy + dh);
      var c4 = getCoords(this, dx + dw, dy + dh);

      max.x = m.max(max.x, c2.x, c3.x, c4.x);
      max.y = m.max(max.y, c2.y, c3.y, c4.y);

      vmlStr.push('padding:0 ', mr(max.x / Z), 'px ', mr(max.y / Z),
                  'px 0;filter:progid:DXImageTransform.Microsoft.Matrix(',
                  filter.join(''), ", sizingmethod='clip');");

    } else {
      vmlStr.push('top:', mr(d.y / Z), 'px;left:', mr(d.x / Z), 'px;');
    }

    vmlStr.push(' ">' ,
                '<g_vml_:image src="', image.src, '"',
                ' style="width:', Z * dw, 'px;',
                ' height:', Z * dh, 'px"',
                ' cropleft="', sx / w, '"',
                ' croptop="', sy / h, '"',
                ' cropright="', (w - sx - sw) / w, '"',
                ' cropbottom="', (h - sy - sh) / h, '"',
                ' />',
                '</g_vml_:group>');

    this.element_.insertAdjacentHTML('BeforeEnd', vmlStr.join(''));
  };

  contextPrototype.stroke = function(aFill) {
    var lineStr = [];
    var lineOpen = false;

    var W = 10;
    var H = 10;

    lineStr.push('<g_vml_:shape',
                 ' filled="', !!aFill, '"',
                 ' style="position:absolute;width:', W, 'px;height:', H, 'px;"',
                 ' coordorigin="0,0"',
                 ' coordsize="', Z * W, ',', Z * H, '"',
                 ' stroked="', !aFill, '"',
                 ' path="');

    var newSeq = false;
    var min = {x: null, y: null};
    var max = {x: null, y: null};

    for (var i = 0; i < this.currentPath_.length; i++) {
      var p = this.currentPath_[i];
      var c;

      switch (p.type) {
        case 'moveTo':
          c = p;
          lineStr.push(' m ', mr(p.x), ',', mr(p.y));
          break;
        case 'lineTo':
          lineStr.push(' l ', mr(p.x), ',', mr(p.y));
          break;
        case 'close':
          lineStr.push(' x ');
          p = null;
          break;
        case 'bezierCurveTo':
          lineStr.push(' c ',
                       mr(p.cp1x), ',', mr(p.cp1y), ',',
                       mr(p.cp2x), ',', mr(p.cp2y), ',',
                       mr(p.x), ',', mr(p.y));
          break;
        case 'at':
        case 'wa':
          lineStr.push(' ', p.type, ' ',
                       mr(p.x - this.arcScaleX_ * p.radius), ',',
                       mr(p.y - this.arcScaleY_ * p.radius), ' ',
                       mr(p.x + this.arcScaleX_ * p.radius), ',',
                       mr(p.y + this.arcScaleY_ * p.radius), ' ',
                       mr(p.xStart), ',', mr(p.yStart), ' ',
                       mr(p.xEnd), ',', mr(p.yEnd));
          break;
      }


      // TODO: Following is broken for curves due to
      //       move to proper paths.

      // Figure out dimensions so we can do gradient fills
      // properly
      if (p) {
        if (min.x == null || p.x < min.x) {
          min.x = p.x;
        }
        if (max.x == null || p.x > max.x) {
          max.x = p.x;
        }
        if (min.y == null || p.y < min.y) {
          min.y = p.y;
        }
        if (max.y == null || p.y > max.y) {
          max.y = p.y;
        }
      }
    }
    lineStr.push(' ">');

    if (!aFill) {
      appendStroke(this, lineStr);
    } else {
      appendFill(this, lineStr, min, max);
    }

    lineStr.push('</g_vml_:shape>');

    this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  function appendStroke(ctx, lineStr) {
    var a = processStyle(ctx.strokeStyle);
    var color = a.color;
    var opacity = a.alpha * ctx.globalAlpha;
    var lineWidth = ctx.lineScale_ * ctx.lineWidth;

    // VML cannot correctly render a line if the width is less than 1px.
    // In that case, we dilute the color to make the line look thinner.
    if (lineWidth < 1) {
      opacity *= lineWidth;
    }

    lineStr.push(
      '<g_vml_:stroke',
      ' opacity="', opacity, '"',
      ' joinstyle="', ctx.lineJoin, '"',
      ' miterlimit="', ctx.miterLimit, '"',
      ' endcap="', processLineCap(ctx.lineCap), '"',
      ' weight="', lineWidth, 'px"',
      ' color="', color, '" />'
    );
  }

  function appendFill(ctx, lineStr, min, max) {
    var fillStyle = ctx.fillStyle;
    var arcScaleX = ctx.arcScaleX_;
    var arcScaleY = ctx.arcScaleY_;
    var width = max.x - min.x;
    var height = max.y - min.y;
    if (fillStyle instanceof CanvasGradient_) {
      // TODO: Gradients transformed with the transformation matrix.
      var angle = 0;
      var focus = {x: 0, y: 0};

      // additional offset
      var shift = 0;
      // scale factor for offset
      var expansion = 1;

      if (fillStyle.type_ == 'gradient') {
        var x0 = fillStyle.x0_ / arcScaleX;
        var y0 = fillStyle.y0_ / arcScaleY;
        var x1 = fillStyle.x1_ / arcScaleX;
        var y1 = fillStyle.y1_ / arcScaleY;
        var p0 = getCoords(ctx, x0, y0);
        var p1 = getCoords(ctx, x1, y1);
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        angle = Math.atan2(dx, dy) * 180 / Math.PI;

        // The angle should be a non-negative number.
        if (angle < 0) {
          angle += 360;
        }

        // Very small angles produce an unexpected result because they are
        // converted to a scientific notation string.
        if (angle < 1e-6) {
          angle = 0;
        }
      } else {
        var p0 = getCoords(ctx, fillStyle.x0_, fillStyle.y0_);
        focus = {
          x: (p0.x - min.x) / width,
          y: (p0.y - min.y) / height
        };

        width  /= arcScaleX * Z;
        height /= arcScaleY * Z;
        var dimension = m.max(width, height);
        shift = 2 * fillStyle.r0_ / dimension;
        expansion = 2 * fillStyle.r1_ / dimension - shift;
      }

      // We need to sort the color stops in ascending order by offset,
      // otherwise IE won't interpret it correctly.
      var stops = fillStyle.colors_;
      stops.sort(function(cs1, cs2) {
        return cs1.offset - cs2.offset;
      });

      var length = stops.length;
      var color1 = stops[0].color;
      var color2 = stops[length - 1].color;
      var opacity1 = stops[0].alpha * ctx.globalAlpha;
      var opacity2 = stops[length - 1].alpha * ctx.globalAlpha;

      var colors = [];
      for (var i = 0; i < length; i++) {
        var stop = stops[i];
        colors.push(stop.offset * expansion + shift + ' ' + stop.color);
      }

      // When colors attribute is used, the meanings of opacity and o:opacity2
      // are reversed.
      lineStr.push('<g_vml_:fill type="', fillStyle.type_, '"',
                   ' method="none" focus="100%"',
                   ' color="', color1, '"',
                   ' color2="', color2, '"',
                   ' colors="', colors.join(','), '"',
                   ' opacity="', opacity2, '"',
                   ' g_o_:opacity2="', opacity1, '"',
                   ' angle="', angle, '"',
                   ' focusposition="', focus.x, ',', focus.y, '" />');
    } else if (fillStyle instanceof CanvasPattern_) {
      if (width && height) {
        var deltaLeft = -min.x;
        var deltaTop = -min.y;
        lineStr.push('<g_vml_:fill',
                     ' position="',
                     deltaLeft / width * arcScaleX * arcScaleX, ',',
                     deltaTop / height * arcScaleY * arcScaleY, '"',
                     ' type="tile"',
                     // TODO: Figure out the correct size to fit the scale.
                     //' size="', w, 'px ', h, 'px"',
                     ' src="', fillStyle.src_, '" />');
       }
    } else {
      var a = processStyle(ctx.fillStyle);
      var color = a.color;
      var opacity = a.alpha * ctx.globalAlpha;
      lineStr.push('<g_vml_:fill color="', color, '" opacity="', opacity,
                   '" />');
    }
  }

  contextPrototype.fill = function() {
    this.stroke(true);
  };

  contextPrototype.closePath = function() {
    this.currentPath_.push({type: 'close'});
  };

  function getCoords(ctx, aX, aY) {
    var m = ctx.m_;
    return {
      x: Z * (aX * m[0][0] + aY * m[1][0] + m[2][0]) - Z2,
      y: Z * (aX * m[0][1] + aY * m[1][1] + m[2][1]) - Z2
    };
  };

  contextPrototype.save = function() {
    var o = {};
    copyState(this, o);
    this.aStack_.push(o);
    this.mStack_.push(this.m_);
    this.m_ = matrixMultiply(createMatrixIdentity(), this.m_);
  };

  contextPrototype.restore = function() {
    if (this.aStack_.length) {
      copyState(this.aStack_.pop(), this);
      this.m_ = this.mStack_.pop();
    }
  };

  function matrixIsFinite(m) {
    return isFinite(m[0][0]) && isFinite(m[0][1]) &&
        isFinite(m[1][0]) && isFinite(m[1][1]) &&
        isFinite(m[2][0]) && isFinite(m[2][1]);
  }

  function setM(ctx, m, updateLineScale) {
    if (!matrixIsFinite(m)) {
      return;
    }
    ctx.m_ = m;

    if (updateLineScale) {
      // Get the line scale.
      // Determinant of this.m_ means how much the area is enlarged by the
      // transformation. So its square root can be used as a scale factor
      // for width.
      var det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
      ctx.lineScale_ = sqrt(abs(det));
    }
  }

  contextPrototype.translate = function(aX, aY) {
    var m1 = [
      [1,  0,  0],
      [0,  1,  0],
      [aX, aY, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.rotate = function(aRot) {
    var c = mc(aRot);
    var s = ms(aRot);

    var m1 = [
      [c,  s, 0],
      [-s, c, 0],
      [0,  0, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.scale = function(aX, aY) {
    this.arcScaleX_ *= aX;
    this.arcScaleY_ *= aY;
    var m1 = [
      [aX, 0,  0],
      [0,  aY, 0],
      [0,  0,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.transform = function(m11, m12, m21, m22, dx, dy) {
    var m1 = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.setTransform = function(m11, m12, m21, m22, dx, dy) {
    var m = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, m, true);
  };

  /**
   * The text drawing function.
   * The maxWidth argument isn't taken in account, since no browser supports
   * it yet.
   */
  contextPrototype.drawText_ = function(text, x, y, maxWidth, stroke) {
    var m = this.m_,
        delta = 1000,
        left = 0,
        right = delta,
        offset = {x: 0, y: 0},
        lineStr = [];

    var fontStyle = getComputedStyle(processFontStyle(this.font),
                                     this.element_);

    var fontStyleString = buildStyle(fontStyle);

    var elementStyle = this.element_.currentStyle;
    var textAlign = this.textAlign.toLowerCase();
    switch (textAlign) {
      case 'left':
      case 'center':
      case 'right':
        break;
      case 'end':
        textAlign = elementStyle.direction == 'ltr' ? 'right' : 'left';
        break;
      case 'start':
        textAlign = elementStyle.direction == 'rtl' ? 'right' : 'left';
        break;
      default:
        textAlign = 'left';
    }

    // 1.75 is an arbitrary number, as there is no info about the text baseline
    switch (this.textBaseline) {
      case 'hanging':
      case 'top':
        offset.y = fontStyle.size / 1.75;
        break;
      case 'middle':
        break;
      default:
      case null:
      case 'alphabetic':
      case 'ideographic':
      case 'bottom':
        offset.y = -fontStyle.size / 2.25;
        break;
    }

    switch(textAlign) {
      case 'right':
        left = delta;
        right = 0.05;
        break;
      case 'center':
        left = right = delta / 2;
        break;
    }

    var d = getCoords(this, x + offset.x, y + offset.y);

    lineStr.push('<g_vml_:line from="', -left ,' 0" to="', right ,' 0.05" ',
                 ' coordsize="100 100" coordorigin="0 0"',
                 ' filled="', !stroke, '" stroked="', !!stroke,
                 '" style="position:absolute;width:1px;height:1px;">');

    if (stroke) {
      appendStroke(this, lineStr);
    } else {
      // TODO: Fix the min and max params.
      appendFill(this, lineStr, {x: -left, y: 0},
                 {x: right, y: fontStyle.size});
    }

    var skewM = m[0][0].toFixed(3) + ',' + m[1][0].toFixed(3) + ',' +
                m[0][1].toFixed(3) + ',' + m[1][1].toFixed(3) + ',0,0';

    var skewOffset = mr(d.x / Z) + ',' + mr(d.y / Z);

    lineStr.push('<g_vml_:skew on="t" matrix="', skewM ,'" ',
                 ' offset="', skewOffset, '" origin="', left ,' 0" />',
                 '<g_vml_:path textpathok="true" />',
                 '<g_vml_:textpath on="true" string="',
                 encodeHtmlAttribute(text),
                 '" style="v-text-align:', textAlign,
                 ';font:', encodeHtmlAttribute(fontStyleString),
                 '" /></g_vml_:line>');

    this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  contextPrototype.fillText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, false);
  };

  contextPrototype.strokeText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, true);
  };

  contextPrototype.measureText = function(text) {
    if (!this.textMeasureEl_) {
      var s = '<span style="position:absolute;' +
          'top:-20000px;left:0;padding:0;margin:0;border:none;' +
          'white-space:pre;"></span>';
      this.element_.insertAdjacentHTML('beforeEnd', s);
      this.textMeasureEl_ = this.element_.lastChild;
    }
    var doc = this.element_.ownerDocument;
    this.textMeasureEl_.innerHTML = '';
    this.textMeasureEl_.style.font = this.font;
    // Don't use innerHTML or innerText because they allow markup/whitespace.
    this.textMeasureEl_.appendChild(doc.createTextNode(text));
    return {width: this.textMeasureEl_.offsetWidth};
  };

  /******** STUBS ********/
  contextPrototype.clip = function() {
    // TODO: Implement
  };

  contextPrototype.arcTo = function() {
    // TODO: Implement
  };

  contextPrototype.createPattern = function(image, repetition) {
    return new CanvasPattern_(image, repetition);
  };

  // Gradient / Pattern Stubs
  function CanvasGradient_(aType) {
    this.type_ = aType;
    this.x0_ = 0;
    this.y0_ = 0;
    this.r0_ = 0;
    this.x1_ = 0;
    this.y1_ = 0;
    this.r1_ = 0;
    this.colors_ = [];
  }

  CanvasGradient_.prototype.addColorStop = function(aOffset, aColor) {
    aColor = processStyle(aColor);
    this.colors_.push({offset: aOffset,
                       color: aColor.color,
                       alpha: aColor.alpha});
  };

  function CanvasPattern_(image, repetition) {
    assertImageIsValid(image);
    switch (repetition) {
      case 'repeat':
      case null:
      case '':
        this.repetition_ = 'repeat';
        break
      case 'repeat-x':
      case 'repeat-y':
      case 'no-repeat':
        this.repetition_ = repetition;
        break;
      default:
        throwException('SYNTAX_ERR');
    }

    this.src_ = image.src;
    this.width_ = image.width;
    this.height_ = image.height;
  }

  function throwException(s) {
    throw new DOMException_(s);
  }

  function assertImageIsValid(img) {
    if (!img || img.nodeType != 1 || img.tagName != 'IMG') {
      throwException('TYPE_MISMATCH_ERR');
    }
    if (img.readyState != 'complete') {
      throwException('INVALID_STATE_ERR');
    }
  }

  function DOMException_(s) {
    this.code = this[s];
    this.message = s +': DOM Exception ' + this.code;
  }
  var p = DOMException_.prototype = new Error;
  p.INDEX_SIZE_ERR = 1;
  p.DOMSTRING_SIZE_ERR = 2;
  p.HIERARCHY_REQUEST_ERR = 3;
  p.WRONG_DOCUMENT_ERR = 4;
  p.INVALID_CHARACTER_ERR = 5;
  p.NO_DATA_ALLOWED_ERR = 6;
  p.NO_MODIFICATION_ALLOWED_ERR = 7;
  p.NOT_FOUND_ERR = 8;
  p.NOT_SUPPORTED_ERR = 9;
  p.INUSE_ATTRIBUTE_ERR = 10;
  p.INVALID_STATE_ERR = 11;
  p.SYNTAX_ERR = 12;
  p.INVALID_MODIFICATION_ERR = 13;
  p.NAMESPACE_ERR = 14;
  p.INVALID_ACCESS_ERR = 15;
  p.VALIDATION_ERR = 16;
  p.TYPE_MISMATCH_ERR = 17;

  // set up externs
  G_vmlCanvasManager = G_vmlCanvasManager_;
  CanvasRenderingContext2D = CanvasRenderingContext2D_;
  CanvasGradient = CanvasGradient_;
  CanvasPattern = CanvasPattern_;
  DOMException = DOMException_;
})();

} // if
else { // make the canvas test simple by kener.linfeng@gmail.com
    G_vmlCanvasManager = false;
}
return G_vmlCanvasManager;
}); // define;
/**
 * zrender: shape仓库
 *
 * @desc zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(
    'zrender/shape',[],function(/*require*/) {
        var self = {};

        var _shapeLibrary = {};     //shape库

        /**
         * 定义图形实现
         * @param {Object} name
         * @param {Object} clazz 图形实现
         */
        self.define = function(name, clazz) {
            _shapeLibrary[name] = clazz;
            return self;
        };

        /**
         * 获取图形实现
         * @param {Object} name
         */
        self.get = function(name) {
            return _shapeLibrary[name];
        };

        return self;
    }
);
/**
 * zrender: 向量操作类
 *
 * author : lang(shenyi01@baidu.com)
 * code from vec2 in http://glmatrix.net/
 */
define(
    'zrender/tool/vector',[],function() {
       var vector = {
            add : function(out, v1, v2) {
                out[0] = v1[0]+v2[0];
                out[1] = v1[1]+v2[1];
                return out;
            },
            sub : function(out, v1, v2) {
                out[0] = v1[0]-v2[0];
                out[1] = v1[1]-v2[1];
                return out;
            },
            length : function(v) {
                return Math.sqrt( this.lengthSquare(v) );
            },
            lengthSquare : function(v) {
                return v[0]*v[0]+v[1]*v[1];
            },
            mul : function(out, v1, v2) {
                out[0] = v1[0]*v2[0];
                out[1] = v1[1]*v2[1];
                return out;
            },
            dot : function(v1, v2) {
                return v1[0]*v2[0]+v1[1]*v2[1];
            },
            scale : function(out, v, s) {
                out[0] = v[0]*s;
                out[1] = v[1]*s;
                return out;
            },
            normalize : function(out, v) {
                var d = vector.length(v);
                if(d === 0){
                    out[0] = 0;
                    out[1] = 0;
                }else{
                    out[0] = v[0]/d;
                    out[1] = v[1]/d;
                }
                return out;
            },
            distance : function( v1, v2 ) {
                var out = [];
                return vector.length( vector.sub(out, v1, v2) );
            },
            middle : function(out, v1, v2) {
                out[0] = (v1[0]+v2[0])/2;
                out[1] = (v1[1]+v2[1])/2;
                return out;
            }
        };

        return vector;
    }
);
/**
 * zrender: 公共辅助函数
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * clone：深度克隆
 * merge：合并源对象的属性到目标对象
 * getContext：获取一个自由使用的canvas 2D context，使用原生方法，如isPointInPath，measureText等
 */
define(
    'zrender/tool/util',['require','./vector','../lib/excanvas'],function(require) {

        var vec2 = require('./vector');

        /**
         * 对一个object进行深度拷贝
         *
         * @param {Any} source 需要进行拷贝的对象
         * @return {Any} 拷贝后的新对象
         */
        function clone(source) {
            // buildInObject, 用于处理无法遍历Date等对象的问题
            var buildInObject = {
                '[object Function]': 1,
                '[object RegExp]': 1,
                '[object Date]': 1,
                '[object Error]': 1,
                '[object CanvasGradient]': 1
            };
            var result = source;
            var i;
            var len;
            if (!source
                || source instanceof Number
                || source instanceof String
                || source instanceof Boolean
            ) {
                return result;
            }
            else if (source instanceof Array) {
                result = [];
                var resultLen = 0;
                for (i = 0, len = source.length; i < len; i++) {
                    result[resultLen++] = this.clone(source[i]);
                }
            }
            else if ('object' == typeof source) {
                if(buildInObject[Object.prototype.toString.call(source)]
                   || source.__nonRecursion
                ) {
                    return result;
                }
                result = {};
                for (i in source) {
                    if (source.hasOwnProperty(i)) {
                        result[i] = this.clone(source[i]);
                    }
                }
            }
            return result;
        }

        /**
         * 合并源对象的属性到目标对象
         * modify from Tangram
         * @param {*} target 目标对象
         * @param {*} source 源对象
         * @param {Object} optOptions 选项
         * @param {boolean} optOptions.overwrite 是否覆盖
         * @param {boolean} optOptions.recursive 是否递归
         * @param {boolean} optOptions.whiteList 白名单，如果定义，则仅处理白名单属性
         */
        var merge = (function() {
            // buildInObject, 用于处理无法遍历Date等对象的问题
            var buildInObject = {
                '[object Function]': 1,
                '[object RegExp]': 1,
                '[object Date]': 1,
                '[object Error]': 1,
                '[object CanvasGradient]': 1
            };
            function mergeItem(target, source, index, overwrite, recursive) {
                if (source.hasOwnProperty(index)) {
                    if (recursive
                        && typeof target[index] == 'object'
                        && buildInObject[
                            Object.prototype.toString.call(target[index])
                        ] != 1
                    ) {
                        // 如果需要递归覆盖，就递归调用merge
                        merge(
                            target[index],
                            source[index],
                            {
                                'overwrite': overwrite,
                                'recursive': recursive
                            }
                        );
                    } else if (overwrite || !(index in target)) {
                        // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                        target[index] = source[index];
                    }
                }
            }

            return function(target, source, optOptions){
                var i = 0;
                var options = optOptions || {};
                var overwrite = options['overwrite'];
                var whiteList = options['whiteList'];
                var recursive = options['recursive'];
                var len;

                // 只处理在白名单中的属性
                if (whiteList && whiteList.length) {
                    len = whiteList.length;
                    for (; i < len; ++i) {
                        mergeItem(
                            target, source, whiteList[i], overwrite, recursive
                        );
                    }
                } else {
                    for (i in source) {
                        mergeItem(target, source, i, overwrite, recursive);
                    }
                }
                return target;
            };
        })();

        var _ctx;

        function getContext() {
            if (!_ctx) {
                require('../lib/excanvas');
                if (G_vmlCanvasManager) {
                    var _div = document.createElement('div');
                    _div.style.position = 'absolute';
                    _div.style.top = '-1000px';
                    document.body.appendChild(_div);

                    _ctx = G_vmlCanvasManager.initElement(_div)
                               .getContext('2d');
                }
                else {
                    _ctx = document.createElement('canvas').getContext('2d');
                }
            }
            return _ctx;
        }

        var _canvas;
        var _pixelCtx;
        var _width;
        var _height;
        var _offsetX = 0;
        var _offsetY = 0;

        /**
         * 获取像素拾取专用的上下文
         * @return {Object} 上下文
         */
        function getPixelContext() {
            if (!_pixelCtx) {
                _canvas = document.createElement('canvas');
                _width = _canvas.width;
                _height = _canvas.height;
                _pixelCtx = _canvas.getContext('2d');
            }
            return _pixelCtx;
        }

        /**
         * 如果坐标处在_canvas外部，改变_canvas的大小
         * @param {number} x : 横坐标
         * @param {number} y : 纵坐标
         * 注意 修改canvas的大小 需要重新设置translate
         */
        function adjustCanvasSize(x, y) {
            // 每次加的长度
            var _v = 100;
            var _flag = false;

            if (x + _offsetX > _width) {
                _width = x + _offsetX + _v;
                _canvas.width = _width;
                _flag = true;
            }

            if (y + _offsetY > _height) {
                _height = y + _offsetY + _v;
                _canvas.height = _height;
                _flag = true;
            }

            if (x < -_offsetX) {
                _offsetX = Math.ceil(-x / _v) * _v;
                _width += _offsetX;
                _canvas.width = _width;
                _flag = true;
            }

            if (y < -_offsetY) {
                _offsetY = Math.ceil(-y / _v) * _v;
                _height += _offsetY;
                _canvas.height = _height;
                _flag = true;
            }

            if (_flag) {
                _pixelCtx.translate(_offsetX, _offsetY);
            }
        }

        /**
         * 获取像素canvas的偏移量
         * @return {Object} 偏移量
         */
        function getPixelOffset() {
            return {
                x : _offsetX,
                y : _offsetY
            };
        }

        /**
         * 查询数组中元素的index
         */
        function indexOf(array, value){
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for(var i = 0, len=array.length; i<len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * 计算包围盒
         */
        function computeBoundingBox(points, min, max) {
            if (points.length === 0) {
                return;
            }
            var left = points[0][0];
            var right = points[0][0];
            var top = points[0][1];
            var bottom = points[0][1];
            
            for (var i = 1; i < points.length; i++) {
                var p = points[i];
                if (p[0] < left) {
                    left = p[0];
                }
                if (p[0] > right) {
                    right = p[0];
                }
                if (p[1] < top) {
                    top = p[1];
                }
                if (p[1] > bottom) {
                    bottom = p[1];
                }
            }

            min[0] = left;
            min[1] = top;
            max[0] = right;
            max[1] = bottom;
        }

        /**
         * 计算三阶贝塞尔曲线的包围盒
         * http://pissang.net/blog/?p=91
         */
        function computeCubeBezierBoundingBox(p0, p1, p2, p3, min, max) {
            var xDim = _computeCubeBezierExtremitiesDim(
                p0[0], p1[0], p2[0], p3[0]
            );
            var yDim = _computeCubeBezierExtremitiesDim(
                p0[1], p1[1], p2[1], p3[1]
            );

            xDim.push(p0[0], p3[0]);
            yDim.push(p0[1], p3[1]);

            var left = Math.min.apply(null, xDim);
            var right = Math.max.apply(null, xDim);
            var top = Math.min.apply(null, yDim);
            var bottom = Math.max.apply(null, yDim);

            min[0] = left;
            min[1] = top;
            max[0] = right;
            max[1] = bottom;
        }

        function _computeCubeBezierExtremitiesDim(p0, p1, p2, p3) {
            var extremities = [];

            var b = 6 * p2 - 12 * p1 + 6 * p0;
            var a = 9 * p1 + 3 * p3 - 3 * p0 - 9 * p2;
            var c = 3 * p1 - 3 * p0;

            var tmp = b * b - 4 * a * c;
            if (tmp > 0){
                var tmpSqrt = Math.sqrt(tmp);
                var t1 = (-b + tmpSqrt) / (2 * a);
                var t2 = (-b - tmpSqrt) / (2 * a);
                extremities.push(t1, t2);
            } else if (tmp === 0) {
                extremities.push(-b / (2 * a));
            }
            var result = [];
            for (var i = 0; i < extremities.length; i++) {
                var t = extremities[i];
                if (Math.abs(2 * a * t + b) > 0.0001 && t < 1 && t > 0) {
                    var ct = 1 - t;
                    var val = ct * ct * ct * p0 
                            + 3 * ct * ct * t * p1
                            + 3 * ct * t * t * p2
                            + t * t *t * p3;

                    result.push(val);
                }
            }

            return result;
        }

        /**
         * 计算二阶贝塞尔曲线的包围盒
         * http://pissang.net/blog/?p=91
         */
        function computeQuadraticBezierBoundingBox(p0, p1, p2, min, max) {
            // Find extremities, where derivative in x dim or y dim is zero
            var tmp = (p0[0] + p2[0] - 2 * p1[0]);
            // p1 is center of p0 and p2 in x dim
            var t1;
            if (tmp === 0) {
                t1 = 0.5;
            } else {
                t1 = (p0[0] - p1[0]) / tmp;
            }

            tmp = (p0[1] + p2[1] - 2 * p1[1]);
            // p1 is center of p0 and p2 in y dim
            var t2;
            if (tmp === 0) {
                t2 = 0.5;
            } else {
                t2 = (p0[1] - p1[1]) / tmp;
            }

            t1 = Math.max(Math.min(t1, 1), 0);
            t2 = Math.max(Math.min(t2, 1), 0);

            var ct1 = 1-t1;
            var ct2 = 1-t2;

            var x1 = ct1 * ct1 * p0[0] 
                     + 2 * ct1 * t1 * p1[0] 
                     + t1 * t1 * p2[0];
            var y1 = ct1 * ct1 * p0[1] 
                     + 2 * ct1 * t1 * p1[1] 
                     + t1 * t1 * p2[1];

            var x2 = ct2 * ct2 * p0[0] 
                     + 2 * ct2 * t2 * p1[0] 
                     + t2 * t2 * p2[0];
            var y2 = ct2 * ct2 * p0[1] 
                     + 2 * ct2 * t2 * p1[1] 
                     + t2 * t2 * p2[1];

            return computeBoundingBox(
                        [p0.slice(), p2.slice(), [x1, y1], [x2, y2]],
                        min, max
                    );
        }


        /**
         * 计算圆弧的包围盒
         * http://pissang.net/blog/?p=91
         */
        var computeArcBoundingBox = (function(){
            var start = [];
            var end = [];
            // At most 4 extremities
            var extremities = [[], [], [], []];
            return function(
                center, radius, startAngle, endAngle, clockwise, min, max
            ) {
                clockwise = clockwise ? 1 : -1;
                start[0] = Math.cos(startAngle);
                start[1] = Math.sin(startAngle) * clockwise;
                vec2.scale(start, start, radius);
                vec2.add(start, start, center);

                end[0] = Math.cos(endAngle);
                end[1] = Math.sin(endAngle) * clockwise;
                vec2.scale(end, end, radius);
                vec2.add(end, end, center);
                
                startAngle = startAngle % (Math.PI * 2);
                if (startAngle < 0) {
                    startAngle = startAngle + Math.PI * 2;
                }
                endAngle = endAngle % (Math.PI * 2);
                if (endAngle < 0) {
                    endAngle = endAngle + Math.PI * 2;
                }

                if (startAngle > endAngle) {
                    endAngle += Math.PI * 2;
                }
                var number = 0;
                for (var angle = 0; angle < endAngle; angle += Math.PI / 2) {
                    if (angle > startAngle) {
                        var extremity = extremities[number++];
                        extremity[0] = Math.cos(angle);
                        extremity[1] = Math.sin(angle) * clockwise;
                        vec2.scale(extremity, extremity, radius);
                        vec2.add(extremity, extremity, center);
                    }
                }
                var points = extremities.slice(0, number);
                points.push(start, end);
                computeBoundingBox(points, min, max);
            };
        })();

        return {
            clone : clone,
            merge : merge,
            getContext : getContext,

            getPixelContext : getPixelContext,
            getPixelOffset : getPixelOffset,
            adjustCanvasSize : adjustCanvasSize,

            computeBoundingBox : computeBoundingBox,
            computeCubeBezierBoundingBox : computeCubeBezierBoundingBox,
            computeQuadraticBezierBoundingBox : 
                computeQuadraticBezierBoundingBox,
            computeArcBoundingBox : computeArcBoundingBox,

            indexOf : indexOf
        };
    }
);
/**
 * zrender: 图形空间辅助类
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * isInside：是否在区域内部
 * isOutside：是否在区域外部
 * getTextWidth：测算单行文本宽度
 */
define(
    'zrender/tool/area',['require','../tool/util'],function(require) {
        var util = require('../tool/util');

        var _ctx;

        /**
         * 包含判断
         * @param {string} shapeClazz : 图形类
         * @param {Object} area ： 目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         */
        function isInside(shapeClazz, area, x, y) {
            if (!area || !shapeClazz) {
                // 无参数或不支持类型
                return false;
            }
            var zoneType = shapeClazz.type;

            if (!_ctx) {
                _ctx = util.getContext();
            }
            if (!_isInsideRectangle(
                    area.__rect || shapeClazz.getRect(area), x, y
                 )
             ) {
                // 不在矩形区域内直接返回false
                return false;
            }

            // 未实现或不可用时(excanvas不支持)则数学运算，主要是line，brokenLine，ring
            var _mathReturn = _mathMethod(zoneType, area, x, y);

            if (typeof _mathReturn != 'undefined') {
                return _mathReturn;
            }

            if (zoneType != 'beziercurve'
                && shapeClazz.buildPath
                && _ctx.isPointInPath
            ) {
                return _buildPathMethod(shapeClazz, _ctx, area, x, y);
            }
            else if (_ctx.getImageData) {
                return _pixelMethod(shapeClazz, area, x, y);
            }

            // 上面的方法都行不通时
            switch (zoneType) {
                //心形----------------------10
                case 'heart':
                    return true;    // Todo，不精确
                //水滴----------------------11
                case 'droplet':
                    return true;    // Todo，不精确
                case 'ellipse':
                    return true;     // Todo，不精确
                // 旋轮曲线  不准确
                case 'trochoid':
                    var _r = area.location == 'out'
                            ? area.r1 + area.r2 + area.d
                            : area.r1 - area.r2 + area.d;
                    return _isInsideCircle(area, x, y, _r);
                // 玫瑰线 不准确
                case 'rose' :
                    return _isInsideCircle(area, x, y, area.maxr);
                //路径，椭圆，曲线等-----------------13
                default:
                    return false;   // Todo，暂不支持
            }
        }

        /**
         * 用数学方法判断，三个方法中最快，但是支持的shape少
         *
         * @param {string} zoneType ： 图形类型
         * @param {Object} area ：目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         * @return {boolean=} true表示坐标处在图形中
         */
        function _mathMethod(zoneType, area, x, y) {
            // 在矩形内则部分图形需要进一步判断
            switch (zoneType) {
                //线-----------------------1
                case 'line':
                    return _isInsideLine(area, x, y);
                //折线----------------------2
                case 'brokenLine':
                    return _isInsideBrokenLine(area, x, y);
                //文本----------------------3
                case 'text':
                    return true;
                //圆环----------------------4
                case 'ring':
                    return _isInsideRing(area, x, y);
                //矩形----------------------5
                case 'rectangle':
                    return true;
                //圆形----------------------6
                case 'circle':
                    return _isInsideCircle(area, x, y, area.r);
                //扇形----------------------7
                case 'sector':
                    return _isInsideSector(area, x, y);
                //多边形---------------------8
                case 'path':
                    return _isInsidePath(area, x, y);
                case 'polygon':
                case 'star':
                case 'isogon':
                    return _isInsidePolygon(area, x, y);
                //图片----------------------9
                case 'image':
                    return true;
            }
        }

        /**
         * 通过buildPath方法来判断，三个方法中较快，但是不支持线条类型的shape，
         * 而且excanvas不支持isPointInPath方法
         *
         * @param {Object} shapeClazz ： shape类
         * @param {Object} context : 上下文
         * @param {Object} area ：目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         * @return {boolean} true表示坐标处在图形中
         */
        function _buildPathMethod(shapeClazz, context, area, x, y) {
            // 图形类实现路径创建了则用类的path
            context.beginPath();
            shapeClazz.buildPath(context, area);
            context.closePath();
            return context.isPointInPath(x, y);
        }

        /**
         * 通过像素值来判断，三个方法中最慢，但是支持广,不足之处是excanvas不支持像素处理
         *
         * @param {Object} shapeClazz ： shape类
         * @param {Object} area ：目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         * @return {boolean} true表示坐标处在图形中
         */
        function _pixelMethod(shapeClazz, area, x, y) {
            var _rect = area.__rect || shapeClazz.getRect(area);
            var _context = util.getPixelContext();
            var _offset = util.getPixelOffset();

            util.adjustCanvasSize(x, y);
            _context.clearRect(_rect.x, _rect.y, _rect.width, _rect.height);
            _context.beginPath();
            shapeClazz.brush(_context, {style : area});
            _context.closePath();

            return _isPainted(_context, x + _offset.x, y + _offset.y);
        }

        /**
         * 坐标像素值，判断坐标是否被作色
         *
         * @param {Object} context : 上下文
         * @param {number} x : 横坐标
         * @param {number} y : 纵坐标
         * @param {number=} unit : 触发的精度，越大越容易触发，可选，缺省是为1
         * @return {boolean} 已经被画过返回true
         */
        function _isPainted(context, x, y, unit) {
            var pixelsData;

            if (typeof unit != 'undefined') {
                unit = Math.floor((unit || 1 )/ 2);
                pixelsData = context.getImageData(
                    x - unit,
                    y - unit,
                    unit + unit,
                    unit + unit
                ).data;
            }
            else {
                pixelsData = context.getImageData(x, y, 1, 1).data;
            }

            var len = pixelsData.length;
            while (len--) {
                if (pixelsData[len] !== 0) {
                    return true;
                }
            }

            return false;
        }

        /**
         * !isInside
         */
        function isOutside(shapeClazz, area, x, y) {
            return !isInside(shapeClazz, area, x, y);
        }

        /**
         * 线段包含判断
         */
        function _isInsideLine(area, x, y) {
            var _x1 = area.xStart;
            var _y1 = area.yStart;
            var _x2 = area.xEnd;
            var _y2 = area.yEnd;
            var _l = area.lineWidth;
            var _a = 0;
            var _b = _x1;

            if (_x1 !== _x2) {
                _a = (_y1 - _y2) / (_x1 - _x2);
                _b = (_x1 * _y2 - _x2 * _y1) / (_x1 - _x2) ;
            }
            else {
                return Math.abs(x - _x1) <= _l / 2;
            }

            var _s = (_a * x - y + _b) * (_a * x - y + _b) / (_a * _a + 1);
            return  _s <= _l / 2 * _l / 2;
        }

        function _isInsideBrokenLine(area, x, y) {
            var pointList = area.pointList;
            var lineArea;
            var insideCatch = false;
            for (var i = 0, l = pointList.length - 1; i < l; i++) {
                lineArea = {
                    xStart : pointList[i][0],
                    yStart : pointList[i][1],
                    xEnd : pointList[i + 1][0],
                    yEnd : pointList[i + 1][1],
                    lineWidth : area.lineWidth
                };
                if (!_isInsideRectangle(
                        {
                            x : Math.min(lineArea.xStart, lineArea.xEnd)
                                - lineArea.lineWidth,
                            y : Math.min(lineArea.yStart, lineArea.yEnd)
                                - lineArea.lineWidth,
                            width : Math.abs(lineArea.xStart - lineArea.xEnd)
                                    + lineArea.lineWidth,
                            height : Math.abs(lineArea.yStart - lineArea.yEnd)
                                     + lineArea.lineWidth
                        },
                        x,y
                    )
                ) {
                    // 不在矩形区内跳过
                    continue;
                }
                insideCatch = _isInsideLine(lineArea, x, y);
                if (insideCatch) {
                    break;
                }
            }
            return insideCatch;
        }

        function _isInsideRing(area, x, y) {
            if (_isInsideCircle(area, x, y, area.r)
                && !_isInsideCircle(
                    {
                        x : area.x,
                        y : area.y
                    },
                    x, y,
                    area.r0 || 0
                )
            ){
                // 大圆内，小圆外
                return true;
            }
            return false;
        }

        /**
         * 矩形包含判断
         */
        function _isInsideRectangle(area, x, y) {
            if (x >= area.x
                && x <= (area.x + area.width)
                && y >= area.y
                && y <= (area.y + area.height)
            ) {
                return true;
            }
            return false;
        }

        /**
         * 圆形包含判断
         */
        function _isInsideCircle(area, x, y, r) {
            return (x - area.x) * (x - area.x) + (y - area.y) * (y - area.y)
                   < r * r;
        }

        /**
         * 扇形包含判断
         */
        function _isInsideSector(area, x, y) {
            if (!_isInsideCircle(area, x, y, area.r)
                || (area.r0 > 0
                    && _isInsideCircle(
                            {
                                x : area.x,
                                y : area.y
                            },
                            x, y,
                            area.r0
                        )
                    )
            ){
                // 大圆外或者小圆内直接false
                return false;
            }
            else {
                // 判断夹角
                var angle = (360
                             - Math.atan2(y - area.y, x - area.x)
                             / Math.PI
                             * 180)
                             % 360;
                var endA = (360 + area.endAngle) % 360;
                var startA = (360 + area.startAngle) % 360;
                if (endA > startA) {
                    return (angle >= startA && angle <= endA);
                } else {
                    return !(angle >= endA && angle <= startA);
                }

            }
        }

        /**
         * 多边形包含判断
         * 警告：下面这段代码会很难看，建议跳过~
         */
        function _isInsidePolygon(area, x, y) {
            /**
             * 射线判别法
             * 如果一个点在多边形内部，任意角度做射线肯定会与多边形要么有一个交点，要么有与多边形边界线重叠
             * 如果一个点在多边形外部，任意角度做射线要么与多边形有一个交点，
             * 要么有两个交点，要么没有交点，要么有与多边形边界线重叠。
             */
            var i;
            var j;
            var polygon = area.pointList;
            var N = polygon.length;
            var inside = false;
            var redo = true;
            var v;

            for (i = 0; i < N; ++i) {
                // 是否在顶点上
                if (polygon[i][0] == x && polygon[i][1] == y ) {
                    redo = false;
                    inside = true;
                    break;
                }
            }

            if (redo) {
                redo = false;
                inside = false;
                for (i = 0,j = N - 1;i < N;j = i++) {
                    if ((polygon[i][1] < y && y < polygon[j][1])
                        || (polygon[j][1] < y && y < polygon[i][1])
                    ) {
                        if (x <= polygon[i][0] || x <= polygon[j][0]) {
                            v = (y - polygon[i][1])
                                * (polygon[j][0] - polygon[i][0])
                                / (polygon[j][1] - polygon[i][1])
                                + polygon[i][0];
                            if (x < v) {          // 在线的左侧
                                inside = !inside;
                            }
                            else if (x == v) {   // 在线上
                                inside = true;
                                break;
                            }
                        }
                    }
                    else if (y == polygon[i][1]) {
                        if (x < polygon[i][0]) {    // 交点在顶点上
                            polygon[i][1] > polygon[j][1] ? --y : ++y;
                            //redo = true;
                            break;
                        }
                    }
                    else if (polygon[i][1] == polygon[j][1] // 在水平的边界线上
                             && y == polygon[i][1]
                             && ((polygon[i][0] < x && x < polygon[j][0])
                                 || (polygon[j][0] < x && x < polygon[i][0]))
                    ) {
                        inside = true;
                        break;
                    }
                }
            }
            return inside;
        }
        
        /**
         * 路径包含判断，依赖多边形判断
         */
        function _isInsidePath(area, x, y) {
            var pointList = area.pointList;
            var insideCatch = false;
            for (var i = 0, l = pointList.length; i < l; i++) {
                insideCatch = _isInsidePolygon(
                    { pointList : pointList[i] }, x, y
                );
                if (insideCatch) {
                    break;
                }
            }
            return insideCatch;
        }

        /**
         * 测算单行文本欢度
         * @param {Object} text
         * @param {Object} textFont
         */
        function getTextWidth(text, textFont) {
            if (!_ctx) {
                _ctx = util.getContext();
            }

            _ctx.save();
            if (textFont) {
                _ctx.font = textFont;
            }
            var width = _ctx.measureText(text).width;
            _ctx.restore();

            return width;
        }

        return {
            isInside : isInside,
            isOutside : isOutside,
            getTextWidth : getTextWidth
        };
    }
);

/**
 * zrender: 3x2矩阵操作类
 *
 * author: lang(shenyi01@baidu.com)
 * code from mat2d in http://glmatrix.net/
 */

define(
    'zrender/tool/matrix',[],function() {

        var matrix = {
            create : function() {
                return [1, 0,
                        0, 1,
                        0, 0];
            },
            identity : function(out) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                out[4] = 0;
                out[5] = 0;
            },
            mul : function(out, m1, m2) {
               out[0] = m1[0] * m2[0] + m1[2] * m2[1];
               out[1] = m1[1] * m2[0] + m1[3] * m2[1];
               out[2] = m1[0] * m2[2] + m1[2] * m2[3];
               out[3] = m1[1] * m2[2] + m1[3] * m2[3];
               out[4] = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
               out[5] = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];
               return out;
            },

            translate : function(out, a, v) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4] + v[0];
                out[5] = a[5] + v[1];
                return out;
            },
            rotate : function(out, a, rad) {
                var aa = a[0], ac = a[2], atx = a[4];
                var ab = a[1], ad = a[3], aty = a[5];
                var st = Math.sin(rad);
                var ct = Math.cos(rad);

                out[0] = aa*ct + ab*st;
                out[1] = -aa*st + ab*ct;
                out[2] = ac*ct + ad*st;
                out[3] = -ac*st + ct*ad;
                out[4] = ct*atx + st*aty;
                out[5] = ct*aty - st*atx;
                return out;
            },
            scale : function(out, a, v) {
                var vx = v[0], vy = v[1];
                out[0] = a[0] * vx;
                out[1] = a[1] * vy;
                out[2] = a[2] * vx;
                out[3] = a[3] * vy;
                out[4] = a[4] * vx;
                out[5] = a[5] * vy;
                return out;
            },
            /**
             * 求逆矩阵
             */
            invert : function(out, a) {
            
                var aa = a[0], ac = a[2], atx = a[4];
                var ab = a[1], ad = a[3], aty = a[5];

                var det = aa * ad - ab * ac;
                if(!det){
                    return null;
                }
                det = 1.0 / det;

                out[0] = ad * det;
                out[1] = -ab * det;
                out[2] = -ac * det;
                out[3] = aa * det;
                out[4] = (ac * aty - ad * atx) * det;
                out[5] = (ab * atx - aa * aty) * det;
                return out;
            },

            /**
             * 矩阵左乘向量
             */
            mulVector : function(out, a, v) {
                var aa = a[0], ac = a[2], atx = a[4];
                var ab = a[1], ad = a[3], aty = a[5];

                out[0] = v[0] * aa + v[1] * ac + atx;
                out[1] = v[0] * ab + v[1] * ad + aty;

                return out;
            }
        };

        return matrix;
    }
);
/**
 * zrender : 颜色辅助类
 *
 * author: CrossDo (chenhuaimu@baidu.com)
 *
 * getColor：获取色板颜色
 * customPalette : 自定义调色板
 * resetPalette : 重置调色板
 *
 * getHighlightColor : 获取默认高亮颜色
 * customHighlight : 自定义默认高亮颜色
 * resetHighlight : 重置默认高亮颜色
 *
 * getRadialGradient : 径向渐变
 * getLinearGradient : 线性渐变
 * getGradientColors : 获取颜色之间渐变颜色数组
 * getStepColors : 获取两种颜色之间渐变颜色数组
 * reverse : 颜色翻转
 * mix : 颜色混合
 * lift : 颜色升降
 * trim : 清除空格
 * random : 随机颜色
 * toRGB  : 转为RGB格式
 * toRGBA : 转为RGBA格式
 * toHex  : 转为#RRGGBB格式
 * toHSL  : 转为HSL格式
 * toHSLA : 转为HSLA格式
 * toHSB  : 转为HSB格式
 * toHSBA : 转为HSBA格式
 * toHSV  : 转为HSV格式
 * toHSVA : 转为HSVA格式
 * toName : 转为颜色名字
 * toColor: 颜色值数组转为指定格式颜色
 * toArray: 返回颜色值数组
 * alpha  : 设置颜色的透明度
 **/
define( 'zrender/tool/color',['require','../tool/util'],function(require) {
    var util = require('../tool/util');

    var _ctx;

    // Color palette is an array containing the default colors for the chart's
    // series.
    // When all colors are used, new colors are selected from the start again.
    // Defaults to:
    // 默认色板
    var palette = [
        '#ff9277', ' #dddd00', ' #ffc877', ' #bbe3ff', ' #d5ffbb',
        '#bbbbff', ' #ddb000', ' #b0dd00', ' #e2bbff', ' #ffbbe3',
        '#ff7777', ' #ff9900', ' #83dd00', ' #77e3ff', ' #778fff',
        '#c877ff', ' #ff77ab', ' #ff6600', ' #aa8800', ' #77c7ff',
        '#ad77ff', ' #ff77ff', ' #dd0083', ' #777700', ' #00aa00',
        '#0088aa', ' #8400dd', ' #aa0088', ' #dd0000', ' #772e00'
    ];
    var _palette = palette;

    var highlightColor = 'rgba(255,255,0,0.5)';
    var _highlightColor = highlightColor;

    // 颜色格式
    /*jshint maxlen: 330 */
    var colorRegExp = /^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+%?)?)\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\))\s*$/i;

    var _nameColors = {
        aliceblue : '#f0f8ff',
        antiquewhite : '#faebd7',
        aqua : '#0ff',
        aquamarine : '#7fffd4',
        azure : '#f0ffff',
        beige : '#f5f5dc',
        bisque : '#ffe4c4',
        black : '#000',
        blanchedalmond : '#ffebcd',
        blue : '#00f',
        blueviolet : '#8a2be2',
        brown : '#a52a2a',
        burlywood : '#deb887',
        cadetblue : '#5f9ea0',
        chartreuse : '#7fff00',
        chocolate : '#d2691e',
        coral : '#ff7f50',
        cornflowerblue : '#6495ed',
        cornsilk : '#fff8dc',
        crimson : '#dc143c',
        cyan : '#0ff',
        darkblue : '#00008b',
        darkcyan : '#008b8b',
        darkgoldenrod : '#b8860b',
        darkgray : '#a9a9a9',
        darkgrey : '#a9a9a9',
        darkgreen : '#006400',
        darkkhaki : '#bdb76b',
        darkmagenta : '#8b008b',
        darkolivegreen : '#556b2f',
        darkorange : '#ff8c00',
        darkorchid : '#9932cc',
        darkred : '#8b0000',
        darksalmon : '#e9967a',
        darkseagreen : '#8fbc8f',
        darkslateblue : '#483d8b',
        darkslategray : '#2f4f4f',
        darkslategrey : '#2f4f4f',
        darkturquoise : '#00ced1',
        darkviolet : '#9400d3',
        deeppink : '#ff1493',
        deepskyblue : '#00bfff',
        dimgray : '#696969',
        dimgrey : '#696969',
        dodgerblue : '#1e90ff',
        firebrick : '#b22222',
        floralwhite : '#fffaf0',
        forestgreen : '#228b22',
        fuchsia : '#f0f',
        gainsboro : '#dcdcdc',
        ghostwhite : '#f8f8ff',
        gold : '#ffd700',
        goldenrod : '#daa520',
        gray : '#808080',
        grey : '#808080',
        green : '#008000',
        greenyellow : '#adff2f',
        honeydew : '#f0fff0',
        hotpink : '#ff69b4',
        indianred : '#cd5c5c',
        indigo : '#4b0082',
        ivory : '#fffff0',
        khaki : '#f0e68c',
        lavender : '#e6e6fa',
        lavenderblush : '#fff0f5',
        lawngreen : '#7cfc00',
        lemonchiffon : '#fffacd',
        lightblue : '#add8e6',
        lightcoral : '#f08080',
        lightcyan : '#e0ffff',
        lightgoldenrodyellow : '#fafad2',
        lightgray : '#d3d3d3',
        lightgrey : '#d3d3d3',
        lightgreen : '#90ee90',
        lightpink : '#ffb6c1',
        lightsalmon : '#ffa07a',
        lightseagreen : '#20b2aa',
        lightskyblue : '#87cefa',
        lightslategray : '#789',
        lightslategrey : '#789',
        lightsteelblue : '#b0c4de',
        lightyellow : '#ffffe0',
        lime : '#0f0',
        limegreen : '#32cd32',
        linen : '#faf0e6',
        magenta : '#f0f',
        maroon : '#800000',
        mediumaquamarine : '#66cdaa',
        mediumblue : '#0000cd',
        mediumorchid : '#ba55d3',
        mediumpurple : '#9370d8',
        mediumseagreen : '#3cb371',
        mediumslateblue : '#7b68ee',
        mediumspringgreen : '#00fa9a',
        mediumturquoise : '#48d1cc',
        mediumvioletred : '#c71585',
        midnightblue : '#191970',
        mintcream : '#f5fffa',
        mistyrose : '#ffe4e1',
        moccasin : '#ffe4b5',
        navajowhite : '#ffdead',
        navy : '#000080',
        oldlace : '#fdf5e6',
        olive : '#808000',
        olivedrab : '#6b8e23',
        orange : '#ffa500',
        orangered : '#ff4500',
        orchid : '#da70d6',
        palegoldenrod : '#eee8aa',
        palegreen : '#98fb98',
        paleturquoise : '#afeeee',
        palevioletred : '#d87093',
        papayawhip : '#ffefd5',
        peachpuff : '#ffdab9',
        peru : '#cd853f',
        pink : '#ffc0cb',
        plum : '#dda0dd',
        powderblue : '#b0e0e6',
        purple : '#800080',
        red : '#f00',
        rosybrown : '#bc8f8f',
        royalblue : '#4169e1',
        saddlebrown : '#8b4513',
        salmon : '#fa8072',
        sandybrown : '#f4a460',
        seagreen : '#2e8b57',
        seashell : '#fff5ee',
        sienna : '#a0522d',
        silver : '#c0c0c0',
        skyblue : '#87ceeb',
        slateblue : '#6a5acd',
        slategray : '#708090',
        slategrey : '#708090',
        snow : '#fffafa',
        springgreen : '#00ff7f',
        steelblue : '#4682b4',
        tan : '#d2b48c',
        teal : '#008080',
        thistle : '#d8bfd8',
        tomato : '#ff6347',
        turquoise : '#40e0d0',
        violet : '#ee82ee',
        wheat : '#f5deb3',
        white : '#fff',
        whitesmoke : '#f5f5f5',
        yellow : '#ff0',
        yellowgreen : '#9acd32'
    };

    /**
     * 自定义调色板
     */
    function customPalette(userPalete) {
        palette = userPalete;
    }

    /**
     * 复位默认色板
     */
    function resetPalette() {
        palette = _palette;
    }

    /**
     * 获取色板颜色
     * @param {number} idx : 色板位置
     * @param {array} [userPalete] : 自定义色板
     *
     * @return {color} 颜色#000000~#ffffff
     */
    function getColor(idx, userPalete) {
        idx = +idx || 0;
        userPalete = userPalete || palette;
        return userPalete[idx % userPalete.length];
    }

    /**
     * 自定义默认高亮颜色
     */
    function customHighlight(userHighlightColor) {
        highlightColor = userHighlightColor;
    }

    /**
     * 重置默认高亮颜色
     */
    function resetHighlight() {
        _highlightColor = highlightColor;
    }

    /**
     * 获取默认高亮颜色
     */
    function getHighlightColor() {
        return highlightColor;
    }

    /**
     * 径向渐变
     * @param {number} x0 渐变起点
     * @param {number} y0
     * @param {number} r0
     * @param {number} x1 渐变终点
     * @param {number} y1
     * @param {number} r1
     * @param {Array} colorList 颜色列表
     */
    function getRadialGradient(x0, y0, r0, x1, y1, r1, colorList) {
        if (!_ctx) {
            _ctx = util.getContext();
        }
        var gradient = _ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
        for ( var i = 0, l = colorList.length; i < l; i++) {
            gradient.addColorStop(colorList[i][0], colorList[i][1]);
        }
        gradient.__nonRecursion = true;
        return gradient;
    }

    /**
     * 线性渐变
     * @param {Object} x0 渐变起点
     * @param {Object} y0
     * @param {Object} x1 渐变终点
     * @param {Object} y1
     * @param {Array} colorList 颜色列表
     */
    function getLinearGradient(x0, y0, x1, y1, colorList) {
        if (!_ctx) {
            _ctx = util.getContext();
        }
        var gradient = _ctx.createLinearGradient(x0, y0, x1, y1);
        for ( var i = 0, l = colorList.length; i < l; i++) {
            gradient.addColorStop(colorList[i][0], colorList[i][1]);
        }
        gradient.__nonRecursion = true;
        return gradient;
    }

    /**
     * 获取两种颜色之间渐变颜色数组
     * @param {color} start 起始颜色
     * @param {color} end 结束颜色
     * @param {number} step 渐变级数
     * @return {Array}  颜色数组
     */
    function getStepColors(start, end, step) {
        start = toRGBA(start);
        end = toRGBA(end);
        start = getData(start);
        end = getData(end);

        var colors = [];
        var stepR = (end[0] - start[0]) / step;
        var stepG = (end[1] - start[1]) / step;
        var stepB = (end[2] - start[2]) / step;
        // 生成颜色集合
        // fix by linfeng 颜色堆积
        for (var i = 0, r = start[0], g = start[1], b = start[2]; i < step; i++
        ) {
            colors[i] = toColor([
                adjust(Math.floor(r), [ 0, 255 ]),
                adjust(Math.floor(g), [ 0, 255 ]), 
                adjust(Math.floor(b), [ 0, 255 ])
            ]);
            r += stepR;
            g += stepG;
            b += stepB;
        }
        r = end[0];
        g = end[1];
        b = end[2];
        colors[i] = toColor( [ r, g, b ]);
        return colors;
    }

    /**
     * 获取指定级数的渐变颜色数组
     * @param {Array} colors 颜色组
     * @param {number=20} step 渐变级数
     * @return {Array}  颜色数组
     */
    function getGradientColors(colors, step) {
        var ret = [];
        var len = colors.length;
        if (step === undefined) {
            step = 20;
        }
        if (len === 1) {
            ret = getStepColors(colors[0], colors[0], step);
        } else if (len > 1) {
            for ( var i = 0, n = len - 1; i < n; i++) {
                var steps = getStepColors(colors[i], colors[i + 1], step);
                if (i < n - 1) {
                    steps.pop();
                }
                ret = ret.concat(steps);
            }
        }
        return ret;
    }

    /**
     * 颜色值数组转为指定格式颜色,例如:<br/>
     * data = [60,20,20,0.1] format = 'rgba'
     * 返回：rgba(60,20,20,0.1)
     * @param {Array} data 颜色值数组
     * @param {string} format 格式,默认rgb
     * @return {string} 颜色
     */
    function toColor(data, format) {
        format = format || 'rgb';
        if (data && (data.length === 3 || data.length === 4)) {
            data = map(data,
                function(c) {
                    return c > 1 ? Math.ceil(c) : c;
            });

            if (format.indexOf('hex') > -1) {
                data = map(data.slice(0, 3),
                    function(c) {
                        c = Number(c).toString(16);
                        return (c.length === 1) ? '0' + c : c;
                });
                return '#' + data.join('');
            } else if (format.indexOf('hs') > -1) {
                var sx = map(data.slice(1, 3),
                    function(c) {
                        return c + '%';
                });
                data[1] = sx[0];
                data[2] = sx[1];
            }

            if (format.indexOf('a') > -1) {
                if (data.length === 3) {
                    data.push(1);
                }
                data[3] = adjust(data[3], [ 0, 1 ]);
                return format + '(' + data.slice(0, 4).join(',') + ')';
            }

            return format + '(' + data.slice(0, 3).join(',') + ')';
        }
    }

    /**
     * 返回颜色值数组
     * @param {string} color 颜色
     * @return {Array} 颜色值数组
     */
    function toArray(color) {
        color = trim(color);
        if (color.indexOf('#') > -1) {
            color = toRGB(color);
        }
        var data = color.replace(/[rgbahsvl%\(\)]/ig, '').split(',');
        data = map(data,
            function(c) {
                return Number(c);
        });
        return data;
    }

    /**
     * 颜色格式转化
     * @param {Array} data 颜色值数组
     * @param {string} format 格式,默认rgb
     * @return {string} 颜色
     */
    function convert(color, format) {
        var data = getData(color);
        var alpha = data[3];
        if(typeof alpha === 'undefined') {
            alpha = 1;
        }

        if (color.indexOf('hsb') > -1) {
            data = _HSV_2_RGB(data);
        } else if (color.indexOf('hsl') > -1) {
            data = _HSL_2_RGB(data);
        }

        if (format.indexOf('hsb') > -1 || format.indexOf('hsv') > -1) {
            data = _RGB_2_HSB(data);
        } else if (format.indexOf('hsl') > -1) {
            data = _RGB_2_HSL(data);
        }

        data[3] = alpha;

        return toColor(data, format);
    }

    /**
     * 转换为rgba格式的颜色
     * @param {string} color 颜色
     * @return {string} rgba颜色，rgba(r,g,b,a)
     */
    function toRGBA(color) {
        return convert(color, 'rgba');
    }

    /**
     * 转换为rgb数字格式的颜色
     * @param {string} color 颜色
     * @return {string} rgb颜色，rgb(0,0,0)格式
     */
    function toRGB(color) {
        return convert(color, 'rgb');
    }

    /**
     * 转换为16进制颜色
     * @param {string} color 颜色
     * @return {string} 16进制颜色，#rrggbb格式
     */
    function toHex(color) {
        return convert(color, 'hex');
    }

    /**
     * 转换为HSV颜色
     * @param {string} color 颜色
     * @return {string} HSVA颜色，hsva(h,s,v,a)
     */
    function toHSVA(color) {
        return convert(color, 'hsva');
    }

    /**
     * 转换为HSV颜色
     * @param {string} color 颜色
     * @return {string} HSV颜色，hsv(h,s,v)
     */
    function toHSV(color) {
        return convert(color, 'hsv');
    }

    /**
     * 转换为HSBA颜色
     * @param {string} color 颜色
     * @return {string} HSBA颜色，hsba(h,s,b,a)
     */
    function toHSBA(color) {
        return convert(color, 'hsba');
    }

    /**
     * 转换为HSB颜色
     * @param {string} color 颜色
     * @return {string} HSB颜色，hsb(h,s,b)
     */
    function toHSB(color) {
        return convert(color, 'hsb');
    }

    /**
     * 转换为HSLA颜色
     * @param {string} color 颜色
     * @return {string} HSLA颜色，hsla(h,s,l,a)
     */
    function toHSLA(color) {
        return convert(color, 'hsla');
    }

    /**
     * 转换为HSL颜色
     * @param {string} color 颜色
     * @return {string} HSL颜色，hsl(h,s,l)
     */
    function toHSL(color) {
        return convert(color, 'hsl');
    }

    /**
     * 转换颜色名
     * @param {string} color 颜色
     * @return {String} 颜色名
     */
    function toName(color) {
        for ( var key in _nameColors) {
            if (toHex(_nameColors[key]) === toHex(color)) {
                return key;
            }
        }
        return null;
    }

    /**
     * 移除颜色中多余空格
     * @param {String} color 颜色
     * @return {String} 无空格颜色
     */
    function trim(color) {
        color = String(color);
        color = color.replace(/(^\s*)|(\s*$)/g, '');
        if (/^[^#]*?$/i.test(color)) {
            color = color.replace(/\s/g, '');
        }
        return color;
    }

    // 规范化
    function normalize(color) {
        // 颜色名
        if (_nameColors[color]) {
            color = _nameColors[color];
        }
        // 去掉空格
        color = trim(color);
        // hsv与hsb等价
        color = color.replace(/hsv/i, 'hsb');
        // rgb转为rrggbb
        if (/^#[0-9a-f]{3}$/i.test(color)) {
            var d = color.replace('#', '').split('');
            color = '#' + d[0] + d[0] + d[1] + d[1] + d[2] + d[2];
        }
        return color;
    }

    /**
     * 颜色加深或减淡，当level>0加深，当level<0减淡
     * @param {string} color 颜色
     * @param {number} level 升降程度,取值区间[-1,1]
     * @return {string} 加深或减淡后颜色值
     */
    function lift(color, level) {
        var direct = level > 0 ? 1 : -1;
        if (typeof level === 'undefined') {
            level = 0;
        }
        level = Math.abs(level) > 1 ? 1 : Math.abs(level);
        color = toRGB(color);
        var data = getData(color);
        for ( var i = 0; i < 3; i++) {
            if (direct === 1) {
                data[i] = Math.floor(data[i] * (1 - level));
            } else {
                data[i] = Math.floor((255 - data[i]) * level + data[i]);
            }
        }
        return 'rgb(' + data.join(',') + ')';
    }

    /**
     * 颜色翻转,[255-r,255-g,255-b,1-a]
     * @param {string} color 颜色
     * @return {string} 翻转颜色
     */
    function reverse(color) {
        var data = getData(toRGBA(color));
        data = map(data,
            function(c) {
                return 255 - c;
        });
        return toColor(data, 'rgb');
    }

    /**
     * 简单两种颜色混合
     * @param {String} color1 第一种颜色
     * @param {String} color2 第二种颜色
     * @param {String} weight 混合权重[0-1]
     * @return {String} 结果色,rgb(r,g,b)或rgba(r,g,b,a)
     */
    function mix(color1, color2, weight) {
        if(typeof weight === 'undefined') {
            weight = 0.5;
        }
        weight = 1 - adjust(weight, [0, 1]);

        var w = weight * 2 - 1;
        var data1 = getData(toRGBA(color1));
        var data2 = getData(toRGBA(color2));

        var d = data1[3] - data2[3];

        var weight1 = (((w * d === -1) ? w : (w + d) / (1 + w * d)) + 1) / 2;
        var weight2 = 1 - weight1;

        var data = [];

        for ( var i = 0; i < 3; i++) {
            data[i] = data1[i] * weight1 + data2[i] * weight2;
        }

        var alpha = data1[3] * weight + data2[3] * (1 - weight);
        alpha = Math.max(0, Math.min(1, alpha));

        if (data1[3] === 1 && data2[3] === 1) {// 不考虑透明度
            return toColor(data, 'rgb');
        }
        data[3] = alpha;
        return toColor(data, 'rgba');
    }

    /**
     * 随机颜色
     * @return {string} 颜色值，#rrggbb格式
     */
    function random() {
        return toHex(
            'rgb(' + Math.round(Math.random() * 256) + ','
                   + Math.round(Math.random() * 256) + ','
                   + Math.round(Math.random() * 256) + ')'
        );
    }

    /**
     * 获取颜色值数组,返回值范围： <br/>
     * RGB 范围[0-255] <br/>
     * HSL/HSV/HSB 范围[0-1]<br/>
     * A透明度范围[0-1]
     * 支持格式：
     * #rgb
     * #rrggbb
     * rgb(r,g,b)
     * rgb(r%,g%,b%)
     * rgba(r,g,b,a)
     * hsb(h,s,b) // hsv与hsb等价
     * hsb(h%,s%,b%)
     * hsba(h,s,b,a)
     * hsl(h,s,l)
     * hsl(h%,s%,l%)
     * hsla(h,s,l,a)
     * @param {string} color 颜色
     * @return {Array} 颜色值数组或null
     */
    function getData(color) {
        color = normalize(color);
        var r = color.match(colorRegExp);
        if (r === null) {
            throw new Error('The color format error'); // 颜色格式错误
        }
        var d;
        var a;
        var data = [];
        var rgb;

        if (r[2]) {
            // #rrggbb
            d = r[2].replace('#', '').split('');
            rgb = [ d[0] + d[1], d[2] + d[3], d[4] + d[5] ];
            data = map(rgb,
                function(c) {
                    return adjust(parseInt(c, 16), [ 0, 255 ]);
            });

        }
        else if (r[4]) {
            // rgb rgba
            var rgba = (r[4]).split(',');
            a = rgba[3];
            rgb = rgba.slice(0, 3);
            data = map(
                rgb,
                function(c) {
                    c = Math.floor(
                        c.indexOf('%') > 0 ? parseInt(c, 0) * 2.55 : c
                    );
                    return adjust(c, [ 0, 255 ]);
                }
            );

            if( typeof a !== 'undefined') {
                data.push(adjust(parseFloat(a), [ 0, 1 ]));
            }
        }
        else if (r[5] || r[6]) {
            // hsb hsba hsl hsla
            var hsxa = (r[5] || r[6]).split(',');
            var h = parseInt(hsxa[0], 0) / 360;
            var s = hsxa[1];
            var x = hsxa[2];
            a = hsxa[3];
            data = map( [ s, x ],
                function(c) {
                    return adjust(parseFloat(c) / 100, [ 0, 1 ]);
            });
            data.unshift(h);
            if( typeof a !== 'undefined') {
                data.push(adjust(parseFloat(a), [ 0, 1 ]));
            }
        }
        return data;
    }

    /**
     * 设置颜色透明度
     * @param {string} color 颜色
     * @param {number} alpha 透明度,区间[0,1]
     * @return {string} rgba颜色值
     */
    function alpha(color, a) {
        if (a === null) {
            a = 1;
        }
        var data = getData(toRGBA(color));
        data[3] = adjust(Number(a).toFixed(4), [ 0, 1 ]);

        return toColor(data, 'rgba');
    }

    // 数组映射
    function map(array, fun) {
        if (typeof fun !== 'function') {
            throw new TypeError();
        }
        var len = array ? array.length : 0;
        for ( var i = 0; i < len; i++) {
            array[i] = fun(array[i]);
        }
        return array;
    }

    // 调整值区间
    function adjust(value, region) {
        // < to <= & > to >=
        // modify by linzhifeng 2014-05-25 because -0 == 0
        if (value <= region[0]) {
            value = region[0];
        }
        else if (value >= region[1]) {
            value = region[1];
        }
        return value;
    }

    // 参见 http:// www.easyrgb.com/index.php?X=MATH
    function _HSV_2_RGB(data) {
        var H = data[0];
        var S = data[1];
        var V = data[2];
        // HSV from 0 to 1
        var R, G, B;
        if (S === 0) {
            R = V * 255;
            G = V * 255;
            B = V * 255;
        } else {
            var h = H * 6;
            if (h === 6) {
                h = 0;
            }
            var i = Math.floor(h);
            var v1 = V * (1 - S);
            var v2 = V * (1 - S * (h - i));
            var v3 = V * (1 - S * (1 - (h - i)));
            var r = 0;
            var g = 0;
            var b = 0;

            if (i === 0) {
                r = V;
                g = v3;
                b = v1;
            } else if (i === 1) {
                r = v2;
                g = V;
                b = v1;
            } else if (i === 2) {
                r = v1;
                g = V;
                b = v3;
            } else if (i === 3) {
                r = v1;
                g = v2;
                b = V;
            } else if (i === 4) {
                r = v3;
                g = v1;
                b = V;
            } else {
                r = V;
                g = v1;
                b = v2;
            }

            // RGB results from 0 to 255
            R = r * 255;
            G = g * 255;
            B = b * 255;
        }
        return [ R, G, B ];
    }

    function _HSL_2_RGB(data) {
        var H = data[0];
        var S = data[1];
        var L = data[2];
        // HSL from 0 to 1
        var R, G, B;
        if (S === 0) {
            R = L * 255;
            G = L * 255;
            B = L * 255;
        } else {
            var v2;
            if (L < 0.5) {
                v2 = L * (1 + S);
            } else {
                v2 = (L + S) - (S * L);
            }

            var v1 = 2 * L - v2;

            R = 255 * _HUE_2_RGB(v1, v2, H + (1 / 3));
            G = 255 * _HUE_2_RGB(v1, v2, H);
            B = 255 * _HUE_2_RGB(v1, v2, H - (1 / 3));
        }
        return [ R, G, B ];
    }

    function _HUE_2_RGB(v1, v2, vH) {
        if (vH < 0) {
            vH += 1;
        }
        if (vH > 1) {
            vH -= 1;
        }
        if ((6 * vH) < 1) {
            return (v1 + (v2 - v1) * 6 * vH);
        }
        if ((2 * vH) < 1) {
            return (v2);
        }
        if ((3 * vH) < 2) {
            return (v1 + (v2 - v1) * ((2 / 3) - vH) * 6);
        }
        return v1;
    }

    function _RGB_2_HSB(data) {
        // RGB from 0 to 255
        var R = (data[0] / 255);
        var G = (data[1] / 255);
        var B = (data[2] / 255);

        var vMin = Math.min(R, G, B); // Min. value of RGB
        var vMax = Math.max(R, G, B); // Max. value of RGB
        var delta = vMax - vMin; // Delta RGB value
        var V = vMax;
        var H;
        var S;

        // HSV results from 0 to 1
        if (delta === 0) {
            H = 0;
            S = 0;
        } else {
            S = delta / vMax;

            var deltaR = (((vMax - R) / 6) + (delta / 2)) / delta;
            var deltaG = (((vMax - G) / 6) + (delta / 2)) / delta;
            var deltaB = (((vMax - B) / 6) + (delta / 2)) / delta;

            if (R === vMax) {
                H = deltaB - deltaG;
            } else if (G === vMax) {
                H = (1 / 3) + deltaR - deltaB;
            } else if (B === vMax) {
                H = (2 / 3) + deltaG - deltaR;
            }

            if (H < 0) {
                H += 1;
            }
            if (H > 1) {
                H -= 1;
            }
        }
        H = H * 360;
        S = S * 100;
        V = V * 100;
        return [ H, S, V ];
    }

    function _RGB_2_HSL(data) {
        // RGB from 0 to 255
        var R = (data[0] / 255);
        var G = (data[1] / 255);
        var B = (data[2] / 255);

        var vMin = Math.min(R, G, B); // Min. value of RGB
        var vMax = Math.max(R, G, B); // Max. value of RGB
        var delta = vMax - vMin; // Delta RGB value

        var L = (vMax + vMin) / 2;
        var H;
        var S;
        // HSL results from 0 to 1
        if (delta === 0) {
            H = 0;
            S = 0;
        } else {
            if (L < 0.5) {
                S = delta / (vMax + vMin);
            } else {
                S = delta / (2 - vMax - vMin);
            }

            var deltaR = (((vMax - R) / 6) + (delta / 2)) / delta;
            var deltaG = (((vMax - G) / 6) + (delta / 2)) / delta;
            var deltaB = (((vMax - B) / 6) + (delta / 2)) / delta;

            if (R === vMax) {
                H = deltaB - deltaG;
            } else if (G === vMax) {
                H = (1 / 3) + deltaR - deltaB;
            } else if (B === vMax) {
                H = (2 / 3) + deltaG - deltaR;
            }

            if (H < 0) {
                H += 1;
            }

            if (H > 1) {
                H -= 1;
            }
        }

        H = H * 360;
        S = S * 100;
        L = L * 100;

        return [ H, S, L ];
    }

    return {
        customPalette : customPalette,
        resetPalette : resetPalette,
        getColor : getColor,
        getHighlightColor : getHighlightColor,
        customHighlight : customHighlight,
        resetHighlight : resetHighlight,
        getRadialGradient : getRadialGradient,
        getLinearGradient : getLinearGradient,
        getGradientColors : getGradientColors,
        getStepColors : getStepColors,
        reverse : reverse,
        mix : mix,
        lift : lift,
        trim : trim,
        random : random,
        toRGB : toRGB,
        toRGBA : toRGBA,
        toHex : toHex,
        toHSL : toHSL,
        toHSLA : toHSLA,
        toHSB : toHSB,
        toHSBA : toHSBA,
        toHSV : toHSV,
        toHSVA : toHSVA,
        toName : toName,
        toColor : toColor,
        toArray : toArray,
        alpha : alpha,
        getData : getData
    };
});


/**
 * zrender : shape基类
 *
 * desc:    zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * 可配图形属性：
   {
       // 基础属性，详见各shape
       shape  : {string},       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 变换
       position : {array},        // 默认为[0, 0], shape的坐标
       rotation : {number|array}, // 默认为[0, 0, 0]，shape绕自身旋转的角度，不被translate 影响
                                  // 后两个值为旋转的origin
       scale : {array},           // 默认为[1, 1, 0, 0], shape纵横缩放比例，不被translate影响
                                  // 后两个值为缩放的origin

       // 样式属性，详见各shape，默认状态样式属性
       style  : {Object},

       // 样式属性，详见各shape，高亮样式属性，当不存在highlightStyle时使用默认样式扩展显示
       highlightStyle : {Object},

       // 交互属性，zrender支持，非图形类实现
       hoverable : {boolean},   // 默认为true，可悬浮响应，默认悬浮响应为高亮显示
                                // 可在onbrush中捕获并阻塞高亮绘画
       clickable : {boolean},   // 默认为false，可点击响应，影响鼠标hover时图标是否为可点击样式
                                // 为false则阻断点击事件抛出，为true可在onclick中捕获
       draggable : {boolean},   // 默认为false，可拖拽响应，默认拖拽响应改变图形位置，
                                // 可在ondrift中捕获并阻塞默认拖拽行为

       // 事件属性
       onbrush : {Function}, // 默认为null，当前图形被刷画时回调，可用于实现自定义绘画
                 // 回传参数为：
                 // @param {2D Context} context 当前canvas context
                 // @param {Object} shape 当前shape
                 // @param {boolean} isHighlight 是否高亮
                 // @return {boolean} 回调返回true则不执行默认绘画
       ondrift : {Function}, // 默认为null，当前图形被拖拽改变位置时回调，可用于限制拖拽范围
                 // 回传参数为：
                 // @param {Object} shape 当前shape
                 // @param {number} dx x方向变化
                 // @param {number} dy y方向变化
       onclick : {Function}, // 默认为null，当前图形点击响应，回传参数为：
                 // @param {Object} eventPacket 对象内容如下：
                 // @param {string} eventPacket.type 事件类型，EVENT.CLICK
                 // @param {event} eventPacket.event 原始dom事件对象
                 // @param {Object} eventPacket.target 当前图形shape对象
                 // @return {boolean} 回调返回true则阻止抛出全局事件

       onmousewheel : {Function}, // 默认为null，当前图形上鼠标滚轮触发，回传参数格式同onclick，其中：
                      // 事件类型为confit.EVENT.MOUSEWHEEL
                      // @return {boolean} 回调返回true则阻止抛出全局事件

       onmousemove : {Function}, // 默认为null，当前图上形鼠标（或手指）移动触发，回传参数格式同onclick，其中：
                     // 事件类型为confit.EVENT.MOUSEMOVE
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       onmouseover : {Function}, // 默认为null，鼠标（或手指）移动到当前图形上触发，回传参数格式同onclick：
                     // 事件类型为confit.EVENT.MOUSEOVER
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       onmouseout : {Function}, // 默认为null，鼠标（或手指）从当前图形移开，回传参数格式同onclick，其中：
                    // 事件类型为confit.EVENT.MOUSEOUT
                    // @return {boolean} 回调返回true则阻止抛出全局事件

       onmousedown : {Function}, // 默认为null，鼠标按钮（或手指）按下，回传参数格式同onclick，其中：
                     // 事件类型为confit.EVENT.MOUSEDOWN
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       onmouseup : {Function}, // 默认为null，鼠标按钮（或手指）松开，回传参数格式同onclick，其中：
                   // 事件类型为confit.EVENT.MOUSEUP
                   // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragstart : {Function}, // 默认为null，开始拖拽时触发，回传参数格式同onclick，其中：
                     // 事件类型为confit.EVENT.DRAGSTART
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragend : {Function}, // 默认为null，拖拽完毕时触发，回传参数格式同onclick，其中：
                   // 事件类型为confit.EVENT.DRAGEND
                   // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragenter : {Function}, // 默认为null，拖拽图形元素进入目标图形元素时触发
                     // 回传参数格式同onclick，其中：
                     // @param {string} eventPacket.type 事件类型，EVENT.DRAGENTER
                     // @param {Object} eventPacket.target 目标图形元素shape对象
                     // @param {Object} eventPacket.dragged 拖拽图形元素shape对象
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragover : {Function}, // 默认为null，拖拽图形元素在目标图形元素上移动时触发，
                    // 回传参数格式同onclick，其中：
                    // @param {string} eventPacket.type 事件类型，EVENT.DRAGOVER
                    // @param {Object} eventPacket.target 目标图形元素shape对象
                    // @param {Object} eventPacket.dragged 拖拽图形元素shape对象
                    // @return {boolean} 回调返回true则阻止抛出全局事件

       ondragleave : {Function}, // 默认为null，拖拽图形元素离开目标图形元素时触发，
                     // 回传参数格式同onclick，其中：
                     // @param {string} eventPacket.type 事件类型，EVENT.DRAGLEAVE
                     // @param {Object} eventPacket.target 目标图形元素shape对象
                     // @param {Object} eventPacket.dragged 拖拽图形元素shape对象
                     // @return {boolean} 回调返回true则阻止抛出全局事件

       ondrop : {Function}, // 默认为null，拖拽图形元素放在目标图形元素内时触发，
                // 回传参数格式同onclick，其中：
                // @param {string} eventPacket.type 事件类型，EVENT.DRAG
                // @param {Object} eventPacket.target 目标图形元素shape对象
                // @param {Object} eventPacket.dragged 拖拽图形元素shape对象
                // @return {boolean} 回调返回true则阻止抛出全局事件
   }
 */
define(
    'zrender/shape/base',['require','../tool/area','../tool/matrix','../tool/color'],function(require) {

        var self;
        var area = require('../tool/area');
        var matrix = require('../tool/matrix');

        /**
         * 派生实现通用功能
         * @param {Object} clazz 图形类
         */
        function derive(clazz) {
            var methods = [             // 派生实现的基类方法
                    'brush',
                    'setContext',
                    'dashedLineTo',
                    'drawText',
                    'getHighlightStyle',
                    'getHighlightZoom',
                    'drift',
                    'isCover',
                    'updateTransform'
                ];
            var len = methods.length;
            var proto = clazz.prototype;
            var i = 0;
            var method;

            for (; i < len; i++) {
                method = methods[i];
                if (!proto[method]) {
                    proto[method] = self[method];
                }
            }
        }

        /**
         * 画刷
         * @param ctx       画布句柄
         * @param e         形状实体
         * @param isHighlight   是否为高亮状态
         * @param updateCallback 需要异步加载资源的shape可以通过这个callback(e)
         *                       让painter更新视图，base.brush没用，需要的话重载brush
         */
        function brush(ctx, e, isHighlight) {
            var style = e.style || {};

            if (this.brushTypeOnly) {
                style.brushType = this.brushTypeOnly;
            }

            if (isHighlight) {
                // 根据style扩展默认高亮样式
                style = this.getHighlightStyle(
                    style,
                    e.highlightStyle || {},
                    this.brushTypeOnly
                );
            }

            if (this.brushTypeOnly == 'stroke') {
                style.strokeColor = style.strokeColor || style.color;
            }

            ctx.save();
            this.setContext(ctx, style);

            // 设置transform
            if (e.__needTransform) {
                ctx.transform.apply(ctx,this.updateTransform(e));
            }

            ctx.beginPath();
            this.buildPath(ctx, style);
            if (this.brushTypeOnly != 'stroke') {
                ctx.closePath();
            }

            switch (style.brushType) {
                case 'fill':
                    ctx.fill();
                    break;
                case 'stroke':
                    ctx.stroke();
                    break;
                case 'both':
                    ctx.stroke();
                    ctx.fill();
                    break;
                default:
                    ctx.fill();
            }

            if (style.text) {
                this.drawText(ctx, style, e.style);
            }

            ctx.restore();

            return;
        }

        /**
         * 画布通用设置
         * @param ctx       画布句柄
         * @param style     通用样式
         */
        function setContext(ctx, style) {
            // 简单判断不做严格类型检测
            if (style.color) {
                ctx.fillStyle = style.color;
            }

            if (style.strokeColor) {
                ctx.strokeStyle = style.strokeColor;
            }

            if (typeof style.opacity != 'undefined') {
                ctx.globalAlpha = style.opacity;
            }

            if (style.lineCap) {
                ctx.lineCap = style.lineCap;
            }

            if (style.lineJoin) {
                ctx.lineJoin = style.lineJoin;
            }

            if (style.miterLimit) {
                ctx.miterLimit = style.miterLimit;
            }

            if (typeof style.lineWidth != 'undefined') {
                ctx.lineWidth = style.lineWidth;
            }

            if (typeof style.shadowBlur != 'undefined') {
                ctx.shadowBlur = style.shadowBlur;
            }

            if (style.shadowColor) {
                ctx.shadowColor = style.shadowColor;
            }

            if (typeof style.shadowOffsetX != 'undefined') {
                ctx.shadowOffsetX = style.shadowOffsetX;
            }

            if (typeof style.shadowOffsetY != 'undefined') {
                ctx.shadowOffsetY = style.shadowOffsetY;
            }
        }
        
        /**
         * 虚线lineTo 
         */
        function dashedLineTo(ctx, x1, y1, x2, y2, dashLength) {
            dashLength = typeof dashLength == 'undefined'
                         ? 5 : dashLength;
            var deltaX = x2 - x1;
            var deltaY = y2 - y1;
            var numDashes = Math.floor(
                Math.sqrt(deltaX * deltaX + deltaY * deltaY) / dashLength
            );
            for (var i = 0; i < numDashes; ++i) {
                ctx[i % 2 === 0 ? 'moveTo' : 'lineTo'](
                    x1 + (deltaX / numDashes) * i,
                    y1 + (deltaY / numDashes) * i
                );
            }
        }
        
        /**
         * 附加文本
         * @param {Context2D} ctx Canvas 2D上下文
         * @param {Object} style 样式
         * @param {Object} normalStyle 默认样式，用于定位文字显示
         */
        function drawText(ctx, style, normalStyle) {
            // 字体颜色策略
            style.textColor= style.textColor
                            || style.color
                            || style.strokeColor;
            ctx.fillStyle = style.textColor;

            if (style.textPosition == 'inside') {
                ctx.shadowColor = 'rgba(0,0,0,0)';   // 内部文字不带shadowColor
            }

            // 文本与图形间空白间隙
            var dd = 10;
            var al;         // 文本水平对齐
            var bl;         // 文本垂直对齐
            var tx;         // 文本横坐标
            var ty;         // 文本纵坐标

            var textPosition = style.textPosition       // 用户定义
                               || this.textPosition     // shape默认
                               || 'top';                // 全局默认

            if ((textPosition == 'inside'
                || textPosition == 'top'
                || textPosition == 'bottom'
                || textPosition == 'left'
                || textPosition == 'right')
                && this.getRect // 矩形定位文字的图形必须提供getRect方法
            ) {
                var rect = (normalStyle || style).__rect
                           || this.getRect(normalStyle || style);
                switch (textPosition) {
                    case 'inside':
                        tx = rect.x + rect.width / 2;
                        ty = rect.y + rect.height / 2;
                        al = 'center';
                        bl = 'middle';
                        if (style.brushType != 'stroke'
                            && style.textColor == style.color
                        ) {
                            ctx.fillStyle = '#fff';
                        }
                        break;
                    case 'left':
                        tx = rect.x - dd;
                        ty = rect.y + rect.height / 2;
                        al = 'end';
                        bl = 'middle';
                        break;
                    case 'right':
                        tx = rect.x + rect.width + dd;
                        ty = rect.y + rect.height / 2;
                        al = 'start';
                        bl = 'middle';
                        break;
                    case 'top':
                        tx = rect.x + rect.width / 2;
                        ty = rect.y - dd;
                        al = 'center';
                        bl = 'bottom';
                        break;
                    case 'bottom':
                        tx = rect.x + rect.width / 2;
                        ty = rect.y + rect.height + dd;
                        al = 'center';
                        bl = 'top';
                        break;
                }
            }
            else if (textPosition == 'start' || textPosition == 'end') {
                var xStart;
                var xEnd;
                var yStart;
                var yEnd;
                if (typeof style.pointList != 'undefined') {
                    var pointList = style.pointList;
                    if (pointList.length < 2) {
                        // 少于2个点就不画了~
                        return;
                    }
                    var length = pointList.length;
                    switch (textPosition) {
                        case 'start':
                            xStart = pointList[0][0];
                            xEnd = pointList[1][0];
                            yStart = pointList[0][1];
                            yEnd = pointList[1][1];
                            break;
                        case 'end':
                            xStart = pointList[length - 2][0];
                            xEnd = pointList[length - 1][0];
                            yStart = pointList[length - 2][1];
                            yEnd = pointList[length - 1][1];
                            break;
                    }
                }
                else {
                    xStart = style.xStart || 0;
                    xEnd = style.xEnd || 0;
                    yStart = style.yStart || 0;
                    yEnd = style.yEnd || 0;
                }
                switch (textPosition) {
                    case 'start':
                        al = xStart < xEnd ? 'end' : 'start';
                        bl = yStart < yEnd ? 'bottom' : 'top';
                        tx = xStart;
                        ty = yStart;
                        break;
                    case 'end':
                        al = xStart < xEnd ? 'start' : 'end';
                        bl = yStart < yEnd ? 'top' : 'bottom';
                        tx = xEnd;
                        ty = yEnd;
                        break;
                }
                dd -= 4;
                if (xStart != xEnd) {
                    tx -= (al == 'end' ? dd : -dd);
                } else {
                    al = 'center';
                }
                if (yStart != yEnd) {
                    ty -= (bl == 'bottom' ? dd : -dd);
                } else {
                    bl = 'middle';
                }
            }
            else if (textPosition == 'specific') {
                tx = style.textX || 0;
                ty = style.textY || 0;
                al = 'start';
                bl = 'middle';
            }

            if (typeof tx != 'undefined' && typeof ty != 'undefined') {
                if (style.textFont) {
                    ctx.font = style.textFont;
                }
                ctx.textAlign = style.textAlign || al;
                ctx.textBaseline = style.textBaseLine || bl;

                ctx.fillText(style.text, tx, ty);
            }
        }

        /**
         * 根据默认样式扩展高亮样式
         * @param ctx Canvas 2D上下文
         * @param {Object} style 默认样式
         * @param {Object} highlightStyle 高亮样式
         */
        function getHighlightStyle(style, highlightStyle, brushTypeOnly) {
            var newStyle = {};
            for (var k in style) {
                newStyle[k] = style[k];
            }

            var color = require('../tool/color');
            var highlightColor = color.getHighlightColor();
            // 根据highlightStyle扩展
            if (style.brushType != 'stroke') {
                // 带填充则用高亮色加粗边线
                newStyle.strokeColor = highlightColor;
                newStyle.lineWidth = (style.lineWidth || 1)
                                      + this.getHighlightZoom();
                newStyle.brushType = 'both';
            }
            else {
                if (brushTypeOnly != 'stroke') {
                    // 描边型的则用原色加工高亮
                    newStyle.strokeColor = highlightColor;
                    newStyle.lineWidth = (style.lineWidth || 1)
                                          + this.getHighlightZoom();
                } else {
                    // 线型的则用原色加工高亮
                    newStyle.strokeColor = highlightStyle.strokeColor
                                           || color.mix(
                                                 style.strokeColor,
                                                 color.toRGB(highlightColor)
                                              );
                }
            }

            // 可自定义覆盖默认值
            for (var k in highlightStyle) {
                newStyle[k] = highlightStyle[k];
            }

            return newStyle;
        }

        /**
         * 高亮放大效果参数
         * 当前统一设置为6，如有需要差异设置，通过this.type判断实例类型
         */
        function getHighlightZoom() {
            return this.type != 'text' ? 6 : 2;
        }

        /**
         * 默认漂移
         * @param e 图形实体
         * @param dx 横坐标变化
         * @param dy 纵坐标变化
         */
        function drift(e, dx, dy) {
            e.position[0] += dx;
            e.position[1] += dy;
        }

        /**
         * 默认区域包含判断
         * @param e 图形实体
         * @param x 横坐标
         * @param y 纵坐标
         */
        function isCover(e, x, y) {
            //对鼠标的坐标也做相同的变换
            if(e.__needTransform && e._transform){
                var inverseMatrix = [];
                matrix.invert(inverseMatrix, e._transform);

                var originPos = [x, y];
                matrix.mulVector(originPos, inverseMatrix, [x, y, 1]);

                if (x == originPos[0] && y == originPos[1]) {
                    // 避免外部修改导致的__needTransform不准确
                    if (Math.abs(e.rotation[0]) > 0.0001
                        || Math.abs(e.position[0]) > 0.0001
                        || Math.abs(e.position[1]) > 0.0001
                        || Math.abs(e.scale[0] - 1) > 0.0001
                        || Math.abs(e.scale[1] - 1) > 0.0001
                    ) {
                        e.__needTransform = true;
                    } else {
                        e.__needTransform = false;
                    }
                }

                x = originPos[0];
                y = originPos[1];
            }

            // 快速预判并保留判断矩形
            var rect;
            if (e.style.__rect) {
                rect = e.style.__rect;
            }
            else {
                rect = this.getRect(e.style);
                e.style.__rect = rect;
            }
            if (x >= rect.x
                && x <= (rect.x + rect.width)
                && y >= rect.y
                && y <= (rect.y + rect.height)
            ) {
                // 矩形内
                return area.isInside(this, e.style, x, y);
            }
            else {
                return false;
            }

        }

        function updateTransform(e) {
            var _transform = e._transform || matrix.create();
            matrix.identity(_transform);
            if (e.scale && (e.scale[0] !== 1 || e.scale[1] !== 1)) {
                var originX = e.scale[2] || 0;
                var originY = e.scale[3] || 0;
                if (originX || originY ) {
                    matrix.translate(
                        _transform, _transform, [-originX, -originY]
                    );
                }
                matrix.scale(_transform, _transform, e.scale);
                if ( originX || originY ) {
                    matrix.translate(
                        _transform, _transform, [originX, originY]
                    );
                }
            }
            if (e.rotation) {
                if (e.rotation instanceof Array) {
                    if (e.rotation[0] !== 0) {
                        var originX = e.rotation[1] || 0,
                            originY = e.rotation[2] || 0;
                        if (originX || originY ) {
                            matrix.translate(
                                _transform, _transform, [-originX, -originY]
                            );
                        }
                        matrix.rotate(_transform, _transform, e.rotation[0]);
                        if (originX || originY ) {
                            matrix.translate(
                                _transform, _transform, [originX, originY]
                            );
                        }
                    }
                }else{
                    if (e.rotation !== 0) {
                        matrix.rotate(_transform, _transform, e.rotation);
                    }
                }
            }
            if (e.position && (e.position[0] !==0 || e.position[1] !== 0)) {
                matrix.translate(_transform, _transform, e.position);
            }
            // 保存这个变换矩阵
            e._transform = _transform;

            return _transform;
        }

        self = {
            derive : derive,
            brush : brush,
            setContext : setContext,
            dashedLineTo : dashedLineTo,
            drawText : drawText,
            getHighlightStyle : getHighlightStyle,
            getHighlightZoom : getHighlightZoom,
            drift : drift,
            isCover : isCover,

            updateTransform : updateTransform
        };

        return self;
    }
);
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：圆
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'circle',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，圆心横坐标
           y             : {number},  // 必须，圆心纵坐标
           r             : {number},  // 必须，圆半径
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'circle',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           r : 50,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/circle',['require','./base','../shape'],function(require) {
        function Circle() {
            this.type = 'circle';
        }

        Circle.prototype =  {
            /**
             * 创建圆形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                ctx.arc(style.x, style.y, style.r, 0, Math.PI * 2, true);
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Circle);
        
        var shape = require('../shape');
        shape.define('circle', new Circle());

        return Circle;
    }
);
/**
 * zrender
 *
 * author: loutongbing@baidu.com
 *
 * shape类：椭圆
 * Todo：excanvas bug ~ 连续scale保持?? IE8下不建议使用
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'ellipse',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，椭圆心横坐标
           y             : {number},  // 必须，椭圆心纵坐标
           a             : {number},  // 必须，椭圆横轴半径
           b             : {number},  // 必须，椭圆纵轴半径
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'ellipse',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           a : 100,
           b : 50,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/ellipse',['require','./base','../shape'],function(require) {
        function Ellipse() {
            this.type = 'ellipse';
        }

        Ellipse.prototype =  {
            /**
             * 创建圆形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var r = (style.a > style.b) ? style.a : style.b;
                var ratioX = style.a / r; //横轴缩放比率
                var ratioY = style.b / r;
                ctx.scale(ratioX, ratioY);
                ctx.arc(
                    style.x / ratioX, style.y / ratioY, r, 0, Math.PI * 2, true
                );
                ctx.scale(1/ratioX, 1/ratioY);
                // excanvas bug~~
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - style.a - lineWidth / 2),
                    y : Math.round(style.y - style.b - lineWidth / 2),
                    width : style.a * 2 + lineWidth,
                    height : style.b * 2 + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Ellipse);
        
        var shape = require('../shape');
        shape.define('ellipse', new Ellipse());

        return Ellipse;
    }
);
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：直线
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'line',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           xStart        : {number},  // 必须，起点横坐标
           yStart        : {number},  // 必须，起点纵坐标
           xEnd          : {number},  // 必须，终点横坐标
           yEnd          : {number},  // 必须，终点纵坐标
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba
           lineType      : {string},  // 默认为solid，线条类型，solid | dashed | dotted
           lineWidth     : {number},  // 默认为1，线条宽度
           lineCap       : {string},  // 默认为butt，线帽样式。butt | round | square

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为end，附加文本位置。
                                      // inside | start | end
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#000' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'line',
       id     : '123456',
       zlevel : 1,
       style  : {
           xStart : 100,
           yStart : 100,
           xEnd : 200,
           yEnd : 200,
           strokeColor : '#eee',
           lineWidth : 20,
           text : 'Baidu'
       },
       myName : 'kener',  //可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/line',['require','./base','../shape'],function(require) {
        function Line() {
            this.type = 'line';
            this.brushTypeOnly = 'stroke';  //线条只能描边，填充后果自负
            this.textPosition = 'end';
        }

        Line.prototype =  {
            /**
             * 创建线条路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                if (!style.lineType || style.lineType == 'solid') {
                    //默认为实线
                    ctx.moveTo(style.xStart, style.yStart);
                    ctx.lineTo(style.xEnd, style.yEnd);
                }
                else if (style.lineType == 'dashed'
                        || style.lineType == 'dotted'
                ) {
                    var dashLength =(style.lineWidth || 1)  
                                     * (style.lineType == 'dashed' ? 5 : 1);
                    this.dashedLineTo(
                        ctx,
                        style.xStart, style.yStart,
                        style.xEnd, style.yEnd,
                        dashLength
                    );
                }
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth = style.lineWidth || 1;
                return {
                    x : Math.min(style.xStart, style.xEnd) - lineWidth,
                    y : Math.min(style.yStart, style.yEnd) - lineWidth,
                    width : Math.abs(style.xStart - style.xEnd)
                            + lineWidth,
                    height : Math.abs(style.yStart - style.yEnd)
                             + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Line);
        
        var shape = require('../shape');
        shape.define('line', new Line());

        return Line;
    }
);
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：多边形
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'polygon',      // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           pointList     : {Array},   // 必须，多边形各个顶角坐标
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'polygon',
       id     : '123456',
       zlevel : 1,
       style  : {
           pointList : [[10, 10], [300, 20], [298, 400], [50, 450]]
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/polygon',['require','./base','../shape'],function(require) {
        function Polygon() {
            this.type = 'polygon';
        }

        Polygon.prototype = {
            /**
             * 画刷
             * @param ctx       画布句柄
             * @param e         形状实体
             * @param isHighlight   是否为高亮状态
             * @param updateCallback 需要异步加载资源的shape可以通过这个callback(e)
             *                       让painter更新视图，base.brush没用，需要的话重载brush
             */
            brush : function (ctx, e, isHighlight) {
                var style = e.style || {};
                if (isHighlight) {
                    // 根据style扩展默认高亮样式
                    style = this.getHighlightStyle(
                        style,
                        e.highlightStyle || {}
                    );
                }

                ctx.save();
                this.setContext(ctx, style);
    
                // 设置transform
                if (e.__needTransform) {
                    ctx.transform.apply(ctx,this.updateTransform(e));
                }
                ctx.beginPath();
                this.buildPath(ctx, style);
                ctx.closePath();

                if (style.brushType == 'stroke' || style.brushType == 'both') {
                    ctx.stroke();
                }
                
                if (style.brushType == 'fill' 
                    || style.brushType == 'both'
                    || typeof style.brushType == 'undefined' // 默认为fill
                ) {
                    if (style.lineType == 'dashed' 
                        || style.lineType == 'dotted'
                    ) {
                        // 特殊处理，虚线围不成path，实线再build一次
                        ctx.beginPath();
                        this.buildPath(
                            ctx, 
                            {
                                lineType: 'solid',
                                lineWidth: style.lineWidth,
                                pointList: style.pointList
                            }
                        );
                        ctx.closePath();
                    }
                    ctx.fill();
                }
    
                if (style.text) {
                    this.drawText(ctx, style, e.style);
                }
    
                ctx.restore();
    
                return;
            },
        
            /**
             * 创建多边形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                // 虽然能重用brokenLine，但底层图形基于性能考虑，重复代码减少调用吧
                var pointList = style.pointList;
                if (pointList.length < 2) {
                    // 少于2个点就不画了~
                    return;
                }
                if (!style.lineType || style.lineType == 'solid') {
                    //默认为实线
                    ctx.moveTo(pointList[0][0],pointList[0][1]);
                    for (var i = 1, l = pointList.length; i < l; i++) {
                        ctx.lineTo(pointList[i][0],pointList[i][1]);
                    }
                    ctx.lineTo(pointList[0][0], pointList[0][1]);
                }
                else if (style.lineType == 'dashed'
                        || style.lineType == 'dotted'
                ) {
                    var dashLength = style._dashLength
                                     || (style.lineWidth || 1) 
                                        * (style.lineType == 'dashed' ? 5 : 1);
                    style._dashLength = dashLength;
                    ctx.moveTo(pointList[0][0],pointList[0][1]);
                    for (var i = 1, l = pointList.length; i < l; i++) {
                        this.dashedLineTo(
                            ctx,
                            pointList[i - 1][0], pointList[i - 1][1],
                            pointList[i][0], pointList[i][1],
                            dashLength
                        );
                    }
                    this.dashedLineTo(
                        ctx,
                        pointList[pointList.length - 1][0], 
                        pointList[pointList.length - 1][1],
                        pointList[0][0],
                        pointList[0][1],
                        dashLength
                    );
                }

                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var minX =  Number.MAX_VALUE;
                var maxX =  Number.MIN_VALUE;
                var minY = Number.MAX_VALUE;
                var maxY = Number.MIN_VALUE;

                var pointList = style.pointList;
                for(var i = 0, l = pointList.length; i < l; i++) {
                    if (pointList[i][0] < minX) {
                        minX = pointList[i][0];
                    }
                    if (pointList[i][0] > maxX) {
                        maxX = pointList[i][0];
                    }
                    if (pointList[i][1] < minY) {
                        minY = pointList[i][1];
                    }
                    if (pointList[i][1] > maxY) {
                        maxY = pointList[i][1];
                    }
                }

                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(minX - lineWidth / 2),
                    y : Math.round(minY - lineWidth / 2),
                    width : maxX - minX + lineWidth,
                    height : maxY - minY + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Polygon);
        
        var shape = require('../shape');
        shape.define('polygon', new Polygon());

        return Polygon;
    }
);
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：折线
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'brokenLine',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           pointList     : {Array},   // 必须，各个顶角坐标
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba
           lineType      : {string},  // 默认为solid，线条类型，solid | dashed | dotted
           lineWidth     : {number},  // 默认为1，线条宽度
           lineCap       : {string},  // 默认为butt，线帽样式。butt | round | square
           lineJoin      : {string},  // 默认为miter，线段连接样式。miter | round | bevel
           miterLimit    : {number},  // 默认为10，最大斜接长度，仅当lineJoin为miter时生效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为end，附加文本位置。
                                      // start | end
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#000' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'brokenLine',
       id     : '123456',
       zlevel : 1,
       style  : {
           pointList : [[10, 10], [300, 20], [298, 400], [50, 450]],
           strokeColor : '#eee',
           lineWidth : 20,
           text : 'Baidu'
       },
       myName : 'kener',  //可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/brokenLine',['require','../shape','./base','../shape'],function(require) {
        function BrokenLine() {
            this.type = 'brokenLine';
            this.brushTypeOnly = 'stroke';  //线条只能描边，填充后果自负
            this.textPosition = 'end';
        }

        BrokenLine.prototype =  {
            /**
             * 创建多边形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var pointList = style.pointList;
                if (pointList.length < 2) {
                    // 少于2个点就不画了~
                    return;
                }
                if (!style.lineType || style.lineType == 'solid') {
                    //默认为实线
                    ctx.moveTo(pointList[0][0],pointList[0][1]);
                    for (var i = 1, l = pointList.length; i < l; i++) {
                        ctx.lineTo(pointList[i][0],pointList[i][1]);
                    }
                }
                else if (style.lineType == 'dashed'
                        || style.lineType == 'dotted'
                ) {
                    var dashLength = (style.lineWidth || 1) 
                                     * (style.lineType == 'dashed' ? 5 : 1);
                    ctx.moveTo(pointList[0][0],pointList[0][1]);
                    for (var i = 1, l = pointList.length; i < l; i++) {
                        this.dashedLineTo(
                            ctx,
                            pointList[i - 1][0], pointList[i - 1][1],
                            pointList[i][0], pointList[i][1],
                            dashLength
                        );
                    }
                }

                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var shape = require('../shape');
                return shape.get('polygon').getRect(style);
            }
        };

        var base = require('./base');
        base.derive(BrokenLine);
        
        var shape = require('../shape');
        shape.define('brokenLine', new BrokenLine());

        return BrokenLine;
    }
);
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com) , 
 *         strwind (@劲风FEI, yaofeifei@baidu.com)
 *
 * shape类：矩形
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'rectangle',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，左上角横坐标
           y             : {number},  // 必须，左上角纵坐标
           width         : {number},  // 必须，宽度
           height        : {number},  // 必须，高度
           radius        : {array},   // 默认为[0]，圆角 
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'rectangle',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           width : 150,
           height : 50,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/rectangle',['require','./base','../shape'],function(require) {
        function Rectangle() {
            this.type = 'rectangle';
        }

        Rectangle.prototype =  {
            /**
             * 绘制圆角矩形
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            _buildRadiusPath: function(ctx, style) {
                //左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
                //r缩写为1         相当于 [1, 1, 1, 1]
                //r缩写为[1]       相当于 [1, 1, 1, 1]
                //r缩写为[1, 2]    相当于 [1, 2, 1, 2]
                //r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
                var x = style.x;
                var y = style.y;
                var width = style.width;
                var height = style.height;
                var r = style.radius;
                var r1; 
                var r2; 
                var r3; 
                var r4;
                  
                if(typeof r === 'number') {
                    r1 = r2 = r3 = r4 = r;
                }
                else if(r instanceof Array) {
                    if (r.length === 1) {
                        r1 = r2 = r3 = r4 = r[0];
                    }
                    else if(r.length === 2) {
                        r1 = r3 = r[0];
                        r2 = r4 = r[1];
                    }
                    else if(r.length === 3) {
                        r1 = r[0];
                        r2 = r4 = r[1];
                        r3 = r[2];
                    } else {
                        r1 = r[0];
                        r2 = r[1];
                        r3 = r[2];
                        r4 = r[3];
                    }
                } else {
                    r1 = r2 = r3 = r4 = 0;
                }
                ctx.moveTo(x + r1, y);
                ctx.lineTo(x + width - r2, y);
                r2 !== 0 && ctx.quadraticCurveTo(
                    x + width, y, x + width, y + r2
                );
                ctx.lineTo(x + width, y + height - r3);
                r3 !== 0 && ctx.quadraticCurveTo(
                    x + width, y + height, x + width - r3, y + height
                );
                ctx.lineTo(x + r4, y + height);
                r4 !== 0 && ctx.quadraticCurveTo(
                    x, y + height, x, y + height - r4
                );
                ctx.lineTo(x, y + r1);
                r1 !== 0 && ctx.quadraticCurveTo(x, y, x + r1, y);
            },
            
            /**
             * 创建矩形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                if(!style.radius) {
                    ctx.moveTo(style.x, style.y);
                    ctx.lineTo(style.x + style.width, style.y);
                    ctx.lineTo(style.x + style.width, style.y + style.height);
                    ctx.lineTo(style.x, style.y + style.height);
                    ctx.lineTo(style.x, style.y);
                    //ctx.rect(style.x, style.y, style.width, style.height);
                } else {
                    this._buildRadiusPath(ctx, style);
                }
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - lineWidth / 2),
                    y : Math.round(style.y - lineWidth / 2),
                    width : style.width + lineWidth,
                    height : style.height + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Rectangle);
        
        var shape = require('../shape');
        shape.define('rectangle', new Rectangle());

        return Rectangle;
    }
);
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：圆环
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'ring',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，圆心横坐标
           y             : {number},  // 必须，圆心纵坐标
           r0            : {number},  // 必须，内圆半径
           r             : {number},  // 必须，外圆半径
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为outside，附加文本位置。
                                      // outside | inside
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'ring',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           r : 50,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/ring',['require','./base','../shape'],function(require) {
        function Ring() {
            this.type = 'ring';
        }

        Ring.prototype = {
            /**
             * 创建圆环路径，依赖扇形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                // 非零环绕填充优化
                ctx.arc(style.x, style.y, style.r, 0, Math.PI * 2, false);
                ctx.moveTo(style.x + style.r0, style.y);
                ctx.arc(style.x, style.y, style.r0, 0, Math.PI * 2, true);
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Ring);
        
        var shape = require('../shape');
        shape.define('ring', new Ring());

        return Ring;
    }
);
/**
 * zrender: 数学辅助类
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * sin：正弦函数，自动缓存
 * cos：余弦函数，自动缓存
 * degreeToRadian：角度转弧度
 * radianToDegree：弧度转角度
 */
define(
    'zrender/tool/math',[],function() {
        var _cache = {
            sin : {},     //sin缓存
            cos : {}      //cos缓存
        };
        var _radians = Math.PI / 180;

        /**
         * @param angle 弧度（角度）参数
         * @param isDegrees angle参数是否为角度计算，默认为false，angle为以弧度计量的角度
         */
        function sin(angle, isDegrees) {
            angle = (isDegrees ? angle * _radians : angle).toFixed(4);
            if(typeof _cache.sin[angle] == 'undefined') {
                _cache.sin[angle] = Math.sin(angle);
            }
            return _cache.sin[angle];
        }

        /**
         * @param radians 弧度参数
         */
        function cos(angle, isDegrees) {
            angle = (isDegrees ? angle * _radians : angle).toFixed(4);
            if(typeof _cache.cos[angle] == 'undefined') {
                _cache.cos[angle] = Math.cos(angle);
            }
            return _cache.cos[angle];
        }

        /**
         * 角度转弧度
         * @param {Object} angle
         */
        function degreeToRadian(angle) {
            return angle * _radians;
        }

        /**
         * 弧度转角度
         * @param {Object} angle
         */
        function radianToDegree(angle) {
            return angle / _radians;
        }

        return {
            sin : sin,
            cos : cos,
            degreeToRadian : degreeToRadian,
            radianToDegree : radianToDegree
        };
    }
);
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：扇形
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'sector',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，圆心横坐标
           y             : {number},  // 必须，圆心纵坐标
           r0            : {number},  // 默认为0，内圆半径，指定后将出现内弧，同时扇边长度 = r - r0
           r             : {number},  // 必须，外圆半径
           startAngle    : {number},  // 必须，起始角度[0, 360)
           endAngle      : {number},  // 必须，结束角度(0, 360]
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为outside，附加文本位置。
                                      // outside | inside
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'sector',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           r : 50,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/sector',['require','../tool/math','../shape','./base','../shape'],function(require) {
        var math = require('../tool/math');

        function Sector() {
            this.type = 'sector';
        }

        Sector.prototype = {
            /**
             * 创建扇形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var x = style.x;   // 圆心x
                var y = style.y;   // 圆心y
                var r0 = typeof style.r0 == 'undefined'     // 形内半径[0,r)
                         ? 0 : style.r0;
                var r = style.r;                            // 扇形外半径(0,r]
                var startAngle = style.startAngle;          // 起始角度[0,360)
                var endAngle = style.endAngle;              // 结束角度(0,360]
                var PI2 = Math.PI * 2;

                startAngle = math.degreeToRadian(startAngle);
                endAngle = math.degreeToRadian(endAngle);

                //sin&cos已经在tool.math中缓存了，放心大胆的重复调用
                ctx.moveTo(
                    math.cos(startAngle) * r0 + x,
                    y - math.sin(startAngle) * r0
                );

                ctx.lineTo(
                    math.cos(startAngle) * r + x,
                    y - math.sin(startAngle) * r
                );

                ctx.arc(x, y, r, PI2 - startAngle, PI2 - endAngle, true);

                ctx.lineTo(
                    math.cos(endAngle) * r0 + x,
                    y - math.sin(endAngle) * r0
                );

                if (r0 !== 0) {
                    ctx.arc(x, y, r0, PI2 - endAngle, PI2 - startAngle, false);
                }

                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var x = style.x;   // 圆心x
                var y = style.y;   // 圆心y
                var r0 = typeof style.r0 == 'undefined'     // 形内半径[0,r)
                         ? 0 : style.r0;
                var r = style.r;                            // 扇形外半径(0,r]
                var startAngle = style.startAngle;          // 起始角度[0,360)
                var endAngle = style.endAngle;              // 结束角度(0,360]
                var pointList = [];
                if (startAngle < 90 && endAngle > 90) {
                    pointList.push([
                        x, y - r
                    ]);
                }
                if (startAngle < 180 && endAngle > 180) {
                    pointList.push([
                        x - r, y
                    ]);
                }
                if (startAngle < 270 && endAngle > 270) {
                    pointList.push([
                        x, y + r
                    ]);
                }
                if (startAngle < 360 && endAngle > 360) {
                    pointList.push([
                        x + r, y
                    ]);
                }

                startAngle = math.degreeToRadian(startAngle);
                endAngle = math.degreeToRadian(endAngle);


                pointList.push([
                    math.cos(startAngle) * r0 + x,
                    y - math.sin(startAngle) * r0
                ]);

                pointList.push([
                    math.cos(startAngle) * r + x,
                    y - math.sin(startAngle) * r
                ]);

                pointList.push([
                    math.cos(endAngle) * r + x,
                    y - math.sin(endAngle) * r
                ]);

                pointList.push([
                    math.cos(endAngle) * r0 + x,
                    y - math.sin(endAngle) * r0
                ]);

                var shape = require('../shape');
                return shape.get('polygon').getRect({
                    brushType : style.brushType,
                    lineWidth : style.lineWidth,
                    pointList : pointList
                });
            }
        };

        var base = require('./base');
        base.derive(Sector);
        
        var shape = require('../shape');
        shape.define('sector', new Sector());

        return Sector;
    }
);
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：文字
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'text',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，横坐标
           y             : {number},  // 必须，纵坐标
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 必须，文本内容
           textFont      : {string},  // 默认为null，文本文字样式，eg:'bold 18px verdana'
           textAlign     : {string},  // 默认为start，文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认为middle，文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           maxWidth      : {number}   // 默认为null，最大宽度
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'text',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           color : 'red',
           text : 'Baidu'
       },
       myName : 'kener',  //可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/text',['require','../tool/area','./base','../shape'],function(require) {
        function Text() {
            this.type = 'text';
        }

        Text.prototype =  {
            /**
             * 画刷，重载基类方法
             * @param {Context2D} ctx Canvas 2D上下文
             * @param e 图形形状实体
             * @param isHighlight 是否为高亮状态
             */
            brush : function(ctx, e, isHighlight) {
                var style = e.style || {};
                if (isHighlight) {
                    // 根据style扩展默认高亮样式
                    style = this.getHighlightStyle(
                        style, e.highlightStyle || {}
                    );
                }

                ctx.save();
                this.setContext(ctx, style);

                // 设置transform
                if (e.__needTransform) {
                    ctx.transform.apply(ctx,this.updateTransform(e));
                }

                if (style.textFont) {
                    ctx.font = style.textFont;
                }
                ctx.textAlign = style.textAlign || 'start';
                ctx.textBaseline = style.textBaseline || 'middle';

                if (style.maxWidth) {
                    switch (style.brushType) {
                        case 'fill':
                            ctx.fillText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                            break;
                        case 'stroke':
                            ctx.strokeText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                            break;
                        case 'both':
                            ctx.strokeText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                            ctx.fillText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                            break;
                        default:
                            ctx.fillText(
                                style.text,
                                style.x, style.y, style.maxWidth
                            );
                    }
                }
                else{
                    switch (style.brushType) {
                        case 'fill':
                            ctx.fillText(style.text, style.x, style.y);
                            break;
                        case 'stroke':
                            ctx.strokeText(style.text, style.x, style.y);
                            break;
                        case 'both':
                            ctx.strokeText(style.text, style.x, style.y);
                            ctx.fillText(style.text, style.x, style.y);
                            break;
                        default:
                            ctx.fillText(style.text, style.x, style.y);
                    }
                }

                ctx.restore();
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var area = require('../tool/area');

                var width =  area.getTextWidth(style.text, style.textFont);
                var height = area.getTextWidth('国', style.textFont); //比较粗暴

                var textX = style.x;                 //默认start == left
                if (style.textAlign == 'end' || style.textAlign == 'right') {
                    textX -= width;
                }
                else if (style.textAlign == 'center') {
                    textX -= (width / 2);
                }

                var textY = style.y - height / 2;    //默认middle
                if (style.textBaseline == 'top') {
                    textY += height / 2;
                }
                else if (style.textBaseline == 'bottom') {
                    textX -= height / 2;
                }

                return {
                    x : textX,
                    y : textY,
                    width : width,
                    height : height
                };
            }
        };

        var base = require('./base');
        base.derive(Text);
        
        var shape = require('../shape');
        shape.define('text', new Text());

        return Text;
    }
);

/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：心形
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'heart',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，心形内部尖端横坐标
           y             : {number},  // 必须，心形内部尖端纵坐标
           a             : {number},  // 必须，心形横宽（中轴线到水平边缘最宽处距离）
           b             : {number},  // 必须，心形纵高（内尖到外尖距离）
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为outside，附加文本位置。
                                      // outside | inside
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'heart',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           a : 50,
           b : 80,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/heart',['require','./base','../shape'],function(require) {
        function Heart() {
            this.type = 'heart';
        }

        Heart.prototype = {
            /**
             * 创建扇形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                ctx.moveTo(style.x, style.y);
                ctx.bezierCurveTo(
                    style.x + style.a / 2,
                    style.y - style.b * 2 / 3,
                    style.x + style.a * 2,
                    style.y + style.b / 3,
                    style.x,
                    style.y + style.b
                );
                ctx.bezierCurveTo(
                    style.x - style.a *  2,
                    style.y + style.b / 3,
                    style.x - style.a / 2,
                    style.y - style.b * 2 / 3,
                    style.x,
                    style.y
                );
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - style.a - lineWidth / 2),
                    y : Math.round(style.y - style.b / 4 - lineWidth / 2),
                    width : style.a * 2 + lineWidth,
                    height : style.b * 5 / 4 + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Heart);
        
        var shape = require('../shape');
        shape.define('heart', new Heart());

        return Heart;
    }
);
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：水滴
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'heart',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，水滴中心横坐标
           y             : {number},  // 必须，水滴中心纵坐标
           a             : {number},  // 必须，水滴横宽（中心到水平边缘最宽处距离）
           b             : {number},  // 必须，水滴纵高（中心到尖端距离）
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为outside，附加文本位置。
                                      // outside | inside
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'droplet',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           a : 50,
           b : 80,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/droplet',['require','./base','../shape'],function(require) {
        function Droplet() {
            this.type = 'droplet';
        }

        Droplet.prototype = {
            /**
             * 创建扇形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                ctx.moveTo(style.x, style.y + style.a);
                ctx.bezierCurveTo(
                    style.x + style.a,
                    style.y + style.a,
                    style.x + style.a * 3 / 2,
                    style.y - style.a / 3,
                    style.x,
                    style.y - style.b
                );
                ctx.bezierCurveTo(
                    style.x - style.a * 3 / 2,
                    style.y - style.a / 3,
                    style.x - style.a,
                    style.y + style.a,
                    style.x,
                    style.y + style.a
                );
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - style.a - lineWidth / 2),
                    y : Math.round(style.y - style.b - lineWidth / 2),
                    width : style.a * 2 + lineWidth,
                    height : style.a + style.b + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Droplet);
        
        var shape = require('../shape');
        shape.define('droplet', new Droplet());

        return Droplet;
    }
);
/**
 * zrender
 *
 * author: CrossDo (chenhuaimu@baidu.com)
 *
 * shape类：路径
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'path',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           path          : {string},// 必须，路径。例如:M 0 0 L 0 10 L 10 10 Z (一个三角形)
                                    //M = moveto
                                    //L = lineto
                                    //H = horizontal lineto
                                    //V = vertical lineto
                                    //C = curveto
                                    //S = smooth curveto
                                    //Q = quadratic Belzier curve
                                    //T = smooth quadratic Belzier curveto
                                    //Z = closepath


           x             : {number},  // 必须，x轴坐标
           y             : {number},  // 必须，y轴坐标


           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }

 **/

define('zrender/shape/path',['require','./base','../shape'],function(require) {
    function Path() {
        this.type = 'path';
    }

    Path.prototype = {
        _parsePathData : function(data) {
            if (!data) {
                return [];
            }

            // command string
            var cs = data;

            // command chars
            var cc = [
                'm', 'M', 'l', 'L', 'v', 'V', 'h', 'H', 'z', 'Z',
                'c', 'C', 'q', 'Q', 't', 'T', 's', 'S', 'a', 'A'
            ];
            cs = cs.replace(/  /g, ' ');
            cs = cs.replace(/ /g, ',');
            cs = cs.replace(/,,/g, ',');
            var n;
            // create pipes so that we can split the data
            for (n = 0; n < cc.length; n++) {
                cs = cs.replace(new RegExp(cc[n], 'g'), '|' + cc[n]);
            }
            // create array
            var arr = cs.split('|');
            var ca = [];
            // init context point
            var cpx = 0;
            var cpy = 0;
            for (n = 1; n < arr.length; n++) {
                var str = arr[n];
                var c = str.charAt(0);
                str = str.slice(1);
                str = str.replace(new RegExp('e,-', 'g'), 'e-');

                var p = str.split(',');
                if (p.length > 0 && p[0] === '') {
                    p.shift();
                }

                for (var i = 0; i < p.length; i++) {
                    p[i] = parseFloat(p[i]);
                }
                while (p.length > 0) {
                    if (isNaN(p[0])) {
                        break;
                    }
                    var cmd = null;
                    var points = [];

                    var ctlPtx;
                    var ctlPty;
                    var prevCmd;

                    var rx;
                    var ry;
                    var psi;
                    var fa;
                    var fs;

                    var x1 = cpx;
                    var y1 = cpy;

                    // convert l, H, h, V, and v to L
                    switch (c) {
                    case 'l':
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'L':
                        cpx = p.shift();
                        cpy = p.shift();
                        points.push(cpx, cpy);
                        break;
                    case 'm':
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'M';
                        points.push(cpx, cpy);
                        c = 'l';
                        break;
                    case 'M':
                        cpx = p.shift();
                        cpy = p.shift();
                        cmd = 'M';
                        points.push(cpx, cpy);
                        c = 'L';
                        break;

                    case 'h':
                        cpx += p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'H':
                        cpx = p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'v':
                        cpy += p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'V':
                        cpy = p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'C':
                        points.push(p.shift(), p.shift(), p.shift(), p.shift());
                        cpx = p.shift();
                        cpy = p.shift();
                        points.push(cpx, cpy);
                        break;
                    case 'c':
                        points.push(
                            cpx + p.shift(), cpy + p.shift(),
                            cpx + p.shift(), cpy + p.shift()
                        );
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'C';
                        points.push(cpx, cpy);
                        break;
                    case 'S':
                        ctlPtx = cpx;
                        ctlPty = cpy;
                        prevCmd = ca[ca.length - 1];
                        if (prevCmd.command === 'C') {
                            ctlPtx = cpx + (cpx - prevCmd.points[2]);
                            ctlPty = cpy + (cpy - prevCmd.points[3]);
                        }
                        points.push(ctlPtx, ctlPty, p.shift(), p.shift());
                        cpx = p.shift();
                        cpy = p.shift();
                        cmd = 'C';
                        points.push(cpx, cpy);
                        break;
                    case 's':
                        ctlPtx = cpx, ctlPty = cpy;
                        prevCmd = ca[ca.length - 1];
                        if (prevCmd.command === 'C') {
                            ctlPtx = cpx + (cpx - prevCmd.points[2]);
                            ctlPty = cpy + (cpy - prevCmd.points[3]);
                        }
                        points.push(
                            ctlPtx, ctlPty,
                            cpx + p.shift(), cpy + p.shift()
                        );
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'C';
                        points.push(cpx, cpy);
                        break;
                    case 'Q':
                        points.push(p.shift(), p.shift());
                        cpx = p.shift();
                        cpy = p.shift();
                        points.push(cpx, cpy);
                        break;
                    case 'q':
                        points.push(cpx + p.shift(), cpy + p.shift());
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'Q';
                        points.push(cpx, cpy);
                        break;
                    case 'T':
                        ctlPtx = cpx, ctlPty = cpy;
                        prevCmd = ca[ca.length - 1];
                        if (prevCmd.command === 'Q') {
                            ctlPtx = cpx + (cpx - prevCmd.points[0]);
                            ctlPty = cpy + (cpy - prevCmd.points[1]);
                        }
                        cpx = p.shift();
                        cpy = p.shift();
                        cmd = 'Q';
                        points.push(ctlPtx, ctlPty, cpx, cpy);
                        break;
                    case 't':
                        ctlPtx = cpx, ctlPty = cpy;
                        prevCmd = ca[ca.length - 1];
                        if (prevCmd.command === 'Q') {
                            ctlPtx = cpx + (cpx - prevCmd.points[0]);
                            ctlPty = cpy + (cpy - prevCmd.points[1]);
                        }
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'Q';
                        points.push(ctlPtx, ctlPty, cpx, cpy);
                        break;
                    case 'A':
                        rx = p.shift();
                        ry = p.shift();
                        psi = p.shift();
                        fa = p.shift();
                        fs = p.shift();

                        x1 = cpx, y1 = cpy;
                        cpx = p.shift(), cpy = p.shift();
                        cmd = 'A';
                        points = this._convertPoint(
                            x1, y1, cpx, cpy, fa, fs, rx, ry, psi
                        );
                        break;
                    case 'a':
                        rx = p.shift();
                        ry = p.shift();
                        psi = p.shift();
                        fa = p.shift();
                        fs = p.shift();

                        x1 = cpx, y1 = cpy;
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'A';
                        points = this._convertPoint(
                            x1, y1, cpx, cpy, fa, fs, rx, ry, psi
                        );
                        break;

                    }

                    ca.push({
                        command : cmd || c,
                        points : points
                    });
                }

                if (c === 'z' || c === 'Z') {
                    ca.push({
                        command : 'z',
                        points : []
                    });
                }
            }

            return ca;

        },

        _convertPoint : function(x1, y1, x2, y2, fa, fs, rx, ry, psiDeg) {
            var psi = psiDeg * (Math.PI / 180.0);
            var xp = Math.cos(psi) * (x1 - x2) / 2.0
                     + Math.sin(psi) * (y1 - y2) / 2.0;
            var yp = -1 * Math.sin(psi) * (x1 - x2) / 2.0
                     + Math.cos(psi) * (y1 - y2) / 2.0;

            var lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);

            if (lambda > 1) {
                rx *= Math.sqrt(lambda);
                ry *= Math.sqrt(lambda);
            }

            var f = Math.sqrt((((rx * rx) * (ry * ry))
                    - ((rx * rx) * (yp * yp))
                    - ((ry * ry) * (xp * xp))) / ((rx * rx) * (yp * yp)
                    + (ry * ry) * (xp * xp))
                );

            if (fa === fs) {
                f *= -1;
            }
            if (isNaN(f)) {
                f = 0;
            }

            var cxp = f * rx * yp / ry;
            var cyp = f * -ry * xp / rx;

            var cx = (x1 + x2) / 2.0
                     + Math.cos(psi) * cxp
                     - Math.sin(psi) * cyp;
            var cy = (y1 + y2) / 2.0
                    + Math.sin(psi) * cxp
                    + Math.cos(psi) * cyp;

            var vMag = function(v) {
                return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
            };
            var vRatio = function(u, v) {
                return (u[0] * v[0] + u[1] * v[1]) / (vMag(u) * vMag(v));
            };
            var vAngle = function(u, v) {
                return (u[0] * v[1] < u[1] * v[0] ? -1 : 1)
                        * Math.acos(vRatio(u, v));
            };
            var theta = vAngle([ 1, 0 ], [ (xp - cxp) / rx, (yp - cyp) / ry ]);
            var u = [ (xp - cxp) / rx, (yp - cyp) / ry ];
            var v = [ (-1 * xp - cxp) / rx, (-1 * yp - cyp) / ry ];
            var dTheta = vAngle(u, v);

            if (vRatio(u, v) <= -1) {
                dTheta = Math.PI;
            }
            if (vRatio(u, v) >= 1) {
                dTheta = 0;
            }
            if (fs === 0 && dTheta > 0) {
                dTheta = dTheta - 2 * Math.PI;
            }
            if (fs === 1 && dTheta < 0) {
                dTheta = dTheta + 2 * Math.PI;
            }
            return [ cx, cy, rx, ry, theta, dTheta, psi, fs ];
        },

        /**
         * 创建路径
         * @param {Context2D} ctx Canvas 2D上下文
         * @param {Object} style 样式
         */
        buildPath : function(ctx, style) {
            var path = style.path;

            var pathArray = this._parsePathData(path);

            // 平移坐标
            var x = style.x || 0;
            var y = style.y || 0;

            var p;
            // 记录边界点，用于判断inside
            var pointList = style.pointList = [];
            var singlePointList = [];
            for (var i = 0, l = pathArray.length; i < l; i++) {
                if (pathArray[i].command.toUpperCase() == 'M') {
                    singlePointList.length > 0 
                    && pointList.push(singlePointList);
                    singlePointList = [];
                }
                p = pathArray[i].points;
                for (var j = 0, k = p.length; j < k; j += 2) {
                    singlePointList.push([p[j] + x, p[j+1] + y]);
                }
            }
            singlePointList.length > 0 && pointList.push(singlePointList);
            
            var c;
            for (var i = 0, l = pathArray.length; i < l; i++) {
                c = pathArray[i].command;
                p = pathArray[i].points;
                // 平移变换
                for (var j = 0, k = p.length; j < k; j++) {
                    if (j % 2 === 0) {
                        p[j] += x;
                    } else {
                        p[j] += y;
                    }
                }
                switch (c) {
                    case 'L':
                        ctx.lineTo(p[0], p[1]);
                        break;
                    case 'M':
                        ctx.moveTo(p[0], p[1]);
                        break;
                    case 'C':
                        ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
                        break;
                    case 'Q':
                        ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
                        break;
                    case 'A':
                        var cx = p[0];
                        var cy = p[1];
                        var rx = p[2];
                        var ry = p[3];
                        var theta = p[4];
                        var dTheta = p[5];
                        var psi = p[6];
                        var fs = p[7];
                        var r = (rx > ry) ? rx : ry;
                        var scaleX = (rx > ry) ? 1 : rx / ry;
                        var scaleY = (rx > ry) ? ry / rx : 1;

                        ctx.translate(cx, cy);
                        ctx.rotate(psi);
                        ctx.scale(scaleX, scaleY);
                        ctx.arc(0, 0, r, theta, theta + dTheta, 1 - fs);
                        ctx.scale(1 / scaleX, 1 / scaleY);
                        ctx.rotate(-psi);
                        ctx.translate(-cx, -cy);
                        break;
                    case 'z':
                        ctx.closePath();
                        break;
                }
            }

            return;
        },

        /**
         * 返回矩形区域，用于局部刷新和文字定位
         * @param {Object} style 样式
         */
        getRect : function(style) {
            var lineWidth;
            if (style.brushType == 'stroke' || style.brushType == 'fill') {
                lineWidth = style.lineWidth || 1;
            }
            else {
                lineWidth = 0;
            }

            var minX = Number.MAX_VALUE;
            var maxX = Number.MIN_VALUE;

            var minY = Number.MAX_VALUE;
            var maxY = Number.MIN_VALUE;

            // 平移坐标
            var x = style.x || 0;
            var y = style.y || 0;

            var pathArray = this._parsePathData(style.path);
            for (var i = 0; i < pathArray.length; i++) {
                var p = pathArray[i].points;

                for (var j = 0; j < p.length; j++) {
                    if (j % 2 === 0) {
                        if (p[j] + x < minX) {
                            minX = p[j] + x;
                        }
                        if (p[j] + x > maxX) {
                            maxX = p[j] + x;
                        }
                    } else {
                        if (p[j] + y < minY) {
                            minY = p[j] + y;
                        }
                        if (p[j] + y > maxY) {
                            maxY = p[j] + y;
                        }
                    }
                }
            }

            var rect;
            if (minX === Number.MAX_VALUE
                || maxX === Number.MIN_VALUE
                || minY === Number.MAX_VALUE
                || maxY === Number.MIN_VALUE
            ) {
                rect = {
                    x : 0,
                    y : 0,
                    width : 0,
                    height : 0
                };
            }
            else {
                rect = {
                    x : Math.round(minX - lineWidth / 2),
                    y : Math.round(minY - lineWidth / 2),
                    width : maxX - minX + lineWidth,
                    height : maxY - minY + lineWidth
                };
            }
            return rect;
        }
    };

    var base = require('./base');
    base.derive(Path);
    
    var shape = require('../shape');
    shape.define('path', new Path());

    return Path;
});
/**
 * zrender
 *
 * @author lang( shenyi01@baidu.com )
 *
 * shape类：图片
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'image',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，左上角横坐标
           y             : {number},  // 必须，左上角纵坐标
           width         : {number},  // 可选，宽度
           height        : {number},  // 可选，高度
           sx            : {number},  // 可选, 从图片中裁剪的x
           sy            : {number},  // 可选, 从图片中裁剪的y
           sWidth        : {number},  // 可选, 从图片中裁剪的宽度
           sHeight       : {number},  // 可选, 从图片中裁剪的高度
           image         : {string|Image} // 必须，图片url或者图片对象
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'image',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           width : 150,
           height : 50,
           image : 'tests.jpg',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/image',['require','./base','../shape'],function(require) {

        var _cache = {};
        var _needsRefresh = [];
        var _refreshTimeout;

        function ZImage() {
            this.type = 'image';
        }

        ZImage.prototype = {
            brush : function(ctx, e, isHighlight, refresh) {
                var style = e.style || {};

                if (isHighlight) {
                    // 根据style扩展默认高亮样式
                    style = this.getHighlightStyle(
                        style, e.highlightStyle || {}
                    );
                }

                var image = style.image;

                if (typeof(image) === 'string') {
                    var src = image;
                    if (_cache[src]) {
                        image = _cache[src];
                    }
                    else {
                        image = document.createElement('image');//new Image();
                        image.onload = function(){
                            image.onload = null;
                            clearTimeout( _refreshTimeout );
                            _needsRefresh.push( e );
                            // 防止因为缓存短时间内触发多次onload事件
                            _refreshTimeout = setTimeout(function(){
                                refresh( _needsRefresh );
                                // 清空needsRefresh
                                _needsRefresh = [];
                            }, 10);
                        };
                        _cache[ src ] = image;

                        image.src = src;
                    }
                }
                if (image) {
                    //图片已经加载完成
                    if (window.ActiveXObject) {
                        if (image.readyState != 'complete') {
                            return;
                        }
                    }
                    else {
                        if (!image.complete) {
                            return;
                        }
                    }

                    ctx.save();
                    this.setContext(ctx, style);

                    // 设置transform
                    if (e.__needTransform) {
                        ctx.transform.apply(ctx,this.updateTransform(e));
                    }

                    var width = style.width || image.width;
                    var height = style.height || image.height;
                    var x = style.x;
                    var y = style.y;
                    if (style.sWidth && style.sHeight) {
                        var sx = style.sx || 0;
                        var sy = style.sy || 0;
                        ctx.drawImage(
                            image,
                            sx, sy, style.sWidth, style.sHeight,
                            x, y, width, height
                        );
                    }
                    else if (style.sx && style.sy) {
                        var sx = style.sx;
                        var sy = style.sy;
                        var sWidth = width - sx;
                        var sHeight = height - sy;
                        ctx.drawImage(
                            image,
                            sx, sy, sWidth, sHeight,
                            x, y, width, height
                        );
                    }
                    else {
                        ctx.drawImage(image, x, y, width, height);
                    }
                    // 如果没设置宽和高的话自动根据图片宽高设置
                    style.width = width;
                    style.height = height;
                    e.style.width = width;
                    e.style.height = height;


                    if (style.text) {
                        this.drawText(ctx, style, e.style);
                    }

                    ctx.restore();
                }

                return;
            },

            /**
             * 创建路径，用于判断hover时调用isPointInPath~
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                ctx.rect(style.x, style.y, style.width, style.height);
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                return {
                    x : style.x,
                    y : style.y,
                    width : style.width,
                    height : style.height
                };
            }
        };

        var base = require('./base');
        base.derive(ZImage);
        
        var shape = require('../shape');
        shape.define('image', new ZImage());

        return ZImage;
    }
);
/**
 * zrender
 *
 * @author Neil (杨骥, yangji01@baidu.com)
 *
 * shape类：贝塞尔曲线
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'beziercurve',         // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           xStart        : {number},  // 必须，起点横坐标
           yStart        : {number},  // 必须，起点纵坐标
           cpX1          : {number},  // 必须，第一个关联点横坐标
           cpY1          : {number},  // 必须，第一个关联点纵坐标
           cpX2          : {number},  // 可选，第二个关联点横坐标  缺省即为二次贝塞尔曲线
           cpY2          : {number},  // 可选，第二个关联点纵坐标
           xEnd          : {number},  // 必须，终点横坐标
           yEnd          : {number},  // 必须，终点纵坐标
           strokeColor   : {color},   // 默认为'#000'，线条颜色（轮廓），支持rgba

           lineWidth     : {number},  // 默认为1，线条宽度
           lineCap       : {string},  // 默认为butt，线帽样式。butt | round | square

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为end，附加文本位置。
                                      // inside | start | end
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#000' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'beziercurve',
       id     : '123456',
       zlevel : 1,
       style  : {
           xStart : 100,
           yStart : 100,
           xEnd : 200,
           yEnd : 200,
           strokeColor : '#eee',
           lineWidth : 20,
           text : 'Baidu'
       },
       myName : 'kener',  //可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/beziercurve',['require','./base','../shape'],function(require) {
        function Beziercurve() {
            this.type = 'beziercurve';
            this.brushTypeOnly = 'stroke';  //线条只能描边，填充后果自负
            this.textPosition = 'end';
        }

        Beziercurve.prototype =  {
            /**
             * 创建线条路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                ctx.moveTo(style.xStart, style.yStart);
                if (typeof style.cpX2 != 'undefined'
                    && typeof style.cpY2 != 'undefined'
                ) {
                    ctx.bezierCurveTo(
                        style.cpX1, style.cpY1,
                        style.cpX2, style.cpY2,
                        style.xEnd, style.yEnd
                    );
                }
                else {
                    ctx.quadraticCurveTo(
                        style.cpX1, style.cpY1,
                        style.xEnd, style.yEnd
                    );
                }

            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var _minX = Math.min(style.xStart, style.xEnd, style.cpX1);
                var _minY = Math.min(style.yStart, style.yEnd, style.cpY1);
                var _maxX = Math.max(style.xStart, style.xEnd, style.cpX1);
                var _maxY = Math.max(style.yStart, style.yEnd, style.cpY1);
                var _x2 = style.cpX2;
                var _y2 = style.cpY2;

                if (typeof _x2 != 'undefined'
                    && typeof _y2 != 'undefined'
                ) {
                    _minX = Math.min(_minX, _x2);
                    _minY = Math.min(_minY, _y2);
                    _maxX = Math.max(_maxX, _x2);
                    _maxY = Math.max(_maxY, _y2);
                }

                var lineWidth = style.lineWidth || 1;
                return {
                    x : _minX - lineWidth,
                    y : _minY - lineWidth,
                    width : _maxX - _minX + lineWidth,
                    height : _maxY - _minY + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Beziercurve);
        
        var shape = require('../shape');
        shape.define('beziercurve', new Beziercurve());

        return Beziercurve;
    }
);
/**
 * zrender
 *
 * @author sushuang (宿爽, sushuang@baidu.com)
 *
 * shape类：n角星（n>3）
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'star',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，n角星外接圆心横坐标
           y             : {number},  // 必须，n角星外接圆心纵坐标
           r             : {number},  // 必须，n角星外接圆半径
           r0            : {number},  // n角星内部顶点（凹点）的外接圆半径，
                                      // 如果不指定此参数，则自动计算：取相隔外部顶点连线的交点作内部顶点
           n             : {number},  // 必须，指明几角星
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效
           lineJoin      : {string},  // 默认为miter，线段连接样式。miter | round | bevel

           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为outside，附加文本位置。
                                      // outside | inside
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'star',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           r : 150,
           n : 5,
           color : '#eee'
       },
       myName : 'kener',   // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/star',['require','../tool/math','./base','../shape'],function(require) {

        var math = require('../tool/math');
        var sin = math.sin;
        var cos = math.cos;
        var PI = Math.PI;

        function Star() {
            this.type = 'heart';
        }

        Star.prototype = {
            /**
             * 创建n角星（n>3）路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var n = style.n;
                if (!n || n < 2) { return; }

                var x = style.x;
                var y = style.y;
                var r = style.r;
                var r0 = style.r0;

                // 如果未指定内部顶点外接圆半径，则自动计算
                if (r0 == null) {
                    r0 = n > 4
                        // 相隔的外部顶点的连线的交点，
                        // 被取为内部交点，以此计算r0
                        ? r * cos(2 * PI / n) / cos(PI / n)
                        // 二三四角星的特殊处理
                        : r / 3;
                }

                var dStep = PI / n;
                var deg = -PI / 2;
                var xStart = x + r * cos(deg);
                var yStart = y + r * sin(deg);
                deg += dStep;

                // 记录边界点，用于判断inside
                var pointList = style.pointList = [];
                pointList.push([xStart, yStart]);
                for (var i = 0, end = n * 2 - 1, ri; i < end; i ++) {
                    ri = i % 2 === 0 ? r0 : r;
                    pointList.push([x + ri * cos(deg), y + ri * sin(deg)]);
                    deg += dStep;
                }
                pointList.push([xStart, yStart]);

                // 绘制
                ctx.moveTo(pointList[0][0], pointList[0][1]);
                for (var i = 0; i < pointList.length; i ++) {
                    ctx.lineTo(pointList[i][0], pointList[i][1]);
                }

                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Star);
        
        var shape = require('../shape');
        shape.define('star', new Star());

        return Star;
    }
);
/**
 * zrender
 *
 * @author sushuang (宿爽, sushuang@baidu.com)
 *
 * shape类：正n边形（n>=3）
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'isogon',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，正n边形外接圆心横坐标
           y             : {number},  // 必须，正n边形外接圆心纵坐标
           r             : {number},  // 必须，正n边形外接圆半径
           n             : {number},  // 必须，指明正几边形
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效
           lineJoin      : {string},  // 默认为miter，线段连接样式。miter | round | bevel

           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为outside，附加文本位置。
                                      // outside | inside
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'isogon',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 400,
           y : 100,
           r : 150,
           n : 7,
           color : '#eee'
       },
       myName : 'kener',   // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'zrender/shape/isogon',['require','../tool/math','./base','../shape'],function(require) {

        var math = require('../tool/math');
        var sin = math.sin;
        var cos = math.cos;
        var PI = Math.PI;

        function Isogon() {
            this.type = 'isogon';
        }

        Isogon.prototype = {
            /**
             * 创建n角星（n>=3）路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var n = style.n;
                if (!n || n < 2) { return; }

                var x = style.x;
                var y = style.y;
                var r = style.r;

                var dStep = 2 * PI / n;
                var deg = -PI / 2;
                var xStart = x + r * cos(deg);
                var yStart = y + r * sin(deg);
                deg += dStep;

                // 记录边界点，用于判断insight
                var pointList = style.pointList = [];
                pointList.push([xStart, yStart]);
                for (var i = 0, end = n - 1; i < end; i ++) {
                    pointList.push([x + r * cos(deg), y + r * sin(deg)]);
                    deg += dStep;
                }
                pointList.push([xStart, yStart]);

                // 绘制
                ctx.moveTo(pointList[0][0], pointList[0][1]);
                for (var i = 0; i < pointList.length; i ++) {
                    ctx.lineTo(pointList[i][0], pointList[i][1]);
                }

                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
            }
        };

        var base = require('./base');
        base.derive(Isogon);
        
        var shape = require('../shape');
        shape.define('isogon', new Isogon());

        return Isogon;
    }
);
/**
 * 缓动代码来自 https://github.com/sole/tween.js/blob/master/src/Tween.js
 * author: lang(shenyi01@baidu.com)
 */
define(
    'zrender/animation/easing',[],function() {
        var Easing = {
            // 线性
            Linear: function(k) {
                return k;
            },

            // 二次方的缓动（t^2）
            QuadraticIn: function(k) {
                return k * k;
            },
            QuadraticOut: function(k) {
                return k * (2 - k);
            },
            QuadraticInOut: function(k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k;
                }
                return - 0.5 * (--k * (k - 2) - 1);
            },

            // 三次方的缓动（t^3）
            CubicIn: function(k) {
                return k * k * k;
            },
            CubicOut: function(k) {
                return --k * k * k + 1;
            },
            CubicInOut: function(k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k + 2);
            },

            // 四次方的缓动（t^4）
            QuarticIn: function(k) {
                return k * k * k * k;
            },
            QuarticOut: function(k) {
                return 1 - (--k * k * k * k);
            },
            QuarticInOut: function(k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k * k;
                }
                return - 0.5 * ((k -= 2) * k * k * k - 2);
            },

            // 五次方的缓动（t^5）
            QuinticIn: function(k) {
                return k * k * k * k * k;
            },

            QuinticOut: function(k) {
                return --k * k * k * k * k + 1;
            },
            QuinticInOut: function(k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k * k * k + 2);
            },

            // 正弦曲线的缓动（sin(t)）
            SinusoidalIn: function(k) {
                return 1 - Math.cos(k * Math.PI / 2);
            },
            SinusoidalOut: function(k) {
                return Math.sin(k * Math.PI / 2);
            },
            SinusoidalInOut: function(k) {
                return 0.5 * (1 - Math.cos(Math.PI * k));
            },

            // 指数曲线的缓动（2^t）
            ExponentialIn: function(k) {
                return k === 0 ? 0 : Math.pow(1024, k - 1);
            },
            ExponentialOut: function(k) {
                return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);
            },
            ExponentialInOut: function(k) {
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if ((k *= 2) < 1) {
                    return 0.5 * Math.pow(1024, k - 1);
                }
                return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);
            },

            // 圆形曲线的缓动（sqrt(1-t^2)）
            CircularIn: function(k) {
                return 1 - Math.sqrt(1 - k * k);
            },
            CircularOut: function(k) {
                return Math.sqrt(1 - (--k * k));
            },
            CircularInOut: function(k) {
                if ((k *= 2) < 1) {
                    return - 0.5 * (Math.sqrt(1 - k * k) - 1);
                }
                return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
            },

            // 创建类似于弹簧在停止前来回振荡的动画
            ElasticIn: function(k) {
                var s, a = 0.1, p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }else{
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                return - (a * Math.pow(2, 10 * (k -= 1)) *
                            Math.sin((k - s) * (2 * Math.PI) / p));
            },
            ElasticOut: function(k) {
                var s, a = 0.1, p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else{
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                return (a * Math.pow(2, - 10 * k) *
                        Math.sin((k - s) * (2 * Math.PI) / p) + 1);
            },
            ElasticInOut: function(k) {
                var s, a = 0.1, p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else{
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                if ((k *= 2) < 1) {
                    return - 0.5 * (a * Math.pow(2, 10 * (k -= 1))
                        * Math.sin((k - s) * (2 * Math.PI) / p));
                }
                return a * Math.pow(2, -10 * (k -= 1))
                        * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

            },

            // 在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动
            BackIn: function(k) {
                var s = 1.70158;
                return k * k * ((s + 1) * k - s);
            },
            BackOut: function(k) {
                var s = 1.70158;
                return --k * k * ((s + 1) * k + s) + 1;
            },
            BackInOut: function(k) {
                var s = 1.70158 * 1.525;
                if ((k *= 2) < 1) {
                    return 0.5 * (k * k * ((s + 1) * k - s));
                }
                return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
            },

            // 创建弹跳效果
            BounceIn: function(k) {
                return 1 - Easing.BounceOut(1 - k);
            },
            BounceOut: function(k) {
                if (k < (1 / 2.75)) {
                    return 7.5625 * k * k;
                }
                else if (k < (2 / 2.75)) {
                    return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
                } else if (k < (2.5 / 2.75)) {
                    return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
                } else {
                    return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
                }
            },
            BounceInOut: function(k) {
                if (k < 0.5) {
                    return Easing.BounceIn(k * 2) * 0.5;
                }
                return Easing.BounceOut(k * 2 - 1) * 0.5 + 0.5;
            }
        };

        return Easing;
    }
);


/**
 * 动画主控制器
 * @config target 动画对象，可以是数组，如果是数组的话会批量分发onframe等事件
 * @config life(1000) 动画时长
 * @config delay(0) 动画延迟时间
 * @config loop(true)
 * @config gap(0) 循环的间隔时间
 * @config onframe
 * @config easing(optional)
 * @config ondestroy(optional)
 * @config onrestart(optional)
 */
define(
    'zrender/animation/controller',['require','./easing'],function(require) {

        var Easing = require('./easing');

        var Controller = function(options) {

            this._targetPool = options.target || {};
            if (this._targetPool.constructor != Array) {
                this._targetPool = [this._targetPool];
            }

            //生命周期
            this._life = options.life || 1000;
            //延时
            this._delay = options.delay || 0;
            //开始时间
            this._startTime = new Date().getTime() + this._delay;//单位毫秒

            //结束时间
            this._endTime = this._startTime + this._life*1000;

            //是否循环
            this.loop = typeof(options.loop) == 'undefined'
                        ? false : options.loop;

            this.gap = options.gap || 0;

            this.easing = options.easing || 'Linear';

            this.onframe = options.onframe || null;

            this.ondestroy = options.ondestroy || null;

            this.onrestart = options.onrestart || null;
        };

        Controller.prototype = {
            step : function(time) {
                var percent = (time - this._startTime) / this._life;

                //还没开始
                if (percent < 0) {
                    return;
                }

                percent = Math.min(percent, 1);

                var easingFunc = typeof(this.easing) == 'string'
                                 ? Easing[this.easing]
                                 : this.easing;
                var schedule;
                if (typeof easingFunc === 'function') {
                    schedule = easingFunc(percent);
                }else{
                    schedule = percent;
                }
                this.fire('frame', schedule);

                //结束
                if (percent == 1) {
                    if (this.loop) {
                        this.restart();
                        // 重新开始周期
                        // 抛出而不是直接调用事件直到 stage.update 后再统一调用这些事件
                        return 'restart';

                    }else{
                        // 动画完成将这个控制器标识为待删除
                        // 在Animation.update中进行批量删除
                        this._needsRemove = true;

                        return 'destroy';
                    }
                }else{
                    return null;
                }
            },
            restart : function() {
                this._startTime = new Date().getTime() + this.gap;
            },
            fire : function(eventType, arg) {
                for(var i = 0, len = this._targetPool.length; i < len; i++) {
                    if (this['on' + eventType]) {
                        this['on' + eventType](this._targetPool[i], arg);
                    }
                }
            }
        };
        Controller.prototype.constructor = Controller;

        return Controller;
    }
);
/**
 * 动画主类, 调度和管理所有动画控制器
 *
 * @author lang(shenyi01@baidu.com)
 *
 * @class : Animation
 * @config : stage(optional) 绘制类, 需要提供update接口
 * @config : fps(optional) 帧率, 是自动更新动画的时候需要提供
 * @config : onframe(optional)
 * @method : add
 * @method : remove
 * @method : update
 * @method : start
 * @method : stop
 */
define(
    'zrender/animation/animation',['require','./controller','../tool/util'],function(require) {
        var Controller = require('./controller');
        var util = require('../tool/util');

        // Polyfill of requestAnimationFrame
        var requrestAnimationFrame = window.requrestAnimationFrame
                                     || window.mozRequestAnimationFrame
                                     || window.webkitRequestAnimationFrame
                                     || function(callback) {
                                            window.setTimeout(
                                                callback, 1000 / 60
                                           );
                                        };

        var Animation = function(options) {

            options = options || {};

            this.stage = options.stage || {};

            this.onframe = options.onframe || function() {};

            // private properties
            this._controllerPool = [];

            this._running = false;
        };

        Animation.prototype = {
            add : function(controller) {
                this._controllerPool.push(controller);
            },
            remove : function(controller) {
                var idx = util.indexOf(this._controllerPool, controller);
                if (idx >= 0) {
                    this._controllerPool.splice(idx, 1);
                }
            },
            update : function() {
                var time = new Date().getTime();
                var cp = this._controllerPool;
                var len = cp.length;

                var deferredEvents = [];
                var deferredCtls = [];
                for (var i = 0; i < len; i++) {
                    var controller = cp[i];
                    var e = controller.step(time);
                    // 需要在stage.update之后调用的事件，例如destroy
                    if (e) {
                        deferredEvents.push(e);
                        deferredCtls.push(controller);
                    }
                }
                if (this.stage
                    && this.stage.update
                    && this._controllerPool.length
               ) {
                    this.stage.update();
                }

                // 删除动画完成的控制器
                var newArray = [];
                for (var i = 0; i < len; i++) {
                    if (!cp[i]._needsRemove) {
                        newArray.push(cp[i]);
                        cp[i]._needsRemove = false;
                    }
                }
                this._controllerPool = newArray;

                len = deferredEvents.length;
                for (var i = 0; i < len; i++) {
                    deferredCtls[i].fire(deferredEvents[i]);
                }

                this.onframe();

            },
            // 启用start函数之后每个1000/fps事件就会刷新
            // 也可以不使用animation的start函数
            // 手动每一帧去调用update函数更新状态
            start : function() {
                var self = this;

                this._running = true;

                function step() {
                    if (self._running) {
                        self.update();
                        requrestAnimationFrame(step);
                    }
                }

                requrestAnimationFrame(step);
            },
            stop : function() {
                this._running = false;
            },
            clear : function() {
                this._controllerPool = [];
            },
            animate : function(target, loop, getter, setter) {
                var deferred = new Deferred(target, loop, getter, setter);
                deferred.animation = this;
                return deferred;
            }
        };
        Animation.prototype.constructor = Animation;

        function _defaultGetter(target, key) {
            return target[key];
        }
        function _defaultSetter(target, key, value) {
            target[key] = value;
        }
        // 递归做插值
        // TODO 对象的插值
        function _interpolate(
            prevValue,
            nextValue,
            percent,
            target,
            propName,
            getter,
            setter
       ) {
             // 遍历数组做插值
            if (prevValue instanceof Array
                && nextValue instanceof Array
           ) {
                var minLen = Math.min(prevValue.length, nextValue.length);
                var largerArray;
                var maxLen;
                var result = [];
                if (minLen === prevValue.length) {
                    maxLen = nextValue.length;
                    largerArray = nextValue;
                }else{
                    maxLen = prevValue.length;
                    largerArray = prevValue.length;
                }
                for (var i = 0; i < minLen; i++) {
                    // target[propName] 作为新的target,
                    // i 作为新的propName递归进行插值
                    result.push(_interpolate(
                            prevValue[i],
                            nextValue[i],
                            percent,
                            getter(target, propName),
                            i,
                            getter,
                            setter
                   ));
                }
                // 赋值剩下不需要插值的数组项
                for (var i = minLen; i < maxLen; i++) {
                    result.push(largerArray[i]);
                }

                setter(target, propName, result);
            }
            else{
                prevValue = parseFloat(prevValue);
                nextValue = parseFloat(nextValue);
                if (!isNaN(prevValue) && !isNaN(nextValue)) {
                    var value = (nextValue-prevValue) * percent+prevValue;
                    setter(target, propName, value);
                    return value;
                }
            }
        }
        function Deferred(target, loop, getter, setter) {
            this._tracks = {};
            this._target = target;

            this._loop = loop || false;

            this._getter = getter || _defaultGetter;
            this._setter = setter || _defaultSetter;

            this._controllerCount = 0;

            this._delay = 0;

            this._doneList = [];

            this._onframeList = [];

            this._controllerList = [];
        }

        Deferred.prototype = {
            when : function(time /* ms */, props, easing) {
                for (var propName in props) {
                    if (! this._tracks[propName]) {
                        this._tracks[propName] = [];
                        // 初始状态
                        this._tracks[propName].push({
                            time : 0,
                            value : this._getter(this._target, propName)
                        });
                    }
                    this._tracks[propName].push({
                        time : time,
                        value : props[propName],
                        easing : easing
                    });
                }
                return this;
            },
            during : function(callback) {
                this._onframeList.push(callback);
                return this;
            },
            start : function() {
                var self = this;
                var delay;
                var track;
                var trackMaxTime;

                function createOnframe(now, next, propName) {
                    // 复制出新的数组，不然动画的时候改变数组的值也会影响到插值
                    var prevValue = clone(now.value);
                    var nextValue = clone(next.value);
                    return function(target, schedule) {
                        _interpolate(
                            prevValue,
                            nextValue,
                            schedule,
                            target,
                            propName,
                            self._getter,
                            self._setter
                       );
                        for (var i = 0; i < self._onframeList.length; i++) {
                            self._onframeList[i](target, schedule);
                        }
                    };
                }

                function ondestroy() {
                    self._controllerCount--;
                    if (self._controllerCount === 0) {
                        var len = self._doneList.length;
                        // 所有动画完成
                        for (var i = 0; i < len; i++) {
                            self._doneList[i].call(self);
                        }
                    }
                }

                for (var propName in this._tracks) {
                    delay = this._delay;
                    track = this._tracks[propName];
                    if (track.length) {
                        trackMaxTime = track[track.length-1].time;
                    }else{
                        continue;
                    }
                    for (var i = 0; i < track.length-1; i++) {
                        var now = track[i],
                            next = track[i+1];

                        var controller = new Controller({
                            target : self._target,
                            life : next.time - now.time,
                            delay : delay,
                            loop : self._loop,
                            gap : trackMaxTime - (next.time - now.time),
                            easing : next.easing,
                            onframe : createOnframe(now, next, propName),
                            ondestroy : ondestroy
                        });
                        this._controllerList.push(controller);

                        this._controllerCount++;
                        delay = next.time + this._delay;

                        self.animation.add(controller);
                    }
                }
                return this;
            },
            stop : function() {
                for (var i = 0; i < this._controllerList.length; i++) {
                    var controller = this._controllerList[i];
                    this.animation.remove(controller);
                }
            },
            delay : function(time) {
                this._delay = time;
                return this;
            },
            done : function(func) {
                this._doneList.push(func);
                return this;
            }
        };

        function clone(value) {
            if (value && value instanceof Array) {
                return Array.prototype.slice.call(value);
            }
            else {
                return value;
            }
        }

        return Animation;
    }
);

/**
 * zrender: config默认配置项
 *
 * @desc zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(
    'zrender/config',{
        loadingEffect : 'spin',         // 默认loading特效
        EVENT : {                       // 支持事件列表
            RESIZE : 'resize',          // 窗口大小变化
            CLICK : 'click',            // 鼠标按钮被（手指）按下，事件对象是：目标图形元素或空

            MOUSEWHEEL : 'mousewheel',  // 鼠标滚轮变化，事件对象是：目标图形元素或空
            MOUSEMOVE : 'mousemove',    // 鼠标（手指）被移动，事件对象是：目标图形元素或空
            MOUSEOVER : 'mouseover',    // 鼠标移到某图形元素之上，事件对象是：目标图形元素
            MOUSEOUT : 'mouseout',      // 鼠标从某图形元素移开，事件对象是：目标图形元素
            MOUSEDOWN : 'mousedown',    // 鼠标按钮（手指）被按下，事件对象是：目标图形元素或空
            MOUSEUP : 'mouseup',        // 鼠标按键（手指）被松开，事件对象是：目标图形元素或空

            //
            GLOBALOUT : 'globalout',    // 全局离开，MOUSEOUT触发比较频繁，一次离开优化绑定

            // 一次成功元素拖拽的行为事件过程是：
            // dragstart > dragenter > dragover [> dragleave] > drop > dragend
            DRAGSTART : 'dragstart',    // 开始拖拽时触发，事件对象是：被拖拽图形元素
            DRAGEND : 'dragend',        // 拖拽完毕时触发（在drop之后触发），事件对象是：被拖拽图形元素
            DRAGENTER : 'dragenter',    // 拖拽图形元素进入目标图形元素时触发，事件对象是：目标图形元素
            DRAGOVER : 'dragover',      // 拖拽图形元素在目标图形元素上移动时触发，事件对象是：目标图形元素
            DRAGLEAVE : 'dragleave',    // 拖拽图形元素离开目标图形元素时触发，事件对象是：目标图形元素
            DROP : 'drop',              // 拖拽图形元素放在目标图形元素内时触发，事件对象是：目标图形元素

            touchClickDelay : 300       // touch end - start < delay is click
        }
    }
);
/**
 * zrender: loading特效
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * 扩展loading effect：
 * getBackgroundShape：获取背景图形
 * getTextShape：获取文字
 * define : 定义效果
 *
 * 内置效果
 * bar：进度条
 * whirling：旋转水滴
 * dynamicLine：动态线条
 * bubble：气泡
 */
define(
    'zrender/tool/loadingEffect',['require','./util','./color','./color','./color','./color','./color','./math'],function(require) {
        var util = require('./util');
        var self;
        var _defaultText = 'Loading...';
        var _defaultTextFont = 'normal 16px Arial';

        var _width;
        var _height;

        function define(name, fun) {
            self[name] = fun;
        }

        /**
         * 获取loading文字图形
         * @param {Object} textStyle 文字style，同shape/text.style
         */
        function getTextShape(textStyle) {
            return {
                shape : 'text',
                highlightStyle : util.merge(
                    {
                        x : _width / 2,
                        y : _height / 2,
                        text : _defaultText,
                        textAlign : 'center',
                        textBaseline : 'middle',
                        textFont : _defaultTextFont,
                        color: '#333',
                        brushType : 'fill'
                    },
                    textStyle,
                    {'overwrite': true, 'recursive': true}
                )
            };
        }

        /**
         * 获取loading背景图形
         * @param {color} color 背景颜色
         */
        function getBackgroundShape (color) {
            return {
                shape : 'rectangle',
                highlightStyle : {
                    x : 0,
                    y : 0,
                    width : _width,
                    height : _height,
                    brushType : 'fill',
                    color : color
                }
            };
        }

        // 调整值区间
        function _adjust(value, region) {
            if (value <= region[0]) {
                value = region[0];
            }
            else if (value >= region[1]) {
                value = region[1];
            }
            return value;
        }

        /**
         * 进度条
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function bar(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            // 特效默认配置
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#888'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)',
                    effectOption : {
                        x : 0,
                        y : _height / 2 - 30,
                        width : _width,
                        height : 5,
                        brushType : 'fill',
                        timeInterval : 100
                    }
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            var effectOption = loadingOption.effectOption;
            // 初始化动画元素
            var barShape = {
                shape : 'rectangle',
                highlightStyle : util.clone(effectOption)
            };
            barShape.highlightStyle.color =
                effectOption.color
                || zrColor.getLinearGradient(
                    effectOption.x,
                    effectOption.y,
                    effectOption.x + effectOption.width,
                    effectOption.y + effectOption.height,
                    [[0, '#ff6400'], [0.5, '#ffe100'], [1, '#b1ff00']]
                );

            if (typeof loadingOption.progress != 'undefined') {
                // 指定进度
                addShapeHandle(background);

                barShape.highlightStyle.width =
                    _adjust(loadingOption.progress, [0,1])
                    * loadingOption.effectOption.width;
                addShapeHandle(barShape);

                addShapeHandle(textShape);

                refreshHandle();
                return;
            }
            else {
                // 循环显示
                barShape.highlightStyle.width = 0;
                return setInterval(
                    function() {
                        addShapeHandle(background);

                        if (barShape.highlightStyle.width
                            < loadingOption.effectOption.width
                        ) {
                            barShape.highlightStyle.width += 8;
                        }
                        else {
                            barShape.highlightStyle.width = 0;
                        }
                        addShapeHandle(barShape);

                        addShapeHandle(textShape);
                        refreshHandle();
                    },
                    effectOption.timeInterval
                );
            }
        }

        /**
         * 旋转水滴
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function whirling(loadingOption, addShapeHandle, refreshHandle) {
            // 特效默认配置
            loadingOption.effectOption = util.merge(
                loadingOption.effectOption || {},
                {
                    x : _width / 2 - 80,
                    y : _height / 2,
                    r : 18,
                    colorIn : '#fff',
                    colorOut : '#555',
                    colorWhirl : '#6cf',
                    timeInterval : 50
                }
            );

            var effectOption = loadingOption.effectOption;
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#888',
                        x : effectOption.x + effectOption.r + 10,
                        y : effectOption.y,
                        textAlign : 'start'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)'
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            // 初始化动画元素
            var droplet = {
                shape : 'droplet',
                highlightStyle : {
                    a : Math.round(effectOption.r / 2),
                    b : Math.round(effectOption.r - effectOption.r / 6),
                    brushType : 'fill',
                    color : effectOption.colorWhirl
                }
            };
            var circleIn = {
                shape : 'circle',
                highlightStyle : {
                    r : Math.round(effectOption.r / 6),
                    brushType : 'fill',
                    color : effectOption.colorIn
                }
            };
            var circleOut = {
                shape : 'ring',
                highlightStyle : {
                    r0 : Math.round(effectOption.r - effectOption.r / 3),
                    r : effectOption.r,
                    brushType : 'fill',
                    color : effectOption.colorOut
                }
            };

            var pos = [0, effectOption.x, effectOption.y];

            droplet.highlightStyle.x
                = circleIn.highlightStyle.x
                = circleOut.highlightStyle.x
                = pos[1];
            droplet.highlightStyle.y
                = circleIn.highlightStyle.y
                = circleOut.highlightStyle.y
                = pos[2];

            return setInterval(
                function() {
                    addShapeHandle(background);
                    addShapeHandle(circleOut);
                    pos[0] -= 0.3;
                    droplet.rotation = pos;
                    addShapeHandle(droplet);
                    addShapeHandle(circleIn);
                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        }

        /**
         * 动态线
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function dynamicLine(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            // 特效默认配置
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#fff'
                    },
                    backgroundColor : 'rgba(0, 0, 0, 0.8)',
                    effectOption : {
                        n : 30,
                        lineWidth : 1,
                        color : 'random',
                        timeInterval : 100
                    }
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            var effectOption = loadingOption.effectOption;
            var n = effectOption.n;
            var lineWidth = effectOption.lineWidth;

            var shapeList = [];
            var pos;
            var len;
            var xStart;
            var color;
            // 初始化动画元素
            for(var i = 0; i < n; i++) {
                xStart = -Math.ceil(Math.random() * 1000);
                len = Math.ceil(Math.random() * 400);
                pos = Math.ceil(Math.random() * _height);

                if (effectOption.color == 'random') {
                    color = zrColor.random();
                }
                else {
                    color = effectOption.color;
                }
                shapeList[i] = {
                    shape : 'line',
                    highlightStyle : {
                        xStart : xStart,
                        yStart : pos,
                        xEnd : xStart + len,
                        yEnd : pos,
                        strokeColor : color,
                        lineWidth : lineWidth
                    },
                    animationX : Math.ceil(Math.random() * 100),
                    len : len
                };
            }

            return setInterval(
                function() {
                    addShapeHandle(background);
                    var style;
                    for(var i = 0; i < n; i++) {
                        style = shapeList[i].highlightStyle ;

                        if (style.xStart >= _width){
                            shapeList[i].len = Math.ceil(Math.random() * 400);
                            shapeList[i].highlightStyle .xStart = -400;
                            shapeList[i].highlightStyle .xEnd =
                                -400 + shapeList[i].len;
                            shapeList[i].highlightStyle .yStart =
                                Math.ceil(Math.random() * _height);
                            shapeList[i].highlightStyle .yEnd =
                                shapeList[i].highlightStyle.yStart;
                        }
                        shapeList[i].highlightStyle.xStart +=
                            shapeList[i].animationX;
                        shapeList[i].highlightStyle.xEnd +=
                            shapeList[i].animationX;

                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        }

        /**
         * 泡泡
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function bubble(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            // 特效默认配置
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#888'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)',
                    effectOption : {
                        n : 50,
                        lineWidth : 2,
                        brushType : 'stroke',
                        color : 'random',
                        timeInterval : 100
                    }
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            var effectOption = loadingOption.effectOption;
            var n = effectOption.n;
            var brushType = effectOption.brushType;
            var lineWidth = effectOption.lineWidth;

            var shapeList = [];
            var color;
            // 初始化动画元素
            for(var i = 0; i < n; i++) {
                if (effectOption.color == 'random') {
                    color = zrColor.alpha(zrColor.random(), 0.3);
                }
                else {
                    color = effectOption.color;
                }
                shapeList[i] = {
                    shape : 'circle',
                    highlightStyle : {
                        x : Math.ceil(Math.random() * _width),
                        y : Math.ceil(Math.random() * _height),
                        r : Math.ceil(Math.random() * 40),
                        brushType : brushType,
                        color : color,
                        strokeColor : color,
                        lineWidth : lineWidth
                    },
                    animationY : Math.ceil(Math.random() * 20)
                };
            }

            return setInterval(
                function () {
                    addShapeHandle(background);
                    var style;
                    for(var i = 0; i < n; i++) {
                        style = shapeList[i].highlightStyle;

                        if (style.y - shapeList[i].animationY + style.r <= 0){
                            shapeList[i].highlightStyle.y = _height + style.r;
                            shapeList[i].highlightStyle.x = Math.ceil(
                                Math.random() * _width
                            );
                        }
                        shapeList[i].highlightStyle.y -=
                            shapeList[i].animationY;

                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        }

        /**
         * 旋转
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function spin(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            // 特效默认配置
            loadingOption.effectOption = util.merge(
                loadingOption.effectOption || {},
                {
                    x : _width / 2 - 80,
                    y : _height / 2,
                    r0 : 9,
                    r : 15,
                    n : 18,
                    color : '#fff',
                    timeInterval : 100
                }
            );

            var effectOption = loadingOption.effectOption;
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#fff',
                        x : effectOption.x + effectOption.r + 10,
                        y : effectOption.y,
                        textAlign : 'start'
                    },
                    backgroundColor : 'rgba(0, 0, 0, 0.8)'
                },
                {'overwrite': false, 'recursive': true}
            );

            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            var n = effectOption.n;
            var x = effectOption.x;
            var y = effectOption.y;
            var r0 = effectOption.r0;
            var r = effectOption.r;
            var color = effectOption.color;
            // 初始化动画元素
            var shapeList = [];
            var preAngle = Math.round(180 / n);
            for(var i = 0; i < n; i++) {
                shapeList[i] = {
                    shape : 'sector',
                    highlightStyle  : {
                        x : x,
                        y : y,
                        r0 : r0,
                        r : r,
                        startAngle : preAngle * i * 2,
                        endAngle : preAngle * i * 2 + preAngle,
                        color : zrColor.alpha(color, (i + 1) / n),
                        brushType: 'fill'
                    }
                };
            }

            var pos = [0, x, y];

            return setInterval(
                function() {
                    addShapeHandle(background);
                    pos[0] -= 0.3;
                    for(var i = 0; i < n; i++) {
                        shapeList[i].rotation = pos;
                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        }


        /**
         * 圆环
         * @param {Object} loadingOption
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        function ring(loadingOption, addShapeHandle, refreshHandle) {
            var zrColor = require('./color');
            var zrMath = require('./math');
            // 特效默认配置
            loadingOption = util.merge(
                loadingOption,
                {
                    textStyle : {
                        color : '#07a'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)',
                    effectOption : {
                        x : _width / 2,
                        y : _height / 2,
                        r0 : 60,
                        r : 100,
                        color : '#bbdcff',
                        brushType: 'fill',
                        textPosition : 'inside',
                        textFont : 'normal 30px verdana',
                        textColor : 'rgba(30, 144, 255, 0.6)',
                        timeInterval : 100
                    }
                },
                {'overwrite': false, 'recursive': true}
            );

            var effectOption = loadingOption.effectOption;
            var textStyle = loadingOption.textStyle;
            textStyle.x = typeof textStyle.x != 'undefined'
                ? textStyle.x : effectOption.x;
            textStyle.y = typeof textStyle.y != 'undefined'
                ? textStyle.y
                : (effectOption.y + (effectOption.r0 + effectOption.r) / 2 - 5);
            var textShape = getTextShape(loadingOption.textStyle);

            var background = getBackgroundShape(loadingOption.backgroundColor);

            var x = effectOption.x;
            var y = effectOption.y;
            var r0 = effectOption.r0 + 6;
            var r = effectOption.r - 6;
            var color = effectOption.color;
            var darkColor = zrColor.lift(color, 0.1);

            var shapeRing = {
                shape : 'ring',
                highlightStyle : util.clone(effectOption)
            };
            // 初始化动画元素
            var shapeList = [];
            var clolrList = zrColor.getGradientColors(
                ['#ff6400', '#ffe100', '#97ff00'], 25
            );
            var preAngle = 15;
            var endAngle = 240;

            for(var i = 0; i < 16; i++) {
                shapeList.push({
                    shape : 'sector',
                    highlightStyle  : {
                        x : x,
                        y : y,
                        r0 : r0,
                        r : r,
                        startAngle : endAngle - preAngle,
                        endAngle : endAngle,
                        brushType: 'fill',
                        color : darkColor
                    },
                    _color : zrColor.getLinearGradient(
                        x + r0 * zrMath.cos(endAngle, true),
                        y - r0 * zrMath.sin(endAngle, true),
                        x + r0 * zrMath.cos(endAngle - preAngle, true),
                        y - r0 * zrMath.sin(endAngle - preAngle, true),
                        [
                            [0, clolrList[i * 2]],
                            [1, clolrList[i * 2 + 1]]
                        ]
                    )
                });
                endAngle -= preAngle;
            }
            endAngle = 360;
            for(var i = 0; i < 4; i++) {
                shapeList.push({
                    shape : 'sector',
                    highlightStyle  : {
                        x : x,
                        y : y,
                        r0 : r0,
                        r : r,
                        startAngle : endAngle - preAngle,
                        endAngle : endAngle,
                        brushType: 'fill',
                        color : darkColor
                    },
                    _color : zrColor.getLinearGradient(
                        x + r0 * zrMath.cos(endAngle, true),
                        y - r0 * zrMath.sin(endAngle, true),
                        x + r0 * zrMath.cos(endAngle - preAngle, true),
                        y - r0 * zrMath.sin(endAngle - preAngle, true),
                        [
                            [0, clolrList[i * 2 + 32]],
                            [1, clolrList[i * 2 + 33]]
                        ]
                    )
                });
                endAngle -= preAngle;
            }

            var n = 0;
            if (typeof loadingOption.progress != 'undefined') {
                // 指定进度
                addShapeHandle(background);

                n = _adjust(loadingOption.progress, [0,1]).toFixed(2) * 100 / 5;
                shapeRing.highlightStyle.text = n * 5 + '%';
                addShapeHandle(shapeRing);

                for(var i = 0; i < 20; i++) {
                    shapeList[i].highlightStyle.color = i < n
                        ? shapeList[i]._color : darkColor;
                    addShapeHandle(shapeList[i]);
                }

                addShapeHandle(textShape);

                refreshHandle();
                return;
            }
            else {
                // 循环显示
                return setInterval(
                    function() {
                        addShapeHandle(background);

                        n += n >= 20 ? -20 : 1;

                        //shapeRing.highlightStyle.text = n * 5 + '%';
                        addShapeHandle(shapeRing);

                        for(var i = 0; i < 20; i++) {
                            shapeList[i].highlightStyle.color = i < n
                                ? shapeList[i]._color : darkColor;
                            addShapeHandle(shapeList[i]);
                        }

                        addShapeHandle(textShape);
                        refreshHandle();
                    },
                    effectOption.timeInterval
                );
            }
        }

        function start(loadingOption, addShapeHandle, refreshHandle) {
            var loadingEffect = self.ring;   // 默认特效
            if (typeof loadingOption.effect == 'function') {
                // 自定义特效
                loadingEffect = loadingOption.effect;
            }
            else if (typeof self[loadingOption.effect] == 'function'){
                // 指定特效
                loadingEffect = self[loadingOption.effect];
            }

            _width = loadingOption.canvasSize.width;
            _height = loadingOption.canvasSize.height;

            return loadingEffect(
                loadingOption, addShapeHandle, refreshHandle
            );
        }

        function stop(loadingTimer) {
            clearInterval(loadingTimer);
        }

        self = {
            // 这三个方法用于扩展loading effect
            getBackgroundShape : getBackgroundShape,
            getTextShape : getTextShape,
            define : define,
            // 内置特效
            bar : bar,
            whirling : whirling,
            dynamicLine : dynamicLine,
            bubble : bubble,
            spin : spin,
            ring : ring,
            // 方法
            start : start,
            stop : stop
        };

        return self;
    }
);
/**
 * zrender: 事件辅助类
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * getX：获取事件横坐标
 * getY：或者事件纵坐标
 * getDelta：或者鼠标滚轮变化
 * stop：停止事件传播
 * Dispatcher：事件分发器
 */
define(
    'zrender/tool/event',[],function() {
        /**
        * 提取鼠标（手指）x坐标
        * @param  {event} e 事件.
        * @return {number} 鼠标（手指）x坐标.
        */
        function getX(e) {
            return typeof e.zrenderX != 'undefined' && e.zrenderX
                   || typeof e.offsetX != 'undefined' && e.offsetX
                   || typeof e.layerX != 'undefined' && e.layerX
                   || typeof e.clientX != 'undefined' && e.clientX;
        }

        /**
        * 提取鼠标y坐标
        * @param  {event} e 事件.
        * @return {number} 鼠标（手指）y坐标.
        */
        function getY(e) {
            return typeof e.zrenderY != 'undefined' && e.zrenderY
                   || typeof e.offsetY != 'undefined' && e.offsetY
                   || typeof e.layerY != 'undefined' && e.layerY
                   || typeof e.clientY != 'undefined' && e.clientY;
        }

        /**
        * 提取鼠标滚轮变化
        * @param  {event} e 事件.
        * @return {number} 滚轮变化，正值说明滚轮是向上滚动，如果是负值说明滚轮是向下滚动
        */
        function getDelta(e) {
            return typeof e.wheelDelta != 'undefined' && e.wheelDelta
                   || typeof e.detail != 'undefined' && -e.detail;
        }

        /**
         * 停止冒泡和阻止默认行为
         * @param {Object} e : event对象
         */
        function stop(e) {
            if (e.preventDefault) {
                e.preventDefault();
                e.stopPropagation();
            }
            else {
                e.returnValue = false;
            }
        }

        /**
         * 事件分发器
         */
        function Dispatcher() {
            var _self = this;
            var _h = {};

            /**
             * 单次触发绑定，dispatch后销毁
             * @param {string} event 事件字符串
             * @param {function} handler 响应函数
             */
            function one(event, handler) {
                if(!handler || !event) {
                    return _self;
                }

                if(!_h[event]) {
                    _h[event] = [];
                }

                _h[event].push({
                    h : handler,
                    one : true
                });

                return _self;
            }

            /**
             * 事件绑定
             * @param {string} event 事件字符串
             * @param {function} handler : 响应函数
             */
            function bind(event, handler) {
                if(!handler || !event) {
                    return _self;
                }

                if(!_h[event]) {
                    _h[event] = [];
                }

                _h[event].push({
                    h : handler,
                    one : false
                });

                return _self;
            }

            /**
             * 事件解绑定
             * @param {string} event 事件字符串
             * @param {function} handler : 响应函数
             */
            function unbind(event, handler) {
                if(!event) {
                    _h = {};
                    return _self;
                }

                if(handler) {
                    if(_h[event]) {
                        var newList = [];
                        for (var i = 0, l = _h[event].length; i < l; i++) {
                            if (_h[event][i]['h'] != handler) {
                                newList.push(_h[event][i]);
                            }
                        }
                        _h[event] = newList;
                    }

                    if(_h[event] && _h[event].length === 0) {
                        delete _h[event];
                    }
                }
                else {
                    delete _h[event];
                }

                return _self;
            }

            /**
             * 事件分发
             * @param {string} type : 事件类型
             * @param {Object} event : event对象
             * @param {Object} [attachment] : 附加信息
             */
            function dispatch(type, event, attachment) {
                if(_h[type]) {
                    var newList = [];
                    var eventPacket = attachment || {};
                    eventPacket.type = type;
                    eventPacket.event = event;
                    //eventPacket._target = self;
                    for (var i = 0, l = _h[type].length; i < l; i++) {
                        _h[type][i]['h'](eventPacket);
                        if (!_h[type][i]['one']) {
                            newList.push(_h[type][i]);
                        }
                    }

                    if (newList.length != _h[type].length) {
                        _h[type] = newList;
                    }
                }

                return _self;
            }

            _self.one = one;
            _self.bind = bind;
            _self.unbind = unbind;
            _self.dispatch = dispatch;
        }

        return {
            getX : getX,
            getY : getY,
            getDelta : getDelta,
            stop : stop,
            Dispatcher : Dispatcher
        };
    }
);
/*!
 * ZRender, a lightweight canvas library with a MVC architecture, data-driven 
 * and provides an event model like DOM.
 *  
 * Copyright (c) 2013, Baidu Inc.
 * All rights reserved.
 * 
 * Redistribution and use of this software in source and binary forms, with or 
 * without modification, are permitted provided that the following conditions 
 * are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this 
 * list of conditions and the following disclaimer.
 * 
 * Redistributions in binary form must reproduce the above copyright notice, 
 * this list of conditions and the following disclaimer in the documentation 
 * and/or other materials provided with the distribution.
 * 
 * Neither the name of Baidu Inc. nor the names of its contributors may be used
 * to endorse or promote products derived from this software without specific 
 * prior written permission of Baidu Inc.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 * POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * zrender: core核心类
 *
 * @desc zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(
    'zrender/zrender',['require','./lib/excanvas','./shape','./shape/circle','./shape/ellipse','./shape/line','./shape/polygon','./shape/brokenLine','./shape/rectangle','./shape/ring','./shape/sector','./shape/text','./shape/heart','./shape/droplet','./shape/path','./shape/image','./shape/beziercurve','./shape/star','./shape/isogon','./animation/animation','./tool/util','./tool/util','./config','./tool/loadingEffect','./tool/loadingEffect','./config','./tool/event'],function(require) {
        /*
         * HTML5 Canvas for Internet Explorer!
         * Modern browsers like Firefox, Safari, Chrome and Opera support
         * the HTML5 canvas tag to allow 2D command-based drawing.
         * ExplorerCanvas brings the same functionality to Internet Explorer.
         * To use, web developers only need to include a single script tag
         * in their existing web pages.
         *
         * https://code.google.com/p/explorercanvas/
         * http://explorercanvas.googlecode.com/svn/trunk/excanvas.js
         */
        // 核心代码会生成一个全局变量 G_vmlCanvasManager，模块改造后借用于快速判断canvas支持
        require('./lib/excanvas');

        var self = {};
        var zrender = self;     // 提供MVC内部反向使用静态方法；

        var _idx = 0;           //ZRender instance's id
        var _instances = {};    //ZRender实例map索引

        /**
         * zrender初始化
         * 不让外部直接new ZRender实例，为啥？
         * 不为啥，提供全局可控同时减少全局污染和降低命名冲突的风险！
         *
         * @param {HTMLElement} dom dom对象，不帮你做document.getElementById了
         * @param {Object=} params 个性化参数，如自定义shape集合，带进来就好
         *
         * @return {ZRender} ZRender实例
         */
        self.init = function(dom, params) {
            var zi = new ZRender(++_idx + '', dom, params || {});
            _instances[_idx] = zi;
            return zi;
        };

        /**
         * zrender实例销毁，记在_instances里的索引也会删除了
         * 管生就得管死，可以通过zrender.dispose(zi)销毁指定ZRender实例
         * 当然也可以直接zi.dispose()自己销毁
         *
         * @param {ZRender=} zi ZRender对象，不传则销毁全部
         */
        self.dispose = function(zi) {
            if (zi) {
                zi.dispose();
            }
            else {
                for (var z in _instances) {
                    _instances[z].dispose();
                }
                _instances = {};
            }
            return self;
        };

        /**
         * 获取zrender实例
         *
         * @param {string} id ZRender对象索引
         */
        self.getInstance = function(id) {
            return _instances[id];
        };

        /**
         * 删除zrender实例，ZRender实例dispose时会调用，
         * 删除后getInstance则返回undefined
         * ps: 仅是删除，删除的实例不代表已经dispose了~~
         *     这是一个摆脱全局zrender.dispose()自动销毁的后门，
         *     take care of yourself~
         *
         * @param {string} id ZRender对象索引
         */
        self.delInstance = function(id) {
            if (_instances[id]) {
                //只是对垃圾回收上的友好照顾，不写也大不了~
                _instances[id] = null;
                delete _instances[id];
            }
            return self;
        };

        // 是否异常捕获
        self.catchBrushException = false;

        /**
         * debug日志选项：catchBrushException为true下有效
         * 0 : 不生成debug数据，发布用
         * 1 : 异常抛出，调试用
         * 2 : 控制台输出，调试用
         */
        self.debugMode = 0;
        self.log = function() {
            if (self.debugMode === 0) {
                return;
            }
            else if (self.debugMode == 1) {
                for (var k in arguments) {
                    throw new Error(arguments[k]);
                }
            }
            else if (self.debugMode > 1) {
                for (var k in arguments) {
                    console.log(arguments[k]);
                }
            }

            return self;
        };

        /**
         * ZRender接口类，对外可用的所有接口都在这里！！
         * storage（M）、painter（V）、handler（C）为内部私有类，外部接口不可见
         * 非get接口统一返回self支持链式调用~
         *
         * @param {string} id 唯一标识
         * @param {HTMLElement} dom dom对象，不帮你做document.getElementById
         * @param {Object=} params 个性化参数，如自定义shape集合，带进来就好
         *
         * @return {ZRender} ZRender实例
         */
        function ZRender(id, dom, params) {
            var self = this;
            var shape = require('./shape');
            // 内置图形注册
            require('./shape/circle');
            require('./shape/ellipse');
            require('./shape/line');
            require('./shape/polygon');
            require('./shape/brokenLine');
            require('./shape/rectangle');
            require('./shape/ring');
            require('./shape/sector');
            require('./shape/text');
            require('./shape/heart');
            require('./shape/droplet');
            require('./shape/path');
            require('./shape/image');
            require('./shape/beziercurve');
            require('./shape/star');
            require('./shape/isogon');
            
            var shapeLibrary;

            if (typeof params.shape == 'undefined') {
                //默认图形库
                shapeLibrary = shape;
            }
            else {
                //自定义图形库，私有化，实例独占
                shapeLibrary = {};
                for (var s in params.shape) {
                    shapeLibrary[s] = params.shape[s];
                }
                shapeLibrary.get = function(name) {
                    return shapeLibrary[name] || shape.get(name);
                };
            }

            var storage = new Storage(shapeLibrary);
            var painter = new Painter(dom, storage, shapeLibrary);
            var handler = new Handler(dom, storage, painter, shapeLibrary);

            // 动画控制
            var Animation = require('./animation/animation');
            var animatingShapes = [];
            var animation = new Animation({
                stage : {
                    update : function(){
                        self.update(animatingShapes);
                    }
                }
            });
            animation.start();

            /**
             * 获取实例唯一标识
             */
            self.getId = function() {
                return id;
            };

            /**
             * 添加图形形状
             * @param {Object} shape 形状对象，可用属性全集，详见各shape
             */
            self.addShape = function(shape) {
                storage.add(shape);
                return self;
            };

            /**
             * 删除图形形状
             * @param {string} shapeId 形状对象唯一标识
             */
            self.delShape = function(shapeId) {
                storage.del(shapeId);
                return self;
            };

            /**
             * 修改图形形状
             * @param {string} shapeId 形状对象唯一标识
             * @param {Object} shape 形状对象
             */
            self.modShape = function(shapeId, shape) {
                storage.mod(shapeId, shape);
                return self;
            };

            /**
             * 添加额外高亮层显示，仅提供添加方法，每次刷新后高亮层图形均被清空
             * @param {Object} shape 形状对象
             */
            self.addHoverShape = function(shape) {
                storage.addHover(shape);
                return self;
            };

            /**
             * 渲染
             * @param {Function} callback  渲染结束后回调函数
             * todo:增加缓动函数
             */
            self.render = function(callback) {
                painter.render(callback);
                return self;
            };

            /**
             * 视图更新
             * @param {Function} callback  视图更新后回调函数
             */
            self.refresh = function(callback) {
                painter.refresh(callback);
                return self;
            };

            /**
             * 视图更新
             * @param {Array} shapeList 需要更新的图形元素列表
             * @param {Function} callback  视图更新后回调函数
             */
            self.update = function(shapeList, callback) {
                painter.update(shapeList, callback);
                return self;
            };

            self.resize = function() {
                painter.resize();
                return self;
            };

            /**
             * 动画
             * @param {string} shapeId 形状对象唯一标识
             * @param {string} path 需要添加动画的属性获取路径，可以通过a.b.c来获取深层的属性
             * @param {boolean} loop 动画是否循环
             * @return {Object} 动画的Deferred对象
             * Example:
             * zr.animate( circleId, 'style', false)
             *   .when(1000, { x: 10} )
             *   .done( function(){ console.log('Animation done')})
             *   .start()
             */
            self.animate = function(shapeId, path, loop) {
                var util = require('./tool/util');
                var shape = storage.get(shapeId);
                if (shape) {
                    var target;
                    if (path) {
                        var pathSplitted = path.split('.');
                        var prop = shape;
                        for (var i = 0, l = pathSplitted.length; i < l; i++) {
                            if (!prop) {
                                continue;
                            }
                            prop = prop[pathSplitted[i]];
                        }
                        if (prop) {
                            target = prop;
                        }
                    }
                    else {
                        target = shape;
                    }
                    if (!target) {
                        zrender.log(
                            'Property "'
                            + path
                            + '" is not existed in shape '
                            + shapeId
                        );
                        return;
                    }

                    if( typeof(shape.__aniCount) === 'undefined'){
                        // 正在进行的动画记数
                        shape.__aniCount = 0;
                    }
                    if( shape.__aniCount === 0 ){
                        animatingShapes.push(shape);
                    }
                    shape.__aniCount ++;

                    return animation.animate(target, loop)
                        .done(function() {
                            shape.__aniCount --;
                            if( shape.__aniCount === 0){
                                // 从animatingShapes里移除
                                var idx = util.indexOf(animatingShapes, shape);
                                animatingShapes.splice(idx, 1);
                            }
                        });
                }
                else {
                    zrender.log('Shape "'+ shapeId + '" not existed');
                }
            };

            /**
             * loading显示
             * @param  {Object} loadingOption 参数
             * {
             *     effect,
             *     //loading话术
             *     text:'',
             *     // 水平安放位置，默认为 'center'，可指定x坐标
             *     x:'center' || 'left' || 'right' || {number},
             *     // 垂直安放位置，默认为'top'，可指定y坐标
             *     y:'top' || 'bottom' || {number},
             *
             *     textStyle:{
             *         textFont: 'normal 20px Arial' || {textFont}, //文本字体
             *         color: {color}
             *     }
             * }
             */
            self.showLoading = function(loadingOption) {
                painter.showLoading(loadingOption);
                return self;
            };

            /**
             * loading结束
             */
            self.hideLoading = function() {
                painter.hideLoading();
                return self;
            };

            /**
             * 生成形状唯一ID
             * @param {string} [idPrefix] id前缀
             * @return {string} 不重复ID
             */
            self.newShapeId = function(idPrefix) {
                return storage.newShapeId(idPrefix);
            };

            /**
             * 获取视图宽度
             */
            self.getWidth = function() {
                return painter.getWidth();
            };

            /**
             * 获取视图高度
             */
            self.getHeight = function() {
                return painter.getHeight();
            };

            /**
             * 图像导出 
             */
            self.toDataURL = function(type, args) {
                return painter.toDataURL(type, args);
            };
            /**
             * 事件绑定
             * @param {string} eventName 事件名称
             * @param {Function} eventHandler 响应函数
             */
            self.on = function(eventName, eventHandler) {
                handler.on(eventName, eventHandler);
                return self;
            };

            /**
             * 事件解绑定，参数为空则解绑所有自定义事件
             * @param {string} eventName 事件名称
             * @param {Function} eventHandler 响应函数
             */
            self.un = function(eventName, eventHandler) {
                handler.un(eventName, eventHandler);
                return self;
            };

            /**
             * 清除当前ZRender下所有类图的数据和显示，clear后MVC和已绑定事件均还存在在，ZRender可用
             */
            self.clear = function() {
                storage.del();
                painter.clear();
                return self;
            };

            /**
             * 释放当前ZR实例（删除包括dom，数据、显示和事件绑定），dispose后ZR不可用
             */
            self.dispose = function() {
                animation.stop();
                animation = null;
                animatingShapes = null;

                self.clear();
                self = null;

                storage.dispose();
                storage = null;

                painter.dispose();
                painter = null;

                handler.dispose();
                handler = null;

                //释放后告诉全局删除对自己的索引，没想到啥好方法
                zrender.delInstance(id);

                return;
            };
        }

        /**
         * 内容仓库 (M)
         * @param {Object} shape 图形库
         */
        function Storage(shape) {
            var util = require('./tool/util');
            var self = this;

            var _idBase = 0;            //图形数据id自增基础

            // 所有常规形状，id索引的map
            var _elements = {};

            // 所有形状的z轴方向排列，提高遍历性能，zElements[0]的形状在zElements[1]形状下方
            var _zElements = [];

            // 高亮层形状，不稳定，动态增删，数组位置也是z轴方向，靠前显示在下方
            var _hoverElements = [];

            var _maxZlevel = 0;         // 最大zlevel
            var _changedZlevel = {};    // 有数据改变的zlevel

            /**
             * 快速判断标志~
             * e.__silent 是否需要hover判断
             * e.__needTransform 是否需要进行transform
             * e.style.__rect 区域矩阵缓存，修改后清空，重新计算一次
             */
            function _mark(e) {
                if (e.hoverable || e.onclick || e.draggable
                    || e.onmousemove || e.onmouseover || e.onmouseout
                    || e.onmousedown || e.onmouseup
                    || e.ondragenter || e.ondragover || e.ondragleave
                    || e.ondrop
                ) {
                    e.__silent = false;
                }
                else {
                    e.__silent = true;
                }

                if (Math.abs(e.rotation[0]) > 0.0001
                    || Math.abs(e.position[0]) > 0.0001
                    || Math.abs(e.position[1]) > 0.0001
                    || Math.abs(e.scale[0] - 1) > 0.0001
                    || Math.abs(e.scale[1] - 1) > 0.0001
                ) {
                    e.__needTransform = true;
                }
                else {
                    e.__needTransform = false;
                }

                e.style = e.style || {};
                e.style.__rect = null;
            }

            /**
             * 唯一标识id生成
             * @param {string=} idHead 标识前缀
             */
            function newShapeId(idHead) {
                return (idHead || '') + (++_idBase);
            }

            /**
             * 添加
             * @param {Object} params 参数
             */
            function add(params) {
                // 默认&必须的参数
                var e = {
                    'shape': 'circle',                      // 形状
                    'id': params.id || self.newShapeId(),   // 唯一标识
                    'zlevel': 0,                            // z轴位置
                    'draggable': false,                     // draggable可拖拽
                    'clickable': false,                     // clickable可点击响应
                    'hoverable': true,                      // hoverable可悬浮响应
                    'position': [0, 0],
                    'rotation' : [0, 0, 0],
                    'scale' : [1, 1, 0, 0]
                };
                util.merge(
                    e,
                    params,
                    {
                        'overwrite': true,
                        'recursive': true
                    }
                );
                _mark(e);
                _elements[e.id] = e;
                _zElements[e.zlevel] = _zElements[e.zlevel] || [];
                _zElements[e.zlevel].push(e);

                _maxZlevel = Math.max(_maxZlevel,e.zlevel);
                _changedZlevel[e.zlevel] = true;

                return self;
            }

            /**
             * 根据指定的shapeId获取相应的shape属性
             * @param {string=} idx 唯一标识
             */
            function get(shapeId) {
                return _elements[shapeId];
            }

            /**
             * 删除，shapeId不指定则全清空
             * @param {string= | Array} idx 唯一标识
             */
            function del(shapeId) {
                if (typeof shapeId != 'undefined') {
                    var delMap = {};
                    if (!(shapeId instanceof Array)) {
                        // 单个
                        delMap[shapeId] = true;
                    }
                    else {
                        // 批量删除
                        for (var i = 0, l = shapeId.length; i < l; i++) {
                            delMap[shapeId[i].id] = true;
                        }
                    }
                    var newList;
                    var oldList;
                    var zlevel;
                    var zChanged = {};
                    for (var sId in delMap) {
                        if (_elements[sId]) {
                            zlevel = _elements[sId].zlevel;
                            _changedZlevel[zlevel] = true;
                            if (!zChanged[zlevel]) {
                                oldList = _zElements[zlevel];
                                newList = [];
                                for (var i = 0, l = oldList.length; i < l; i++){
                                    if (!delMap[oldList[i].id]) {
                                        newList.push(oldList[i]);
                                    }
                                }
                                _zElements[zlevel] = newList;
                                zChanged[zlevel] = true;
                            }
                            delete _elements[sId];
                        }
                    }
                }
                else{
                    //不指定shapeId清空
                    _elements = {};
                    _zElements = [];
                    _hoverElements = [];
                    _maxZlevel = 0;         //最大zlevel
                    _changedZlevel = {      //有数据改变的zlevel
                        all : true
                    };
                }

                return self;
            }

            /**
             * 修改
             * @param {string} idx 唯一标识
             * @param {Object} params]参数
             */
            function mod(shapeId, params) {
                var e = _elements[shapeId];
                if (e) {
                    _changedZlevel[e.zlevel] = true;    // 可能修改前后不在一层
                    util.merge(
                        e,
                        params,
                        {
                            'overwrite': true,
                            'recursive': true
                        }
                    );
                    _mark(e);
                    _changedZlevel[e.zlevel] = true;    // 可能修改前后不在一层
                    _maxZlevel = Math.max(_maxZlevel,e.zlevel);
                }

                return self;
            }

            /**
             * 常规形状位置漂移，形状自身定义漂移函数
             * @param {string} idx 形状唯一标识
             *
             */
            function drift(shapeId, dx, dy) {
                var e = _elements[shapeId];
                if (!e) {
                    return;
                }
                e.__needTransform = true;
                if (!e.ondrift //ondrift
                    //有onbrush并且调用执行返回false或undefined则继续
                    || (e.ondrift && !e.ondrift(e, dx, dy))
                ) {
                    if (zrender.catchBrushException) {
                        try {
                            shape.get(e.shape).drift(e, dx, dy);
                        }
                        catch(error) {
                            zrender.log(error, 'drift error of ' + e.shape, e);
                        }
                    }
                    else {
                        shape.get(e.shape).drift(e, dx, dy);
                    }
                }

                _changedZlevel[e.zlevel] = true;

                return self;
            }

            /**
             * 添加高亮层数据
             * @param {Object} params 参数
             */
            function addHover(params) {
                if ((params.rotation && Math.abs(params.rotation[0]) > 0.0001)
                    || (params.position
                        && (Math.abs(params.position[0]) > 0.0001
                            || Math.abs(params.position[1]) > 0.0001))
                    || (params.scale
                        && (Math.abs(params.scale[0] - 1) > 0.0001
                        || Math.abs(params.scale[1] - 1) > 0.0001))
                ) {
                    params.__needTransform = true;
                }
                else {
                    params.__needTransform = false;
                }

                _hoverElements.push(params);
                return self;
            }

            /**
             * 删除高亮层数据
             */
            function delHover() {
                _hoverElements = [];
                return self;
            }

            function hasHoverShape() {
                return _hoverElements.length > 0;
            }

            /**
             * 遍历迭代器
             * @param {Function} fun 迭代回调函数，return true终止迭代
             * @param {Object=} option 迭代参数，缺省为仅降序遍历常规形状
             *     hover : true 是否迭代高亮层数据
             *     normal : 'down' | 'up' | 'free' 是否迭代常规数据，迭代时是否指定及z轴顺序
             */
            function iterShape(fun, option) {
                if (!option) {
                    option = {
                        hover: false,
                        normal: 'down'
                    };
                }
                if (option.hover) {
                    //高亮层数据遍历
                    for (var i = 0, l = _hoverElements.length; i < l; i++) {
                        if (fun(_hoverElements[i])) {
                            return self;
                        }
                    }
                }

                var zlist;
                var len;
                if (typeof option.normal != 'undefined') {
                    //z轴遍历: 'down' | 'up' | 'free'
                    switch (option.normal) {
                        case 'down':
                            //降序遍历，高层优先
                            for (var l = _zElements.length - 1; l >= 0; l--) {
                                zlist = _zElements[l];
                                if (zlist) {
                                    len = zlist.length;
                                    while (len--) {
                                        if (fun(zlist[len])) {
                                            return self;
                                        }
                                    }
                                }
                            }
                            break;
                        case 'up':
                            //升序遍历，底层优先
                            for (var i = 0, l = _zElements.length; i < l; i++) {
                                zlist = _zElements[i];
                                if (zlist) {
                                    len = zlist.length;
                                    for (var k = 0; k < len; k++) {
                                        if (fun(zlist[k])) {
                                            return self;
                                        }
                                    }
                                }
                            }
                            break;
                        // case 'free':
                        default:
                            //无序遍历
                            for (var i in _elements) {
                                if (fun(_elements[i])) {
                                    return self;
                                }
                            }
                            break;
                    }
                }

                return self;
            }

            function getMaxZlevel() {
                return _maxZlevel;
            }

            function getChangedZlevel() {
                return _changedZlevel;
            }

            function clearChangedZlevel() {
                _changedZlevel = {};
                return self;
            }

            function setChangedZlevle(level){
                _changedZlevel[level] = true;
                return self;
            }

            /**
             * 释放
             */
            function dispose() {
                _elements = null;
                _zElements = null;
                _hoverElements = null;
                self = null;

                return;
            }

            self.newShapeId = newShapeId;
            self.add = add;
            self.get = get;
            self.del = del;
            self.addHover = addHover;
            self.delHover = delHover;
            self.hasHoverShape = hasHoverShape;
            self.mod = mod;
            self.drift = drift;
            self.iterShape = iterShape;
            self.getMaxZlevel = getMaxZlevel;
            self.getChangedZlevel = getChangedZlevel;
            self.clearChangedZlevel = clearChangedZlevel;
            self.setChangedZlevle = setChangedZlevle;
            self.dispose = dispose;
        }

        /**
         * 绘图类 (V)
         * @param {HTMLElement} root 绘图区域
         * @param {storage} storage Storage实例
         * @param {Object} shape 图形库
         */
        function Painter(root, storage, shape) {
            var config = require('./config');
            var self = this;

            var _domList = {};              //canvas dom元素
            var _ctxList = {};              //canvas 2D context对象，与domList对应

            var _maxZlevel = 0;             //最大zlevel，缓存记录
            var _loadingTimer;

            var _domRoot = document.createElement('div');
            // 避免页面选中的尴尬
            _domRoot.onselectstart = function() {
                return false;
            };

            //宽，缓存记录
            var _width;
            //高，缓存记录
            var _height;

            //retina 屏幕优化
            var _devicePixelRatio = window.devicePixelRatio || 1;

            function _getWidth() {
                var stl = root.currentStyle
                          || document.defaultView.getComputedStyle(root);

                return root.clientWidth
                       - stl.paddingLeft.replace(/\D/g,'')   // 请原谅我这比较粗暴
                       - stl.paddingRight.replace(/\D/g,'');
            }

            function _getHeight(){
                var stl = root.currentStyle
                          || document.defaultView.getComputedStyle(root);

                return root.clientHeight
                       - stl.paddingTop.replace(/\D/g,'')    // 请原谅我这比较粗暴
                       - stl.paddingBottom.replace(/\D/g,'');
            }

            function _init() {
                _domRoot.innerHTML = '';
                root.innerHTML = '';

                _width = _getWidth();
                _height = _getHeight();

                //没append呢，原谅我这样写，清晰~
                _domRoot.style.position = 'relative';
                _domRoot.style.overflow = 'hidden';
                _domRoot.style.width = _width + 'px';
                _domRoot.style.height = _height + 'px';

                root.appendChild(_domRoot);

                _domList = {};
                _ctxList = {};

                _maxZlevel = storage.getMaxZlevel();

                //创建各层canvas
                //背景
                _domList['bg'] = _createDom('bg','div');
                _domRoot.appendChild(_domList['bg']);

                //实体
                for (var i = 0; i <= _maxZlevel; i++) {
                    _domList[i] = _createDom(i,'canvas');
                    _domRoot.appendChild(_domList[i]);
                    if (G_vmlCanvasManager) {
                        G_vmlCanvasManager.initElement(_domList[i]);
                    }
                    _ctxList[i] = _domList[i].getContext('2d');
                    _devicePixelRatio != 1 
                    && _ctxList[i].scale(_devicePixelRatio, _devicePixelRatio);
                }

                //高亮
                _domList['hover'] = _createDom('hover','canvas');
                _domList['hover'].id = '_zrender_hover_';
                _domRoot.appendChild(_domList['hover']);
                if (G_vmlCanvasManager) {
                    G_vmlCanvasManager.initElement(_domList['hover']);
                }
                _ctxList['hover'] = _domList['hover'].getContext('2d');
                _devicePixelRatio != 1 
                && _ctxList['hover'].scale(
                       _devicePixelRatio, _devicePixelRatio
                   );
            }

            /**
             * 检查_maxZlevel是否变大，如是则同步创建需要的Canvas
             */
            function _syncMaxZlevelCanvase(){
                var curMaxZlevel = storage.getMaxZlevel();
                if (_maxZlevel < curMaxZlevel) {
                    //实体
                    for (var i = _maxZlevel + 1; i <= curMaxZlevel; i++) {
                        _domList[i] = _createDom(i,'canvas');
                        _domRoot.insertBefore(_domList[i], _domList['hover']);
                        if (G_vmlCanvasManager) {
                            G_vmlCanvasManager.initElement(_domList[i]);
                        }
                        _ctxList[i] = _domList[i].getContext('2d');
                        _devicePixelRatio != 1 
                        && _ctxList[i].scale(
                               _devicePixelRatio, _devicePixelRatio
                           );
                    }
                    _maxZlevel = curMaxZlevel;
                }
            }

            /**
             * 创建dom
             * @param {string} id dom id 待用
             * @param {string} type : dom type， such as canvas, div etc.
             */
            function _createDom(id, type) {
                var newDom = document.createElement(type);

                //没append呢，请原谅我这样写，清晰~
                newDom.style.position = 'absolute';
                newDom.style.left = 0;
                newDom.style.top = 0;
                newDom.style.width = _width + 'px';
                newDom.style.height = _height + 'px';
                newDom.setAttribute('width', _width * _devicePixelRatio);
                newDom.setAttribute('height', _height * _devicePixelRatio);
                //id不作为索引用，避免可能造成的重名，定义为私有属性
                newDom.setAttribute('data-id', id);
                return newDom;
            }

            /**
             * 刷画图形
             * @param {Object} changedZlevel 需要更新的zlevel索引
             */
            function _brush(changedZlevel) {
                return function(e) {
                    if ((changedZlevel.all || changedZlevel[e.zlevel])
                        && !e.invisible
                    ) {
                        var ctx = _ctxList[e.zlevel];
                        if (ctx) {
                            if (!e.onbrush //没有onbrush
                                //有onbrush并且调用执行返回false或undefined则继续粉刷
                                || (e.onbrush && !e.onbrush(ctx, e, false))
                            ) {
                                if (zrender.catchBrushException) {
                                    try {
                                        shape.get(e.shape).brush(
                                            ctx, e, false, update
                                        );
                                    }
                                    catch(error) {
                                        zrender.log(
                                            error,
                                            'brush error of ' + e.shape,
                                            e
                                        );
                                    }
                                }
                                else {
                                    shape.get(e.shape).brush(
                                        ctx, e, false, update
                                    );
                                }
                            }
                        }
                        else {
                            zrender.log(
                                'can not find the specific zlevel canvas!'
                            );
                        }
                    }
                };
            }

            /**
             * 鼠标悬浮刷画
             */
            function _brushHover(e) {
                var ctx = _ctxList['hover'];
                if (!e.onbrush //没有onbrush
                    //有onbrush并且调用执行返回false或undefined则继续粉刷
                    || (e.onbrush && !e.onbrush(ctx, e, true))
                ) {
                    // Retina 优化
                    if (zrender.catchBrushException) {
                        try {
                            shape.get(e.shape).brush(ctx, e, true, update);
                        }
                        catch(error) {
                            zrender.log(
                                error, 'hoverBrush error of ' + e.shape, e
                            );
                        }
                    }
                    else {
                        shape.get(e.shape).brush(ctx, e, true, update);
                    }
                }
            }

            /**
             * 首次绘图，创建各种dom和context
             * @param {Function=} callback 绘画结束后的回调函数
             */
            function render(callback) {
                if (isLoading()) {
                    hideLoading();
                }
                //检查_maxZlevel是否变大，如是则同步创建需要的Canvas
                _syncMaxZlevelCanvase();

                //升序遍历，shape上的zlevel指定绘画图层的z轴层叠
                storage.iterShape(
                    _brush({ all : true }),
                    { normal: 'up' }
                );

                //update到最新则清空标志位
                storage.clearChangedZlevel();

                if (typeof callback == 'function') {
                    callback();
                }

                return self;
            }

            /**
             * 刷新
             * @param {Function=} callback 刷新结束后的回调函数
             */
            function refresh(callback) {
                //检查_maxZlevel是否变大，如是则同步创建需要的Canvas
                _syncMaxZlevelCanvase();

                //仅更新有修改的canvas
                var changedZlevel = storage.getChangedZlevel();
                //擦除有修改的canvas
                if (changedZlevel.all){
                    clear();
                }
                else {
                    for (var k in changedZlevel) {
                        if (_ctxList[k]) {
                            _ctxList[k].clearRect(
                                0, 0, 
                                _width * _devicePixelRatio, 
                                _height * _devicePixelRatio
                            );
                        }
                    }
                }
                //重绘内容，升序遍历，shape上的zlevel指定绘画图层的z轴层叠
                storage.iterShape(
                    _brush(changedZlevel),
                    { normal: 'up'}
                );

                //update到最新则清空标志位
                storage.clearChangedZlevel();

                if (typeof callback == 'function') {
                    callback();
                }

                return self;
            }


            /**
             * 视图更新
             * @param {Array} shapeList 需要更新的图形元素列表
             * @param {Function} callback  视图更新后回调函数
             */
            function update(shapeList, callback) {
                var shape;
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    shape = shapeList[i];
                    storage.mod(shape.id, shape);
                }
                refresh(callback);
                return self;
            }

            /**
             * 清除hover层外所有内容
             */
            function clear() {
                for (var k in _ctxList) {
                    if (k == 'hover') {
                        continue;
                    }
                    _ctxList[k].clearRect(
                        0, 0, 
                        _width * _devicePixelRatio, 
                        _height * _devicePixelRatio
                    );
                }
                return self;
            }

            /**
             * 刷新hover层
             */
            function refreshHover() {
                clearHover();

                storage.iterShape(_brushHover, { hover: true });

                storage.delHover();

                return self;
            }

            /**
             * 清除hover层所有内容
             */
            function clearHover() {
                _ctxList
                && _ctxList['hover']
                && _ctxList['hover'].clearRect(
                    0, 0, 
                    _width * _devicePixelRatio, 
                    _height * _devicePixelRatio
                );

                return self;
            }

            /**
             * 显示loading
             * @param {Object} loadingOption 选项，内容见下
             * @param {color} -.backgroundColor 背景颜色
             * @param {Object} -.textStyle 文字样式，同shape/text.style
             * @param {number=} -.progress 进度参数，部分特效有用
             * @param {Object=} -.effectOption 特效参数，部分特效有用
             * @param {string | function} -.effect 特效依赖tool/loadingEffect，
             *                                     可传入自定义特效function
             */
            function showLoading(loadingOption) {
                var effect = require('./tool/loadingEffect');
                effect.stop(_loadingTimer);

                loadingOption = loadingOption || {};
                loadingOption.effect = loadingOption.effect
                                       || config.loadingEffect;
                loadingOption.canvasSize = {
                    width : _width,
                    height : _height
                };

                _loadingTimer = effect.start(
                    loadingOption,
                    storage.addHover,
                    refreshHover
                );
                self.loading = true;

                return self;
            }

            /**
             * loading结束
             * 乱来的，待重写
             */
            function hideLoading() {
                var effect = require('./tool/loadingEffect');
                effect.stop(_loadingTimer);
                clearHover();
                self.loading = false;
                return self;
            }

            /**
             * loading结束判断
             */
            function isLoading() {
                return self.loading;
            }

            /**
             * 获取绘图区域宽度
             */
            function getWidth() {
                return _width;
            }

            /**
             * 获取绘图区域高度
             */
            function getHeight() {
                return _height;
            }

            /**
             * 区域大小变化后重绘
             */
            function resize() {
                var width;
                var height;
                var dom;

                _domRoot.style.display = 'none';

                width = _getWidth();
                height = _getHeight();

                _domRoot.style.display = '';

                //优化没有实际改变的resize
                if (_width != width || height != _height){
                    _width = width;
                    _height = height;

                    _domRoot.style.width = _width + 'px';
                    _domRoot.style.height = _height + 'px';

                    for (var i in _domList) {
                        dom = _domList[i];
                        dom.setAttribute('width', _width);
                        dom.setAttribute('height', _height);
                        dom.style.width = _width + 'px';
                        dom.style.height = _height + 'px';
                    }

                    storage.setChangedZlevle('all');
                    refresh();
                }

                return self;
            }

            /**
             * 释放
             */
            function dispose() {
                if (isLoading()) {
                    hideLoading();
                }
                root.innerHTML = '';

                root = null;
                storage = null;
                shape = null;

                _domRoot = null;
                _domList = null;
                _ctxList = null;

                self = null;

                return;
            }

            function getDomHover() {
                return _domList['hover'];
            }

            function toDataURL(type, args) {
                if (G_vmlCanvasManager) {
                    return null;
                }
                var imageDom = _createDom('image','canvas');
                _domList['bg'].appendChild(imageDom);
                var ctx = imageDom.getContext('2d');
                _devicePixelRatio != 1 
                && ctx.scale(_devicePixelRatio, _devicePixelRatio);
                
                ctx.fillStyle = '#fff';
                ctx.rect(
                    0, 0, 
                    _width * _devicePixelRatio,
                    _height * _devicePixelRatio
                );
                ctx.fill();
                //升序遍历，shape上的zlevel指定绘画图层的z轴层叠
                storage.iterShape(
                    function (e) {
                        if (!e.invisible) {
                            if (!e.onbrush //没有onbrush
                                //有onbrush并且调用执行返回false或undefined则继续粉刷
                                || (e.onbrush && !e.onbrush(ctx, e, false))
                            ) {
                                if (zrender.catchBrushException) {
                                    try {
                                        shape.get(e.shape).brush(
                                            ctx, e, false, update
                                        );
                                    }
                                    catch(error) {
                                        zrender.log(
                                            error,
                                            'brush error of ' + e.shape,
                                            e
                                        );
                                    }
                                }
                                else {
                                    shape.get(e.shape).brush(
                                        ctx, e, false, update
                                    );
                                }
                            }
                        }
                    },
                    { normal: 'up' }
                );
                var image = imageDom.toDataURL(type, args); 
                ctx = null;
                _domList['bg'].removeChild(imageDom);
                return image;
            }
            
            self.render = render;
            self.refresh = refresh;
            self.update = update;
            self.clear = clear;
            self.refreshHover = refreshHover;
            self.clearHover = clearHover;
            self.showLoading = showLoading;
            self.hideLoading = hideLoading;
            self.isLoading = isLoading;
            self.getWidth = getWidth;
            self.getHeight = getHeight;
            self.resize = resize;
            self.dispose = dispose;
            self.getDomHover = getDomHover;
            self.toDataURL = toDataURL;
            _init();
        }

        /**
         * 控制类 (C)
         * @param {HTMLElement} root 绘图区域
         * @param {storage} storage Storage实例
         * @param {painter} painter Painter实例
         * @param {Object} shape 图形库
         *
         * 分发事件支持详见config.EVENT
         */
        function Handler(root, storage, painter, shape) {
            var config = require('./config');
            //添加事件分发器特性
            var eventTool = require('./tool/event');
            eventTool.Dispatcher.call(this);

            var self = this;

            //常用函数加速
            var getX = eventTool.getX;
            var getY = eventTool.getY;

            //各种事件标识的私有变量
            var _event;                         //原生dom事件
            var _hasfound = false;              //是否找到hover图形元素
            var _lastHover = null;              //最后一个hover图形元素
            var _mouseDownTarget = null;
            var _draggingTarget = null;         //当前被拖拽的图形元素
            var _isMouseDown = false;
            var _isDragging = false;
            var _lastTouchMoment;

            var _lastX = 0;
            var _lastY = 0;
            var _mouseX = 0;
            var _mouseY = 0;


            var _domHover = painter.getDomHover();

            /**
             * 初始化，事件绑定，支持的所有事件都由如下原生事件计算得来
             */
            function _init() {
                if (window.addEventListener) {
                    window.addEventListener('resize', _resizeHandler);

                    root.addEventListener('click', _clickHandler);
                    root.addEventListener('mousewheel', _mouseWheelHandler);
                    root.addEventListener('DOMMouseScroll', _mouseWheelHandler);
                    root.addEventListener('mousemove', _mouseMoveHandler);
                    root.addEventListener('mouseout', _mouseOutHandler);
                    root.addEventListener('mousedown', _mouseDownHandler);
                    root.addEventListener('mouseup', _mouseUpHandler);

                    // mobile支持
                    root.addEventListener('touchstart', _touchStartHandler);
                    root.addEventListener('touchmove', _touchMoveHandler);
                    root.addEventListener('touchend', _touchEndHandler);
                }
                else {
                    window.attachEvent('onresize', _resizeHandler);

                    root.attachEvent('onclick', _clickHandler);
                    root.attachEvent('onmousewheel', _mouseWheelHandler);
                    root.attachEvent('onmousemove', _mouseMoveHandler);
                    root.attachEvent('onmouseout', _mouseOutHandler);
                    root.attachEvent('onmousedown', _mouseDownHandler);
                    root.attachEvent('onmouseup', _mouseUpHandler);
                }
            }

            /**
             * 窗口大小改变响应函数
             * @param {event} event dom事件对象
             */
            function _resizeHandler(event) {
                _event = event || window.event;
                _lastHover = null;
                _isMouseDown = false;
                //分发config.EVENT.RESIZE事件，global
                self.dispatch(config.EVENT.RESIZE, _event);
            }

            /**
             * 点击事件
             * @param {event} event dom事件对象
             */
            function _clickHandler(event) {
                _event = _zrenderEventFixed(event);
                //分发config.EVENT.CLICK事件
                if (!_lastHover) {
                    _dispatchAgency(_lastHover, config.EVENT.CLICK);
                }
                else if (_lastHover && _lastHover.clickable) {
                    _dispatchAgency(_lastHover, config.EVENT.CLICK);
                }
                _mouseMoveHandler(_event);
            }

            /**
             * 鼠标滚轮响应函数
             * @param {event} event dom事件对象
             */
            function _mouseWheelHandler(event) {
                _event = _zrenderEventFixed(event);
                //分发config.EVENT.MOUSEWHEEL事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEWHEEL);
                _mouseMoveHandler(_event);
            }

            /**
             * 鼠标（手指）移动响应函数
             * @param {event} event dom事件对象
             */
            function _mouseMoveHandler(event) {
                if (painter.isLoading()) {
                    return;
                }
                _event = _zrenderEventFixed(event);
                _lastX = _mouseX;
                _lastY = _mouseY;
                _mouseX = getX(_event);
                _mouseY = getY(_event);

                // 可能出现config.EVENT.DRAGSTART事件
                // 避免手抖点击误认为拖拽
                //if (_mouseX - _lastX > 1 || _mouseY - _lastY > 1) {
                    _dragStartHandler();
                //}

                _hasfound = false;
                storage.iterShape(_findHover, { normal: 'down'});

                //找到的在迭代函数里做了处理，没找到得在迭代完后处理
                if (!_hasfound) {
                    //过滤首次拖拽产生的mouseout和dragLeave
                    if (!_draggingTarget
                        || (_lastHover && _lastHover.id != _draggingTarget.id)
                    ) {
                        //可能出现config.EVENT.MOUSEOUT事件
                        _outShapeHandler();

                        //可能出现config.EVENT.DRAGLEAVE事件
                        _dragLeaveHandler();
                    }

                    _lastHover = null;
                    storage.delHover();
                    painter.clearHover();
                }
                //如果存在拖拽中元素，被拖拽的图形元素最后addHover
                if (_draggingTarget) {
                    storage.drift(
                        _draggingTarget.id,
                        _mouseX - _lastX,
                        _mouseY - _lastY
                    );
                    storage.addHover(_draggingTarget);
                }

                if (_draggingTarget || (_hasfound && _lastHover.draggable)) {
                    root.style.cursor = 'move';
                }
                else if (_hasfound && _lastHover.clickable) {
                    root.style.cursor = 'pointer';
                }
                else {
                    root.style.cursor = 'default';
                }

                //分发config.EVENT.MOUSEMOVE事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEMOVE);

                if (_draggingTarget || _hasfound || storage.hasHoverShape()) {
                    painter.refreshHover();
                }
            }

            /**
             * 鼠标（手指）离开响应函数
             * @param {event} event dom事件对象
             */
            function _mouseOutHandler(event) {
                _event = _zrenderEventFixed(event);

                var element = _event.toElement || _event.relatedTarget;
                if (element != root) {
                    while (element && element.nodeType != 9) {
                        if (element == root) {
                            // 忽略包含在root中的dom引起的mouseOut
                            _mouseMoveHandler(event);
                            return;
                        }
                        element = element.parentNode;
                    }
                }
                _event.zrenderX = _lastX;
                _event.zrenderY = _lastY;
                root.style.cursor = 'default';
                _isMouseDown = false;

                _outShapeHandler();
                _dropHandler();
                _dragEndHandler();
                if (!painter.isLoading()) {
                    painter.refreshHover();
                }
                
                self.dispatch(config.EVENT.GLOBALOUT, _event);
            }

            /**
             * 鼠标在某个图形元素上移动
             */
            function _overShapeHandler() {
                //分发config.EVENT.MOUSEOVER事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEOVER);
            }

            /**
             * 鼠标离开某个图形元素
             */
            function _outShapeHandler() {
                //分发config.EVENT.MOUSEOUT事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEOUT);
            }

            /**
             * 鼠标（手指）按下响应函数
             * @param {event} event dom事件对象
             */
            function _mouseDownHandler(event) {
                _event = _zrenderEventFixed(event);
                _isMouseDown = true;
                //分发config.EVENT.MOUSEDOWN事件
                _mouseDownTarget = _lastHover;
                _dispatchAgency(_lastHover, config.EVENT.MOUSEDOWN);
            }

            /**
             * 鼠标（手指）抬起响应函数
             * @param {event} event dom事件对象
             */
            function _mouseUpHandler(event) {
                _event = _zrenderEventFixed(event);
                root.style.cursor = 'default';
                _isMouseDown = false;
                _mouseDownTarget = null;

                //分发config.EVENT.MOUSEUP事件
                _dispatchAgency(_lastHover, config.EVENT.MOUSEUP);
                _dropHandler();
                _dragEndHandler();
            }

            /**
             * Touch开始响应函数
             * @param {event} event dom事件对象
             */
            function _touchStartHandler(event) {
                //eventTool.stop(event);// 阻止浏览器默认事件，重要
                _event = _zrenderEventFixed(event, true);
                _lastTouchMoment = new Date();
                _mouseDownHandler(_event);
            }

            /**
             * Touch移动响应函数
             * @param {event} event dom事件对象
             */
            function _touchMoveHandler(event) {
                _event = _zrenderEventFixed(event, true);
                _mouseMoveHandler(_event);
                if (_isDragging) {
                    eventTool.stop(event);// 阻止浏览器默认事件，重要
                }
            }

            /**
             * Touch结束响应函数
             * @param {event} event dom事件对象
             */
            function _touchEndHandler(event) {
                //eventTool.stop(event);// 阻止浏览器默认事件，重要
                _event = _zrenderEventFixed(event, true);
                _mouseUpHandler(_event);
                painter.clearHover();

                if (new Date() - _lastTouchMoment
                    < config.EVENT.touchClickDelay
                ) {
                    _lastHover = null;
                    _mouseX = _event.zrenderX;
                    _mouseY = _event.zrenderY;
                    // touch有指尖错觉，四向尝试，让touch上的点击更好触发事件
                    storage.iterShape(_findHover, { normal: 'down'});
                    if (!_lastHover) {
                        _mouseX += 10;
                        storage.iterShape(_findHover, { normal: 'down'});
                    }
                    if (!_lastHover) {
                        _mouseX -= 20;
                        storage.iterShape(_findHover, { normal: 'down'});
                    }
                    if (!_lastHover) {
                        _mouseX += 10;
                        _mouseY += 10;
                        storage.iterShape(_findHover, { normal: 'down'});
                    }
                    if (!_lastHover) {
                        _mouseY -= 20;
                        storage.iterShape(_findHover, { normal: 'down'});
                    }
                    if (_lastHover) {
                        _event.zrenderX = _mouseX;
                        _event.zrenderY = _mouseY;
                    }
                    _clickHandler(_event);
                }
            }

            /**
             * 拖拽开始
             */
            function _dragStartHandler() {
                if (_isMouseDown
                    && _lastHover
                    && _lastHover.draggable
                    && !_draggingTarget
                    && _mouseDownTarget == _lastHover
                ) {
                    _draggingTarget = _lastHover;
                    _isDragging = true;

                    _draggingTarget.invisible = true;
                    storage.mod(_draggingTarget.id,_draggingTarget);

                    //分发config.EVENT.DRAGSTART事件
                    _dispatchAgency(
                        _draggingTarget,
                        config.EVENT.DRAGSTART
                    );
                    painter.refresh();
                }
            }

            /**
             * 拖拽进入目标元素
             */
            function _dragEnterHandler() {
                if (_draggingTarget) {
                    //分发config.EVENT.DRAGENTER事件
                    _dispatchAgency(
                        _lastHover,
                        config.EVENT.DRAGENTER,
                        _draggingTarget
                    );
                }
            }

            /**
             * 拖拽在目标元素上移动
             */
            function _dragOverHandler() {
                if (_draggingTarget) {
                    //分发config.EVENT.DRAGOVER事件
                    _dispatchAgency(
                        _lastHover,
                        config.EVENT.DRAGOVER,
                        _draggingTarget
                    );
                }
            }

            /**
             * 拖拽离开目标元素
             */
            function _dragLeaveHandler() {
                if (_draggingTarget) {
                    //分发config.EVENT.DRAGLEAVE事件
                    _dispatchAgency(
                        _lastHover,
                        config.EVENT.DRAGLEAVE,
                        _draggingTarget
                    );
                }
            }

            /**
             * 拖拽在目标元素上完成
             */
            function _dropHandler() {
                if (_draggingTarget) {
                    _draggingTarget.invisible = false;
                    storage.mod(_draggingTarget.id,_draggingTarget);
                    painter.refresh();
                    //分发config.EVENT.DROP事件
                    _dispatchAgency(
                        _lastHover,
                        config.EVENT.DROP,
                        _draggingTarget
                    );
                }
            }

            /**
             * 拖拽结束
             */
            function _dragEndHandler() {
                if (_draggingTarget) {
                    //分发config.EVENT.DRAGEND事件
                    _dispatchAgency(
                        _draggingTarget,
                        config.EVENT.DRAGEND
                    );
                    _lastHover = null;
                }
                _isDragging = false;
                _draggingTarget = null;
            }

            /**
             * 事件分发代理
             * @param {Object} targetShape 目标图形元素
             * @param {string} eventName 事件名称
             * @param {Object=} draggedShape 拖拽事件特有，当前被拖拽图形元素
             */
            function _dispatchAgency(targetShape, eventName, draggedShape) {
                var eventHandler = 'on' + eventName;
                var eventPacket = {
                    type : eventName,
                    event : _event,
                    target : targetShape
                };

                if (draggedShape) {
                    eventPacket.dragged = draggedShape;
                }

                if (targetShape) {
                    //“不存在shape级事件”或“存在shape级事件但事件回调返回非true”
                    if (!targetShape[eventHandler]
                        || !targetShape[eventHandler](eventPacket)
                    ) {
                        self.dispatch(
                            eventName,
                            _event,
                            eventPacket
                        );
                    }
                }
                else if (!draggedShape) {
                    //无hover目标，无拖拽对象，原生事件分发
                    self.dispatch(eventName, _event);
                }
            }

            /**
             * 迭代函数，查找hover到的图形元素并即时做些事件分发
             * @param {Object} e 图形元素
             */
            function _findHover(e) {
                if (_draggingTarget && _draggingTarget.id == e.id) {
                    //迭代到当前拖拽的图形上
                    return false;
                }

                //打酱油的路过，啥都不响应的shape~
                if (e.__silent) {
                    return false;
                }

                var shapeInstance = shape.get(e.shape);
                if (shapeInstance.isCover(e, _mouseX, _mouseY)) {
                    if (e.hoverable) {
                        storage.addHover(e);
                    }

                    if (_lastHover != e) {
                        _outShapeHandler();

                        //可能出现config.EVENT.DRAGLEAVE事件
                        _dragLeaveHandler();

                        _lastHover = e;

                        //可能出现config.EVENT.DRAGENTER事件
                        _dragEnterHandler();
                    }
                    _overShapeHandler();

                    //可能出现config.EVENT.DRAGOVER
                    _dragOverHandler();

                    _hasfound = true;

                    return true;    //找到则中断迭代查找
                }

                return false;
            }

            // 如果存在第三方嵌入的一些dom触发的事件，或touch事件，需要转换一下事件坐标
            function _zrenderEventFixed(event, isTouch) {
                if (!isTouch) {
                    _event = event || window.event;
                    // 进入对象优先~
                    var target = _event.toElement
                              || _event.relatedTarget
                              || _event.srcElement
                              || _event.target;
                    if (target && target != _domHover) {
                        _event.zrenderX = (typeof _event.offsetX != 'undefined'
                                          ? _event.offsetX
                                          : _event.layerX)
                                          + target.offsetLeft;
                        _event.zrenderY = (typeof _event.offsetY != 'undefined'
                                          ? _event.offsetY
                                          : _event.layerY)
                                          + target.offsetTop;
                    }
                }
                else {
                    _event = event;
                    var touch = _event.type != 'touchend'
                                ? _event.targetTouches[0]
                                : _event.changedTouches[0];
                    if (touch) {
                        // touch事件坐标是全屏的~
                        _event.zrenderX = touch.clientX - root.offsetLeft
                                          + document.body.scrollLeft;
                        _event.zrenderY = touch.clientY - root.offsetTop
                                          + document.body.scrollTop;
                    }
                }

                return _event;
            }

            /**
             * 自定义事件绑定
             * @param {string} eventName 事件名称，resize，hover，drag，etc~
             * @param {Function} handler 响应函数
             */
            function on(eventName, handler) {
                self.bind(eventName, handler);

                return self;
            }

            /**
             * 自定义事件解绑
             * @param {string} event 事件名称，resize，hover，drag，etc~
             * @param {Function} handler 响应函数
             */
            function un(eventName, handler) {
                self.unbind(eventName, handler);
                return self;
            }

            /**
             * 比较不可控，先不开放了~
             * 触发原生dom事件，用于自定义元素在顶层截获事件后触发zrender行为
             * @param {string} event 事件名称，resize，hover，drag，etc~
             * @param {event=} event event dom事件对象
            function trigger(eventName, event) {
                switch (eventName) {
                    case config.EVENT.RESIZE :
                        _resizeHandler(event);
                        break;
                    case config.EVENT.CLICK :
                        _clickHandler(event);
                        break;
                    case config.EVENT.MOUSEWHEEL :
                        _mouseWheelHandler(event);
                        break;
                    case config.EVENT.MOUSEMOVE :
                        _mouseMoveHandler(event);
                        break;
                    case config.EVENT.MOUSEDOWN :
                        _mouseDownHandler(event);
                        break;
                    case config.EVENT.MOUSEUP :
                        _mouseUpHandleru(event);
                        break;
                }
            }
             */

            /**
             * 释放
             */
            function dispose() {
                if (window.removeEventListener) {
                    window.removeEventListener('resize', _resizeHandler);

                    root.removeEventListener('click', _clickHandler);
                    root.removeEventListener('mousewheel', _mouseWheelHandler);
                    root.removeEventListener(
                        'DOMMouseScroll', _mouseWheelHandler
                    );
                    root.removeEventListener('mousemove', _mouseMoveHandler);
                    root.removeEventListener('mouseout', _mouseOutHandler);
                    root.removeEventListener('mousedown', _mouseDownHandler);
                    root.removeEventListener('mouseup', _mouseUpHandler);

                    // mobile支持
                    root.removeEventListener('touchstart', _touchStartHandler);
                    root.removeEventListener('touchmove', _touchMoveHandler);
                    root.removeEventListener('touchend', _touchEndHandler);
                }
                else {
                    window.detachEvent('onresize', _resizeHandler);

                    root.detachEvent('onclick', _clickHandler);
                    root.detachEvent('onmousewheel', _mouseWheelHandler);
                    root.detachEvent('onmousemove', _mouseMoveHandler);
                    root.detachEvent('onmouseout', _mouseOutHandler);
                    root.detachEvent('onmousedown', _mouseDownHandler);
                    root.detachEvent('onmouseup', _mouseUpHandler);
                }

                root = null;
                _domHover = null;
                storage = null;
                painter  = null;
                shape = null;

                un();

                self = null;

                return;
            }

            self.on = on;
            self.un = un;
            // self.trigger = trigger;
            self.dispose = dispose;

            _init();
        }

        return self;
    }
);
define('zrender', ['zrender/zrender'], function (main) { return main; });

/**
 * echarts扩展zrender shape
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：icon
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'icon',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，左上角横坐标
           y             : {number},  // 必须，左上角纵坐标
           width         : {number},  // 必须，宽度
           height        : {number},  // 必须，高度
           iconType      : {string},  // 必须，icon类型
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'icon',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           width : 150,
           height : 50,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'echarts/util/shape/icon',['require','zrender/tool/matrix','zrender/shape','zrender/shape/base','zrender/shape'],function(require) {
        var matrix = require('zrender/tool/matrix');
        
        function Icon() {
            this.type = 'icon';
            this._iconLibrary = {
                mark : _iconMark,
                markUndo : _iconMarkUndo,
                markClear : _iconMarkClear,
                dataZoom : _iconDataZoom,
                dataZoomReset : _iconDataZoomReset,
                restore : _iconRestore,
                lineChart : _iconLineChart,
                barChart : _iconBarChart,
                dataView : _iconDataView,
                saveAsImage : _iconSave,
                
                cross : _iconCross,
                circle : _iconCircle,
                rectangle : _iconRectangle,
                triangle : _iconTriangle,
                diamond : _iconDiamond,
                star : _iconStar
            };
        }

        function _iconMark(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;
            ctx.moveTo(style.x,                 style.y + style.height);
            ctx.lineTo(style.x + 5 * dx,        style.y + 14 * dy);
            ctx.lineTo(style.x + style.width,   style.y + 3 * dy);
            ctx.lineTo(style.x + 13 * dx,       style.y);
            ctx.lineTo(style.x + 2 * dx,        style.y + 11 * dy);
            ctx.lineTo(style.x,                 style.y + style.height);

            ctx.moveTo(style.x + 6 * dx,        style.y + 10 * dy);
            ctx.lineTo(style.x + 14 * dx,       style.y + 2 * dy);

            ctx.moveTo(style.x + 10 * dx,       style.y + 13 * dy);
            ctx.lineTo(style.x + style.width,   style.y + 13 * dy);

            ctx.moveTo(style.x + 13 * dx,       style.y + 10 * dy);
            ctx.lineTo(style.x + 13 * dx,       style.y + style.height);
        }

        function _iconMarkUndo(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;
            ctx.moveTo(style.x,                 style.y + style.height);
            ctx.lineTo(style.x + 5 * dx,        style.y + 14 * dy);
            ctx.lineTo(style.x + style.width,   style.y + 3 * dy);
            ctx.lineTo(style.x + 13 * dx,       style.y);
            ctx.lineTo(style.x + 2 * dx,        style.y + 11 * dy);
            ctx.lineTo(style.x,                 style.y + style.height);

            ctx.moveTo(style.x + 6 * dx,        style.y + 10 * dy);
            ctx.lineTo(style.x + 14 * dx,       style.y + 2 * dy);

            ctx.moveTo(style.x + 10 * dx,       style.y + 13 * dy);
            ctx.lineTo(style.x + style.width,   style.y + 13 * dy);
        }

        function _iconMarkClear(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;

            ctx.moveTo(style.x + 4 * dx,        style.y + 15 * dy);
            ctx.lineTo(style.x + 9 * dx,        style.y + 13 * dy);
            ctx.lineTo(style.x + 14 * dx,       style.y + 8 * dy);
            ctx.lineTo(style.x + 11 * dx,       style.y + 5 * dy);
            ctx.lineTo(style.x + 6 * dx,        style.y + 10 * dy);
            ctx.lineTo(style.x + 4 * dx,        style.y + 15 * dy);

            ctx.moveTo(style.x + 5 * dx,        style.y);
            ctx.lineTo(style.x + 11 * dx,        style.y);
            ctx.moveTo(style.x + 5 * dx,        style.y + dy);
            ctx.lineTo(style.x + 11 * dx,        style.y + dy);
            ctx.moveTo(style.x,        style.y + 2 * dy);
            ctx.lineTo(style.x + style.width,        style.y + 2 * dy);

            ctx.moveTo(style.x,        style.y + 5 * dy);
            ctx.lineTo(style.x + 3 * dx,        style.y + style.height);
            ctx.lineTo(style.x + 13 * dx,        style.y + style.height);
            ctx.lineTo(style.x + style.width,        style.y + 5 * dy);
        }

        function _iconDataZoom(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;

            ctx.moveTo(style.x,             style.y + 3 * dy);
            ctx.lineTo(style.x + 6 * dx,    style.y + 3 * dy);
            
            ctx.moveTo(style.x + 3 * dx,    style.y);
            ctx.lineTo(style.x + 3 * dx,    style.y + 6 * dy);

            ctx.moveTo(style.x + 3 * dx,      style.y + 8 * dy);
            ctx.lineTo(style.x + 3 * dx,      style.y + style.height);
            ctx.lineTo(style.x + style.width, style.y + style.height);
            ctx.lineTo(style.x + style.width, style.y + 3 * dy);
            ctx.lineTo(style.x + 8 * dx,      style.y + 3 * dy);
            
            ctx.moveTo(style.x, style.y); // 避免closePath
            ctx.lineTo(style.x, style.y); // 避免closePath
        }
        
        function _iconDataZoomReset(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;

            ctx.moveTo(style.x + 6 * dx,      style.y);
            ctx.lineTo(style.x + 2 * dx,          style.y + 3 * dy);
            ctx.lineTo(style.x + 6 * dx,          style.y + 6 * dy);
            
            ctx.moveTo(style.x + 2 * dx,          style.y + 3 * dy);
            ctx.lineTo(style.x + 14 * dx,     style.y + 3 * dy);
            ctx.lineTo(style.x + 14 * dx,     style.y + 11 * dy);
            
            ctx.moveTo(style.x + 2 * dx,          style.y + 5 * dy);
            ctx.lineTo(style.x + 2 * dx,          style.y + 13 * dy);
            ctx.lineTo(style.x + 14 * dx,     style.y + 13 * dy);
            
            ctx.moveTo(style.x + 10 * dx,     style.y + 10 * dy);
            ctx.lineTo(style.x + 14 * dx,     style.y + 13 * dy);
            ctx.lineTo(style.x + 10 * dx,     style.y + style.height);
            
            ctx.moveTo(style.x, style.y); // 避免closePath
            ctx.lineTo(style.x, style.y); // 避免closePath
        }
        
        function _iconRestore(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;
            var r = style.width / 2;
            
            ctx.lineWidth = 1.5;

            ctx.arc(style.x + r, style.y + r, r - dx, 0, Math.PI * 2 / 3);
            ctx.moveTo(style.x + 3 * dx,        style.y + style.height);
            ctx.lineTo(style.x + 0 * dx,        style.y + 12 * dy);
            ctx.lineTo(style.x + 5 * dx,        style.y + 11 * dy);

            ctx.moveTo(style.x, style.y + 8 * dy);
            ctx.arc(style.x + r, style.y + r, r - dx, Math.PI, Math.PI * 5 / 3);
            ctx.moveTo(style.x + 13 * dx,       style.y);
            ctx.lineTo(style.x + style.width,   style.y + 4 * dy);
            ctx.lineTo(style.x + 11 * dx,       style.y + 5 * dy);
            
            ctx.moveTo(style.x, style.y); // 避免closePath
            ctx.lineTo(style.x, style.y); // 避免closePath
        }

        function _iconLineChart(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;

            ctx.moveTo(style.x, style.y);
            ctx.lineTo(style.x, style.y + style.height);
            ctx.lineTo(style.x + style.width, style.y + style.height);

            ctx.moveTo(style.x + 2 * dx,    style.y + 14 * dy);
            ctx.lineTo(style.x + 7 * dx,    style.y + 6 * dy);
            ctx.lineTo(style.x + 11 * dx,   style.y + 11 * dy);
            ctx.lineTo(style.x + 15 * dx,   style.y + 2 * dy);
            
            ctx.moveTo(style.x, style.y); // 避免closePath
            ctx.lineTo(style.x, style.y); // 避免closePath
        }

        function _iconBarChart(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;

            ctx.moveTo(style.x, style.y);
            ctx.lineTo(style.x, style.y + style.height);
            ctx.lineTo(style.x + style.width, style.y + style.height);

            ctx.moveTo(style.x + 3 * dx,        style.y + 14 * dy);
            ctx.lineTo(style.x + 3 * dx,        style.y + 6 * dy);
            ctx.lineTo(style.x + 4 * dx,        style.y + 6 * dy);
            ctx.lineTo(style.x + 4 * dx,        style.y + 14 * dy);
            ctx.moveTo(style.x + 7 * dx,        style.y + 14 * dy);
            ctx.lineTo(style.x + 7 * dx,        style.y + 2 * dy);
            ctx.lineTo(style.x + 8 * dx,        style.y + 2 * dy);
            ctx.lineTo(style.x + 8 * dx,        style.y + 14 * dy);
            ctx.moveTo(style.x + 11 * dx,       style.y + 14 * dy);
            ctx.lineTo(style.x + 11 * dx,       style.y + 9 * dy);
            ctx.lineTo(style.x + 12 * dx,       style.y + 9 * dy);
            ctx.lineTo(style.x + 12 * dx,       style.y + 14 * dy);
        }

        function _iconDataView(ctx, style) {
            var dx = style.width / 16;

            ctx.moveTo(style.x + dx, style.y);
            ctx.lineTo(style.x + dx, style.y + style.height);
            ctx.lineTo(style.x + 15 * dx, style.y + style.height);
            ctx.lineTo(style.x + 15 * dx, style.y);
            ctx.lineTo(style.x + dx, style.y);

            ctx.moveTo(style.x + 3 * dx, style.y + 3 * dx);
            ctx.lineTo(style.x + 13 * dx, style.y + 3 * dx);

            ctx.moveTo(style.x + 3 * dx, style.y + 6 * dx);
            ctx.lineTo(style.x + 13 * dx, style.y + 6 * dx);

            ctx.moveTo(style.x + 3 * dx, style.y + 9 * dx);
            ctx.lineTo(style.x + 13 * dx, style.y + 9 * dx);

            ctx.moveTo(style.x + 3 * dx, style.y + 12 * dx);
            ctx.lineTo(style.x + 9 * dx, style.y + 12 * dx);
        }
        
        function _iconSave(ctx, style) {
            var dx = style.width / 16;
            var dy = style.height / 16;

            ctx.moveTo(style.x, style.y);
            ctx.lineTo(style.x, style.y + style.height);
            ctx.lineTo(style.x + style.width, style.y + style.height);
            ctx.lineTo(style.x + style.width, style.y);
            ctx.lineTo(style.x, style.y);

            ctx.moveTo(style.x + 4 * dx,    style.y);
            ctx.lineTo(style.x + 4 * dx,    style.y + 8 * dy);
            ctx.lineTo(style.x + 12 * dx,   style.y + 8 * dy);
            ctx.lineTo(style.x + 12 * dx,   style.y);
            
            ctx.moveTo(style.x + 6 * dx,    style.y + 11 * dy);
            ctx.lineTo(style.x + 6 * dx,    style.y + 13 * dy);
            ctx.lineTo(style.x + 10 * dx,   style.y + 13 * dy);
            ctx.lineTo(style.x + 10 * dx,   style.y + 11 * dy);
            ctx.lineTo(style.x + 6 * dx,    style.y + 11 * dy);
            
            ctx.moveTo(style.x, style.y); // 避免closePath
            ctx.lineTo(style.x, style.y); // 避免closePath
        }
        
        function _iconCross(ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            ctx.moveTo(x, y + height / 2);
            ctx.lineTo(x + width, y + height / 2);
            
            ctx.moveTo(x + width / 2, y);
            ctx.lineTo(x + width / 2, y + height);
        }
        
        function _iconCircle(ctx, style) {
            var width = style.width / 2;
            var height = style.height / 2;
            ctx.arc(
                style.x + width, 
                style.y + height, 
                Math.min(width, height),
                0, 
                Math.PI * 2
            );
        }
        
        function _iconRectangle(ctx, style) {
            ctx.rect(style.x, style.y, style.width, style.height);
        }
        
        function _iconTriangle(ctx, style) {
            var width = style.width / 2;
            var height = style.height / 2;
            var x = style.x + width;
            var y = style.y + height;
            var symbolSize = Math.min(width, height);
            ctx.moveTo(x, y - symbolSize);
            ctx.lineTo(x + symbolSize, y + symbolSize);
            ctx.lineTo(x - symbolSize, y + symbolSize);
            ctx.lineTo(x, y - symbolSize);
        }
        
        function _iconDiamond(ctx, style) {
            var width = style.width / 2;
            var height = style.height / 2;
            var x = style.x + width;
            var y = style.y + height;
            var symbolSize = Math.min(width, height);
            ctx.moveTo(x, y - symbolSize);
            ctx.lineTo(x + symbolSize, y);
            ctx.lineTo(x, y + symbolSize);
            ctx.lineTo(x - symbolSize, y);
            ctx.lineTo(x, y - symbolSize);
        }
        
        function _iconStar(ctx, style) {
            var width = style.width / 2;
            var height = style.height / 2;
            var star = require('zrender/shape').get('star');
            star.buildPath(ctx, {
                x : style.x + width,
                y : style.y + height,
                r : Math.min(width, height),
                n : style.n || 5
            });
        }

        Icon.prototype =  {
            /**
             * 创建矩形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                if (this._iconLibrary[style.iconType]) {
                    this._iconLibrary[style.iconType](ctx, style);
                }
                else {
                    ctx.moveTo(style.x, style.y);
                    ctx.lineTo(style.x + style.width, style.y);
                    ctx.lineTo(style.x + style.width, style.y + style.height);
                    ctx.lineTo(style.x, style.y + style.height);
                    ctx.lineTo(style.x, style.y);
                }

                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                return {
                    x : Math.round(style.x),
                    y : Math.round(style.y),
                    width : style.width,
                    height : style.height
                };
            },

            isCover : function(e, x, y) {
                //对鼠标的坐标也做相同的变换
                if(e.__needTransform && e._transform){
                    var inverseMatrix = [];
                    matrix.invert(inverseMatrix, e._transform);

                    var originPos = [x, y];
                    matrix.mulVector(originPos, inverseMatrix, [x, y, 1]);

                    if (x == originPos[0] && y == originPos[1]) {
                        // 避免外部修改导致的__needTransform不准确
                        if (Math.abs(e.rotation[0]) > 0.0001
                            || Math.abs(e.position[0]) > 0.0001
                            || Math.abs(e.position[1]) > 0.0001
                            || Math.abs(e.scale[0] - 1) > 0.0001
                            || Math.abs(e.scale[1] - 1) > 0.0001
                        ) {
                            e.__needTransform = true;
                        } else {
                            e.__needTransform = false;
                        }
                    }

                    x = originPos[0];
                    y = originPos[1];
                }

                // 快速预判并保留判断矩形
                var rect;
                if (e.style.__rect) {
                    rect = e.style.__rect;
                }
                else {
                    rect = this.getRect(e.style);
                    rect = [
                        rect.x,
                        rect.x + rect.width,
                        rect.y,
                        rect.y + rect.height
                    ];
                    e.style.__rect = rect;
                }
                if (x >= rect[0]
                    && x <= rect[1]
                    && y >= rect[2]
                    && y <= rect[3]
                ) {
                    // 矩形内
                    return true;
                }
                else {
                    return false;
                }
            },

            define : function(iconType, pathMethod) {
                this._iconLibrary[iconType] = pathMethod;
            },

            get : function(iconType) {
                return this._iconLibrary[iconType];
            }
        };

        require('zrender/shape/base').derive(Icon);
        require('zrender/shape').define('icon', new Icon());
            
        return Icon;
    }
);
/**
 * echart图表库
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 */
define('echarts/chart',[],function(/*require*/) {    //chart
    var self = {};

    var _chartLibrary = {};     //echart图表库

    /**
     * 定义图形实现
     * @param {Object} name
     * @param {Object} clazz 图形实现
     */
    self.define = function(name, clazz) {
        _chartLibrary[name] = clazz;
        return self;
    };

    /**
     * 获取图形实现
     * @param {Object} name
     */
    self.get = function(name) {
        return _chartLibrary[name];
    };

    return self;
});
/**
 * echarts组件基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/base',['require','../config','zrender/tool/util'],function(require) {
    function Base(zr){
        var ecConfig = require('../config');
        var zrUtil = require('zrender/tool/util');
        var self = this;

        self.zr =zr;

        self.shapeList = [];

        /**
         * 获取zlevel基数配置
         * @param {Object} contentType
         */
        function getZlevelBase(contentType) {
            contentType = contentType || self.type + '';

            switch (contentType) {
                case ecConfig.COMPONENT_TYPE_GRID :
                case ecConfig.COMPONENT_TYPE_AXIS_CATEGORY :
                case ecConfig.COMPONENT_TYPE_AXIS_VALUE :
                    return 0;

                case ecConfig.CHART_TYPE_LINE :
                case ecConfig.CHART_TYPE_BAR :
                case ecConfig.CHART_TYPE_SCATTER :
                case ecConfig.CHART_TYPE_PIE :
                case ecConfig.CHART_TYPE_RADAR :
                case ecConfig.CHART_TYPE_MAP :
                case ecConfig.CHART_TYPE_K :
                    return 2;

                case ecConfig.COMPONENT_TYPE_LEGEND :
                case ecConfig.COMPONENT_TYPE_DATARANGE:
                case ecConfig.COMPONENT_TYPE_DATAZOOM :
                    return 4;

                case ecConfig.CHART_TYPE_ISLAND :
                    return 5;

                case ecConfig.COMPONENT_TYPE_TOOLBOX :
                case ecConfig.COMPONENT_TYPE_TITLE :
                    return 6;

                case ecConfig.COMPONENT_TYPE_TOOLTIP :
                    return 7;

                default :
                    return 0;
            }
        }

        /**
         * 参数修正&默认值赋值
         * @param {Object} opt 参数
         *
         * @return {Object} 修正后的参数
         */
        function reformOption(opt) {
            return zrUtil.merge(
                       opt || {},
                       ecConfig[self.type] || {},
                       {
                           'overwrite': false,
                           'recursive': true
                       }
                   );
        }

        /**
         * css类属性数组补全，如padding，margin等~
         */
        function reformCssArray(p) {
            if (p instanceof Array) {
                switch (p.length + '') {
                    case '4':
                        return p;
                    case '3':
                        return [p[0], p[1], p[2], p[1]];
                    case '2':
                        return [p[0], p[1], p[0], p[1]];
                    case '1':
                        return [p[0], p[0], p[0], p[0]];
                    case '0':
                        return [0, 0, 0, 0];
                }
            }
            else {
                return [p, p, p, p];
            }
        }


        /**
         * 获取多级控制嵌套属性的基础方法
         * 返回ctrList中优先级最高（最靠前）的非undefined属性，ctrList中均无定义则返回undefined
         */
        var deepQuery = (function() {
            /**
             * 获取嵌套选项的基础方法
             * 返回optionTarget中位于optionLocation上的值，如果没有定义，则返回undefined
             */
            function _query(optionTarget, optionLocation) {
                if (typeof optionTarget == 'undefined') {
                    return undefined;
                }
                if (!optionLocation) {
                    return optionTarget;
                }
                optionLocation = optionLocation.split('.');

                var length = optionLocation.length;
                var curIdx = 0;
                while (curIdx < length) {
                    optionTarget = optionTarget[optionLocation[curIdx]];
                    if (typeof optionTarget == 'undefined') {
                        return undefined;
                    }
                    curIdx++;
                }
                return optionTarget;
            }

            return function(ctrList, optionLocation) {
                var finalOption;
                for (var i = 0, l = ctrList.length; i < l; i++) {
                    finalOption = _query(ctrList[i], optionLocation);
                    if (typeof finalOption != 'undefined') {
                        return finalOption;
                    }
                }
                return undefined;
            };
        })();

        /**
         * 获取自定义和默认配置合并后的字体设置
         */
        function getFont(textStyle) {
            var finalTextStyle = zrUtil.merge(
                zrUtil.clone(textStyle) || {},
                ecConfig.textStyle,
                { 'overwrite': false}
            );
            return finalTextStyle.fontStyle + ' '
                   + finalTextStyle.fontWeight + ' '
                   + finalTextStyle.fontSize + 'px '
                   + finalTextStyle.fontFamily;
        }
        
        function resize() {
            self.refresh && self.refresh();
        }

        /**
         * 清除图形数据，实例仍可用
         */
        function clear() {
            self.zr && self.zr.delShape(self.shapeList);
            self.shapeList = [];
        }

        /**
         * 释放后实例不可用
         */
        function dispose() {
            self.clear();
            self.shapeList = null;
            self = null;
        }

        /**
         * 基类方法
         */
        self.getZlevelBase = getZlevelBase;
        self.reformOption = reformOption;
        self.reformCssArray = reformCssArray;
        self.deepQuery = deepQuery;
        self.getFont = getFont;
        self.clear = clear;
        self.dispose = dispose;
        self.resize = resize;
    }

    return Base;
});

/**
 * echarts通用私有数据服务
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/util/ecData',[],function() {
    /**
     * 打包私有数据
     *
     * @param {shape} shape 修改目标
     * @param {Object} series
     * @param {number} seriesIndex
     * @param {number | Object} data
     * @param {number} dataIndex
     * @param {*=} special
     */
    function pack(shape, series, seriesIndex, data, dataIndex, name, special) {
        var value;
        if (typeof data != 'undefined') {
            if (typeof data.value != 'undefined') {
                value = data.value;
            }
            else {
                value = data;
            }
        }

        shape._echartsData =  {
            '_series' : series,
            '_seriesIndex' : seriesIndex,
            '_data' : data,
            '_dataIndex' : dataIndex,
            '_name' : name,
            '_value' : value,
            '_special' : special
        };
        return shape._echartsData;
    }

    /**
     * 从私有数据中获取特定项
     * @param {shape} shape
     * @param {string} key
     */
    function get(shape, key) {
        var data = shape._echartsData;
        if (!key) {
            return data;
        }

        switch (key) {
            case 'series' :
                return data && data._series;
            case 'seriesIndex' :
                return data && data._seriesIndex;
            case 'data' :
                return data && data._data;
            case 'dataIndex' :
                return data && data._dataIndex;
            case 'name' :
                return data && data._name;
            case 'value' :
                return data && data._value;
            case 'special' :
                return data && data._special;
        }

        return null;
    }

    /**
     * 修改私有数据中获取特定项
     * @param {shape} shape
     * @param {string} key
     * @param {*} value
     */
    function set(shape, key, value) {
        shape._echartsData = shape._echartsData || {};
        switch (key) {
            case 'series' :             // 当前系列值
                shape._echartsData._series = value;
                break;
            case 'seriesIndex' :        // 系列数组位置索引
                shape._echartsData._seriesIndex = value;
                break;
            case 'data' :               // 当前数据值
                shape._echartsData._data = value;
                break;
            case 'dataIndex' :          // 数据数组位置索引
                shape._echartsData._dataIndex = value;
                break;
            case 'name' :
                shape._echartsData._name = value;
                break;
            case 'value' :
                shape._echartsData._value = value;
                break;
            case 'special' :
                shape._echartsData._special = value;
                break;
        }
    }

    return {
        pack : pack,
        set : set,
        get : get
    };
});
/**
 * echarts组件基类
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/chart/calculableBase',['require','../util/ecData','zrender/tool/util'],function(require) {
    function Base(zr, option){
        var ecData = require('../util/ecData');

        var zrUtil = require('zrender/tool/util');
        var self = this;

        self.selectedMap = {};

        self.shapeHandler = {
            onclick : function() {
                self.isClick = true;
            },
            ondragover : function (param) {
                // 返回触发可计算特性的图形提示
                var calculableShape = zrUtil.clone(param.target);
                calculableShape.highlightStyle = {
                    text : '',
                    r : calculableShape.style.r + 5,
                    brushType : 'stroke',
                    strokeColor : self.zr.getCalculableColor(),
                    lineWidth : (calculableShape.style.lineWidth || 1) + 12
                };
                self.zr.addHoverShape(calculableShape);
            },

            ondrop : function (param) {
                // 排除一些非数据的拖拽进入
                if (typeof ecData.get(param.dragged, 'data') != 'undefined') {
                    self.isDrop = true;
                }
            },

            ondragend : function () {
                self.isDragend = true;
            }
        };

        function setCalculable(shape) {
            shape.ondragover = self.shapeHandler.ondragover;
            shape.ondragend = self.shapeHandler.ondragend;
            shape.ondrop = self.shapeHandler.ondrop;
            return shape;
        }

        /**
         * 数据项被拖拽进来
         */
        function ondrop(param, status) {
            if (!self.isDrop || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 拖拽安放目标
            var dragged = param.dragged;    // 当前被拖拽的图形对象

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 落到bar上，数据被拖拽到某个数据项上，数据修改
            var data = option.series[seriesIndex].data[dataIndex] || '-';
            if (data.value) {
                if (data.value != '-') {
                    option.series[seriesIndex].data[dataIndex].value +=
                        ecData.get(dragged, 'value');
                }
                else {
                    option.series[seriesIndex].data[dataIndex].value =
                        ecData.get(dragged, 'value');
                }
            }
            else {
                if (data != '-') {
                    option.series[seriesIndex].data[dataIndex] +=
                        ecData.get(dragged, 'value');
                }
                else {
                    option.series[seriesIndex].data[dataIndex] =
                        ecData.get(dragged, 'value');
                }
            }

            // 别status = {}赋值啊！！
            status.dragIn = status.dragIn || true;

            // 处理完拖拽事件后复位
            self.isDrop = false;

            return;
        }

        /**
         * 数据项被拖拽出去
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            var target = param.target;      // 被拖拽图形元素

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 被拖拽的图形是折线图bar，删除被拖拽走的数据
            option.series[seriesIndex].data[dataIndex] = '-';

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.needRefresh = true;

            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

        /**
         * 图例选择
         */
        function onlegendSelected(param, status) {
            var legendSelected = param.selected;
            for (var itemName in self.selectedMap) {
                if (self.selectedMap[itemName] != legendSelected[itemName]) {
                    // 有一项不一致都需要重绘
                    status.needRefresh = true;
                    return;
                }
            }
        }

        /**
         * 基类方法
         */
        self.setCalculable = setCalculable;
        self.ondrop = ondrop;
        self.ondragend = ondragend;
        self.onlegendSelected = onlegendSelected;
    }

    return Base;
});

/**
 * echarts组件：孤岛数据
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/chart/island',['require','../component/base','./calculableBase','../config','../util/ecData','zrender/tool/event','zrender/tool/color','../chart'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表选项
     */
    function Island(messageCenter, zr) {
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrEvent = require('zrender/tool/event');

        var self = this;
        self.type = ecConfig.CHART_TYPE_ISLAND;
        var option;

        var _zlevelBase = self.getZlevelBase();
        var _nameConnector;
        var _valueConnector;
        var _zrHeight = zr.getHeight();
        var _zrWidth = zr.getWidth();

        /**
         * 孤岛合并
         *
         * @param {string} tarShapeIndex 目标索引
         * @param {Object} srcShape 源目标，合入目标后删除
         */
        function _combine(tarShape, srcShape) {
            var zrColor = require('zrender/tool/color');
            var value = ecData.get(tarShape, 'value')
                        + ecData.get(srcShape, 'value');
            var name = ecData.get(tarShape, 'name')
                       + _nameConnector
                       + ecData.get(srcShape, 'name');

            tarShape.style.text = name + _valueConnector + value;

            ecData.set(tarShape, 'value', value);
            ecData.set(tarShape, 'name', name);
            tarShape.style.r = option.island.r;
            tarShape.style.color = zrColor.mix(
                tarShape.style.color,
                srcShape.style.color
            );
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                newOption.island = self.reformOption(newOption.island);
                option = newOption;
    
                _nameConnector = option.nameConnector;
                _valueConnector = option.valueConnector;
            }
        }
        
        function render(newOption) {
            refresh(newOption);

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                zr.addShape(self.shapeList[i]);
            }
        }
        
        function getOption() {
            return option;
        }

        function resize() {
            var newWidth = zr.getWidth();
            var newHieght = zr.getHeight();
            var xScale = newWidth / (_zrWidth || newWidth);
            var yScale = newHieght / (_zrHeight || newHieght);
            if (xScale == 1 && yScale == 1) {
                return;
            }
            _zrWidth = newWidth;
            _zrHeight = newHieght;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                zr.modShape(
                    self.shapeList[i].id,
                    {
                        style: {
                            x: Math.round(self.shapeList[i].style.x * xScale),
                            y: Math.round(self.shapeList[i].style.y * yScale)
                        }
                    }
                );
            }
        }

        function add(shape) {
            var name = ecData.get(shape, 'name');
            var value = ecData.get(shape, 'value');
            var seriesName = typeof ecData.get(shape, 'series') != 'undefined'
                             ? ecData.get(shape, 'series').name
                             : '';
            var font = self.getFont(option.island.textStyle);
            var islandShape = {
                shape : 'circle',
                id : zr.newShapeId(self.type),
                zlevel : _zlevelBase,
                style : {
                    x : shape.style.x,
                    y : shape.style.y,
                    r : option.island.r,
                    color : shape.style.color || shape.style.strokeColor,
                    text : name + _valueConnector + value,
                    textFont : font
                },
                draggable : true,
                hoverable : true,
                onmousewheel : self.shapeHandler.onmousewheel,
                _type : 'island'
            };
            if (islandShape.style.color == '#fff') {
                islandShape.style.color = shape.style.strokeColor;
            }
            self.setCalculable(islandShape);
            ecData.pack(
                islandShape,
                {name:seriesName}, -1,
                value, -1,
                name
            );
            self.shapeList.push(islandShape);
            zr.addShape(islandShape);
        }

        function del(shape) {
            zr.delShape(shape.id);
            var newShapeList = [];
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].id != shape.id) {
                    newShapeList.push(self.shapeList[i]);
                }
            }
            self.shapeList = newShapeList;
        }

        /**
         * 数据项被拖拽进来， 重载基类方法
         */
        function ondrop(param, status) {
            if (!self.isDrop || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            // 拖拽产生孤岛数据合并
            var target = param.target;      // 拖拽安放目标
            var dragged = param.dragged;    // 当前被拖拽的图形对象

            _combine(target, dragged);
            zr.modShape(target.id, target);

            status.dragIn = true;

            // 处理完拖拽事件后复位
            self.isDrop = false;

            return;
        }

        /**
         * 数据项被拖拽出去， 重载基类方法
         */
        function ondragend(param, status) {
            var target = param.target;      // 拖拽安放目标
            if (!self.isDragend) {
                // 拖拽的不是孤岛数据，如果没有图表接受孤岛数据，需要新增孤岛数据
                if (!status.dragIn) {
                    target.style.x = zrEvent.getX(param.event);
                    target.style.y = zrEvent.getY(param.event);
                    add(target);
                    status.needRefresh = true;
                }
            }
            else {
                // 拖拽的是孤岛数据，如果有图表接受了孤岛数据，需要删除孤岛数据
                if (status.dragIn) {
                    del(target);
                    status.needRefresh = true;
                }
            }

            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

        /**
         * 滚轮改变孤岛数据值
         */
        self.shapeHandler.onmousewheel = function(param) {
            var shape = param.target;

            var event = param.event;
            var delta = zrEvent.getDelta(event);
            delta = delta > 0 ? (-1) : 1;
            shape.style.r -= delta;
            shape.style.r = shape.style.r < 5 ? 5 : shape.style.r;

            var value = ecData.get(shape, 'value');
            var dvalue = value * option.island.calculateStep;
            if (dvalue > 1) {
                value = Math.round(value - dvalue * delta);
            }
            else {
                value = (value - dvalue * delta).toFixed(2) - 0;
            }

            var name = ecData.get(shape, 'name');
            shape.style.text = name + ':' + value;

            ecData.set(shape, 'value', value);
            ecData.set(shape, 'name', name);

            zr.modShape(shape.id, shape);
            zr.refresh();
            zrEvent.stop(event);
        };

        self.refresh = refresh;
        self.render = render;
        self.resize = resize;
        self.getOption = getOption;
        self.add = add;
        self.del = del;
        self.ondrop = ondrop;
        self.ondragend = ondragend;
    }

    // 图表注册
    require('../chart').define('island', Island);
    
    return Island;
});
/**
 * echart组件库
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component',[],function(/*require*/) {    //component
    var self = {};

    var _componentLibrary = {};     //echart组件库

    /**
     * 定义图形实现
     * @param {Object} name
     * @param {Object} clazz 图形实现
     */
    self.define = function(name, clazz) {
        _componentLibrary[name] = clazz;
        return self;
    };

    /**
     * 获取图形实现
     * @param {Object} name
     */
    self.get = function(name) {
        return _componentLibrary[name];
    };

    return self;
});
/**
 * echarts组件：图表标题
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/title',['require','./base','../config','zrender/tool/area','zrender/tool/util','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表参数
     */
    function Title(messageCenter, zr, option) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var zrArea = require('zrender/tool/area');
        var zrUtil = require('zrender/tool/util');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_TITLE;

        var titleOption;                       // 标题选项，共享数据源
        var _zlevelBase = self.getZlevelBase();

        var _itemGroupLocation = {};    // 标题元素组的位置参数，通过计算所得x, y, width, height

        function _buildShape() {
            _itemGroupLocation = _getItemGroupLocation();

            _buildBackground();
            _buildItem();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建所有标题元素
         */
        function _buildItem() {
            var text = titleOption.text;
            var subtext = titleOption.subtext;
            var font = self.getFont(titleOption.textStyle);
            var subfont = self.getFont(titleOption.subtextStyle);
            
            var x = _itemGroupLocation.x;
            var y = _itemGroupLocation.y;
            var width = _itemGroupLocation.width;
            var height = _itemGroupLocation.height;
            
            var textShape = {
                shape : 'text',
                zlevel : _zlevelBase,
                style : {
                    y : y,
                    color : titleOption.textStyle.color,
                    text: text,
                    textFont: font,
                    textBaseline: 'top'
                },
                hoverable: false
            };
            
            var subtextShape = {
                shape : 'text',
                zlevel : _zlevelBase,
                style : {
                    y : y + height,
                    color : titleOption.subtextStyle.color,
                    text: subtext,
                    textFont: subfont,
                    textBaseline: 'bottom'
                },
                hoverable: false
            };

            

            switch (titleOption.x) {
                case 'center' :
                    textShape.style.x = subtextShape.style.x = x + width / 2;
                    textShape.style.textAlign = subtextShape.style.textAlign 
                                              = 'center';
                    break;
                case 'left' :
                    textShape.style.x = subtextShape.style.x = x;
                    textShape.style.textAlign = subtextShape.style.textAlign 
                                              = 'left';
                    break;
                case 'right' :
                    textShape.style.x = subtextShape.style.x = x + width;
                    textShape.style.textAlign = subtextShape.style.textAlign 
                                              = 'right';
                    break;
                default :
                    x = titleOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    textShape.style.x = subtextShape.style.x = x;
                    break;
            }
            
            if (titleOption.textAlign) {
                textShape.style.textAlign = subtextShape.style.textAlign 
                                          = titleOption.textAlign;
            }

            self.shapeList.push(textShape);
            subtext !== '' && self.shapeList.push(subtextShape);
        }

        function _buildBackground() {
            var pTop = titleOption.padding[0];
            var pRight = titleOption.padding[1];
            var pBottom = titleOption.padding[2];
            var pLeft = titleOption.padding[3];

            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _itemGroupLocation.x - pLeft,
                    y : _itemGroupLocation.y - pTop,
                    width : _itemGroupLocation.width + pLeft + pRight,
                    height : _itemGroupLocation.height + pTop + pBottom,
                    brushType : titleOption.borderWidth === 0
                                ? 'fill' : 'both',
                    color : titleOption.backgroundColor,
                    strokeColor : titleOption.borderColor,
                    lineWidth : titleOption.borderWidth
                }
            });
        }

        /**
         * 根据选项计算标题实体的位置坐标
         */
        function _getItemGroupLocation() {
            var text = titleOption.text;
            var subtext = titleOption.subtext;
            var font = self.getFont(titleOption.textStyle);
            var subfont = self.getFont(titleOption.subtextStyle);
            
            var totalWidth = Math.max(
                    zrArea.getTextWidth(text, font),
                    zrArea.getTextWidth(subtext, subfont)
                );
            var totalHeight = zrArea.getTextWidth('国', font)
                              + (subtext === ''
                                 ? 0
                                 : (titleOption.itemGap
                                    + zrArea.getTextWidth('国', subfont))
                                );

            var x;
            var zrWidth = zr.getWidth();
            switch (titleOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = titleOption.padding[3] + titleOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - titleOption.padding[1]
                        - titleOption.borderWidth;
                    break;
                default :
                    x = titleOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    break;
            }

            var y;
            var zrHeight = zr.getHeight();
            switch (titleOption.y) {
                case 'top' :
                    y = titleOption.padding[0] + titleOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - titleOption.padding[2]
                        - titleOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = titleOption.y - 0;
                    y = isNaN(y) ? 0 : y;
                    break;
            }

            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        }

        function init(newOption) {
            refresh(newOption);
        }
        
        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;

                option.title = self.reformOption(option.title);
                // 补全padding属性
                option.title.padding = self.reformCssArray(
                    option.title.padding
                );
    
                titleOption = option.title;
                titleOption.textStyle = zrUtil.merge(
                    titleOption.textStyle,
                    ecConfig.textStyle,
                    {
                        'overwrite': false,
                        'recursive': false
                    }
                );
                titleOption.subtextStyle = zrUtil.merge(
                    titleOption.subtextStyle,
                    ecConfig.textStyle,
                    {
                        'overwrite': false,
                        'recursive': false
                    }
                );
    
                self.clear();
                _buildShape();
            }
        }

        self.init = init;
        self.refresh = refresh;

        init(option);
    }
    
    require('../component').define('title', Title);
    
    return Title;
});



/**
 * echarts组件： 类目轴
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/categoryAxis',['require','./base','../config','zrender/tool/util','zrender/tool/area','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 类目轴参数
     * @param {Grid} grid 网格对象
     */
    function CategoryAxis(messageCenter, zr, option, component) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');

        var zrUtil = require('zrender/tool/util');
        var zrArea = require('zrender/tool/area');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_AXIS_CATEGORY;

        var grid = component.grid;

        var _zlevelBase = self.getZlevelBase();
        var _interval;                              // 标签显示的挑选间隔
        var _labelData;

        function _reformLabel() {
            var data = zrUtil.clone(option.data);
            var axisFormatter = option.axisLabel.formatter;
            var formatter;
            for (var i = 0, l = data.length; i < l; i++) {
                formatter = data[i].formatter || axisFormatter;
                if (formatter) {
                    if (typeof formatter == 'function') {
                        if (typeof data[i].value != 'undefined') {
                            data[i].value = formatter(data[i].value);
                        }
                        else {
                            data[i] = formatter(data[i]);
                        }
                    }
                    else if (typeof formatter == 'string') {
                        if (typeof data[i].value != 'undefined') {
                            data[i].value = formatter.replace(
                                '{value}',data[i].value
                            );
                        }
                        else {
                            data[i] = formatter.replace('{value}',data[i]);
                        }
                    }
                }
            }
            return data;
        }

        /**
         * 计算标签显示挑选间隔
         */
        function _getInterval() {
            var interval   = option.axisLabel.interval;
            if (interval == 'auto') {
                // 麻烦的自适应计算
                var fontSize = option.axisLabel.textStyle.fontSize;
                var font = self.getFont(option.axisLabel.textStyle);
                var data = option.data;
                var dataLength = option.data.length;

                if (option.position == 'bottom' || option.position == 'top') {
                    // 横向
                    if (dataLength > 3) {
                        var gap = getCoord(data[1]) -  getCoord(data[0]);
                        var isEnough = false;
                        var labelSpace;
                        var labelSize;
                        interval = 0;
                        while (!isEnough && interval < dataLength) {
                            interval++;
                            isEnough = true;
                            labelSpace = gap * interval - 10; // 标签左右至少间隔为5px
                            for (var i = 0; i < dataLength; i += interval) {
                                if (option.axisLabel.rotate !== 0) {
                                    // 有旋转
                                    labelSize = fontSize;
                                }
                                else if (data[i].textStyle) {
                                    labelSize = zrArea.getTextWidth(
                                        _labelData[i].value || _labelData[i],
                                        self.getFont(
                                            zrUtil.merge(
                                                data[i].textStyle,
                                                option.axisLabel.textStyle,
                                                {
                                                    'overwrite': false,
                                                    'recursive': true
                                                }
                                           )
                                        )
                                    );
                                }
                                else {
                                    labelSize = zrArea.getTextWidth(
                                        _labelData[i].value || _labelData[i],
                                        font
                                    );
                                }

                                if (labelSpace < labelSize) {
                                    // 放不下，中断循环让interval++
                                    isEnough = false;
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        // 少于3个则全部显示
                        interval = 1;
                    }
                }
                else {
                    // 纵向
                    if (dataLength > 3) {
                        var gap = getCoord(data[0]) - getCoord(data[1]);
                        interval = 1;
                        // 标签上下至少间隔为3px
                        while ((gap * interval - 6) < fontSize
                                && interval < dataLength
                        ) {
                            interval++;
                        }
                    }
                    else {
                        // 少于3个则全部显示
                        interval = 1;
                    }
                }
            }
            else {
                // 用户自定义间隔
                interval += 1;
            }

            return interval;
        }

        function _buildShape() {
            _labelData = _reformLabel();
            _interval = _getInterval();
            option.splitArea.show && _buildSplitArea();
            option.splitLine.show && _buildSplitLine();
            option.axisLine.show && _buildAxisLine();
            option.axisTick.show && _buildAxisTick();
            option.axisLabel.show && _buildAxisLabel();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        // 轴线
        function _buildAxisLine() {
            var axShape = {
                shape : 'line',
                zlevel: _zlevelBase + 1,
                hoverable: false
            };
            switch (option.position) {
                case 'left':
                    axShape.style = {
                        xStart : grid.getX(),
                        yStart : grid.getY(),
                        xEnd : grid.getX(),
                        yEnd : grid.getYend()
                    };
                    break;
                case 'right':
                    axShape.style = {
                        xStart : grid.getXend(),
                        yStart : grid.getY(),
                        xEnd : grid.getXend(),
                        yEnd : grid.getYend()
                    };
                    break;
                case 'bottom':
                    axShape.style = {
                        xStart : grid.getX(),
                        yStart : grid.getYend(),
                        xEnd : grid.getXend(),
                        yEnd : grid.getYend()
                    };
                    break;
                case 'top':
                    axShape.style = {
                        xStart : grid.getX(),
                        yStart : grid.getY(),
                        xEnd : grid.getXend(),
                        yEnd : grid.getY()
                    };
                    break;
            }

            axShape.style.strokeColor = option.axisLine.lineStyle.color;
            axShape.style.lineWidth = option.axisLine.lineStyle.width;
            axShape.style.lineType = option.axisLine.lineStyle.type;

            self.shapeList.push(axShape);
        }

        // 小标记
        function _buildAxisTick() {
            var axShape;
            var data       = option.data;
            var dataLength = option.data.length;
            var length     = option.axisTick.length;
            var color      = option.axisTick.lineStyle.color;
            var lineWidth  = option.axisTick.lineStyle.width;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var yPosition = option.position == 'bottom'
                                ? grid.getYend()
                                : (grid.getY() - length);
                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : getCoord(data[i].value || data[i]),
                            yStart : yPosition,
                            xEnd : getCoord(data[i].value || data[i]),
                            yEnd : yPosition + length,
                            strokeColor : color,
                            lineWidth : lineWidth
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
            else {
                // 纵向
                var xPosition = option.position == 'left'
                                ? (grid.getX() - length)
                                : grid.getXend();
                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : xPosition,
                            yStart : getCoord(data[i].value || data[i]),
                            xEnd : xPosition + length,
                            yEnd : getCoord(data[i].value || data[i]),
                            strokeColor : color,
                            lineWidth : lineWidth
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
        }

        // 坐标轴文本
        function _buildAxisLabel() {
            var axShape;
            var data       = option.data;
            var dataLength = option.data.length;
            var rotate     = option.axisLabel.rotate;
            var margin     = option.axisLabel.margin;
            var textStyle  = option.axisLabel.textStyle;
            var dataTextStyle;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var yPosition;
                var baseLine;
                if (option.position == 'bottom') {
                    yPosition = grid.getYend() + margin;
                    baseLine = 'top';
                }
                else {
                    yPosition = grid.getY() - margin;
                    baseLine = 'bottom';
                }

                for (var i = 0; i < dataLength; i += _interval) {
                    dataTextStyle = zrUtil.merge(
                        data[i].textStyle || {},
                        textStyle,
                        {'overwrite': false}
                    );
                    axShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : getCoord(data[i].value || data[i]),
                            y : yPosition,
                            color : dataTextStyle.color,
                            text : _labelData[i].value || _labelData[i],
                            textFont : self.getFont(dataTextStyle),
                            textAlign : 'center',
                            textBaseline : baseLine
                        }
                    };
                    if (rotate) {
                        axShape.style.textAlign = rotate > 0
                                                  ? (option.position == 'bottom'
                                                    ? 'right' : 'left')
                                                  : (option.position == 'bottom'
                                                    ? 'left' : 'right');
                        axShape.rotation = [
                            rotate * Math.PI / 180,
                            axShape.style.x,
                            axShape.style.y
                        ];
                    }
                    self.shapeList.push(axShape);
                }
            }
            else {
                // 纵向
                var xPosition;
                var align;
                if (option.position == 'left') {
                    xPosition = grid.getX() - margin;
                    align = 'right';
                }
                else {
                    xPosition = grid.getXend() + margin;
                    align = 'left';
                }

                for (var i = 0; i < dataLength; i += _interval) {
                    dataTextStyle = zrUtil.merge(
                        data[i].textStyle || {},
                        textStyle,
                        {'overwrite': false}
                    );
                    axShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : xPosition,
                            y : getCoord(data[i].value || data[i]),
                            color : dataTextStyle.color,
                            text : _labelData[i].value || _labelData[i],
                            textFont : self.getFont(dataTextStyle),
                            textAlign : align,
                            textBaseline : 'middle'
                        }
                    };
                    if (rotate) {
                        axShape.rotation = [
                            rotate * Math.PI / 180,
                            axShape.style.x,
                            axShape.style.y
                        ];
                    }
                    self.shapeList.push(axShape);
                }
            }
        }

        function _buildSplitLine() {
            var axShape;
            var data       = option.data;
            var dataLength = option.data.length;
            var color = option.splitLine.lineStyle.color;
            color = color instanceof Array ? color : [color];
            var colorLength = color.length;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var sy = grid.getY();
                var ey = grid.getYend();
                var x;

                for (var i = 0; i < dataLength; i += _interval) {
                    x = getCoord(data[i].value || data[i]);
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : x,
                            yStart : sy,
                            xEnd : x,
                            yEnd : ey,
                            strokeColor : color[i % colorLength],
                            lineType : option.splitLine.lineStyle.type,
                            lineWidth : option.splitLine.lineStyle.width
                        }
                    };
                    self.shapeList.push(axShape);
                }

            }
            else {
                // 纵向
                var sx = grid.getX();
                var ex = grid.getXend();
                var y;

                for (var i = 0; i < dataLength; i += _interval) {
                    y = getCoord(data[i].value || data[i]);
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : sx,
                            yStart : y,
                            xEnd : ex,
                            yEnd : y,
                            strokeColor : color[i % colorLength],
                            linetype : option.splitLine.lineStyle.type,
                            lineWidth : option.splitLine.lineStyle.width
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
        }

        function _buildSplitArea() {
            var axShape;
            var color = option.splitArea.areaStyle.color;
            color = color instanceof Array ? color : [color];
            var colorLength = color.length;
            var data        = option.data;
            var dataLength  = option.data.length;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var y = grid.getY();
                var height = grid.getHeight();
                var lastX = grid.getX();
                var curX;

                for (var i = 0; i <= dataLength; i++) {
                    curX = i < dataLength
                           ? getCoord(data[i].value || data[i])
                           : grid.getXend();
                    axShape = {
                        shape : 'rectangle',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : lastX,
                            y : y,
                            width : curX - lastX,
                            height : height,
                            color : color[i % colorLength]
                            // type : option.splitArea.areaStyle.type,
                        }
                    };
                    self.shapeList.push(axShape);
                    lastX = curX;
                }
            }
            else {
                // 纵向
                var x = grid.getX();
                var width = grid.getWidth();
                var lastYend = grid.getYend();
                var curY;

                for (var i = 0; i <= dataLength; i++) {
                    curY = i < dataLength
                           ? getCoord(data[i].value || data[i])
                           : grid.getY();
                    axShape = {
                        shape : 'rectangle',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : x,
                            y : curY,
                            width : width,
                            height : lastYend - curY,
                            color : color[i % colorLength]
                            // type : option.splitArea.areaStyle.type
                        }
                    };
                    self.shapeList.push(axShape);
                    lastYend = curY;
                }
            }
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newOption
         * @param {Object} newGrid
         */
        function init(newOption, newGrid) {
            if (newOption.data.length < 1) {
                return;
            }
            grid = newGrid;

            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = self.reformOption(newOption);
                // 通用字体设置
                option.axisLabel.textStyle = zrUtil.merge(
                    option.axisLabel.textStyle || {},
                    ecConfig.textStyle,
                    {
                        'overwrite' : false,
                        'recursive' : true
                    }
                );
                option.axisLabel.textStyle = zrUtil.merge(
                    option.axisLabel.textStyle || {},
                    ecConfig.textStyle,
                    {
                        'overwrite' : false,
                        'recursive' : true
                    }
                );
            }
            self.clear();
            _buildShape();
        }

        /**
         * 返回间隔
         */
        function getGap() {
            var dataLength = option.data.length;
            var total = (option.position == 'bottom'
                        || option.position == 'top')
                        ? grid.getWidth()
                        : grid.getHeight();
            if (option.boundaryGap) {               // 留空
                return total / (dataLength + 1);
            }
            else {                                  // 顶头
                return total / (dataLength > 1 ? (dataLength - 1) : 1);
            }
        }

        // 根据值换算位置
        function getCoord(value) {
            var data = option.data;
            var dataLength = data.length;
            var gap = getGap();
            var position = option.boundaryGap ? gap : 0;

            // Math.floor可能引起一些偏差，但性能会更好
            for (var i = 0; i < dataLength; i++) {
                if (data[i] == value
                    || (data[i].value && data[i].value == value)
                ) {
                    if (option.position == 'bottom'
                        || option.position == 'top'
                    ) {
                        // 横向
                        position = grid.getX() + position;
                    }
                    else {
                        // 纵向
                        position = grid.getYend() - position;
                    }
                    return (i === 0 || i == dataLength - 1)
                           ? position
                           : Math.floor(position);
                }
                position += gap;
            }
        }

        // 根据类目轴数据索引换算位置
        function getCoordByIndex(dataIndex) {
            if (dataIndex < 0) {
                if (option.position == 'bottom' || option.position == 'top') {
                    return grid.getX();
                }
                else {
                    return grid.getYend();
                }
            }
            else if (dataIndex >= option.data.length) {
                if (option.position == 'bottom' || option.position == 'top') {
                    return grid.getXend();
                }
                else {
                    return grid.getY();
                }
            }
            else {
                return getCoord(option.data[dataIndex]);
            }
        }

        // 根据类目轴数据索引换算类目轴名称
        function getNameByIndex(dataIndex) {
            return option.data[dataIndex];
        }

        /**
         * 根据类目轴数据索引返回是否为主轴线
         * @param {number} dataIndex 类目轴数据索引
         * @return {boolean} 是否为主轴
         */
        function isMainAxis(dataIndex) {
            return dataIndex % _interval === 0;
        }

        function getPosition() {
            return option.position;
        }

        self.init = init;
        self.refresh = refresh;
        self.getGap = getGap;
        self.getCoord = getCoord;
        self.getCoordByIndex = getCoordByIndex;
        self.getNameByIndex = getNameByIndex;
        self.isMainAxis = isMainAxis;
        self.getPosition = getPosition;

        init(option, grid);
    }

    require('../component').define('categoryAxis', CategoryAxis);
    
    return CategoryAxis;
});
/**
 * echarts组件： 数值轴
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/valueAxis',['require','./base','../config','zrender/tool/util','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 类目轴参数
     * @param {Grid} grid 网格对象
     * @param {Array} series 数据对象
     */
    function ValueAxis(messageCenter, zr, option, component, series) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');

        var zrUtil = require('zrender/tool/util');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_AXIS_VALUE;

        var grid = component.grid;

        var _zlevelBase = self.getZlevelBase();
        var _min;
        var _max;
        var _hasData;
        var _valueList;
        var _valueLabel;

        function _buildShape() {
            _hasData = false;
            _calculateValue();
            if (!_hasData) {
                return;
            }
            option.splitArea.show && _buildSplitArea();
            option.splitLine.show && _buildSplitLine();
            option.axisLine.show && _buildAxisLine();
            option.axisTick.show && _buildAxisTick();
            option.axisLabel.show && _buildAxisLabel();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        // 轴线
        function _buildAxisLine() {
            var axShape = {
                shape : 'line',
                zlevel : _zlevelBase + 1,
                hoverable : false
            };
            switch (option.position) {
                case 'left' :
                    axShape.style = {
                        xStart : grid.getX(),
                        yStart : grid.getYend(),
                        xEnd : grid.getX(),
                        yEnd : grid.getY()
                    };
                    break;
                case 'right' :
                    axShape.style = {
                        xStart : grid.getXend(),
                        yStart : grid.getYend(),
                        xEnd : grid.getXend(),
                        yEnd : grid.getY()
                    };
                    break;
                case 'bottom' :
                    axShape.style = {
                        xStart : grid.getX(),
                        yStart : grid.getYend(),
                        xEnd : grid.getXend(),
                        yEnd : grid.getYend()
                    };
                    break;
                case 'top' :
                    axShape.style = {
                        xStart : grid.getX(),
                        yStart : grid.getY(),
                        xEnd : grid.getXend(),
                        yEnd : grid.getY()
                    };
                    break;
            }
            if (option.name !== '') {
                axShape.style.text = option.name;
                axShape.style.textPosition = option.nameLocation;
            }
            axShape.style.strokeColor = option.axisLine.lineStyle.color;
            axShape.style.lineWidth = option.axisLine.lineStyle.width;
            axShape.style.lineType = option.axisLine.lineStyle.type;

            self.shapeList.push(axShape);
        }

        // 小标记
        function _buildAxisTick() {
            var axShape;
            var data       = _valueList;
            var dataLength = _valueList.length;
            var length     = option.axisTick.length;
            var color      = option.axisTick.lineStyle.color;
            var lineWidth  = option.axisTick.lineStyle.width;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var yPosition = option.position == 'bottom'
                                ? grid.getYend()
                                : (grid.getY() - length);
                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : getCoord(data[i]),
                            yStart : yPosition,
                            xEnd : getCoord(data[i]),
                            yEnd : yPosition + length,
                            strokeColor : color,
                            lineWidth : lineWidth
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
            else {
                // 纵向
                var xPosition = option.position == 'left'
                                ? (grid.getX() - length)
                                : grid.getXend();
                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : xPosition,
                            yStart : getCoord(data[i]),
                            xEnd : xPosition + length,
                            yEnd : getCoord(data[i]),
                            strokeColor : color,
                            lineWidth : lineWidth
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
        }

        // 坐标轴文本
        function _buildAxisLabel() {
            var axShape;
            var data       = _valueList;
            var dataLength = _valueList.length;
            var rotate     = option.axisLabel.rotate;
            var margin     = option.axisLabel.margin;
            var textStyle  = option.axisLabel.textStyle;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var yPosition;
                var baseLine;
                if (option.position == 'bottom') {
                    yPosition = grid.getYend() + margin;
                    baseLine = 'top';
                }
                else {
                    yPosition = grid.getY() - margin;
                    baseLine = 'bottom';
                }

                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : getCoord(data[i]),
                            y : yPosition,
                            color : textStyle.color,
                            text : _valueLabel[i],
                            textFont : self.getFont(textStyle),
                            textAlign : (i === 0 && option.name !== '')
                                        ? 'left'
                                        : (i == (dataLength - 1) 
                                           && option.name !== '')
                                          ? 'right'
                                          : 'center',
                            textBaseline : baseLine
                        }
                    };
                    if (rotate) {
                        axShape.style.textAlign = rotate > 0
                                                  ? (option.position == 'bottom'
                                                    ? 'right' : 'left')
                                                  : (option.position == 'bottom'
                                                    ? 'left' : 'right');
                        axShape.rotation = [
                            rotate * Math.PI / 180,
                            axShape.style.x,
                            axShape.style.y
                        ];
                    }
                    self.shapeList.push(axShape);
                }
            }
            else {
                // 纵向
                var xPosition;
                var align;
                if (option.position == 'left') {
                    xPosition = grid.getX() - margin;
                    align = 'right';
                }
                else {
                    xPosition = grid.getXend() + margin;
                    align = 'left';
                }

                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            x : xPosition,
                            y : getCoord(data[i]),
                            color : textStyle.color,
                            text : _valueLabel[i],
                            textFont : self.getFont(textStyle),
                            textAlign : align,
                            textBaseline : (i === 0 && option.name !== '')
                                           ? 'bottom'
                                           : (i == (dataLength - 1) 
                                              && option.name !== '')
                                             ? 'top'
                                             : 'middle'
                        }
                    };
                    
                    if (rotate) {
                        axShape.rotation = [
                            rotate * Math.PI / 180,
                            axShape.style.x,
                            axShape.style.y
                        ];
                    }
                    self.shapeList.push(axShape);
                }
            }
        }

        function _buildSplitLine() {
            var axShape;
            var data       = _valueList;
            var dataLength = _valueList.length;
            var color = option.splitLine.lineStyle.color;
            color = color instanceof Array ? color : [color];
            var colorLength = color.length;

            if (option.position == 'bottom' || option.position == 'top') {
                // 横向
                var sy = grid.getY();
                var ey = grid.getYend();
                var x;

                for (var i = 0; i < dataLength; i++) {
                    x = getCoord(data[i]);
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : x,
                            yStart : sy,
                            xEnd : x,
                            yEnd : ey,
                            strokeColor : color[i % colorLength],
                            lineType : option.splitLine.lineStyle.type,
                            lineWidth : option.splitLine.lineStyle.width
                        }
                    };
                    self.shapeList.push(axShape);
                }

            }
            else {
                // 纵向
                var sx = grid.getX();
                var ex = grid.getXend();
                var y;

                for (var i = 0; i < dataLength; i++) {
                    y = getCoord(data[i]);
                    axShape = {
                        shape : 'line',
                        zlevel : _zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : sx,
                            yStart : y,
                            xEnd : ex,
                            yEnd : y,
                            strokeColor : color[i % colorLength],
                            lineType : option.splitLine.lineStyle.type,
                            lineWidth : option.splitLine.lineStyle.width
                        }
                    };
                    self.shapeList.push(axShape);
                }
            }
        }

        function _buildSplitArea() {
            var axShape;
            var color = option.splitArea.areaStyle.color;

            if (!(color instanceof Array)) {
                // 非数组一律认为是单一颜色的字符串，单一颜色则用一个背景，颜色错误不负责啊！！！
                axShape = {
                    shape : 'rectangle',
                    zlevel : _zlevelBase,
                    hoverable : false,
                    style : {
                        x : grid.getX(),
                        y : grid.getY(),
                        width : grid.getWidth(),
                        height : grid.getHeight(),
                        color : color
                        // type : option.splitArea.areaStyle.type,
                    }
                };
                self.shapeList.push(axShape);
            }
            else {
                // 多颜色
                var colorLength = color.length;
                var data        = _valueList;
                var dataLength  = _valueList.length;

                if (option.position == 'bottom' || option.position == 'top') {
                    // 横向
                    var y = grid.getY();
                    var height = grid.getHeight();
                    var lastX = grid.getX();
                    var curX;

                    for (var i = 0; i <= dataLength; i++) {
                        curX = i < dataLength
                               ? getCoord(data[i])
                               : grid.getXend();
                        axShape = {
                            shape : 'rectangle',
                            zlevel : _zlevelBase,
                            hoverable : false,
                            style : {
                                x : lastX,
                                y : y,
                                width : curX - lastX,
                                height : height,
                                color : color[i % colorLength]
                                // type : option.splitArea.areaStyle.type,
                            }
                        };
                        self.shapeList.push(axShape);
                        lastX = curX;
                    }
                }
                else {
                    // 纵向
                    var x = grid.getX();
                    var width = grid.getWidth();
                    var lastYend = grid.getYend();
                    var curY;

                    for (var i = 0; i <= dataLength; i++) {
                        curY = i < dataLength
                               ? getCoord(data[i])
                               : grid.getY();
                        axShape = {
                            shape : 'rectangle',
                            zlevel : _zlevelBase,
                            hoverable : false,
                            style : {
                                x : x,
                                y : curY,
                                width : width,
                                height : lastYend - curY,
                                color : color[i % colorLength]
                                // type : option.splitArea.areaStyle.type
                            }
                        };
                        self.shapeList.push(axShape);
                        lastYend = curY;
                    }
                }
            }
        }

        /**
         * 极值计算
         */
        function _calculateValue() {
            if (isNaN(option.min) || isNaN(option.max)) {
                // 有一个没指定都得算
                // 数据整形
                var oriData;            // 原始数据
                var data = {};          // 整形后数据抽取
                var value;
                var xIdx;
                var yIdx;
                var legend = component.legend;
                for (var i = 0, l = series.length; i < l; i++) {
                    if (series[i].type != ecConfig.CHART_TYPE_LINE
                        && series[i].type != ecConfig.CHART_TYPE_BAR
                        && series[i].type != ecConfig.CHART_TYPE_SCATTER
                        && series[i].type != ecConfig.CHART_TYPE_K
                    ) {
                        // 非坐标轴支持的不算极值
                        continue;
                    }
                    // 请允许我写开，跟上面一个不是一样东西
                    if (legend && !legend.isSelected(series[i].name)){
                        continue;
                    }

                    // 不指定默认为第一轴线
                    xIdx = series[i].xAxisIndex || 0;
                    yIdx = series[i].yAxisIndex || 0;
                    if ((option.xAxisIndex != xIdx)
                        && (option.yAxisIndex != yIdx)
                    ) {
                        // 不是自己的数据不计算极值
                        continue;
                    }

                    if (!series[i].stack) {
                        var key = series[i].name || '';
                        data[key] = [];
                        oriData = series[i].data;
                        for (var j = 0, k = oriData.length; j < k; j++) {
                            value = typeof oriData[j].value != 'undefined'
                                    ? oriData[j].value
                                    : oriData[j];
                            if (series[i].type == ecConfig.CHART_TYPE_SCATTER) {
                                if (option.xAxisIndex != -1) {
                                    data[key].push(value[0]);
                                }
                                if (option.yAxisIndex != -1) {
                                    data[key].push(value[1]);
                                }
                            }
                            else if (series[i].type == ecConfig.CHART_TYPE_K) {
                                data[key].push(value[0]);
                                data[key].push(value[1]);
                                data[key].push(value[2]);
                                data[key].push(value[3]);
                            }
                            else {
                                data[key].push(value);
                            }
                        }
                    }
                    else {
                        // 堆叠数据，需要区分正负向堆叠
                        var keyP = '__Magic_Key_Positive__' + series[i].stack;
                        var keyN = '__Magic_Key_Negative__' + series[i].stack;
                        data[keyP] = data[keyP] || [];
                        data[keyN] = data[keyN] || [];
                        oriData = series[i].data;
                        for (var j = 0, k = oriData.length; j < k; j++) {
                            value = typeof oriData[j].value != 'undefined'
                                    ? oriData[j].value
                                    : oriData[j];
                            if (value == '-') {
                                continue;
                            }
                            value = value - 0;
                            if (value >= 0) {
                                if (typeof data[keyP][j] != 'undefined') {
                                    data[keyP][j] += value;
                                }
                                else {
                                    data[keyP][j] = value;
                                }
                            }
                            else {
                                if (typeof data[keyN][j] != 'undefined') {
                                    data[keyN][j] += value;
                                }
                                else {
                                    data[keyN][j] = value;
                                }
                            }
                        }
                    }
                }
                // 找极值
                for (var i in data){
                    oriData = data[i];
                    for (var j = 0, k = oriData.length; j < k; j++) {
                        if (!isNaN(oriData[j])){
                            _hasData = true;
                            _min = oriData[j];
                            _max = oriData[j];
                            break;
                        }
                    }
                    if (_hasData) {
                        break;
                    }
                }
                for (var i in data){
                    oriData = data[i];
                    for (var j = 0, k = oriData.length; j < k; j++) {
                        if (!isNaN(oriData[j])){
                            _min = Math.min(_min, oriData[j]);
                            _max = Math.max(_max, oriData[j]);
                        }
                    }
                }
            }
            else {
                _hasData = true;
            }
            //console.log(_min,_max,'vvvvv111111')
            _min = isNaN(option.min)
                   ? (_min - Math.abs(_min * option.boundaryGap[0]))
                   : option.min;    // 指定min忽略boundaryGay[0]

            _max = isNaN(option.max)
                   ? (_max + Math.abs(_max * option.boundaryGap[1]))
                   : option.max;    // 指定max忽略boundaryGay[1]
            //console.log(_min,_max,'vvvvv')
            _reformValue(option.scale);
        }

        /**
         * 找到原始数据的极值后根据选项整形最终 _min / _max / _valueList
         * 如果你不知道这个“整形”的用义，请不要试图去理解和修改这个方法！找我也没用，我相信我已经记不起来！
         * 如果你有更简洁的数学推导欢迎重写，后果自负~
         * 一旦你不得不遇到了需要修改或重写的厄运，希望下面的脚手架能帮助你
         * ps:其实我是想说别搞砸了！升级后至少得保证这些case通过！！
         *
         * by linzhifeng@baidu.com 2013-1-8
         * --------
             _valueList = [];
             option = {splitNumber:5,power:100,precision:0};
             _min = 1; _max = 123; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : 0 150 [0, 30, 60, 90, 120, 150]',
                        (_min == 0 && _max == 150) ? 'success' : 'failed');

             _min = 10; _max = 1923; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : 0 2000 [0, 400, 800, 1200, 1600, 2000]',
                        (_min == 0 && _max == 2000) ? 'success' : 'failed');

             _min = 10; _max = 78; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : 0 100 [0, 20, 40, 60, 80, 100]',
                        (_min == 0 && _max == 100) ? 'success' : 'failed');

             _min = -31; _max = -3; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -35 0 [-35, -28, -21, -14, -7, 0]',
                        (_min == -35 && _max == 0) ? 'success' : 'failed');

             _min = -51; _max = 203; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -60 240 [-60, 0, 60, 120, 180, 240]',
                        (_min == -60 && _max == 240) ? 'success' : 'failed');

             _min = -251; _max = 23; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -280 70 [-280, -210, -140, -70, 0, 70]',
                        (_min == -280 && _max == 70) ? 'success' : 'failed');

             option.precision = 2;
             _min = 0.23; _max = 0.78; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : 0.00 1.00'
                 + '["0.00", "0.20", "0.40", "0.60", "0.80", "1.00"]',
                (_min == 0.00 && _max == 1.00) ? 'success' : 'failed');

             _min = -12.23; _max = -0.78; console.log(_min, _max);
             _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -15.00 0.00'
                 + '["-15.00", "-12.00", "-9.00", "-6.00", "-3.00", "0.00"]',
                (_min == -15.00 && _max == 0.00) ? 'success' : 'failed');

             _min = -0.23; _max = 0.78; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -0.30 1.20'
                 + '["-0.30", "0.00", "0.30", "0.60", "0.90", "1.20"]',
                (_min == -0.30 && _max == 1.20) ? 'success' : 'failed');

             _min = -1.23; _max = 0.78; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -1.50 1.00'
                 + '["-1.50", "-1.00", "-0.50", "0.00", "0.50", "1.00"]',
                (_min == -1.50 && _max == 1.00) ? 'success' : 'failed');

             option.precision = 1;
             _min = -2.3; _max = 0.5; console.log(_min, _max); _reformValue();
             console.log('result is :', _min, _max, _valueList);
             console.log('should be : -2.4 0.6'
                 + '["-2.4", "-1.8", "-1.2", "-0.6", "0.0", "0.6"]',
                (_min == -2.4 && _max == 0.6) ? 'success' : 'failed');
         * --------
         */
        function _reformValue(scale) {
            var splitNumber = option.splitNumber;
            var precision = option.precision;
            var splitGap;
            var power;
            if (precision === 0) {    // 整数
                 power = option.power;
            }
            else {                          // 小数
                // 放大倍数后复用整数逻辑，最后再缩小回去
                power = Math.pow(10, precision);
                _min *= power;
                _max *= power;
                power = option.power;
            }
            // console.log(_min,_max)
            var total;
            if (_min >= 0 && _max >= 0) {
                // 双正
                if (!scale) {
                    _min = 0;
                }
                // power自动降级
                while ((_max / power < splitNumber) && power != 1) {
                    power = power / 10;
                }
                total = _max - _min;
                // 粗算
                splitGap = Math.ceil((total / splitNumber) / power) * power;
                if (scale) {
                    if (precision === 0) {    // 整数
                        _min = Math.floor(_min / splitGap) * splitGap;
                    }
                    // 修正
                    if (_min + splitGap * splitNumber < _max) {
                        splitGap = 
                            Math.ceil(((_max - _min) / splitNumber) / power)
                            * power;
                    }
                }
                
                _max = _min + splitGap * splitNumber;
            }
            else if (_min <= 0 && _max <= 0) {
                // 双负
                if (!scale) {
                    _max = 0;
                }
                power = -power;
                // power自动降级
                while ((_min / power < splitNumber) && power != -1) {
                    power = power / 10;
                }
                total = _min - _max;
                splitGap = -Math.ceil((total / splitNumber) / power) * power;
                if (scale) {
                    if (precision === 0) {    // 整数
                        _max = Math.ceil(_max / splitGap) * splitGap;
                    }
                    // 修正
                    if (_max - splitGap * splitNumber > _min) {
                        splitGap = 
                            Math.ceil(((_min - _max) / splitNumber) / power)
                            * power;
                    }
                }
                
                _min = -splitGap * splitNumber + _max;
            }
            else {
                // 一正一负，确保0被选中
                total = _max - _min;
                // power自动降级
                while ((total / power < splitNumber) && power != 1) {
                    power = power/10;
                }
                // 正数部分的分隔数
                var partSplitNumber = Math.round(_max / total * splitNumber);
                // 修正数据范围极度偏正向，留给负数一个
                partSplitNumber -= (partSplitNumber == splitNumber ? 1 : 0);
                // 修正数据范围极度偏负向，留给正数一个
                partSplitNumber += partSplitNumber === 0 ? 1 : 0;
                splitGap = (Math.ceil(Math.max(
                                          _max / partSplitNumber,
                                          _min / (partSplitNumber - splitNumber)
                                      )
                           / power))
                           * power;

                _max = splitGap * partSplitNumber;
                _min = splitGap * (partSplitNumber - splitNumber);
            }
            //console.log(_min,_max,'vvvvvrrrrrr')
            _valueList = [];
            for (var i = 0; i <= splitNumber; i++) {
                _valueList.push(_min + splitGap * i);
            }

            if (precision !== 0) {    // 小数
                 // 放大倍数后复用整数逻辑，最后再缩小回去
                power = Math.pow(10, precision);
                _min = (_min / power).toFixed(precision) - 0;
                _max = (_max / power).toFixed(precision) - 0;
                for (var i = 0; i <= splitNumber; i++) {
                    _valueList[i] = (_valueList[i] / power).toFixed(precision);
                }
            }
            
            _reformLabelData();
        }

        function _reformLabelData() {
            _valueLabel = [];
            var formatter = option.axisLabel.formatter;
            if (formatter) {
                for (var i = 0, l = _valueList.length; i < l; i++) {
                    if (typeof formatter == 'function') {
                        _valueLabel.push(formatter(_valueList[i]));
                    }
                    else if (typeof formatter == 'string') {
                        _valueLabel.push(
                            formatter.replace('{value}',_valueList[i])
                        );
                    }
                }
            }
            else {
                _valueLabel = _valueList;
            }

        }
        
        function getExtremum() {
            _calculateValue();
            return {
                min: _min,
                max: _max
            };
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newOption
         * @param {Object} newGrid
         */
        function init(newOption, newGrid, newSeries) {
            if (!newSeries || newSeries.length === 0) {
                return;
            }
            grid = newGrid;
            
            refresh(newOption, newSeries);
        }

        /**
         * 刷新
         */
        function refresh(newOption, newSeries) {
            if (newOption) {
                option = self.reformOption(newOption);
                // 通用字体设置
                option.axisLabel.textStyle = zrUtil.merge(
                    option.axisLabel.textStyle || {},
                    ecConfig.textStyle,
                    {
                        'overwrite' : false,
                        'recursive' : true
                    }
                );
                option.axisLabel.textStyle = zrUtil.merge(
                    option.axisLabel.textStyle || {},
                    ecConfig.textStyle,
                    {
                        'overwrite' : false,
                        'recursive' : true
                    }
                );
                series = newSeries;
            }
            if (zr) {   // 数值轴的另外一个功能只是用来计算极值
                self.clear();
                _buildShape();
            }
        }

        // 根据值换算位置
        function getCoord(value) {
            value = value < _min ? _min : value;
            value = value > _max ? _max : value;

            var valueRange = _max - _min;
            var total;
            var result;
            if (option.position == 'left' || option.position == 'right') {
                // 纵向
                total = grid.getHeight();
                result = grid.getYend() - (value - _min) / valueRange * total;
            }
            else {
                // 横向
                total = grid.getWidth();
                result = (value - _min) / valueRange * total + grid.getX();
            }

            // Math.floor可能引起一些偏差，但性能会更好
            return (value == _min || value == _max)
                   ? result
                   : Math.floor(result);
        }

        function getPosition() {
            return option.position;
        }

        self.init = init;
        self.refresh = refresh;
        self.getExtremum = getExtremum;
        self.getCoord = getCoord;
        self.getPosition = getPosition;

        init(option, grid, series);
    }

    require('../component').define('valueAxis', ValueAxis);
    
    return ValueAxis;
});


/**
 * echarts组件类： 坐标轴
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * 直角坐标系中坐标轴数组，数组中每一项代表一条横轴（纵轴）坐标轴。
 * 标准（1.0）中规定最多同时存在2条横轴和2条纵轴
 *    单条横轴时可指定安放于grid的底部（默认）或顶部，2条同时存在时则默认第一条安放于底部，第二天安放于顶部
 *    单条纵轴时可指定安放于grid的左侧（默认）或右侧，2条同时存在时则默认第一条安放于左侧，第二天安放于右侧。
 * 坐标轴有两种类型，类目型和数值型（区别详见axis）：
 *    横轴通常为类目型，但条形图时则横轴为数值型，散点图时则横纵均为数值型
 *    纵轴通常为数值型，但条形图时则纵轴为类目型。
 *
 */
define('echarts/component/axis',['require','./base','../config','./categoryAxis','./valueAxis','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表选项
     *     @param {string=} option.xAxis.type 坐标轴类型，横轴默认为类目型'category'
     *     @param {string=} option.yAxis.type 坐标轴类型，纵轴默认为类目型'value'
     * @param {Object} component 组件
     * @param {string} axisType 横走or纵轴
     */
    function Axis(messageCenter, zr, option, component, axisType) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_AXIS;

        var _axisList = [];

        /**
         * 参数修正&默认值赋值，重载基类方法
         * @param {Object} opt 参数
         */
        function reformOption(opt) {
            // 不写或传了个空数值默认为数值轴
            if (!opt
                || (opt instanceof Array && opt.length === 0)
            ) {
                opt = [{
                    type : ecConfig.COMPONENT_TYPE_AXIS_VALUE
                }];
            }
            else if (!(opt instanceof Array)){
                opt = [opt];
            }

            // 最多两条，其他参数忽略
            if (opt.length > 2) {
                opt = [opt[0],opt[1]];
            }


            if (axisType == 'xAxis') {
                // 横轴位置默认配置
                if (!opt[0].position            // 没配置或配置错
                    || (opt[0].position != 'bottom'
                        && opt[0].position != 'top')
                ) {
                    opt[0].position = 'bottom';
                }
                if (opt.length > 1) {
                    opt[1].position = opt[0].position == 'bottom'
                                      ? 'top' : 'bottom';
                }

                for (var i = 0, l = opt.length; i < l; i++) {
                    // 坐标轴类型，横轴默认为类目型'category'
                    opt[i].type = opt[i].type || 'category';
                    // 标识轴类型&索引
                    opt[i].xAxisIndex = i;
                    opt[i].yAxisIndex = -1;
                }
            }
            else {
                // 纵轴位置默认配置
                if (!opt[0].position            // 没配置或配置错
                    || (opt[0].position != 'left'
                        && opt[0].position != 'right')
                ) {
                    opt[0].position = 'left';
                }

                if (opt.length > 1) {
                    opt[1].position = opt[0].position == 'left'
                                      ? 'right' : 'left';
                }

                for (var i = 0, l = opt.length; i < l; i++) {
                    // 坐标轴类型，纵轴默认为数值型'value'
                    opt[i].type = opt[i].type || 'value';
                    // 标识轴类型&索引
                    opt[i].xAxisIndex = -1;
                    opt[i].yAxisIndex = i;
                }
            }

            return opt;
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newOption
         * @param {Object} newCompoent
         */
        function init(newOption, newCompoent, newAxisType) {
            component = newCompoent;
            axisType = newAxisType;

            self.clear();

            var axisOption;
            if (axisType == 'xAxis') {
                option.xAxis =self.reformOption(newOption.xAxis);
                axisOption = option.xAxis;
            }
            else {
                option.yAxis = reformOption(newOption.yAxis);
                axisOption = option.yAxis;
            }

            var CategoryAxis = require('./categoryAxis');
            var ValueAxis = require('./valueAxis');
            for (var i = 0, l = axisOption.length; i < l; i++) {
                _axisList.push(
                    axisOption[i].type == 'category'
                    ? new CategoryAxis(
                          messageCenter, zr,
                          axisOption[i], component
                      )
                    : new ValueAxis(
                          messageCenter, zr,
                          axisOption[i], component,
                          option.series
                      )
                );
            }
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            var axisOption;
            var series;
            if (newOption) {
                if (axisType == 'xAxis') {
                    option.xAxis =self.reformOption(newOption.xAxis);
                    axisOption = option.xAxis;
                }
                else {
                    option.yAxis = reformOption(newOption.yAxis);
                    axisOption = option.yAxis;
                }
                series = newOption.series;
            }
            
            for (var i = 0, l = _axisList.length; i < l; i++) {
                _axisList[i].refresh && _axisList[i].refresh(
                    axisOption ? axisOption[i] : false, series
                );
            }
        }

        /**
         * 根据值换算位置
         * @param {number} idx 坐标轴索引0~1
         */
        function getAxis(idx) {
            return _axisList[idx];
        }

        /**
         * 清除坐标轴子对象，实例仍可用，重载基类方法
         */
        function clear() {
            for (var i = 0, l = _axisList.length; i < l; i++) {
                _axisList[i].dispose && _axisList[i].dispose();
            }
            _axisList = [];
        }

        // 重载基类方法
        self.clear = clear;
        self.reformOption = reformOption;

        self.init = init;
        self.refresh = refresh;
        self.getAxis = getAxis;

        init(option, component, axisType);
    }

    require('../component').define('axis', Axis);
     
    return Axis;
});
/**
 * echarts组件： 网格
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/grid',['require','./base','../config','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表选项
     *      @param {number=} option.grid.x 直角坐标系内绘图网格起始横坐标，数值单位px
     *      @param {number=} option.grid.y 直角坐标系内绘图网格起始纵坐标，数值单位px
     *      @param {number=} option.grid.width 直角坐标系内绘图网格宽度，数值单位px
     *      @param {number=} option.grid.height 直角坐标系内绘图网格高度，数值单位px
     */
    function Grid(messageCenter, zr, option) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_GRID;

        var _zlevelBase = self.getZlevelBase();

        var _x;
        var _y;
        var _width;
        var _height;
        var _zrWidth;
        var _zrHeight;

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newOption
         */
        function init(newOption) {
            option = newOption;

            option.grid = self.reformOption(option.grid);

            var gridOption = option.grid;
            _x = gridOption.x;
            _y = gridOption.y;
            var x2 = gridOption.x2;
            var y2 = gridOption.y2;
            _zrWidth = zr.getWidth();
            _zrHeight = zr.getHeight();

            if (typeof gridOption.width == 'undefined') {
                _width = _zrWidth - _x - x2;
            }
            else {
                _width = gridOption.width;
            }

            if (typeof gridOption.height == 'undefined') {
                _height = _zrHeight - _y - y2;
            }
            else {
                _height = gridOption.height;
            }

            self.shapeList.push({
                shape : 'rectangle',
                id : zr.newShapeId('grid'),
                zlevel : _zlevelBase,
                hoverable : false,
                style : {
                    x : _x,
                    y : _y,
                    width : _width,
                    height : _height,
                    brushType : 'both',
                    color : gridOption.backgroundColor,
                    strokeColor: gridOption.borderColor,
                    lineWidth : gridOption.borderWidth
                    // type : option.splitArea.areaStyle.type,
                }
            });
            zr.addShape(self.shapeList[0]);
        }

        function getX() {
            return _x;
        }

        function getY() {
            return _y;
        }

        function getWidth() {
            return _width;
        }

        function getHeight() {
            return _height;
        }

        function getXend() {
            return _x + _width;
        }

        function getYend() {
            return _y + _height;
        }

        function getArea() {
            return {
                x : _x,
                y : _y,
                width : _width,
                height : _height
            };
        }
        
        function refresh(newOption) {
            if (_zrWidth != zr.getWidth() 
                || _zrHeight != zr.getHeight()
                || newOption
            ) {
                self.clear();
                init(newOption || option);
            }
        }

        self.init = init;
        self.getX = getX;
        self.getY = getY;
        self.getWidth = getWidth;
        self.getHeight = getHeight;
        self.getXend = getXend;
        self.getYend = getYend;
        self.getArea = getArea;
        self.refresh = refresh;

        init(option);
    }

    require('../component').define('grid', Grid);
    
    return Grid;
});
/**
 * echarts组件：数据区域缩放
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/dataZoom',['require','./base','../config','../component','zrender/tool/util','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表参数
     * @param {Object} component 组件
     */
    function DataZoom(messageCenter, zr, option, component) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_DATAZOOM;

        var _zlevelBase = self.getZlevelBase();

        var zoomOption;

        var _fillerSize = 30;       // 填充大小
        var _handleSize = 10;       // 手柄大小
        var _location;              // 位置参数，通过计算所得x, y, width, height
        var _zoom;                  // 缩放参数
        var _fillerShae;
        var _startShape;
        var _endShape;

        var _syncTicket;
        var _isSilence = false;

        var _originalData;

        function _buildShape() {
            _buildBackground();
            _buildDataBackground();
            _buildFiller();
            _bulidHandle();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }

            _syncData();
        }

        /**
         * 根据选项计算实体的位置坐标
         */
        function _getLocation() {
            var x;
            var y;
            var width;
            var height;
            var grid = component.grid;

            // 不指定则根据grid适配
            if (zoomOption.orient == 'horizontal') {
                // 水平布局
                width = zoomOption.width || grid.getWidth();
                height = zoomOption.height || _fillerSize;
                x = typeof zoomOption.x != 'undefined'
                    ? zoomOption.x : grid.getX();
                y = typeof zoomOption.y != 'undefined'
                    ? zoomOption.y : (zr.getHeight() - height);
            }
            else {
                // 垂直布局
                width = zoomOption.width || _fillerSize;
                height = zoomOption.height || grid.getHeight();
                x = typeof zoomOption.x != 'undefined'
                    ? zoomOption.x : 0;
                y = typeof zoomOption.y != 'undefined'
                    ? zoomOption.y : grid.getY();
            }

            return {
                x : x,
                y : y,
                width : width,
                height : height
            };
        }

        /**
         * 计算缩放参数
         * 修正单坐标轴只传对象为数组。
         */
        function _getZoom() {
            var series = option.series;
            var xAxis = option.xAxis;
            if (xAxis && !(xAxis instanceof Array)) {
                xAxis = [xAxis];
                option.xAxis = xAxis;
            }
            var yAxis = option.yAxis;
            if (yAxis && !(yAxis instanceof Array)) {
                yAxis = [yAxis];
                option.yAxis = yAxis;
            }

            var zoomSeriesIndex = [];
            var xAxisIndex;
            var yAxisIndex;

            var zOptIdx = zoomOption.xAxisIndex;
            if (xAxis && typeof zOptIdx == 'undefined') {
                xAxisIndex = [];
                for (var i = 0, l = xAxis.length; i < l; i++) {
                    // 横纵默认为类目轴
                    if (xAxis[i].type == 'category'
                        || typeof xAxis[i].type == 'undefined'
                    ) {
                        xAxisIndex.push(i);
                    }
                }
            }
            else {
                if (zOptIdx instanceof Array) {
                    xAxisIndex = zOptIdx;
                }
                else if (typeof zOptIdx != 'undefined') {
                    xAxisIndex = [zOptIdx];
                }
                else {
                    xAxisIndex = [];
                }
            }

            zOptIdx = zoomOption.yAxisIndex;
            if (yAxis && typeof zOptIdx == 'undefined') {
                yAxisIndex = [];
                for (var i = 0, l = yAxis.length; i < l; i++) {
                    if (yAxis[i].type == 'category') {
                        yAxisIndex.push(i);
                    }
                }
            }
            else {
                if (zOptIdx instanceof Array) {
                    yAxisIndex = zOptIdx;
                }
                else if (typeof zOptIdx != 'undefined') {
                    yAxisIndex = [zOptIdx];
                }
                else {
                    yAxisIndex = [];
                }
            }

            // 找到缩放控制的所有series
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type != ecConfig.CHART_TYPE_LINE
                    && series[i].type != ecConfig.CHART_TYPE_BAR
                    && series[i].type != ecConfig.CHART_TYPE_SCATTER
                    && series[i].type != ecConfig.CHART_TYPE_K
                ) {
                    continue;
                }
                for (var j = 0, k = xAxisIndex.length; j < k; j++) {
                    if (xAxisIndex[j] == (series[i].xAxisIndex || 0)) {
                        zoomSeriesIndex.push(i);
                        break;
                    }
                }
                for (var j = 0, k = yAxisIndex.length; j < k; j++) {
                    if (yAxisIndex[j] == (series[i].yAxisIndex || 0)) {
                        zoomSeriesIndex.push(i);
                        break;
                    }
                }
                // 不指定接管坐标轴，则散点图被纳入接管范围
                if (series[i].type == ecConfig.CHART_TYPE_SCATTER
                    && typeof zoomOption.xAxisIndex == 'undefined'
                    && typeof zoomOption.yAxisIndex == 'undefined'
                ) {
                    zoomSeriesIndex.push(i);
                }
            }

            var start = typeof zoomOption.start != 'undefined'
                        && zoomOption.start >= 0
                        && zoomOption.start <= 100
                        ? zoomOption.start : 0;
            var end = typeof zoomOption.end != 'undefined'
                      && zoomOption.end >= 0
                      && zoomOption.end <= 100
                      ? zoomOption.end : 100;
            if (start > end) {
                // 大小颠倒自动翻转
                start = start + end;
                end = start - end;
                start = start - end;
            }
            var size = Math.round(
                           (end - start) / 100
                           * (zoomOption.orient == 'horizontal'
                             ? _location.width : _location.height)
                       );
            return {
                start : start,
                end : end,
                start2 : 0,
                end2 : 100,
                size : size,
                xAxisIndex : xAxisIndex,
                yAxisIndex : yAxisIndex,
                seriesIndex : zoomSeriesIndex
            };
        }

        function _backupData() {
            _originalData = {
                xAxis : {},
                yAxis : {},
                series : {}
            };
            var xAxis = option.xAxis;
            var xAxisIndex = _zoom.xAxisIndex;
            for (var i = 0, l = xAxisIndex.length; i < l; i++) {
                _originalData.xAxis[xAxisIndex[i]] = xAxis[xAxisIndex[i]].data;
            }

            var yAxis = option.yAxis;
            var yAxisIndex = _zoom.yAxisIndex;
            for (var i = 0, l = yAxisIndex.length; i < l; i++) {
                _originalData.yAxis[yAxisIndex[i]] = yAxis[yAxisIndex[i]].data;
            }

            var series = option.series;
            var seriesIndex = _zoom.seriesIndex;
            var serie;
            for (var i = 0, l = seriesIndex.length; i < l; i++) {
                serie = series[seriesIndex[i]];
                _originalData.series[seriesIndex[i]] = serie.data;
                if (serie.type == ecConfig.CHART_TYPE_SCATTER) {
                    _calculScatterMap(seriesIndex[i]);
                }
            }
        }
        
        function _calculScatterMap(seriesIndex) {
            _zoom.scatterMap = _zoom.scatterMap || {};
            _zoom.scatterMap[seriesIndex] = _zoom.scatterMap[seriesIndex] || {};
            var componentLibrary = require('../component');
            var zrUtil = require('zrender/tool/util');
            // x轴极值
            var Axis = componentLibrary.get('axis');
            var axisOption = zrUtil.clone(option.xAxis);
            if (axisOption instanceof Array) {
                axisOption[0].type = 'value';
                axisOption[1] && (axisOption[1].type = 'value');
            }
            else {
                axisOption.type = 'value';
            }
            var vAxis = new Axis(
                null,   // messageCenter
                false,  // zr
                {
                    xAxis: axisOption,
                    series : option.series
                }, 
                component,
                'xAxis'
            );
            var axisIndex = option.series[seriesIndex].xAxisIndex || 0;
            _zoom.scatterMap[seriesIndex].x = 
                vAxis.getAxis(axisIndex).getExtremum();
            vAxis.dispose();
            
            // y轴极值
            axisOption = zrUtil.clone(option.yAxis);
            if (axisOption instanceof Array) {
                axisOption[0].type = 'value';
                axisOption[1] && (axisOption[1].type = 'value');
            }
            else {
                axisOption.type = 'value';
            }
            vAxis = new Axis(
                null,   // messageCenter
                false,  // zr
                {
                    yAxis: axisOption,
                    series : option.series
                }, 
                component,
                'yAxis'
            );
            axisIndex = option.series[seriesIndex].yAxisIndex || 0;
            _zoom.scatterMap[seriesIndex].y = 
                vAxis.getAxis(axisIndex).getExtremum();
            vAxis.dispose();
            // console.log(_zoom.scatterMap);
        }

        function _buildBackground() {
            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _location.x,
                    y : _location.y,
                    width : _location.width,
                    height : _location.height,
                    color : zoomOption.backgroundColor
                }
            });
        }

        function _buildDataBackground() {
            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _location.x,
                    y : _location.y,
                    width : _location.width,
                    height : _location.height,
                    color : zoomOption.backgroundColor
                }
            });

            var maxLength = 0;
            var xAxis = option.xAxis;
            var xAxisIndex = _zoom.xAxisIndex;
            for (var i = 0, l = xAxisIndex.length; i < l; i++) {
                maxLength = Math.max(
                    maxLength, xAxis[xAxisIndex[i]].data.length
                );
            }
            var yAxis = option.yAxis;
            var yAxisIndex = _zoom.yAxisIndex;
            for (var i = 0, l = yAxisIndex.length; i < l; i++) {
                maxLength = Math.max(
                    maxLength, yAxis[yAxisIndex[i]].data.length
                );
            }

            var data = option.series[_zoom.seriesIndex[0]].data;
            var maxValue = Number.MIN_VALUE;
            var minValue = Number.MAX_VALUE;
            var value;
            for (var i = 0, l = data.length; i < l; i++) {
                value = typeof data[i] != 'undefined'
                        ? (typeof data[i].value != 'undefined'
                          ? data[i].value : data[i])
                        : 0;
                if (option.series[_zoom.seriesIndex[0]].type 
                    == ecConfig.CHART_TYPE_K
                ) {
                    value = value[1];   // 收盘价
                }
                if (isNaN(value)) {
                    value = 0;
                }
                maxValue = Math.max(maxValue, value);
                minValue = Math.min(minValue, value);
            }

            var pointList = [];
            var x = _location.width / maxLength;
            var y = _location.height / maxLength;
            for (var i = 0, l = maxLength; i < l; i++) {
                value = typeof data[i] != 'undefined'
                        ? (typeof data[i].value != 'undefined'
                          ? data[i].value : data[i])
                        : 0;
                if (option.series[_zoom.seriesIndex[0]].type 
                    == ecConfig.CHART_TYPE_K
                ) {
                    value = value[1];   // 收盘价
                }
                if (isNaN(value)) {
                    value = 0;
                }
                if (zoomOption.orient == 'horizontal') {
                    pointList.push([
                        _location.x + x * i,
                        _location.y + _location.height - 5 - Math.round(
                            (value - minValue)
                            / (maxValue - minValue)
                            * (_location.height - 10)
                        )
                    ]);
                }
                else {
                    pointList.push([
                        _location.x + 5 + Math.round(
                            (value - minValue)
                            / (maxValue - minValue)
                            * (_location.width - 10)
                        ),
                        _location.y + y * i
                    ]);
                }
            }
            if (zoomOption.orient == 'horizontal') {
                 pointList.push([
                    _location.x + _location.width,
                    _location.y + _location.height
                ]);
                pointList.push([
                    _location.x, _location.y + _location.height
                ]);
            }
            else {
                pointList.push([
                    _location.x, _location.y + _location.height
                ]);
                pointList.push([
                    _location.x, _location.y
                ]);
            }

            self.shapeList.push({
                shape : 'polygon',
                zlevel : _zlevelBase,
                style : {
                    pointList : pointList,
                    color : zoomOption.dataBackgroundColor
                },
                hoverable : false
            });
        }

        /**
         * 构建填充物
         */
        function _buildFiller() {
            _fillerShae = {
                shape : 'rectangle',
                zlevel : _zlevelBase,
                draggable : true,
                ondrift : _ondrift,
                ondragend : _ondragend,
                _type : 'filler'
            };

            if (zoomOption.orient == 'horizontal') {
                // 横向
                _fillerShae.style = {
                    x : _location.x
                        + Math.round(_zoom.start / 100 * _location.width)
                        + _handleSize,
                    y : _location.y + 3,
                    width : _zoom.size - _handleSize * 2,
                    height : _location.height - 6,
                    color : zoomOption.fillerColor,
                    text : ':::',
                    textPosition : 'inside'
                };
            }
            else {
                _fillerShae.style ={
                    x : _location.x + 3,
                    y : _location.y
                        + Math.round(_zoom.start / 100 * _location.height)
                        + _handleSize,
                    width :  _location.width - 6,
                    height : _zoom.size - _handleSize * 2,
                    color : zoomOption.fillerColor,
                    text : '=',
                    textPosition : 'inside'
                };
            }

            self.shapeList.push(_fillerShae);
        }

        /**
         * 构建拖拽手柄
         */
        function _bulidHandle() {
            _startShape = {
                shape : 'rectangle',
                zlevel : _zlevelBase
            };
            _endShape = {
                shape : 'rectangle',
                zlevel : _zlevelBase
            };

            _startShape.draggable = true;
            _startShape.ondrift = _ondrift;
            _startShape.ondragend = _ondragend;
            _endShape.draggable = true;
            _endShape.ondrift = _ondrift;
            _endShape.ondragend = _ondragend;

            if (zoomOption.orient == 'horizontal') {
                // 头
                _startShape.style = {
                    x : _fillerShae.style.x - _handleSize,
                    y : _location.y,
                    width : _handleSize,
                    height : _location.height,
                    color : zoomOption.handleColor,
                    text : '|',
                    textPosition : 'inside'
                };
                // 尾
                _endShape.style = {
                    x : _fillerShae.style.x + _fillerShae.style.width,
                    y : _location.y,
                    width : _handleSize,
                    height : _location.height,
                    color : zoomOption.handleColor,
                    text : '|',
                    textPosition : 'inside'
                };
            }
            else {
                // 头
                _startShape.style = {
                    x : _location.x,
                    y : _fillerShae.style.y - _handleSize,
                    width : _location.width,
                    height : _handleSize,
                    color : zoomOption.handleColor,
                    text : '—',
                    textPosition : 'inside'
                };
                // 尾
                _endShape.style = {
                    x : _location.x,
                    y : _fillerShae.style.y + _fillerShae.style.height,
                    width : _location.width,
                    height : _handleSize,
                    color : zoomOption.handleColor,
                    text : '—',
                    textPosition : 'inside'
                };
            }

            self.shapeList.push(_startShape);
            self.shapeList.push(_endShape);
        }

        /**
         * 拖拽范围控制
         */
        function _ondrift(e, dx, dy) {
            if (zoomOption.zoomLock) {
                // zoomLock时把handle转成filler的拖拽
                e = _fillerShae;
            }
            
            var detailSize = e._type == 'filler' ? _handleSize : 0;
            if (zoomOption.orient == 'horizontal') {
                if (e.style.x + dx - detailSize <= _location.x) {
                    e.style.x = _location.x + detailSize;
                }
                else if (e.style.x + dx + e.style.width + detailSize
                         >= _location.x + _location.width
                ) {
                    e.style.x = _location.x + _location.width
                                - e.style.width - detailSize;
                }
                else {
                    e.style.x += dx;
                }
            }
            else {
                if (e.style.y + dy - detailSize <= _location.y) {
                    e.style.y = _location.y + detailSize;
                }
                else if (e.style.y + dy + e.style.height + detailSize
                         >= _location.y + _location.height
                ) {
                    e.style.y = _location.y + _location.height
                                - e.style.height - detailSize;
                }
                else {
                    e.style.y += dy;
                }
            }

            if (e._type == 'filler') {
                _syncHandleShape();
            }
            else {
                _syncFillerShape();
            }

            if (zoomOption.realtime) {
                _syncData();
            }
            else {
                clearTimeout(_syncTicket);
                _syncTicket = setTimeout(_syncData, 200);
            }

            return true;
        }

        function _syncHandleShape() {
            if (zoomOption.orient == 'horizontal') {
                _startShape.style.x = _fillerShae.style.x - _handleSize;
                _endShape.style.x = _fillerShae.style.x
                                    + _fillerShae.style.width;
                _zoom.start = Math.floor(
                    (_startShape.style.x - _location.x)
                    / _location.width * 100
                );
                _zoom.end = Math.ceil(
                    (_endShape.style.x + _handleSize - _location.x)
                    / _location.width * 100
                );
            }
            else {
                _startShape.style.y = _fillerShae.style.y - _handleSize;
                _endShape.style.y = _fillerShae.style.y
                                    + _fillerShae.style.height;
                _zoom.start = Math.floor(
                    (_startShape.style.y - _location.y)
                    / _location.height * 100
                );
                _zoom.end = Math.ceil(
                    (_endShape.style.y + _handleSize - _location.y)
                    / _location.height * 100
                );
            }

            zr.modShape(_startShape.id, _startShape);
            zr.modShape(_endShape.id, _endShape);
            zr.refresh();
        }

        function _syncFillerShape() {
            var a;
            var b;
            if (zoomOption.orient == 'horizontal') {
                a = _startShape.style.x;
                b = _endShape.style.x;
                _fillerShae.style.x = Math.min(a, b) + _handleSize;
                _fillerShae.style.width = Math.abs(a - b) - _handleSize;
                _zoom.start = Math.floor(
                    (Math.min(a, b) - _location.x)
                    / _location.width * 100
                );
                _zoom.end = Math.ceil(
                    (Math.max(a, b) + _handleSize - _location.x)
                    / _location.width * 100
                );
            }
            else {
                a = _startShape.style.y;
                b = _endShape.style.y;
                _fillerShae.style.y = Math.min(a, b) + _handleSize;
                _fillerShae.style.height = Math.abs(a - b) - _handleSize;
                _zoom.start = Math.floor(
                    (Math.min(a, b) - _location.y)
                    / _location.height * 100
                );
                _zoom.end = Math.ceil(
                    (Math.max(a, b) + _handleSize - _location.y)
                    / _location.height * 100
                );
            }

            zr.modShape(_fillerShae.id, _fillerShae);
            zr.refresh();
        }
        
        function _syncShape() {
            if (!zoomOption.show) {
                // 没有伸缩控件
                return;
            }
            if (zoomOption.orient == 'horizontal') {
                _startShape.style.x = _location.x 
                                      + _zoom.start / 100 * _location.width;
                _endShape.style.x = _location.x 
                                    + _zoom.end / 100 * _location.width
                                    - _handleSize;
                    
                _fillerShae.style.x = _startShape.style.x + _handleSize;
                _fillerShae.style.width = _endShape.style.x 
                                          - _startShape.style.x
                                          - _handleSize;
            }
            else {
                _startShape.style.y = _location.y 
                                      + _zoom.start / 100 * _location.height;
                _endShape.style.y = _location.y 
                                    + _zoom.end / 100 * _location.height
                                    - _handleSize;
                    
                _fillerShae.style.y = _startShape.style.y + _handleSize;
                _fillerShae.style.height = _endShape.style.y 
                                          - _startShape.style.y
                                          - _handleSize;
            }
            
            zr.modShape(_startShape.id, _startShape);
            zr.modShape(_endShape.id, _endShape);
            zr.modShape(_fillerShae.id, _fillerShae);
            zr.refresh();
        }

        function  _syncData(dispatchNow) {
            var target;
            var start;
            var end;
            var length;
            var data;
            for (var key in _originalData) {
                target = _originalData[key];
                for (var idx in target) {
                    data = target[idx];
                    length = data.length;
                    start = Math.floor(_zoom.start / 100 * length);
                    end = Math.ceil(_zoom.end / 100 * length);
                    if (option[key][idx].type != ecConfig.CHART_TYPE_SCATTER) {
                        option[key][idx].data = data.slice(start, end);
                    }
                    else {
                        // 散点图特殊处理
                        option[key][idx].data = _synScatterData(idx, data);
                    }
                }
            }

            if (!_isSilence && (zoomOption.realtime || dispatchNow)) {
                messageCenter.dispatch(
                    ecConfig.EVENT.DATA_ZOOM,
                    null,
                    {zoom: _zoom}
                );
            }

            zoomOption.start = _zoom.start;
            zoomOption.end = _zoom.end;
        }
        
        function _synScatterData(seriesIndex, data) {
            var newData = [];
            var scale = _zoom.scatterMap[seriesIndex];
            var total;
            var xStart;
            var xEnd;
            var yStart;
            var yEnd;
            
            if (zoomOption.orient == 'horizontal') {
                total = scale.x.max - scale.x.min;
                xStart = _zoom.start / 100 * total + scale.x.min;
                xEnd = _zoom.end / 100 * total + scale.x.min;
                
                total = scale.y.max - scale.y.min;
                yStart = _zoom.start2 / 100 * total + scale.y.min;
                yEnd = _zoom.end2 / 100 * total + scale.y.min;
            }
            else {
                total = scale.x.max - scale.x.min;
                xStart = _zoom.start2 / 100 * total + scale.x.min;
                xEnd = _zoom.end2 / 100 * total + scale.x.min;
                
                total = scale.y.max - scale.y.min;
                yStart = _zoom.start / 100 * total + scale.y.min;
                yEnd = _zoom.end / 100 * total + scale.y.min;
            }
            
            // console.log(xStart,xEnd,yStart,yEnd);
            for (var i = 0, l = data.length; i < l; i++) {
                if (data[i][0] >= xStart 
                    && data[i][0] <= xEnd
                    && data[i][1] >= yStart
                    && data[i][1] <= yEnd
                ) {
                    newData.push(data[i]);
                }
            }
            
            return newData;
        }

        function _ondragend() {
            self.isDragend = true;
        }

        /**
         * 数据项被拖拽出去
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

             _syncData();

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.dragIn = true;
            if (!_isSilence && !zoomOption.realtime) {
                messageCenter.dispatch(
                    ecConfig.EVENT.DATA_ZOOM,
                    null,
                    {zoom: _zoom}
                );
            }
            status.needRefresh = false; // 会有消息触发fresh，不用再刷一遍
            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

        function ondataZoom(param, status) {
            status.needRefresh = true;
            return;
        }
        
        function absoluteZoom(param) {
            zoomOption.start = _zoom.start = param.start;
            zoomOption.end = _zoom.end = param.end;
            zoomOption.start2 = _zoom.start2 = param.start2;
            zoomOption.end2 = _zoom.end2 = param.end2;
            //console.log(rect,gridArea,_zoom,total)
            _syncShape();
            _syncData(true);
            return;
        }
        
        function rectZoom(param) {
            if (!param) {
                // 重置拖拽
                zoomOption.start = 
                zoomOption.start2 = 
                _zoom.start = 
                _zoom.start2 = 0;
                    
                zoomOption.end =
                zoomOption.end2 = 
                _zoom.end = 
                _zoom.end2 = 100;
                
                _syncShape();
                _syncData(true);
                return _zoom;
            }
            var gridArea = component.grid.getArea();
            var rect = {
                x : param.x,
                y : param.y,
                width : param.width,
                height : param.height
            };
            // 修正方向框选
            if (rect.width < 0) {
                rect.x += rect.width;
                rect.width = -rect.width;
            }
            if (rect.height < 0) {
                rect.y += rect.height;
                rect.height = -rect.height;
            }
            // console.log(rect,_zoom);
            
            // 剔除无效缩放
            if (rect.x > gridArea.x + gridArea.width
                || rect.y > gridArea.y + gridArea.height
            ) {
                return false; // 无效缩放
            }
            
            // 修正框选超出
            if (rect.x < gridArea.x) {
                rect.x = gridArea.x;
            }
            if (rect.x + rect.width > gridArea.x + gridArea.width) {
                rect.width = gridArea.x + gridArea.width - rect.x;
            }
            if (rect.y + rect.height > gridArea.y + gridArea.height) {
                rect.height = gridArea.y + gridArea.height - rect.y;
            }
            
            var total;
            var sdx = (rect.x - gridArea.x) / gridArea.width;
            var edx = 1- (rect.x + rect.width - gridArea.x) / gridArea.width;
            var sdy = 1- (rect.y + rect.height - gridArea.y) / gridArea.height;
            var edy = (rect.y - gridArea.y) / gridArea.height;
            //console.log('this',sdy,edy,_zoom.start,_zoom.end)
            if (zoomOption.orient == 'horizontal') {
                total = _zoom.end - _zoom.start;
                _zoom.start += total * sdx;
                _zoom.end -= total * edx;
                
                total = _zoom.end2 - _zoom.start2;
                _zoom.start2 += total * sdy;
                _zoom.end2 -= total * edy;
            }
            else {
                total = _zoom.end - _zoom.start;
                _zoom.start += total * sdy;
                _zoom.end -= total * edy;
                
                total = _zoom.end2 - _zoom.start2;
                _zoom.start2 += total * sdx;
                _zoom.end2 -= total * edx;
            }
            //console.log(_zoom.start,_zoom.end,_zoom.start2,_zoom.end2)
            zoomOption.start = _zoom.start;
            zoomOption.end = _zoom.end;
            zoomOption.start2 = _zoom.start2;
            zoomOption.end2 = _zoom.end2;
            //console.log(rect,gridArea,_zoom,total)
            _syncShape();
            _syncData(true);
            return _zoom;
        }
        
        function syncBackupData(curOption, optionBackup) {
            var start;
            var target = _originalData['series'];
            var curSeries = curOption.series;
            var curData;
            for (var i = 0, l = curSeries.length; i < l; i++) {
                curData = curSeries[i].data;
                if (target[i]) {
                    // dataZoom接管的
                    start = Math.floor(_zoom.start / 100 * target[i].length);
                }
                else {
                    // 非dataZoom接管
                    start = 0;
                }
                for (var j = 0, k = curData.length; j < k; j++) {
                    optionBackup.series[i].data[j + start] = curData[j];
                    if (target[i]) {
                        // 同步内部备份
                        target[i][j + start] 
                            = curData[j];
                    }
                }
            }
        }
        function silence(s) {
            _isSilence = s;
        }

        function init(newOption) {
            option = newOption;

            option.dataZoom = self.reformOption(option.dataZoom);

            zoomOption = option.dataZoom;

            self.clear();
            
            // 自己show 或者 toolbox启用且dataZoom有效
            if (option.dataZoom.show
                || (
                    self.deepQuery([option], 'toolbox.show')
                    && self.deepQuery([option], 'toolbox.feature.dataZoom')
                )
            ) {
                _location = _getLocation();
                _zoom =  _getZoom();
                _backupData();
            }
            
            if (option.dataZoom.show) {
                _buildShape();
            }
        }

        /**
         * 避免dataZoom带来两次refresh，不设refresh接口，resize重复一下buildshape逻辑 
         */
        function resize() {
            self.clear();
            
            // 自己show 或者 toolbox启用且dataZoom有效
            if (option.dataZoom.show
                || (
                    self.deepQuery([option], 'toolbox.show')
                    && self.deepQuery([option], 'toolbox.feature.dataZoom')
                )
            ) {
                _location = _getLocation();
                _zoom =  _getZoom();
            }
            
            if (option.dataZoom.show) {
                _buildBackground();
                _buildDataBackground();
                _buildFiller();
                _bulidHandle();
    
                for (var i = 0, l = self.shapeList.length; i < l; i++) {
                    self.shapeList[i].id = zr.newShapeId(self.type);
                    zr.addShape(self.shapeList[i]);
                }
            }
        }
        
        self.init = init;
        self.resize = resize;
        self.syncBackupData = syncBackupData;
        self.absoluteZoom = absoluteZoom;
        self.rectZoom = rectZoom;
        self.ondragend = ondragend;
        self.ondataZoom = ondataZoom;
        self.silence = silence;

        init(option);
    }

    require('../component').define('dataZoom', DataZoom);
    
    return DataZoom;
});
/**
 * echarts组件：图例
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/legend',['require','./base','../config','zrender/tool/area','zrender/shape','zrender/shape','zrender/shape','zrender/shape','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表参数
     * @param {Object=} selected 用于状态保持
     */
    function Legend(messageCenter, zr, option, selected) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var zrArea = require('zrender/tool/area');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_LEGEND;

        var legendOption;                       // 图例选项，共享数据源
        var _zlevelBase = self.getZlevelBase();

        var _itemGroupLocation = {};    // 图例元素组的位置参数，通过计算所得x, y, width, height

        var _colorIndex = 0;
        var _colorMap = {};
        var _selectedMap = {};

        var icon = require('zrender/shape').get('icon');
        for (var k in legendIcon) {
            icon.define('legendicon' + k, legendIcon[k]);
            //console.log('legendicon' + k, legendIcon[k])
        }

        function _buildShape() {
            _itemGroupLocation = _getItemGroupLocation();

            _buildBackground();
            _buildItem();

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建所有图例元素
         */
        function _buildItem() {
            var data = legendOption.data;
            var dataLength = data.length;
            var itemName;
            var itemType;
            var itemShape;
            var textShape;
            var font = self.getFont(legendOption.textStyle);

            var zrWidth = zr.getWidth();
            var lastX = _itemGroupLocation.x;
            var lastY = _itemGroupLocation.y;
            var itemWidth = legendOption.itemWidth;
            var itemHeight = legendOption.itemHeight;
            var itemGap = legendOption.itemGap;
            var color;

            if (legendOption.orient == 'vertical'
                && legendOption.x == 'right'
            ) {
                lastX = _itemGroupLocation.x
                        + _itemGroupLocation.width
                        - itemWidth;
            }

            for (var i = 0; i < dataLength; i++) {
                itemName = data[i];
                itemType = _getSeriesByName(itemName);
                if (itemType) {
                    itemType = itemType.type;
                } else {
                    itemType = 'bar';
                }
                color = getColor(itemName);

                if (legendOption.orient == 'horizontal') {
                    if (zrWidth - lastX < 200   // 最后200px做分行预判
                        && (itemWidth + 5
                         + zrArea.getTextWidth(itemName, font)
                         + (i < dataLength - 1 ? itemGap : 0))
                        >= zrWidth - lastX
                    ) {
                        lastX = 0;
                        lastY += itemHeight + itemGap;
                    }
                }

                // 图形
                itemShape = _getItemShapeByType(
                    lastX, lastY,
                    itemWidth, itemHeight,
                    (_selectedMap[itemName] ? color : '#ccc'),
                    itemType
                );
                itemShape._name = itemName;
                if (legendOption.selectedMode) {
                    itemShape.onclick = _legendSelected;
                }
                self.shapeList.push(itemShape);

                // 文字
                textShape = {
                    shape : 'text',
                    zlevel : _zlevelBase,
                    style : {
                        x : lastX + itemWidth + 5,
                        y : lastY,
                        color : _selectedMap[itemName]
                                ? legendOption.textStyle.color
                                : '#ccc',
                        text: itemName,
                        textFont: font,
                        textBaseline: 'top'
                    },
                    hoverable : legendOption.selectedMode,
                    clickable : legendOption.selectedMode
                };

                if (legendOption.orient == 'vertical'
                    && legendOption.x == 'right'
                ) {
                    textShape.style.x -= (itemWidth + 10);
                    textShape.style.textAlign = 'right';
                }

                textShape._name = itemName;
                if (legendOption.selectedMode) {
                    textShape.onclick = _legendSelected;
                }
                self.shapeList.push(textShape);

                if (legendOption.orient == 'horizontal') {
                    lastX += itemWidth + 5
                             + zrArea.getTextWidth(itemName, font)
                             + itemGap;
                }
                else {
                    lastY += itemHeight + itemGap;
                }
            }
        }

        function _buildBackground() {
            var pTop = legendOption.padding[0];
            var pRight = legendOption.padding[1];
            var pBottom = legendOption.padding[2];
            var pLeft = legendOption.padding[3];

            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _itemGroupLocation.x - pLeft,
                    y : _itemGroupLocation.y - pTop,
                    width : _itemGroupLocation.width + pLeft + pRight,
                    height : _itemGroupLocation.height + pTop + pBottom,
                    brushType : legendOption.borderWidth === 0
                                ? 'fill' : 'both',
                    color : legendOption.backgroundColor,
                    strokeColor : legendOption.borderColor,
                    lineWidth : legendOption.borderWidth
                }
            });
        }

        /**
         * 根据选项计算图例实体的位置坐标
         */
        function _getItemGroupLocation() {
            var data = legendOption.data;
            var dataLength = data.length;
            var itemGap = legendOption.itemGap;
            var itemWidth = legendOption.itemWidth + 5; // 5px是图形和文字的间隔，不可配
            var itemHeight = legendOption.itemHeight;
            var font = self.getFont(legendOption.textStyle);
            var totalWidth = 0;
            var totalHeight = 0;

            if (legendOption.orient == 'horizontal') {
                // 水平布局，计算总宽度
                for (var i = 0; i < dataLength; i++) {
                    totalWidth += itemWidth
                                  + zrArea.getTextWidth(
                                        data[i],
                                        font
                                    )
                                  + itemGap;
                }
                totalWidth -= itemGap;      // 减去最后一个的itemGap
                totalHeight = itemHeight;
            }
            else {
                // 垂直布局，计算总高度
                totalHeight = (itemHeight + itemGap) * dataLength;
                totalHeight -= itemGap;     // 减去最后一个的itemGap;
                var maxWidth = 0;
                for (var i = 0; i < dataLength; i++) {
                    maxWidth = Math.max(
                        maxWidth,
                        zrArea.getTextWidth(
                            data[i],
                            font
                        )
                    );
                }
                totalWidth = itemWidth + maxWidth;
            }

            var x;
            var zrWidth = zr.getWidth();
            switch (legendOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = legendOption.padding[3] + legendOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - legendOption.padding[1]
                        - legendOption.borderWidth;
                    break;
                default :
                    x = legendOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    break;
            }

            var y;
            var zrHeight = zr.getHeight();
            switch (legendOption.y) {
                case 'top' :
                    y = legendOption.padding[0] + legendOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - legendOption.padding[2]
                        - legendOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = legendOption.y - 0;
                    y = isNaN(y) ? 0 : y;
                    break;
            }

            // 水平布局的横向超长自动分行，纵布局超长不考虑
            if (legendOption.orient == 'horizontal' && totalWidth > zrWidth) {
                totalWidth = zrWidth;
                if (x < 0) {
                    x = 0;
                }
                totalHeight += totalHeight + 10;
            }


            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        }

        /**
         * 根据名称返回series数据
         */
        function _getSeriesByName(name) {
            var series = option.series;
            var hasFind;
            var data;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].name == name) {
                    // 系列名称优先
                    return series[i];
                }

                if (
                    series[i].type == ecConfig.CHART_TYPE_PIE 
                    || series[i].type == ecConfig.CHART_TYPE_RADAR
                ) {
                    // 饼图得查找里面的数据名字
                    hasFind = false;
                    data = series[i].data;
                    for (var j = 0, k = data.length; j < k; j++) {
                        if (data[j].name == name) {
                            data = data[j];
                            data.type = series[i].type;
                            hasFind = true;
                            break;
                        }
                    }
                    if (hasFind) {
                        return data;
                    }
                }
                else if (series[i].type == ecConfig.CHART_TYPE_FORCE) {
                    // 力导布局查找categories配置
                    hasFind = false;
                    data = series[i].categories;
                    for (var j = 0, k = data.length; j < k; j++) {
                        if (data[j].name == name) {
                            data = data[j];
                            data.type = ecConfig.CHART_TYPE_FORCE;
                            hasFind = true;
                            break;
                        }
                    }
                    if (hasFind) {
                        return data;
                    }
                }
            }
            return;
        }

        function _getItemShapeByType(x, y, width, height, color, itemType) {
            var itemShape = {
                shape : 'icon',
                zlevel : _zlevelBase,
                style : {
                    iconType : 'legendicon' + itemType,
                    x : x,
                    y : y,
                    width : width,
                    height : height,
                    color : color,
                    strokeColor : color,
                    lineWidth : 3
                },
                hoverable : legendOption.selectedMode,
                clickable : legendOption.selectedMode
            };
            // 特殊设置
            switch (itemType) {
                case 'line' :
                    itemShape.style.brushType = 'stroke';
                    break;
                case 'k' :
                    itemShape.style.brushType = 'both';
                    itemShape.style.color = self.deepQuery(
                        [ecConfig], 'k.itemStyle.normal.color'
                    ) || '#fff';
                    itemShape.style.strokeColor = color != '#ccc' 
                        ? self.deepQuery(
                              [ecConfig], 'k.itemStyle.normal.lineStyle.color'
                          ) || '#ff3200'
                        : color;
            }
            return itemShape;
        }

        function _legendSelected(param) {
            var itemName = param.target._name;
            _selectedMap[itemName] = !_selectedMap[itemName];
            messageCenter.dispatch(
                ecConfig.EVENT.LEGEND_SELECTED,
                param.event,
                {selected : _selectedMap}
            );
        }

        function init(newOption) {
            if (!self.deepQuery([newOption], 'legend.data')) {
                return;
            }

            option = newOption;

            option.legend = self.reformOption(option.legend);
            // 补全padding属性
            option.legend.padding = self.reformCssArray(
                option.legend.padding
            );

            legendOption = option.legend;

            self.clear();

            _selectedMap = {};

            var data = legendOption.data || [];
            var itemName;
            var serie;
            var color;
            for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                itemName = data[i];
                serie = _getSeriesByName(itemName);
                if (!serie) {
                    _selectedMap[itemName] = false;
                } 
                else {
                    color = self.deepQuery(
                        [serie], 'itemStyle.normal.color'
                    );
                    if (color) {
                        setColor(itemName, color);
                    }
                    _selectedMap[itemName] = true;
                }
            }
            if (selected) {
                for (var k in selected) {
                    _selectedMap[k] = selected[k];
                }
            }
            _buildShape();
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                option.legend = self.reformOption(option.legend);
                // 补全padding属性
                option.legend.padding = self.reformCssArray(
                    option.legend.padding
                );
                if (option.legend.selected) {
                    for (var k in option.legend.selected) {
                        _selectedMap[k] = option.legend.selected[k];
                    }
                }
            }
            legendOption = option.legend;
            
            self.clear();
            _buildShape();
        }

        function setColor(legendName, color) {
            _colorMap[legendName] = color;
        }

        function getColor(legendName) {
            if (!_colorMap[legendName]) {
                _colorMap[legendName] = zr.getColor(_colorIndex++);
            }
            return _colorMap[legendName];
        }
        
        function hasColor(legendName) {
            return _colorMap[legendName] ? _colorMap[legendName] : false;
        }

        function add(name, color){
            legendOption.data.push(name);
            setColor(name,color);
            _selectedMap[name] = true;
        }

        function del(name){
            var data = legendOption.data;
            var finalData = [];
            var found = false;
            for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                if (found || data[i] != name) {
                    finalData.push(data[i]);
                }
                else {
                    found = true;
                    continue;
                }
            }
            legendOption.data = finalData;
        }
        
        /**
         * 特殊图形元素回调设置
         * @param {Object} name
         * @param {Object} itemShape
         */
        function getItemShape(name) {
            var shape;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                shape = self.shapeList[i];
                if (shape._name == name && shape.shape != 'text') {
                    return shape;
                }
            }
        }
        
        /**
         * 特殊图形元素回调设置
         * @param {Object} name
         * @param {Object} itemShape
         */
        function setItemShape(name, itemShape) {
            var shape;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                shape = self.shapeList[i];
                if (shape._name == name && shape.shape != 'text') {
                    if (!_selectedMap[name]) {
                        itemShape.style.color = '#ccc';
                        itemShape.style.strokeColor = '#ccc';
                    }
                    zr.modShape(shape.id, itemShape);
                }
            }
        }

        function isSelected(itemName) {
            if (typeof _selectedMap[itemName] != 'undefined') {
                return _selectedMap[itemName];
            }
            else {
                // 没在legend里定义的都为true啊~
                return true;
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.setColor = setColor;
        self.getColor = getColor;
        self.hasColor = hasColor;
        self.add = add;
        self.del = del;
        self.getItemShape = getItemShape;
        self.setItemShape = setItemShape;
        self.isSelected = isSelected;

        init(option);
    }
    
    var legendIcon = {
        line : function (ctx, style) {
            var dy = style.height / 2;
            ctx.moveTo(style.x,     style.y + dy);
            ctx.lineTo(style.x + style.width,style.y + dy);
        },
        pie : function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            var sector = require('zrender/shape').get('sector');
            sector.buildPath(ctx, {
                x : x + width / 2,
                y : y + height + 2,
                r : height + 2,
                r0 : 6,
                startAngle : 45,
                endAngle : 135
            });
        },
        k : function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            var candle = require('zrender/shape').get('candle');
            candle.buildPath(ctx, {
                x : x + width / 2,
                y : [y + 1, y + 1, y + height - 6, y + height],
                width : width - 6
            });
        },
        bar : function (ctx, style) {
            ctx.rect(style.x, style.y + 1, style.width, style.height - 2);
        },
        force : function(ctx, style) {
            require('zrender/shape').get('icon').get('circle')(ctx, style);
        },
        radar: function(ctx, style) {
            var n = 6;
            var x = style.x + style.width / 2;
            var y = style.y + style.height / 2;
            var r = style.height / 2;

            var dStep = 2 * Math.PI / n;
            var deg = -Math.PI / 2;
            var xStart = x + r * Math.cos(deg);
            var yStart = y + r * Math.sin(deg);
            
            ctx.moveTo(xStart, yStart);
            deg += dStep;
            for (var i = 0, end = n - 1; i < end; i ++) {
                ctx.lineTo(x + r * Math.cos(deg), y + r * Math.sin(deg));
                deg += dStep;
            }
            ctx.lineTo(xStart, yStart);
        }
    };
    
    require('../component').define('legend', Legend);
    
    return Legend;
});



/**
 * echarts组件：值域
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/dataRange',['require','./base','../config','zrender/tool/area','zrender/tool/color','zrender/tool/color','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表参数
     * @param {Object=} selected 用于状态保持
     */
    function DataRange(messageCenter, zr, option) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var zrArea = require('zrender/tool/area');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_DATARANGE;

        var dataRangeOption;                       // 值域选项，共享数据源
        var _zlevelBase = self.getZlevelBase();

        var _itemGroupLocation = {};    // 值域元素组的位置参数，通过计算所得x, y, width, height
        var _calculableLocation;        // 可计算元素的位置缓存
        
        var _startShape;
        var _startMask;
        var _endShape;
        var _endMask;
        var _fillerShae;
        var _range;
        var _syncTicket;

        var _textGap = 10; // 非值文字间隔
        var _gap;
        var _colorList;
        var _valueTextList;

        var _selectedMap = {};

        function _buildShape() {
            _itemGroupLocation = _getItemGroupLocation();
//            console.log(_itemGroupLocation);
            _buildBackground();
            if (dataRangeOption.splitNumber <= 0 
                || dataRangeOption.calculable
            ) {
                _buildGradient();
            }
            else {
                _buildItem();
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建图例型的值域元素
         */
        function _buildItem() {
            var data = _valueTextList;
            var dataLength = data.length;
            var itemName;
            var itemShape;
            var textShape;
            var font = self.getFont(dataRangeOption.textStyle);

            var lastX = _itemGroupLocation.x;
            var lastY = _itemGroupLocation.y;
            var itemWidth = dataRangeOption.itemWidth;
            var itemHeight = dataRangeOption.itemHeight;
            var itemGap = dataRangeOption.itemGap;
            var textHeight = zrArea.getTextWidth('国', font);
            var color;

            if (dataRangeOption.orient == 'vertical'
                && dataRangeOption.x == 'right'
            ) {
                lastX = _itemGroupLocation.x
                        + _itemGroupLocation.width
                        - itemWidth;
            }
            var needValueText = true;
            if (dataRangeOption.text) {
                needValueText = false;
                // 第一个文字
                if (dataRangeOption.text[0]) {
                    textShape = _getTextShape(
                        lastX, lastY, dataRangeOption.text[0]
                    );
                    if (dataRangeOption.orient == 'horizontal') {
                        lastX += zrArea.getTextWidth(
                                     dataRangeOption.text[0],
                                     font
                                 )
                                 + _textGap;
                    }
                    else {
                        lastY += textHeight + _textGap;
                    }
                    self.shapeList.push(textShape);
                }
            }

            for (var i = 0; i < dataLength; i++) {
                itemName = data[i];
                color = getColor((dataLength - i) * _gap + dataRangeOption.min);
                // 图形
                itemShape = _getItemShape(
                    lastX, lastY,
                    itemWidth, itemHeight,
                    (_selectedMap[i] ? color : '#ccc')
                );
                itemShape._idx = i;
                itemShape.onclick = _dataRangeSelected;
                self.shapeList.push(itemShape);
                
                if (needValueText) {
                    // 文字
                    textShape = {
                        shape : 'text',
                        zlevel : _zlevelBase,
                        style : {
                            x : lastX + itemWidth + 5,
                            y : lastY,
                            color : _selectedMap[i]
                                    ? dataRangeOption.textStyle.color
                                    : '#ccc',
                            text: data[i],
                            textFont: font,
                            textBaseline: 'top'
                        },
                        clickable : true
                    };
                    if (dataRangeOption.orient == 'vertical'
                        && dataRangeOption.x == 'right'
                    ) {
                        textShape.style.x -= (itemWidth + 10);
                        textShape.style.textAlign = 'right';
                    }
                    textShape._idx = i;
                    textShape.onclick = _dataRangeSelected;
                    self.shapeList.push(textShape);
                }

                if (dataRangeOption.orient == 'horizontal') {
                    lastX += itemWidth 
                             + (needValueText ? 5 : 0)
                             + (needValueText 
                               ? zrArea.getTextWidth(itemName, font)
                               : 0)
                             + itemGap;
                }
                else {
                    lastY += itemHeight + itemGap;
                }
            }
            
            if (!needValueText && dataRangeOption.text[1]) {
                if (dataRangeOption.orient == 'horizontal') {
                    lastX = lastX - itemGap + _textGap;
                }
                else {
                    lastY = lastY - itemGap + _textGap;
                }
                // 最后一个文字
                textShape = _getTextShape(
                    lastX, lastY, dataRangeOption.text[1]
                );

                self.shapeList.push(textShape);
            }
        }
 
        /**
         * 构建渐变型的值域元素 
         */
        function _buildGradient() {
            var itemShape;
            var textShape;
            var font = self.getFont(dataRangeOption.textStyle);

            var lastX = _itemGroupLocation.x;
            var lastY = _itemGroupLocation.y;
            var itemWidth = dataRangeOption.itemWidth;
            var itemHeight = dataRangeOption.itemHeight;
            var textHeight = zrArea.getTextWidth('国', font);

            
            var needValueText = true;
            if (dataRangeOption.text) {
                needValueText = false;
                // 第一个文字
                if (dataRangeOption.text[0]) {
                    textShape = _getTextShape(
                        lastX, lastY, dataRangeOption.text[0]
                    );
                    if (dataRangeOption.orient == 'horizontal') {
                        lastX += zrArea.getTextWidth(
                                     dataRangeOption.text[0],
                                     font
                                 )
                                 + _textGap;
                    }
                    else {
                        lastY += textHeight + _textGap;
                    }
                    self.shapeList.push(textShape);
                } 
            }
            
            var zrColor = require('zrender/tool/color');
            var per = 1 / (dataRangeOption.color.length - 1);
            var colorList = [];
            for (var i = 0, l = dataRangeOption.color.length; i < l; i++) {
                colorList.push([i * per, dataRangeOption.color[i]]);
            }
            if (dataRangeOption.orient == 'horizontal') {
                itemShape = {
                    shape : 'rectangle',
                    zlevel : _zlevelBase,
                    style : {
                        x : lastX,
                        y : lastY,
                        width : itemWidth * 10,
                        height : itemHeight,
                        color : zrColor.getLinearGradient(
                            lastX, lastY, lastX + itemWidth * 10, lastY,
                            colorList
                        )
                    },
                    hoverable : false
                };
                lastX += itemWidth * 10 + _textGap;
            }
            else {
                itemShape = {
                    shape : 'rectangle',
                    zlevel : _zlevelBase,
                    style : {
                        x : lastX,
                        y : lastY,
                        width : itemWidth,
                        height : itemHeight * 10,
                        color : zrColor.getLinearGradient(
                            lastX, lastY, lastX, lastY + itemHeight * 10,
                            colorList
                        )
                    },
                    hoverable : false
                };
                lastY += itemHeight * 10 + _textGap;
            }
            self.shapeList.push(itemShape);
            if (dataRangeOption.calculable) {
                _calculableLocation = itemShape.style;
                _buildFiller();
                _bulidMask();
                _bulidHandle();
            }
            
            if (!needValueText && dataRangeOption.text[1]) {
                // 最后一个文字
                textShape = _getTextShape(
                    lastX, lastY, dataRangeOption.text[1]
                );

                self.shapeList.push(textShape);
            }
        }
        
        /**
         * 构建填充物
         */
        function _buildFiller() {
            _fillerShae = {
                shape : 'rectangle',
                zlevel : _zlevelBase + 1,
                style : {
                    x : _calculableLocation.x,
                    y : _calculableLocation.y,
                    width : _calculableLocation.width,
                    height : _calculableLocation.height,
                    color : 'rgba(255,255,255,0.2)'
                },
                draggable : true,
                ondrift : _ondrift,
                ondragend : _ondragend,
                _type : 'filler'
            };

            self.shapeList.push(_fillerShae);
        }
        
        /**
         * 构建拖拽手柄
         */
        function _bulidHandle() {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            
            var font = self.getFont(dataRangeOption.textStyle);
            var textHieght = zrArea.getTextWidth('国', font) + 2;
            var textWidth = Math.max(
                    zrArea.getTextWidth(
                        dataRangeOption.precision === 0
                        ? dataRangeOption.max
                        : dataRangeOption.max.toFixed(
                            dataRangeOption.precision
                          ),
                        font),
                    zrArea.getTextWidth(
                        dataRangeOption.precision === 0
                        ? dataRangeOption.min
                        : dataRangeOption.min.toFixed(
                            dataRangeOption.precision
                          ), 
                        font
                    )
                ) + 2;
                            
            var pointListStart;
            var textXStart;
            var textYStart;
            var pointListEnd;
            var textXEnd;
            var textYEnd;
            if (dataRangeOption.orient == 'horizontal') {
                // 水平
                if (dataRangeOption.y != 'bottom') {
                    // 手柄统统在下方
                    pointListStart = [
                        [x, y],
                        [x, y + height + textHieght / 2 * 3],
                        [x - textWidth, y + height + textHieght / 2 * 3],
                        [x - textWidth, y + height + textHieght / 2],
                        [x - textHieght / 2, y + height + textHieght / 2],
                        [x - 1, y + height],
                        [x - 1, y]
                        
                    ];
                    textXStart = x - textWidth / 2;
                    textYStart = y + height + textHieght;
                    
                    pointListEnd = [
                        [x + width, y],
                        [x + width, y + height + textHieght / 2 * 3],
                        [x + width + textWidth, y + height + textHieght/2*3],
                        [x + width + textWidth, y + height + textHieght / 2],
                        [x + width + textHieght / 2, y + height + textHieght/2],
                        [x + width + 1, y + height],
                        [x + width + 1, y]
                    ];
                    textXEnd = x + width + textWidth / 2;
                    textYEnd = textYStart;
                }
                else {
                    // 手柄在上方
                    pointListStart = [
                        [x, y + height],
                        [x, y - textHieght / 2 * 3],
                        [x - textWidth, y - textHieght / 2 * 3],
                        [x - textWidth, y - textHieght / 2],
                        [x - textHieght / 2, y - textHieght / 2],
                        [x - 1, y],
                        [x - 1, y + height]
                        
                    ];
                    textXStart = x - textWidth / 2;
                    textYStart = y - textHieght;
                    
                    pointListEnd = [
                        [x + width, y + height],
                        [x + width, y - textHieght / 2 * 3],
                        [x + width + textWidth, y - textHieght / 2 * 3],
                        [x + width + textWidth, y - textHieght / 2],
                        [x  + width + textHieght / 2, y - textHieght / 2],
                        [x + width + 1, y],
                        [x + width + 1, y + height]
                    ];
                    textXEnd = x + width + textWidth / 2;
                    textYEnd = textYStart;
                }
            }
            else {
                textWidth += textHieght;
                // 垂直
                if (dataRangeOption.x != 'right') {
                    // 手柄统统在右侧
                    pointListStart = [
                        [x, y],
                        [x + width + textWidth, y],
                        [x + width + textWidth, y - textHieght],
                        [x + width + textHieght, y - textHieght],
                        [x + width, y - 1],
                        [x, y - 1]
                    ];
                    textXStart = x + width + textWidth / 2 + textHieght / 2;
                    textYStart = y - textHieght / 2;
                    
                    pointListEnd = [
                        [x, y + height],
                        [x + width + textWidth, y + height],
                        [x + width + textWidth, y + textHieght + height],
                        [x + width + textHieght, y + textHieght + height],
                        [x + width, y + 1 + height],
                        [x, y + height + 1]
                    ];
                    textXEnd = textXStart;
                    textYEnd = y  + height + textHieght / 2;
                }
                else {
                    // 手柄在左侧
                    pointListStart = [
                        [x + width, y],
                        [x - textWidth, y],
                        [x - textWidth, y - textHieght],
                        [x - textHieght, y - textHieght],
                        [x, y - 1],
                        [x + width, y - 1]
                    ];
                    textXStart = x - textWidth / 2 - textHieght / 2;
                    textYStart = y - textHieght / 2;
                    
                    pointListEnd = [
                        [x + width, y + height],
                        [x - textWidth, y + height],
                        [x - textWidth, y + textHieght + height],
                        [x - textHieght, y + textHieght + height],
                        [x, y + 1 + height],
                        [x + width, y + height + 1]
                    ];
                    textXEnd = textXStart;
                    textYEnd = y  + height + textHieght / 2;
                }
            }
            
            _startShape = {
                shape : 'polygon',
                zlevel : _zlevelBase + 1,
                style : {
                    pointList : pointListStart,
                    text : dataRangeOption.max + '',
                    textX : textXStart,
                    textY : textYStart,
                    textPosition : 'specific',
                    textAlign : 'center',
                    textBaseline : 'middle ',
                    textColor: dataRangeOption.textStyle.color,
                    color : getColor(dataRangeOption.max),
                    width : 0,                 // for ondrif计算统一
                    height : 0,
                    x : pointListStart[0][0],
                    y : pointListStart[0][1],
                    _x : pointListStart[0][0],   // 拖拽区域控制缓存
                    _y : pointListStart[0][1]
                },
                draggable : true,
                ondrift : _ondrift,
                ondragend : _ondragend
            };
            
            _endShape = {
                shape : 'polygon',
                zlevel : _zlevelBase + 1,
                style : {
                    pointList : pointListEnd,
                    text : dataRangeOption.min + '',
                    textX : textXEnd,
                    textY : textYEnd,
                    textPosition : 'specific',
                    textAlign : 'center',
                    textBaseline : 'middle ',
                    textColor: dataRangeOption.textStyle.color,
                    color : getColor(dataRangeOption.min),
                    width : 0,                 // for ondrif计算统一
                    height : 0,
                    x : pointListEnd[0][0],
                    y : pointListEnd[0][1],
                    _x : pointListEnd[0][0],   // 拖拽区域控制缓存
                    _y : pointListEnd[0][1]
                },
                draggable : true,
                ondrift : _ondrift,
                ondragend : _ondragend
            };
            self.shapeList.push(_startShape);
            self.shapeList.push(_endShape);
        }
        
        function _bulidMask() {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            _startMask = {
                shape : 'rectangle',
                zlevel : _zlevelBase + 1,
                style : {
                    x : x,
                    y : y,
                    width : dataRangeOption.orient == 'horizontal'
                            ? 0 : width,
                    height : dataRangeOption.orient == 'horizontal'
                             ? height : 0,
                    color : '#ccc'
                },
                hoverable:false
            };
            _endMask = {
                shape : 'rectangle',
                zlevel : _zlevelBase + 1,
                style : {
                    x : dataRangeOption.orient == 'horizontal'
                        ? x + width : x,
                    y : dataRangeOption.orient == 'horizontal'
                        ? y : y + height,
                    width : dataRangeOption.orient == 'horizontal'
                            ? 0 : width,
                    height : dataRangeOption.orient == 'horizontal'
                             ? height : 0,
                    color : '#ccc'
                },
                hoverable:false
            };
            self.shapeList.push(_startMask);
            self.shapeList.push(_endMask);
        }
        
        function _buildBackground() {
            var pTop = dataRangeOption.padding[0];
            var pRight = dataRangeOption.padding[1];
            var pBottom = dataRangeOption.padding[2];
            var pLeft = dataRangeOption.padding[3];

            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _itemGroupLocation.x - pLeft,
                    y : _itemGroupLocation.y - pTop,
                    width : _itemGroupLocation.width + pLeft + pRight,
                    height : _itemGroupLocation.height + pTop + pBottom,
                    brushType : dataRangeOption.borderWidth === 0
                                ? 'fill' : 'both',
                    color : dataRangeOption.backgroundColor,
                    strokeColor : dataRangeOption.borderColor,
                    lineWidth : dataRangeOption.borderWidth
                }
            });
        }

        /**
         * 根据选项计算值域实体的位置坐标
         */
        function _getItemGroupLocation() {
            var data = _valueTextList;
            var dataLength = data.length;
            var itemGap = dataRangeOption.itemGap;
            var itemWidth = dataRangeOption.itemWidth;
            var itemHeight = dataRangeOption.itemHeight;
            var totalWidth = 0;
            var totalHeight = 0;
            var font = self.getFont(dataRangeOption.textStyle);
            var textHeight = zrArea.getTextWidth('国', font);

            if (dataRangeOption.orient == 'horizontal') {
                // 水平布局，计算总宽度
                if (dataRangeOption.text 
                    || dataRangeOption.splitNumber <= 0
                    || dataRangeOption.calculable
                ) {
                    // 指定文字或线性渐变
                    totalWidth = 
                        ((dataRangeOption.splitNumber <= 0
                          || dataRangeOption.calculable)
                          ? (itemWidth * 10 + itemGap)
                          : dataLength * (itemWidth + itemGap))
                        + (dataRangeOption.text 
                           && typeof dataRangeOption.text[0] != 'undefined'
                           ? (zrArea.getTextWidth(
                                  dataRangeOption.text[0],
                                  font
                              ) + _textGap)
                           : 0)
                        + (dataRangeOption.text
                           && typeof dataRangeOption.text[1] != 'undefined'
                           ? (zrArea.getTextWidth(
                                  dataRangeOption.text[1],
                                  font
                              ) + _textGap)
                           : 0);
                }
                else {
                    // 值标签
                    itemWidth += 5;
                    for (var i = 0; i < dataLength; i++) {
                        totalWidth += itemWidth
                                      + zrArea.getTextWidth(
                                            data[i],
                                            font
                                        )
                                      + itemGap;
                    }
                }
                totalWidth -= itemGap;      // 减去最后一个的itemGap
                totalHeight = Math.max(textHeight, itemHeight);
            }
            else {
                // 垂直布局，计算总高度
                var maxWidth;
                if (dataRangeOption.text
                    || dataRangeOption.splitNumber <= 0
                    || dataRangeOption.calculable
                ) {
                    // 指定文字或线性渐变
                    totalHeight =
                        ((dataRangeOption.splitNumber <= 0
                          || dataRangeOption.calculable)
                          ? (itemHeight * 10 + itemGap)
                          : dataLength * (itemHeight + itemGap))
                        + (dataRangeOption.text
                           && typeof dataRangeOption.text[0] != 'undefined'
                            ? (_textGap + textHeight)
                            : 0)
                        + (dataRangeOption.text
                           && typeof dataRangeOption.text[1] != 'undefined'
                            ? (_textGap + textHeight)
                            : 0);
                       
                    maxWidth = Math.max(
                        zrArea.getTextWidth(
                            (dataRangeOption.text && dataRangeOption.text[0])
                            || '',
                            font
                        ),
                        zrArea.getTextWidth(
                            (dataRangeOption.text && dataRangeOption.text[1])
                            || '',
                            font
                        )
                    );
                    totalWidth = Math.max(itemWidth, maxWidth);
                }
                else {
                    totalHeight = (itemHeight + itemGap) * dataLength;
                    // 值标签
                    itemWidth += 5;
                    maxWidth = 0;
                    for (var i = 0; i < dataLength; i++) {
                        maxWidth = Math.max(
                            maxWidth,
                            zrArea.getTextWidth(
                                data[i],
                                font
                            )
                        );
                    }
                    totalWidth = itemWidth + maxWidth;
                }
                totalHeight -= itemGap;     // 减去最后一个的itemGap;
            }

            var x;
            var zrWidth = zr.getWidth();
            switch (dataRangeOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = dataRangeOption.padding[3] 
                        + dataRangeOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - dataRangeOption.padding[1]
                        - dataRangeOption.borderWidth;
                    break;
                default :
                    x = dataRangeOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    break;
            }

            var y;
            var zrHeight = zr.getHeight();
            switch (dataRangeOption.y) {
                case 'top' :
                    y = dataRangeOption.padding[0] 
                        + dataRangeOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - dataRangeOption.padding[2]
                        - dataRangeOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = dataRangeOption.y - 0;
                    y = isNaN(y) ? 0 : y;
                    break;
            }
            
            if (dataRangeOption.calculable) {
                // 留出手柄控件
                var handlerWidth = Math.max(
                    zrArea.getTextWidth(dataRangeOption.max, font),
                    zrArea.getTextWidth(dataRangeOption.min, font)
                );
                if (dataRangeOption.orient == 'horizontal') {
                    if (x < handlerWidth) {
                        x = handlerWidth + 5;
                    }
                    if (x + totalWidth + handlerWidth > zrWidth) {
                        x -= handlerWidth + 5;
                    }
                }
                else {
                    if (y < textHeight) {
                        y = textHeight + 5;
                    }
                    if (y + totalHeight + textHeight > zrHeight) {
                        y -= textHeight + 5;
                    }
                }
            }

            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        }

        // 指定文本
        function _getTextShape(x, y, text) {
            return {
                shape : 'text',
                zlevel : _zlevelBase,
                style : {
                    x : (dataRangeOption.orient == 'horizontal'
                        ? x
                        : _itemGroupLocation.x 
                          + _itemGroupLocation.width / 2 
                        ),
                    y : (dataRangeOption.orient == 'horizontal'
                        ? _itemGroupLocation.y 
                          + _itemGroupLocation.height / 2
                        : y
                        ),
                    color : dataRangeOption.textStyle.color,
                    text: text,
                    textFont: self.getFont(dataRangeOption.textStyle),
                    textBaseline: (dataRangeOption.orient == 'horizontal'
                                   ? 'middle' : 'top'),
                    textAlign: (dataRangeOption.orient == 'horizontal'
                               ? 'left' : 'center')
                }
            };
        }

        // 色尺legend item shape
        function _getItemShape(x, y, width, height, color) {
            return {
                shape : 'rectangle',
                zlevel : _zlevelBase,
                style : {
                    x : x,
                    y : y + 1,
                    width : width,
                    height : height - 2,
                    color : color
                },
                clickable : true
            };
        }

        /**
         * 拖拽范围控制
         */
        function _ondrift(e, dx, dy) {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            
            if (dataRangeOption.orient == 'horizontal') {
                if (e.style.x + dx <= x) {
                    e.style.x = x;
                }
                else if (e.style.x + dx + e.style.width >= x + width) {
                    e.style.x = x + width - e.style.width;
                }
                else {
                    e.style.x += dx;
                }
            }
            else {
                if (e.style.y + dy <= y) {
                    e.style.y = y;
                }
                else if (e.style.y + dy + e.style.height >= y + height) {
                    e.style.y = y + height - e.style.height;
                }
                else {
                    e.style.y += dy;
                }
            }

            if (e._type == 'filler') {
                _syncHandleShape();
            }
            else {
                //e.position = [e.style.x - e.style._x, e.style.y - e.style._y];
                _syncFillerShape(e);
            }
            
            if (dataRangeOption.realtime) {
                _syncData();
            }
            else {
                clearTimeout(_syncTicket);
                _syncTicket = setTimeout(_syncData, 200);
            }

            return true;
        }
        
        function _ondragend() {
            self.isDragend = true;
        }

        /**
         * 数据项被拖拽出去
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

             _syncData();

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.dragIn = true;
            
            if (!dataRangeOption.realtime) {
                messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE);
            }
            
            status.needRefresh = false; // 会有消息触发fresh，不用再刷一遍
            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }
        
        
        function _syncHandleShape() {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            
            if (dataRangeOption.orient == 'horizontal') {
                _startShape.style.x = _fillerShae.style.x;
                _startMask.style.width = _startShape.style.x - x;
                
                _endShape.style.x = _fillerShae.style.x
                                    + _fillerShae.style.width;
                _endMask.style.x = _endShape.style.x;
                _endMask.style.width = x + width - _endShape.style.x;
                
                _range.start = Math.ceil(
                    100 - (_startShape.style.x - x) / width * 100
                );
                _range.end = Math.floor(
                    100 - (_endShape.style.x - x) / width * 100
                );
            }
            else {
                _startShape.style.y = _fillerShae.style.y;
                _startMask.style.height = _startShape.style.y - y;
                
                _endShape.style.y = _fillerShae.style.y
                                    + _fillerShae.style.height;
                _endMask.style.y = _endShape.style.y;
                _endMask.style.height = y + height - _endShape.style.y;
                
                _range.start = Math.ceil(
                    100 - (_startShape.style.y - y) / height * 100
                );
                _range.end = Math.floor(
                    100 - (_endShape.style.y - y) / height * 100
                );
            }
            
            _syncShape(false);
        }

        function _syncFillerShape(e) {
            var x = _calculableLocation.x;
            var y = _calculableLocation.y;
            var width = _calculableLocation.width;
            var height = _calculableLocation.height;
            
            var a;
            var b;
            if (dataRangeOption.orient == 'horizontal') {
                a = _startShape.style.x;
                b = _endShape.style.x;
                if (e.id == _startShape.id && a >= b) {
                    // _startShape触发
                    b = a;
                    _endShape.style.x = a;
                }
                else if (e.id == _endShape.id && a >= b) {
                    // _endShape触发
                    a = b;
                    _startShape.style.x = a;
                }
                _fillerShae.style.x = a;
                _fillerShae.style.width = b - a;
                _startMask.style.width = a - x;
                _endMask.style.x = b;
                _endMask.style.width = x + width - b;
                
                _range.start = Math.ceil(100 - (a - x) / width * 100);
                _range.end = Math.floor(100 - (b - x) / width * 100);
            }
            else {
                a = _startShape.style.y;
                b = _endShape.style.y;
                if (e.id == _startShape.id && a >= b) {
                    // _startShape触发
                    b = a;
                    _endShape.style.y = a;
                }
                else if (e.id == _endShape.id && a >= b) {
                    // _endShape触发
                    a = b;
                    _startShape.style.y = a;
                }
                _fillerShae.style.y = a;
                _fillerShae.style.height = b - a;
                _startMask.style.height = a - y;
                _endMask.style.y = b;
                _endMask.style.height = y + height - b;
                
                _range.start = Math.ceil(100 - (a - y) / height * 100);
                _range.end = Math.floor(100 - (b - y) / height * 100);
            }
            
            _syncShape(true);
        }
        
        function _syncShape(needFiller) {
            _startShape.position = [
                _startShape.style.x - _startShape.style._x,
                _startShape.style.y - _startShape.style._y
            ];
            
            if (dataRangeOption.precision === 0) {
                _startShape.style.text = Math.round(
                    _gap * _range.start + dataRangeOption.min
                ) + '';
            } else {
                _startShape.style.text =(
                    _gap * _range.start + dataRangeOption.min
                ).toFixed(dataRangeOption.precision);
            }
            _startShape.style.color = getColor(
                _gap * _range.start + dataRangeOption.min
            );
            
            zr.modShape(_startShape.id, _startShape);
            
            _endShape.position = [
                _endShape.style.x - _endShape.style._x,
                _endShape.style.y - _endShape.style._y
            ];
            
            if (dataRangeOption.precision === 0) {
                _endShape.style.text = Math.round(
                    _gap * _range.end + dataRangeOption.min
                ) + '';
            } else {
                _endShape.style.text = (
                    _gap * _range.end + dataRangeOption.min
                ).toFixed(dataRangeOption.precision);
            }
            _endShape.style.color = getColor(
                _gap * _range.end + dataRangeOption.min
            );
            zr.modShape(_endShape.id, _endShape);

            zr.modShape(_startMask.id, _startMask);
            zr.modShape(_endMask.id, _endMask);
            
            needFiller && zr.modShape(_fillerShae.id, _fillerShae);
             
            zr.refresh();
        }

        function _syncData() {
            if (dataRangeOption.realtime) {
                messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE);
            }
        }


        function _dataRangeSelected(param) {
            var idx = param.target._idx;
            _selectedMap[idx] = !_selectedMap[idx];
            messageCenter.dispatch(ecConfig.EVENT.REFRESH);
        }

        function init(newOption) {
            if (typeof self.deepQuery([newOption], 'dataRange.min') 
                == 'undefined'
                || typeof self.deepQuery([newOption], 'dataRange.max') 
                == 'undefined'
            ) {
                return;
            }

            option = newOption;

            option.dataRange = self.reformOption(option.dataRange);
            // 补全padding属性
            option.dataRange.padding = self.reformCssArray(
                option.dataRange.padding
            );

            dataRangeOption = option.dataRange;

            self.clear();

            _selectedMap = {};

            var zrColor = require('zrender/tool/color');
            var splitNumber = dataRangeOption.splitNumber <= 0 
                              || dataRangeOption.calculable
                              ? 100
                              : dataRangeOption.splitNumber;
            _colorList = zrColor.getGradientColors(
                dataRangeOption.color,
                (splitNumber - dataRangeOption.color.length)
                / (dataRangeOption.color.length - 1) + 1
            );
            _colorList = _colorList.slice(0, splitNumber);
            //console.log(_colorList.length)
            
            if (dataRangeOption.precision === 0) {
                _gap = Math.round(
                    (dataRangeOption.max - dataRangeOption.min)
                    / splitNumber
                ) || 1;
            } else {
                _gap = (dataRangeOption.max - dataRangeOption.min)
                        / splitNumber;
                _gap = _gap.toFixed(dataRangeOption.precision) - 0;
            }
            
            _valueTextList = [];
            for (var i = 0; i < splitNumber; i++) {
                _selectedMap[i] = true;
                _valueTextList.unshift(
                    (i * _gap + dataRangeOption.min).toFixed(
                        dataRangeOption.precision
                    )
                    + ' - ' 
                    + ((i + 1) * _gap + dataRangeOption.min).toFixed(
                        dataRangeOption.precision
                    )
                );
            }
            
            _range = {
                start: 100,
                end: 0
            };
            // console.log(_valueTextList,_gap);
            // console.log(_colorList);
            
            _buildShape();
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                option.dataRange = self.reformOption(option.dataRange);
                // 补全padding属性
                option.dataRange.padding = self.reformCssArray(
                    option.dataRange.padding
                );
            }
            dataRangeOption = option.dataRange;
            _range = {
                start: 100,
                end: 0
            };
            self.clear();
            _buildShape();
        }

        function getColor(value) {
            if (isNaN(value)) {
                return null;
            }
            
            if (value < dataRangeOption.min) {
                value = dataRangeOption.min;
            }
            else if (value > dataRangeOption.max) {
                value = dataRangeOption.max;
            }
            
            if (dataRangeOption.calculable) {
                if (value > _gap * _range.start + dataRangeOption.min
                    || value < _gap * _range.end + dataRangeOption.min) {
                     return null;
                }
            }
            
            var idx = _colorList.length - Math.ceil(
                (value - dataRangeOption.min) 
                / (dataRangeOption.max - dataRangeOption.min)
                * _colorList.length
            );
            if (idx == _colorList.length) {
                idx--;
            }
            //console.log(value, idx,_colorList[idx])
            if (_selectedMap[idx]) {
                return _colorList[idx];
            }
            else {
                return null;
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.getColor = getColor;
        self.ondragend = ondragend;
        
        init(option);
    }

    require('../component').define('dataRange', DataRange);

    return DataRange;
});



/**
 * echarts组件：提示框
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/tooltip',['require','./base','../config','../util/ecData','zrender/config','zrender/shape','zrender/tool/event','zrender/tool/area','zrender/tool/color','zrender/tool/util','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 提示框参数
     * @param {HtmlElement} dom 目标对象
     */
    function Tooltip(messageCenter, zr, option, dom) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrConfig = require('zrender/config');
        var zrShape = require('zrender/shape');
        var zrEvent = require('zrender/tool/event');
        var zrArea = require('zrender/tool/area');
        var zrColor = require('zrender/tool/color');
        var zrUtil = require('zrender/tool/util');

        var rectangle = zrShape.get('rectangle');
        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_TOOLTIP;

        var _zlevelBase = self.getZlevelBase();

        var component = {};                     // 组件索引
        var grid;
        var xAxis;
        var yAxis;
        var polar;

        // tooltip dom & css
        var _tDom = document.createElement('div');
        // 通用样式
        var _gCssText = 'position:absolute;'
                        + 'display:block;'
                        + 'border-style:solid;'
                        + 'white-space:nowrap;';
        // 默认样式
        var _defaultCssText;                    // css样式缓存

        var _needAxisTrigger;                   // 坐标轴触发
        var _hidingTicket;
        var _hideDelay;                         // 隐藏延迟
        var _showingTicket;
        var _showDelay;                         // 显示延迟
        var _curTarget;
        var _event;

        var _curTicket;                         // 异步回调标识，用来区分多个请求

        // 缓存一些高宽数据
        var _zrHeight = zr.getHeight();
        var _zrWidth = zr.getWidth();

        var _axisLineShape = {
            shape : 'line',
            id : zr.newShapeId('tooltip'),
            zlevel: _zlevelBase,
            invisible : true,
            hoverable: false,
            style : {
                // lineWidth : 2,
                // strokeColor : ecConfig.categoryAxis.axisLine.lineStyle.color
            }
        };
        var _axisShadowShape = {
            shape : 'line',
            id : zr.newShapeId('tooltip'),
            zlevel: 1,                      // grid上，chart下
            invisible : true,
            hoverable: false,
            style : {
                // lineWidth : 10,
                // strokeColor : ecConfig.categoryAxis.axisLine.lineStyle.color
            }
        };
        zr.addShape(_axisLineShape);
        zr.addShape(_axisShadowShape);

        /**
         * 根据配置设置dom样式
         */
        function _style(opt) {
            if (!opt) {
                return '';
            }
            cssText = [];
            if (opt.transitionDuration) {
                var transitionText = 'left ' + opt.transitionDuration + 's,'
                                    + 'top ' + opt.transitionDuration + 's';
                cssText.push(
                    'transition:' + transitionText
                );
                cssText.push(
                    '-moz-transition:' + transitionText
                );
                cssText.push(
                    '-webkit-transition:' + transitionText
                );
                cssText.push(
                    '-o-transition:' + transitionText
                );
            }

            if (opt.backgroundColor) {
                // for sb ie~
                cssText.push(
                    'background-Color:' + zrColor.toHex(
                        opt.backgroundColor
                    )
                );
                cssText.push('filter:alpha(opacity=70)');
                cssText.push('background-Color:' + opt.backgroundColor);
            }

            if (typeof opt.borderWidth != 'undefined') {
                cssText.push('border-width:' + opt.borderWidth + 'px');
            }

            if (typeof opt.borderColor != 'undefined') {
                cssText.push('border-color:' + opt.borderColor);
            }

            if (typeof opt.borderRadius != 'undefined') {
                cssText.push(
                    'border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-moz-border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-webkit-border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-o-border-radius:' + opt.borderRadius + 'px'
                );
            }

            var textStyle = opt.textStyle;
            if (textStyle) {
                textStyle.color && cssText.push('color:' + textStyle.color);
                textStyle.decoration && cssText.push(
                    'text-decoration:' + textStyle.decoration
                );
                textStyle.align && cssText.push(
                    'text-align:' + textStyle.align
                );
                textStyle.fontFamily && cssText.push(
                    'font-family:' + textStyle.fontFamily
                );
                textStyle.fontSize && cssText.push(
                    'font-size:' + textStyle.fontSize + 'px'
                );
                textStyle.fontSize && cssText.push(
                    'line-height:' + Math.round(textStyle.fontSize*3/2) + 'px'
                );
                textStyle.fontStyle && cssText.push(
                    'font-style:' + textStyle.fontStyle
                );
                textStyle.fontWeight && cssText.push(
                    'font-weight:' + textStyle.fontWeight
                );
            }


            var padding = opt.padding;
            if (typeof padding != 'undefined') {
                padding = self.reformCssArray(padding);
                cssText.push(
                    'padding:' + padding[0] + 'px '
                               + padding[1] + 'px '
                               + padding[2] + 'px '
                               + padding[3] + 'px'
                );
            }

            cssText = cssText.join(';') + ';';

            return cssText;
        }

        function _hide() {
            if (_tDom) {
                _tDom.style.display = 'none';
            }
            var needRefresh = false;
            if (!_axisLineShape.invisible) {
                _axisLineShape.invisible = true;
                zr.modShape(_axisLineShape.id, _axisLineShape);
                needRefresh = true;
            }
            if (!_axisShadowShape.invisible) {
                _axisShadowShape.invisible = true;
                zr.modShape(_axisShadowShape.id, _axisShadowShape);
                needRefresh = true;
            }
            needRefresh && zr.refresh(); 
        }

        function _show(x, y, specialCssText) {
            var domHeight = _tDom.offsetHeight;
            var domWidth = _tDom.offsetWidth;
            if (x + domWidth > _zrWidth) {
                x = _zrWidth - domWidth;
            }
            if (y + domHeight > _zrHeight) {
                y = _zrHeight - domHeight;
            }
            if (y < 20) {
                y = 0;
            }
            _tDom.style.cssText = _gCssText
                                  + _defaultCssText
                                  + (specialCssText ? specialCssText : '')
                                  + 'left:' + x + 'px;top:' + y + 'px;';
            if (_zrWidth - x < 100 || _zrHeight - y < 100) {
                // 太靠边的做一次refixed
                setTimeout(_refixed, 20);
            }
        }
        
        function _refixed() {
            if (_tDom) {
                var cssText = '';
                var domHeight = _tDom.offsetHeight;
                var domWidth = _tDom.offsetWidth;
                if (_tDom.offsetLeft + domWidth > _zrWidth) {
                    cssText += 'left:' + (_zrWidth - domWidth) + 'px;';
                }
                if (_tDom.offsetTop + domHeight > _zrHeight) {
                    cssText += 'top:' + (_zrHeight - domHeight) + 'px;';
                }
                if (cssText !== '') {
                    _tDom.style.cssText += cssText;
                }
            }
        }

        function _tryShow() {
            var needShow;
            var trigger;
            if (!_curTarget) {
                // 坐标轴事件
                _findPolarTrigger() || _findAxisTrigger();
            }
            else {
                // 数据项事件
                if (_curTarget._type == 'island'
                    && self.deepQuery([option], 'tooltip.show')
                ) {
                    _showItemTrigger();
                    return;
                }
                var serie = ecData.get(_curTarget, 'series');
                var data = ecData.get(_curTarget, 'data');
                needShow = self.deepQuery(
                    [data, serie, option],
                    'tooltip.show'
                );
                if (typeof serie == 'undefined'
                    || typeof data == 'undefined'
                    || needShow === false
                ) {
                    // 不响应tooltip的数据对象延时隐藏
                    clearTimeout(_hidingTicket);
                    clearTimeout(_showingTicket);
                    _hidingTicket = setTimeout(_hide, _hideDelay);
                }
                else {
                    trigger = self.deepQuery(
                        [data, serie, option],
                        'tooltip.trigger'
                    );
                    trigger == 'axis'
                               ? _showAxisTrigger(
                                     serie.xAxisIndex, serie.yAxisIndex,
                                     ecData.get(_curTarget, 'dataIndex')
                                 )
                               : _showItemTrigger();
                }
            }
        }

        /**
         * 直角系 
         */
        function _findAxisTrigger() {
            if (!xAxis || !yAxis) {
                _hidingTicket = setTimeout(_hide, _hideDelay);
                return;
            }
            var series = option.series;
            var xAxisIndex;
            var yAxisIndex;
            for (var i = 0, l = series.length; i < l; i++) {
                // 找到第一个axis触发tooltip的系列
                if (self.deepQuery(
                        [series[i], option], 'tooltip.trigger'
                    ) == 'axis'
                ) {
                    xAxisIndex = series[i].xAxisIndex || 0;
                    yAxisIndex = series[i].yAxisIndex || 0;
                    if (xAxis.getAxis(xAxisIndex)
                        && xAxis.getAxis(xAxisIndex).type
                           == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // 横轴为类目轴
                        _showAxisTrigger(xAxisIndex, yAxisIndex,
                            _getNearestDataIndex('x', xAxis.getAxis(xAxisIndex))
                        );
                        return;
                    } else if (yAxis.getAxis(yAxisIndex)
                               && yAxis.getAxis(yAxisIndex).type
                                  == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // 纵轴为类目轴
                        _showAxisTrigger(xAxisIndex, yAxisIndex,
                            _getNearestDataIndex('y', yAxis.getAxis(yAxisIndex))
                        );
                        return;
                    }
                }
            }
        }
        
        /**
         * 极坐标 
         */
        function _findPolarTrigger() {
            if (!polar) {
                return false;
            }
            var x = zrEvent.getX(_event);
            var y = zrEvent.getY(_event);
            var polarIndex = polar.getNearestIndex([x, y]);
            var valueIndex;
            if (polarIndex) {
                valueIndex = polarIndex.valueIndex;
                polarIndex = polarIndex.polarIndex;
            }
            else {
                polarIndex = -1;
            }
            
            if (polarIndex != -1) {
                return _showPolarTrigger(polarIndex, valueIndex);
            }
            
            return false;
        }
        
        /**
         * 根据坐标轴事件带的属性获取最近的axisDataIndex
         */
        function _getNearestDataIndex(direction, categoryAxis) {
            var dataIndex = -1;
            var x = zrEvent.getX(_event);
            var y = zrEvent.getY(_event);
            if (direction == 'x') {
                // 横轴为类目轴
                var left;
                var right;
                var xEnd = grid.getXend();
                var curCoord = categoryAxis.getCoordByIndex(dataIndex);
                while (curCoord < xEnd) {
                    if (curCoord <= x) {
                        left = curCoord;
                    }
                    if (curCoord >= x) {
                        break;
                    }
                    curCoord = categoryAxis.getCoordByIndex(++dataIndex);
                    right = curCoord;
                }
                if (x - left < right - x) {
                    dataIndex -= 1;
                }
                else {
                    // 离右边近，看是否为最后一个
                    if (typeof categoryAxis.getNameByIndex(dataIndex)
                        == 'undefined'
                    ) {
                        dataIndex = -1;
                    }
                }
                return dataIndex;
            }
            else {
                // 纵轴为类目轴
                var top;
                var bottom;
                var yStart = grid.getY();
                var curCoord = categoryAxis.getCoordByIndex(dataIndex);
                while (curCoord > yStart) {
                    if (curCoord >= y) {
                        bottom = curCoord;
                    }
                    if (curCoord <= y) {
                        break;
                    }
                    curCoord = categoryAxis.getCoordByIndex(++dataIndex);
                    top = curCoord;
                }

                if (y - top > bottom - y) {
                    dataIndex -= 1;
                }
                else {
                    // 离上方边近，看是否为最后一个
                    if (typeof categoryAxis.getNameByIndex(dataIndex)
                        == 'undefined'
                    ) {
                        dataIndex = -1;
                    }
                }
                return dataIndex;
            }
            return -1;
        }

        /**
         * 直角系 
         */
        function _showAxisTrigger(xAxisIndex, yAxisIndex, dataIndex) {
            if (typeof xAxis == 'undefined'
                || typeof yAxis == 'undefined'
                || typeof xAxisIndex == 'undefined'
                || typeof yAxisIndex == 'undefined'
                || dataIndex < 0
            ) {
                // 不响应tooltip的数据对象延时隐藏
                clearTimeout(_hidingTicket);
                clearTimeout(_showingTicket);
                _hidingTicket = setTimeout(_hide, _hideDelay);
                return;
            }
            var series = option.series;
            var seriesArray = [];
            var categoryAxis;
            var x;
            var y;

            var formatter;
            var specialCssText = '';
            if (self.deepQuery([option], 'tooltip.trigger') == 'axis') {
                if (self.deepQuery([option], 'tooltip.show') === false) {
                    return;
                }
                formatter = self.deepQuery([option],'tooltip.formatter');
            }

            if (xAxisIndex != -1
                && xAxis.getAxis(xAxisIndex).type
                   == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
            ) {
                // 横轴为类目轴，找到所有用这条横轴并且axis触发的系列数据
                categoryAxis = xAxis.getAxis(xAxisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (series[i].xAxisIndex == xAxisIndex
                        && self.deepQuery(
                               [series[i], option], 'tooltip.trigger'
                           ) == 'axis'
                    ) {
                        formatter = self.deepQuery(
                            [series[i]],
                            'tooltip.formatter'
                        ) || formatter;
                        specialCssText += _style(self.deepQuery(
                                              [series[i]], 'tooltip'
                                          ));
                        seriesArray.push(series[i]);
                    }
                }
                y = zrEvent.getY(_event) + 10;
                x = categoryAxis.getCoordByIndex(dataIndex);
                _styleAxisPointer(
                    seriesArray,
                    x, grid.getY(), 
                    x, grid.getYend(),
                    categoryAxis.getGap()
                );
                x += 10;
            }
            else if (yAxisIndex != -1
                     && yAxis.getAxis(yAxisIndex).type
                        == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
            ) {
                // 纵轴为类目轴，找到所有用这条纵轴并且axis触发的系列数据
                categoryAxis = yAxis.getAxis(yAxisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (series[i].yAxisIndex == yAxisIndex
                        && self.deepQuery(
                               [series[i], option], 'tooltip.trigger'
                           ) == 'axis'
                    ) {
                        formatter = self.deepQuery(
                            [series[i]],
                            'tooltip.formatter'
                        ) || formatter;
                        specialCssText += _style(self.deepQuery(
                                              [series[i]], 'tooltip'
                                          ));
                        seriesArray.push(series[i]);
                    }
                }
                x = zrEvent.getX(_event) + 10;
                y = categoryAxis.getCoordByIndex(dataIndex);
                _styleAxisPointer(
                    seriesArray,
                    grid.getX(), y, 
                    grid.getXend(), y,
                    categoryAxis.getGap()
                );
                y += 10;
            }

            if (seriesArray.length > 0) {
                var data;
                if (typeof formatter == 'function') {
                    var params = [];
                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        data = seriesArray[i].data[dataIndex];
                        data = typeof data != 'undefined'
                               ? (typeof data.value != 'undefined'
                                   ? data.value
                                   : data)
                               : '-';
                               
                        params.push([
                            seriesArray[i].name,
                            categoryAxis.getNameByIndex(dataIndex),
                            data
                        ]);
                    }
                    _curTicket = 'axis:' + dataIndex;
                    _tDom.innerHTML = formatter(
                        params, _curTicket, _setContent
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}');
                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        formatter = formatter.replace(
                            '{a' + i + '}',
                            seriesArray[i].name
                        );
                        formatter = formatter.replace(
                            '{b' + i + '}',
                            categoryAxis.getNameByIndex(dataIndex)
                        );
                        data = seriesArray[i].data[dataIndex];
                        data = typeof data != 'undefined'
                               ? (typeof data.value != 'undefined'
                                   ? data.value
                                   : data)
                               : '-';
                        formatter = formatter.replace(
                            '{c' + i + '}',
                            data
                        );
                    }
                    _tDom.innerHTML = formatter;
                }
                else {
                    formatter = categoryAxis.getNameByIndex(dataIndex);
                    for (var i = 0, l = seriesArray.length; i < l; i++) {
                        formatter += '<br/>' + seriesArray[i].name + ' : ';
                        data = seriesArray[i].data[dataIndex];
                        data = data = typeof data != 'undefined'
                               ? (typeof data.value != 'undefined'
                                   ? data.value
                                   : data)
                               : '-';
                        formatter += data;
                    }
                    _tDom.innerHTML = formatter;
                }

                if (!self.hasAppend) {
                    _tDom.style.left = _zrWidth / 2 + 'px';
                    _tDom.style.top = _zrHeight / 2 + 'px';
                    dom.firstChild.appendChild(_tDom);
                    self.hasAppend = true;
                }
                _show(x, y, specialCssText);
            }
        }
        
        /**
         * 极坐标 
         */
        function _showPolarTrigger(polarIndex, dataIndex) {
            if (typeof polar == 'undefined'
                || typeof polarIndex == 'undefined'
                || typeof dataIndex == 'undefined'
                || dataIndex < 0
            ) {
                return false;
            }
            var series = option.series;
            var seriesArray = [];

            var formatter;
            var specialCssText = '';
            if (self.deepQuery([option], 'tooltip.trigger') == 'axis') {
                if (self.deepQuery([option], 'tooltip.show') === false) {
                    return false;
                }
                formatter = self.deepQuery([option],'tooltip.formatter');
            }

            // 找到所有用这个极坐标并且axis触发的系列数据
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].polarIndex == polarIndex
                    && self.deepQuery(
                           [series[i], option], 'tooltip.trigger'
                       ) == 'axis'
                ) {
                    formatter = self.deepQuery(
                        [series[i]],
                        'tooltip.formatter'
                    ) || formatter;
                    specialCssText += _style(self.deepQuery(
                                          [series[i]], 'tooltip'
                                      ));
                    seriesArray.push(series[i]);
                }
            }
            if (seriesArray.length > 0) {
                var polarData;
                var data;
                var params = [];
                var indicatorName = 
                    option.polar[polarIndex].indicator[dataIndex].text;

                for (var i = 0, l = seriesArray.length; i < l; i++) {
                    polarData = seriesArray[i].data;
                    for (var j = 0, k = polarData.length; j < k; j++) {
                        data = polarData[j];
                        data = typeof data != 'undefined'
                               ? data
                               : {name:'', value: {dataIndex:'-'}};
                               
                        params.push([
                            typeof seriesArray[i].name != 'undefin'
                            ? seriesArray[i].name : '',
                            data.name,
                            data.value[dataIndex],
                            indicatorName
                        ]);
                    }
                }
                if (typeof formatter == 'function') {
                    _curTicket = 'axis:' + dataIndex;
                    _tDom.innerHTML = formatter(
                        params, _curTicket, _setContent
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}')
                                         .replace('{d}','{d0}');
                    for (var i = 0, l = params.length; i < l; i++) {
                        formatter = formatter.replace(
                            '{a' + i + '}',
                            params[i][0]
                        );
                        formatter = formatter.replace(
                            '{b' + i + '}',
                            params[i][1]
                        );
                        formatter = formatter.replace(
                            '{c' + i + '}',
                            params[i][2]
                        );
                        formatter = formatter.replace(
                            '{d' + i + '}',
                            params[i][3]
                        );
                    }
                    _tDom.innerHTML = formatter;
                }
                else {
                    formatter = params[0][1] + '<br/>' 
                                + params[0][3] + ' : ' + params[0][2];
                    for (var i = 1, l = params.length; i < l; i++) {
                        formatter += '<br/>' + params[i][1] + '<br/>';
                        formatter += params[i][3] + ' : ' + params[i][2];
                    }
                    _tDom.innerHTML = formatter;
                }

                if (!self.hasAppend) {
                    _tDom.style.left = _zrWidth / 2 + 'px';
                    _tDom.style.top = _zrHeight / 2 + 'px';
                    dom.firstChild.appendChild(_tDom);
                    self.hasAppend = true;
                }
                _show(
                    zrEvent.getX(_event), 
                    zrEvent.getY(_event), 
                    specialCssText
                );
                return true;
            }
        }
        
        function _showItemTrigger() {
            var serie = ecData.get(_curTarget, 'series');
            var data = ecData.get(_curTarget, 'data');
            var name = ecData.get(_curTarget, 'name');
            var value = ecData.get(_curTarget, 'value');
            var speical = ecData.get(_curTarget, 'special');
            // 从低优先级往上找到trigger为item的formatter和样式
            var formatter;
            var specialCssText = '';
            var indicator;
            var html = '';
            if (_curTarget._type != 'island') {
                // 全局
                if (self.deepQuery([option], 'tooltip.trigger') == 'item'
                ) {
                    formatter = self.deepQuery(
                                    [option], 'tooltip.formatter'
                                ) || formatter;
                }
                // 系列
                if (self.deepQuery([serie],  'tooltip.trigger') == 'item'
                ) {
                    formatter = self.deepQuery(
                                    [serie], 'tooltip.formatter'
                                ) || formatter;
                    specialCssText += _style(self.deepQuery(
                                          [serie], 'tooltip'
                                      ));
                }
                // 数据项
                formatter = self.deepQuery(
                                [data], 'tooltip.formatter'
                            ) || formatter;
                specialCssText += _style(self.deepQuery([data], 'tooltip'));
            }
            else {
                formatter = self.deepQuery(
                    [data, serie, option],
                    'tooltip.islandFormatter'
                );
            }

            if (typeof formatter == 'function') {
                _curTicket = serie.name
                             + ':'
                             + ecData.get(_curTarget, 'dataIndex');
                _tDom.innerHTML = formatter(
                    [
                        serie.name,
                        name,
                        value,
                        speical
                    ],
                    _curTicket,
                    _setContent
                );
            }
            else if (typeof formatter == 'string') {
                formatter = formatter.replace('{a}','{a0}')
                                     .replace('{b}','{b0}')
                                     .replace('{c}','{c0}')
                                     .replace('{d}','{d0}');
                formatter = formatter.replace('{a0}', serie.name)
                                     .replace('{b0}', name)
                                     .replace('{c0}', value);

                if (typeof speical != 'undefined') {
                    formatter = formatter.replace('{d0}', speical);
                }

                _tDom.innerHTML = formatter;
            }
            else {
                if (serie.type == ecConfig.CHART_TYPE_SCATTER) {
                    _tDom.innerHTML = serie.name + '<br/>' +
                                      (name === '' ? '' : (name + ' : ')) 
                                      + value +
                                      (typeof speical == 'undefined'
                                      ? ''
                                      : (' (' + speical + ')'));
                }
                else if (serie.type == ecConfig.CHART_TYPE_RADAR) {
                    indicator = speical;
                    html += (name === '' ? serie.name : name) + '<br />';
                    for (var i = 0 ; i < indicator.length; i ++) {
                        html += indicator[i].text + ' : ' + value[i] + '<br />';
                    }
                    _tDom.innerHTML = html;
                }
                else {
                    _tDom.innerHTML = serie.name + '<br/>' +
                                      name + ' : ' + value +
                                      (typeof speical == 'undefined'
                                      ? ''
                                      : (' (' + speical + ')'));
                }
            }

            if (!self.hasAppend) {
                _tDom.style.left = _zrWidth / 2 + 'px';
                _tDom.style.top = _zrHeight / 2 + 'px';
                dom.firstChild.appendChild(_tDom);
                self.hasAppend = true;
            }

            _show(
                zrEvent.getX(_event) + 20,
                zrEvent.getY(_event) - 20,
                specialCssText
            );

            if (!_axisLineShape.invisible) {
                _axisLineShape.invisible = true;
                zr.modShape(_axisLineShape.id, _axisLineShape);
                zr.refresh();
            }
        }

        /**
         * 设置坐标轴指示器样式 
         */
        function _styleAxisPointer(
            seriesArray, xStart, yStart, xEnd, yEnd, gap
        ) {
            if (seriesArray.length > 0) {
                var queryTarget;
                var curType;
                var axisPointer = option.tooltip.axisPointer;
                var pointType = axisPointer.type;
                var lineColor = axisPointer.lineStyle.color;
                var lineWidth = axisPointer.lineStyle.width;
                var lineType = axisPointer.lineStyle.type;
                var areaSize = axisPointer.areaStyle.size;
                var areaColor = axisPointer.areaStyle.color;
                
                for (var i = 0, l = seriesArray.length; i < l; i++) {
                    if (self.deepQuery(
                           [seriesArray[i], option], 'tooltip.trigger'
                       ) == 'axis'
                    ) {
                        queryTarget = [seriesArray[i]];
                        curType = self.deepQuery(
                            queryTarget,
                            'tooltip.axisPointer.type'
                        );
                        pointType = curType || pointType; 
                        if (curType == 'line') {
                            lineColor = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.color'
                            ) || lineColor;
                            lineWidth = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.width'
                            ) || lineWidth;
                            lineType = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.lineStyle.type'
                            ) || lineType;
                        }
                        else if (curType == 'shadow') {
                            areaSize = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.areaStyle.size'
                            ) || areaSize;
                            areaColor = self.deepQuery(
                                queryTarget,
                                'tooltip.axisPointer.areaStyle.color'
                            ) || areaColor;
                        }
                    }
                }
                
                if (pointType == 'line') {
                    _axisLineShape.style = {
                        xStart : xStart,
                        yStart : yStart,
                        xEnd : xEnd,
                        yEnd : yEnd,
                        strokeColor : lineColor,
                        lineWidth : lineWidth,
                        lineType : lineType
                    };
                    _axisLineShape.invisible = false;
                    zr.modShape(_axisLineShape.id, _axisLineShape);
                }
                else if (pointType == 'shadow') {
                    if (typeof areaSize == 'undefined' 
                        || areaSize == 'auto'
                        || isNaN(areaSize)
                    ) {
                        lineWidth = gap;
                    }
                    else {
                        lineWidth = areaSize;
                    }
                    if (xStart == xEnd) {
                        // 纵向
                        if (Math.abs(grid.getX() - xStart) < 2) {
                            // 最左边
                            lineWidth /= 2;
                            xStart = xEnd = xEnd + lineWidth / 2;
                        }
                        else if (Math.abs(grid.getXend() - xStart) < 2) {
                            // 最右边
                            lineWidth /= 2;
                            xStart = xEnd = xEnd - lineWidth / 2;
                        }
                    }
                    else if (yStart == yEnd) {
                        // 横向
                        if (Math.abs(grid.getY() - yStart) < 2) {
                            // 最上边
                            lineWidth /= 2;
                            yStart = yEnd = yEnd + lineWidth / 2;
                        }
                        else if (Math.abs(grid.getYend() - yStart) < 2) {
                            // 最右边
                            lineWidth /= 2;
                            yStart = yEnd = yEnd - lineWidth / 2;
                        }
                    }
                    _axisShadowShape.style = {
                        xStart : xStart,
                        yStart : yStart,
                        xEnd : xEnd,
                        yEnd : yEnd,
                        strokeColor : areaColor,
                        lineWidth : lineWidth
                    };
                    _axisShadowShape.invisible = false;
                    zr.modShape(_axisShadowShape.id, _axisShadowShape);
                }
                zr.refresh();
            }
        }

        /**
         * zrender事件响应：鼠标移动
         */
        function _onmousemove(param) {
            clearTimeout(_hidingTicket);
            clearTimeout(_showingTicket);
            var target = param.target;
            var mx = zrEvent.getX(param.event);
            var my = zrEvent.getY(param.event);
            if (!target) {
                // 判断是否落到直角系里，axis触发的tooltip
                _curTarget = false;
                _event = param.event;
                _event._target = _event.target || _event.toElement;
                _event.zrenderX = mx;
                _event.zrenderY = my;
                if (_needAxisTrigger 
                    && grid 
                    && zrArea.isInside(
                        rectangle,
                        grid.getArea(),
                        mx,
                        my
                    )
                ) {
                    _showingTicket = setTimeout(_tryShow, _showDelay);
                }
                else if (_needAxisTrigger 
                        && polar 
                        && polar.isInside([mx, my]) != -1
                ) {
                    _showingTicket = setTimeout(_tryShow, _showDelay);
                }
                else {
                    _hidingTicket = setTimeout(_hide, _hideDelay);
                }
            }
            else {
                _curTarget = target;
                _event = param.event;
                _event._target = _event.target || _event.toElement;
                _event.zrenderX = mx;
                _event.zrenderY = my;
                var polarIndex;
                if (_needAxisTrigger 
                    && polar 
                    && (polarIndex = polar.isInside([mx, my])) != -1
                ) {
                    // 看用这个polar的系列数据是否是axis触发，如果是设置_curTarget为nul
                    var series = option.series;
                    for (var i = 0, l = series.length; i < l; i++) {
                        if (series[i].polarIndex == polarIndex
                            && self.deepQuery(
                                   [series[i], option], 'tooltip.trigger'
                               ) == 'axis'
                        ) {
                            _curTarget = null;
                            break;
                        }
                    }
                   
                }
                _showingTicket = setTimeout(_tryShow, _showDelay);
            }
        }

        /**
         * zrender事件响应：鼠标离开绘图区域
         */
        function _onglobalout() {
            clearTimeout(_hidingTicket);
            clearTimeout(_showingTicket);
            _hidingTicket = setTimeout(_hide, _hideDelay);
        }

        /**
         * 异步回调填充内容
         */
        function _setContent(ticket, content) {
            if (ticket == _curTicket) {
                _tDom.innerHTML = content;
            }
            var cssText = '';
            var domHeight = _tDom.offsetHeight;
            var domWidth = _tDom.offsetWidth;

            if (_tDom.offsetLeft + domWidth > _zrWidth) {
                cssText += 'left:' + (_zrWidth - domWidth) + 'px;';
            }
            if (_tDom.offsetTop + domHeight > _zrHeight) {
                cssText += 'top:' + (_zrHeight - domHeight) + 'px;';
            }
            if (cssText !== '') {
                _tDom.style.cssText += cssText;
            }
            
            if (_zrWidth - _tDom.offsetLeft < 100 
                || _zrHeight - _tDom.offsetTop < 100
            ) {
                // 太靠边的做一次refixed
                setTimeout(_refixed, 20);
            }
        }

        function setComponent(newComponent) {
            component = newComponent;
            grid = component.grid;
            xAxis = component.xAxis;
            yAxis = component.yAxis;
            polar = component.polar;
        }

        function init(newOption, newDom) {
            option = newOption;
            dom = newDom;

            option.tooltip = self.reformOption(option.tooltip);
            option.tooltip.textStyle = zrUtil.merge(
                option.tooltip.textStyle,
                ecConfig.textStyle,
                {
                    'overwrite': false,
                    'recursive': true
                }
            );
            // 补全padding属性
            option.tooltip.padding = self.reformCssArray(
                option.tooltip.padding
            );

            _needAxisTrigger = false;
            if (option.tooltip.trigger == 'axis') {
                _needAxisTrigger = true;
            }

            var series = option.series;
            for (var i = 0, l = series.length; i < l; i++) {
                if (self.deepQuery([series[i]], 'tooltip.trigger')
                    == 'axis'
                ) {
                    _needAxisTrigger = true;
                    break;
                }
            }
            
            _showDelay = option.tooltip.showDelay;
            _hideDelay = option.tooltip.hideDelay;
            _defaultCssText = _style(option.tooltip);
            _tDom.style.position = 'absolute';  // 不是多余的，别删！
            self.hasAppend = false;
        }
        
        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                option.tooltip = self.reformOption(option.tooltip);
                option.tooltip.textStyle = zrUtil.merge(
                    option.tooltip.textStyle,
                    ecConfig.textStyle,
                    {
                        'overwrite': false,
                        'recursive': true
                    }
                );
                // 补全padding属性
                option.tooltip.padding = self.reformCssArray(
                    option.tooltip.padding
                );
            }
        }

        /**
         * zrender事件响应：窗口大小改变
         */
        function resize() {
            _zrHeight = zr.getHeight();
            _zrWidth = zr.getWidth();
        }

        /**
         * 释放后实例不可用，重载基类方法
         */
        function dispose() {
            clearTimeout(_hidingTicket);
            clearTimeout(_showingTicket);
            zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
            zr.un(zrConfig.EVENT.GLOBALOUT, _onglobalout);

            if (self.hasAppend) {
                dom.firstChild.removeChild(_tDom);
            }
            _tDom = null;

            // self.clear();
            self.shapeList = null;
            self = null;
        }

        zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
        zr.on(zrConfig.EVENT.GLOBALOUT, _onglobalout);

        // 重载基类方法
        self.dispose = dispose;

        self.init = init;
        self.refresh = refresh;
        self.resize = resize;
        self.setComponent = setComponent;
        init(option, dom);
    }

    require('../component').define('tooltip', Tooltip);

    return Tooltip;
});
/**
 * echarts组件：工具箱
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/toolbox',['require','./base','../config','zrender/config','zrender/tool/event','../component','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {HtmlElement} dom 目标对象
     */
    function Toolbox(messageCenter, zr, dom) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');
        var zrConfig = require('zrender/config');
        var zrEvent = require('zrender/tool/event');

        var option;
        var component;
        
        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_TOOLBOX;

        var _zlevelBase = self.getZlevelBase();
        var _magicType;
        var _magicMap;
        var _iconList;
        var _iconShapeMap = {};
        var _itemGroupLocation;
        var _enableColor = 'red';
        var _disableColor = '#ccc';
        var _markColor;
        var _markStart;
        var _marking;
        var _markShape;
        
        var _zoomStart;
        var _zooming;
        var _zoomShape;
        var _zoomQueue;

        var _dataView;

        function _buildShape() {
            _iconList = [];
            var feature = option.toolbox.feature;
            for (var key in feature){
                if (feature[key]) {
                    switch (key) {
                        case 'mark' :
                            _iconList.push('mark');
                            _iconList.push('markUndo');
                            _iconList.push('markClear');
                            break;
                        case 'magicType' :
                            for (var i = 0, l = feature[key].length; i < l; i++
                            ) {
                                _iconList.push(feature[key][i] + 'Chart');
                            }
                            break;
                        case 'dataZoom' :
                            _iconList.push('dataZoom');
                            _iconList.push('dataZoomReset');
                            break;
                        case 'saveAsImage' :
                            if (!G_vmlCanvasManager) {
                                _iconList.push('saveAsImage');
                            }
                            break;
                        default :
                            _iconList.push(key);
                            break;
                    }
                }
            }
            if (_iconList.length > 0) {
                _itemGroupLocation = _getItemGroupLocation();

                _buildBackground();
                _buildItem();

                for (var i = 0, l = self.shapeList.length; i < l; i++) {
                    self.shapeList[i].id = zr.newShapeId(self.type);
                    zr.addShape(self.shapeList[i]);
                }
                if (_iconShapeMap['mark']) {
                    _iconDisable(_iconShapeMap['markUndo']);
                    _iconDisable(_iconShapeMap['markClear']);
                }
                if (_iconShapeMap['dataZoomReset'] && _zoomQueue.length === 0) {
                    _iconDisable(_iconShapeMap['dataZoomReset']);
                }
            }
        }

        /**
         * 构建所有图例元素
         */
        function _buildItem() {
            var toolboxOption = option.toolbox;
            var iconLength = _iconList.length;
            var lastX = _itemGroupLocation.x;
            var lastY = _itemGroupLocation.y;
            var itemSize = toolboxOption.itemSize;
            var itemGap = toolboxOption.itemGap;
            var itemShape;

            var color = toolboxOption.color instanceof Array
                        ? toolboxOption.color : [toolboxOption.color];
            /*
            var textPosition;
            if (toolboxOption.orient == 'horizontal') {
                textPosition = toolboxOption.y != 'bottom'
                               ? 'bottom' : 'top';
            }
            else {
                textPosition = toolboxOption.x != 'left'
                               ? 'left' : 'right';
            }
            */
           _iconShapeMap = {};

            for (var i = 0; i < iconLength; i++) {
                // 图形
                itemShape = {
                    shape : 'icon',
                    zlevel : _zlevelBase,
                    style : {
                        x : lastX,
                        y : lastY,
                        width : itemSize,
                        height : itemSize,
                        iconType : _iconList[i],
                        strokeColor : color[i % color.length],
                        shadowColor: '#ccc',
                        shadowBlur : 2,
                        shadowOffsetX : 2,
                        shadowOffsetY : 2,
                        brushType: 'stroke'
                    },
                    highlightStyle : {
                        lineWidth : 2,
                        shadowBlur: 5,
                        strokeColor : color[i % color.length]
                    },
                    hoverable : true,
                    clickable : true
                };

                switch(_iconList[i]) {
                    case 'mark':
                        itemShape.onclick = _onMark;
                        _markColor = itemShape.style.strokeColor;
                        break;
                    case 'markUndo':
                        itemShape.onclick = _onMarkUndo;
                        break;
                    case 'markClear':
                        itemShape.onclick = _onMarkClear;
                        break;
                    case 'dataZoom':
                        itemShape.onclick = _onDataZoom;
                        break;
                    case 'dataZoomReset':
                        itemShape.onclick = _onDataZoomReset;
                        break;
                    case 'dataView' :
                        if (!_dataView) {
                            var componentLibrary = require('../component');
                            var DataView = componentLibrary.get('dataView');
                            _dataView = new DataView(
                                messageCenter, zr, option, dom
                            );
                        }
                        itemShape.onclick = _onDataView;
                        break;
                    case 'restore':
                        itemShape.onclick = _onRestore;
                        break;
                    case 'saveAsImage':
                        itemShape.onclick = _onSaveAsImage;
                        break;
                    default:
                        if (_iconList[i].match('Chart')) {
                            itemShape._name = _iconList[i].replace('Chart', '');
                            if (itemShape._name == _magicType) {
                                itemShape.style.strokeColor = _enableColor;
                            }
                            itemShape.onclick = _onMagicType;
                        }
                        break;
                }

                self.shapeList.push(itemShape);
                _iconShapeMap[_iconList[i]] = itemShape;

                if (toolboxOption.orient == 'horizontal') {
                    lastX += itemSize + itemGap;
                }
                else {
                    lastY += itemSize + itemGap;
                }
            }
        }

        function _buildBackground() {
            var toolboxOption = option.toolbox;
            var pTop = toolboxOption.padding[0];
            var pRight = toolboxOption.padding[1];
            var pBottom = toolboxOption.padding[2];
            var pLeft = toolboxOption.padding[3];

            self.shapeList.push({
                shape : 'rectangle',
                zlevel : _zlevelBase,
                hoverable :false,
                style : {
                    x : _itemGroupLocation.x - pLeft,
                    y : _itemGroupLocation.y - pTop,
                    width : _itemGroupLocation.width + pLeft + pRight,
                    height : _itemGroupLocation.height + pTop + pBottom,
                    brushType : toolboxOption.borderWidth === 0
                                ? 'fill' : 'both',
                    color : toolboxOption.backgroundColor,
                    strokeColor : toolboxOption.borderColor,
                    lineWidth : toolboxOption.borderWidth
                }
            });
        }

        /**
         * 根据选项计算图例实体的位置坐标
         */
        function _getItemGroupLocation() {
            var toolboxOption = option.toolbox;
            var iconLength = _iconList.length;
            var itemGap = toolboxOption.itemGap;
            var itemSize = toolboxOption.itemSize;
            var totalWidth = 0;
            var totalHeight = 0;

            if (toolboxOption.orient == 'horizontal') {
                // 水平布局，计算总宽度，别忘减去最后一个的itemGap
                totalWidth = (itemSize + itemGap) * iconLength - itemGap;
                totalHeight = itemSize;
            }
            else {
                // 垂直布局，计算总高度
                totalHeight = (itemSize + itemGap) * iconLength - itemGap;
                totalWidth = itemSize;
            }

            var x;
            var zrWidth = zr.getWidth();
            switch (toolboxOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = toolboxOption.padding[3] + toolboxOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - toolboxOption.padding[1]
                        - toolboxOption.borderWidth;
                    break;
                default :
                    x = toolboxOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    break;
            }

            var y;
            var zrHeight = zr.getHeight();
            switch (toolboxOption.y) {
                case 'top' :
                    y = toolboxOption.padding[0] + toolboxOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - toolboxOption.padding[2]
                        - toolboxOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = toolboxOption.y - 0;
                    y = isNaN(y) ? 0 : y;
                    break;
            }

            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        }

        function _onMark(param) {
            var target = param.target;
            if (_marking || _markStart) {
                // 取消
                _resetMark();
                zr.refresh();
            }
            else {
                // 启用Mark
                _resetZoom();   // mark与dataZoom互斥
                
                zr.modShape(target.id, {style: {strokeColor: _enableColor}});
                zr.refresh();
                _markStart = true;
                setTimeout(function(){
                    zr
                    && zr.on(zrConfig.EVENT.CLICK, _onclick)
                    && zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
                }, 10);
            }
            return true; // 阻塞全局事件
        }
        
        function _onDataZoom(param) {
            var target = param.target;
            if (_zooming || _zoomStart) {
                // 取消
                _resetZoom();
                zr.refresh();
                dom.style.cursor = 'default';
            }
            else {
                // 启用Zoom
                _resetMark();   // mark与dataZoom互斥
                
                zr.modShape(target.id, {style: {strokeColor: _enableColor}});
                zr.refresh();
                _zoomStart = true;
                setTimeout(function(){
                    zr
                    && zr.on(zrConfig.EVENT.MOUSEDOWN, _onmousedown)
                    && zr.on(zrConfig.EVENT.MOUSEUP, _onmouseup)
                    && zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
                }, 10);
                
                dom.style.cursor = 'crosshair';
            }
            return true; // 阻塞全局事件
        }

        function _onmousemove(param) {
            if (_marking) {
                _markShape.style.xEnd = zrEvent.getX(param.event);
                _markShape.style.yEnd = zrEvent.getY(param.event);
                zr.addHoverShape(_markShape);
            }
            if (_zooming) {
                _zoomShape.style.width = 
                    zrEvent.getX(param.event) - _zoomShape.style.x;
                _zoomShape.style.height = 
                    zrEvent.getY(param.event) - _zoomShape.style.y;
                zr.addHoverShape(_zoomShape);
                dom.style.cursor = 'crosshair';
            }
            if (_zoomStart
                && (dom.style.cursor != 'pointer' && dom.style.cursor != 'move')
            ) {
                dom.style.cursor = 'crosshair';
            }
        }

        function _onmousedown(param) {
            if (param.target) {
                return;
            }
            _zooming = true;
            var x = zrEvent.getX(param.event);
            var y = zrEvent.getY(param.event);
            var zoomOption = option.dataZoom || {};
            _zoomShape = {
                shape : 'rectangle',
                id : zr.newShapeId('zoom'),
                zlevel : _zlevelBase,
                style : {
                    x : x,
                    y : y,
                    width : 1,
                    height : 1,
                    brushType: 'both'
                },
                highlightStyle : {
                    lineWidth : 2,
                    color: zoomOption.fillerColor 
                           || ecConfig.dataZoom.fillerColor,
                    strokeColor : zoomOption.handleColor 
                                  || ecConfig.dataZoom.handleColor,
                    brushType: 'both'
                }
            };
            zr.addHoverShape(_zoomShape);
            return true; // 阻塞全局事件
        }
        
        function _onmouseup(/*param*/) {
            if (!_zoomShape 
                || Math.abs(_zoomShape.style.width) < 10 
                || Math.abs(_zoomShape.style.height) < 10
            ) {
                _zooming = false;
                return true;
            }
            if (_zooming && component.dataZoom) {
                _zooming = false;
                
                var zoom = component.dataZoom.rectZoom(_zoomShape.style);
                if (zoom) {
                    _zoomQueue.push({
                        start : zoom.start,
                        end : zoom.end,
                        start2 : zoom.start2,
                        end2 : zoom.end2
                    });
                    _iconEnable(_iconShapeMap['dataZoomReset']);
                    zr.refresh();
                }
            }
            return true; // 阻塞全局事件
        }
        
        function _onclick(param) {
            if (_marking) {
                _marking = false;
                self.shapeList.push(_markShape);
                _iconEnable(_iconShapeMap['markUndo']);
                _iconEnable(_iconShapeMap['markClear']);
                zr.addShape(_markShape);
                zr.refresh();
            } else if (_markStart) {
                _marking = true;
                var x = zrEvent.getX(param.event);
                var y = zrEvent.getY(param.event);
                _markShape = {
                    shape : 'line',
                    id : zr.newShapeId('mark'),
                    zlevel : _zlevelBase,
                    style : {
                        xStart : x,
                        yStart : y,
                        xEnd : x,
                        yEnd : y,
                        lineWidth : self.deepQuery(
                                        [option],
                                        'toolbox.feature.mark.lineStyle.width'
                                    ) || 2,
                        strokeColor : self.deepQuery(
                                          [option],
                                          'toolbox.feature.mark.lineStyle.color'
                                      ) || _markColor,
                        lineType : self.deepQuery(
                                       [option],
                                       'toolbox.feature.mark.lineStyle.type'
                                   ) || 'dashed'
                    }
                };
                zr.addHoverShape(_markShape);
            }
        }

        function _onMarkUndo() {
            if (_marking) {
                _marking = false;
            } else {
                var len = self.shapeList.length - 1;    // 有一个是背景shape
                if (_iconList.length == len - 1) {
                    _iconDisable(_iconShapeMap['markUndo']);
                    _iconDisable(_iconShapeMap['markClear']);
                }
                if (_iconList.length < len) {
                    var target = self.shapeList[self.shapeList.length - 1];
                    zr.delShape(target.id);
                    zr.refresh();
                    self.shapeList.pop();
                }
            }
            return true;
        }

        function _onMarkClear() {
            if (_marking) {
                _marking = false;
            }
            // 有一个是背景shape
            var len = self.shapeList.length - _iconList.length - 1;
            var hasClear = false;
            while(len--) {
                zr.delShape(self.shapeList.pop().id);
                hasClear = true;
            }
            if (hasClear) {
                _iconDisable(_iconShapeMap['markUndo']);
                _iconDisable(_iconShapeMap['markClear']);
                zr.refresh();
            }
            return true;
        }
        
        function _onDataZoomReset() {
            if (_zooming) {
                _zooming = false;
            }
            _zoomQueue.pop();
            //console.log(_zoomQueue)
            if (_zoomQueue.length > 0) {
                component.dataZoom.absoluteZoom(
                    _zoomQueue[_zoomQueue.length - 1]
                );
            }
            else {
                component.dataZoom.rectZoom();
                _iconDisable(_iconShapeMap['dataZoomReset']);
                zr.refresh();
            }
            
            return true;
        }

        function _resetMark() {
            _marking = false;
            if (_markStart) {
                _markStart = false;
                if (_iconShapeMap['mark']) {
                    // 还原图标为未生效状态
                    zr.modShape(
                        _iconShapeMap['mark'].id,
                        {
                            style: {
                                strokeColor: _iconShapeMap['mark']
                                                 .highlightStyle
                                                 .strokeColor
                            }
                         }
                    );
                }
                
                zr.un(zrConfig.EVENT.CLICK, _onclick);
                zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
            }
        }
        
        function _resetZoom() {
            _zooming = false;
            if (_zoomStart) {
                _zoomStart = false;
                if (_iconShapeMap['dataZoom']) {
                    // 还原图标为未生效状态
                    zr.modShape(
                        _iconShapeMap['dataZoom'].id,
                        {
                            style: {
                                strokeColor: _iconShapeMap['dataZoom']
                                                 .highlightStyle
                                                 .strokeColor
                            }
                         }
                    );
                }
                
                zr.un(zrConfig.EVENT.MOUSEDOWN, _onmousedown);
                zr.un(zrConfig.EVENT.MOUSEUP, _onmouseup);
                zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
            }
        }

        function _iconDisable(target) {
            zr.modShape(target.id, {
                hoverable : false,
                clickable : false,
                style : {
                    strokeColor : _disableColor
                }
            });
        }

        function _iconEnable(target) {
            zr.modShape(target.id, {
                hoverable : true,
                clickable : true,
                style : {
                    strokeColor : target.highlightStyle.strokeColor
                }
            });
        }

        function _onDataView() {
            _dataView.show(option);
            return true;
        }

        function _onRestore(){
            _resetMark();
            _resetZoom();
            messageCenter.dispatch(ecConfig.EVENT.RESTORE);
            return true;
        }
        
        function _onSaveAsImage() {
            var saveOption = option.toolbox.feature.saveAsImage;
            var imgType = saveOption.type || 'png';
            if (imgType != 'png' && imgType != 'jpeg') {
                imgType = 'png';
            }
            var image = zr.toDataURL('image/' + imgType); 
            var downloadDiv = document.createElement('div');
            downloadDiv.id = '__echarts_download_wrap__';
            downloadDiv.style.cssText = 'position:fixed;'
                + 'z-index:99999;'
                + 'display:block;'
                + 'top:0;left:0;'
                + 'background-color:rgba(33,33,33,0.5);'
                + 'text-align:center;'
                + 'width:100%;'
                + 'height:100%;'
                + 'line-height:' 
                + document.documentElement.clientHeight + 'px;';
                
            downloadDiv.onclick = _close;
            var downloadLink = document.createElement('a');
            //downloadLink.onclick = _saveImageForIE;
            downloadLink.href = image;
            downloadLink.setAttribute(
                'download',
                (saveOption.name 
                 ? saveOption.name 
                 : (option.title && (option.title.text || option.title.subtext))
                   ? (option.title.text || option.title.subtext)
                   : 'ECharts')
                + '.' + imgType 
            );
            downloadLink.innerHTML = '<img src="' + image 
                + '" title="'
                + (!!(window.attachEvent 
                     && navigator.userAgent.indexOf('Opera') === -1)
                  ? '右键->图片另存为'
                  : (saveOption.lang ? saveOption.lang : '点击保存'))
                + '"/>';
            
            downloadDiv.appendChild(downloadLink);
            document.body.appendChild(downloadDiv);
            downloadLink = null;
            downloadDiv = null;
            
            function _close() {
                var d = document.getElementById('__echarts_download_wrap__');
                d.onclick = null;
                d.innerHTML = '';
                document.body.removeChild(d);
                d = null;
            }
            /*
            function _saveImageForIE() {
                window.win = window.open(image);
                win.document.execCommand("SaveAs");
                win.close()
            }
            */
            return;
        }

        function _onMagicType(param) {
            _resetMark();
            var itemName = param.target._name;
            if (itemName == _magicType) {
                // 取消
                _magicType = false;
            }
            else {
                // 启用
                _magicType = itemName;
            }
            messageCenter.dispatch(
                ecConfig.EVENT.MAGIC_TYPE_CHANGED,
                param.event,
                {magicType : _magicType}
            );
            return true;
        }

        function reset(newOption) {
            if (newOption.toolbox
                && newOption.toolbox.show
                && newOption.toolbox.feature.magicType
                && newOption.toolbox.feature.magicType.length > 0
            ) {
                var magicType = newOption.toolbox.feature.magicType;
                var len = magicType.length;
                _magicMap = {};     // 标识可控类型
                while (len--) {
                    _magicMap[magicType[len]] = true;
                }

                len = newOption.series.length;
                var oriType;        // 备份还原可控类型
                var axis;
                while (len--) {
                    oriType = newOption.series[len].type;
                    if (_magicMap[oriType]) {
                        axis = newOption.xAxis instanceof Array
                               ? newOption.xAxis[
                                     newOption.series[len].xAxisIndex || 0
                                 ]
                               : newOption.xAxis;
                        if (axis && axis.type == 'category') {
                            axis.__boundaryGap =
                                typeof axis.boundaryGap != 'undefined'
                                ? axis.boundaryGap : true;
                        }
                        axis = newOption.yAxis instanceof Array
                               ? newOption.yAxis[
                                     newOption.series[len].yAxisIndex || 0
                                 ]
                               : newOption.yAxis;
                        if (axis && axis.type == 'category') {
                            axis.__boundaryGap =
                                typeof axis.boundaryGap != 'undefined'
                                ? axis.boundaryGap : true;
                        }
                        newOption.series[len].__type = oriType;
                    }
                }
            }
            _magicType = false;
            
            var zoomOption = newOption.dataZoom;
            if (zoomOption && zoomOption.show) {
                var start = typeof zoomOption.start != 'undefined'
                            && zoomOption.start >= 0
                            && zoomOption.start <= 100
                            ? zoomOption.start : 0;
                var end = typeof zoomOption.end != 'undefined'
                          && zoomOption.end >= 0
                          && zoomOption.end <= 100
                          ? zoomOption.end : 100;
                if (start > end) {
                    // 大小颠倒自动翻转
                    start = start + end;
                    end = start - end;
                    start = start - end;
                }
                _zoomQueue = [{
                    start : start,
                    end : end,
                    start2 : 0,
                    end2 : 100
                }];
            }
            else {
                _zoomQueue = [];
            }
        }

        function getMagicOption(){
            if (_magicType) {
                // 启动
                for (var i = 0, l = option.series.length; i < l; i++) {
                    if (_magicMap[option.series[i].type]) {
                        option.series[i].type = _magicType;
                    }
                }
                var boundaryGap = _magicType == ecConfig.CHART_TYPE_LINE
                                  ? false : true;
                var len;
                if (option.xAxis instanceof Array) {
                    len = option.xAxis.length;
                    while (len--) {
                        // 横纵默认为类目
                        if ((option.xAxis[len].type || 'category')
                             == 'category'
                         ) {
                            option.xAxis[len].boundaryGap = boundaryGap;
                        }
                    }
                }
                else {
                    if (option.xAxis
                        && (option.xAxis.type || 'category') == 'category'
                    ) {
                        option.xAxis.boundaryGap = boundaryGap;
                    }
                }

                if (option.yAxis instanceof Array) {
                    len = option.yAxis.length;
                    while (len--) {
                        if ((option.yAxis[len].type) == 'category') {
                            option.yAxis[len].boundaryGap = boundaryGap;
                        }
                    }
                }
                else {
                    if (option.yAxis && option.yAxis.type == 'category') {
                        option.yAxis.boundaryGap = boundaryGap;
                    }
                }
            }
            else {
                // 还原
                var axis;
                for (var i = 0, l = option.series.length; i < l; i++) {
                    if (_magicMap[option.series[i].type]) {
                        option.series[i].type = option.series[i].__type;
                        if (option.xAxis instanceof Array) {
                            axis = option.xAxis[
                                       option.series[i].xAxisIndex || 0
                                   ];
                            if (axis.type == 'category') {
                                axis.boundaryGap = axis.__boundaryGap;
                            }
                        }
                        else {
                            axis = option.xAxis;
                            if (axis && axis.type == 'category') {
                                axis.boundaryGap = axis.__boundaryGap;
                            }
                        }

                        if (option.yAxis instanceof Array) {
                            axis = option.yAxis[
                                       option.series[i].yAxisIndex || 0
                                   ];
                            if (axis.type == 'category') {
                                axis.boundaryGap = axis.__boundaryGap;
                            }
                        }
                        else {
                            axis = option.yAxis;
                            if (axis && axis.type == 'category') {
                                axis.boundaryGap = axis.__boundaryGap;
                            }
                        }
                    }
                }
            }

            return option;
        }

        function render(newOption, newComponent){
            _resetMark();
            _resetZoom();
            newOption.toolbox = self.reformOption(newOption.toolbox);
            // 补全padding属性
            newOption.toolbox.padding = self.reformCssArray(
                newOption.toolbox.padding
            );
            option = newOption;
            component = newComponent;

            self.shapeList = [];

            if (newOption.toolbox.show) {
                _buildShape();
            }

            hideDataView();
        }

        function resize() {
            _resetMark();
            self.clear();
            if (option.toolbox.show) {
               _buildShape();
           }
           if (_dataView) {
               _dataView.resize();
           }
        }

        function hideDataView() {
            if (_dataView) {
                _dataView.hide();
            }
        }

        /**
         * 释放后实例不可用
         */
        function dispose() {
            if (_dataView) {
                _dataView.dispose();
            }

            self.clear();
            self.shapeList = null;
            self = null;
        }
        
        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                newOption.toolbox = self.reformOption(newOption.toolbox);
                // 补全padding属性
                newOption.toolbox.padding = self.reformCssArray(
                    newOption.toolbox.padding
                );
                option = newOption;
            }
        }

        // 重载基类方法
        self.dispose = dispose;

        self.render = render;
        self.resize = resize;
        self.hideDataView = hideDataView;
        self.getMagicOption = getMagicOption;
        self.reset = reset;
        self.refresh = refresh;
    }

    require('../component').define('toolbox', Toolbox);
    
    return Toolbox;
});

/**
 * echarts组件：提示框
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/component/dataView',['require','./base','../config','../component'],function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 提示框参数
     * @param {HtmlElement} dom 目标对象
     */
    function DataView(messageCenter, zr, option, dom) {
        var Base = require('./base');
        Base.call(this, zr);

        var ecConfig = require('../config');

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_DATAVIEW;

        var _lang = ['Data View', 'close', 'refresh'];

        // dataview dom & css
        var _tDom = document.createElement('div');
        var _textArea = document.createElement('textArea');
        var _buttonRefresh = document.createElement('button');
        var _buttonClose = document.createElement('button');
        var _hasShow = false;

        // 通用样式
        var _gCssText = 'position:absolute;'
                        + 'display:block;'
                        + 'overflow:hidden;'
                        + 'transition:height 0.8s,background-color 1s;'
                        + '-moz-transition:height 0.8s,background-color 1s;'
                        + '-webkit-transition:height 0.8s,background-color 1s;'
                        + '-o-transition:height 0.8s,background-color 1s;'
                        + 'z-index:1;'
                        + 'left:0;'
                        + 'top:0;';
        var _sizeCssText;
        var _cssName = 'echarts-dataview';

        // 缓存一些高宽数据
        var _zrHeight = zr.getHeight();
        var _zrWidth = zr.getWidth();

        function hide() {
            _sizeCssText = 'width:' + _zrWidth + 'px;'
                           + 'height:' + 0 + 'px;'
                           + 'background-color:#f0ffff;';
            _tDom.style.cssText = _gCssText + _sizeCssText;
            // 这是个很恶心的事情
            dom.onselectstart = function() {
                return false;
            };
        }

        function show(newOption) {
            _hasShow = true;
            var lang = self.deepQuery([option],'toolbox.feature.dataView.lang')
                       || _lang;

            option = newOption;


            _tDom.innerHTML = '<p style="padding:8px 0;margin:0 0 10px 0;'
                              + 'border-bottom:1px solid #eee">'
                              + (lang[0] || _lang[0])
                              + '</p>';

            _textArea.style.cssText =
                'display:block;margin:0 0 8px 0;padding:4px 6px;overflow:auto;'
                + 'width:' + (_zrWidth - 15) + 'px;'
                + 'height:' + (_zrHeight - 100) + 'px;';
            var customContent = self.deepQuery(
                [option], 'toolbox.feature.dataView.optionToContent'
            );
            if (typeof customContent != 'function') {
                _textArea.value = _optionToContent();
            }
            else {
                _textArea.value = customContent(option);
            }
            _tDom.appendChild(_textArea);

            _buttonClose.style.cssText = 'float:right;padding:1px 6px;';
            _buttonClose.innerHTML = lang[1] || _lang[1];
            _buttonClose.onclick = hide;
            _tDom.appendChild(_buttonClose);

            if (self.deepQuery([option], 'toolbox.feature.dataView.readOnly')
                === false
            ) {
                _buttonRefresh.style.cssText =
                    'float:right;margin-right:10px;padding:1px 6px;';
                _buttonRefresh.innerHTML = lang[2] || _lang[2];
                _buttonRefresh.onclick = _save;
                _tDom.appendChild(_buttonRefresh);
                _textArea.readOnly = false;
                _textArea.style.cursor = 'default';
            }
            else {
                _textArea.readOnly = true;
                _textArea.style.cursor = 'text';
            }

            _sizeCssText = 'width:' + _zrWidth + 'px;'
                           + 'height:' + _zrHeight + 'px;'
                           + 'background-color:#fff;';
            _tDom.style.cssText = _gCssText + _sizeCssText;

            // 这是个很恶心的事情
            dom.onselectstart = function() {
                return true;
            };
        }

        function _optionToContent() {
            var i;
            var j;
            var k;
            var len;
            var data;
            var valueList;
            var axisList = [];
            var content = '';
            if (option.xAxis) {
                if (option.xAxis instanceof Array) {
                    axisList = option.xAxis;
                } else {
                    axisList = [option.xAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    // 横纵默认为类目
                    if ((axisList[i].type || 'category') == 'category') {
                        valueList = [];
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            data = axisList[i].data[j];
                            valueList.push(
                                typeof data.value != 'undefined'
                                ? data.value : data
                            );
                        }
                        content += valueList.join(', ') + '\n\n';
                    }
                }
            }

            if (option.yAxis) {
                if (option.yAxis instanceof Array) {
                    axisList = option.yAxis;
                } else {
                    axisList = [option.yAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    if (axisList[i].type  == 'category') {
                        valueList = [];
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            data = axisList[i].data[j];
                            valueList.push(
                                typeof data.value != 'undefined'
                                ? data.value : data
                            );
                        }
                        content += valueList.join(', ') + '\n\n';
                    }
                }
            }

            var series = option.series;
            var itemName;
            for (i = 0, len = series.length; i < len; i++) {
                valueList = [];
                for (j = 0, k = series[i].data.length; j < k; j++) {
                    data = series[i].data[j];
                    if (series[i].type == ecConfig.CHART_TYPE_PIE
                        || series[i].type == ecConfig.CHART_TYPE_MAP
                    ) {
                        itemName = (data.name || '-') + ':';
                    }
                    else {
                        itemName = '';
                    }
                    
                    if (series[i].type == ecConfig.CHART_TYPE_SCATTER) {
                        data = typeof data.value != 'undefined' 
                               ? data.value
                               : data;
                        data = data.join(', ');
                    }
                    valueList.push(
                        itemName
                        + (typeof data.value != 'undefined' ? data.value : data)
                    );
                }
                content += (series[i].name || '-') + ' : \n';
                content += valueList.join(
                    series[i].type == ecConfig.CHART_TYPE_SCATTER ? '\n': ', '
                );
                content += '\n\n';
            }

            return content;
        }

        function _save() {
            var text = _textArea.value;
            var customContent = self.deepQuery(
                [option], 'toolbox.feature.dataView.contentToOption'
            );
            if (typeof customContent != 'function') {
                text = text.split('\n');
                var content = [];
                for (var i = 0, l = text.length; i < l; i++) {
                    text[i] = _trim(text[i]);
                    if (text[i] !== '') {
                        content.push(text[i]);
                    }
                }
                _contentToOption(content);
            }
            else {
                customContent(text, option);
            }

            hide();

            setTimeout(
                function(){
                    messageCenter && messageCenter.dispatch(
                        ecConfig.EVENT.DATA_VIEW_CHANGED,
                        null,
                        {option : option}
                    );
                },
                !G_vmlCanvasManager ? 800 : 100
            );
        }

        function _contentToOption(content) {
            var i;
            var j;
            var k;
            var len;
            var data;
            var axisList = [];

            var contentIdx = 0;
            var contentValueList;
            var value;

            if (option.xAxis) {
                if (option.xAxis instanceof Array) {
                    axisList = option.xAxis;
                } else {
                    axisList = [option.xAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    // 横纵默认为类目
                    if ((axisList[i].type || 'category') == 'category'
                    ) {
                        contentValueList = content[contentIdx].split(',');
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            value = _trim(contentValueList[j] || '');
                            data = axisList[i].data[j];
                            if (typeof axisList[i].data[j].value != 'undefined'
                            ) {
                                axisList[i].data[j].value = value;
                            }
                            else {
                                axisList[i].data[j] = value;
                            }
                        }
                        contentIdx++;
                    }
                }
            }

            if (option.yAxis) {
                if (option.yAxis instanceof Array) {
                    axisList = option.yAxis;
                } else {
                    axisList = [option.yAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    if (axisList[i].type  == 'category') {
                        contentValueList = content[contentIdx].split(',');
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            value = _trim(contentValueList[j] || '');
                            data = axisList[i].data[j];
                            if (typeof axisList[i].data[j].value != 'undefined'
                            ) {
                                axisList[i].data[j].value = value;
                            }
                            else {
                                axisList[i].data[j] = value;
                            }
                        }
                        contentIdx++;
                    }
                }
            }

            var series = option.series;
            for (i = 0, len = series.length; i < len; i++) {
                contentIdx++;
                if (series[i].type == ecConfig.CHART_TYPE_SCATTER) {
                    for (var j = 0, k = series[i].data.length; j < k; j++) {
                        contentValueList = content[contentIdx];
                        value = contentValueList.replace(' ','').split(',');
                        if (typeof series[i].data[j].value != 'undefined'
                        ) {
                            series[i].data[j].value = value;
                        }
                        else {
                            series[i].data[j] = value;
                        }
                        contentIdx++;
                    }
                }
                else {
                    contentValueList = content[contentIdx].split(',');
                    for (var j = 0, k = series[i].data.length; j < k; j++) {
                        value = (contentValueList[j] || '').replace(/.*:/,'');
                        value = _trim(value);
                        value = (value != '-' && value !== '')
                                ? (value - 0)
                                : '-';
                        if (typeof series[i].data[j].value != 'undefined'
                        ) {
                            series[i].data[j].value = value;
                        }
                        else {
                            series[i].data[j] = value;
                        }
                    }
                    contentIdx++;
                }
            }
        }

        function _trim(str){
            var trimer = new RegExp(
                '(^[\\s\\t\\xa0\\u3000]+)|([\\u3000\\xa0\\s\\t]+\x24)', 'g'
            );
            return str.replace(trimer, '');
        }

        // 阻塞zrender事件
        function _stop(e){
            e = e || window.event;
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            else {
                e.cancelBubble = true;
            }
        }

        function _init() {
            _tDom.className = _cssName;
            hide();
            dom.firstChild.appendChild(_tDom);

            if (window.addEventListener) {
                _tDom.addEventListener('click', _stop);
                _tDom.addEventListener('mousewheel', _stop);
                _tDom.addEventListener('mousemove', _stop);
                _tDom.addEventListener('mousedown', _stop);
                _tDom.addEventListener('mouseup', _stop);

                // mobile支持
                _tDom.addEventListener('touchstart', _stop);
                _tDom.addEventListener('touchmove', _stop);
                _tDom.addEventListener('touchend', _stop);
            }
            else {
                _tDom.attachEvent('onclick', _stop);
                _tDom.attachEvent('onmousewheel', _stop);
                _tDom.attachEvent('onmousemove', _stop);
                _tDom.attachEvent('onmousedown', _stop);
                _tDom.attachEvent('onmouseup', _stop);
            }
        }

        /**
         * zrender事件响应：窗口大小改变
         */
        function resize() {
            _zrHeight = zr.getHeight();
            _zrWidth = zr.getWidth();
            if (_tDom.offsetHeight > 10) {
                _sizeCssText = 'width:' + _zrWidth + 'px;'
                               + 'height:' + _zrHeight + 'px;'
                               + 'background-color:#fff;';
                _tDom.style.cssText = _gCssText + _sizeCssText;
                _textArea.style.cssText = 'display:block;margin:0 0 8px 0;'
                                        + 'padding:4px 6px;overflow:auto;'
                                        + 'width:' + (_zrWidth - 15) + 'px;'
                                        + 'height:' + (_zrHeight - 100) + 'px;';
            }
        }

        /**
         * 释放后实例不可用，重载基类方法
         */
        function dispose() {
            if (window.removeEventListener) {
                _tDom.removeEventListener('click', _stop);
                _tDom.removeEventListener('mousewheel', _stop);
                _tDom.removeEventListener('mousemove', _stop);
                _tDom.removeEventListener('mousedown', _stop);
                _tDom.removeEventListener('mouseup', _stop);

                // mobile支持
                _tDom.removeEventListener('touchstart', _stop);
                _tDom.removeEventListener('touchmove', _stop);
                _tDom.removeEventListener('touchend', _stop);
            }
            else {
                _tDom.detachEvent('onclick', _stop);
                _tDom.detachEvent('onmousewheel', _stop);
                _tDom.detachEvent('onmousemove', _stop);
                _tDom.detachEvent('onmousedown', _stop);
                _tDom.detachEvent('onmouseup', _stop);
            }

            _buttonRefresh.onclick = null;
            _buttonClose.onclick = null;

            if (_hasShow) {
                _tDom.removeChild(_textArea);
                _tDom.removeChild(_buttonRefresh);
                _tDom.removeChild(_buttonClose);
            }

            _textArea = null;
            _buttonRefresh = null;
            _buttonClose = null;

            dom.firstChild.removeChild(_tDom);
            _tDom = null;
            self = null;
        }


        // 重载基类方法
        self.dispose = dispose;

        self.resize = resize;
        self.show = show;
        self.hide = hide;

        _init();
    }

    require('../component').define('dataView', DataView);
    
    return DataView;
});
/**
 * echarts坐标处理方法
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @author Neil (杨骥, linzhifeng@baidu.com)
 */

define(
    'echarts/util/coordinates',['require','zrender/tool/math'],function(require) {

        var zrMath = require('zrender/tool/math');

        /**
         * 极坐标转直角坐标
         *
         * @param {number} 半径
         * @param {number} 角度
         *
         * @return {Array.<number>} 直角坐标[x,y]
         */
        function polar2cartesian(r, theta) {
            return [r * zrMath.sin(theta), r*zrMath.cos(theta)];
        }

        /**
         * 直角坐标转极坐标
         *
         * @param {number} 横坐标
         * @param {number} 纵坐标
         *
         * @return {Array.<number>} 极坐标[r,theta]
         */
        function cartesian2polar(x, y) {
            return [Math.sqrt(x * x + y * y), Math.atan(y / x)];
        }

        return {
            polar2cartesian : polar2cartesian,
            cartesian2polar : cartesian2polar
        };
    }
);
/**
 * echarts组件类：极坐标
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Neil (杨骥, yangji01@baidu.com)
 *
 */
define(

    'echarts/component/polar',['require','./base','../config','../util/coordinates','zrender/tool/util','../component'],function(require) {

        function Polar(messageCenter, zr, option, component) {
            var Base = require('./base');
            Base.call(this, zr);

            var ecConfig = require('../config');
            var ecCoordinates = require('../util/coordinates');
            var zrUtil = require('zrender/tool/util');

            var self = this;
            self.type = ecConfig.COMPONENT_TYPE_POLAR;

            var polar; 

            var _width = zr.getWidth();
            var _height = zr.getHeight();

            var series;
            var _queryTarget;

            function init(newOption, newComponent) {
                option = newOption;
                component = newComponent;

                self.clear();

                polar = option.polar;
                series = option.series;

                _buildShape();
            }

            /**
             * 绘制图形
             */
            function _buildShape() {
                for (var i = 0; i < polar.length; i ++) {

                    self.reformOption(polar[i]);

                    _queryTarget = [polar[i], option];
                    _createVector(i);
                    _buildSpiderWeb(i);

                    _buildText(i);

                    _adjustIndicatorValue(i);
                    _addAxisLabel(i);
                }

                for (var i = 0; i < self.shapeList.length; i ++) {
                    self.shapeList[i].id = zr.newShapeId(self.type);
                    zr.addShape(self.shapeList[i]);
                }
            }

            /**
             * 生成蜘蛛网顶点坐标
             * @param {number} polar的index
             */
            function _createVector(index) {
                var item = polar[index];
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var length = indicator.length;
                var startAngle = item.startAngle ;
                var dStep = 2 * Math.PI / length;
                var radius = item.radius;
                var __ecIndicator = item.__ecIndicator = [];
                var vector;

                if (typeof radius != 'number') {
                    radius = Math.floor(
                        Math.min(_width, _height) / 2 - 50
                    );
                }               

                for (var i = 0 ;i < length ; i ++) {
                    vector = ecCoordinates.polar2cartesian(
                        radius, startAngle * Math.PI / 180 + dStep * i
                    );
                    __ecIndicator.push({
                        // 将图形翻转
                        vector : [vector[1], -vector[0]]
                    });
                }
            }

            /**
             * 构建蜘蛛网
             * @param {number} polar的index
             */
            function _buildSpiderWeb(index) {
                var item = polar[index];
                var __ecIndicator = item.__ecIndicator;
                var splitArea = item.splitArea;
                var splitLine = item.splitLine;

                var center = item.center;
                var splitNumber = item.splitNumber;

                var strokeColor = splitLine.lineStyle.color;
                var lineWidth = splitLine.lineStyle.width;
                var show = splitLine.show;

                var axisLine = self.deepQuery(_queryTarget, 'axisLine');

                _addArea(
                    __ecIndicator, splitNumber, center, 
                    splitArea, strokeColor, lineWidth, show
                );
                
                _addLine(
                    __ecIndicator, center, axisLine
                );
            }

            /**
             * 绘制axisLabel
             */
            function _addAxisLabel(index) {
                var item = polar[index];
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var __ecIndicator = item.__ecIndicator;
                var axisLabel;
                var vector;
                var style;
                var newStyle;
                var splitNumber = self.deepQuery(_queryTarget, 'splitNumber');
                var center = item.center;
                var vector;
                var value;
                var text;
                var theta;
                // var startAngle = self.deepQuery(_queryTarget, 'startAngle');
                var offset;
                var precision = self.deepQuery(_queryTarget, 'precision');

                for (var i = 0; i < indicator.length; i ++) {
                    axisLabel = self.deepQuery([indicator[i], item, option],
                        'axisLabel');

                    if (axisLabel.show) {
                        style = {};
                        style.styleFont = self.getFont();
                        style = zrUtil.merge(style, axisLabel);
                        style.lineWidth = style.width;

                        vector = __ecIndicator[i].vector;
                        value = __ecIndicator[i].value;
                        theta = i / indicator.length * 2 * Math.PI;
                        offset = axisLabel.offset || 10;

                        for (var j = 1 ; j <= splitNumber; j ++) {
                            newStyle = zrUtil.merge({}, style);
                            text = 
                                j * (value.max - value.min) / splitNumber
                                    + value.min;
                            if (precision) {
                                text  = text.toFixed(precision);
                            }
                            newStyle.text = text;
                            newStyle.x = j * vector[0] / splitNumber 
                                         + Math.cos(theta) * offset + center[0];
                            newStyle.y = j * vector[1] / splitNumber
                                         + Math.sin(theta) * offset + center[1];

                            self.shapeList.push({
                                shape : 'text',
                                style : newStyle,
                                draggable : false,
                                hoverable : false
                            });
                        }
                    }
                }
            }

            /**
             * 绘制坐标头的文字
             * @param {number} polar的index
             */
            function _buildText (index) {
                var item = polar[index];
                var __ecIndicator = item.__ecIndicator;
                var vector;
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var center = item.center;
                var style;
                var textAlign;
                var name;
                var rotation;
                var x = 0;
                var y = 0;
                var margin;
                var textStyle;

                for (var i = 0; i < indicator.length; i ++) {
                    name = self.deepQuery(
                        [indicator[i], item, option], 'name'
                    );

                    if (!name.show) {
                        continue;
                    } 
                    textStyle = self.deepQuery([name, item, option], 
                        'textStyle');

                    style = {};

                    style.styleFont = self.getFont(textStyle);
                    
                    if (typeof name.formatter != 'function') {
                        style.text = indicator[i].text;
                    }
                    else {
                        style.text = name.formatter(i, indicator[i].text);
                    }
                    
                    vector = __ecIndicator[i].vector;

                    if (Math.round(vector[0]) > 0) {
                        textAlign = 'left';
                    }
                    else if (Math.round(vector[0]) < 0) {
                        textAlign = 'right';
                    }
                    else {
                        textAlign = 'center';
                    }

                    if (!name.margin) {
                        vector = _mapVector(vector, center, 1.2);
                    }
                    else {
                        margin = name.margin;
                        x = vector[0] > 0 ? margin : - margin;
                        y = vector[1] > 0 ? margin : - margin;

                        x = vector[0] === 0 ? 0 : x;
                        y = vector[1] === 0 ? 0 : y;
                        vector = _mapVector(vector, center, 1); 
                    }
                    
                    
                    style.textAlign = textAlign;
                    style.x = vector[0] + x;
                    style.y = vector[1] + y;

                    if (name.rotate) {
                        rotation = [
                            name.rotate / 180 * Math.PI, 
                            vector[0], vector[1]
                        ];
                    }
                    
                    self.shapeList.push({
                        shape : 'text',
                        style : style,
                        draggable : false,
                        hoverable : false,
                        rotation : rotation
                    });
                }
            }

            /**
             * 添加一个隐形的盒子 当做drop的容器 暴露给外部的图形类使用
             * @param {number} polar的index
             * @return {Object} 添加的盒子图形 
             */
            function _addDropBox(index) {
                var index = index || 0;
                var item = polar[index];
                var center = item.center;
                var __ecIndicator = item.__ecIndicator;
                var len = __ecIndicator.length;
                var pointList = [];
                var vector;
                var shape;

                for (var i = 0; i < len; i ++) {
                    vector = __ecIndicator[i].vector;
                    pointList.push(_mapVector(vector, center, 1.2));
                }
                
                shape = _getShape(
                    pointList, 'fill', 'rgba(0,0,0,0)', '', 1
                );
                return shape;
            }

            /**
             * 绘制蜘蛛网的正n变形
             *
             * @param {Array<Object>} 指标数组
             * @param {number} 分割线数量
             * @param {Array<number>} 中点坐标
             * @param {Object} 分割区域对象
             * @param {string} 线条颜色
             * @param {number} 线条宽度
             */ 
            function _addArea(
                __ecIndicator, splitNumber, center,
                splitArea, strokeColor, lineWidth, show
            ) {
                var shape;
                var scale;
                var scale1;
                var pointList;

                for (var i = 0; i < splitNumber ; i ++ ) {
                    scale = (splitNumber - i) / splitNumber;
                    pointList = _getPointList(__ecIndicator, scale, center);
                    
                    if (show) {
                        shape = _getShape(
                            pointList, 'stroke', '', strokeColor, lineWidth
                        );
                        self.shapeList.push(shape);
                    }

                    if (splitArea.show) {
                        scale1 = (splitNumber - i - 1) / splitNumber;
                        _addSplitArea(
                            __ecIndicator, splitArea, scale, scale1, center, i
                        ); 
                    }  
                }
            }

            /**
             * 获取需要绘制的多边形的点集
             * @param {Object} serie的指标参数
             * @param {number} 缩小的系数
             * @param {Array<number>} 中点坐标
             *
             * @return {Array<Array<number>>} 返回绘制的点集
             */
            function _getPointList(__ecIndicator, scale, center) {
                var pointList = [];
                var len = __ecIndicator.length;
                var vector;

                for (var i = 0 ; i < len ; i ++ ) {
                    vector = __ecIndicator[i].vector;
                    
                    pointList.push(_mapVector(vector, center, scale));
                }
                return pointList;
            }

            /**
             * 获取绘制的图形
             * @param {Array<Array<number>>} 绘制的点集
             * @param {string} 绘制方式 stroke | fill | both 描边 | 填充 | 描边 + 填充
             * @param {string} 颜色
             * @param {string} 描边颜色
             * @param {number} 线条宽度
             * @param {boolean=} hoverable
             * @param {boolean=} draggable
             * @return {Object} 绘制的图形对象
             */ 
            function _getShape(
                pointList, brushType, color, strokeColor, lineWidth, 
                hoverable, draggable
            ) {
                return {
                    shape : 'polygon',
                    style : {
                        pointList   : pointList,
                        brushType   : brushType,
                        color       : color,
                        strokeColor : strokeColor,
                        lineWidth   : lineWidth
                    },
                    hoverable : hoverable || false,
                    draggable : draggable || false
                };
            }

            /**
             * 绘制填充区域
             */
            function _addSplitArea(
                __ecIndicator, splitArea, scale, scale1, center, colorInd
            ) {
                var indLen = __ecIndicator.length;
                var color;
                var colorArr = splitArea.areaStyle.color;
                var colorLen;

                var vector;
                var vector1;
                var pointList = [];
                var indLen = __ecIndicator.length;
                var shape;
                
                if (typeof colorArr == 'string') {
                    colorArr = [colorArr];
                }
                colorLen = colorArr.length;
                color = colorArr[ colorInd % colorLen];

                for (var i = 0; i < indLen ; i ++) {
                    pointList = [];
                    vector = __ecIndicator[i].vector;
                    vector1 = __ecIndicator[(i + 1) % indLen].vector;

                    pointList.push(_mapVector(vector, center, scale));
                    pointList.push(_mapVector(vector, center, scale1));
                    pointList.push(_mapVector(vector1, center, scale1));
                    pointList.push(_mapVector(vector1, center, scale));

                    shape = _getShape(
                        pointList, 'fill', color, '', 1
                    );
                    self.shapeList.push(shape);
                }
                
            }

            /**
             * 转换坐标
             *
             * @param {Array<number>} 原始坐标
             * @param {Array<number>} 中点坐标
             * @param {number} 缩小的倍数
             *
             * @return {Array<number>} 转换后的坐标
             */
            function _mapVector(vector, center, scale) {
                return [
                    vector[0] * scale + center[0],
                    vector[1] * scale + center[1]
                ];
            }

            /**
             * 获取中心点位置 暴露给外部图形类使用
             * @param {number} polar的index
             */
            function getCenter(index) {
                var index = index || 0;
                return polar[index].center;
            }

            /**
             * 绘制从中点出发的线
             * 
             * @param {Array<Object>} 指标对象
             * @param {Array<number>} 中点坐标
             * @param {string} 线条颜色
             * @param {number} 线条宽度
             * @param {string} 线条绘制类型 
             *              solid | dotted | dashed 实线 | 点线 | 虚线
             */
            function _addLine(
                __ecIndicator, center, axisLine
            ) {
                var indLen = __ecIndicator.length;
                var line;
                var vector;
                var lineStyle = axisLine.lineStyle;
                var strokeColor = lineStyle.color;
                var lineWidth = lineStyle.width;
                var lineType = lineStyle.type;

                for (var i = 0; i < indLen ; i ++ ) {
                    vector = __ecIndicator[i].vector;
                    line = _getLine(
                        center[0], center[1],
                        vector[0] + center[0], 
                        vector[1] + center[1],
                        strokeColor, lineWidth, lineType
                    );
                    self.shapeList.push(line);
                }
            }

            /** 
             * 获取线条对象
             * @param {number} 出发点横坐标
             * @param {number} 出发点纵坐标
             * @param {number} 终点横坐标
             * @param {number} 终点纵坐标
             * @param {string} 线条颜色
             * @param {number} 线条宽度
             * @param {string} 线条类型
             *
             * @return {Object} 线条对象
             */
            function _getLine(
                xStart, yStart, xEnd, yEnd, strokeColor, lineWidth, lineType
            ) {
                return {
                    shape : 'line',
                    style : {
                        xStart : xStart,
                        yStart : yStart,
                        xEnd   : xEnd,
                        yEnd   : yEnd,
                        strokeColor : strokeColor,
                        lineWidth   : lineWidth,
                        lineType    : lineType
                    },
                    hoverable : false
                };
            }

            /**
             * 调整指标的值，当indicator中存在max时设置为固定值
             * @param {number} polar的index
             */
            function _adjustIndicatorValue(index) {
                var item = polar[index];
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var len = indicator.length;
                var __ecIndicator = item.__ecIndicator;
                var value;
                var max;
                var min;
                var data = _getSeriesData(index);
                var splitNumber = item.splitNumber;

                var boundaryGap = self.deepQuery(_queryTarget, 'boundaryGap');
                var precision = self.deepQuery(_queryTarget, 'precision');
                var power = self.deepQuery(_queryTarget, 'power');
                var scale = self.deepQuery(_queryTarget, 'scale');

                for (var i = 0; i < len ; i ++ ) {
                    if (typeof indicator[i].max == 'number') {
                        max = indicator[i].max;
                        min = indicator[i].min || 0;
                        value = {
                            max : max,
                            min : min
                        };
                    }
                    else {
                        value = _findValue(
                            data, i, splitNumber,
                            boundaryGap, precision, power, scale
                        );
                    }

                    __ecIndicator[i].value = value;
                }
            }

            /**
             * 将series中的数据拿出来，如果没有polarIndex属性，默认为零
             * @param {number} polar 的index
             * @param {Array<Object>} 需要处理的数据
             */
            function _getSeriesData(index) {
                var data = [];
                var serie;
                var serieData;
                var legend = component.legend;

                for (var i = 0; i < series.length; i ++) {
                    serie = series[i];
                    serieData = serie.data || [];
                    for (var j = 0; j < serieData.length; j ++) {
                        polarIndex = self.deepQuery(
                            [serieData[j], serie, option], 'polarIndex'
                        ) || 0;
                        if (polarIndex == index
                            && (!legend || legend.isSelected(serieData[j].name))
                        ) {
                            data.push(serieData[j]);
                        }
                    }
                }
                return data;
            }

            /**
             * 查找指标合适的值
             *
             * 如果只有一组数据以数据中的最大值作为最大值 0为最小值
             * 如果是多组，使用同一维度的进行比较 选出最大值最小值 
             * 对它们进行处理  
             * @param {Object} serie 的 data
             * @param {number} 指标的序号
             * @param {boolean} boundaryGap 两端留白
             * @param {number} precision 小数精度
             * @param {number} power 整数精度
             * @return {Object} 指标的最大值最小值
             */ 
            function _findValue(
                data, index, splitNumber, boundaryGap, precision, power, scale
            ) {
                var max;
                var min;
                var value;
                var delta;
                var str;
                var len = 0;
                var max0;
                var min0;
                var one;

                if (!data || data.length === 0) {
                    return;
                }

                function _compare(item) {         
                    (item > max || max === undefined) && (max = item);
                    (item < min || min === undefined) && (min = item);
                }

                if (data.length == 1) {
                    min = 0;
                }
                if (data.length != 1) {
                    for (var i = 0; i < data.length; i ++) {
                        value = data[i].value[index];
                        _compare(value);
                    }
                }
                else {
                    one = data[0];
                    for (var i = 0; i < one.value.length; i ++) {
                        _compare(one.value[i]);
                    }
                }

                if (data.length != 1) {
                    if (scale) {
                        delta = _getDelta(
                            max, min, splitNumber, precision, power
                        );

                        if (delta >= 1) {
                            min = Math.floor(min / delta) * delta - delta;
                        }
                        else if (delta === 0) {
                            if (max > 0) {
                                min0 = 0;
                                max0 = 2 * max;
                            }
                            else if (max === 0) {
                                min0 = 0;
                                max0 = 100;
                            }
                            else {
                                max0 = 0;
                                min0 = 2 * min;
                            }

                            return {
                                max : max0,
                                min : min0
                            };
                        }
                        else {
                            str = (delta + '').split('.')[1];
                            len = str.length;
                            min = Math.floor(
                                    min * Math.pow(10, len)) / Math.pow(10, len
                                  ) - delta;
                        }

                        if (Math.abs(min) <= delta) {
                            min = 0;
                        }
                        
                        max = min + Math.floor(delta * Math.pow(10, len) 
                            * (splitNumber + 1)) / Math.pow(10, len) ;
                    }
                    else {
                        min = min > 0 ? 0 : min;
                    }
                }

                if (boundaryGap) {
                    max = max > 0 ? max * 1.2 : max * 0.8;
                    min = min > 0 ? min * 0.8 : min * 1.2;
                }

                return {
                    max : max,
                    min : min
                };
            }

            /**
             * 获取最大值与最小值中间比较合适的差值
             * @param {number} max;
             * @param {number} min
             * @param {number} precision 小数精度
             * @param {number} power 整数精度
             * @return {number} delta
             */
            function _getDelta(max , min, splitNumber, precision, power) {
                var delta = (max - min) / splitNumber;
                var str;
                var n;

                if (delta > 1) {
                    if (!power) {
                        str = (delta + '').split('.')[0];
                        n = str.length;
                        if (str[0] >= 5) {
                            return Math.pow(10, n);
                        }
                        else {
                            return (str[0] - 0 + 1 ) * Math.pow(10, n - 1);
                        }
                    }
                    else {
                        delta = Math.ceil(delta);
                        if (delta % power > 0) {
                            return (Math.ceil(delta / power) + 1) * power;
                        }
                        else {
                            return delta;
                        }
                    }
                }
                else if (delta == 1) {
                    return 1;
                }
                else if (delta === 0) {
                    return 0;
                } 
                else {
                    if (!precision) {
                        str = (delta + '').split('.')[1];
                        n = 0;
                        while (str[n] == '0') {
                            n ++ ;
                        }

                        if (str[n] >= 5) {
                            return '0.' + str.substring(0, n + 1) - 0 
                                + 1 / Math.pow(10, n);
                        }
                        else {
                            return '0.' + str.substring(0, n + 1) - 0 
                                + 1 / Math.pow(10, n + 1);
                        }
                    } 
                    else {
                        return Math.ceil(delta * Math.pow(10, precision)) 
                            / Math.pow(10, precision);
                    }
                }
            }

            function reformOption(opt) {
                // 常用方法快捷方式
                var _merge = zrUtil.merge;
                opt = _merge(
                          opt || {},
                          ecConfig.polar,
                          {
                              'overwrite' : false,
                              'recursive' : true
                          }
                      );

                // 圆心坐标，无则为自适应居中
                if (!opt.center 
                    || (opt.center && !(opt.center instanceof Array))) {
                    opt.center = [
                        Math.round(zr.getWidth() / 2),
                        Math.round(zr.getHeight() / 2)
                    ];
                }
                else {
                    if (typeof opt.center[0] == 'undefined') {
                        opt.center[0] = Math.round(zr.getWidth() / 2);
                    }
                    if (typeof opt.center[1] == 'undefined') {
                        opt.center[1] = Math.round(zr.getHeight() / 2);
                    }
                }

                if (!opt.radius) {
                    opt.radius = Math.floor(
                        Math.min(_width, _height) / 2 - 50
                    );
                }

                return opt;
            }

            /**
             * 获取每个指标上某个value对应的坐标
             * @param {number} polarIndex
             * @param {number} indicatorIndex 
             * @param {number} value
             * @return {Array<number>} 对应坐标
             */
            function getVector(polarIndex, indicatorIndex, value) {
                polarIndex = polarIndex || 0;
                indicatorIndex = indicatorIndex || 0;
                var __ecIndicator = polar[polarIndex].__ecIndicator;

                if (indicatorIndex >= __ecIndicator.length) {
                    return ;
                }

                var indicator = polar[polarIndex].__ecIndicator[indicatorIndex];
                var center = polar[polarIndex].center;
                var vector = indicator.vector;
                var max = indicator.value.max;
                var min = indicator.value.min;
                var alpha;

                if (typeof value != 'number') {
                    return center;
                }
                else {
                    if ( max != min) {
                        alpha = (value - min) / (max - min);
                    }
                    else {
                        alpha = 0.5;
                    }
                    
                    return _mapVector(vector, center, alpha);
                }
            }

            /**
             * 判断一个点是否在网内
             * @param {Array<number>} 坐标
             * @return {number} 返回polarindex  返回-1表示不在任何polar
             */ 
            function isInside(vector) {
                var polar = getNearestIndex(vector);

                if (polar) {
                    return polar.polarIndex;
                }
                return -1;
            }

            /**
             * 如果一个点在网内，返回离它最近的数据轴的index
             * @param {Array<number>} 坐标
             * @return {Object} | false
             *      polarIndex 
             *      valueIndex
             */
            function getNearestIndex(vector) {
                var item;
                var center;
                var radius;
                var polarVector;
                var startAngle;
                var indicator;
                var len;
                var angle;
                var finalAngle;
                for (var i = 0 ; i < polar.length; i ++) {
                    item = polar[i];
                    center = getCenter(i);
                    if (vector[0] == center[0] && vector[1] == center[1]) {
                        return {
                            polarIndex : i,
                            valueIndex : 0
                        };
                    }
                    radius = self.deepQuery([item, option], 'radius');
                    startAngle = item.startAngle;
                    indicator = item.indicator;
                    len = indicator.length;
                    angle = 2 * Math.PI / len; 
                    // 注意y轴的翻转
                    polarVector = ecCoordinates.cartesian2polar(
                        vector[0] - center[0], center[1] - vector[1]  
                    );
                    if (vector[0] - center[0] < 0) {
                        polarVector[1] += Math.PI;
                    }
                    if (polarVector[1] < 0) {
                        polarVector[1] += 2 * Math.PI;
                    }


                    // 减去startAngle的偏移量 再加2PI变成正数
                    finalAngle = polarVector[1] - 
                        startAngle / 180 * Math.PI + Math.PI * 2;

                    if (Math.abs(Math.cos(finalAngle % (angle / 2))) * radius
                        > polarVector[0]) 
                    {
                        return {
                            polarIndex : i,
                            valueIndex : Math.floor(
                                (finalAngle + angle / 2 ) / angle
                                ) % len
                        };
                    }
                }
            }

            /**
             * 获取指标信息 
             * @param {number} polarIndex
             * @return {Array<Object>} indicator
             */
            function getIndicator(index) {
                var index = index || 0;
                return polar[index].indicator;
            } 

            /**
             * 刷新
             */
            function refresh() {
                self.clear();
                _buildShape();
            }

            self.refresh = refresh;
            self.reformOption = reformOption;
            self.getVector = getVector;

            self.getDropBox = _addDropBox;
            self.getCenter = getCenter;
            self.getIndicator = getIndicator;

            self.isInside = isInside;
            self.getNearestIndex = getNearestIndex;

            init(option, component);
        }

        require('../component').define('polar', Polar);
     
        return Polar;
    }
);
/*!
 * ECharts, a javascript interactive chart library.
 *  
 * Copyright (c) 2013, Baidu Inc.
 * All rights reserved.
 * 
 * Redistribution and use of this software in source and binary forms, with or 
 * without modification, are permitted provided that the following conditions 
 * are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this 
 * list of conditions and the following disclaimer.
 * 
 * Redistributions in binary form must reproduce the above copyright notice, 
 * this list of conditions and the following disclaimer in the documentation 
 * and/or other materials provided with the distribution.
 * 
 * Neither the name of Baidu Inc. nor the names of its contributors may be used
 * to endorse or promote products derived from this software without specific 
 * prior written permission of Baidu Inc.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 * POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * echarts
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/echarts',['require','./config','zrender','zrender/tool/util','zrender/tool/event','zrender/config','./util/shape/icon','./chart','./chart/island','./component','./component/title','./component/axis','./component/categoryAxis','./component/valueAxis','./component/grid','./component/dataZoom','./component/legend','./component/dataRange','./component/tooltip','./component/toolbox','./component/dataView','./component/polar','./util/ecData','./chart','./component','zrender/tool/util','zrender/tool/util','zrender/tool/util','zrender/tool/color','zrender/tool/util','zrender/tool/util'],function(require) {
    var self = {};
    /**
     * 入口方法 
     */
    self.init = function(dom, libOption) {
        libOption = libOption || {type : 'canvas'};
        if (libOption.type == 'canvas') {
            return new Echarts(dom);
        }
        else if (libOption.type == 'flash') {
            alert('未配置');
        }
    };

    /**
     * 基于zrender实现Echarts接口层
     * @param {HtmlElement} dom 必要
     * @param {Object} option 可选参数，同setOption
     */
    function Echarts(dom, option) {
        var ecConfig = require('./config');

        var self = this;
        var _zr;
        var _option;
        var _optionBackup;          // for各种change和zoom
        var _optionRestore;         // for restore;
        var _chartList;             // 图表实例
        var _messageCenter;         // Echarts层的消息中心，做zrender原始事件转换

        var _status = {         // 用于图表间通信
            dragIn : false,
            dragOut : false,
            needRefresh : false
        };

        var _selectedMap;
        var _island;
        var _toolbox;
        
        var _refreshInside;     // 内部刷新标志位

        // 初始化::构造函数
        _init();
        function _init() {
            var zrender = require('zrender');
            _zr = zrender.init(dom);

            var zrUtil = require('zrender/tool/util');
            _option = zrUtil.clone(option || {});

            _chartList = [];            // 图表实例

            _messageCenter = {};        // Echarts层的消息中心，做zrender原始事件转换
            // 添加消息中心的事件分发器特性
            var zrEvent = require('zrender/tool/event');
            zrEvent.Dispatcher.call(_messageCenter);
            _messageCenter.bind(
                ecConfig.EVENT.LEGEND_SELECTED, _onlegendSelected
            );
            _messageCenter.bind(
                ecConfig.EVENT.DATA_ZOOM, _ondataZoom
            );
            _messageCenter.bind(
                ecConfig.EVENT.DATA_RANGE, _ondataRange
            );
            _messageCenter.bind(
                ecConfig.EVENT.MAGIC_TYPE_CHANGED, _onmagicTypeChanged
            );
            _messageCenter.bind(
                ecConfig.EVENT.DATA_VIEW_CHANGED, _ondataViewChanged
            );
            _messageCenter.bind(
                ecConfig.EVENT.RESTORE, _onrestore
            );
            _messageCenter.bind(
                ecConfig.EVENT.REFRESH, _onrefresh
            );

            var zrConfig = require('zrender/config');
            _zr.on(zrConfig.EVENT.CLICK, _onclick);
            _zr.on(zrConfig.EVENT.MOUSEOVER, _onhover);
            _zr.on(zrConfig.EVENT.MOUSEWHEEL, _onmousewheel);
            _zr.on(zrConfig.EVENT.DRAGSTART, _ondragstart);
            _zr.on(zrConfig.EVENT.DRAGEND, _ondragend);
            _zr.on(zrConfig.EVENT.DRAGENTER, _ondragenter);
            _zr.on(zrConfig.EVENT.DRAGOVER, _ondragover);
            _zr.on(zrConfig.EVENT.DRAGLEAVE, _ondragleave);
            _zr.on(zrConfig.EVENT.DROP, _ondrop);

            // 动态扩展zrender shape：icon
            require('./util/shape/icon');

            // 内置图表注册
            var chartLibrary = require('./chart');
            require('./chart/island');
            // 孤岛
            var Island = chartLibrary.get('island');
            _island = new Island(_messageCenter, _zr);
            
            // 内置组件注册
            var componentLibrary = require('./component');
            require('./component/title');
            require('./component/axis');
            require('./component/categoryAxis');
            require('./component/valueAxis');
            require('./component/grid');
            require('./component/dataZoom');
            require('./component/legend');
            require('./component/dataRange');
            require('./component/tooltip');
            require('./component/toolbox');
            require('./component/dataView');
            require('./component/polar');
            // 工具箱
            var Toolbox = componentLibrary.get('toolbox');
            _toolbox = new Toolbox(_messageCenter, _zr, dom);
        }

        /**
         * 点击事件，响应zrender事件，包装后分发到Echarts层
         */
        function _onclick(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].onclick
                && _chartList[len].onclick(param);
            }
            if (param.target) {
                var ecData = _eventPackage(param.target);
                if (ecData && typeof ecData.seriesIndex != 'undefined') {
                    _messageCenter.dispatch(
                        ecConfig.EVENT.CLICK,
                        param.event,
                        ecData
                    );
                }
            }
        }

         /**
         * 悬浮事件，响应zrender事件，包装后分发到Echarts层
         */
        function _onhover(param) {
            if (param.target) {
                var ecData = _eventPackage(param.target);
                if (ecData && typeof ecData.seriesIndex != 'undefined') {
                    _messageCenter.dispatch(
                        ecConfig.EVENT.HOVER,
                        param.event,
                        ecData
                    );
                }
            }
        }

        /**
         * 滚轮回调，孤岛可计算特性
         */
        function _onmousewheel(param) {
            _messageCenter.dispatch(
                ecConfig.EVENT.MOUSEWHEEL,
                param.event,
                _eventPackage(param.target)
            );
        }

        /**
         * dragstart回调，可计算特性实现
         */
        function _ondragstart(param) {
            // 复位用于图表间通信拖拽标识
            _status = {
                dragIn : false,
                dragOut : false,
                needRefresh : false
            };
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragstart
                && _chartList[len].ondragstart(param);
            }

        }

        /**
         * dragging回调，可计算特性实现
         */
        function _ondragenter(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragenter
                && _chartList[len].ondragenter(param);
            }
        }

        /**
         * dragstart回调，可计算特性实现
         */
        function _ondragover(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragover
                && _chartList[len].ondragover(param);
            }
        }
        /**
         * dragstart回调，可计算特性实现
         */
        function _ondragleave(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragleave
                && _chartList[len].ondragleave(param);
            }
        }

        /**
         * dragstart回调，可计算特性实现
         */
        function _ondrop(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondrop
                && _chartList[len].ondrop(param, _status);
            }
            _island.ondrop(param, _status);
        }

        /**
         * dragdone回调 ，可计算特性实现
         */
        function _ondragend(param) {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondragend
                && _chartList[len].ondragend(param, _status);
            }
            _island.ondragend(param, _status);

            // 发生过重计算
            if (_status.needRefresh) {
                _syncBackupData(_island.getOption());
                _messageCenter.dispatch(
                    ecConfig.EVENT.DATA_CHANGED,
                    param.event,
                    _eventPackage(param.target)
                );
                _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        }

        /**
         * 图例选择响应
         */
        function _onlegendSelected(param) {
            // 用于图表间通信
            _status.needRefresh = false;
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].onlegendSelected
                && _chartList[len].onlegendSelected(param, _status);
            }
            
            _selectedMap = param.selected;

            if (_status.needRefresh) {
                _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        }

        /**
         * 数据区域缩放响应 
         */
        function _ondataZoom(param) {
            // 用于图表间通信
            _status.needRefresh = false;
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondataZoom
                && _chartList[len].ondataZoom(param, _status);
            }

            if (_status.needRefresh) {
                _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
            }
        }

        /**
         * 值域漫游响应 
         */
        function _ondataRange(param) {
            // 用于图表间通信
            _status.needRefresh = false;
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].ondataRange
                && _chartList[len].ondataRange(param, _status);
            }

            // 没有相互影响，直接刷新即可
            if (_status.needRefresh) {
                _zr.refresh();
            }
        }

        /**
         * 动态类型切换响应 
         */
        function _onmagicTypeChanged() {
            _render(_getMagicOption());
        }

        /**
         * 数据视图修改响应 
         */
        function _ondataViewChanged(param) {
            _syncBackupData(param.option);
            _messageCenter.dispatch(
                ecConfig.EVENT.DATA_CHANGED,
                null,
                param
            );
            _messageCenter.dispatch(ecConfig.EVENT.REFRESH);
        }

        /**
         * 还原 
         */
        function _onrestore() {
            self.restore();
        }

        /**
         * 刷新 
         */
        function _onrefresh(param) {
            _refreshInside = true;
            self.refresh(param);
            _refreshInside = false;
        }

        /**
         * 当前正在使用的option，还原可能存在的dataZoom
         */
        function _getMagicOption(targetOption) {
            var magicOption = targetOption || _toolbox.getMagicOption();
            var len;
            // 横轴数据还原
            if (_optionBackup.xAxis) {
                if (_optionBackup.xAxis instanceof Array) {
                    len = _optionBackup.xAxis.length;
                    while (len--) {
                        magicOption.xAxis[len].data =
                            _optionBackup.xAxis[len].data;
                    }
                }
                else {
                    magicOption.xAxis.data = _optionBackup.xAxis.data;
                }
            }
            
            // 纵轴数据还原
            if (_optionBackup.yAxis) {
                if (_optionBackup.yAxis instanceof Array) {
                    len = _optionBackup.yAxis.length;
                    while (len--) {
                        magicOption.yAxis[len].data =
                            _optionBackup.yAxis[len].data;
                    }
                }
                else {
                    magicOption.yAxis.data = _optionBackup.yAxis.data;
                }
            }

            // 系列数据还原
            len = magicOption.series.length;
            while (len--) {
                magicOption.series[len].data = _optionBackup.series[len].data;
            }
            
            return magicOption;
        }
        
        /**
         * 数据修改后的反向同步备份数据 
         */
        function _syncBackupData(curOption) {
            if ((curOption.dataZoom && curOption.dataZoom.show)
                || (curOption.toolbox
                    && curOption.toolbox.show
                    && curOption.toolbox.feature
                    && curOption.toolbox.feature.dataZoom
                )
            ) {
                // 有dataZoom就dataZoom做同步
                for (var i = 0, l = _chartList.length; i < l; i++) {
                    if (_chartList[i].type == ecConfig.COMPONENT_TYPE_DATAZOOM
                    ) {
                        _chartList[i].syncBackupData(curOption, _optionBackup);
                        return;
                    }
                }
            }
            
            // 没有就ECharts做
            var curSeries = curOption.series;
            var curData;
            for (var i = 0, l = curSeries.length; i < l; i++) {
                curData = curSeries[i].data;
                for (var j = 0, k = curData.length; j < k; j++) {
                    _optionBackup.series[i].data[j] = curData[j];
                }
            }
        }

        /**
         * 打包Echarts层的事件附件
         */
        function _eventPackage(target) {
            if (target) {
                var ecData = require('./util/ecData');
                return {
                    seriesIndex : ecData.get(target, 'seriesIndex'),
                    dataIndex : ecData.get(target, 'dataIndex')
                };
            }
            return;
        }

        /**
         * 图表渲染 
         */
        function _render(magicOption) {
            _disposeChartList();
            _zr.clear();

            var chartLibrary = require('./chart');
            var componentLibrary = require('./component');

            // 标题
            var title;
            if (magicOption.title) {
                var Title = new componentLibrary.get('title');
                title = new Title(
                    _messageCenter, _zr, magicOption
                );
                _chartList.push(title);
            }

            // 提示
            var tooltip;
            if (magicOption.tooltip) {
                var Tooltip = componentLibrary.get('tooltip');
                tooltip = new Tooltip(_messageCenter, _zr, magicOption, dom);
                _chartList.push(tooltip);
            }

            // 图例
            var legend;
            if (magicOption.legend) {
                var Legend = new componentLibrary.get('legend');
                legend = new Legend(
                    _messageCenter, _zr, magicOption, _selectedMap
                );
                _chartList.push(legend);
            }

            // 值域控件
            var dataRange;
            if (magicOption.dataRange) {
                var DataRange = new componentLibrary.get('dataRange');
                dataRange = new DataRange(
                    _messageCenter, _zr, magicOption
                );
                _chartList.push(dataRange);
            }

            // 直角坐标系
            var grid;
            var dataZoom;
            var xAxis;
            var yAxis;
            if (magicOption.grid || magicOption.xAxis || magicOption.yAxis) {
                var Grid = componentLibrary.get('grid');
                grid = new Grid(_messageCenter, _zr, magicOption);
                _chartList.push(grid);

                var DataZoom = componentLibrary.get('dataZoom');
                dataZoom = new DataZoom(
                    _messageCenter,
                    _zr,
                    magicOption,
                    {
                        'legend' : legend,
                        'grid' : grid
                    }
                );
                _chartList.push(dataZoom);

                var Axis = componentLibrary.get('axis');
                xAxis = new Axis(
                    _messageCenter,
                    _zr,
                    magicOption,
                    {
                        'legend' : legend,
                        'grid' : grid
                    },
                    'xAxis'
                );
                _chartList.push(xAxis);

                yAxis = new Axis(
                    _messageCenter,
                    _zr,
                    magicOption,
                    {
                        'legend' : legend,
                        'grid' : grid
                    },
                    'yAxis'
                );
                _chartList.push(yAxis);
            }

            // 极坐标系
            var polar;
            if (magicOption.polar) {
                var Polar = componentLibrary.get('polar');
                polar = new Polar(
                    _messageCenter,
                    _zr,
                    magicOption,
                    {
                        'legend' : legend
                    }
                );
                _chartList.push(polar);
            }
            
            tooltip && tooltip.setComponent({
                'grid' : grid,
                'xAxis' : xAxis,
                'yAxis' : yAxis,
                'polar' : polar
            });

            var ChartClass;
            var chartType;
            var chart;
            var chartMap = {};      // 记录已经初始化的图表
            for (var i = 0, l = magicOption.series.length; i < l; i++) {
                chartType = magicOption.series[i].type;
                if (!chartType) {
                    continue;
                }
                if (!chartMap[chartType]) {
                    chartMap[chartType] = true;
                    ChartClass = chartLibrary.get(chartType);
                    if (ChartClass) {
                        chart = new ChartClass(
                            _messageCenter,
                            _zr,
                            magicOption,
                            {
                                'tooltip' : tooltip,
                                'legend' : legend,
                                'dataRange' : dataRange,
                                'grid' : grid,
                                'xAxis' : xAxis,
                                'yAxis' : yAxis,
                                'polar' : polar
                            }
                        );
                        _chartList.push(chart);
                    }
                }
            }

            _island.render(magicOption);

            _toolbox.render(magicOption, {dataZoom: dataZoom});

            if (magicOption.animation) {
                var len = _chartList.length;
                while (len--) {
                    _chartList[len]
                    && _chartList[len].animation
                    && _chartList[len].animation();
                }
            }

            _zr.render();
        }

        /**
         * 还原 
         */
        function restore() {
            var zrUtil = require('zrender/tool/util');
            if (_optionRestore.legend && _optionRestore.legend.selected) {
                _selectedMap = _optionRestore.legend.selected;
            }
            else {
                _selectedMap = {};
            }
            _optionBackup = zrUtil.clone(_optionRestore);
            _option = zrUtil.clone(_optionRestore);
            _island.clear();
            _toolbox.reset(_option);
            _render(_option);
        }

        /**
         * 刷新 
         * @param {Object=} param，可选参数，用于附带option，内部同步用，外部不建议带入数据修改，无法同步 
         */
        function refresh(param) {
            param = param || {};
            var magicOption = param.option;
            
            // 外部调用的refresh且有option带入
            if (!_refreshInside && param.option) {
                // 做简单的差异合并去同步内部持有的数据克隆，不建议带入数据
                // 开启数据区域缩放、拖拽重计算、数据视图可编辑模式情况下，当用户产生了数据变化后无法同步
                // 如有带入option存在数据变化，请重新setOption
                var zrUtil = require('zrender/tool/util');
                if (_optionBackup.toolbox
                    && _optionBackup.toolbox.show
                    && _optionBackup.toolbox.feature.magicType
                    && _optionBackup.toolbox.feature.magicType.length > 0
                ) {
                    magicOption = _getMagicOption();
                }
                else {
                    magicOption = _getMagicOption(_island.getOption());
                }
                zrUtil.merge(
                    magicOption, param.option,
                    { 'overwrite': true, 'recursive': true }
                );
                zrUtil.merge(
                    _optionBackup, param.option,
                    { 'overwrite': true, 'recursive': true }
                );
                zrUtil.merge(
                    _optionRestore, param.option,
                    { 'overwrite': true, 'recursive': true }
                );
                _island.refresh(magicOption);
                _toolbox.refresh(magicOption);
            }
            
            // 先来后到，安顺序刷新各种图表，图表内部refresh优化检查magicOption，无需更新则不更新~
            for (var i = 0, l = _chartList.length; i < l; i++) {
                _chartList[i].refresh && _chartList[i].refresh(magicOption);
            }
            _zr.refresh();
        }

        /**
         * 释放图表实例
         */
        function _disposeChartList() {
            var len = _chartList.length;
            while (len--) {
                _chartList[len]
                && _chartList[len].dispose 
                && _chartList[len].dispose();
            }
            _chartList = [];
        }

        /**
         * 万能接口，配置图表实例任何可配置选项，多次调用时option选项做merge处理
         * @param {Object} option
         * @param {boolean=} notMerge 多次调用时option选项是默认是合并（merge）的，
         *                   如果不需求，可以通过notMerger参数为true阻止与上次option的合并
         */
        function setOption(option, notMerge) {
            var zrUtil = require('zrender/tool/util');
            if (!notMerge) {
                zrUtil.merge(
                    _option,
                    zrUtil.clone(option),
                    {
                        'overwrite': true,
                        'recursive': true
                    }
                );
            }
            else {
                _option = zrUtil.clone(option);
            }

            if (!option.series || option.series.length === 0) {
                return;
            }

            // 非图表全局属性merge~~
            if (typeof _option.calculable == 'undefined') {
                _option.calculable = ecConfig.calculable;
            }
            if (typeof _option.nameConnector == 'undefined') {
                _option.nameConnector = ecConfig.nameConnector;
            }
            if (typeof _option.valueConnector == 'undefined') {
                _option.valueConnector = ecConfig.valueConnector;
            }
            if (typeof _option.animation == 'undefined') {
                _option.animation = ecConfig.animation;
            }
            if (typeof _option.animationDuration == 'undefined') {
                _option.animationDuration = ecConfig.animationDuration;
            }
            if (typeof _option.animationEasing == 'undefined') {
                _option.animationEasing = ecConfig.animationEasing;
            }
            if (typeof _option.addDataAnimation == 'undefined') {
                _option.addDataAnimation = ecConfig.addDataAnimation;
            }

            var zrColor = require('zrender/tool/color');
            // 数值系列的颜色列表，不传则采用内置颜色，可配数组
            if (_option.color && _option.color.length > 0) {
                _zr.getColor = function(idx) {
                    return zrColor.getColor(idx, _option.color);
                };
            }
            else {
                _zr.getColor = function(idx) {
                    return zrColor.getColor(idx, ecConfig.color);
                };
            }
            // calculable可计算颜色提示
            _zr.getCalculableColor = function () {
                return _option.calculableColor || ecConfig.calculableColor;
            };

            _optionBackup = zrUtil.clone(_option);
            _optionRestore = zrUtil.clone(_option);
            
            if (_option.legend && _option.legend.selected) {
                _selectedMap = _option.legend.selected;
            }
            else {
                _selectedMap = {};
            }

            _island.clear();
            _toolbox.reset(_option);
            _render(_option);
            return self;
        }

        /**
         * 数据设置快捷接口
         * @param {Array} series
         * @param {boolean=} notMerge 多次调用时option选项是默认是合并（merge）的，
         *                   如果不需求，可以通过notMerger参数为true阻止与上次option的合并。
         */
        function setSeries(series, notMerge) {
            if (!notMerge) {
                self.setOption({series: series});
            }
            else {
                _option.series = series;
                self.setOption(_option, notMerge);
            }

            return self;
        }
        
        /**
         * 动态数据添加
         * 形参为单组数据参数，多组时为数据，内容同[seriesIdx, data, isShift, additionData]
         * @param {number} seriesIdx 系列索引
         * @param {number | Object} data 增加数据
         * @param {boolean=} isHead 是否队头加入，默认，不指定或false时为队尾插入
         * @param {boolean=} dataGrow 是否增长数据队列长度，默认，不指定或false时移出目标数组对位数据
         * @param {string=} additionData 是否增加类目轴(饼图为图例)数据，附加操作同isHead和dataGrow
         */
        function addData(seriesIdx, data, isHead, dataGrow, additionData) {
            var zrUtil = require('zrender/tool/util');
            var params = seriesIdx instanceof Array
                         ? seriesIdx
                         : [[seriesIdx, data, isHead, dataGrow, additionData]];
            var axisIdx;
            var legendDataIdx;
            var magicOption;
            if (_optionBackup.toolbox
                && _optionBackup.toolbox.show
                && _optionBackup.toolbox.feature.magicType
                && _optionBackup.toolbox.feature.magicType.length > 0
            ) {
                magicOption = _getMagicOption();
            }
            else {
                magicOption = _getMagicOption(_island.getOption());
            }
            //_optionRestore 和 _optionBackup都要同步
            for (var i = 0, l = params.length; i < l; i++) {
                seriesIdx = params[i][0];
                data = params[i][1];
                isHead = params[i][2];
                dataGrow = params[i][3];
                additionData = params[i][4];
                if (_optionRestore.series[seriesIdx]) {
                    if (isHead) {
                        _optionRestore.series[seriesIdx].data.unshift(data);
                        _optionBackup.series[seriesIdx].data.unshift(data);
                        if (!dataGrow) {
                            _optionRestore.series[seriesIdx].data.pop();
                            data = _optionBackup.series[seriesIdx].data.pop();
                        }
                    }
                    else {
                        _optionRestore.series[seriesIdx].data.push(data);
                        _optionBackup.series[seriesIdx].data.push(data);
                        if (!dataGrow) {
                            _optionRestore.series[seriesIdx].data.shift();
                            data = _optionBackup.series[seriesIdx].data.shift();
                        }
                    }
                    
                    if (typeof additionData != 'undefined'
                        && _optionRestore.series[seriesIdx].type 
                           == ecConfig.CHART_TYPE_PIE
                        && _optionBackup.legend 
                        && _optionBackup.legend.data
                    ) {
                        magicOption.legend.data = _optionBackup.legend.data;
                        if (isHead) {
                            _optionRestore.legend.data.unshift(additionData);
                            _optionBackup.legend.data.unshift(additionData);
                        }
                        else {
                            _optionRestore.legend.data.push(additionData);
                            _optionBackup.legend.data.push(additionData);
                        }
                        if (!dataGrow) {
                            legendDataIdx = zrUtil.indexOf(
                                _optionBackup.legend.data,
                                data.name
                            );
                            legendDataIdx != -1
                            && (
                                _optionRestore.legend.data.splice(
                                    legendDataIdx, 1
                                ),
                                _optionBackup.legend.data.splice(
                                    legendDataIdx, 1
                                )
                            );
                        }
                        _selectedMap[additionData] = true;
                    } 
                    else  if (typeof additionData != 'undefined'
                        && typeof _optionRestore.xAxis != 'undefined'
                        && typeof _optionRestore.yAxis != 'undefined'
                    ) {
                        // x轴类目
                        axisIdx = _optionRestore.series[seriesIdx].xAxisIndex
                                  || 0;
                        if (typeof _optionRestore.xAxis[axisIdx].type 
                            == 'undefined'
                            || _optionRestore.xAxis[axisIdx].type == 'category'
                        ) {
                            if (isHead) {
                                _optionRestore.xAxis[axisIdx].data.unshift(
                                    additionData
                                );
                                _optionBackup.xAxis[axisIdx].data.unshift(
                                    additionData
                                );
                                if (!dataGrow) {
                                    _optionRestore.xAxis[axisIdx].data.pop();
                                    _optionBackup.xAxis[axisIdx].data.pop();
                                }
                            }
                            else {
                                _optionRestore.xAxis[axisIdx].data.push(
                                    additionData
                                );
                                _optionBackup.xAxis[axisIdx].data.push(
                                    additionData
                                );
                                if (!dataGrow) {
                                    _optionRestore.xAxis[axisIdx].data.shift();
                                    _optionBackup.xAxis[axisIdx].data.shift();
                                }
                            }
                        }
                        
                        // y轴类目
                        axisIdx = _optionRestore.series[seriesIdx].yAxisIndex
                                  || 0;
                        if (_optionRestore.yAxis[axisIdx].type == 'category') {
                            if (isHead) {
                                _optionRestore.yAxis[axisIdx].data.unshift(
                                    additionData
                                );
                                _optionBackup.yAxis[axisIdx].data.unshift(
                                    additionData
                                );
                                if (!dataGrow) {
                                    _optionRestore.yAxis[axisIdx].data.pop();
                                    _optionBackup.yAxis[axisIdx].data.pop();
                                }
                            }
                            else {
                                _optionRestore.yAxis[axisIdx].data.push(
                                    additionData
                                );
                                _optionBackup.yAxis[axisIdx].data.push(
                                    additionData
                                );
                                if (!dataGrow) {
                                    _optionRestore.yAxis[axisIdx].data.shift();
                                    _optionBackup.yAxis[axisIdx].data.shift();
                                }
                            }
                        }
                    }
                }
            }
            magicOption.legend && (magicOption.legend.selected = _selectedMap);
            // dataZoom同步一下数据
            for (var i = 0, l = _chartList.length; i < l; i++) {
                if (magicOption.addDataAnimation 
                    && _chartList[i].addDataAnimation
                ) {
                    _chartList[i].addDataAnimation(params);
                }
                if (_chartList[i].type 
                    == ecConfig.COMPONENT_TYPE_DATAZOOM
                ) {
                    _chartList[i].silence(true);
                    _chartList[i].init(magicOption);
                    _chartList[i].silence(false);
                }
            }
            _island.refresh(magicOption);
            _toolbox.refresh(magicOption);
            setTimeout(function(){
                _messageCenter.dispatch(
                    ecConfig.EVENT.REFRESH,
                    '',
                    {option: magicOption}
                );
            }, magicOption.addDataAnimation ? 500 : 0);
            return self;
        }

        /**
         * 获取当前zrender实例，可用于添加额为的shape和深度控制 
         */
        function getZrender() {
            return _zr;
        }

        /**
         * 绑定事件
         * @param {Object} eventName 事件名称
         * @param {Object} eventListener 事件响应函数
         */
        function on(eventName, eventListener) {
            _messageCenter.bind(eventName, eventListener);
            return self;
        }

        /**
         * 解除事件绑定
         * @param {Object} eventName 事件名称
         * @param {Object} eventListener 事件响应函数
         */
        function un(eventName, eventListener) {
            _messageCenter.unbind(eventName, eventListener);
            return self;
        }

        /**
         * 显示loading过渡 
         * @param {Object} loadingOption
         */
        function showLoading(loadingOption) {
            _toolbox.hideDataView();

            var zrUtil = require('zrender/tool/util');
            loadingOption = loadingOption || {};
            loadingOption.textStyle = loadingOption.textStyle || {};

            var finalTextStyle = zrUtil.merge(
                zrUtil.clone(loadingOption.textStyle),
                ecConfig.textStyle,
                { 'overwrite': false}
            );
            loadingOption.textStyle.textFont = finalTextStyle.fontStyle + ' '
                                            + finalTextStyle.fontWeight + ' '
                                            + finalTextStyle.fontSize + 'px '
                                            + finalTextStyle.fontFamily;

            loadingOption.textStyle.text = loadingOption.text || 'Loading...';

            if (typeof loadingOption.x != 'undefined') {
                loadingOption.textStyle.x = loadingOption.x;
            }

            if (typeof loadingOption.y != 'undefined') {
                loadingOption.textStyle.y = loadingOption.y;
            }
            _zr.showLoading(loadingOption);

            return self;
        }

        /**
         * 隐藏loading过渡 
         */
        function hideLoading() {
            _zr.hideLoading();
            return self;
        }

        /**
         * 视图区域大小变化更新，不默认绑定，供使用方按需调用 
         */
        function resize() {
            _zr.resize();
            // 先来后到，不能仅刷新自己，也不能在上一个循环中刷新，如坐标系数据改变会影响其他图表的大小
            // 所以安顺序刷新各种图表，图表内部refresh优化无需更新则不更新~
            for (var i = 0, l = _chartList.length; i < l; i++) {
                _chartList[i].resize && _chartList[i].resize();
            }
            _island.resize();
            _toolbox.resize();
            _zr.refresh();
            return self;
        }

        /**
         * 清楚已渲染内容 ，clear后echarts实例可用
         */
        function clear() {
            _zr.clear();
            return self;
        }

        /**
         * 释放，dispose后echarts实例不可用
         */
        function dispose() {
            _island.dispose();
            _toolbox.dispose();
            _disposeChartList();
            _messageCenter.unbind();
            _zr.dispose();
            self = null;
            return;
        }

        // 接口方法暴漏
        self.setOption = setOption;
        self.setSeries = setSeries;
        self.addData = addData;
        self.getZrender = getZrender;
        self.on = on;
        self.un = un;
        self.showLoading = showLoading;
        self.hideLoading = hideLoading;
        self.resize = resize;
        self.refresh = refresh;
        self.restore = restore;
        self.clear = clear;
        self.dispose = dispose;
    }

    return self;
});
define('echarts', ['echarts/echarts'], function (main) { return main; });

/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：大规模散点图图形
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'symbol',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           pointList     : {Array},   // 必须，二维数组，二维内容如下
               x         : {number},  // 必须，横坐标
               y         : {number},  // 必须，纵坐标数组
               size      : {number},  // 必须，半宽
               type      : {string=}, // 默认为'circle',图形类型
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'symbol',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : [100,123,90,125],
           width : 150,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'echarts/util/shape/symbol',['require','zrender/tool/color','zrender/shape','zrender/shape/base','zrender/shape'],function(require) {
        function Symbol() {
            this.type = 'symbol';
        }

        Symbol.prototype =  {
            /*
             * pointlist=[
             *      0  x,
             *      1  y, 
             *      2  图形大小
             *      3  图形类型
             *      4  数据index
             *      5  名称
             * ]
             */
            _buildSinglePoint : function(ctx, singlePoint) {
                switch (singlePoint[3]) {
                    case 'circle' :
                    case 'emptyCircle' :
                        ctx.arc(
                            singlePoint[0], 
                            singlePoint[1], 
                            singlePoint[2],
                            0,
                            Math.PI * 2, 
                            true
                        );
                        break;
                    case 'rectangle' :
                    case 'emptyRectangle' :
                        ctx.rect(
                            singlePoint[0] - singlePoint[2], 
                            singlePoint[1] - singlePoint[2], 
                            singlePoint[2] * 2,
                            singlePoint[2] * 2
                        );
                        break;
                    case 'triangle' :
                    case 'emptyTriangle' :
                        itemShape = {
                            shape : 'polygon',
                            style : {
                                pointList : [
                                    [x, y - symbolSize],
                                    [x + symbolSize, y + symbolSize],
                                    [x - symbolSize, y + symbolSize]
                                ],
                                brushType : symbolType == 'triangle'
                                            ? 'fill' : 'stroke'
                            }
                        };
                        break;
                    case 'diamond' :
                    case 'emptyDiamond' :
                        itemShape = {
                            shape : 'polygon',
                            style : {
                                pointList : [
                                    [x, y - symbolSize],
                                    [x + symbolSize, y],
                                    [x, y + symbolSize],
                                    [x - symbolSize, y]
                                ],
                                brushType : symbolType == 'diamond'
                                            ? 'fill' : 'stroke'
                            }
                        };
                        break;
                    default:
                        itemShape = {
                            shape : 'circle',
                            style : {
                                x : x,
                                y : y,
                                r : symbolSize,
                                brushType : 'fill'
                            }
                        };
                        break;
                }
            },
            
            /**
             * 创建矩形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                var pointList = style.pointList;
                var rect = this.getRect(style);
                var ratio = window.devicePixelRatio || 1;
                // console.log(rect)
                // var ti = new Date();
                var pixels = ctx.getImageData(
                    rect.x * ratio, rect.y * ratio, 
                    rect.width * ratio, rect.height * ratio
                );
               
                var data = pixels.data;
                var idx;
                var zrColor = require('zrender/tool/color');
                var color = zrColor.toArray(style.color);
                var r = color[0];
                var g = color[1];
                var b = color[2];
                var width = rect.width;

                for (var i = 1, l = pointList.length; i < l; i++) {
                    idx = ( (pointList[i][0] - rect.x) * ratio
                           + (pointList[i][1]- rect.y) * width * ratio * ratio
                          ) * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = 255; 
                }
                ctx.putImageData(pixels, rect.x * ratio, rect.y * ratio);
                // console.log(new Date() - ti);
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var shape = require('zrender/shape');
                return shape.get('polygon').getRect(style);
            },
            
            isCover : function() {
                return false;
            }
        };

        require('zrender/shape/base').derive(Symbol);
        require('zrender/shape').define('symbol', new Symbol());
        
        return Symbol;
    }
);
/**
 * echarts图表类：散点图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/chart/scatter',['require','../component/base','./calculableBase','../config','../util/ecData','zrender/tool/color','../util/shape/symbol','../chart'],function(require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Scatter(messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.CHART_TYPE_SCATTER;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();
        
        var _sIndex2ColorMap = {};  // series默认颜色索引，seriesIndex索引到color
        var _symbol = [
              'circle', 'rectangle', 'triangle', 'diamond',
              'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
            ];
        var _sIndex2ShapeMap = {};  // series图形类型，seriesIndex索引到_symbol

        function _buildShape() {
            self.selectedMap = {};
            
            var legend = component.legend;
            var seriesArray = [];
            var serie;                              // 临时映射变量
            var serieName;                          // 临时映射变量
            var iconShape;
            for (var i = 0, l = series.length; i < l; i++) {
                serie = series[i];
                serieName = serie.name;
                if (serie.type == ecConfig.CHART_TYPE_SCATTER) {
                    series[i] = self.reformOption(series[i]);
                    _sIndex2ShapeMap[i] = self.deepQuery([serie], 'symbol')
                                          || _symbol[i % _symbol.length];
                    if (legend){
                        self.selectedMap[serieName] = 
                            legend.isSelected(serieName);
                            
                        _sIndex2ColorMap[i] = 
                            zrColor.alpha(legend.getColor(serieName),0.5);
                            
                        iconShape = legend.getItemShape(serieName);
                        if (iconShape) {
                            // 回调legend，换一个更形象的icon
                            iconShape.shape = 'icon';
                            iconShape.style.iconType = _sIndex2ShapeMap[i];
                            legend.setItemShape(serieName, iconShape);
                        }
                    } else {
                        self.selectedMap[serieName] = true;
                        _sIndex2ColorMap[i] = zr.getColor(i);
                    }
                      
                    if (self.selectedMap[serieName]) {
                        seriesArray.push(i);
                    }
                }
            }
            if (seriesArray.length === 0) {
                return;
            }
            _buildSeries(seriesArray);

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建类目轴为水平方向的散点图系列
         */
        function _buildSeries(seriesArray) {
            var seriesIndex;
            var serie;
            var data;
            var value;
            var xAxis;
            var yAxis; 

            var pointList = {};
            var x;
            var y;
            var symbolSize;
            for (var j = 0, k = seriesArray.length; j < k; j++) {
                seriesIndex = seriesArray[j];
                serie = series[seriesIndex];
                if (serie.data.length === 0) {
                    continue;
                }
                
                xAxis = component.xAxis.getAxis(serie.xAxisIndex || 0);
                yAxis = component.yAxis.getAxis(serie.yAxisIndex || 0);
                
                symbolSize = self.deepQuery([serie], 'symbolSize');
                pointList[seriesIndex] = [];
                for (var i = 0, l = serie.data.length; i < l; i++) {
                    data = serie.data[i];
                    value = typeof data != 'undefined'
                            ? (typeof data.value != 'undefined'
                              ? data.value
                              : data)
                            : '-';
                    if (value == '-' || value.length < 2) {
                        // 数据格式不符
                        continue;
                    }
                    x = xAxis.getCoord(value[0]);
                    y = yAxis.getCoord(value[1]);
                    pointList[seriesIndex].push([
                        x,  // 横坐标
                        y,  // 纵坐标
                        (typeof symbolSize == 'function'
                        ? symbolSize(value)
                        : symbolSize),                  // 图形大小
                        _sIndex2ShapeMap[seriesIndex],  // 图形类型
                        i,                              // 数据index
                        data.name || ''                 // 名称
                    ]);
                }
            }
            // console.log(pointList)
            _buildPointList(pointList);
        }

        /**
         * 生成折线和折线上的拐点
         */
        function _buildPointList(pointList) {
            var dataRange = component.dataRange;
            var rangColor;  // 更高优先级
            var nColor;     // normal
            var nLineWidth;
            var eColor;     // emphasis
            var eLineWidth;
            
            var serie;
            var queryTarget;
            var data;
            var seriesPL;
            var singlePoint;
            var symbolRotate;
            
            for (var seriesIndex in pointList) {
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];
                // 多级控制
                queryTarget = [serie];
                nColor = self.deepQuery(
                    queryTarget, 'itemStyle.normal.color'
                ) || _sIndex2ColorMap[seriesIndex];
                nLineWidth = self.deepQuery(
                    queryTarget, 'itemStyle.normal.lineStyle.width'
                );
                
                eColor = self.deepQuery(
                    queryTarget, 'itemStyle.emphasis.color'
                );
                eLineWidth = self.deepQuery(
                    queryTarget, 'itemStyle.emphasis.lineStyle.width'
                );
                
                symbolRotate = self.deepQuery(
                    queryTarget, 'symbolRotate'
                );
                
                if (serie.large && serie.data.length > serie.largeThreshold) {
                    self.shapeList.push(_getLargeSymbol(
                        seriesPL, nColor, eColor
                    ));
                    continue;
                }

                /*
                 * pointlist=[
                 *      0  x,
                 *      1  y, 
                 *      2  图形大小
                 *      3  图形类型
                 *      4  数据index
                 *      5  名称
                 * ]
                 */
                for (var i = 0, l = seriesPL.length; i < l; i++) {
                    singlePoint = seriesPL[i];
                    data = serie.data[singlePoint[4]];
                    
                    if (dataRange) {
                        if (isNaN(data[2])) {
                            continue;
                        }
                        rangColor = dataRange.getColor(data[2]);
                        if (!rangColor) {
                            continue;
                        }
                    }
                    else {
                        rangColor = nColor;
                    }
                    
                    queryTarget = [data];
                    self.shapeList.push(_getSymbol(
                        seriesIndex,    // seriesIndex
                        singlePoint[4], // dataIndex
                        singlePoint[5], // name
                        
                        singlePoint[0], // x
                        singlePoint[1], // y
                        
                        // 大小
                        self.deepQuery(queryTarget, 'symbolSize')
                        || singlePoint[2],
                        
                        // 方向
                        self.deepQuery(queryTarget, 'symbolRotate') 
                        || symbolRotate,
                        
                        // 类型
                        self.deepQuery(queryTarget, 'symbol')
                        || singlePoint[3],
                        
                        // 填充颜色
                        self.deepQuery(queryTarget, 'itemStyle.normal.color')
                        || rangColor,
                        // 线宽
                        self.deepQuery(
                            queryTarget, 'itemStyle.normal.lineStyle.width'
                        )|| nLineWidth,
                        
                        //------------高亮
                        // 填充颜色
                        self.deepQuery(
                            queryTarget, 'itemStyle.emphasis.color'
                        ) || eColor || nColor,
                        // 线宽
                        self.deepQuery(
                            queryTarget, 'itemStyle.emphasis.lineStyle.width'
                        )|| eLineWidth || nLineWidth
                    ));
                }
            }
            // console.log(self.shapeList)
        }

        /**
         * 生成散点图上的图形
         */
        function _getSymbol(
            seriesIndex, dataIndex, name, 
            x, y, symbolSize, symbolRotate, symbol,
            nColor, nLineWidth, eColor, eLineWidth
        ) {
            var itemShape = {
                shape : 'icon',
                zlevel : _zlevelBase,
                style : {
                    iconType : symbol.replace('empty', '').toLowerCase(),
                    x : x - symbolSize,
                    y : y - symbolSize,
                    width : symbolSize * 2,
                    height : symbolSize * 2,
                    brushType : symbol.match('empty') ? 'stroke' : 'fill',
                    color : nColor,
                    strokeColor : nColor,
                    lineWidth: nLineWidth
                },
                highlightStyle : {
                    color : eColor,
                    strokeColor : eColor,
                    lineWidth : eLineWidth
                },
                clickable : true
            };
            
            if (typeof symbolRotate != 'undefined') {
                itemShape.rotation = [
                    symbolRotate * Math.PI / 180, x, y
                ];
            }
            
            if (symbol.match('star')) {
                itemShape.style.iconType = 'star';
                itemShape.style.n = 
                    (symbol.replace('empty', '').replace('star','') - 0) || 5;
            }
            
            if (symbol == 'none') {
                itemShape.invisible = true;
                itemShape.hoverable = false;
            }

            /*
            if (self.deepQuery([data, serie, option], 'calculable')) {
                self.setCalculable(itemShape);
                itemShape.draggable = true;
            }
            */

            ecData.pack(
                itemShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );

            // for animation
            itemShape._x = x;
            itemShape._y = y;
            
            return itemShape;
        }
        
        function _getLargeSymbol(symbolList, nColor, eColor) {
            return {
                shape : 'symbol',
                zlevel : _zlevelBase,
                hoverable: false,
                style : {
                    pointList : symbolList,
                    color : nColor,
                    strokeColor : nColor
                },
                highlightStyle : {
                    color : eColor,
                    strokeColor : eColor
                }
            };
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            component = newComponent;
            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
        }
        
        /**
         * 值域响应
         * @param {Object} param
         * @param {Object} status
         */
        function ondataRange(param, status) {
            if (component.dataRange) {
                refresh();
                status.needRefresh = true;
            }
            return;
        }

        /**
         * 动画设定
         */
        function animation() {
            var duration = self.deepQuery([option], 'animationDuration');
            var easing = self.deepQuery([option], 'animationEasing');
            var x;
            var y;
            var serie;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                x = self.shapeList[i]._x || 0;
                y = self.shapeList[i]._y || 0;
                zr.modShape(self.shapeList[i].id, {
                    scale : [0, 0, x, y]
                });
                zr.animate(self.shapeList[i].id, '')
                    .when(
                        (self.deepQuery([serie],'animationDuration')
                        || duration),
                        
                        {scale : [1, 1, x, y]},
                        
                        (self.deepQuery([serie], 'animationEasing')
                        || easing)
                    )
                    .start();
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.ondataRange = ondataRange;
        self.animation = animation;

        init(option, component);
    }
    
    // 动态扩展zrender shape：symbol
    require('../util/shape/symbol');
    
    // 自注册
    require('../chart').define('scatter', Scatter);
    
    return Scatter;
});
/**
 * zrender
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * shape类：蜡烛
 * 可配图形属性：
   {
       // 基础属性
       shape  : 'candle',       // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，横坐标
           y             : {Array},   // 必须，纵坐标数组
           width         : {number},  // 必须，宽度
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
         例子：
   {
       shape  : 'candle',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : [100,123,90,125],
           width : 150,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */
define(
    'echarts/util/shape/candle',['require','zrender/tool/matrix','zrender/shape/base','zrender/shape'],function(require) {
        var matrix = require('zrender/tool/matrix');
        
        function Candle() {
            this.type = 'candle';
        }

        Candle.prototype =  {
            _numberOrder : function(a, b) {
                return b - a;
            },
            /**
             * 创建矩形路径
             * @param {Context2D} ctx Canvas 2D上下文
             * @param {Object} style 样式
             */
            buildPath : function(ctx, style) {
                style.y.sort(this._numberOrder);
                
                ctx.moveTo(style.x, style.y[3]);
                ctx.lineTo(style.x, style.y[2]);
                ctx.moveTo(style.x - style.width / 2, style.y[2]);
                ctx.rect(
                    style.x - style.width / 2,
                    style.y[2],
                    style.width,
                    style.y[1] - style.y[2]
                );
                ctx.moveTo(style.x, style.y[1]);
                ctx.lineTo(style.x, style.y[0]);
                return;
            },

            /**
             * 返回矩形区域，用于局部刷新和文字定位
             * @param {Object} style
             */
            getRect : function(style) {
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                return {
                    x : Math.round(style.x - style.width / 2 - lineWidth / 2),
                    y : Math.round(style.y[3] - lineWidth / 2),
                    width : style.width + lineWidth,
                    height : style.y[0] - style.y[3] + lineWidth
                };
            },
            
            
            isCover : function(e, x, y) {
                //对鼠标的坐标也做相同的变换
                if(e.__needTransform && e._transform){
                    var inverseMatrix = [];
                    matrix.invert(inverseMatrix, e._transform);

                    var originPos = [x, y];
                    matrix.mulVector(originPos, inverseMatrix, [x, y, 1]);

                    if (x == originPos[0] && y == originPos[1]) {
                        // 避免外部修改导致的__needTransform不准确
                        if (Math.abs(e.rotation[0]) > 0.0001
                            || Math.abs(e.position[0]) > 0.0001
                            || Math.abs(e.position[1]) > 0.0001
                            || Math.abs(e.scale[0] - 1) > 0.0001
                            || Math.abs(e.scale[1] - 1) > 0.0001
                        ) {
                            e.__needTransform = true;
                        } else {
                            e.__needTransform = false;
                        }
                    }

                    x = originPos[0];
                    y = originPos[1];
                }

                // 快速预判并保留判断矩形
                var rect;
                if (e.style.__rect) {
                    rect = e.style.__rect;
                }
                else {
                    rect = this.getRect(e.style);
                    rect = [
                        rect.x,
                        rect.x + rect.width,
                        rect.y,
                        rect.y + rect.height
                    ];
                    e.style.__rect = rect;
                }
                if (x >= rect[0]
                    && x <= rect[1]
                    && y >= rect[2]
                    && y <= rect[3]
                ) {
                    // 矩形内
                    return true;
                }
                else {
                    return false;
                }
            }
        };

        require('zrender/shape/base').derive(Candle);
        require('zrender/shape').define('candle', new Candle());
        
        return Candle;
    }
);
/**
 * echarts图表类：K线图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/chart/k',['require','../component/base','./calculableBase','../config','../util/ecData','../util/shape/candle','../chart'],function(require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function K(messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var self = this;
        self.type = ecConfig.CHART_TYPE_K;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();

        function _buildShape() {
            self.selectedMap = {};

            // 水平垂直双向series索引 ，position索引到seriesIndex
            var _position2sIndexMap = {
                top : [],
                bottom : []
            };
            var xAxis;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_K) {
                    series[i] = self.reformOption(series[i]);
                    xAxis = component.xAxis.getAxis(series[i].xAxisIndex);
                    if (xAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[xAxis.getPosition()].push(i);
                    }
                }
            }
            //console.log(_position2sIndexMap)
            for (var position in _position2sIndexMap) {
                if (_position2sIndexMap[position].length > 0) {
                    _buildSinglePosition(
                        position, _position2sIndexMap[position]
                    );
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建单个方向上的K线图
         *
         * @param {number} seriesIndex 系列索引
         */
        function _buildSinglePosition(position, seriesArray) {
            var mapData = _mapData(seriesArray);
            var locationMap = mapData.locationMap;
            var maxDataLength = mapData.maxDataLength;

            if (maxDataLength === 0 || locationMap.length === 0) {
                return;
            }
            _buildHorizontal(maxDataLength, locationMap);
        }

        /**
         * 数据整形
         * 数组位置映射到系列索引
         */
        function _mapData(seriesArray) {
            var serie;                              // 临时映射变量
            var serieName;                          // 临时映射变量
            var legend = component.legend;
            var locationMap = [];                   // 需要返回的东西：数组位置映射到系列索引
            var maxDataLength = 0;                  // 需要返回的东西：最大数据长度
            // 计算需要显示的个数和分配位置并记在下面这个结构里
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                serie = series[seriesArray[i]];
                serieName = serie.name;
                if (legend){
                    self.selectedMap[serieName] = legend.isSelected(serieName);
                } else {
                    self.selectedMap[serieName] = true;
                }

                if (self.selectedMap[serieName]) {
                    locationMap.push(seriesArray[i]);
                }
                // 兼职帮算一下最大长度
                maxDataLength = Math.max(maxDataLength, serie.data.length);
            }
            return {
                locationMap : locationMap,
                maxDataLength : maxDataLength
            };
        }

        /**
         * 构建类目轴为水平方向的K线图系列
         */
        function _buildHorizontal(maxDataLength, locationMap) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex;
            var serie;
            var xAxisIndex;
            var categoryAxis;
            var yAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var pointList = {};
            var candleWidth;
            var data;
            var value;
            for (var j = 0, k = locationMap.length; j < k; j++) {
                seriesIndex = locationMap[j];
                serie = series[seriesIndex];
                
                xAxisIndex = serie.xAxisIndex || 0;
                categoryAxis = component.xAxis.getAxis(xAxisIndex);
                candleWidth = Math.floor(categoryAxis.getGap() / 2);
                yAxisIndex = serie.yAxisIndex || 0;
                valueAxis = component.yAxis.getAxis(yAxisIndex);
                
                pointList[seriesIndex] = [];
                for (var i = 0, l = maxDataLength; i < l; i++) {
                    if (typeof categoryAxis.getNameByIndex(i) 
                        == 'undefined'
                    ) {
                        // 系列数据超出类目轴长度
                        break;
                    }
                    
                    data = serie.data[i];
                    value = typeof data != 'undefined'
                            ? (typeof data.value != 'undefined'
                              ? data.value
                              : data)
                            : '-';
                    if (value == '-' || value.length != 4) {
                        // 数据格式不符
                        continue;
                    }
                    pointList[seriesIndex].push([
                        categoryAxis.getCoordByIndex(i),    // 横坐标
                        candleWidth,
                        valueAxis.getCoord(value[0]),       // 纵坐标：开盘
                        valueAxis.getCoord(value[1]),       // 纵坐标：收盘
                        valueAxis.getCoord(value[2]),       // 纵坐标：最低
                        valueAxis.getCoord(value[3]),       // 纵坐标：最高
                        i,                                  // 数据index
                        categoryAxis.getNameByIndex(i)      // 类目名称
                    ]);
                }
            }
            // console.log(pointList)
            _buildKLine(pointList);
        }

        /**
         * 生成K线
         */
        function _buildKLine(pointList) {
            // normal:
            var nLineWidth;
            var nLineColor;
            var nLineColor0;    // 阴线
            var nColor;
            var nColor0;        // 阴线
            
            // emphasis:
            var eLineWidth;
            var eLineColor;
            var eLineColor0;
            var eColor;
            var eColor0;

            var serie;
            var queryTarget;
            var data;
            var seriesPL;
            var singlePoint;
            var candleType;

            for (var seriesIndex = 0, len = series.length;
                seriesIndex < len;
                seriesIndex++
            ) {
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];
                if (serie.type == ecConfig.CHART_TYPE_K
                    && typeof seriesPL != 'undefined'
                ) {
                    // 多级控制
                    queryTarget = [serie];
                    nLineWidth = self.deepQuery(
                        queryTarget, 'itemStyle.normal.lineStyle.width'
                    );
                    nLineColor = self.deepQuery(
                        queryTarget, 'itemStyle.normal.lineStyle.color'
                    );
                    nLineColor0 = self.deepQuery(
                        queryTarget, 'itemStyle.normal.lineStyle.color0'
                    );
                    nColor = self.deepQuery(
                        queryTarget, 'itemStyle.normal.color'
                    );
                    nColor0 = self.deepQuery(
                        queryTarget, 'itemStyle.normal.color0'
                    );
                    
                    eLineWidth = self.deepQuery(
                        queryTarget, 'itemStyle.emphasis.lineStyle.width'
                    );
                    eLineColor = self.deepQuery(
                        queryTarget, 'itemStyle.emphasis.lineStyle.color'
                    );
                    eLineColor0 = self.deepQuery(
                        queryTarget, 'itemStyle.emphasis.lineStyle.color0'
                    );
                    eColor = self.deepQuery(
                        queryTarget, 'itemStyle.emphasis.color'
                    );
                    eColor0 = self.deepQuery(
                        queryTarget, 'itemStyle.emphasis.color0'
                    );

                    /*
                     * pointlist=[
                     *      0  x,
                     *      1  width, 
                     *      2  y0,
                     *      3  y1,
                     *      4  y2,
                     *      5  y3,
                     *      6  dataIndex,
                     *      7  categoryName
                     * ]
                     */
                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePoint = seriesPL[i];
                        data = serie.data[singlePoint[6]];
                        queryTarget = [data];
                        candleType = singlePoint[3] > singlePoint[2];
                        self.shapeList.push(_getCandle(
                            seriesIndex,    // seriesIndex
                            singlePoint[6], // dataIndex
                            singlePoint[7], // name
                            
                            singlePoint[0], // x
                            singlePoint[1], // width
                            singlePoint[2], // y开盘
                            singlePoint[3], // y收盘
                            singlePoint[4], // y最低
                            singlePoint[5], // y最高
                            
                            // 填充颜色
                            candleType
                            ? (self.deepQuery(          // 阳
                                   queryTarget, 'itemStyle.normal.color'
                               ) || nColor)
                            : (self.deepQuery(          // 阴
                                   queryTarget, 'itemStyle.normal.color0'
                               ) || nColor0),
                            
                            // 线宽
                            self.deepQuery(
                               queryTarget, 'itemStyle.normal.lineStyle.width'
                            ) || nLineWidth,
                            
                            // 线色
                            candleType
                            ? (self.deepQuery(          // 阳
                                   queryTarget,
                                   'itemStyle.normal.lineStyle.color'
                               ) || nLineColor)
                            : (self.deepQuery(          // 阴
                                   queryTarget,
                                   'itemStyle.normal.lineStyle.color0'
                               ) || nLineColor0),
                            
                            //------------高亮
                            
                            // 填充颜色
                            candleType
                            ? (self.deepQuery(          // 阳
                                   queryTarget, 'itemStyle.emphasis.color'
                               ) || eColor || nColor)
                            : (self.deepQuery(          // 阴
                                   queryTarget, 'itemStyle.emphasis.color0'
                               ) || eColor0 || nColor0),
                            
                            // 线宽
                            self.deepQuery(
                               queryTarget, 'itemStyle.emphasis.lineStyle.width'
                            ) || eLineWidth || nLineWidth,
                            
                            // 线色
                            candleType
                            ? (self.deepQuery(          // 阳
                                   queryTarget,
                                   'itemStyle.emphasis.lineStyle.color'
                               ) || eLineColor || nLineColor)
                            : (self.deepQuery(          // 阴
                                   queryTarget,
                                   'itemStyle.emphasis.lineStyle.color0'
                               ) || eLineColor0 || nLineColor0)
                        ));
                    }
                }
            }
            // console.log(self.shapeList)
        }

        /**
         * 生成K线图上的图形
         */
        function _getCandle(
            seriesIndex, dataIndex, name, 
            x, width, y0, y1, y2, y3, 
            nColor, nLinewidth, nLineColor, 
            eColor, eLinewidth, eLineColor
        ) {
            var itemShape = {
                shape : 'candle',
                zlevel : _zlevelBase,
                clickable: true,
                style : {
                    x : x,
                    y : [y0, y1, y2, y3],
                    width : width,
                    color : nColor,
                    strokeColor : nLineColor,
                    lineWidth : nLinewidth,
                    brushType : 'both'
                },
                highlightStyle : {
                    color : eColor,
                    strokeColor : eLineColor,
                    lineWidth : eLinewidth
                },
                _seriesIndex: seriesIndex
            };
            ecData.pack(
                itemShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );

            return itemShape;
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            component = newComponent;
            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
        }

        /**
         * 动画设定
         */
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var x;
            var dx;
            var y;
            var serie;
            var seriesIndex;
            var dataIndex;
             for (var i = 0, l = self.shapeList.length; i < l; i++) {
                seriesIndex = self.shapeList[i]._seriesIndex;
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    // 有数据删除才有移动的动画
                    if (self.shapeList[i].shape == 'candle') {
                        dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                        serie = series[seriesIndex];
                        if (aniMap[seriesIndex][2] 
                            && dataIndex == serie.data.length - 1
                        ) {
                            // 队头加入删除末尾
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                        else if (!aniMap[seriesIndex][2] && dataIndex === 0) {
                            // 队尾加入删除头部
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                        dx = component.xAxis.getAxis(
                                serie.xAxisIndex || 0
                             ).getGap();
                        x = aniMap[seriesIndex][2] ? dx : -dx;
                        y = 0;
                        zr.animate(self.shapeList[i].id, '')
                            .when(
                                500,
                                {position : [x, y]}
                            )
                            .start();
                    }
                }
            }
        }
        
        /**
         * 动画设定
         */
        function animation() {
            var duration = self.deepQuery([option], 'animationDuration');
            var easing = self.deepQuery([option], 'animationEasing');
            var x;
            var y;
            var serie;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].shape == 'candle') {
                    serie = series[self.shapeList[i]._seriesIndex];
                    x = self.shapeList[i].style.x;
                    y = self.shapeList[i].style.y[0];
                    zr.modShape(self.shapeList[i].id, {
                        scale : [1, 0, x, y]
                    });
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            (self.deepQuery([serie],'animationDuration')
                            || duration),

                            {scale : [1, 1, x, y]},

                            (self.deepQuery([serie], 'animationEasing')
                            || easing)
                        )
                        .start();
                }
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.addDataAnimation = addDataAnimation;
        self.animation = animation;

        init(option, component);
    }
    
    // 动态扩展zrender shape：candle
    require('../util/shape/candle');

    // 图表注册
    require('../chart').define('k', K);
    
    return K;
});
/**
 * echarts图表类：雷达图
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Neil (杨骥, yangji01@baidu.com)
 *
 */

 define('echarts/chart/radar',['require','../component/base','./calculableBase','../config','../util/ecData','zrender/tool/color','../chart'],function(require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Radar(messageCenter, zr, option, component) {
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.CHART_TYPE_RADAR;

        var series;                 // 共享数据源，不要修改跟自己无关的项
        var serie;

        var _zlevelBase = self.getZlevelBase();

        var _queryTarget;

        var _dropBoxList;

        var _symbol = [
              'circle', 'rectangle', 'triangle', 'diamond',
              'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
            ];
        var _radarDataCounter;
        
        /**
         * 绘制图形
         */
        function _buildShape() {  
            self.selectedMap = {};
            _dropBoxList = [];
            _radarDataCounter = 0;
            for (var i = 0, l = series.length; i < l ; i ++) {
                if (series[i].type == ecConfig.CHART_TYPE_RADAR) {
                    serie = self.reformOption(series[i]);
                    _queryTarget = [serie, option];

                    // 添加可拖拽提示框，多系列共用一个极坐标，第一个优先
                    if (self.deepQuery(_queryTarget, 'calculable')) {
                        _addDropBox(i);
                    }
                    _buildSingleRadar(i);
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建数据图形
         * @param {number} 序列的index
         */
        function _buildSingleRadar(index) {
            var legend = component.legend;
            var iconShape;
            var data = serie.data;
            var defaultColor;
            var name;
            var pointList;
            var calculable = self.deepQuery(_queryTarget, 'calculable');
           
            for (var i = 0; i < data.length; i ++) {
                name = data[i].name || '';
                
                // 图例开关
                self.selectedMap[name] = legend 
                                         ? legend.isSelected(name) 
                                         : true;
                if (!self.selectedMap[name]) {
                    continue;
                }
                
                 // 默认颜色策略
                if (legend) {
                    // 有图例则从图例中获取颜色定义
                    defaultColor = legend.getColor(name);
                    iconShape = legend.getItemShape(name);
                    if (iconShape) {
                        // 回调legend，换一个更形象的icon
                        iconShape.style.brushType = self.deepQuery(
                            [data[i], serie], 'itemStyle.normal.areaStyle'
                        ) ? 'both' : 'stroke';
                        legend.setItemShape(name, iconShape);
                    }
                }
                else {
                    // 全局颜色定义
                    defaultColor = zr.getColor(i);
                }

                pointList = _getPointList(serie.polarIndex, data[i]);
                // 添加拐点形状
                _addSymbol(pointList, defaultColor, data[i], index);
                // 添加数据形状
                _addDataShape(
                    pointList, defaultColor, data[i],
                    index, i, calculable
                );
                _radarDataCounter++;
            }
            
        }

        /**
         * 获取数据的点集
         * @param {number} polarIndex
         * @param {Array<Object>} 处理的数据
         * @return {Array<Array<number>>} 点集
         */
        function _getPointList(polarIndex, dataArr) {
            var pointList = [];
            var vector;
            var polar = component.polar;

            for (var i = 0, l = dataArr.value.length; i < l; i++) {
                vector = polar.getVector(polarIndex, i, dataArr.value[i]);
                if (vector) {
                    pointList.push(vector);
                } 
            }
            return pointList;
        }
        
        /**
         * 生成折线图上的拐点图形
         */
        function _getSymbol(
            x, y, symbol, symbolSize, normalColor, emphasisColor, lineWidth
        ) {
            var itemShape = {
                shape : 'icon',
                zlevel : _zlevelBase + 1,
                style : {
                    iconType : symbol.replace('empty', '').toLowerCase(),
                    x : x - symbolSize,
                    y : y - symbolSize,
                    width : symbolSize * 2,
                    height : symbolSize * 2,
                    brushType : 'both',
                    color : symbol.match('empty') ? '#fff' : normalColor,
                    strokeColor : normalColor,
                    lineWidth: lineWidth * 2
                },
                hoverable: false
            };
            
            if (symbol.match('star')) {
                itemShape.style.iconType = 'star';
                itemShape.style.n = 
                    (symbol.replace('empty', '').replace('star','') - 0) || 5;
            }
            
            itemShape._x = x;
            itemShape._y = y;

            return itemShape;
        }
        
        /**
         * 添加拐点
         * @param {Array<Array<number>>} pointList 点集
         * @param {string} defaultColor 默认填充颜色
         * @param {object} data 数据
         * @param {number} serieIndex
         */
        function _addSymbol(pointList, defaultColor, data) {
            // 多级控制
            var queryTarget = [data, serie];
            var symbol = self.deepQuery(queryTarget,'symbol')
                         || _symbol[_radarDataCounter % _symbol.length]
                         || 'cricle';
            
            if (symbol != 'none') {
                var symbolSize = self.deepQuery(queryTarget,'symbolSize');
                var nColor = self.deepQuery(
                    queryTarget, 'itemStyle.normal.color'
                );
                var eColor = self.deepQuery(
                    queryTarget, 'itemStyle.emphasis.color'
                );
                var lineWidth = self.deepQuery(
                    queryTarget, 'itemStyle.normal.lineStyle.width'
                );
                
                for (var i = 0, l = pointList.length; i < l; i++) {
                    self.shapeList.push(_getSymbol(
                        pointList[i][0],    // x
                        pointList[i][1],    // y
                        symbol,
                        symbolSize,
                        nColor || defaultColor,
                        eColor || nColor || defaultColor,
                        lineWidth
                    ));
                }
            }
        }
        
        /**
         * 添加数据图形
         * @param {Array<Array<number>>} pointList 点集
         * @param {string} defaultColor 默认填充颜色
         * @param {object} data 数据
         * @param {number} serieIndex
         * @param {number} dataIndex
         * @param {boolean} calcalable
         */ 
        function _addDataShape(
            pointList, defaultColor, data,
            seriesIndex, dataIndex, calculable
        ) {
            // 多级控制
            var queryTarget = [data, serie];
            var nColor = self.deepQuery(
                queryTarget, 'itemStyle.normal.color'
            );
            var nLineWidth = self.deepQuery(
                queryTarget, 'itemStyle.normal.lineStyle.width'
            );
            var nLineType = self.deepQuery(
                queryTarget, 'itemStyle.normal.lineStyle.type'
            );
            var nAreaColor = self.deepQuery(
                queryTarget, 'itemStyle.normal.areaStyle.color'
            );
            var nIsAreaFill = self.deepQuery(
                queryTarget, 'itemStyle.normal.areaStyle'
            );
            var shape = {
                shape : 'polygon',
                zlevel : _zlevelBase,
                style : {
                    pointList   : pointList,
                    brushType   : nIsAreaFill ? 'both' : 'stroke',
                    color       : nAreaColor 
                                  || nColor 
                                  || zrColor.alpha(defaultColor,0.5),
                    strokeColor : nColor || defaultColor,
                    lineWidth   : nLineWidth,
                    lineType    : nLineType
                },
                highlightStyle : {
                    brushType   : self.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.areaStyle'
                                  ) || nIsAreaFill 
                                  ? 'both' : 'stroke',
                    color       : self.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.areaStyle.color'
                                  ) 
                                  || nAreaColor 
                                  || nColor 
                                  || zrColor.alpha(defaultColor,0.5),
                    strokeColor : self.deepQuery(
                                      queryTarget, 'itemStyle.emphasis.color'
                                  ) || nColor || defaultColor,
                    lineWidth   : self.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.lineStyle.width'
                                  ) || nLineWidth,
                    lineType    : self.deepQuery(
                                      queryTarget,
                                      'itemStyle.emphasis.lineStyle.type'
                                  ) || nLineType
                }
            };
            ecData.pack(
                shape,
                series[seriesIndex],    // 系列
                seriesIndex,            // 系列索引
                data,                   // 数据
                dataIndex,              // 数据索引
                data.name,              // 数据名称
                // 附加指标信息 
                component.polar.getIndicator(series[seriesIndex].polarIndex)
            );
            if (calculable) {
                shape.draggable = true;
                self.setCalculable(shape);
            }
            self.shapeList.push(shape);
        }

        /**
         * 增加外围接受框
         * @param {number} serie的序列
         */
        function _addDropBox(index) {
            var polarIndex = self.deepQuery(
                _queryTarget, 'polarIndex'
            );
            if (!_dropBoxList[polarIndex]) {
                var shape = component.polar.getDropBox(polarIndex);
                shape.zlevel = _zlevelBase;
                self.setCalculable(shape);
                ecData.pack(shape, series, index, undefined, -1);
                self.shapeList.push(shape);
                _dropBoxList[polarIndex] = true;
            }
        }


        /**
         * 数据项被拖拽出去，重载基类方法
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 被拖拽图形元素

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 被拖拽的图形是饼图sector，删除被拖拽走的数据
            component.legend && component.legend.del(
                series[seriesIndex].data[dataIndex].name
            );

            series[seriesIndex].data.splice(dataIndex, 1);

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.needRefresh = true;

            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

         /**
         * 数据项被拖拽进来， 重载基类方法
         */
        function ondrop(param, status) {
            if (!self.isDrop || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 拖拽安放目标
            var dragged = param.dragged;    // 当前被拖拽的图形对象

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            var data;
            var legend = component.legend;
            var value;

            if (dataIndex == -1) {
                
                data = {
                    value : ecData.get(dragged, 'value'),
                    name : ecData.get(dragged, 'name')
                };

                series[seriesIndex].data.push(data);

                legend && legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }
            else {
                data = series[seriesIndex].data[dataIndex];
                legend && legend.del(data.name);
                data.name += option.nameConnector
                             + ecData.get(dragged, 'name');
                value = ecData.get(dragged, 'value');
                for (var i = 0 ; i < value.length; i ++) {
                    data.value[i] += value[i];
                }
                
                legend && legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }

            // 别status = {}赋值啊！！
            status.dragIn = status.dragIn || true;

            // 处理完拖拽事件后复位
            self.isDrop = false;

            return;
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newZr
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            component = newComponent;
            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
        }

        function animation() {
            var duration = self.deepQuery([option], 'animationDuration');
            var easing = self.deepQuery([option], 'animationEasing');
            var dataIndex;
            var seriesIndex;
            var data;
            var serie;
            var polarIndex;
            var polar = component.polar;
            var center;
            var item;
            var x;
            var y;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].shape == 'polygon') {
                    item = self.shapeList[i];
                    seriesIndex = ecData.get(item, 'seriesIndex');
                    dataIndex = ecData.get(item, 'dataIndex');

                    serie = series[seriesIndex];
                    data = serie.data[dataIndex];

                    polarIndex = self.deepQuery(
                        [data, serie, option], 'polarIndex');
                    center = polar.getCenter(polarIndex);
                    x = center[0];
                    y = center[1];
                    zr.modShape(self.shapeList[i].id, {
                        scale : [0.1, 0.1, x, y]
                    });
                    
                    zr.animate(item.id, '')
                        .when(
                            (self.deepQuery([serie],'animationDuration')
                            || duration)
                            + dataIndex * 100,

                            {scale : [1, 1, x, y]},

                            (self.deepQuery([serie], 'animationEasing')
                            || easing)
                        )
                        .start();
                }
                else {
                    x = self.shapeList[i]._x || 0;
                    y = self.shapeList[i]._y || 0;
                    zr.modShape(self.shapeList[i].id, {
                        scale : [0, 0, x, y]
                    });
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            duration,
                            {scale : [1, 1, x, y]},
                            'QuinticOut'
                        )
                        .start();
                }
            }

        }

        self.init = init;
        self.refresh = refresh;
        self.animation = animation;
        self.ondrop = ondrop;
        self.ondragend = ondragend;

        init(option, component);
    }

    // 图表注册
    require('../chart').define('radar', Radar);
    
    return Radar;
});
/**
 * echarts图表类：力导向图
 *
 * @author pissang (shenyi01@baidu.com)
 *
 */

define('echarts/chart/force',['require','../component/base','./calculableBase','../config','../util/ecData','zrender/config','zrender/tool/event','zrender/tool/util','zrender/tool/vector','../chart'],function(require) {
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Force(messageCenter, zr, option, component) {
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrConfig = require('zrender/config');
        var zrEvent = require('zrender/tool/event');
        // var zrColor = require('zrender/tool/color');
        var zrUtil = require('zrender/tool/util');
        var vec2 = require('zrender/tool/vector');

        var self = this;
        self.type = ecConfig.CHART_TYPE_FORCE;

        var series;

        var forceSerie;
        // var forceSerieIndex;

        var nodeShapes = [];
        var linkShapes = [];

        // 节点分类
        var categories = [];
        // 默认节点样式
        var nodeStyle;
        var nodeEmphasisStyle;
        // 默认边样式
        var linkStyle;
        var linkEmphasisStyle;
        // nodes和links的原始数据
        var nodesRawData = [];
        var linksRawData = [];

        // nodes和links的权重, 用来计算引力和斥力
        var nodeWeights = [];
        var linkWeights = [];

        // 节点的受力
        var nodeForces = [];
        // 节点的加速度
        var nodeAccelerations = [];
        // 节点的位置
        var nodePositions = [];
        var nodePrePositions = [];
        // 节点的质量
        var nodeMasses = [];

        var temperature;
        var k;
        
        //- ----------外部参数
        var density;
        var coolDown;
        var centripetal;
        // var initializeSize; // defined but never used
        var attractiveness;
        //- ----------

        var stepTime = 1/60;
        
        var viewportWidth;
        var viewportHeight;
        var centroid = [];

        var mouseX, mouseY;

        function _buildShape() {
            var legend = component.legend;
            temperature = 1.0;
            viewportWidth = zr.getWidth();
            viewportHeight = zr.getHeight();
            centroid = [viewportWidth/2, viewportHeight/2];

            for (var i = 0, l = series.length; i < l; i++) {
                var serie = series[i];
                if (serie.type === ecConfig.CHART_TYPE_FORCE) {
                    series[i] = self.reformOption(series[i]);
                    forceSerie = serie;

                    var minRadius = self.deepQuery([serie], 'minRadius');
                    var maxRadius = self.deepQuery([serie], 'maxRadius');

                    // ----------获取外部参数
                    attractiveness = self.deepQuery(
                        [serie], 'attractiveness'
                    );
                    density = self.deepQuery([serie], 'density');
                    initSize = self.deepQuery([serie], 'initSize');
                    centripetal = self.deepQuery([serie], 'centripetal');
                    coolDown = self.deepQuery([serie], 'coolDown');
                    // ----------

                    categories = self.deepQuery([serie], 'categories');
                    
                    // 同步selected状态
                    for (var j = 0, len = categories.length; j < len; j++) {
                        if (categories[j].name) {
                            if (legend){
                                self.selectedMap[j] = 
                                    legend.isSelected(categories[j].name);
                            } else {
                                self.selectedMap[j] = true;
                            }
                        }
                    }

                    linkStyle = self.deepQuery(
                        [serie], 'itemStyle.normal.linkStyle'
                    );
                    linkEmphasisStyle = self.deepQuery(
                        [serie], 'itemStyle.emphasis.linkStyle'
                    );
                    nodeStyle = self.deepQuery(
                        [serie], 'itemStyle.normal.nodeStyle'
                    );
                    nodeEmphasisStyle = self.deepQuery(
                        [serie], 'itemStyle.emphasis.nodeStyle'
                    );
                    
                    _filterData(
                        zrUtil.clone(self.deepQuery([serie], 'nodes')),
                        zrUtil.clone(self.deepQuery([serie], 'links'))
                    );
                    // Reset data
                    nodePositions = [];
                    nodePrePositions = [];
                    nodeMasses = [];
                    nodeWeights = [];
                    linkWeights = [];
                    nodeMasses = [];
                    nodeShapes = [];
                    linkShapes = [];

                    var area = viewportWidth * viewportHeight;

                    // Formula in 'Graph Drawing by Force-directed Placement'
                    k = 0.5 / attractiveness 
                        * Math.sqrt( area / nodesRawData.length );
                    
                    // 这两方法里需要加上读取self.selectedMap判断当前系列是否显示的逻辑
                    _buildLinkShapes(nodesRawData, linksRawData);
                    _buildNodeShapes(nodesRawData, minRadius, maxRadius);
                }
            }
        }

        function _filterData(nodes, links) {
            var filteredNodeMap = [];
            var cursor = 0;
            nodesRawData = _filter(nodes, function(node, idx) {
                if(!node){
                    return;
                }
                if (self.selectedMap[node.category]) {
                    filteredNodeMap[idx] = cursor++;
                    return true;
                }else{
                    filteredNodeMap[idx] = -1;
                }
            });
            var source;
            var target;
            var ret;
            linksRawData = _filter(links, function(link/*, idx*/){
                source = link.source;
                target = link.target;
                ret = true;
                if (filteredNodeMap[source] >= 0) {
                    link.source = filteredNodeMap[source];
                } else {
                    ret = false;
                }
                if (filteredNodeMap[target] >= 0) {
                    link.target = filteredNodeMap[target];
                } else {
                    ret = false;
                }

                return ret;
            });
        }

        function _buildNodeShapes(nodes, minRadius, maxRadius) {
            // 将值映射到minRadius-maxRadius的范围上
            var radius = [];
            var l = nodes.length;
            for (var i = 0; i < l; i++) {
                var node = nodes[i];
                radius.push(node.value);
            }
            _map(radius, radius, minRadius, maxRadius);
            _normalize(nodeWeights, radius);

            for (var i = 0; i < l; i++) {
                var node = nodes[i];
                var x, y;
                var r = radius[i];

                var random = _randomInSquare(
                    viewportWidth/2, viewportHeight/2, initSize
                );
                x = typeof(node.initial) === 'undefined' 
                    ? random.x
                    : node.initial.x;
                y = typeof(node.initial) === 'undefined'
                    ? random.y
                    : node.initial.y;
                // 初始化位置
                nodePositions[i] = [x, y];
                nodePrePositions[i] = [x, y];
                // 初始化受力
                nodeForces[i] = [0, 0];
                // 初始化加速度
                nodeAccelerations[i] = [0, 0];
                // 初始化质量
                nodeMasses[i] = r * r * density * 0.035;

                var shape = {
                    id : zr.newShapeId(self.type),
                    shape : 'circle',
                    style : {
                        r : r,
                        x : 0,
                        y : 0
                    },
                    highlightStyle : {},
                    position : [x, y],

                    __forceIndex : i
                };

                // Label 
                var labelStyle;
                if (self.deepQuery([forceSerie], 'itemStyle.normal.label.show')
                ) {
                    shape.style.text = node.name;
                    shape.style.textPosition = 'inside';
                    labelStyle = self.deepQuery(
                        [forceSerie], 'itemStyle.normal.label.textStyle'
                    ) || {};
                    shape.style.textColor = labelStyle.color || '#fff';
                    shape.style.textAlign = labelStyle.align || 'center';
                    shape.style.textBaseLine = labelStyle.baseline || 'middle';
                    shape.style.textFont = self.getFont(labelStyle);
                }

                if (self.deepQuery(
                        [forceSerie], 'itemStyle.emphasis.label.show'
                    )
                ) {
                    shape.highlightStyle.text = node.name;
                    shape.highlightStyle.textPosition = 'inside';
                    labelStyle = self.deepQuery(
                        [forceSerie], 'itemStyle.emphasis.label.textStyle'
                    ) || {};
                    shape.highlightStyle.textColor = labelStyle.color || '#fff';
                    shape.highlightStyle.textAlign = labelStyle.align 
                                                     || 'center';
                    shape.highlightStyle.textBaseLine = labelStyle.baseline 
                                                        || 'middle';
                    shape.highlightStyle.textFont = self.getFont(labelStyle);
                }

                // 优先级 node.style > category.style > defaultStyle
                zrUtil.merge(shape.style, nodeStyle);
                zrUtil.merge(shape.highlightStyle, nodeEmphasisStyle);

                if (typeof(node.category) !== 'undefined') {
                    var category = categories[node.category];
                    if (category) {
                        var style = category.itemStyle;
                        if (style) {
                            if (style.normal) {
                                zrUtil.merge(shape.style, style.normal, {
                                    overwrite : true
                                });
                            }
                            if (style.emphasis) {
                                zrUtil.merge(
                                    shape.highlightStyle, 
                                    style.emphasis, 
                                    { overwrite : true }
                                );
                            }
                        }
                    }
                }
                if (typeof(node.itemStyle) !== 'undefined') {
                    var style = node.itemStyle;
                    if( style.normal ){ 
                        zrUtil.merge(shape.style, style.normal, {
                            overwrite : true
                        });
                    }
                    if( style.normal ){ 
                        zrUtil.merge(shape.highlightStyle, style.emphasis, {
                            overwrite : true
                        });
                    }
                }
                
                // 拖拽特性
                self.setCalculable(shape);
                shape.ondragstart = self.shapeHandler.ondragstart;
                shape.draggable = true;
                
                nodeShapes.push(shape);
                self.shapeList.push(shape);

                zr.addShape(shape);


                var categoryName = '';
                if (typeof(node.category) !== 'undefined') {
                    var category = categories[node.category];
                    categoryName = (category && category.name) || '';
                }
                ecData.pack(
                    shape,
                    {
                        name : categoryName
                    },
                    0,
                    node, 0,
                    node.name || ''
                );
            }

            // _normalize(nodeMasses, nodeMasses);
        }

        function _buildLinkShapes(nodes, links) {
            var l = links.length;

            for (var i = 0; i < l; i++) {
                var link = links[i];
                //var source = nodes[link.source];
                // var target = nodes[link.target];
                var weight = link.weight || 1;
                linkWeights.push(weight);

                var shape = {
                    id : zr.newShapeId(self.type),
                    shape : 'line',
                    style : {
                        xStart : 0,
                        yStart : 0,
                        xEnd : 0,
                        yEnd : 0
                    },
                    highlightStyle : {}
                };

                zrUtil.merge(shape.style, linkStyle);
                zrUtil.merge(shape.highlightStyle, linkEmphasisStyle);
                if (typeof(link.itemStyle) !== 'undefined') {
                    if(link.itemStyle.normal){
                        zrUtil.merge(shape.style, link.itemStyle.normal, {
                            overwrite : true
                        });
                    }
                    if(link.itemStyle.emphasis){
                        zrUtil.merge(
                            shape.highlightStyle, 
                            link.itemStyle.emphasis, 
                            { overwrite : true }
                        );
                    }
                }

                linkShapes.push(shape);
                self.shapeList.push(shape);

                zr.addShape(shape);
            }
            _normalize(linkWeights, linkWeights);
        }

        function _updateLinkShapes(){
            for (var i = 0, l = linksRawData.length; i < l; i++) {
                var link = linksRawData[i];
                var linkShape = linkShapes[i];
                var sourceShape = nodeShapes[link.source];
                var targetShape = nodeShapes[link.target];

                linkShape.style.xStart = sourceShape.position[0];
                linkShape.style.yStart = sourceShape.position[1];
                linkShape.style.xEnd = targetShape.position[0];
                linkShape.style.yEnd = targetShape.position[1];
            }
        }

        function _update(stepTime) {
            var len = nodePositions.length;
            var v12 = [];
            // 计算节点之间斥力
            var k2 = k*k;
            // Reset force
            for (var i = 0; i < len; i++) {
                nodeForces[i][0] = 0;
                nodeForces[i][1] = 0;
            }
            for (var i = 0; i < len; i++) {
                for (var j = i+1; j < len; j++){
                    var w1 = nodeWeights[i];
                    var w2 = nodeWeights[j];
                    var p1 = nodePositions[i];
                    var p2 = nodePositions[j];

                    // 节点1到2的向量
                    vec2.sub(v12, p2, p1);
                    var d = vec2.length(v12);
                    // 距离大于500忽略斥力
                    if(d > 500){
                        continue;
                    }
                    if(d < 5){
                        d = 5;
                    }

                    vec2.scale(v12, v12, 1/d);
                    var forceFactor = 1 * (w1 + w2) * k2 / d;

                    vec2.scale(v12, v12, forceFactor);
                    //节点1受到的力
                    vec2.sub(nodeForces[i], nodeForces[i], v12);
                    //节点2受到的力
                    vec2.add(nodeForces[j], nodeForces[j], v12);
                }
            }
            // 计算节点之间引力
            for (var i = 0, l = linksRawData.length; i < l; i++) {
                var link = linksRawData[i];
                var w = linkWeights[i];
                var s = link.source;
                var t = link.target;
                var p1 = nodePositions[s];
                var p2 = nodePositions[t];

                vec2.sub(v12, p2, p1);
                var d2 = vec2.lengthSquare(v12);
                vec2.normalize(v12, v12);

                var forceFactor = w * d2 / k;
                // 节点1受到的力
                vec2.scale(v12, v12, forceFactor);
                vec2.add(nodeForces[s], nodeForces[s], v12);
                // 节点2受到的力
                vec2.sub(nodeForces[t], nodeForces[t], v12);
            }
            // 到质心的向心力
            for (var i = 0, l = nodesRawData.length; i < l; i++){
                var p = nodePositions[i];
                vec2.sub(v12, centroid, p);
                var d2 = vec2.lengthSquare(v12);
                vec2.normalize(v12, v12);
                // 100是可调参数
                var forceFactor = d2 / 100 * centripetal;
                vec2.scale(v12, v12, forceFactor);
                vec2.add(nodeForces[i], nodeForces[i], v12);

            }
            // 计算加速度
            for (var i = 0, l = nodeAccelerations.length; i < l; i++) {
                vec2.scale(
                    nodeAccelerations[i], nodeForces[i], 1 / nodeMasses[i]
                );
            }
            var velocity = [];
            var tmp = [];
            // 计算位置(verlet积分)
            for (var i = 0, l = nodePositions.length; i < l; i++) {
                if (nodesRawData[i].fixed) {
                    // 拖拽同步
                    nodePositions[i][0] = mouseX;
                    nodePositions[i][1] = mouseY;
                    nodePrePositions[i][0] = mouseX;
                    nodePrePositions[i][1] = mouseY;
                    nodeShapes[i].position[0] = mouseX;
                    nodeShapes[i].position[1] = mouseY;
                    continue;
                }
                var p = nodePositions[i];
                var __P = nodePrePositions[i];
                vec2.sub(velocity, p, __P);
                __P[0] = p[0];
                __P[1] = p[1];
                vec2.add(
                    velocity, 
                    velocity, 
                    vec2.scale(tmp, nodeAccelerations[i], stepTime)
                );
                // Damping
                vec2.scale(velocity, velocity, temperature);
                // 防止速度太大
                velocity[0] = Math.max(Math.min(velocity[0], 100), -100);
                velocity[1] = Math.max(Math.min(velocity[1], 100), -100);

                vec2.add(p, p, velocity);
                nodeShapes[i].position[0] = p[0];
                nodeShapes[i].position[1] = p[1];

                if(isNaN(p[0]) || isNaN(p[1])){
                    throw new Error('NaN');
                }
            }
        }

        function _step(){
            if (temperature < 0.01) {
                return;
            }

            _update(stepTime);
            _updateLinkShapes();

            for (var i = 0; i < nodeShapes.length; i++) {
                var shape = nodeShapes[i];
                zr.modShape(shape.id, shape);
            }
            for (var i = 0; i < linkShapes.length; i++) {
                var shape = linkShapes[i];
                zr.modShape(shape.id, shape);
            }

            zr.refresh();

            // Cool Down
            temperature *= coolDown;
        }

        var _updating;

        function init(newOption, newComponent) {
            option = newOption;
            component = newComponent;

            series = option.series;

            self.clear();
            _buildShape();

            _updating = true;
            function cb() {
                if (_updating) {
                    _step();
                    setTimeout(cb, stepTime * 1000);
                }
            }
            setTimeout(cb, stepTime * 1000);
        }

        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
            temperature = 1.0;
        }

        function dispose(){
            _updating = false;
        }
        
        /**
         * 输出动态视觉引导线
         */
        self.shapeHandler.ondragstart = function() {
            self.isDragstart = true;
        };
        
        /**
         * 拖拽开始
         */
        function ondragstart(param) {
            if (!self.isDragstart || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            var shape = param.target;
            var idx = shape.__forceIndex;
            var node = nodesRawData[idx];
            node.fixed = true;

            // 处理完拖拽事件后复位
            self.isDragstart = false;
            
            zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
        }
        
        /**
         * 数据项被拖拽出去，重载基类方法
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            var shape = param.target;
            var idx = shape.__forceIndex;
            var node = nodesRawData[idx];
            node.fixed = false;

            // 别status = {}赋值啊！！
            status.dragIn = true;
            //你自己refresh的话把他设为false，设true就会重新调refresh接口
            status.needRefresh = false;

            // 处理完拖拽事件后复位
            self.isDragend = false;
            
            zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
        }

        // 拖拽中位移信息
        function _onmousemove(param) {
            temperature = 0.8;
            mouseX = zrEvent.getX(param.event);
            mouseY = zrEvent.getY(param.event);
        }
        
        self.init = init;
        self.refresh = refresh;
        self.ondragstart = ondragstart;
        self.ondragend = ondragend;
        self.dispose = dispose;

        init(option, component);
    }


    function _map(output, input, mappedMin, mappedMax) {
        var min = input[0];
        var max = input[0];
        var l = input.length;
        for (var i = 1; i < l; i++) {
            var val = input[i];
            if (val < min) {
                min = val;
            }
            if (val > max) {
                max = val;
            }
        }
        var range = max - min;
        var mappedRange = mappedMax - mappedMin;
        for (var i = 0; i < l; i++) {
            if (range === 0) {
                output[i] = mappedMin;
            } else {
                var val = input[i];
                var percent = (val - min) / range;
                output[i] = mappedRange * percent + mappedMin;
            }
        }
    }

    function _normalize(output, input) {
        var l = input.length;
        var max = input[0];
        for (var i = 1; i < l; i++) {
            if (input[i] > max) {
                max = input[i];
            }
        }
        for (var i = 0; i < l; i++) {
            output[i] = input[i] / max;
        }
    }
    
    /*
    function _randomInCircle(x, y, radius) {
        var theta = Math.random() * Math.PI * 2;
        var r = radius * Math.random();
        return {
            x : Math.cos(theta) * r + x,
            y : Math.sin(theta) * r + y
        };
    }
    */
   
    function _randomInSquare(x, y, size) {
        return {
            x : (Math.random() - 0.5) * size + x,
            y : (Math.random() - 0.5) * size + y
        };
    }

    function _filter(array, callback){
        var len = array.length;
        var result = [];
        for(var i = 0; i < len; i++){
            if(callback(array[i], i)){
                result.push(array[i]);
            }
        }
        return result;
    }

    // 图表注册
    require('../chart').define('force', Force);

    return Force;
});
/**
 * echarts图表类：折线图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/chart/line',['require','../component/base','./calculableBase','../config','../util/ecData','zrender/tool/color','zrender/shape','zrender/shape','../chart'],function(require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Line(messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrColor = require('zrender/tool/color');

        var self = this;
        self.type = ecConfig.CHART_TYPE_LINE;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();

        var _sIndex2ColorMap = {};  // series默认颜色索引，seriesIndex索引到color
        var _symbol = [
              'circle', 'rectangle', 'triangle', 'diamond',
              'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
            ];
        var _sIndex2ShapeMap = {};  // series拐点图形类型，seriesIndex索引到shape type

        require('zrender/shape').get('icon').define(
            'legendLineIcon', legendLineIcon
        );
        
        function _buildShape() {
            self.selectedMap = {};

            // 水平垂直双向series索引 ，position索引到seriesIndex
            var _position2sIndexMap = {
                top : [],
                bottom : [],
                left : [],
                right : []
            };
            var xAxisIndex;
            var yAxisIndex;
            var xAxis;
            var yAxis;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_LINE) {
                    series[i] = self.reformOption(series[i]);
                    xAxisIndex = series[i].xAxisIndex;
                    yAxisIndex = series[i].yAxisIndex;
                    xAxis = component.xAxis.getAxis(xAxisIndex);
                    yAxis = component.yAxis.getAxis(yAxisIndex);
                    if (xAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[xAxis.getPosition()].push(i);
                    }
                    else if (yAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[yAxis.getPosition()].push(i);
                    }
                }
            }
            //console.log(_position2sIndexMap)
            for (var position in _position2sIndexMap) {
                if (_position2sIndexMap[position].length > 0) {
                    _buildSinglePosition(
                        position, _position2sIndexMap[position]
                    );
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建单个方向上的折线图
         *
         * @param {number} seriesIndex 系列索引
         */
        function _buildSinglePosition(position, seriesArray) {
            var mapData = _mapData(seriesArray);
            var locationMap = mapData.locationMap;
            var maxDataLength = mapData.maxDataLength;

            if (maxDataLength === 0 || locationMap.length === 0) {
                return;
            }

            switch (position) {
                case 'bottom' :
                case 'top' :
                    _buildHorizontal(maxDataLength, locationMap);
                    break;
                case 'left' :
                case 'right' :
                    _buildVertical(maxDataLength, locationMap);
                    break;
            }
        }

        /**
         * 数据整形
         * 数组位置映射到系列索引
         */
        function _mapData(seriesArray) {
            var serie;                              // 临时映射变量
            var dataIndex = 0;                      // 堆叠数据所在位置映射
            var stackMap = {};                      // 堆叠数据位置映射，堆叠组在二维中的第几项
            var magicStackKey = '__kener__stack__'; // 堆叠命名，非堆叠数据安单一堆叠处理
            var stackKey;                           // 临时映射变量
            var serieName;                          // 临时映射变量
            var legend = component.legend;
            var locationMap = [];                   // 需要返回的东西：数组位置映射到系列索引
            var maxDataLength = 0;                  // 需要返回的东西：最大数据长度
            var iconShape;
            // 计算需要显示的个数和分配位置并记在下面这个结构里
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                serie = series[seriesArray[i]];
                serieName = serie.name;
                
                _sIndex2ShapeMap[seriesArray[i]]
                    = _sIndex2ShapeMap[seriesArray[i]]
                      || self.deepQuery([serie],'symbol')
                      || _symbol[i % _symbol.length];
                      
                if (legend){
                    self.selectedMap[serieName] = legend.isSelected(serieName);
                    
                    _sIndex2ColorMap[seriesArray[i]]
                        = legend.getColor(serieName);
                        
                    iconShape = legend.getItemShape(serieName);
                    if (iconShape) {
                        // 回调legend，换一个更形象的icon
                        iconShape.shape = 'icon';
                        iconShape.style.iconType = 'legendLineIcon';
                        iconShape.style.symbol = 
                            _sIndex2ShapeMap[seriesArray[i]];
                        legend.setItemShape(serieName, iconShape);
                    }
                } else {
                    self.selectedMap[serieName] = true;
                    _sIndex2ColorMap[seriesArray[i]]
                        = zr.getColor(seriesArray[i]);
                }

                if (self.selectedMap[serieName]) {
                    stackKey = serie.stack || (magicStackKey + seriesArray[i]);
                    if (typeof stackMap[stackKey] == 'undefined') {
                        stackMap[stackKey] = dataIndex;
                        locationMap[dataIndex] = [seriesArray[i]];
                        dataIndex++;
                    }
                    else {
                        // 已经分配了位置就推进去就行
                        locationMap[stackMap[stackKey]].push(seriesArray[i]);
                    }
                }
                // 兼职帮算一下最大长度
                maxDataLength = Math.max(maxDataLength, serie.data.length);
            }

            /* 调试输出
            var s = '';
            for (var i = 0, l = maxDataLength; i < l; i++) {
                s = '[';
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    s +='['
                    for (var m = 0, n = locationMap[j].length - 1; m < n; m++) {
                        s += series[locationMap[j][m]].data[i] + ','
                    }
                    s += series[locationMap[j][locationMap[j].length - 1]]
                         .data[i];
                    s += ']'
                }
                s += ']';
                console.log(s);
            }
            console.log(locationMap)
            */

            return {
                locationMap : locationMap,
                maxDataLength : maxDataLength
            };
        }

        /**
         * 构建类目轴为水平方向的折线图系列
         */
        function _buildHorizontal(maxDataLength, locationMap) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var xAxisIndex = serie.xAxisIndex;
            var categoryAxis = component.xAxis.getAxis(xAxisIndex);
            var yAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var x;
            var y;
            var lastYP; // 正向堆叠处理
            var baseYP;
            var lastYN; // 负向堆叠处理
            var baseYN;
            var finalPLMap = {}; // 完成的point list(PL)
            var curPLMap = {};   // 正在记录的point list(PL)
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                x = categoryAxis.getCoordByIndex(i);
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    // 堆叠数据用第一条valueAxis
                    yAxisIndex = series[locationMap[j][0]].yAxisIndex || 0;
                    valueAxis = component.yAxis.getAxis(yAxisIndex);
                    baseYP = lastYP = baseYN = lastYN = valueAxis.getCoord(0);
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        curPLMap[seriesIndex] = curPLMap[seriesIndex] || [];
                        if (value == '-') {
                            // 空数据则把正在记录的curPLMap添加到finalPLMap中
                            if (curPLMap[seriesIndex].length > 0) {
                                finalPLMap[seriesIndex] =
                                    finalPLMap[seriesIndex] || [];

                                finalPLMap[seriesIndex].push(
                                    curPLMap[seriesIndex]
                                );

                                curPLMap[seriesIndex] = [];
                            }
                            continue;
                        }
                        y = valueAxis.getCoord(value);
                        if (value >= 0) {
                            // 正向堆叠
                            lastYP -= (baseYP - y);
                            y = lastYP;
                        }
                        else if (value < 0){
                            // 负向堆叠
                            lastYN += y - baseYN;
                            y = lastYN;
                        }
                        curPLMap[seriesIndex].push(
                            [x, y, i, categoryAxis.getNameByIndex(i), x, baseYP]
                        );
                    }
                }
                // 补充空数据的拖拽提示
                lastYP = component.grid.getY();
                var symbolSize;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value != '-') {
                            // 只关心空数据
                            continue;
                        }
                        if (self.deepQuery(
                                [data, serie, option], 'calculable'
                            )
                        ) {
                            symbolSize = self.deepQuery(
                                [data, serie],
                                'symbolSize'
                            );
                            lastYP += symbolSize * 2 + 5;
                            y = lastYP;
                            self.shapeList.push(_getCalculableItem(
                                seriesIndex, i, categoryAxis.getNameByIndex(i),
                                x, y
                            ));
                        }
                    }
                }
            }

            // 把剩余未完成的curPLMap全部添加到finalPLMap中
            for (var sId in curPLMap) {
                if (curPLMap[sId].length > 0) {
                    finalPLMap[sId] = finalPLMap[sId] || [];
                    finalPLMap[sId].push(curPLMap[sId]);
                    curPLMap[sId] = [];
                }
            }
            _buildBorkenLine(finalPLMap, categoryAxis, 'horizontal');
        }

        /**
         * 构建类目轴为垂直方向的折线图系列
         */
        function _buildVertical(maxDataLength, locationMap) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var yAxisIndex = serie.yAxisIndex;
            var categoryAxis = component.yAxis.getAxis(yAxisIndex);
            var xAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var x;
            var y;
            var lastXP; // 正向堆叠处理
            var baseXP;
            var lastXN; // 负向堆叠处理
            var baseXN;
            var finalPLMap = {}; // 完成的point list(PL)
            var curPLMap = {};   // 正在记录的point list(PL)
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                y = categoryAxis.getCoordByIndex(i);
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    // 堆叠数据用第一条valueAxis
                    xAxisIndex = series[locationMap[j][0]].xAxisIndex || 0;
                    valueAxis = component.xAxis.getAxis(xAxisIndex);
                    baseXP = lastXP = baseXN = lastXN = valueAxis.getCoord(0);
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        curPLMap[seriesIndex] = curPLMap[seriesIndex] || [];
                        if (value == '-') {
                            // 空数据则把正在记录的curPLMap添加到finalPLMap中
                            if (curPLMap[seriesIndex].length > 0) {
                                finalPLMap[seriesIndex] =
                                    finalPLMap[seriesIndex] || [];

                                finalPLMap[seriesIndex].push(
                                    curPLMap[seriesIndex]
                                );

                                curPLMap[seriesIndex] = [];
                            }
                            continue;
                        }
                        x = valueAxis.getCoord(value);
                        if (value >= 0) {
                            // 正向堆叠
                            lastXP += x - baseXP;
                            x = lastXP;
                        }
                        else if (value < 0){
                            // 负向堆叠
                            lastXN -= baseXN - x;
                            x = lastXN;
                        }
                        curPLMap[seriesIndex].push(
                            [x, y, i, categoryAxis.getNameByIndex(i), baseXP, y]
                        );
                    }
                }
                // 补充空数据的拖拽提示
                lastXP = component.grid.getXend();
                var symbolSize;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value != '-') {
                            // 只关心空数据
                            continue;
                        }
                        if (self.deepQuery(
                                [data, serie, option], 'calculable'
                            )
                        ) {
                            symbolSize = self.deepQuery(
                                [data, serie],
                                'symbolSize'
                            );
                            lastXP -= symbolSize * 2 + 5;
                            x = lastXP;
                            self.shapeList.push(_getCalculableItem(
                                seriesIndex, i, categoryAxis.getNameByIndex(i),
                                x, y
                            ));
                        }
                    }
                }
            }

            // 把剩余未完成的curPLMap全部添加到finalPLMap中
            for (var sId in curPLMap) {
                if (curPLMap[sId].length > 0) {
                    finalPLMap[sId] = finalPLMap[sId] || [];
                    finalPLMap[sId].push(curPLMap[sId]);
                    curPLMap[sId] = [];
                }
            }
            //console.log(finalPLMap);
            _buildBorkenLine(finalPLMap, categoryAxis, 'vertical');
        }

        /**
         * 生成折线和折线上的拐点
         */
        function _buildBorkenLine(pointList, categoryAxis, orient) {
            var defaultColor;

            // 折线相关
            var lineWidth;
            var lineType;
            var lineColor;
            var normalColor;
            var emphasisColor;

            // 填充相关
            var isFill;
            var fillNormalColor;

            var serie;
            var data;
            var seriesPL;
            var singlePL;

            // 堆叠层叠需求，反顺序构建
            for (var seriesIndex = series.length - 1;
                seriesIndex >= 0;
                seriesIndex--
            ) {
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];
                if (serie.type == ecConfig.CHART_TYPE_LINE
                    && typeof seriesPL != 'undefined'
                ) {
                    defaultColor = _sIndex2ColorMap[seriesIndex];
                    // 多级控制
                    lineWidth = self.deepQuery(
                        [serie], 'itemStyle.normal.lineStyle.width'
                    );
                    lineType = self.deepQuery(
                        [serie], 'itemStyle.normal.lineStyle.type'
                    );
                    lineColor = self.deepQuery(
                        [serie], 'itemStyle.normal.lineStyle.color'
                    );
                    normalColor = self.deepQuery(
                        [serie], 'itemStyle.normal.color'
                    );
                    emphasisColor = self.deepQuery(
                        [serie], 'itemStyle.emphasis.color'
                    );

                    isFill = typeof self.deepQuery(
                        [serie], 'itemStyle.normal.areaStyle'
                    ) != 'undefined';

                    fillNormalColor = self.deepQuery(
                        [serie], 'itemStyle.normal.areaStyle.color'
                    );

                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePL = seriesPL[i];
                        for (var j = 0, k = singlePL.length; j < k; j++) {
                            data = serie.data[singlePL[j][2]];
                            if (self.deepQuery(
                                    [data, serie], 'showAllSymbol'
                                ) // 全显示
                                || (categoryAxis.isMainAxis(singlePL[j][2])
                                    && self.deepQuery(
                                           [data, serie], 'symbol'
                                       ) != 'none'
                                   ) // 主轴非空
                                || self.deepQuery(
                                        [data, serie, option],
                                        'calculable'
                                   ) // 可计算
                            ) {
                                self.shapeList.push(_getSymbol(
                                    seriesIndex,
                                    singlePL[j][2], // dataIndex
                                    singlePL[j][3], // name
                                    singlePL[j][0], // x
                                    singlePL[j][1], // y
                                    self.deepQuery(
                                        [data], 'itemStyle.normal.color'
                                    ) || normalColor
                                      || defaultColor,
                                    self.deepQuery(
                                        [data], 'itemStyle.emphasis.color'
                                    ) || emphasisColor
                                      || normalColor
                                      || defaultColor,
                                    lineWidth,
                                    self.deepQuery(
                                        [data, serie], 'symbolRotate'
                                    )
                                ));
                            }

                        }
                        // 折线图
                        self.shapeList.push({
                            shape : 'brokenLine',
                            zlevel : _zlevelBase,
                            style : {
                                pointList : singlePL,
                                strokeColor : lineColor
                                              || normalColor
                                              || defaultColor,
                                lineWidth : lineWidth,
                                lineType : lineType,
                                shadowColor : self.deepQuery(
                                  [serie],
                                  'itemStyle.normal.lineStyle.shadowColor'
                                ),
                                shadowBlur: self.deepQuery(
                                  [serie],
                                  'itemStyle.normal.lineStyle.shadowBlur'
                                ),
                                shadowOffsetX: self.deepQuery(
                                  [serie],
                                  'itemStyle.normal.lineStyle.shadowOffsetX'
                                ),
                                shadowOffsetY: self.deepQuery(
                                  [serie],
                                  'itemStyle.normal.lineStyle.shadowOffsetY'
                                )
                            },
                            hoverable : false,
                            _main : true,
                            _seriesIndex : seriesIndex,
                            _orient : orient
                        });
                        
                        if (isFill) {
                            self.shapeList.push({
                                shape : 'polygon',
                                zlevel : _zlevelBase,
                                style : {
                                    pointList : singlePL.concat([
                                        [
                                            singlePL[singlePL.length - 1][4],
                                            singlePL[singlePL.length - 1][5] - 2
                                        ],
                                        [
                                            singlePL[0][4],
                                            singlePL[0][5] - 2
                                        ]
                                    ]),
                                    brushType : 'fill',
                                    color : fillNormalColor
                                            ? fillNormalColor
                                            : zrColor.alpha(defaultColor,0.5)
                                },
                                hoverable : false,
                                _main : true,
                                _seriesIndex : seriesIndex,
                                _orient : orient
                            });
                        }
                    }
            }
            }
        }

        /**
         * 生成空数据所需的可计算提示图形
         */
        function _getCalculableItem(seriesIndex, dataIndex, name, x, y) {
            var color = series[seriesIndex].calculableHolderColor
                        || ecConfig.calculableHolderColor;

            var itemShape = _getSymbol(
                seriesIndex, dataIndex, name,
                x, y,
                color,
                _sIndex2ColorMap[seriesIndex],
                2
            );

            itemShape.hoverable = false;
            itemShape.draggable = false;
            itemShape.highlightStyle.lineWidth = 20;

            return itemShape;
        }

        /**
         * 生成折线图上的拐点图形
         */
        function _getSymbol(
            seriesIndex, dataIndex, name, x, y,
            normalColor, emphasisColor, lineWidth, rotate
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var symbol = self.deepQuery([data], 'symbol')
                         || _sIndex2ShapeMap[seriesIndex]
                         || 'cricle';
            var symbolSize = self.deepQuery([data, serie],'symbolSize');

            var itemShape = {
                shape : 'icon',
                zlevel : _zlevelBase + 1,
                style : {
                    iconType : symbol.replace('empty', '').toLowerCase(),
                    x : x - symbolSize,
                    y : y - symbolSize,
                    width : symbolSize * 2,
                    height : symbolSize * 2,
                    brushType : 'both',
                    color : symbol.match('empty') ? '#fff' : normalColor,
                    strokeColor : normalColor,
                    lineWidth: lineWidth * 2
                },
                highlightStyle : {
                    color : emphasisColor,
                    strokeColor : emphasisColor
                },
                clickable : true
            };
            
            if (typeof rotate != 'undefined') {
                itemShape.rotation = [
                    rotate * Math.PI / 180, x, y
                ];
            }
            
            if (symbol.match('star')) {
                itemShape.style.iconType = 'star';
                itemShape.style.n = 
                    (symbol.replace('empty', '').replace('star','') - 0) || 5;
            }
            
            if (symbol == 'none') {
                itemShape.invisible = true;
                itemShape.hoverable = false;
            }

            if (self.deepQuery([data, serie, option], 'calculable')) {
                self.setCalculable(itemShape);
                itemShape.draggable = true;
            }

            ecData.pack(
                itemShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );

            itemShape._x = x;
            itemShape._y = y;
            itemShape._dataIndex = dataIndex;
            itemShape._seriesIndex = seriesIndex;

            return itemShape;
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            component = newComponent;
            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
        }

        /**
         * 动态数据增加动画 
         */
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var x;
            var dx;
            var y;
            var dy;
            var seriesIndex;
            var pointList;
            var isHorizontal; // 是否横向布局， isHorizontal;
            for (var i = self.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = self.shapeList[i]._seriesIndex;
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    // 有数据删除才有移动的动画
                    if (self.shapeList[i]._main) {
                        pointList = self.shapeList[i].style.pointList;
                        // 主线动画
                        dx = Math.abs(pointList[0][0] - pointList[1][0]);
                        dy = Math.abs(pointList[0][1] - pointList[1][1]);
                        isHorizontal = 
                            self.shapeList[i]._orient == 'horizontal';
                            
                        if (aniMap[seriesIndex][2]) {
                            // 队头加入删除末尾
                            if (self.shapeList[i].shape == 'polygon') {
                                //区域图
                                var len = pointList.length;
                                self.shapeList[i].style.pointList[len - 3]
                                    = pointList[len - 2];
                                isHorizontal
                                ? (self.shapeList[i].style.pointList[len - 3][0]
                                       = pointList[len - 4][0]
                                  )
                                : (self.shapeList[i].style.pointList[len - 3][1]
                                       = pointList[len - 4][1]
                                  );
                                self.shapeList[i].style.pointList[len - 2]
                                    = pointList[len - 1];
                            }
                            self.shapeList[i].style.pointList.pop();
                            
                            isHorizontal ? (x = dx, y = 0) : (x = 0, y = -dy);
                        }
                        else {
                            // 队尾加入删除头部
                            self.shapeList[i].style.pointList.shift();
                            if (self.shapeList[i].shape == 'polygon') {
                                //区域图
                                var targetPoint = 
                                    self.shapeList[i].style.pointList.pop();
                                isHorizontal
                                ? (targetPoint[0] = pointList[0][0])
                                : (targetPoint[1] = pointList[0][1]);
                                self.shapeList[i].style.pointList.push(
                                    targetPoint
                                );
                            }
                            isHorizontal ? (x = -dx, y = 0) : (x = 0, y = dy);
                        }
                        zr.modShape(self.shapeList[i].id, {
                            style : {
                                pointList : self.shapeList[i].style.pointList
                            }
                        });
                    }
                    else {
                        // 拐点动画
                        if (aniMap[seriesIndex][2] 
                            && self.shapeList[i]._dataIndex 
                                == series[seriesIndex].data.length - 1
                        ) {
                            // 队头加入删除末尾
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                        else if (!aniMap[seriesIndex][2] 
                                 && self.shapeList[i]._dataIndex === 0
                        ) {
                            // 队尾加入删除头部
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                    }
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            500,
                            {position : [x, y]}
                        )
                        .start();
                }
            }
        }
        
        /**
         * 动画设定
         */
        function animation() {
            var duration = self.deepQuery([option], 'animationDuration');
            var easing = self.deepQuery([option], 'animationEasing');
            var x;
            var y;
            var serie;
            var dataIndex = 0;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i]._main) {
                    serie = series[self.shapeList[i]._seriesIndex];
                    dataIndex += 1;
                    x = self.shapeList[i].style.pointList[0][0];
                    y = self.shapeList[i].style.pointList[0][1];
                    if (self.shapeList[i]._orient == 'horizontal') {
                        zr.modShape(self.shapeList[i].id, {
                            scale : [0, 1, x, y]
                        });
                    }
                    else {
                        zr.modShape(self.shapeList[i].id, {
                            scale : [1, 0, x, y]
                        });
                    }
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            (self.deepQuery([serie],'animationDuration')
                            || duration)
                            + dataIndex * 100,

                            {scale : [1, 1, x, y]},

                            (self.deepQuery([serie], 'animationEasing')
                            || easing)
                        )
                        .start();
                }
                else {
                    x = self.shapeList[i]._x || 0;
                    y = self.shapeList[i]._y || 0;
                    zr.modShape(self.shapeList[i].id, {
                        scale : [0, 0, x, y]
                    });
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            duration,
                            {scale : [1, 1, x, y]},
                            'QuinticOut'
                        )
                        .start();
                }
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.addDataAnimation = addDataAnimation;
        self.animation = animation;

        init(option, component);
    }

    function legendLineIcon(ctx, style) {
        var x = style.x;
        var y = style.y;
        var width = style.width;
        var height = style.height;
        
        var dy = height / 2;
        ctx.moveTo(x, y + dy);
        ctx.lineTo(x + width, y + dy);
        
        if (style.symbol.match('empty')) {
            ctx.fillStyle = '#fff';
        }
        style.brushType = 'both';
        
        var symbol = style.symbol.replace('empty', '').toLowerCase();
        if (symbol.match('star')) {
            dy = (symbol.replace('star','') - 0) || 5;
            y -= 1;
            symbol = 'star';
        } 
        else if (symbol == 'rectangle') {
            x += (width - height) / 2;
            width = height;
        }
        symbol = require('zrender/shape').get('icon').get(symbol);
        
        if (symbol) {
            symbol(ctx, {
                x : x + 3,
                y : y + 3,
                width : width - 6,
                height : height - 6,
                n : dy
            });
        }
    }
        
    // 图表注册
    require('../chart').define('line', Line);
    
    return Line;
});
/**
 * echarts图表类：柱形图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/chart/bar',['require','../component/base','./calculableBase','../config','../util/ecData','../chart'],function(require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Bar(messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var self = this;
        self.type = ecConfig.CHART_TYPE_BAR;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();

        var _sIndex2colorMap = {};  // series默认颜色索引，seriesIndex索引到color

        function _buildShape() {
            self.selectedMap = {};

            // 水平垂直双向series索引 ，position索引到seriesIndex
            var _position2sIndexMap = {
                top : [],
                bottom : [],
                left : [],
                right : []
            };
            var xAxisIndex;
            var yAxisIndex;
            var xAxis;
            var yAxis;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_BAR) {
                    series[i] = self.reformOption(series[i]);
                    xAxisIndex = series[i].xAxisIndex;
                    yAxisIndex = series[i].yAxisIndex;
                    xAxis = component.xAxis.getAxis(xAxisIndex);
                    yAxis = component.yAxis.getAxis(yAxisIndex);
                    if (xAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[xAxis.getPosition()].push(i);
                    }
                    else if (yAxis.type == ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        _position2sIndexMap[yAxis.getPosition()].push(i);
                    }
                }
            }
            // console.log(_position2sIndexMap)
            for (var position in _position2sIndexMap) {
                if (_position2sIndexMap[position].length > 0) {
                    _buildSinglePosition(
                        position, _position2sIndexMap[position]
                    );
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建单个方向上的柱形图
         *
         * @param {number} seriesIndex 系列索引
         */
        function _buildSinglePosition(position, seriesArray) {
            var mapData = _mapData(seriesArray);
            var locationMap = mapData.locationMap;
            var maxDataLength = mapData.maxDataLength;

            if (maxDataLength === 0 || locationMap.length === 0) {
                return;
            }

            switch (position) {
                case 'bottom' :
                case 'top' :
                    _buildHorizontal(maxDataLength, locationMap);
                    break;
                case 'left' :
                case 'right' :
                    _buildVertical(maxDataLength, locationMap);
                    break;
            }
        }


        /**
         * 数据整形
         * 数组位置映射到系列索引
         */
        function _mapData(seriesArray) {
            var serie;                              // 临时映射变量
            var dataIndex = 0;                      // 堆叠数据所在位置映射
            var stackMap = {};                      // 堆叠数据位置映射，堆叠组在二维中的第几项
            var magicStackKey = '__kener__stack__'; // 堆叠命名，非堆叠数据安单一堆叠处理
            var stackKey;                           // 临时映射变量
            var serieName;                          // 临时映射变量
            var legend = component.legend;
            var locationMap = [];                   // 需要返回的东西：数组位置映射到系列索引
            var maxDataLength = 0;                  // 需要返回的东西：最大数据长度
            // 计算需要显示的个数和分配位置并记在下面这个结构里
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                serie = series[seriesArray[i]];
                serieName = serie.name;
                if (legend){
                    self.selectedMap[serieName] = legend.isSelected(serieName);
                    _sIndex2colorMap[seriesArray[i]] =
                        legend.getColor(serieName);
                } else {
                    self.selectedMap[serieName] = true;
                    _sIndex2colorMap[seriesArray[i]] =
                        zr.getColor(seriesArray[i]);
                }

                if (self.selectedMap[serieName]) {
                    stackKey = serie.stack || (magicStackKey + seriesArray[i]);
                    if (typeof stackMap[stackKey] == 'undefined') {
                        stackMap[stackKey] = dataIndex;
                        locationMap[dataIndex] = [seriesArray[i]];
                        dataIndex++;
                    }
                    else {
                        // 已经分配了位置就推进去就行
                        locationMap[stackMap[stackKey]].push(seriesArray[i]);
                    }
                }
                // 兼职帮算一下最大长度
                maxDataLength = Math.max(maxDataLength, serie.data.length);
            }

            /* 调试输出
            var s = '';
            for (var i = 0, l = maxDataLength; i < l; i++) {
                s = '[';
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    s +='['
                    for (var m = 0, n = locationMap[j].length - 1; m < n; m++) {
                        s += series[locationMap[j][m]].data[i] + ','
                    }
                    s += series[locationMap[j][locationMap[j].length - 1]]
                         .data[i];
                    s += ']'
                }
                s += ']';
                console.log(s);
            }
            console.log(locationMap)
            */

            return {
                locationMap : locationMap,
                maxDataLength : maxDataLength
            };
        }

        /**
         * 构建类目轴为水平方向的柱形图系列
         */
        function _buildHorizontal(maxDataLength, locationMap) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var xAxisIndex = serie.xAxisIndex;
            var categoryAxis = component.xAxis.getAxis(xAxisIndex);
            var yAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var size = _mapSize(categoryAxis, locationMap);
            var gap = size.gap;
            var barGap = size.barGap;
            var barWidthMap = size.barWidthMap;
            var barWidth = size.barWidth;                   // 自适应宽度
            var barMinHeightMap = size.barMinHeightMap;
            var barHeight;

            var x;
            var y;
            var lastYP; // 正向堆叠处理
            var baseYP;
            var lastYN; // 负向堆叠处理
            var baseYN;
            var barShape;
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                x = categoryAxis.getCoordByIndex(i) - gap / 2;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    // 堆叠数据用第一条valueAxis
                    yAxisIndex = series[locationMap[j][0]].yAxisIndex || 0;
                    valueAxis = component.yAxis.getAxis(yAxisIndex);
                    baseYP = lastYP = valueAxis.getCoord(0) - 1;
                    baseYN = lastYN = lastYP + 2;
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value == '-') {
                            // 空数据在做完后补充拖拽提示框
                            continue;
                        }
                        y = valueAxis.getCoord(value);
                        if (value > 0) {
                            // 正向堆叠
                            barHeight = baseYP - y;
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            lastYP -= barHeight;
                            y = lastYP;
                            lastYP -= 0.5; //白色视觉分隔线宽修正
                        }
                        else if (value < 0){
                            // 负向堆叠
                            barHeight = y - baseYN;
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            y = lastYN;
                            lastYN += barHeight;
                            lastYN += 0.5; //白色视觉分隔线宽修正
                        }
                        else {
                            // 0值
                            barHeight = baseYP - y;
                            // 最小高度无效
                            lastYP -= barHeight;
                            y = lastYP;
                            lastYP -= 0.5; //白色视觉分隔线宽修正
                        }

                        barShape = _getBarItem(
                            seriesIndex, i,
                            categoryAxis.getNameByIndex(i),
                            x, y,
                            barWidthMap[seriesIndex] || barWidth,
                            barHeight
                        );
                        barShape._orient = 'vertical';

                        self.shapeList.push(barShape);
                    }

                    // 补充空数据的拖拽提示框
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value != '-') {
                            // 只关心空数据
                            continue;
                        }

                        if (self.deepQuery(
                                [data, serie, option], 'calculable'
                            )
                        ) {
                            lastYP -= barMinHeightMap[seriesIndex];
                            y = lastYP;

                            barShape = _getBarItem(
                                seriesIndex, i,
                                categoryAxis.getNameByIndex(i),
                                x + 1, y,
                                (barWidthMap[seriesIndex] || barWidth) - 2,
                                barMinHeightMap[seriesIndex]
                            );
                            barShape.hoverable = false;
                            barShape.draggable = false;
                            barShape.style.brushType = 'stroke';
                            barShape.style.strokeColor =
                                    serie.calculableHolderColor
                                    || ecConfig.calculableHolderColor;

                            self.shapeList.push(barShape);
                        }
                    }

                    x += ((barWidthMap[seriesIndex] || barWidth) + barGap);
                }
            }
        }

        /**
         * 构建类目轴为垂直方向的柱形图系列
         */
        function _buildVertical(maxDataLength, locationMap) {
            // 确定类目轴和数值轴，同一方向随便找一个即可
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var yAxisIndex = serie.yAxisIndex;
            var categoryAxis = component.yAxis.getAxis(yAxisIndex);
            var xAxisIndex; // 数值轴各异
            var valueAxis;  // 数值轴各异

            var size = _mapSize(categoryAxis, locationMap);
            var gap = size.gap;
            var barGap = size.barGap;
            var barWidthMap = size.barWidthMap;
            var barWidth = size.barWidth;                   // 自适应宽度
            var barMinHeightMap = size.barMinHeightMap;
            var barHeight;

            var x;
            var y;
            var lastXP; // 正向堆叠处理
            var baseXP;
            var lastXN; // 负向堆叠处理
            var baseXN;
            var barShape;
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (typeof categoryAxis.getNameByIndex(i) == 'undefined') {
                    // 系列数据超出类目轴长度
                    break;
                }
                y = categoryAxis.getCoordByIndex(i) + gap / 2;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    // 堆叠数据用第一条valueAxis
                    xAxisIndex = series[locationMap[j][0]].xAxisIndex || 0;
                    valueAxis = component.xAxis.getAxis(xAxisIndex);
                    baseXP = lastXP = valueAxis.getCoord(0) + 1;
                    baseXN = lastXN = lastXP - 2;
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value == '-') {
                            // 空数据在做完后补充拖拽提示框
                            continue;
                        }
                        x = valueAxis.getCoord(value);
                        if (value > 0) {
                            // 正向堆叠
                            barHeight = x - baseXP;
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            x = lastXP;
                            lastXP += barHeight;
                            lastXP += 0.5; //白色视觉分隔线宽修正
                        }
                        else if (value < 0){
                            // 负向堆叠
                            barHeight = baseXN - x;
                            // 非堆叠数据最小高度有效
                            if (n == 1
                                && barMinHeightMap[seriesIndex] > barHeight
                            ) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            lastXN -= barHeight;
                            x = lastXN;
                            lastXN -= 0.5; //白色视觉分隔线宽修正
                        }
                        else {
                            // 0值
                            barHeight = x - baseXP;
                            // 最小高度无效
                            x = lastXP;
                            lastXP += barHeight;
                            lastXP += 0.5; //白色视觉分隔线宽修正
                        }

                        barShape = _getBarItem(
                            seriesIndex, i,
                            categoryAxis.getNameByIndex(i),
                            x, y - (barWidthMap[seriesIndex] || barWidth),
                            barHeight,
                            barWidthMap[seriesIndex] || barWidth
                        );
                        barShape._orient = 'horizontal';

                        self.shapeList.push(barShape);
                    }

                    // 补充空数据的拖拽提示框
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = typeof data != 'undefined'
                                ? (typeof data.value != 'undefined'
                                  ? data.value
                                  : data)
                                : '-';
                        if (value != '-') {
                            // 只关心空数据
                            continue;
                        }

                        if (self.deepQuery(
                                [data, serie, option], 'calculable'
                            )
                        ) {
                            x = lastXP;
                            lastXP += barMinHeightMap[seriesIndex];

                            barShape = _getBarItem(
                                seriesIndex,
                                i,
                                categoryAxis.getNameByIndex(i),
                                x,
                                y + 1 - (barWidthMap[seriesIndex] || barWidth),
                                barMinHeightMap[seriesIndex],
                                (barWidthMap[seriesIndex] || barWidth) - 2
                            );
                            barShape.hoverable = false;
                            barShape.draggable = false;
                            barShape.style.brushType = 'stroke';
                            barShape.style.strokeColor =
                                    serie.calculableHolderColor
                                    || ecConfig.calculableHolderColor;

                            self.shapeList.push(barShape);
                        }
                    }

                    y -= ((barWidthMap[seriesIndex] || barWidth) + barGap);
                }
            }
        }
        /**
         * 我真是自找麻烦啊，为啥要允许系列级个性化最小宽度和高度啊！！！
         * @param {CategoryAxis} categoryAxis 类目坐标轴，需要知道类目间隔大小
         * @param {Array} locationMap 整形数据的系列索引
         */
        function _mapSize(categoryAxis, locationMap, ignoreUserDefined) {
            var barWidthMap = {};
            var barMinHeightMap = {};
            var sBarWidth;
            var sBarWidthCounter = 0;
            var sBarWidthTotal = 0;
            var sBarMinHeight;
            var hasFound;

            for (var j = 0, k = locationMap.length; j < k; j++) {
                hasFound = false;   // 同一堆叠第一个barWidth生效
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    seriesIndex = locationMap[j][m];
                    if (!ignoreUserDefined) {
                        if (!hasFound) {
                            sBarWidth = self.deepQuery(
                                [series[seriesIndex]],
                                'barWidth'
                            );
                            if (typeof sBarWidth != 'undefined') {
                                barWidthMap[seriesIndex] = sBarWidth;
                                sBarWidthTotal += sBarWidth;
                                sBarWidthCounter++;
                                hasFound = true;
                            }
                        } else {
                            barWidthMap[seriesIndex] = sBarWidth;   // 用找到的一个
                        }
                    }

                    sBarMinHeight = self.deepQuery(
                        [series[seriesIndex]],
                        'barMinHeight'
                    );
                    if (typeof sBarMinHeight != 'undefined') {
                        barMinHeightMap[seriesIndex] = sBarMinHeight;
                    }
                }
            }

            var gap;
            var barWidth;
            var barGap;
            if (locationMap.length != sBarWidthCounter) {
                // 至少存在一个自适应宽度的柱形图
                gap = Math.round(categoryAxis.getGap() * 4 / 5);
                barWidth = Math.round(
                        ((gap - sBarWidthTotal) * 3)
                        / (4 * (locationMap.length) - 3 * sBarWidthCounter - 1)
                    );
                barGap = Math.round(barWidth / 3);
                if (barWidth < 0) {
                    // 无法满足用户定义的宽度设计，忽略用户宽度，打回重做
                    return _mapSize(categoryAxis, locationMap, true);
                }
            }
            else {
                // 全是自定义宽度
                barWidth = 0;
                barGap = Math.round((sBarWidthTotal / sBarWidthCounter) / 3);
                gap = sBarWidthTotal + barGap * (sBarWidthCounter - 1);
                if (Math.round(categoryAxis.getGap() * 4 / 5) < gap) {
                    // 无法满足用户定义的宽度设计，忽略用户宽度，打回重做
                    return _mapSize(categoryAxis, locationMap, true);
                }
            }


            return {
                barWidthMap : barWidthMap,
                barMinHeightMap : barMinHeightMap ,
                gap : gap,
                barWidth : barWidth,
                barGap : barGap
            };
        }

        /**
         * 生成最终图形数据
         */
        function _getBarItem(
            seriesIndex, dataIndex, name, x, y, width, height
        ) {
            var barShape;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            // 多级控制
            var defaultColor = _sIndex2colorMap[seriesIndex];
            var normalColor = self.deepQuery(
                [data, serie],
                'itemStyle.normal.color'
            );
            var emphasisColor = self.deepQuery(
                [data, serie],
                'itemStyle.emphasis.color'
            );

            barShape = {
                shape : 'rectangle',
                zlevel : _zlevelBase,
                clickable: true,
                style : {
                    x : x,
                    y : y,
                    width : width,
                    height : height,
                    brushType : 'both',
                    color : normalColor || defaultColor,
                    strokeColor : '#fff'
                },
                highlightStyle : {
                    color : emphasisColor || normalColor || defaultColor
                }
            };

            if (self.deepQuery(
                    [data, serie, option],
                    'calculable'
                )
            ) {
                self.setCalculable(barShape);
                barShape.draggable = true;
            }

            ecData.pack(
                barShape,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                name
            );

            return barShape;
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            component = newComponent;
            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
        }
        
        /**
         * 动态数据增加动画 
         */
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var x;
            var dx;
            var y;
            var dy;
            var serie;
            var seriesIndex;
            var dataIndex;
            for (var i = self.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = ecData.get(self.shapeList[i], 'seriesIndex');
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    // 有数据删除才有移动的动画
                    if (self.shapeList[i].shape == 'rectangle') {
                        // 主动画
                        dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                        serie = series[seriesIndex];
                        if (aniMap[seriesIndex][2] 
                            && dataIndex == serie.data.length - 1
                        ) {
                            // 队头加入删除末尾
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                        else if (!aniMap[seriesIndex][2] && dataIndex === 0) {
                            // 队尾加入删除头部
                            zr.delShape(self.shapeList[i].id);
                            continue;
                        }
                        if (self.shapeList[i]._orient == 'horizontal') {
                            // 条形图
                            dy = component.yAxis.getAxis(
                                    serie.yAxisIndex || 0
                                 ).getGap();
                            y = aniMap[seriesIndex][2] ? -dy : dy;
                            x = 0;
                        }
                        else {
                            // 柱形图
                            dx = component.xAxis.getAxis(
                                    serie.xAxisIndex || 0
                                 ).getGap();
                            x = aniMap[seriesIndex][2] ? dx : -dx;
                            y = 0;
                        }
                        zr.animate(self.shapeList[i].id, '')
                            .when(
                                500,
                                {position : [x, y]}
                            )
                            .start();
                    }
                }
            }
        }

        /**
         * 动画设定
         */
        function animation() {
            var duration;
            var easing;
            var width;
            var height;
            var x;
            var y;
            var serie;
            var dataIndex;
            var value;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].shape == 'rectangle') {
                    serie = ecData.get(self.shapeList[i], 'series');
                    dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                    value = ecData.get(self.shapeList[i], 'value');
                    duration = self.deepQuery(
                        [serie, option], 'animationDuration'
                    );
                    easing = self.deepQuery(
                        [serie, option], 'animationEasing'
                    );

                    if (self.shapeList[i]._orient == 'horizontal') {
                        // 条形图
                        width = self.shapeList[i].style.width;
                        x = self.shapeList[i].style.x;
                        if (value < 0) {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        x : x + width,
                                        width: 0
                                    }
                                }
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        x : x,
                                        width : width
                                    },
                                    easing
                                )
                                .start();
                        }
                        else {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        width: 0
                                    }
                                }
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        width : width
                                    },
                                    easing
                                )
                                .start();
                        }
                    }
                    else {
                        // 柱形图
                        height = self.shapeList[i].style.height;
                        y = self.shapeList[i].style.y;
                        if (value < 0) {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        height: 0
                                    }
                                }
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        height : height
                                    },
                                    easing
                                )
                                .start();
                        }
                        else {
                            zr.modShape(
                                self.shapeList[i].id,
                                {
                                    style: {
                                        y: y + height,
                                        height: 0
                                    }
                                }
                            );
                            zr.animate(self.shapeList[i].id, 'style')
                                .when(
                                    duration + dataIndex * 100,
                                    {
                                        y : y,
                                        height : height
                                    },
                                    easing
                                )
                                .start();
                        }
                    }
                }
            }
        }

        self.init = init;
        self.refresh = refresh;
        self.addDataAnimation = addDataAnimation;
        self.animation = animation;

        init(option, component);
    }

    // 图表注册
    require('../chart').define('bar', Bar);
    
    return Bar;
});
/**
 * echarts图表类：饼图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define('echarts/chart/pie',['require','../component/base','./calculableBase','../config','../util/ecData','zrender/tool/math','zrender/tool/util','../chart'],function(require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Pie(messageCenter, zr, option, component){
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrMath = require('zrender/tool/math');
        var zrUtil = require('zrender/tool/util');

        var self = this;
        self.type = ecConfig.CHART_TYPE_PIE;

        var series;                 // 共享数据源，不要修改跟自己无关的项

        var _zlevelBase = self.getZlevelBase();
        
        var _selectedMode;
        var _selected = {};

        function _buildShape() {
            self.selectedMap = {};
            _selected = {};

            var pieCase;        // 饼图箱子
            _selectedMode = false;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_PIE) {
                    series[i] = self.reformOption(series[i]);
                    _selectedMode = _selectedMode || series[i].selectedMode;
                    _selected[i] = [];
                    if (self.deepQuery([series[i], option], 'calculable')) {
                        pieCase = {
                            shape : series[i].radius[0] <= 10
                                    ? 'circle' : 'ring',
                            zlevel : _zlevelBase,
                            hoverable : false,
                            style : {
                                x : series[i].center[0],          // 圆心横坐标
                                y : series[i].center[1],          // 圆心纵坐标
                                r0 : series[i].radius[0] <= 10    // 圆环内半径
                                     ? 0 : series[i].radius[0] - 10,
                                r : series[i].radius[1] + 10,     // 圆环外半径
                                brushType : 'stroke',
                                strokeColor : series[i].calculableHolderColor
                                              || ecConfig.calculableHolderColor
                            }
                        };
                        ecData.pack(pieCase, series[i], i, undefined, -1);
                        self.setCalculable(pieCase);
                        self.shapeList.push(pieCase);
                    }
                    _buildSinglePie(i);
                }
            }

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                self.shapeList[i].id = zr.newShapeId(self.type);
                zr.addShape(self.shapeList[i]);
            }
        }

        /**
         * 构建单个饼图
         *
         * @param {number} seriesIndex 系列索引
         */
        function _buildSinglePie(seriesIndex) {
            var serie = series[seriesIndex];
            var data = serie.data;
            var legend = component.legend;
            var itemName;
            var totalSelected = 0;               // 迭代累计
            var totalValue = 0;                  // 迭代累计

            // 计算需要显示的个数和总值
            for (var i = 0, l = data.length; i < l; i++) {
                itemName = data[i].name;
                if (legend){
                    self.selectedMap[itemName] = legend.isSelected(itemName);
                } else {
                    self.selectedMap[itemName] = true;
                }
                if (self.selectedMap[itemName]) {
                    totalSelected++;
                    totalValue += +data[i].value;
                }
            }

            var percent;
            var startAngle = serie.startAngle.toFixed(2) - 0;
            var endAngle;
            var minAngle = serie.minAngle;
            var totalAngle = 360 - (minAngle * totalSelected);
            var defaultColor;

            for (var i = 0, l = data.length; i < l; i++){
                itemName = data[i].name;
                if (!self.selectedMap[itemName]) {
                    continue;
                }
                // 默认颜色策略
                if (legend) {
                    // 有图例则从图例中获取颜色定义
                    defaultColor = legend.getColor(itemName);
                }
                else {
                    // 全局颜色定义
                    defaultColor = zr.getColor(i);
                }

                percent = data[i].value / totalValue;
                endAngle = (percent * totalAngle + startAngle + minAngle)
                           .toFixed(2) - 0;
                percent = (percent * 100).toFixed(2);

                _buildItem(
                    seriesIndex, i, percent, data[i].selected,
                    startAngle, endAngle, defaultColor
                );
                startAngle = endAngle;
            }
        }

        /**
         * 构建单个扇形及指标
         */
        function _buildItem(
            seriesIndex, dataIndex, percent, isSelected,
            startAngle, endAngle, defaultColor
        ) {
            // 扇形
            var sector = _getSector(
                    seriesIndex, dataIndex, percent, isSelected,
                    startAngle, endAngle, defaultColor
                );
            // 图形需要附加的私有数据
            ecData.pack(
                sector,
                series[seriesIndex], seriesIndex,
                series[seriesIndex].data[dataIndex], dataIndex,
                series[seriesIndex].data[dataIndex].name,
                percent
            );
            self.shapeList.push(sector);

            // 文本标签，需要显示则会有返回
            var label = _getLabel(
                    seriesIndex, dataIndex, percent,
                    startAngle, endAngle, defaultColor,
                    false
                );
            if (label) {
                label._dataIndex = dataIndex;
                self.shapeList.push(label);
            }

            // 文本标签视觉引导线，需要显示则会有返回
            var labelLine = _getLabelLine(
                    seriesIndex, dataIndex,
                    startAngle, endAngle, defaultColor,
                    false
                );
            if (labelLine) {
                labelLine._dataIndex = dataIndex;
                self.shapeList.push(labelLine);
            }
        }

        /**
         * 构建扇形
         */
        function _getSector(
            seriesIndex, dataIndex, percent, isSelected,
            startAngle, endAngle, defaultColor
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];

            // 多级控制
            var normalColor = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.color'
                );

            var emphasisColor = self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.color'
                );

            var sector = {
                shape : 'sector',             // 扇形
                zlevel : _zlevelBase,
                clickable : true,
                style : {
                    x : serie.center[0],          // 圆心横坐标
                    y : serie.center[1],          // 圆心纵坐标
                    r0 : serie.radius[0],         // 圆环内半径
                    r : serie.radius[1],          // 圆环外半径
                    startAngle : startAngle,
                    endAngle : endAngle,
                    brushType : 'both',
                    color : normalColor || defaultColor,
                    strokeColor : '#fff',
                    lineWidth: 1
                },
                highlightStyle : {
                    color : emphasisColor || normalColor || defaultColor
                },
                _seriesIndex : seriesIndex, 
                _dataIndex : dataIndex
            };
            
            if (isSelected) {
                var midAngle = 
                    ((sector.style.startAngle + sector.style.endAngle) / 2)
                    .toFixed(2) - 0;
                sector.style._hasSelected = true;
                sector.style._x = sector.style.x;
                sector.style._y = sector.style.y;
                var offset = self.deepQuery([serie], 'selectedOffset');
                sector.style.x += zrMath.cos(midAngle, true) * offset;
                sector.style.y -= zrMath.sin(midAngle, true) * offset;
                
                _selected[seriesIndex][dataIndex] = true;
            }
            else {
                _selected[seriesIndex][dataIndex] = false;
            }
            
            
            if (_selectedMode) {
                sector.onclick = self.shapeHandler.onclick;
            }
            
            if (self.deepQuery([data, serie, option], 'calculable')) {
                self.setCalculable(sector);
                sector.draggable = true;
            }

            if (_needLabel(serie, data, false)
                && self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.position'
                ) == 'inner'
            ) {
                sector.style.text = _getLabelText(
                    seriesIndex, dataIndex, percent, 'normal'
                );
                sector.style.textPosition = 'specific';
                sector.style.textColor = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle.color'
                ) || '#fff';
                sector.style.textAlign = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle.align'
                ) || 'center';
                sector.style.textBaseLine = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle.baseline'
                ) || 'middle';
                sector.style.textX = Math.round(
                    serie.center[0]
                    + (serie.radius[1] + serie.radius[0]) / 2
                      * zrMath.cos((startAngle + endAngle) / 2, true)
                );
                sector.style.textY = Math.round(
                    serie.center[1]
                    - (serie.radius[1] + serie.radius[0]) / 2
                       * zrMath.sin((startAngle + endAngle) / 2, true)
                );
                sector.style.textFont = self.getFont(self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle'
                ));
            }

            if (_needLabel(serie, data, true)
                && self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.label.position'
                ) == 'inner'
            ) {
                sector.highlightStyle.text = _getLabelText(
                    seriesIndex, dataIndex, percent, 'emphasis'
                );
                sector.highlightStyle.textPosition = 'specific';
                sector.highlightStyle.textColor = self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.label.textStyle.color'
                ) || '#fff';
                sector.highlightStyle.textAlign = self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.label.textStyle.align'
                ) || 'center';
                sector.highlightStyle.textBaseLine = self.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.textStyle.baseline'
                ) || 'middle';
                sector.highlightStyle.textX = Math.round(
                    serie.center[0]
                    + (serie.radius[1] + serie.radius[0]) / 2
                      * zrMath.cos((startAngle + endAngle) / 2, true)
                );
                sector.highlightStyle.textY = Math.round(
                    serie.center[1]
                    - (serie.radius[1] + serie.radius[0]) / 2
                      * zrMath.sin((startAngle + endAngle) / 2, true)
                );
                sector.highlightStyle.textFont = self.getFont(self.deepQuery(
                    [data, serie],
                    'itemStyle.emphasis.label.textStyle'
                ));
            }

            // “normal下不显示，emphasis显示”添加事件响应
            if (_needLabel(serie, data, true)          // emphasis下显示文本
                || _needLabelLine(serie, data, true)   // emphasis下显示引导线
            ) {
                sector.onmouseover = self.shapeHandler.onmouserover;
            }
            return sector;
        }

        /**
         * 需要显示则会有返回构建好的shape，否则返回undefined
         */
        function _getLabel(
            seriesIndex, dataIndex, percent,
            startAngle, endAngle, defaultColor,
            isEmphasis
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            // 特定状态下是否需要显示文本标签
            if (_needLabel(serie, data, isEmphasis)) {
                var status = isEmphasis ? 'emphasis' : 'normal';

                // serie里有默认配置，放心大胆的用！
                var itemStyle = zrUtil.merge(
                        zrUtil.clone(data.itemStyle) || {},
                        serie.itemStyle,
                        {
                            'overwrite' : false,
                            'recursive' : true
                        }
                    );
                // label配置
                var labelControl = itemStyle[status].label;
                var textStyle = labelControl.textStyle || {};

                var centerX = serie.center[0];                      // 圆心横坐标
                var centerY = serie.center[1];                      // 圆心纵坐标
                var midAngle = ((endAngle + startAngle) / 2) % 360; // 角度中值
                var radius;                                         // 标签位置半径
                var textAlign;
                if (labelControl.position == 'outer') {
                    // 外部显示，默认
                    radius = serie.radius[1]
                             + itemStyle[status].labelLine.length
                             + textStyle.fontSize;
                    textAlign = (midAngle >= 150 && midAngle <= 210)
                                ? 'right'
                                : ((midAngle <= 30 || midAngle >= 330)
                                       ? 'left'
                                       : 'center'
                                   );
                    return {
                        shape : 'text',
                        zlevel : _zlevelBase + 1,
                        hoverable : false,
                        style : {
                            x : centerX + radius * zrMath.cos(midAngle, true),
                            y : centerY - radius * zrMath.sin(midAngle, true),
                            color : textStyle.color || defaultColor,
                            text : _getLabelText(
                                seriesIndex, dataIndex, percent, status
                            ),
                            textAlign : textStyle.align
                                        || textAlign,
                            textBaseline : textStyle.baseline || 'middle',
                            textFont : self.getFont(textStyle)
                        },
                        highlightStyle : {
                            brushType : 'fill'
                        },
                        _seriesIndex : seriesIndex, 
                        _dataIndex : dataIndex
                    };
                }
                else if (labelControl.position == 'center') {
                    return {
                        shape : 'text',
                        zlevel : _zlevelBase + 1,
                        hoverable : false,
                        style : {
                            x : centerX,
                            y : centerY,
                            color : textStyle.color || defaultColor,
                            text : _getLabelText(
                                seriesIndex, dataIndex, percent, status
                            ),
                            textAlign : textStyle.align
                                        || 'center',
                            textBaseline : textStyle.baseline || 'middle',
                            textFont : self.getFont(textStyle)
                        },
                        highlightStyle : {
                            brushType : 'fill'
                        },
                        _seriesIndex : seriesIndex, 
                        _dataIndex : dataIndex
                    };
                }
                else {
                    // 内部显示由sector自带，不返回即可
                    return;
                    /*
                    radius = (serie.radius[0] + serie.radius[1]) / 2;
                    textAlign = 'center';
                    defaultColor = '#fff';
                    */
                }
            }
            else {
                return;
            }
        }

        /**
         * 根据lable.format计算label text
         */
        function _getLabelText(seriesIndex, dataIndex, percent, status) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var formatter = self.deepQuery(
                [data, serie],
                'itemStyle.' + status + '.label.formatter'
            );
            
            if (formatter) {
                if (typeof formatter == 'function') {
                    return formatter(
                        serie.name,
                        data.name,
                        data.value,
                        percent
                    );
                }
                else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}')
                                         .replace('{d}','{d0}');
                    formatter = formatter.replace('{a0}', serie.name)
                                         .replace('{b0}', data.name)
                                         .replace('{c0}', data.value)
                                         .replace('{d0}', percent);
    
                    return formatter;
                }
            }
            else {
                return data.name;
            }
        }
        
        /**
         * 需要显示则会有返回构建好的shape，否则返回undefined
         */
        function _getLabelLine(
            seriesIndex, dataIndex,
            startAngle, endAngle, defaultColor,
            isEmphasis
        ) {
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];

            // 特定状态下是否需要显示文本标签
            if (_needLabelLine(serie, data, isEmphasis)) {
                var status = isEmphasis ? 'emphasis' : 'normal';

                // serie里有默认配置，放心大胆的用！
                var itemStyle = zrUtil.merge(
                        zrUtil.clone(data.itemStyle) || {},
                        serie.itemStyle,
                        {
                            'overwrite' : false,
                            'recursive' : true
                        }
                    );
                // labelLine配置
                var labelLineControl = itemStyle[status].labelLine;
                var lineStyle = labelLineControl.lineStyle || {};

                var centerX = serie.center[0];                    // 圆心横坐标
                var centerY = serie.center[1];                    // 圆心纵坐标
                // 视觉引导线起点半径
                var midRadius = serie.radius[1];
                // 视觉引导线终点半径
                var maxRadius = midRadius + labelLineControl.length;
                var midAngle = ((endAngle + startAngle) / 2) % 360; // 角度中值
                var cosValue = zrMath.cos(midAngle, true);
                var sinValue = zrMath.sin(midAngle, true);
                // 三角函数缓存已在zrender/tool/math中做了
                return {
                    shape : 'line',
                    zlevel : _zlevelBase + 1,
                    hoverable : false,
                    style : {
                        xStart : centerX + midRadius * cosValue,
                        yStart : centerY - midRadius * sinValue,
                        xEnd : centerX + maxRadius * cosValue,
                        yEnd : centerY - maxRadius * sinValue,
                        strokeColor : lineStyle.color || defaultColor,
                        lineType : lineStyle.type,
                        lineWidth : lineStyle.width
                    },
                    _seriesIndex : seriesIndex, 
                    _dataIndex : dataIndex
                };
            }
            else {
                return;
            }
        }

        /**
         * 返回特定状态（normal or emphasis）下是否需要显示label标签文本
         * @param {Object} serie
         * @param {Object} data
         * @param {boolean} isEmphasis true is 'emphasis' and false is 'normal'
         */
        function _needLabel(serie, data, isEmphasis) {
            return self.deepQuery(
                [data, serie],
                'itemStyle.'
                + (isEmphasis ? 'emphasis' : 'normal')
                + '.label.show'
            );
        }

        /**
         * 返回特定状态（normal or emphasis）下是否需要显示labelLine标签视觉引导线
         * @param {Object} serie
         * @param {Object} data
         * @param {boolean} isEmphasis true is 'emphasis' and false is 'normal'
         */
        function _needLabelLine(serie, data, isEmphasis) {
            return self.deepQuery(
                [data, serie],
                'itemStyle.'
                + (isEmphasis ? 'emphasis' : 'normal')
                +'.labelLine.show'
            );
        }
        /**
         * 参数修正&默认值赋值，重载基类方法
         * @param {Object} opt 参数
         */
        function reformOption(opt) {
            // 常用方法快捷方式
            var _merge = zrUtil.merge;
            opt = _merge(
                      opt || {},
                      ecConfig.pie,
                      {
                          'overwrite' : false,
                          'recursive' : true
                      }
                  );

            // 圆心坐标，无则为自适应居中
            if (!opt.center 
                || (opt.center && !(opt.center instanceof Array))) {
                opt.center = [
                    Math.round(zr.getWidth() / 2),
                    Math.round(zr.getHeight() / 2)
                ];
            }
            else {
                if (typeof opt.center[0] == 'undefined') {
                    opt.center[0] = Math.round(zr.getWidth() / 2);
                }
                if (typeof opt.center[1] == 'undefined') {
                    opt.center[1] = Math.round(zr.getHeight() / 2);
                }
            }

            // 传数组实现环形图，[内半径，外半径]，传单个则默认为外半径为
            if (typeof opt.radius == 'undefined') {
                opt.radius = [
                    0,
                    Math.round(Math.min(zr.getWidth(), zr.getHeight()) / 2 - 50)
                ];
            } else if (!(opt.radius instanceof Array)) {
                opt.radius = [0, opt.radius];
            }

            // 通用字体设置
            opt.itemStyle.normal.label.textStyle = _merge(
                opt.itemStyle.normal.label.textStyle || {},
                ecConfig.textStyle,
                {
                    'overwrite' : false,
                    'recursive' : true
                }
            );
            opt.itemStyle.emphasis.label.textStyle = _merge(
                opt.itemStyle.emphasis.label.textStyle || {},
                ecConfig.textStyle,
                {
                    'overwrite' : false,
                    'recursive' : true
                }
            );

            return opt;
        }

        /**
         * 构造函数默认执行的初始化方法，也用于创建实例后动态修改
         * @param {Object} newSeries
         * @param {Object} newComponent
         */
        function init(newOption, newComponent) {
            component = newComponent;
            refresh(newOption);
        }

        /**
         * 刷新
         */
        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
        }
        
        /**
         * 动态数据增加动画 
         * 心跳效果
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var x;
            var y;
            var r;
            var seriesIndex;
            for (var i = self.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = ecData.get(self.shapeList[i], 'seriesIndex');
                if (aniMap[seriesIndex]) {
                    if (self.shapeList[i].shape == 'sector'
                        || self.shapeList[i].shape == 'circle'
                        || self.shapeList[i].shape == 'ring'
                    ) {
                        r = self.shapeList[i].style.r;
                        zr.animate(self.shapeList[i].id, 'style')
                            .when(
                                300,
                                {r : r * 0.9}
                            )
                            .when(
                                500,
                                {r : r}
                            )
                            .start();
                    }
                }
            }
        }
         */
        
        /**
         * 动态数据增加动画 
         */
        function addDataAnimation(params) {
            var aniMap = {}; // seriesIndex索引参数
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            
            // 构建新的饼图匹配差异做动画
            var sectorMap = {};
            var textMap = {};
            var lineMap = {};
            var backupShapeList = zrUtil.clone(self.shapeList);
            self.shapeList = [];
            
            var seriesIndex;
            var isHead;
            var dataGrow;
            var deltaIdxMap = {};   // 修正新增数据后会对dataIndex产生错位匹配
            for (var i = 0, l = params.length; i < l; i++) {
                seriesIndex = params[i][0];
                isHead = params[i][2];
                dataGrow = params[i][3];
                if (series[seriesIndex]
                    && series[seriesIndex].type == ecConfig.CHART_TYPE_PIE
                ) {
                    if (isHead) {
                        if (!dataGrow) {
                            sectorMap[
                                seriesIndex 
                                + '_' 
                                + series[seriesIndex].data.length
                            ] = 'delete';
                        }
                        deltaIdxMap[seriesIndex] = 1;
                    }
                    else {
                        if (!dataGrow) {
                            sectorMap[seriesIndex + '_-1'] = 'delete';
                            deltaIdxMap[seriesIndex] = -1;
                        }
                        else {
                            deltaIdxMap[seriesIndex] = 0;
                        }
                    }
                    _buildSinglePie(seriesIndex);
                }
            }
            var dataIndex;
            var key;
            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                seriesIndex = self.shapeList[i]._seriesIndex;
                dataIndex = self.shapeList[i]._dataIndex;
                key = seriesIndex + '_' + dataIndex;
                // map映射让n*n变n
                switch (self.shapeList[i].shape) {
                    case 'sector' :
                        sectorMap[key] = self.shapeList[i];
                        break;
                    case 'text' :
                        textMap[key] = self.shapeList[i];
                        break;
                    case 'line' :
                        lineMap[key] = self.shapeList[i];
                        break;
                }
            }
            self.shapeList = [];
            var targeSector;
            for (var i = 0, l = backupShapeList.length; i < l; i++) {
                seriesIndex = backupShapeList[i]._seriesIndex;
                if (aniMap[seriesIndex]) {
                    dataIndex = backupShapeList[i]._dataIndex
                                + deltaIdxMap[seriesIndex];
                    key = seriesIndex + '_' + dataIndex;
                    targeSector = sectorMap[key];
                    if (!targeSector) {
                        continue;
                    }
                    if (backupShapeList[i].shape == 'sector') {
                        if (targeSector != 'delete') {
                            // 原有扇形
                            zr.animate(backupShapeList[i].id, 'style')
                                .when(
                                    400,
                                    {
                                        startAngle : 
                                            targeSector.style.startAngle,
                                        endAngle : 
                                            targeSector.style.endAngle
                                    }
                                )
                                .start();
                        }
                        else {
                            // 删除的扇形
                            zr.animate(backupShapeList[i].id, 'style')
                                .when(
                                    400,
                                    deltaIdxMap[seriesIndex] < 0
                                    ? {
                                        endAngle : 
                                            backupShapeList[i].style.startAngle
                                      }
                                    : {
                                        startAngle :
                                            backupShapeList[i].style.endAngle
                                      }
                                )
                                .start();
                        }
                    }
                    else if (backupShapeList[i].shape == 'text'
                             || backupShapeList[i].shape == 'line'
                    ) {
                        if (targeSector == 'delete') {
                            // 删除逻辑一样
                            zr.delShape(backupShapeList[i].id);
                        }
                        else {
                            // 懒得新建变量了，借用一下
                            switch (backupShapeList[i].shape) {
                                case 'text':
                                    targeSector = textMap[key];
                                    zr.animate(backupShapeList[i].id, 'style')
                                        .when(
                                            400,
                                            {
                                                x :targeSector.style.x,
                                                y :targeSector.style.y
                                            }
                                        )
                                        .start();
                                    break;
                                case 'line':
                                    targeSector = lineMap[key];
                                    zr.animate(backupShapeList[i].id, 'style')
                                        .when(
                                            400,
                                            {
                                                xStart:targeSector.style.xStart,
                                                yStart:targeSector.style.yStart,
                                                xEnd : targeSector.style.xEnd,
                                                yEnd : targeSector.style.yEnd
                                            }
                                        )
                                        .start();
                                    break;
                            }
                            
                        }
                    }
                }
            }
            self.shapeList = backupShapeList;
        }

        /**
         * 动画设定
         */
        function animation() {
            var duration = self.deepQuery([option], 'animationDuration');
            var easing = self.deepQuery([option], 'animationEasing');
            var x;
            var y;
            var r0;
            var r;
            var serie;
            var dataIndex;

            for (var i = 0, l = self.shapeList.length; i < l; i++) {
                if (self.shapeList[i].shape == 'sector'
                    || self.shapeList[i].shape == 'circle'
                    || self.shapeList[i].shape == 'ring'
                ) {
                    x = self.shapeList[i].style.x;
                    y = self.shapeList[i].style.y;
                    r0 = self.shapeList[i].style.r0;
                    r = self.shapeList[i].style.r;

                    zr.modShape(self.shapeList[i].id, {
                        rotation : [Math.PI*2, x, y],
                        style : {
                            r0 : 0,
                            r : 0
                        }
                    });

                    serie = ecData.get(self.shapeList[i], 'series');
                    dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                    zr.animate(self.shapeList[i].id, 'style')
                        .when(
                            (self.deepQuery([serie],'animationDuration')
                            || duration)
                            + dataIndex * 10,

                            {
                                r0 : r0,
                                r : r
                            },

                            'QuinticOut'
                        )
                        .start();
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            (self.deepQuery([serie],'animationDuration')
                            || duration)
                            + dataIndex * 100,

                            {rotation : [0, x, y]},

                            (self.deepQuery([serie], 'animationEasing')
                            || easing)
                        )
                        .start();
                }
                else {
                    dataIndex = self.shapeList[i]._dataIndex;
                    zr.modShape(self.shapeList[i].id, {
                        scale : [0, 0, x, y]
                    });
                    zr.animate(self.shapeList[i].id, '')
                        .when(
                            duration + dataIndex * 100,
                            {scale : [1, 1, x, y]},
                            'QuinticOut'
                        )
                        .start();
                }
            }
        }

        function onclick(param) {
            if (!self.isClick || !param.target) {
                // 没有在当前实例上发生点击直接返回
                return;
            }
            var offset;             // 偏移
            var target = param.target;
            var style = target.style;
            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            for (var i = 0, len = self.shapeList.length; i < len; i++) {
                if (self.shapeList[i].id == target.id) {
                    seriesIndex = ecData.get(target, 'seriesIndex');
                    dataIndex = ecData.get(target, 'dataIndex');
                    // 当前点击的
                    if (!style._hasSelected) {
                        var midAngle = 
                            ((style.startAngle + style.endAngle) / 2)
                            .toFixed(2) - 0;
                        target.style._hasSelected = true;
                        _selected[seriesIndex][dataIndex] = true;
                        target.style._x = target.style.x;
                        target.style._y = target.style.y;
                        offset = self.deepQuery(
                            [series[seriesIndex]],
                            'selectedOffset'
                        );
                        target.style.x += zrMath.cos(midAngle, true) 
                                          * offset;
                        target.style.y -= zrMath.sin(midAngle, true) 
                                          * offset;
                    }
                    else {
                        // 复位
                        target.style.x = target.style._x;
                        target.style.y = target.style._y;
                        target.style._hasSelected = false;
                        _selected[seriesIndex][dataIndex] = false;
                    }
                    
                    zr.modShape(target.id, target);
                }
                else if (self.shapeList[i].style._hasSelected
                         && _selectedMode == 'single'
                ) {
                    seriesIndex = ecData.get(self.shapeList[i], 'seriesIndex');
                    dataIndex = ecData.get(self.shapeList[i], 'dataIndex');
                    // 单选模式下需要取消其他已经选中的
                    self.shapeList[i].style.x = self.shapeList[i].style._x;
                    self.shapeList[i].style.y = self.shapeList[i].style._y;
                    self.shapeList[i].style._hasSelected = false;
                    _selected[seriesIndex][dataIndex] = false;
                    zr.modShape(
                        self.shapeList[i].id, self.shapeList[i]
                    );
                }
            }
            
            messageCenter.dispatch(
                ecConfig.EVENT.PIE_SELECTED,
                param.event,
                {selected : _selected}
            );
            zr.refresh();
        }

        /**
         * 数据项被拖拽进来， 重载基类方法
         */
        function ondrop(param, status) {
            if (!self.isDrop || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 拖拽安放目标
            var dragged = param.dragged;    // 当前被拖拽的图形对象

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            var data;
            var legend = component.legend;
            if (dataIndex == -1) {
                // 落到pieCase上，数据被拖拽进某个饼图，增加数据
                data = {
                    value : ecData.get(dragged, 'value'),
                    name : ecData.get(dragged, 'name')
                };

                // 修饼图数值不为负值
                if (data.value < 0) {
                    data.value = 0;
                }

                series[seriesIndex].data.push(data);

                legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }
            else {
                // 落到sector上，数据被拖拽到某个数据项上，数据修改
                data = series[seriesIndex].data[dataIndex];
                legend.del(data.name);
                data.name += option.nameConnector
                             + ecData.get(dragged, 'name');
                data.value += ecData.get(dragged, 'value');
                legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }

            // 别status = {}赋值啊！！
            status.dragIn = status.dragIn || true;

            // 处理完拖拽事件后复位
            self.isDrop = false;

            return;
        }

        /**
         * 数据项被拖拽出去，重载基类方法
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            var target = param.target;      // 被拖拽图形元素

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            // 被拖拽的图形是饼图sector，删除被拖拽走的数据
            component.legend.del(
                series[seriesIndex].data[dataIndex].name
            );
            series[seriesIndex].data.splice(dataIndex, 1);

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.needRefresh = true;

            // 处理完拖拽事件后复位
            self.isDragend = false;

            return;
        }

        /**
         * 输出动态视觉引导线
         */
        self.shapeHandler.onmouserover = function(param) {
            var shape = param.target;
            var seriesIndex = ecData.get(shape, 'seriesIndex');
            var dataIndex = ecData.get(shape, 'dataIndex');
            var percent = ecData.get(shape, 'special');

            var startAngle = shape.style.startAngle;
            var endAngle = shape.style.endAngle;
            var defaultColor = shape.highlightStyle.color;

            // 文本标签，需要显示则会有返回
            var label = _getLabel(
                    seriesIndex, dataIndex, percent,
                    startAngle, endAngle, defaultColor,
                    true
                );
            if (label) {
                zr.addHoverShape(label);
            }

            // 文本标签视觉引导线，需要显示则会有返回
            var labelLine = _getLabelLine(
                    seriesIndex, dataIndex,
                    startAngle, endAngle, defaultColor,
                    true
                );
            if (labelLine) {
                zr.addHoverShape(labelLine);
            }
        };

        self.reformOption = reformOption;   // 重载基类方法
        
        // 接口方法
        self.init = init;
        self.refresh = refresh;
        self.addDataAnimation = addDataAnimation;
        self.animation = animation;
        self.onclick = onclick;
        self.ondrop = ondrop;
        self.ondragend = ondragend;

        init(option, component);
    }

    // 图表注册
    require('../chart').define('pie', Pie);
    
    return Pie;
});
/**
 * echarts默认配置项
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function() {
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
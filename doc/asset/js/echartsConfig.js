/**
 * echarts默认配置项
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
//define(function() {
    // 请原谅我这样写，这显然可以直接返回个对象，但那样的话outline就显示不出来了~~
    var echartsConfig = {
        // 图表标题
        title: {
            text: '',
            link: null,              // 超链接跳转
            subtext: '',
            sublink: null,           // 超链接跳转
            x: 'left',                 // 水平安放位置，默认为左对齐，可选为：
                                       // 'center' ¦ 'left' ¦ 'right'
                                       // ¦ {number}（x坐标，单位px）
            y: 'top',                  // 垂直安放位置，默认为全图顶端，可选为：
                                       // 'top' ¦ 'bottom' ¦ 'center'
                                       // ¦ {number}（y坐标，单位px）
            textAlign: null,            // 水平对齐方式，默认根据x设置自动调整
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
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',       // 图例边框颜色
            borderWidth: 0,            // 图例边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 图例内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            itemGap: 10,               // 各个item之间的间隔，单位px，默认为10，
                                       // 横向布局时为水平间隔，纵向布局时为纵向间隔
            itemWidth: 20,             // 图例图形宽度，非标准参数
            itemHeight: 14,            // 图例图形高度，非标准参数
            textStyle: {
                color: '#333'          // 图例文字颜色
            },
            selectedMode: true,        // 选择模式，默认开启图例开关
            selected: null,            // 配置默认选中状态，可配合LEGEND.SELECTED事件做动态数据载入
            data: []                   // 图例内容（详见legend.data，数组中每一项代表一个item
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
            min: null,              // 最小值
            max: null,              // 最大值
            precision: 0,              // 小数精度，默认为0，无小数点
            splitNumber: 5,            // 分割段数，默认为5，为0时为线性渐变
            calculable: false,         // 是否值域漫游，启用后无视splitNumber，线性渐变
            realtime: true,
            color:['#006edd','#e0ffff'],//颜色 
            text:null,           // 文本，默认为数值文本
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
            itemSize: 16,             // 工具箱图形宽度
            showTitle : true,
            textStyle : {},
            feature : {
                mark : {
                    show : false,
                    title : {
                mark : '辅助线开关',
                markUndo : '删除辅助线',
                        markClear : '清空辅助线'
                    },
                    lineStyle : {
                        width : 1,
                        color : '#1e90ff',
                        type : 'dashed'
                    }
                },
                dataZoom : {
                    show : false,
                    title : {
                dataZoom : '区域缩放',
                        dataZoomReset : '区域缩放后退'
                    }
                },
                dataView : {
                    show : false,
                    title : '数据视图',
                    readOnly: false,
                    lang : ['Data View', 'close', 'refresh']
                },
                magicType: {
                    show : false,
                    title : {
                        line : '折线图切换',
                        bar : '柱形图切换',
                        stack : '堆积',
                        tiled : '平铺'
                    },
                    type : [] // 'line', 'bar', 'stack', 'tiled'
                },
                restore : {
                    show : false,
                    title : '还原'
                },
                saveAsImage : {
                    show : false,
                    title : '保存为图片',
                    type : 'png',
                    lang : ['点击保存'] 
                }
            }
        },

        // 提示框
        tooltip: {
            show: true,
            showContent: true,         // tooltip主体内容
            trigger: 'item',           // 触发类型，默认数据触发，见下图，可选为：'item' ¦ 'axis'
            formatter: null,            // 内容格式器：{string}（Template） ¦ {Function}
            islandFormatter: '{a} <br/>{b} : {c}',  // 数据孤岛内容格式器，非标准参数
            showDelay: 20,             // 显示延迟，添加显示延迟可以避免频繁切换，单位ms
            hideDelay: 100,            // 隐藏延迟，单位ms
            transitionDuration : 0.4,  // 动画变换时间，单位s
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
            orient: 'horizontal',          // 布局方式，默认为水平布局，可选为：
                                           // 'horizontal' ¦ 'vertical'
            x: null,            // 水平安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（x坐标，单位px）
            y: null,            // 垂直安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（y坐标，单位px）
            //width: {number},        // 指定宽度，横向布局时默认为根据grid参数适配
            //height: {number},       // 指定高度，纵向布局时默认为根据grid参数适配
            backgroundColor: 'rgba(0,0,0,0)',       // 背景颜色
            dataBackgroundColor: '#eee',            // 数据背景颜色
            fillerColor: 'rgba(144,197,237,0.2)',   // 填充颜色
            handleColor: 'rgba(70,130,180,0.8)',         // 手柄颜色
            xAxisIndex: [],         // 默认控制所有横向类目
            yAxisIndex: [],         // 默认控制所有横向类目
            start: 0,               // 默认为0
            end: 100,               // 默认为全部 100%
            realtime: true,
            zoomLock: false         // 是否锁定选择区域大小
        },

        // 网格
        grid: {
            x: 80,
            y: 60,
            x2: 80,
            y2: 60,
            width: null,
            height: null,
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 1,
            borderColor: '#ccc'
        },

        // 类目轴
        categoryAxis: {
            position: 'bottom',    // 位置
            name: '',              // 坐标轴名字，默认为空
            nameLocation: 'end',   // 坐标轴名字位置，支持'start' | 'end'
            nameTextStyle: {},     // 坐标轴文字样式，默认取全局样式
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
                show: true,        // 属性show控制显示与否，默认不显示
                interval: 'auto',
                inside : false,    // 控制小标记是否在grid里 
                onGap: null,
                length :5,         // 属性length控制线长
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#333',
                    width: 1
                }
            },
            axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
                show: true,
                interval: 'auto',
                rotate: 0,
                margin:  8,
                formatter: null,
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: '#333'
                }
            },
            splitLine: {           // 分隔线
                show: true,        // 默认显示，属性show控制显示与否
                onGap: null,
                lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                    color: ['#ccc'],
                    width: 1,
                    type: 'solid'
                }
            },
            splitArea: {           // 分隔区域
                show: false,       // 默认不显示，属性show控制显示与否
                // onGap: null,
                areaStyle: {       // 属性areaStyle（详见areaStyle）控制区域样式
                    color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)']
                }
            }
        },
        // 数值型坐标轴默认参数
        valueAxis: {
            position: 'left',      // 位置
            name: '',              // 坐标轴名字，默认为空
            nameLocation: 'end',   // 坐标轴名字位置，支持'start' | 'end'
            nameTextStyle: {},     // 坐标轴文字样式，默认取全局样式
            boundaryGap: [0, 0],   // 数值起始和结束两端空白策略
            min: null,          // 最小值
            max: null,          // 最大值
            scale: false,       // 脱离0值比例，放大聚焦到最终_min，_max区间
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
                inside : false,    // 控制小标记是否在grid里 
                length :5,         // 属性length控制线长
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#333',
                    width: 1
                }
            },
            axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
                show: true,
                rotate: 0,
                margin: 8,
                formatter: null,
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
                    color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)']
                }
            }
        },

        polar : {
            center : ['50%', '50%'],    // 默认全局居中
            radius : '75%',
            startAngle : 90,
            splitNumber : 5,
            name : {
                show: true,
                formatter: null,
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
                formatter: null,
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
            },
            indicator : []
        },

        // 柱形图默认参数
        bar: {
            stack: null,
            xAxisIndex: 0,
            yAxisIndex: 0,
            barMinHeight: 0,
            barWidth: null,        // 默认自适应
            barGap: '30%',            // 柱间距离，默认为柱形宽度的30%，可设固定值
            barCategoryGap : '20%',   // 类目间柱形距离，默认为类目间距的20%，可设固定值
            itemStyle: {
                normal: {
                    color: null,
                    borderColor: '#fff',       // 柱条边线
                    borderRadius: 0,           // 柱条边线圆角，单位px，默认为0
                    borderWidth: 0,            // 柱条边线线宽，单位px，默认为1
                    label: {
                        show: false,
                        formatter: '标签文本格式器，同Tooltip.formatter，不支持回调',
                        position: "默认自适应，水平布局为'top'，垂直布局为'right'",
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                },
                emphasis: {
                    color: null,
                    borderColor: '#fff',   // 柱条边线
                    borderRadius: 0,                // 柱条边线圆角，单位px，默认为0
                    borderWidth: 0,                 // 柱条边线线宽，单位px，默认为1
                    label: {
                        show: false,
                        formatter: '标签文本格式器，同Tooltip.formatter，不支持回调',
                        position: "默认自适应，水平布局为'top'，垂直布局为'right'",
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            }
        },

        // 折线图默认参数
        line: {
            stack: null,
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: {
                normal: {
                    color: null,
                    label: {
                        show: false,
                        formatter: '标签文本格式器，同Tooltip.formatter，不支持回调',
                        position: "默认自使用，水平布局为'top'，垂直布局为'right'",
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    lineStyle: {
                        width: 2,
                        type: 'solid',
                        shadowColor : 'rgba(0,0,0,0)', //默认透明
                        shadowBlur: 0,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0
                    }
                },
                emphasis: {
                    color: null,
                    label: {
                        show: false,
                        formatter: '标签文本格式器，同Tooltip.formatter，不支持回调',
                        position: "默认自使用，水平布局为'top'，垂直布局为'right'",
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            },
            smooth : false,
            symbol: null,             // 拐点图形类型，非标准参数
            symbolSize: 2,            // 可计算特性参数，空数据拖拽提示图形大小
            symbolRotate : null,    // 拐点图形旋转控制
            showAllSymbol: false    // 标志图形默认只有主轴显示（随主轴标签间隔隐藏策略）
        },

        // K线图默认参数
        k: {
            xAxisIndex: 0,
            yAxisIndex: 0,
            barWidth : null,          // 默认自适应
            barMaxWidth : null,       // 默认自适应 
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
                    color: null,
                    color0: null
                }
            }
        },
        
        // 散点图默认参数
        scatter: {
            xAxisIndex: 0,
            yAxisIndex: 0,
            symbol: null,    // 图形类型，非标准参数
            symbolSize: 4,       // 图形大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            symbolRotate : null,  // 图形旋转控制
            large: false,        // 大规模散点图
            largeThreshold: 2000,// 大规模阀值，large为true且数据量>largeThreshold才启用大规模模式
            itemStyle: {
                normal: {
                    color: null,
                    label: {
                        show: false,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        formatter : function(a, b, c) {
                            if (typeof c[2] != 'undefined') {
                                return c[2];
                            }
                            else {
                                return c[0] + ' , ' + c[1];
                            }
                        },
                        position: "默认自使用，水平布局为'top'，垂直布局为'right'",
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                },
                emphasis: {
                    color: null,
                    label: {
                        show: false,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        formatter : function(a, b, c) {
                            if (typeof c[2] != 'undefined') {
                                return c[2];
                            }
                            else {
                                return c[0] + ' , ' + c[1];
                            }
                        },
                        position: "默认自使用，水平布局为'top'，垂直布局为'right'",
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            }
        },

        // 雷达图默认参数
        radar : {
            polarIndex: 0,
            itemStyle: {
                normal: {
                    color: null,
                    label: {
                        show: false
                    },
                    lineStyle: {
                        width: 2,
                        type: 'solid'
                    }
                },
                emphasis: {
                    color: null,
                    label: {
                        show: false
                    }
                }
            },
            symbol: null,            // 拐点图形类型，非标准参数
            symbolSize: 2,           // 可计算特性参数，空数据拖拽提示图形大小
            symbolRotate : null     // 图形旋转控制
        },

        // 饼图默认参数
        pie: {
            center : ['50%', '50%'],    // 默认全局居中
            radius : [0, '75%'],
            clockWise : true,           // 默认顺时针
            startAngle: 90,
            minAngle: 0,                    // 最小角度改为0
            selectedOffset: 10,             // 选中是扇区偏移量
            selectedMode: false,         // 选择模式，默认关闭，可选single，multiple
            roseType : null,     // 南丁格尔玫瑰图模式，'radius'（半径） | 'area'（面积）
            itemStyle: {
                normal: {
                    color: null,
                    borderColor: '#fff',
                    borderWidth: 1,
                    label: {
                        show: true,
                        position: 'outer',
                        formatter: '标签文本格式器，同Tooltip.formatter，不支持回调',
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    labelLine: {
                        show: true,
                        length: 20,
                        lineStyle: {
                            color: null,
                            width: 1,
                            type: 'solid'
                        }
                    }
                },
                emphasis: {
                    color: null,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1,
                    label: {
                        show: false,
                        position: 'outer',
                        formatter: '标签文本格式器，同Tooltip.formatter，不支持回调',
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    labelLine: {
                        show: false,
                        length: 20,
                        lineStyle: {
                            color: null,
                            width: 1,
                            type: 'solid'
                        }
                    }
                }
            }
        },
        
        map: {
            mapType: 'china',
            mapLocation: {
                x : 'center',
                y : 'center',
                width: null,    // 自适应
                height:null   // 自适应
            },
            mapValueCalculation: 'sum',    // 数值合并方式，默认加和，可选为：'sum' | 'average'
            mapValuePrecision : 0,         // 地图数值计算结果小数精度
            showLegendSymbol : true,       // 显示图例颜色标识（系列标识的小圆点），存在legend时生效
            selectedMode: false,           // 选择模式，默认关闭，可选single，multiple
            hoverable: true,
            roam : false,               // 是否开启缩放及漫游模式
            itemStyle: {
                normal: {
                    color: null,
                    borderColor: '#fff',
                    borderWidth: 1,
                    areaStyle: {
                        color: '#ccc'
                    },
                    label: {
                        show: false,
                        textStyle: {
                            color: 'rgb(139,69,19)'
                        }
                    }
                },
                emphasis: {                 // 也是选中样式
                    color: null,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1,
                    areaStyle: {
                        color: 'rgba(255,215,0,0.8)'
                    },
                    label: {
                        show: false,
                        textStyle: {
                            color: 'rgb(100,0,0)'
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
            showArrow: false,
            itemStyle: {
                normal: {
                    color: null,
                    label: {
                        show: false,
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
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
                    color: null,
                    label: {
                        show: false,
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    nodeStyle : {},
                    linkStyle : {}
                }
            }
        },

        chord : {
            radius : ['65%', '75%'],
            center : ['50%', '50%'],
            padding : 2,
            sort : 'none', // can be 'none', 'ascending', 'descending'
            sortSub : 'none', // can be 'none', 'ascending', 'descending'
            startAngle : 90,
            clockWise : false,
            showScale : false,
            showScaleText : false,
            itemStyle : {
                normal : {
                    label : {
                        show : true,
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    lineStyle : {
                        width : 0,
                        color : '#000'
                    },
                    chordStyle : {
                        lineStyle : {
                            width : 1,
                            color : '#666'
                        }
                    }
                },
                emphasis : {
                    lineStyle : {
                        width : 0,
                        color : '#000'
                    },
                    chordStyle : {
                        lineStyle : {
                            width : 2,
                            color : '#333'
                        }
                    }
                }
            },
            // Source data matrix
            /**
             *         target
             *    -1--2--3--4--5-
             *  1| x  x  x  x  x
             *  2| x  x  x  x  x
             *  3| x  x  x  x  x  source
             *  4| x  x  x  x  x
             *  5| x  x  x  x  x
             *
             *  Relation ship from source to target
             *  https://github.com/mbostock/d3/wiki/Chord-Layout#wiki-chord
             *  
             *  Row based
             */
            matrix : []
        },

        island: {
            r: 15,
            calculateStep: 0.1  // 滚轮可计算步长 0.1 = 10%
        },

        markPoint : {
            symbol: 'pin',         // 标注类型
            symbolSize: 10,       // 标注大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            symbolRotate : null,// 标注旋转控制
            effect : {
                show: false,
                period: 15,             // 运动周期，无单位，值越大越慢
                scaleSize : 2,         // 放大倍数，以markPoint点size为基准
                color : null,
                shadowColor : null,
                shadowBlur : 0          // 炫光模糊
            },
            itemStyle: {
                normal: {
                    color: null,
                    borderColor: null,     // 标注边线颜色，优先于color 
                    borderWidth: 2,            // 标注边线线宽，单位px，默认为1
                    label: {
                        show: true,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        formatter : null,
                        position: 'inside', // 可选为'left'|'right'|'top'|'bottom'
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                },
                emphasis: {
                    color: null,
                    label: {
                        show: true,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        formatter : null,
                        position: 'inside',  // 'left'|'right'|'top'|'bottom'
                        textStyle: null     // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            }
        },
        
        markLine : {
            // 标线起始和结束的symbol介绍类型，如果都一样，可以直接传string
            symbol: ['circle', 'arrow'],  
            // 标线起始和结束的symbol大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            symbolSize: [2, 4],
            // 标线起始和结束的symbol旋转控制
            symbolRotate : null,
            smooth : false,
            effect : {
                show: false,
                period: 15,             // 运动周期，无单位，值越大越慢
                scaleSize : 2,           // 放大倍数，以markLine线lineWidth为基准
                color : null,
                shadowColor : null,
                shadowBlur : 'lineWidth*2'      // 炫光模糊，默认等于scaleSize计算所得
            },
            itemStyle: {
                normal: {
                    color: null,           // 标线主色，线色，symbol主色
                    borderColor: null,     // 标线symbol边框颜色，优先于color 
                    borderWidth: 1.5,          // 标线symbol边框线宽，单位px，默认为2
                    label: {
                        show: true,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        formatter : null,
                        // 可选为 'start'|'end'|'left'|'right'|'top'|'bottom'
                        position: 'end',
                        textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    lineStyle: {
                        color: null, // 主色，线色，优先级高于borderColor和color
                        width: null, // 优先于borderWidth
                        type: 'dashed',
                        shadowColor : 'rgba(0,0,0,0)', //默认透明
                        shadowBlur: 0,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0
                    }
                },
                emphasis: {
                    color: null,
                    label: {
                        show: false,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        formatter : null,
                        position: 'inside', // 'left'|'right'|'top'|'bottom'
                        textStyle: null    // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    lineStyle : {}
                }
            }
        },

        // 主题，主题
        textStyle: {
            decoration: 'none',
            fontFamily: 'Arial, Verdana, sans-serif',
            fontFamily2: '微软雅黑',    // IE8- 字体模糊并且，不支持不同字体混排，额外指定一份
            fontSize: 12,
            fontStyle: 'normal',
            fontWeight: 'normal'
        },

        EVENT: {
            // -------全局通用
            REFRESH: 'refresh',
            RESTORE: 'restore',
            RESIZE: 'resize',
            CLICK: 'click',
            HOVER: 'hover',
            //MOUSEWHEEL: 'mousewheel',
            // -------业务交互逻辑
            DATA_CHANGED: 'dataChanged',
            DATA_ZOOM: 'dataZoom',
            DATA_RANGE: 'dataRange',
            LEGEND_SELECTED: 'legendSelected',
            MAP_SELECTED: 'mapSelected',
            PIE_SELECTED: 'pieSelected',
            MAGIC_TYPE_CHANGED: 'magicTypeChanged',
            DATA_VIEW_CHANGED: 'dataViewChanged',
            MAP_ROAM : 'mapRoam',
            // -------内部通信
            TOOLTIP_HOVER: 'tooltipHover',
            TOOLTIP_IN_GRID: 'tooltipInGrid',
            TOOLTIP_OUT_GRID: 'tooltipOutGrid'
        }
    };
//    return config;
//});
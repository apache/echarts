/**
 * echarts默认配置项
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
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
        CHART_TYPE_FORCE: 'force',
        CHART_TYPE_CHORD: 'chord',
        CHART_TYPE_GAUGE: 'gauge',
        CHART_TYPE_FUNNEL: 'funnel',
        CHART_TYPE_EVENTRIVER: 'eventRiver',

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
        COMPONENT_TYPE_TIMELINE: 'timeline',
        COMPONENT_TYPE_ROAMCONTROLLER: 'roamController',

        // 全图默认背景
        backgroundColor: 'rgba(0,0,0,0)',
        
        // 默认色板
        color: ['#ff7f50','#87cefa','#da70d6','#32cd32','#6495ed',
                '#ff69b4','#ba55d3','#cd5c5c','#ffa500','#40e0d0',
                '#1e90ff','#ff6347','#7b68ee','#00fa9a','#ffd700',
                '#6699FF','#ff6666','#3cb371','#b8860b','#30e0e0'],

        // 图表标题
        title: {
            text: '',
            // link: null,             // 超链接跳转
            // target: null,           // 仅支持self | blank
            subtext: '',
            // sublink: null,          // 超链接跳转
            // subtarget: null,        // 仅支持self | blank
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
            itemGap: 5,                // 主副标题纵向间隔，单位px，默认为10，
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
            show: true,
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
            itemWidth: 20,             // 图例图形宽度
            itemHeight: 14,            // 图例图形高度
            textStyle: {
                color: '#333'          // 图例文字颜色
            },
            selectedMode: true         // 选择模式，默认开启图例开关
            // selected: null,         // 配置默认选中状态，可配合LEGEND.SELECTED事件做动态数据载入
            // data: [],               // 图例内容（详见legend.data，数组中每一项代表一个item
        },
        
        // 值域
        dataRange: {
            show: true,
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
            // min: null,              // 最小值
            // max: null,              // 最大值
            precision: 0,              // 小数精度，默认为0，无小数点
            splitNumber: 5,            // 分割段数，默认为5，为0时为线性渐变
            calculable: false,         // 是否值域漫游，启用后无视splitNumber，线性渐变
            hoverLink: true,
            realtime: true,
            color:['#006edd','#e0ffff'],//颜色 
            // formatter: null,
            // text:['高','低'],         // 文本，默认为数值文本
            textStyle: {
                color: '#333'          // 值域文字颜色
            }
        },

        toolbox: {
            show: false,
            orient: 'horizontal',      // 布局方式，默认为水平布局，可选为：
                                       // 'horizontal' ¦ 'vertical'
            x: 'right',                // 水平安放位置，默认为全图右对齐，可选为：
                                       // 'center' ¦ 'left' ¦ 'right'
                                       // ¦ {number}（x坐标，单位px）
            y: 'top',                  // 垂直安放位置，默认为全图顶端，可选为：
                                       // 'top' ¦ 'bottom' ¦ 'center'
                                       // ¦ {number}（y坐标，单位px）
            color: ['#1e90ff','#22bb22','#4b0082','#d2691e'],
            disableColor: '#ddd',
            effectiveColor: 'red',
            backgroundColor: 'rgba(0,0,0,0)', // 工具箱背景颜色
            borderColor: '#ccc',       // 工具箱边框颜色
            borderWidth: 0,            // 工具箱边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 工具箱内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            itemGap: 10,               // 各个item之间的间隔，单位px，默认为10，
                                       // 横向布局时为水平间隔，纵向布局时为纵向间隔
            itemSize: 16,              // 工具箱图形宽度
            showTitle: true,
            // textStyle: {},
            feature: {
                mark: {
                    show: false,
                    title: {
                        mark: '辅助线开关',
                        markUndo: '删除辅助线',
                        markClear: '清空辅助线'
                    },
                    lineStyle: {
                        width: 1,
                        color: '#1e90ff',
                        type: 'dashed'
                    }
                },
                dataZoom: {
                    show: false,
                    title: {
                        dataZoom: '区域缩放',
                        dataZoomReset: '区域缩放后退'
                    }
                },
                dataView: {
                    show: false,
                    title: '数据视图',
                    readOnly: false,
                    lang: ['数据视图', '关闭', '刷新']
                },
                magicType: {
                    show: false,
                    title: {
                        line: '折线图切换',
                        bar: '柱形图切换',
                        stack: '堆积',
                        tiled: '平铺',
                        force: '力导向布局图切换',
                        chord: '和弦图切换',
                        pie: '饼图切换',
                        funnel: '漏斗图切换'
                    },
                    /*
                    option: {
                        line: {},
                        bar: {},
                        stack: {},
                        tiled: {},
                        force: {},
                        chord: {},
                        pie: {},
                        funnel: {}
                    },
                    */
                    type: [] // 'line', 'bar', 'stack', 'tiled', 'force', 'chord', 'pie', 'funnel'
                },
                restore: {
                    show: false,
                    title: '还原'
                },
                saveAsImage: {
                    show: false,
                    title: '保存为图片',
                    type: 'png',
                    lang: ['点击保存'] 
                }
            }
        },

        // 提示框
        tooltip: {
            show: true,
            showContent: true,         // tooltip主体内容
            trigger: 'item',           // 触发类型，默认数据触发，见下图，可选为：'item' ¦ 'axis'
            // position: null          // 位置 {Array} | {Function}
            // formatter: null         // 内容格式器：{string}（Template） ¦ {Function}
            islandFormatter: '{a} <br/>{b} : {c}',  // 数据孤岛内容格式器
            showDelay: 20,             // 显示延迟，添加显示延迟可以避免频繁切换，单位ms
            hideDelay: 100,            // 隐藏延迟，单位ms
            transitionDuration: 0.4,   // 动画变换时间，单位s
            enterable: false,
            backgroundColor: 'rgba(0,0,0,0.7)',     // 提示背景颜色，默认为透明度为0.7的黑色
            borderColor: '#333',       // 提示边框颜色
            borderRadius: 4,           // 提示边框圆角，单位px，默认为4
            borderWidth: 0,            // 提示边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 提示内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            axisPointer: {             // 坐标轴指示器，坐标轴触发有效
                type: 'line',          // 默认为直线，可选为：'line' | 'shadow' | 'cross'
                lineStyle: {           // 直线指示器样式设置
                    color: '#48b',
                    width: 2,
                    type: 'solid'
                },
                crossStyle: {
                    color: '#1e90ff',
                    width: 1,
                    type: 'dashed'
                },
                shadowStyle: {                      // 阴影指示器样式设置
                    color: 'rgba(150,150,150,0.3)', // 阴影颜色
                    width: 'auto',                  // 阴影大小
                    type: 'default'
                }
            },
            textStyle: {
                color: '#fff'
            }
        },

        // 区域缩放控制器
        dataZoom: {
            show: false,
            orient: 'horizontal',      // 布局方式，默认为水平布局，可选为：
                                       // 'horizontal' ¦ 'vertical'
            // x: {number},            // 水平安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（x坐标，单位px）
            // y: {number},            // 垂直安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（y坐标，单位px）
            // width: {number},        // 指定宽度，横向布局时默认为根据grid参数适配
            // height: {number},       // 指定高度，纵向布局时默认为根据grid参数适配
            backgroundColor: 'rgba(0,0,0,0)',       // 背景颜色
            dataBackgroundColor: '#eee',            // 数据背景颜色
            fillerColor: 'rgba(144,197,237,0.2)',   // 填充颜色
            handleColor: 'rgba(70,130,180,0.8)',    // 手柄颜色
            showDetail: true,
            // xAxisIndex: [],         // 默认控制所有横向类目
            // yAxisIndex: [],         // 默认控制所有横向类目
            // start: 0,               // 默认为0
            // end: 100,               // 默认为全部 100%
            realtime: true
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
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 1,
            borderColor: '#ccc'
        },

        // 类目轴
        categoryAxis: {
            show: true,
            position: 'bottom',    // 位置
            name: '',              // 坐标轴名字，默认为空
            nameLocation: 'end',   // 坐标轴名字位置，支持'start' | 'end'
            nameTextStyle: {},     // 坐标轴文字样式，默认取全局样式
            boundaryGap: true,     // 类目起始和结束两端空白策略
            axisLine: {            // 坐标轴线
                show: true,        // 默认显示，属性show控制显示与否
                onZero: true,
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#48b',
                    width: 2,
                    type: 'solid'
                }
            },
            axisTick: {            // 坐标轴小标记
                show: true,        // 属性show控制显示与否，默认不显示
                interval: 'auto',
                inside: false,    // 控制小标记是否在grid里 
                // onGap: null,
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
                margin: 8,
                // clickable: false,
                // formatter: null,
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: '#333'
                }
            },
            splitLine: {           // 分隔线
                show: true,        // 默认显示，属性show控制显示与否
                // onGap: null,
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
            show: true,
            position: 'left',      // 位置
            name: '',              // 坐标轴名字，默认为空
            nameLocation: 'end',   // 坐标轴名字位置，支持'start' | 'end'
            nameTextStyle: {},     // 坐标轴文字样式，默认取全局样式
            boundaryGap: [0, 0],   // 数值起始和结束两端空白策略
            // min: null,          // 最小值
            // max: null,          // 最大值
            // scale: false,       // 脱离0值比例，放大聚焦到最终_min，_max区间
            //splitNumber: 5,        // 分割段数，默认为5
            axisLine: {            // 坐标轴线
                show: true,        // 默认显示，属性show控制显示与否
                onZero: true,
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#48b',
                    width: 2,
                    type: 'solid'
                }
            },
            axisTick: {            // 坐标轴小标记
                show: false,       // 属性show控制显示与否，默认不显示
                inside: false,     // 控制小标记是否在grid里 
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
                // clickable: false,
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
                    color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)']
                }
            }
        },

        polar: {
            center: ['50%', '50%'],    // 默认全局居中
            radius: '75%',
            startAngle: 90,
            boundaryGap: [0, 0],   // 数值起始和结束两端空白策略
            splitNumber: 5,
            name: {
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
            splitArea: {
                show: true,
                areaStyle: {
                    color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)']
                }
            },
            splitLine: {
                show: true,
                lineStyle: {
                    width: 1,
                    color: '#ccc'
                }
            },
            type: 'polygon'
            // indicator: []
        },

        timeline: {
            show: true,
            type: 'time',  // 模式是时间类型，支持 number
            notMerge: false,
            realtime: true,
            x: 80,
            // y: {number},
            x2: 80,
            y2: 0,
            // width: {totalWidth} - x - x2,
            height: 50,
            backgroundColor: 'rgba(0,0,0,0)',   // 时间轴背景颜色
            borderColor: '#ccc',               // 时间轴边框颜色
            borderWidth: 0,                    // 时间轴边框线宽，单位px，默认为0（无边框）
            padding: 5,                        // 时间轴内边距，单位px，默认各方向内边距为5，
            controlPosition: 'left',           // 'right' | 'none'
            autoPlay: false,
            loop: true,
            playInterval: 2000,                // 播放时间间隔，单位ms
            lineStyle: {
                width: 1,
                color: '#666',
                type: 'dashed'
            },
            label: {                            // 文本标签
                show: true,
                interval: 'auto',
                rotate: 0,
                // formatter: null,
                textStyle: {                    // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: '#333'
                }
            },
            checkpointStyle: {
                symbol: 'auto',
                symbolSize: 'auto',
                color: 'auto',
                borderColor: 'auto',
                borderWidth: 'auto',
                label: {                            // 文本标签
                    show: false,
                    textStyle: {                    // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                        color: 'auto'
                    }
                }
            },
            controlStyle: {
                normal: { color: '#333'},
                emphasis: { color: '#1e90ff'}
            },
            symbol: 'emptyDiamond',
            symbolSize: 4,
            currentIndex: 0
            // data: []
        },
        
        roamController: {
            show: true,
            x: 'left',                 // 水平安放位置，默认为全图左对齐，可选为：
                                       // 'center' ¦ 'left' ¦ 'right'
                                       // ¦ {number}（x坐标，单位px）
            y: 'top',                  // 垂直安放位置，默认为全图顶端，可选为：
                                       // 'top' ¦ 'bottom' ¦ 'center'
                                       // ¦ {number}（y坐标，单位px）
            width: 80,
            height: 120,
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',       // 图例边框颜色
            borderWidth: 0,            // 图例边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 图例内边距，单位px，默认各方向内边距为5，
                                       // 接受数组分别设定上右下左边距，同css
            handleColor: '#6495ed',
            fillerColor: '#fff',
            step: 15,                  // 移动幅度
            mapTypeControl: null
        },
        
        // 柱形图默认参数
        bar: {
            clickable: true,
            legendHoverLink: true,
            // stack: null
            xAxisIndex: 0,
            yAxisIndex: 0,
            barMinHeight: 0,          // 最小高度改为0
            // barWidth: null,        // 默认自适应
            barGap: '30%',            // 柱间距离，默认为柱形宽度的30%，可设固定值
            barCategoryGap: '20%',    // 类目间柱形距离，默认为类目间距的20%，可设固定值
            itemStyle: {
                normal: {
                    // color: '各异',
                    barBorderColor: '#fff',       // 柱条边线
                    barBorderRadius: 0,           // 柱条边线圆角，单位px，默认为0
                    barBorderWidth: 0,            // 柱条边线线宽，单位px，默认为1
                    label: {
                        show: false
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持回调
                        // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                },
                emphasis: {
                    // color: '各异',
                    barBorderColor: '#fff',            // 柱条边线
                    barBorderRadius: 0,                // 柱条边线圆角，单位px，默认为0
                    barBorderWidth: 0,                 // 柱条边线线宽，单位px，默认为1
                    label: {
                        show: false
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持回调
                        // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            }
        },

        // 折线图默认参数
        line: {
            clickable: true,
            legendHoverLink: true,
            // stack: null
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: {
                normal: {
                    // color: 各异,
                    label: {
                        show: false
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持回调
                        // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    lineStyle: {
                        width: 2,
                        type: 'solid',
                        shadowColor: 'rgba(0,0,0,0)', //默认透明
                        shadowBlur: 0,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0
                    }
                },
                emphasis: {
                    // color: 各异,
                    label: {
                        show: false
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持回调
                        // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            },
            // smooth: false,
            // symbol: null,         // 拐点图形类型
            symbolSize: 2,           // 拐点图形大小
            // symbolRotate: null,   // 拐点图形旋转控制
            showAllSymbol: false     // 标志图形默认只有主轴显示（随主轴标签间隔隐藏策略）
        },
        
        // K线图默认参数
        k: {
            clickable: true,
            legendHoverLink: false,
            xAxisIndex: 0,
            yAxisIndex: 0,
            // barWidth: null               // 默认自适应
            // barMaxWidth: null            // 默认自适应 
            itemStyle: {
                normal: {
                    color: '#fff',          // 阳线填充颜色
                    color0: '#00aa11',      // 阴线填充颜色
                    lineStyle: {
                        width: 1,
                        color: '#ff3200',   // 阳线边框颜色
                        color0: '#00aa11'   // 阴线边框颜色
                    }
                },
                emphasis: {
                    // color: 各异,
                    // color0: 各异
                }
            }
        },
        
        // 散点图默认参数
        scatter: {
            clickable: true,
            legendHoverLink: true,
            xAxisIndex: 0,
            yAxisIndex: 0,
            // symbol: null,        // 图形类型
            symbolSize: 4,          // 图形大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            // symbolRotate: null,  // 图形旋转控制
            large: false,           // 大规模散点图
            largeThreshold: 2000,   // 大规模阀值，large为true且数据量>largeThreshold才启用大规模模式
            itemStyle: {
                normal: {
                    // color: 各异,
                    label: {
                        show: false,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        formatter: function (a, b, c) {
                            if (typeof c[2] != 'undefined') {
                                return c[2];
                            }
                            else {
                                return c[0] + ' , ' + c[1];
                            }
                        }
                        // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                },
                emphasis: {
                    // color: '各异'
                    label: {
                        show: false,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        formatter: function (a, b, c) {
                            if (typeof c[2] != 'undefined') {
                                return c[2];
                            }
                            else {
                                return c[0] + ' , ' + c[1];
                            }
                        }
                        // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            }
        },

        // 雷达图默认参数
        radar: {
            clickable: true,
            legendHoverLink: true,
            polarIndex: 0,
            itemStyle: {
                normal: {
                    // color: 各异,
                    label: {
                        show: false
                    },
                    lineStyle: {
                        width: 2,
                        type: 'solid'
                    }
                },
                emphasis: {
                    // color: 各异,
                    label: {
                        show: false
                    }
                }
            },
            // symbol: null,            // 拐点图形类型
            symbolSize: 2               // 可计算特性参数，空数据拖拽提示图形大小
            // symbolRotate: null,      // 图形旋转控制
        },

        // 饼图默认参数
        pie: {
            clickable: true,
            legendHoverLink: true,
            center: ['50%', '50%'],     // 默认全局居中
            radius: [0, '75%'],
            clockWise: true,            // 默认顺时针
            startAngle: 90,
            minAngle: 0,                // 最小角度改为0
            selectedOffset: 10,         // 选中是扇区偏移量
            // selectedMode: false,     // 选择模式，默认关闭，可选single，multiple
            // roseType: null,          // 南丁格尔玫瑰图模式，'radius'（半径） | 'area'（面积）
            itemStyle: {
                normal: {
                    // color: 各异,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1,
                    label: {
                        show: true,
                        position: 'outer'
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持回调
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    labelLine: {
                        show: true,
                        length: 20,
                        lineStyle: {
                            // color: 各异,
                            width: 1,
                            type: 'solid'
                        }
                    }
                },
                emphasis: {
                    // color: 各异,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1,
                    label: {
                        show: false
                        // position: 'outer'
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持回调
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    labelLine: {
                        show: false,
                        length: 20,
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
            //mapLocation: {
                // x: 'center' | 'left' | 'right' | 'x%' | {number},
                // y: 'center' | 'top' | 'bottom' | 'x%' | {number}
                // width    // 自适应
                // height   // 自适应
            //},
            // mapValueCalculation: 'sum',  // 数值合并方式，默认加和，可选为：
                                            // 'sum' | 'average' | 'max' | 'min' 
            mapValuePrecision: 0,           // 地图数值计算结果小数精度
            showLegendSymbol: true,         // 显示图例颜色标识（系列标识的小圆点），存在legend时生效
            // selectedMode: false,         // 选择模式，默认关闭，可选single，multiple
            dataRangeHoverLink: true,
            hoverable: true,
            clickable: true,
            // roam: false,                 // 是否开启缩放及漫游模式
            // scaleLimit: null,
            itemStyle: {
                normal: {
                    // color: 各异,
                    borderColor: 'rgba(0,0,0,0)',
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
                    // color: 各异,
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
        
        force: {
            // 布局中心
            center: ['50%', '50%'],

            // 布局大小
            size: '100%',

            // 防止节点和节点，节点和边之间的重叠
            preventOverlap: false,
            
            // 布局冷却因子，值越小结束时间越短，值越大时间越长但是结果也越收敛
            coolDown: 0.99,
            
            // 数据映射到圆的半径的最小值和最大值
            minRadius: 10,
            maxRadius: 20,

            // 是否根据屏幕比例拉伸
            ratioScaling: false,

            // 在 500+ 顶点的图上建议设置 large 为 true, 会使用 Barnes-Hut simulation
            // 同时开启 useWorker 并且把 steps 值调大
            // 关于Barnes-Hut simulation: http://en.wikipedia.org/wiki/Barnes–Hut_simulation
            large: false,

            // 是否在浏览器支持 worker 的时候使用 web worker
            useWorker: false,
            // 每一帧 force 迭代的次数，仅在启用webworker的情况下有用
            steps: 1,

            // 布局缩放因子，并不完全精确, 效果跟布局大小类似
            scaling: 1.0,

            // 向心力因子，越大向心力越大（ 所有顶点会往 center 的位置收拢 )
            gravity: 1,

            symbol: 'circle',
            // symbolSize 为 0 的话使用映射到minRadius-maxRadius后的值
            symbolSize: 0,

            linkSymbol: null,
            linkSymbolSize: [10, 15],
            draggable: true,
            clickable: true,

            roam: false,

            // 分类里如果有样式会覆盖节点默认样式
            // categories: [{
                // itemStyle
                // symbol
                // symbolSize
                // name
            // }],
            itemStyle: {
                normal: {
                    // color: 各异,
                    label: {
                        show: false,
                        position: 'inside'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    nodeStyle: {
                        brushType : 'both',
                        borderColor : '#5182ab',
                        borderWidth: 1
                    },
                    linkStyle: {
                        color: '#5182ab',
                        width: 1,
                        type: 'line'
                    }
                },
                emphasis: {
                    // color: 各异,
                    label: {
                        show: false
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    nodeStyle: {},
                    linkStyle: {
                        opacity: 0
                    }
                }
            }
            // nodes: [{
            //     name: 'xxx',
            //     value: 1,
            //     itemStyle: {},
            //     initial: [0, 0],
            //     fixX: false,
            //     fixY: false,
            //     ignore: false,
            //     symbol: 'circle',
            //     symbolSize: 0
            // }]
            // links: [{
            //      source: 1,
            //      target: 2,
            //      weight: 1,
            //      itemStyle: {}
            // }, {
            //      source: 'xxx',
            //      target: 'ooo'
            // }]
        },

        chord: {
            clickable: true,
            radius: ['65%', '75%'],
            center: ['50%', '50%'],
            padding: 2,
            sort: 'none',       // can be 'none', 'ascending', 'descending'
            sortSub: 'none',    // can be 'none', 'ascending', 'descending'
            startAngle: 90,
            clockWise: true,
            ribbonType: true,
            
            /***************** 下面的配置项在 ribbonType 为 false 时有效 */
            // 同force类似
            minRadius: 10,
            maxRadius: 20,
            symbol: 'circle',
            /***************** 上面的配置项在 ribbonType 为 false 时有效 */

            /***************** 下面的配置项在 ribbonType 为 true 时有效 */
            showScale: false,
            showScaleText: false,
            /***************** 上面的配置项在 ribbonType 为 true 时有效 */

            // 分类里如果有样式会覆盖节点默认样式
            // categories: [{
                // itemStyle
                // symbol
                // symbolSize
                // name
            // }],

            itemStyle: {
                normal: {
                    borderWidth: 0,
                    borderColor: '#000',
                    label: {
                        show: true,
                        rotate: false,
                        distance: 5
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    chordStyle: {
                        /** ribbonType = false 时有效 */
                        width: 1,
                        color: 'black',
                        /** ribbonType = true 时有效 */
                        borderWidth: 1,
                        borderColor: '#999',
                        opacity: 0.5
                    }
                },
                emphasis: {
                    borderWidth: 0,
                    borderColor: '#000',
                    chordStyle: {
                        /** ribbonType = false 时有效 */
                        width: 1,
                        color: 'black',
                        /** ribbonType = true 时有效 */
                        borderWidth: 1,
                        borderColor: '#999'
                    }
                }
            }
            /****** 使用 Data-matrix 表示数据 */
            // data: [],
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
            // matrix: [],

            /****** 使用 node-links 表示数据 */
            // 参考 force
            // nodes: [],
            // links: []
        },

        gauge: {
            center: ['50%', '50%'],    // 默认全局居中
            legendHoverLink: true,
            radius: '75%',
            startAngle: 225,
            endAngle: -45,
            min: 0,                     // 最小值
            max: 100,                   // 最大值
            precision: 0,               // 小数精度，默认为0，无小数点
            splitNumber: 10,            // 分割段数，默认为10
            axisLine: {            // 坐标轴线
                show: true,        // 默认显示，属性show控制显示与否
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: [[0.2, '#228b22'],[0.8, '#48b'],[1, '#ff4500']], 
                    width: 30
                }
            },
            axisTick: {            // 坐标轴小标记
                show: true,        // 属性show控制显示与否，默认不显示
                splitNumber: 5,    // 每份split细分多少段
                length :8,         // 属性length控制线长
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: '#eee',
                    width: 1,
                    type: 'solid'
                }
            },
            axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
                show: true,
                // formatter: null,
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: 'auto'
                }
            },
            splitLine: {           // 分隔线
                show: true,        // 默认显示，属性show控制显示与否
                length :30,         // 属性length控制线长
                lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                    color: '#eee',
                    width: 2,
                    type: 'solid'
                }
            },
            pointer: {
                show: true,
                length: '80%',
                width: 8,
                color: 'auto'
            },
            title: {
                show: true,
                offsetCenter: [0, '-40%'],      // x, y，单位px
                textStyle: {                    // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: '#333',
                    fontSize: 15
                }
            },
            detail: {
                show: true,
                backgroundColor: 'rgba(0,0,0,0)',
                borderWidth: 0,
                borderColor: '#ccc',
                width: 100,
                height: 40,
                offsetCenter: [0, '40%'],   // x, y，单位px
                // formatter: null,
                textStyle: {                // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: 'auto',
                    fontSize: 30
                }
            }
        },
        
        funnel: {
            clickable: true,
            legendHoverLink: true,
            x: 80,
            y: 60,
            x2: 80,
            y2: 60,
            // width: {totalWidth} - x - x2,
            // height: {totalHeight} - y - y2,
            min: 0,
            max: 100,
            minSize: '0%',
            maxSize: '100%',
            sort: 'descending', // 'ascending', 'descending'
            gap: 0,
            funnelAlign: 'center',
            itemStyle: {
                normal: {
                    // color: 各异,
                    borderColor: '#fff',
                    borderWidth: 1,
                    label: {
                        show: true,
                        position: 'outer'
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持回调
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    labelLine: {
                        show: true,
                        length: 10,
                        lineStyle: {
                            // color: 各异,
                            width: 1,
                            type: 'solid'
                        }
                    }
                },
                emphasis: {
                    // color: 各异,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1,
                    label: {
                        show: true
                    },
                    labelLine: {
                        show: true
                    }
                }
            }
        },
        
        eventRiver: {
            clickable: true,
            legendHoverLink: true,
            itemStyle: {
                normal: {
                    // color: 各异,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1,
                    label: {
                        show: true,
                        position: 'inside',     // 可选为'left'|'right'|'top'|'bottom'
                        formatter: '{b}'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                },
                emphasis: {
                    // color: 各异,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1,
                    label: {
                        show: true
                    }
                }
            }
        },
        
        island: {
            r: 15,
            calculateStep: 0.1  // 滚轮可计算步长 0.1 = 10%
        },
        
        markPoint: {
            clickable: true,
            symbol: 'pin',         // 标注类型
            symbolSize: 10,        // 标注大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            // symbolRotate: null, // 标注旋转控制
            large: false,
            effect: {
                show: false,
                loop: true,
                period: 15,             // 运动周期，无单位，值越大越慢
                scaleSize: 2            // 放大倍数，以markPoint点size为基准
                // color: 'gold',
                // shadowColor: 'rgba(255,215,0,0.8)',
                // shadowBlur: 0          // 炫光模糊
            },
            itemStyle: {
                normal: {
                    // color: 各异，
                    // borderColor: 各异,        // 标注边线颜色，优先于color 
                    borderWidth: 2,             // 标注边线线宽，单位px，默认为1
                    label: {
                        show: true,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        // formatter: null,
                        position: 'inside'      // 可选为'left'|'right'|'top'|'bottom'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                },
                emphasis: {
                    // color: 各异
                    label: {
                        show: true
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        // formatter: null,
                        // position: 'inside'  // 'left'|'right'|'top'|'bottom'
                        // textStyle: null     // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            }
        },
        
        markLine: {
            clickable: true,
            // 标线起始和结束的symbol介绍类型，如果都一样，可以直接传string
            symbol: ['circle', 'arrow'],  
            // 标线起始和结束的symbol大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            symbolSize: [2, 4],
            // 标线起始和结束的symbol旋转控制
            //symbolRotate: null,
            //smooth: false,
            large: false,
            effect: {
                show: false,
                loop: true,
                period: 15,                     // 运动周期，无单位，值越大越慢
                scaleSize: 2                    // 放大倍数，以markLine线lineWidth为基准
                // color: 'gold',
                // shadowColor: 'rgba(255,215,0,0.8)',
                // shadowBlur: lineWidth * 2    // 炫光模糊，默认等于scaleSize计算所得
            },
            itemStyle: {
                normal: {
                    // color: 各异,               // 标线主色，线色，symbol主色
                    // borderColor: 随color,     // 标线symbol边框颜色，优先于color 
                    borderWidth: 1.5,           // 标线symbol边框线宽，单位px，默认为2
                    label: {
                        show: true,
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        // formatter: null,
                        // 可选为 'start'|'end'|'left'|'right'|'top'|'bottom'
                        position: 'end'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    lineStyle: {
                        // color: 随borderColor, // 主色，线色，优先级高于borderColor和color
                        // width: 随borderWidth, // 优先于borderWidth
                        type: 'dashed'
                        // shadowColor: 'rgba(0,0,0,0)', //默认透明
                        // shadowBlur: 0,
                        // shadowOffsetX: 0,
                        // shadowOffsetY: 0
                    }
                },
                emphasis: {
                    // color: 各异
                    label: {
                        show: false
                        // 标签文本格式器，同Tooltip.formatter，不支持回调
                        // formatter: null,
                        // position: 'inside' // 'left'|'right'|'top'|'bottom'
                        // textStyle: null    // 默认使用全局文本样式，详见TEXTSTYLE
                    },
                    lineStyle: {}
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
            DBLCLICK: 'dblclick',
            HOVER: 'hover',
            MOUSEOUT: 'mouseout',
            //MOUSEWHEEL: 'mousewheel',
            // -------业务交互逻辑
            DATA_CHANGED: 'dataChanged',
            DATA_ZOOM: 'dataZoom',
            DATA_RANGE: 'dataRange',
            DATA_RANGE_HOVERLINK: 'dataRangeHoverLink',
            LEGEND_SELECTED: 'legendSelected',
            LEGEND_HOVERLINK: 'legendHoverLink',
            MAP_SELECTED: 'mapSelected',
            PIE_SELECTED: 'pieSelected',
            MAGIC_TYPE_CHANGED: 'magicTypeChanged',
            DATA_VIEW_CHANGED: 'dataViewChanged',
            TIMELINE_CHANGED: 'timelineChanged',
            MAP_ROAM: 'mapRoam',
            FORCE_LAYOUT_END: 'forceLayoutEnd',
            // -------内部通信
            TOOLTIP_HOVER: 'tooltipHover',
            TOOLTIP_IN_GRID: 'tooltipInGrid',
            TOOLTIP_OUT_GRID: 'tooltipOutGrid',
            ROAMCONTROLLER: 'roamController'
        },
        DRAG_ENABLE_TIME: 120,   // 降低图表内元素拖拽敏感度，单位ms，不建议外部干预
        EFFECT_ZLEVEL: 7,
        // 主题，默认标志图形类型列表
        symbolList: [
          'circle', 'rectangle', 'triangle', 'diamond',
          'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
        ],
        loadingText: 'Loading...',
        // 可计算特性配置，孤岛，提示颜色
        calculable: false,                      // 默认关闭可计算特性
        calculableColor: 'rgba(255,165,0,0.6)', // 拖拽提示边框颜色
        calculableHolderColor: '#ccc',          // 可计算占位提示颜色
        nameConnector: ' & ',
        valueConnector: ': ',
        animation: true,                // 过渡动画是否开启
        addDataAnimation: true,         // 动态数据接口是否开启动画效果
        animationThreshold: 2000,       // 动画元素阀值，产生的图形原素超过2000不出动画
        animationDuration: 2000,
        animationEasing: 'ExponentialOut'    //BounceOut
    };

    return config;
});
define(function(require) {

    'use strict';

    var defaultOption = {

        valueAxis: {
            show: true,
            zlevel: 0,                  // 一级层叠
            z: 10,                       // 二级层叠
            gridIndex: 0,
            position: 'left',      // 位置
            name: '',              // 坐标轴名字，默认为空
            nameLocation: 'end',   // 坐标轴名字位置，支持'start' | 'end'
            nameTextStyle: {},     // 坐标轴文字样式，默认取全局样式
            boundaryGap: [0, 0],   // 数值起始和结束两端空白策略
            // min: null,          // 最小值
            // max: null,          // 最大值
            // scale: false,       // 脱离0值比例，放大聚焦到最终_min，_max区间
            // splitNumber: 5,        // 分割段数，默认为5
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
                show: true,       // 属性show控制显示与否，默认显示
                inside: false,     // 控制小标记是否在grid里
                length: 5,         // 属性length控制线长
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

        categoryAxis: {
            show: true,
            zlevel: 0,                  // 一级层叠
            z: 10,                       // 二级层叠
            gridIndex: 0,
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
        }
    };

    var zrUtil = require('zrender/core/util');

    function mergeDefault(axisOption, ecModel) {
        var axisType = axisOption.type + 'Axis';

        zrUtil.merge(axisOption, ecModel.get(axisType));
        zrUtil.merge(axisOption, ecModel.getTheme().get(axisType));
        zrUtil.merge(axisOption, defaultOption[axisType]);
    }

    var AxisModel = require('../../model/Component').extend({
        type: 'axis',
        /**
         * @type {module:echarts/coord/cartesian/Axis2D}
         */
        axis: null
    });

    AxisModel.AxisX = AxisModel.extend({

        type: 'xAxis',

        init: function (axisOption, parentModel, ecModel) {
            axisOption.type = axisOption.type || 'category';

            mergeDefault(axisOption, ecModel);
        }
    });

    AxisModel.AxisY = AxisModel.extend({

        type: 'yAxis',

        init: function (axisOption, parentModel, ecModel) {
            axisOption.type = axisOption.type || 'value';

            mergeDefault(axisOption, ecModel);
        }
    });

    return AxisModel;
});
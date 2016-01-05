define(function (require) {

    var List = require('../../data/List');
    var SeriesModel = require('../../model/Series');
    var zrUtil = require('zrender/core/util');

    var GaugeSeries = SeriesModel.extend({

        type: 'series.gauge',

        getInitialData: function (option, ecModel) {
            var list = new List(['value'], this);
            var dataOpt = option.data || [];
            if (!zrUtil.isArray(dataOpt)) {
                dataOpt = [dataOpt];
            }
            // Only use the first data item
            list.initData(dataOpt);
            return list;
        },

        defaultOption: {
            zlevel: 0,
            z: 2,
            // 默认全局居中
            center: ['50%', '50%'],
            legendHoverLink: true,
            radius: '75%',
            startAngle: 225,
            endAngle: -45,
            clockwise: true,
            // 最小值
            min: 0,
            // 最大值
            max: 100,
            // 分割段数，默认为10
            splitNumber: 10,
            // 坐标轴线
            axisLine: {
                // 默认显示，属性show控制显示与否
                show: true,
                lineStyle: {       // 属性lineStyle控制线条样式
                    color: [[0.2, '#91c7ae'], [0.8, '#63869e'], [1, '#c23531']],
                    width: 30
                }
            },
            // 分隔线
            splitLine: {
                // 默认显示，属性show控制显示与否
                show: true,
                // 属性length控制线长
                length: 30,
                // 属性lineStyle（详见lineStyle）控制线条样式
                lineStyle: {
                    color: '#eee',
                    width: 2,
                    type: 'solid'
                }
            },
            // 坐标轴小标记
            axisTick: {
                // 属性show控制显示与否，默认不显示
                show: true,
                // 每份split细分多少段
                splitNumber: 5,
                // 属性length控制线长
                length: 8,
                // 属性lineStyle控制线条样式
                lineStyle: {
                    color: '#eee',
                    width: 1,
                    type: 'solid'
                }
            },
            axisLabel: {
                show: true,
                // formatter: null,
                textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                    color: 'auto'
                }
            },
            pointer: {
                show: true,
                length: '80%',
                width: 8
            },
            itemStyle: {
                normal: {
                    color: 'auto'
                }
            },
            title: {
                show: true,
                // x, y，单位px
                offsetCenter: [0, '-40%'],
                // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                textStyle: {
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
                // x, y，单位px
                offsetCenter: [0, '40%'],
                // formatter: null,
                // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                textStyle: {
                    color: 'auto',
                    fontSize: 30
                }
            }
        }
    });

    return GaugeSeries;
});
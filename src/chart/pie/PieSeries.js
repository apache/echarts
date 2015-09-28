define(function(require) {

    'use strict';

    var List = require('../../data/List');
    var SeriesModel = require('../../model/Series');

    return SeriesModel.extend({

        type: 'series.pie',

        getInitialData: function (option, ecModel) {
            var list = new List([{
                name: 'x',
                stackable: true
            }], this);
            list.initData(option.data);
            return list;
        },

        defaultOption: {
            zlevel: 0,
            z: 2,
            clickable: true,
            legendHoverLink: true,
            // 默认全局居中
            center: ['50%', '50%'],
            radius: [0, '75%'],
            // 默认顺时针
            clockWise: true,
            startAngle: 90,
            // 最小角度改为0
            minAngle: 0,
            // 选中是扇区偏移量
            selectedOffset: 10,
            // 选择模式，默认关闭，可选single，multiple
            // selectedMode: false,
            // 南丁格尔玫瑰图模式，'radius'（半径） | 'area'（面积）
            // roseType: null,
            itemStyle: {
                normal: {
                    // color: 各异,
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 1,
                    label: {
                        show: true,
                        position: 'outer'
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                        // distance: 当position为inner时有效，为label位置到圆心的距离与圆半径(环状图为内外半径和)的比例系数
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
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                        // distance: 当position为inner时有效，为label位置到圆心的距离与圆半径(环状图为内外半径和)的比例系数
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
        }
    });
});
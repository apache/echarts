define(function(require) {

    'use strict';

    var createListFromArray = require('../helper/createListFromArray');
    var SeriesModel = require('../../model/Series');

    return SeriesModel.extend({

        type: 'series.line',

        dependencies: ['grid', 'polar'],

        getInitialData: function (option, ecModel) {
            return createListFromArray(option.data, this, ecModel);
        },

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠
            coordinateSystem: 'cartesian2d',
            legendHoverLink: true,

            hoverAnimation: true,
            // stack: null
            xAxisIndex: 0,
            yAxisIndex: 0,

            polarIndex: 0,

            // If clip the overflow value
            clipOverflow: true,

            label: {
                normal: {
                    // show: false,
                    position: 'top'
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                    // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                    //           'inside'|'left'|'right'|'top'|'bottom'
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                }
                // emphasis: {
                    // show: false,
                    // position: 'top'
                    // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                    // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                    //           'inside'|'left'|'right'|'top'|'bottom'
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                // }
            },
            // itemStyle: {
            //     normal: {
            //         // color: 各异
            //     },
            //     emphasis: {
            //         // color: 各异,
            //     }
            // },
            lineStyle: {
                normal: {
                    width: 2,
                    type: 'solid'
                }
            },
            // areaStyle: {
            // },
            // smooth: false,
            // smoothMonotone: null,
            // 拐点图形类型
            symbol: 'emptyCircle',
            // 拐点图形大小
            symbolSize: 4,
            // 拐点图形旋转控制
            // symbolRotate: null,

            // 是否显示 symbol, 只有在 tooltip hover 的时候显示
            showSymbol: true,
            // 标志图形默认只有主轴显示（随主轴标签间隔隐藏策略）
            // showAllSymbol: false
            //
            // 大数据过滤，'average', 'max', 'min', 'sum'
            // sampling: 'none'

            animationEasing: 'linear'
        }
    });
});
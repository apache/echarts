define(function(require) {

    'use strict';

    var SeriesModel = require('../../model/Series');
    var createListFromArray = require('../helper/createListFromArray');

    return SeriesModel.extend({

        type: 'series.bar',

        dependencies: ['grid', 'polar'],

        getInitialData: function (option, ecModel) {
            return createListFromArray(option.data, this, ecModel);
        },

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠
            coordinateSystem: 'cartesian2d',
            legendHoverLink: true,
            // stack: null

            // Cartesian coordinate system
            xAxisIndex: 0,
            yAxisIndex: 0,

            // 最小高度改为0
            barMinHeight: 0,

            // barMaxWidth: null,
            // 默认自适应
            // barWidth: null,
            // 柱间距离，默认为柱形宽度的30%，可设固定值
            barGap: '30%',
            // 类目间柱形距离，默认为类目间距的20%，可设固定值
            barCategoryGap: '20%',
            // label: {
            //     normal: {
            //         show: false
            //         formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调

            //         // 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
            //         //           'inside' | 'insideleft' | 'insideTop' | 'insideRight' | 'insideBottom' |
            //         //           'outside' |'left' | 'right'|'top'|'bottom'
            //         position:

            //         textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
            //     }
            // },
            itemStyle: {
                normal: {
                    // color: '各异',
                    // 柱条边线
                    barBorderColor: '#fff',
                    // 柱条边线线宽，单位px，默认为1
                    barBorderWidth: 0
                },
                emphasis: {
                    // color: '各异',
                    // 柱条边线
                    barBorderColor: '#fff',
                    // 柱条边线线宽，单位px，默认为1
                    barBorderWidth: 0
                }
            }
        }
    });
});
define(function(require) {

    'use strict';

    var List = require('../../data/List');

    return require('../../echarts').extendSeriesModel({

        type: 'bar',

        getInitialData: function (option) {
            var list = List.fromArray(option.data, 1, this);
            return list;
        },

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠
            coordinateSystem: 'cartesian2d',
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
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
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
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                        // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            }
        }
    });
});
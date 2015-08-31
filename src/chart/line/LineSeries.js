define(function(require) {

    'use strict';

    var List = require('../../data/List');

    return require('../../echarts').extendSeriesModel({

        type: 'line',

        getInitialData: function (option, ecModel) {
            return List.fromArray(option.data, this, ecModel);
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
            gridIndex: 0,
            // 'nearest', 'min', 'max', 'average'
            dataFilter: 'nearest',
            itemStyle: {
                normal: {
                    // color: 各异,
                    label: {
                        show: false
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
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
                        // formatter: 标签文本格式器，同Tooltip.formatter，不支持异步回调
                        // position: 默认自适应，水平布局为'top'，垂直布局为'right'，可选为
                        //           'inside'|'left'|'right'|'top'|'bottom'
                        // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                    }
                }
            },
            // smooth: false,
            symbol: 'emptyCircle',         // 拐点图形类型
            symbolSize: 2,           // 拐点图形大小
            // symbolRotate: null,   // 拐点图形旋转控制
            showAllSymbol: false     // 标志图形默认只有主轴显示（随主轴标签间隔隐藏策略）
        }
    });
});
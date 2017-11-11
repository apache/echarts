import {__DEV__} from '../../config';
import createListFromArray from '../helper/createListFromArray';
import SeriesModel from '../../model/Series';

export default SeriesModel.extend({

    type: 'series.line',

    dependencies: ['grid', 'polar'],

    getInitialData: function (option, ecModel) {
        if (__DEV__) {
            var coordSys = option.coordinateSystem;
            if (coordSys !== 'polar' && coordSys !== 'cartesian2d') {
                throw new Error('Line not support coordinateSystem besides cartesian and polar');
            }
        }
        return createListFromArray(option.data, this, ecModel);
    },

    defaultOption: {
        zlevel: 0,                  // 一级层叠
        z: 2,                       // 二级层叠
        coordinateSystem: 'cartesian2d',
        legendHoverLink: true,

        hoverAnimation: true,
        // stack: null
        // xAxisIndex: 0,
        // yAxisIndex: 0,

        // polarIndex: 0,

        // If clip the overflow value
        clipOverflow: true,
        // cursor: null,

        label: {
            normal: {
                position: 'top'
            }
        },
        // itemStyle: {
        //     normal: {},
        //     emphasis: {}
        // },
        lineStyle: {
            normal: {
                width: 2,
                type: 'solid'
            }
        },
        // areaStyle: {},
        // false, 'start', 'end', 'middle'
        step: false,

        // Disabled if step is true
        smooth: false,
        smoothMonotone: null,
        // 拐点图形类型
        symbol: 'emptyCircle',
        // 拐点图形大小
        symbolSize: 4,
        // 拐点图形旋转控制
        symbolRotate: null,

        // 是否显示 symbol, 只有在 tooltip hover 的时候显示
        showSymbol: true,
        // 标志图形默认只有主轴显示（随主轴标签间隔隐藏策略）
        showAllSymbol: false,

        // 是否连接断点
        connectNulls: false,

        // 数据过滤，'average', 'max', 'min', 'sum'
        sampling: 'none',

        animationEasing: 'linear',

        // Disable progressive
        progressive: 0,
        hoverLayerThreshold: Infinity
    }
});
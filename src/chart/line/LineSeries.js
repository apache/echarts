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
        return createListFromArray(this.getSource(), this);
    },

    defaultOption: {
        zlevel: 0,
        z: 2,
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
            position: 'top'
        },
        // itemStyle: {
        // },

        lineStyle: {
            width: 2,
            type: 'solid'
        },
        // areaStyle: {
            // origin of areaStyle. Valid values:
            // `'auto'/null/undefined`: from axisLine to data
            // `'start'`: from min to data
            // `'end'`: from data to max
            // origin: 'auto'
        // },
        // false, 'start', 'end', 'middle'
        step: false,

        // Disabled if step is true
        smooth: false,
        smoothMonotone: null,
        symbol: 'emptyCircle',
        symbolSize: 4,
        symbolRotate: null,

        showSymbol: true,
        // `false`: follow the label interval strategy.
        // `true`: show all symbols.
        // `'auto'`: If possible, show all symbols, otherwise
        //           follow the label interval strategy.
        showAllSymbol: 'auto',

        // Whether to connect break point.
        connectNulls: false,

        // Sampling for large data. Can be: 'average', 'max', 'min', 'sum'.
        sampling: 'none',

        animationEasing: 'linear',

        // Disable progressive
        progressive: 0,
        hoverLayerThreshold: Infinity
    }
});
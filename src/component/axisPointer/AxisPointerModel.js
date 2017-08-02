define(function(require) {

    var echarts = require('../../echarts');

    var AxisPointerModel = echarts.extendComponentModel({

        type: 'axisPointer',

        coordSysAxesInfo: null,

        defaultOption: {
            // 'auto' means that show when triggered by tooltip or handle.
            show: 'auto',
            // 'click' | 'mousemove' | 'none'
            triggerOn: null, // set default in AxisPonterView.js

            zlevel: 0,
            z: 50,

            type: 'line',
            // axispointer triggered by tootip determine snap automatically,
            // see `modelHelper`.
            snap: false,
            triggerTooltip: true,

            value: null,
            status: null, // Init value depends on whether handle is used.

            // [group0, group1, ...]
            // Each group can be: {
            //      mapper: function () {},
            //      singleTooltip: 'multiple',  // 'multiple' or 'single'
            //      xAxisId: ...,
            //      yAxisName: ...,
            //      angleAxisIndex: ...
            // }
            // mapper: can be ignored.
            //      input: {axisInfo, value}
            //      output: {axisInfo, value}
            link: [],

            // Do not set 'auto' here, otherwise global animation: false
            // will not effect at this axispointer.
            animation: null,
            animationDurationUpdate: 200,

            lineStyle: {
                color: '#aaa',
                width: 1,
                type: 'solid'
            },

            shadowStyle: {
                color: 'rgba(150,150,150,0.3)'
            },

            label: {
                show: true,
                formatter: null, // string | Function
                precision: 'auto', // Or a number like 0, 1, 2 ...
                margin: 3,
                color: '#fff',
                padding: [5, 7, 5, 7],
                backgroundColor: 'auto', // default: axis line color
                borderColor: null,
                borderWidth: 0,
                shadowBlur: 3,
                shadowColor: '#aaa'
                // Considering applicability, common style should
                // better not have shadowOffset.
                // shadowOffsetX: 0,
                // shadowOffsetY: 2
            },

            handle: {
                show: false,
                icon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7v-1.2h6.6z M13.3,22H6.7v-1.2h6.6z M13.3,19.6H6.7v-1.2h6.6z', // jshint ignore:line
                size: 45,
                // handle margin is from symbol center to axis, which is stable when circular move.
                margin: 50,
                // color: '#1b8bbd'
                // color: '#2f4554'
                color: '#333',
                shadowBlur: 3,
                shadowColor: '#aaa',
                shadowOffsetX: 0,
                shadowOffsetY: 2,

                // For mobile performance
                throttle: 40
            }
        }

    });

    return AxisPointerModel;

});
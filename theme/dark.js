(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
}(this, function (exports, echarts) {
    var log = function (msg) {
        if (typeof console !== 'undefined') {
            console && console.error && console.error(msg);
        }
    };
    if (!echarts) {
        log('ECharts is not Loaded');
        return;
    }
    var contrastColor = '#eee';
    var axisCommon = {
        axisLine: {
            lineStyle: {
                color: contrastColor
            }
        },
        axisTick: {
            lineStyle: {
                color: contrastColor
            }
        },
        axisLabel: {
            textStyle: {
                color: contrastColor
            }
        },
        splitLine: {
            lineStyle: {
                color: contrastColor
            }
        },
        splitArea: {
            areaStyle: {
                color: contrastColor
            }
        }
    };
    echarts.registerTheme('dark', {
        color: ['#dd6b66','#e69d87','#8dc1a9','#759aa0','#ea7e53','#eedd78','#73a373','#73b9bc','#7289ab', '#91ca8c','#f49f42'],
        backgroundColor: '#333',
        legend: {
            textStyle: {
                color: contrastColor
            }
        },
        textStyle: {
            color: contrastColor
        },
        title: {
            textStyle: {
                color: contrastColor
            }
        },
        line: {
            symbol: 'circle'
        },
        toolbox: {
            iconStyle: {
                normal: {
                    brderColor: contrastColor
                }
            }
        },
        timeAxis: axisCommon,
        logAxis: axisCommon,
        valueAxis: axisCommon,
        categoryAxis: axisCommon
    });
}));
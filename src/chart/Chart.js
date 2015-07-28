define(function (require) {

    var zrUtil = require('zrender/core/util');

    function Chart(echarts, chartOption) {

    }

    Chart.prototype = {

        type: '',

        init: function () {},

        render: function () {},

        dispose: function () {}
    };

    var chartClassStore = {};

    Chart.extend = function (proto) {
        var Super = this;

        var ExtendedChart = function (echarts, chartOption) {
            Super.call(this, echarts, chartOption);
        };

        for (var name in proto) {
            ExtendedChart.prototype[name] = proto[name];
        }

        ExtendedChart.extend = Super.extend;

        zrUtil.inherits(ExtendedChart, Super);

        if (proto.type) {
            if (chartClassStore[proto.type]) {
                // Error exists
            }
            chartClassStore[proto.type] = ExtendedChart;
        }

        return ExtendedChart;
    };

    /**
     * Create a chart by a given option
     */
    Chart.create = function (option) {
        var chartType = option.type;
        var ExtendedChart = chartClassStore[chartType];
        if (! ExtendedChart) {
            // Error
        }
        return new ExtendedChart(option);
    };

    return Chart;
});
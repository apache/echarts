define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Group = require('zrender/container/Group');

    function Chart() {

        /**
         * @type {module:zrender/container/Group}
         * @readOnly
         */
        this.group = new Group();
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
                // Warning
            }
            chartClassStore[proto.type] = ExtendedChart;
        }

        return ExtendedChart;
    };

    /**
     * Create a chart by a given option
     */
    Chart.create = function (chartType) {
        var ExtendedChart = chartClassStore[chartType];
        if (! ExtendedChart) {
            // Error
        }
        return new ExtendedChart();
    };

    return Chart;
});
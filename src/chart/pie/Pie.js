define(function (require) {

    require('./PieSeries');

    var DataItemFilter = require('./DataItemFilter');

    var Pie = require('../Chart').extend({

        type: 'pie',

        init: function (echarts) {
            var dataItemFilter = new DataItemFilter();
            this._dataItemFilter = dataItemFilter;

            echarts.addProcessor(dataItemFilter);
        },

        render: function () {

        },

        dispose: function (echarts) {
            echarts.removeProcessor()
        }
    });

    return Pie;
});
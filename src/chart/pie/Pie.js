define(function (require) {

    require('./PieSeries');

    var DataItemFilter = require('./DataItemFilter');

    var Pie = require('../Chart').extend({

        type: 'pie',

        init: function (api) {
            var dataItemFilter = new DataItemFilter();
            this._dataItemFilter = dataItemFilter;

            api.addProcessor(dataItemFilter, true);


        },

        render: function () {

        },

        dispose: function () {}
    });

    return Pie;
});
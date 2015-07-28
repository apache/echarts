define(function (require) {

    var stateSyncHelper = require('../../processor/legendFilterStateSyncHelper')('pieDataItemFilter');

    var PieDataFilter = require('../../processor/Processor').extend({

        type: 'pieDataItemFilter',

        getInitialState: function (option) {
            var allData = option.get('legend.data') || [];
            return {
                all: allData,
                legend: allData.slice()
            };
        },

        syncState: function (globalState) {
            stateSyncHelper(this.state, globalState);
        },

        process: function (option, processorCenter) {
            option.eachSeries(function (series) {
                if (series.type === 'pie') {
                    series.getData().filter(function (dataItem) {
                        return this.state.indexOf(dataItem.name) >= 0;
                    }, this);
                }
            }, this);
        }
    });

    return PieDataFilter;
});
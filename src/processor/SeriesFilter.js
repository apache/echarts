define(function (require) {

    var zrUtil = require('zrender/core/util');

    var stateSyncHelper = require('./legendFilterStateSyncHelper')('seriesFilter');

    var SeriesFilter = require('./Processor').extend({

        type: 'seriesFilter',

        getInitialState: function (option) {
            var allData = option.get('legend.data') || [];
            return {
                all: allData,
                selected: allData.slice()
            };
        },

        syncState: function (globalState) {
            stateSyncHelper(this.state, globalState);
        },

        process: function (option) {
            return option.filterSeries(function (series) {
                return zrUtil.indexOf(this.state.selected, series.name) > 0;
            }, this);
        }
    });

    return SeriesFilter;
});
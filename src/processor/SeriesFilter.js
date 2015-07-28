define(function (require) {

    var zrUtil = require('zrender/core/util');

    var stateSyncHelper = require('./legendFilterStateSyncHelper')('seriesFilter');

    var SeriesFilter = require('./Processor').extend({

        type: 'seriesFilter',

        getInitialState: function (option) {
            // Get series legend selector
            var seriesNameList = zrUtil.map(option.get('legend.data') || [], function (item) {
                return item.name == null ? item.name : item;
            });
            seriesNameList = zrUtil.filter(seriesNameList, function (item) {
                return item && option.getSeriesByName(item) != null;
            });
            return {
                all: seriesNameList,
                selected: seriesNameList.slice()
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
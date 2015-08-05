define(function (require) {

    var zrUtil = require('zrender/core/util');

    var SeriesFilter = require('./Processor').extend({

        type: 'seriesFilter',

        getInitialState: function () {
            return {
                all: [],
                selected: []
            };
        },

        optionChanged: function (option, globalState) {
            // Get series legend selector
            var seriesNameList = zrUtil.map(option.get('legend.data') || [], function (item) {
                return item.name == null ? item.name : item;
            });
            seriesNameList = zrUtil.filter(seriesNameList, function (item) {
                return item && option.getSeriesByName(item) != null;
            });
            var state = this.state;
            state.all = seriesNameList;
            state.selected = zrUtil.intersect(seriesNameList, state.selected);

            // TODO Sync state to global
        },

        syncState: function (globalState) {
            var obj = globalState.query('legend.selected', []).findWhere({
                name: 'seriesFilter'
            }, {
                name: 'seriesFilter'
            });

            this.state.all = obj.all;
            this.state.selected = obj.selected;
        },

        process: function (option) {
            return option.filterSeries(function (series) {
                return zrUtil.indexOf(this.state.selected, series.name) > 0;
            }, this);
        }
    });

    return SeriesFilter;
});
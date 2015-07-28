define(function (require) {

    var stateSyncHelper = require('../../processor/legendFilterStateSyncHelper')('pieDataItemFilter');

    var zrUtil = require('zrender/core/util');

    var PieDataFilter = require('../../processor/Processor').extend({

        type: 'pieDataItemFilter',

        getInitialState: function (option) {
            var pieNameList = zrUtil.map(option.get('legend.data') || [], function (item) {
                return item.name == null ? item.name : item;
            });
            var pieSeries = option.getSeriesByType('pie');
            pieNameList = zrUtil.filter(pieNameList, function (name) {
                if (name) {
                    for (var i = 0; i < pieSeries.length; i++) {
                        if (pieSeries[i].getData().getItemByName(name)) {
                            return true;
                        }
                    }
                }
            });
            return {
                all: pieNameList,
                selected: pieNameList.slice()
            };
        },

        syncState: function (globalState) {
            stateSyncHelper(this.state, globalState);
        },

        process: function (option) {
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
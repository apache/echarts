define(function (require) {

    var DataSymbol = require('../helper/DataSymbol');

    require('../../echarts').extendChartView({

        type: 'graph',

        init: function () {
            var dataSymbol = new DataSymbol();
            this.group.add(dataSymbol.group);

            this._dataSymbol = dataSymbol;
        },

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();

            this._dataSymbol.updateData(
                data, seriesModel, api, false
            );
        },

        remove: function (ecModel, api) {

        }
    });
});
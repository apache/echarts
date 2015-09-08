define(function (require) {

    var DataSymbol = require('../helper/DataSymbol');

    require('../../echarts').extendChartView({

        type: 'scatter',

        init: function () {
            this._dataSymbol = new DataSymbol();
            this.group.add(this._dataSymbol.group);
        },

        render: function (seriesModel, ecModel, api) {
            this._dataSymbol.updateData(seriesModel.getData());
        },

        remove: function () {
            this._dataSymbol.remove();
        }
    });
});
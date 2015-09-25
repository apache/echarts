define(function (require) {

    var DataSymbol = require('../helper/DataSymbol');

    require('../../echarts').extendChartView({

        type: 'scatter',

        init: function () {
            this._dataSymbol = new DataSymbol();
            this.group.add(this._dataSymbol.group);
        },

        render: function (seriesModel, ecModel) {
            this._dataSymbol.updateData(
                seriesModel.getData(), ecModel.get('animation')
            );
        },

        remove: function () {
            this._dataSymbol.remove(true);
        }
    });
});
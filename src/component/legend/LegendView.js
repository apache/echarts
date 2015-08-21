define(function (require) {

    return require('../../echarts').extendComponentView({

        type: 'legend',

        render: function (legendModel, ecModel, api) {
            legendModel.getData().each(function (dataItem) {
                var series = ecModel.getSeriesByName(dataItem.name);
                var color = ecModel.getVisual('color');
                var symbol = ecModel.getVisual('symbol');
            });
        }
    });
});
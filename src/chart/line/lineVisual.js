define(function (require) {

    require('../../echarts').registerVisualCoding(function (ecModel) {
        ecModel.eachSeriesByType('line', function (seriesModel) {
            seriesModel.setVisual('legendSymbol', 'line');
            var legendSymbol = seriesModel.get('symbol');
            if (legendSymbol && legendSymbol !== 'none') {
                seriesModel.setVisual('symbol', legendSymbol);
            }
        });
    });
});
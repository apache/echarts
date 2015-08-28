define(function (require) {

    require('./line/LineSeries');
    require('./line/LineView');
    require('./line/lineLayoutGrid');

    require('../echarts').registerVisualCoding(function (ecModel) {
        ecModel.eachSeriesByType('line', function (seriesModel) {
            seriesModel.setVisual('legendSymbol', 'line');
            var legendSymbol = seriesModel.get('symbol');
            if (legendSymbol !== 'none') {
                seriesModel.setVisual('symbol', legendSymbol);
            }
        });
    });
});
define(function (require) {

    require('../../echarts').registerVisualCoding(function (ecModel) {

        ecModel.eachSeriesByType('scatter', function (scatterSeries) {
            var symbolType = scatterSeries.get('symbol');
            var symbolSize = scatterSeries.get('symbolSize');
            scatterSeries.setVisual({
                legendSymbol: symbolType,
                symbol: symbolType,
                symbolSize: symbolSize
            });

            var data = scatterSeries.getData();
            data.each(function (dataItem) {
                var symbolType = dataItem.get('symbol');
                var symbolSize = dataItem.get('symbolSize');
                if (symbolType && symbolType !== 'none') {
                    scatterSeries.setVisual({
                        symbol: symbolType,
                        symbolSize: symbolSize
                    });
                }
            });
        });
    });
});
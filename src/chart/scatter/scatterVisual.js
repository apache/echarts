define(function (require) {

    require('../../echarts').registerVisualCoding(function (ecModel) {

        ecModel.eachSeriesByType('scatter', function (scatterSeries) {
            var symbolType = scatterSeries.get('symbol') || 'circle';
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
                if (typeof symbolSize === 'function') {
                    dataItem.setVisual({
                        symbol: symbolType,
                        symbolSize: symbolSize([
                            dataItem.getX(),
                            dataItem.getY(),
                            dataItem.getValue()
                        ])
                    });
                }
                else if (symbolType && symbolType !== 'none') {
                    dataItem.setVisual({
                        symbol: symbolType,
                        symbolSize: symbolSize
                    });
                }
            });
        });
    });
});
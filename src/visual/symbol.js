define(function (require) {

    return function (seriesType, defaultSymbolType, legendSymbol, ecModel, api) {
        ecModel.eachSeriesByType(seriesType, function (scatterSeries) {
            var symbolType = scatterSeries.get('symbol') || defaultSymbolType;
            var symbolSize = scatterSeries.get('symbolSize');
            scatterSeries.setVisual({
                legendSymbol: legendSymbol || symbolType,
                symbol: symbolType,
                symbolSize: symbolSize
            });

            var data = scatterSeries.getData();
            data.each(function (dataItem) {
                var symbolType = dataItem.get('symbol');
                var symbolSize = dataItem.get('symbolSize');
                if (typeof symbolSize === 'function') {
                    var rawValue = dataItem.get('value') || dataItem.get();
                    dataItem.setVisual({
                        symbol: symbolType,
                        symbolSize: symbolSize(rawValue)
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
    };
});
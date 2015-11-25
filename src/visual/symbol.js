define(function (require) {

    function isSymbolNone(symbolType) {
        return symbolType === 'none';
    }

    return function (seriesType, defaultSymbolType, legendSymbol, ecModel, api) {

        // Encoding visual for all series include which is filtered for legend drawing
        ecModel.eachRawSeriesByType(seriesType, function (seriesModel) {
            var data = seriesModel.getData();

            var symbolType = seriesModel.get('symbol') || defaultSymbolType;
            var symbolSize = seriesModel.get('symbolSize');

            data.setVisual({
                legendSymbol: legendSymbol || symbolType,
                symbol: symbolType,
                symbolSize: symbolSize
            });

            // Only visible series has each data be visual encoded
            if (!ecModel.isSeriesFiltered(seriesModel)) {
                if (typeof symbolSize === 'function') {
                    data.each(function (idx) {
                        var rawValue = data.getRawValue(idx);
                        // FIXME
                        var params = seriesModel.getDataParams(idx);
                        data.setItemVisual(idx, 'symbolSize', symbolSize(rawValue, params));
                    });
                }
                data.each(function (idx) {
                    var itemModel = data.getItemModel(idx);
                    var symbolType = itemModel.get('symbol', true);
                    var symbolSize = itemModel.get('symbolSize', true);
                    // If has symbol
                    if (!isSymbolNone(defaultSymbolType) || !isSymbolNone(defaultSymbolType)) {
                        data.setItemVisual(idx, 'symbol', symbolType);
                        if (symbolSize != null) {
                            // PENDING Transform symbolSize ?
                            data.setItemVisual(idx, 'symbolSize', symbolSize);
                        }
                    }
                });
            }
        });
    };
});
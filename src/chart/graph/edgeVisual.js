define(function (require) {
    return function (ecModel) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            var edgeData = seriesModel.getEdgeData();
            var symbolType = seriesModel.get('edgeSymbol');
            var symbolSize = seriesModel.get('edgeSymbolSize');
            if (!(symbolType instanceof Array)) {
                symbolType = [symbolType, symbolType];
            }
            if (!(symbolSize instanceof Array)) {
                symbolSize = [symbolSize, symbolSize];
            }
            edgeData.setVisual('fromSymbol', symbolType && symbolType[0]);
            edgeData.setVisual('toSymbol', symbolType && symbolType[1]);
            edgeData.setVisual('fromSymbolSize', symbolSize && symbolSize[0]);
            edgeData.setVisual('toSymbolSize', symbolSize && symbolSize[1]);

            edgeData.setVisual('color', seriesModel.get('lineStyle.normal.color'));
        });
    };
});
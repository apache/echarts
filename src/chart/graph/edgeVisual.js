define(function (require) {

    function normalize(a) {
        if (!(a instanceof Array)) {
            a = [a, a];
        }
        return a;
    }
    return function (ecModel) {
        ecModel.eachSeriesByType('graph', function (seriesModel) {
            var edgeData = seriesModel.getEdgeData();
            var symbolType = normalize(seriesModel.get('edgeSymbol'));
            var symbolSize = normalize(seriesModel.get('edgeSymbolSize'));

            edgeData.setVisual('fromSymbol', symbolType && symbolType[0]);
            edgeData.setVisual('toSymbol', symbolType && symbolType[1]);
            edgeData.setVisual('fromSymbolSize', symbolSize && symbolSize[0]);
            edgeData.setVisual('toSymbolSize', symbolSize && symbolSize[1]);
            edgeData.setVisual('color', seriesModel.get('lineStyle.normal.color'));

            edgeData.each(function (idx) {
                var itemModel = edgeData.getItemModel(idx);
                var symbolType = normalize(itemModel.getShallow('symbol', true));
                var symbolSize = normalize(itemModel.getShallow('symbolSize', true));

                symbolType[0] && edgeData.setItemVisual(idx, 'fromSymbol', symbolType[0]);
                symbolType[1] && edgeData.setItemVisual(idx, 'toSymbol', symbolType[1]);
                symbolSize[0] && edgeData.setItemVisual(idx, 'fromSymbolSize', symbolSize[0]);
                symbolSize[1] && edgeData.setItemVisual(idx, 'toSymbolSize', symbolSize[1]);
            });
        });
    };
});
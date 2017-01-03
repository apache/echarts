define(function (require) {

    function normalize(a) {
        if (!(a instanceof Array)) {
            a = [a, a];
        }
        return a;
    }
    return function (ecModel) {
        ecModel.eachSeriesByType('lines', function (seriesModel) {
            var data = seriesModel.getData();
            var symbolType = normalize(seriesModel.get('symbol'));
            var symbolSize = normalize(seriesModel.get('symbolSize'));

            var opacityQuery = 'lineStyle.normal.opacity'.split('.');

            data.setVisual('fromSymbol', symbolType && symbolType[0]);
            data.setVisual('toSymbol', symbolType && symbolType[1]);
            data.setVisual('fromSymbolSize', symbolSize && symbolSize[0]);
            data.setVisual('toSymbolSize', symbolSize && symbolSize[1]);
            data.setVisual('opacity', seriesModel.get(opacityQuery));

            data.each(function (idx) {
                var itemModel = data.getItemModel(idx);
                var symbolType = normalize(itemModel.getShallow('symbol', true));
                var symbolSize = normalize(itemModel.getShallow('symbolSize', true));
                var opacity = itemModel.get(opacityQuery);

                symbolType[0] && data.setItemVisual(idx, 'fromSymbol', symbolType[0]);
                symbolType[1] && data.setItemVisual(idx, 'toSymbol', symbolType[1]);
                symbolSize[0] && data.setItemVisual(idx, 'fromSymbolSize', symbolSize[0]);
                symbolSize[1] && data.setItemVisual(idx, 'toSymbolSize', symbolSize[1]);

                data.setItemVisual(idx, 'opacity', opacity);
            });
        });
    };
});
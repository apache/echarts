
function normalize(a) {
    if (!(a instanceof Array)) {
        a = [a, a];
    }
    return a;
}

var opacityQuery = 'lineStyle.opacity'.split('.');

export default {
    seriesType: 'lines',
    reset: function (seriesModel, ecModel, api) {
        var symbolType = normalize(seriesModel.get('symbol'));
        var symbolSize = normalize(seriesModel.get('symbolSize'));
        var data = seriesModel.getData();

        data.setVisual('fromSymbol', symbolType && symbolType[0]);
        data.setVisual('toSymbol', symbolType && symbolType[1]);
        data.setVisual('fromSymbolSize', symbolSize && symbolSize[0]);
        data.setVisual('toSymbolSize', symbolSize && symbolSize[1]);
        data.setVisual('opacity', seriesModel.get(opacityQuery));

        function dataEach(data, idx) {
            var itemModel = data.getItemModel(idx);
            var symbolType = normalize(itemModel.getShallow('symbol', true));
            var symbolSize = normalize(itemModel.getShallow('symbolSize', true));
            var opacity = itemModel.get(opacityQuery);

            symbolType[0] && data.setItemVisual(idx, 'fromSymbol', symbolType[0]);
            symbolType[1] && data.setItemVisual(idx, 'toSymbol', symbolType[1]);
            symbolSize[0] && data.setItemVisual(idx, 'fromSymbolSize', symbolSize[0]);
            symbolSize[1] && data.setItemVisual(idx, 'toSymbolSize', symbolSize[1]);

            data.setItemVisual(idx, 'opacity', opacity);
        }

        return {dataEach: data.hasItemOption ? dataEach : null};
    }
};


export default function (seriesType, defaultSymbolType, legendSymbol, ecModel) {
    var tasks = [];

    // Encoding visual for all series include which is filtered for legend drawing
    ecModel.eachRawSeriesByType(seriesType, function (seriesModel) {
        var task = createTask(seriesModel, defaultSymbolType, legendSymbol, ecModel);
        if (task) {
            seriesModel.pipe(task);
            tasks.push(task);
        }
    });

    return tasks;
}

function createTask(seriesModel, defaultSymbolType, legendSymbol, ecModel) {
    var data = seriesModel.getData();

    var symbolType = seriesModel.get('symbol') || defaultSymbolType;
    var symbolSize = seriesModel.get('symbolSize');

    data.setVisual({
        legendSymbol: legendSymbol || symbolType,
        symbol: symbolType,
        symbolSize: symbolSize
    });

    // Only visible series has each data be visual encoded
    if (ecModel.isSeriesFiltered(seriesModel)) {
        return;
    }

    return data.createEachPump(function (idx) {
        if (typeof symbolSize === 'function') {
            var rawValue = seriesModel.getRawValue(idx);
            // FIXME
            var params = seriesModel.getDataParams(idx);
            data.setItemVisual(idx, 'symbolSize', symbolSize(rawValue, params));
        }

        var itemModel = data.getItemModel(idx);
        var itemSymbolType = itemModel.getShallow('symbol', true);
        var itemSymbolSize = itemModel.getShallow('symbolSize', true);
        // If has item symbol
        if (itemSymbolType != null) {
            data.setItemVisual(idx, 'symbol', itemSymbolType);
        }
        if (itemSymbolSize != null) {
            // PENDING Transform symbolSize ?
            data.setItemVisual(idx, 'symbolSize', itemSymbolSize);
        }
    });
}

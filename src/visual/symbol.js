
export default function (seriesType, defaultSymbolType, legendSymbol) {
    // Encoding visual for all series include which is filtered for legend drawing
    return {
        seriesType: seriesType,
        processRawSeries: true,
        reset: function (seriesModel, ecModel, api) {
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

            function dataEach(data, idx) {
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
            }

            return { dataEach: data.hasItemOption ? dataEach : null };
        }
    };
}

// export default function (seriesType, defaultSymbolType, legendSymbol, ecModel) {
//     // Encoding visual for all series include which is filtered for legend drawing
//     ecModel.eachRawSeriesByType(seriesType, function (seriesModel) {
//         seriesModel.pipeTask(
//             createTask(seriesModel, defaultSymbolType, legendSymbol, ecModel),
//             'visual'
//         );
//     });
// }

// function createTask(seriesModel, defaultSymbolType, legendSymbol, ecModel) {
//     var data = seriesModel.getData();

//     var symbolType = seriesModel.get('symbol') || defaultSymbolType;
//     var symbolSize = seriesModel.get('symbolSize');

//     data.setVisual({
//         legendSymbol: legendSymbol || symbolType,
//         symbol: symbolType,
//         symbolSize: symbolSize
//     });

//     // Only visible series has each data be visual encoded
//     if (ecModel.isSeriesFiltered(seriesModel)) {
//         return;
//     }

//     return data.createEachTask(function (idx) {
//         if (typeof symbolSize === 'function') {
//             var rawValue = seriesModel.getRawValue(idx);
//             // FIXME
//             var params = seriesModel.getDataParams(idx);
//             data.setItemVisual(idx, 'symbolSize', symbolSize(rawValue, params));
//         }

//         var itemModel = data.getItemModel(idx);
//         var itemSymbolType = itemModel.getShallow('symbol', true);
//         var itemSymbolSize = itemModel.getShallow('symbolSize', true);
//         // If has item symbol
//         if (itemSymbolType != null) {
//             data.setItemVisual(idx, 'symbol', itemSymbolType);
//         }
//         if (itemSymbolSize != null) {
//             // PENDING Transform symbolSize ?
//             data.setItemVisual(idx, 'symbolSize', itemSymbolSize);
//         }
//     });
// }

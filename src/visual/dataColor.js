// Pick color from palette for each data item
define(function (require) {

    return function (seriesType, ecModel) {
        // Pie and funnel may use diferrent scope
        var paletteScope = {};
        ecModel.eachRawSeriesByType(seriesType, function (seriesModel) {
            var dataAll = seriesModel.getRawData();
            var idxMap = {};
            if (!ecModel.isSeriesFiltered(seriesModel)) {
                var data = seriesModel.getData();
                data.each(function (idx) {
                    var rawIdx = data.getRawIndex(idx);
                    idxMap[rawIdx] = idx;
                });
                dataAll.each(function (rawIdx) {
                    // FIXME Performance
                    var itemModel = dataAll.getItemModel(rawIdx);
                    var filteredIdx = idxMap[rawIdx];
                    // If series.itemStyle.normal.color is a function. itemVisual may be encoded
                    var singleDataColor = data.getItemVisual(filteredIdx, 'color', true);

                    if (!singleDataColor) {
                        var color = itemModel.get('itemStyle.normal.color')
                            || seriesModel.getColorFromPalette(dataAll.getName(rawIdx), paletteScope);
                        // Legend may use the visual info in data before processed
                        dataAll.setItemVisual(rawIdx, 'color', color);
                        data.setItemVisual(filteredIdx, 'color', color);
                    }
                    else {
                        // Set data all color for legend
                        dataAll.setItemVisual(rawIdx, 'color', singleDataColor);
                    }
                });
            }
        });
    };
});
// Pick color from palette for each data item.
// Applicable for charts that require applying color palette
// in data level (like pie, funnel, chord).

export default function (seriesType, ecModel) {
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
                var filteredIdx = idxMap[rawIdx];

                // If series.itemStyle.normal.color is a function. itemVisual may be encoded
                var singleDataColor = filteredIdx != null
                    && data.getItemVisual(filteredIdx, 'color', true);

                if (!singleDataColor) {
                    // FIXME Performance
                    var itemModel = dataAll.getItemModel(rawIdx);
                    var color = itemModel.get('itemStyle.normal.color')
                        || seriesModel.getColorFromPalette(dataAll.getName(rawIdx), paletteScope);
                    // Legend may use the visual info in data before processed
                    dataAll.setItemVisual(rawIdx, 'color', color);

                    // Data is not filtered
                    if (filteredIdx != null) {
                        data.setItemVisual(filteredIdx, 'color', color);
                    }
                }
                else {
                    // Set data all color for legend
                    dataAll.setItemVisual(rawIdx, 'color', singleDataColor);
                }
            });
        }
    });
}
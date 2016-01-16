// Pick color from palette for each data item
define(function (require) {

    return function (seriesType, ecModel) {
        var globalColorList = ecModel.get('color');
        var offset = 0;
        ecModel.eachRawSeriesByType(seriesType, function (seriesModel) {
            var colorList = seriesModel.get('color', true);
            var dataAll = seriesModel.getRawData();
            if (!ecModel.isSeriesFiltered(seriesModel)) {
                var data = seriesModel.getData();
                data.each(function (idx) {
                    var itemModel = data.getItemModel(idx);
                    var rawIdx = data.getRawIndex(idx);
                    // If series.itemStyle.normal.color is a function. itemVisual may be encoded
                    var singleDataColor = data.getItemVisual(idx, 'color', true);
                    if (!singleDataColor) {
                        var paletteColor = colorList ? colorList[rawIdx % colorList.length]
                            : globalColorList[(rawIdx + offset) % globalColorList.length];
                        var color = itemModel.get('itemStyle.normal.color') || paletteColor;
                        // Legend may use the visual info in data before processed
                        dataAll.setItemVisual(rawIdx, 'color', color);
                        data.setItemVisual(idx, 'color', color);
                    }
                    else {
                        // Set data all color for legend
                        dataAll.setItemVisual(rawIdx, 'color', singleDataColor);
                    }
                });
            }
            offset += dataAll.count();
        });
    };
});
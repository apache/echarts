// Pick color from palette for each data item
define(function (require) {

    return function (seriesType, ecModel) {
        ecModel.eachSeriesByType(seriesType, function (seriesModel) {
            var colorList = seriesModel.get('color');
            var dataAll = seriesModel.getRawData();
            if (!ecModel.isSeriesFiltered(seriesModel)) {
                var data = seriesModel.getData();
                data.each(function (idx) {
                    var itemModel = data.getItemModel(idx);
                    var rawIdx = data.getRawIndex(idx);
                    // If series.itemStyle.normal.color is a function. itemVisual may be encoded
                    if (!data.getItemVisual(idx, 'color', true)) {
                        var color = itemModel.get('itemStyle.normal.color')
                            || colorList[rawIdx % colorList.length];
                        // Legend may use the visual info in data before processed
                        dataAll.setItemVisual(rawIdx, 'color', color);
                        data.setItemVisual(idx, 'color', color);
                    }
                });
            }
        });
    };
});
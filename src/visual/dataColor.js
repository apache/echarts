// Pick color from palette for each data item
define(function (require) {

    return function (seriesType, ecModel) {
        var offset = 0;
        var colorList = ecModel.get('color');

        ecModel.eachSeriesByTypeAll(seriesType, function (seriesModel) {
            var dataAll = seriesModel.getDataAll();
            if (!ecModel.isSeriesFiltered(seriesModel)) {
                var data = seriesModel.getData();
                data.each(function (idx) {
                    var itemModel = data.getItemModel(idx);
                    var rawIdx = data.getRawIndex(idx);
                    var color = itemModel.get('itemStyle.normal.color')
                        || colorList[(offset + rawIdx) % colorList.length];
                    // Legend may use the visual info in data before processed
                    dataAll.setItemVisual(rawIdx, 'color', color);
                    data.setItemVisual(idx, 'color', color);
                });
            }
            offset += dataAll.count();
        });
    };
});
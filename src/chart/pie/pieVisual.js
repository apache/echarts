define(function (require) {

    return function (ecModel) {
        ecModel.eachSeriesByType('pie', function (seriesModel) {
            var colorList = ecModel.get('color');
            var data = seriesModel.getData();
            var dataAll = seriesModel.getDataAll();
            data.each(function (idx) {
                var itemModel = data.getItemModel(idx);
                var rawIdx = data.getRawIndex(idx);
                var color = itemModel.get('itemStyle.normal.color')
                    || colorList[rawIdx % colorList.length];
                // Legend use the visual info in data before processed
                dataAll.setItemVisual(rawIdx, 'color', color);
                data.setItemVisual(idx, 'color', color);
            });
        });
    }
});
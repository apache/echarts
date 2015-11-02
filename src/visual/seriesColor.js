define(function (require) {

    return function (ecModel) {
        ecModel.eachSeriesAll(function (seriesModel) {
            var colorList = ecModel.get('color');
            var data = seriesModel.getData();
            var color = seriesModel.get('itemStyle.normal.color') // Set in itemStyle
                || colorList[seriesModel.seriesIndex];  // Default color
            data.setVisual('color', color);

            data.each(function (idx) {
                var itemModel = data.getItemModel(idx);
                var color = itemModel.get('itemStyle.normal.color');

                if (color != null) {
                    data.setItemVisual(idx, 'color', color);
                }
            });
        });
    }
});
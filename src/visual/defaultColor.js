define(function (require) {

    return function (ecModel) {
        ecModel.eachSeries(function (seriesModel) {
            var colorList = ecModel.get('color');
            var data = seriesModel.getData();
            var color = seriesModel.get('itemStyle.normal.color') // Set in itemStyle
                || colorList[seriesModel.seriesIndex];  // Default color
            data.setVisual('color', color);
        });
    }
});
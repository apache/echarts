define(function (require) {

    return function (ecModel) {
        ecModel.eachSeriesByType('map', function (seriesModel) {
            var colorList = ecModel.get('color');
            var data = seriesModel.getData();
            var color = seriesModel.get('itemStyle.normal.areaStyle.color') // Set in itemStyle
                || colorList[seriesModel.seriesIndex];  // Default color
            data.setVisual('color', color);
        });
    }
});
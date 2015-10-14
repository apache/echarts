define(function (require) {
    return function (ecModel) {
        ecModel.eachSeriesByType('map', function (seriesModel) {
            var colorList = ecModel.get('color');
            var itemStyleModel = seriesModel.getModel('itemStyle.normal');

            var areaColor = itemStyleModel.get('areaStyle.color');
            var color = itemStyleModel.get('color')
                || colorList[seriesModel.seriesIndex % colorList.length];

            seriesModel.getData().setVisual({
                'areaColor': areaColor,
                'color': color
            });
        });
    }
});
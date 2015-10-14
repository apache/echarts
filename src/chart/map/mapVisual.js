define(function (require) {

    var STYLE_PREFIX = 'itemStyle.normal.';
    return function (ecModel) {
        var idx = 0;
        ecModel.eachSeriesByType('map', function (seriesModel) {
            var colorList = ecModel.get('color');

            var color = seriesModel.get(STYLE_PREFIX + 'areaStyle.color');
            seriesModel.getData().setVisual('color', color);

            var seriesGroup = seriesModel.seriesGroup;
            for (var i = 0; i < seriesGroup.length; i++) {
                var symbolColor = seriesGroup[i].get(STYLE_PREFIX + 'color')
                    || colorList[idx++ % colorList.length];
                seriesGroup[i].getData().setVisual('symbolColor', symbolColor);
            }
        });
    }
});
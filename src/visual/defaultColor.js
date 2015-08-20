define(function (require) {

    return function (ecModel) {
        ecModel.eachSeries(function (seriesModel, idx) {
            var colorList = ecModel.get('color');
            seriesModel.setVisual(
                'color', seriesModel.get('itemStyle.normal.color') || colorList[idx]
            );
        });
    }
});
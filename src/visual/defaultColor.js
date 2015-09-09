define(function (require) {

    return function (ecModel) {
        ecModel.eachSeries(function (seriesModel) {
            var colorList = ecModel.get('color');
            seriesModel.setVisual(
                'color', colorList[seriesModel.seriesIndex]
            );
        });
    }
});
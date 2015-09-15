define(function (require) {

    return function (ecModel) {
        ecModel.eachSeries(function (seriesModel) {
            var colorList = ecModel.get('color');
            var data = seriesModel.getData();
            data.setVisual('color', colorList[seriesModel.seriesIndex]);
        });
    }
});
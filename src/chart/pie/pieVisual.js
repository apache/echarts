define(function (require) {

    return function (ecModel) {
        ecModel.eachSeriesByType('pie', function (seriesModel) {
            var colorList = ecModel.get('color');
            var data = seriesModel.getData();

            data.each(function (idx) {
                data.setItemVisual(idx, 'color', colorList[idx]);
            });
        });
    }
});
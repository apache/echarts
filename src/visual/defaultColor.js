define(function (require) {

    return function (ecModel) {
        ecModel.eachSeries(function (seriesModel, idx) {
            var colorList = ecModel.get('color');
            seriesModel.visual = seriesModel.visual || {};
            seriesModel.visual.color = seriesModel.get('itemStyle.normal.color') || colorList[idx];
        });
    }
});
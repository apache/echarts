define(function () {
    return function (seriesType, ecModel) {
        var legendModel = ecModel.getComponent('legend');
        if (!legendModel) {
            return;
        }
        ecModel.eachSeriesByType(seriesType, function (series) {
            var data = series.getData();
            data.filterSelf(function (idx) {
                return legendModel.isSelected(data.getName(idx));
            }, this);
        }, this);
    };
});
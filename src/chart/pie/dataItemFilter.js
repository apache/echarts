define(function () {
    return function (ecModel) {
        var legendModel = legendModel.getComponent('legend');
        ecModel.eachSeriesByType('pie', function (series) {
            series.getData().filterSelf(function (dataItem) {
                return legendModel.isSelected(dataItem.name);
            }, this);
        }, this);
    };
});
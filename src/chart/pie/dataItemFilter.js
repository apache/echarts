define(function () {
    return function (ecModel) {
        var legendModel = ecModel.getComponent('legend');
        if (!legendModel) {
            return;
        }
        ecModel.eachSeriesByType('pie', function (series) {
            var data = series.getData();
            data.filterSelf(function (idx) {
                return legendModel.isSelected(data.getName(idx));
            }, this);
        }, this);
    };
});
define(function (require) {

    return function (ecModel) {
        var legendModel = ecModel.getComponent('legend');
        return ecModel.filterSeries(function (series) {
            return legendModel.isSelected(series.name);
        }, this);
    }
});
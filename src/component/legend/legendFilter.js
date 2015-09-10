define(function () {
   return function (ecModel) {
        var legendModel = ecModel.getComponent('legend');
        if (legendModel) {
            ecModel.filterSeries(function (series) {
                return legendModel.isSelected(series.name);
            });
        }
    }
});
define(function () {
   return function (ecModel) {
        var legendModels = ecModel.findComponents({
            mainType: 'legend'
        });
        if (legendModels && legendModels.length) {
            ecModel.filterSeries(function (series) {
                // If in any legend component the status is not selected.
                // Because in legend series
                for (var i = 0; i < legendModels.length; i++) {
                    if (!legendModels[i].isSelected(series.name)) {
                        return false;
                    }
                }
                return true;
            });
        }
    };
});
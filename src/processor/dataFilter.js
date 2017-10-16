export default function (seriesType, ecModel) {
    var legendModels = ecModel.findComponents({
        mainType: 'legend'
    });
    if (!legendModels || !legendModels.length) {
        return;
    }
    ecModel.eachSeriesByType(seriesType, function (series) {
        var data = series.getData();
        data.filterSelf(function (idx) {
            var name = data.getName(idx);
            // If in any legend component the status is not selected.
            for (var i = 0; i < legendModels.length; i++) {
                if (!legendModels[i].isSelected(name)) {
                    return false;
                }
            }
            return true;
        }, this);
    }, this);
}
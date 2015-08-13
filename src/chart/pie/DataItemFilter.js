define(function () {
    return function (ecModel) {
        var legendModel = legendModel.getComponent('legend');
        ecModel.eachSeries(function (series) {
            if (series.type === 'pie') {
                series.getData().filter(function (dataItem) {
                    return legendModel.isSelected(dataItem.name);
                }, this);
            }
        }, this);
    };
});
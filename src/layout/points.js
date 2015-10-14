define(function (require) {

    return function (seriesType, ecModel, api) {
        ecModel.eachSeriesByType(seriesType, function (seriesModel) {
            var data = seriesModel.getData();
            var coordSys = seriesModel.coordinateSystem;

            var dims = coordSys.dimensions;
            data.each(dims, function (x, y, idx) {
                if (!isNaN(y) && !isNaN(x)) {
                    var point = coordSys.dataToPoint([x, y]);
                    data.setItemLayout(idx, point);
                }
            }, true);
        });
    }
});
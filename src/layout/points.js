define(function (require) {

    return function (seriesType, ecModel) {
        ecModel.eachSeriesByType(seriesType, function (seriesModel) {
            var data = seriesModel.getData();
            var coordSys = seriesModel.coordinateSystem;

            if (!coordSys) {
                return;
            }

            var dims = [];
            var coordDims = coordSys.dimensions;
            for (var i = 0; i < coordDims.length; i++) {
                dims.push(seriesModel.coordDimToDataDim(coordSys.dimensions[i])[0]);
            }

            if (dims.length === 1) {
                data.each(dims[0], function (x, idx) {
                    // Also {Array.<number>}, not undefined to avoid if...else... statement
                    data.setItemLayout(idx, isNaN(x) ? [NaN, NaN] : coordSys.dataToPoint(x));
                });
            }
            else if (dims.length === 2) {
                data.each(dims, function (x, y, idx) {
                    // Also {Array.<number>}, not undefined to avoid if...else... statement
                    data.setItemLayout(
                        idx, (isNaN(x) || isNaN(y)) ? [NaN, NaN] : coordSys.dataToPoint([x, y])
                    );
                }, true);
            }
        });
    };
});

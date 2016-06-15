define(function (require) {

    return function (seriesType, ecModel) {
        ecModel.eachSeriesByType(seriesType, function (seriesModel) {
            var data = seriesModel.getData();
            var coordSys = seriesModel.coordinateSystem;

            if (coordSys) {
                var dims = coordSys.dimensions;

                if (coordSys.type === 'singleAxis') {
                    data.each(dims[0], function (x, idx) {
                        // Also {Array.<number>}, not undefined to avoid if...else... statement
                        data.setItemLayout(idx, isNaN(x) ? [NaN, NaN] : coordSys.dataToPoint(x));
                    });
                }
                else {
                    data.each(dims, function (x, y, idx) {
                        // Also {Array.<number>}, not undefined to avoid if...else... statement
                        data.setItemLayout(
                            idx, (isNaN(x) || isNaN(y)) ? [NaN, NaN] : coordSys.dataToPoint([x, y])
                        );
                    }, true);
                }
            }
        });
    };
});
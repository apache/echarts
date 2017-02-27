define(function (require) {

    var zrUtil = require('zrender/core/util');

    return function (seriesType, ecModel) {
        ecModel.eachSeriesByType(seriesType, function (seriesModel) {
            var data = seriesModel.getData();
            var coordSys = seriesModel.coordinateSystem;

            if (coordSys) {
                var dims = zrUtil.map(coordSys.dimensions, function (dimItem) {
                    return zrUtil.isObject(dimItem) ? dimItem.name : dimItem;
                });

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
            }
        });
    };
});
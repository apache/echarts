define(function (require) {

    return function (ecModel) {
        ecModel.eachSeriesByType('lines', function (seriesModel) {
            var coordSys = seriesModel.coordinateSystem;
            var lineData = seriesModel.getData();

            // FIXME Use data dimensions ?
            lineData.each(function (idx) {
                var itemModel = lineData.getItemModel(idx);
                var coords = itemModel.get('coords');

                if (__DEV__) {
                    if (!(coords instanceof Array && coords.length > 0)) {
                        throw new Error('Lines must have coords array in data item.');
                    }
                }

                var p1 = coordSys.dataToPoint(coords[0]);
                var p2 = coordSys.dataToPoint(coords[1]);

                var curveness = itemModel.get('lineStyle.normal.curveness');
                var cp1;
                if (curveness > 0) {
                    cp1 = [
                        (p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * curveness,
                        (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * curveness
                    ];
                }
                lineData.setItemLayout(idx, [p1, p2, cp1]);
            });
        });
    };
});
define(function (require) {

    return function (ecModel) {
        ecModel.eachSeriesByType('lines', function (seriesModel) {
            var coordSys = seriesModel.coordinateSystem;
            var fromData = seriesModel.fromData;
            var toData = seriesModel.toData;
            var lineData = seriesModel.getData();

            var dims = coordSys.dimensions;
            fromData.each(dims, function (x, y, idx) {
                fromData.setItemLayout(idx, coordSys.dataToPoint([x, y]));
            });
            toData.each(dims, function (x, y, idx) {
                toData.setItemLayout(idx, coordSys.dataToPoint([x, y]));
            });
            lineData.each(function (idx) {
                var p1 = fromData.getItemLayout(idx);
                var p2 = toData.getItemLayout(idx);
                var curveness = lineData.getItemModel(idx).get('lineStyle.normal.curveness');
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
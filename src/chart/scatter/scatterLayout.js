define(function (require) {

    require('../../echarts').registerLayout(function (ecModel, api) {

        ecModel.eachSeriesByType('scatter', function (scatterSeries) {
            var cartesian = scatterSeries.coordinateSystem;
            if (cartesian.type !== 'cartesian2d') {
                return;
            }

            var data = scatterSeries.getData();
            var coords = cartesian.dataToCoords(data);
            data.each(function (dataItem, idx) {
                var coord = coords[idx];

                dataItem.layout = {
                    x: coord[0],
                    y: coord[1]
                };
            });
        });
    });
});
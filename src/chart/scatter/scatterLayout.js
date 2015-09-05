define(function (require) {

    require('../../echarts').registerLayout(function (ecModel, api) {

        ecModel.eachSeriesByType('scatter', function (scatterSeries) {
            var coordinateSystem = scatterSeries.coordinateSystem;
            var data = scatterSeries.getData();
            var coords = coordinateSystem.dataToCoords(data);
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
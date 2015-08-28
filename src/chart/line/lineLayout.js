define(function (require) {

    require('../../echarts').registerLayout(function (ecModel, api) {

        ecModel.eachSeriesByType('line', function (lineSeries) {
            var data = lineSeries.getData();
            var coords = lineSeries.coordinateSystem.dataToCoords(data);
            data.each(function (dataItem, idx) {
                var coord = coords[idx];
                var value = dataItem.getValue();

                if (value != null) {
                    dataItem.layout = {
                        x: coord[0],
                        y: coord[1]
                    };
                }
            });
        });
    });
});
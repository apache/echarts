define(function (require) {
    return function (seriesType, ecModel, api) {
        ecModel.eachSeriesByType(seriesType, function (lineSeries) {
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
    }
});
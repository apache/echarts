define(function (require) {

    'use strict';

    function getSeriesStackId(seriesModel) {
        return seriesModel.get('stack') || '__ec_stack_' + seriesModel.seriesIndex;
    }

    return function (seriesType, ecModel, api) {
        var lastStackCoords = {};

        ecModel.eachSeriesByType(seriesType, function (lineSeries) {
            var data = lineSeries.getData();
            var coordSys = lineSeries.coordinateSystem;

            var dims = coordSys.type === 'cartesian2d' ? ['x', 'y'] : ['radius', 'angle'];
            var stackId = getSeriesStackId(lineSeries);

            var baseAxis = coordSys.getBaseAxis();
            var valueAxis = coordSys.getOtherAxis(baseAxis);
            var valueAxisStart = valueAxis.getExtent()[0];

            var baseCoordOffset = baseAxis.dim === 'x' ? 0 : 1;

            lastStackCoords[stackId] = lastStackCoords[stackId] || [];
            data.each(dims, function (x, y, idx) {
                if (!isNaN(y) && !isNaN(x)) {
                    var lastCoord = lastStackCoords[stackId][idx] || valueAxisStart;
                    var point = coordSys.dataToPoint([x, y]);
                    var stackPoint = [];
                    stackPoint[baseCoordOffset] = point[baseCoordOffset];
                    stackPoint[1 - baseCoordOffset] = lastCoord;

                    lastStackCoords[stackId][idx] = lastCoord;

                    data.setItemLayout(idx, {
                        point: point,
                        // Stack points for area charts
                        stackOn: stackPoint
                    });
                }
            }, true);
        });
    }
});
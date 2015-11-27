define(function (require) {

    /**
     * @payload
     * @property {string} parallelAxisId
     * @property {Array.<number>} extent
     */
    return function (ecModel, payload) {

        ecModel.eachSeriesByType('parallel', function (seriesModel) {

            var itemStyleModel = seriesModel.getModel('itemStyle.normal');
            var globalColors = ecModel.get('color');

            var color = itemStyleModel.get('color')
                || globalColors[seriesModel.seriesIndex % globalColors.length];
            var inactiveOpacity = seriesModel.get('inactiveOpacity');
            var activeOpacity = seriesModel.get('activeOpacity');

            var coordSys = seriesModel.coordinateSystem;
            var dimensions = coordSys.dimensions;
            var dimensionNames = coordSys.getDimensionNames();
            var data = seriesModel.getData();

            var opacityMap = {
                all: null,
                active: activeOpacity,
                inactive: inactiveOpacity
            };

            var hasActiveSet = false;
            for (var j = 0, lenj = dimensions.length; j < lenj; j++) {
                if (coordSys.getAxis(dimensions[j].name).isActive() !== null) {
                    hasActiveSet = true;
                }
            }

            for (var i = 0, len = data.count(); i < len; i++) {
                var values = data.getValues(dimensionNames, i);
                var activeState;

                if (!hasActiveSet) {
                    activeState = 'all';
                }
                else {
                    activeState = 'inactive';
                    for (var j = 0, lenj = dimensions.length; j < lenj; j++) {
                        var dimName = dimensions[j].name;

                        if (coordSys.getAxis(dimName).isActive(values[j], j)) {
                            activeState = 'active';
                            break;
                        }
                    }
                }

                data.setItemVisual(i, 'opacity', opacityMap[activeState]);
            }

            data.setVisual('color', color);
        });
    };
});
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
            var lineStyle = seriesModel.getModel('lineStyle.normal').getLineStyle();

            var coordSys = seriesModel.coordinateSystem;
            var data = seriesModel.getData();

            var opacityMap = {
                normal: lineStyle.opacity,
                active: activeOpacity,
                inactive: inactiveOpacity
            };

            coordSys.eachActiveState(data, function (activeState, dataIndex) {
                data.setItemVisual(dataIndex, 'opacity', opacityMap[activeState]);
            });

            data.setVisual('color', color);
        });
    };
});
define(function (require) {

    return function (ecModel) {

        ecModel.eachSeriesByType('parallel', function (seriesModel) {

            var itemStyleModel = seriesModel.getModel('itemStyle.normal');
            var lineStyleModel = seriesModel.getModel('lineStyle.normal');
            var globalColors = ecModel.get('color');

            var color = lineStyleModel.get('color')
                || itemStyleModel.get('color')
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
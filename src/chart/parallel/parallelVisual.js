define(function (require) {

    var opacityAccessPath = ['lineStyle', 'normal', 'opacity'];

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
                var itemModel = data.getItemModel(dataIndex);
                var opacity = opacityMap[activeState];
                if (activeState === 'normal') {
                    var itemOpacity = itemModel.get(opacityAccessPath, true);
                    itemOpacity != null && (opacity = itemOpacity);
                }
                data.setItemVisual(dataIndex, 'opacity', opacity);
            });

            data.setVisual('color', color);
        });
    };
});
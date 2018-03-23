
var opacityAccessPath = ['lineStyle', 'normal', 'opacity'];

export default {

    seriesType: 'parallel',

    reset: function (seriesModel, ecModel, api) {

        var itemStyleModel = seriesModel.getModel('itemStyle');
        var lineStyleModel = seriesModel.getModel('lineStyle');
        var globalColors = ecModel.get('color');

        var color = lineStyleModel.get('color')
            || itemStyleModel.get('color')
            || globalColors[seriesModel.seriesIndex % globalColors.length];
        var inactiveOpacity = seriesModel.get('inactiveOpacity');
        var activeOpacity = seriesModel.get('activeOpacity');
        var lineStyle = seriesModel.getModel('lineStyle').getLineStyle();

        var coordSys = seriesModel.coordinateSystem;
        var data = seriesModel.getData();

        var opacityMap = {
            normal: lineStyle.opacity,
            active: activeOpacity,
            inactive: inactiveOpacity
        };

        data.setVisual('color', color);

        function progress(params, data) {
            coordSys.eachActiveState(data, function (activeState, dataIndex) {
                var opacity = opacityMap[activeState];
                if (activeState === 'normal' && data.hasItemOption) {
                    var itemOpacity = data.getItemModel(dataIndex).get(opacityAccessPath, true);
                    itemOpacity != null && (opacity = itemOpacity);
                }
                data.setItemVisual(dataIndex, 'opacity', opacity);
            }, params.start, params.end);
        }

        return {progress: progress};
    }
};


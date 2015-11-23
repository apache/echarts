define(function (require) {
    return function (ecModel) {
        ecModel.eachSeriesByType('parallel', function (seriesModel) {

            var itemStyleModel = seriesModel.getModel('itemStyle.normal');
            var globalColors = ecModel.get('color');

            var color = itemStyleModel.get('color')
                || globalColors[seriesModel.seriesIndex % globalColors.length];

            seriesModel.getData().setVisual({
                'color': color
            });

        });
    }
});
/**
 * @file Visual encoding for themeRiver view
 * @author  Deqing Li(annong035@gmail.com)
 */
define(function (require) {

    return function (ecModel) {
        ecModel.eachSeriesByType('themeRiver', function (seriesModel) {
            var data = seriesModel.getData();
            var rawData = seriesModel.getRawData();
            var colorList = seriesModel.get('color');

            data.each(function (index) {
                var name = data.getName(index);
                var color = colorList[(seriesModel.nameMap.get(name) - 1) % colorList.length];
                rawData.setItemVisual(index, 'color', color);
            });
        });
    };
});

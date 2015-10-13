define(function (require) {

    var zrUtil = require('zrender/core/util');

    // FIXME 公用？
    /**
     * @param {Array.<module:echarts/data/List>} datas
     * @param {string} statisticsType 'average' 'sum'
     * @inner
     */
    function dataStatistics(datas, statisticsType) {
        var len = datas.length;
        return datas[0].map(['value'], function (value, idx) {
            for (var i = 1; i < len; i++) {
                value += datas[i].get('value', idx);
            }
            if (statisticsType === 'average') {
                value /= len;
            }
            return value;
        });
    }

    return function (ecModel) {
        var seriesGroupByMapType = {};
        ecModel.eachSeriesByType('map', function (seriesModel) {
            var mapType = seriesModel.get('mapType');
            seriesGroupByMapType[mapType] = seriesGroupByMapType[mapType] || [];
            seriesGroupByMapType[mapType].push(seriesModel);
        });

        zrUtil.each(seriesGroupByMapType, function (seriesList, mapType) {
            var data = dataStatistics(
                zrUtil.map(seriesList, function (seriesModel) {
                    return seriesModel.getData();
                }),
                seriesList[0].get('mapValueCalculation')
            );

            zrUtil.each(seriesList, function (seriesModel) {
                seriesModel.setData(data);
            });
        });

        ecModel.filterSeries(function (seriesModel, idx) {
            var mapType = seriesModel.get('mapType');

            return zrUtil.indexOf(
                seriesGroupByMapType[mapType], seriesModel
            ) === 0;
        });
    };
});
define(function (require) {

    var zrUtil = require('zrender/core/util');

    // FIXME 公用？
    /**
     * @param {Array.<module:echarts/data/List>} datas
     * @param {string} statisticType 'average' 'sum'
     * @inner
     */
    function dataStatistics(datas, statisticType) {
        var dataNameMap = {};
        var dims = ['value'];

        zrUtil.each(datas, function (data) {
            data.each(dims, function (value, idx) {
                var name = data.getName(idx);
                dataNameMap[name] = dataNameMap[name] || [];
                if (!isNaN(value)) {
                    dataNameMap[name].push(value);
                }
            });
        });

        return datas[0].map(dims, function (value, idx) {
            var name = datas[0].getName(idx);
            var sum = 0;
            var min = Infinity;
            var max = -Infinity;
            var len = dataNameMap[name].length;
            for (var i = 0; i < len; i++) {
                min = Math.min(min, dataNameMap[name][i]);
                max = Math.max(max, dataNameMap[name][i]);
                sum += dataNameMap[name][i];
            }
            var result;
            if (statisticType === 'min') {
                result = min;
            }
            else if (statisticType === 'max') {
                result = max;
            }
            else if (statisticType === 'average') {
                result = sum / len;
            }
            else {
                result = sum;
            }
            return len === 0 ? NaN : result;
        });
    }

    return function (ecModel) {
        var seriesGroups = {};
        ecModel.eachSeriesByType('map', function (seriesModel) {
            var hostGeoModel = seriesModel.getHostGeoModel();
            var key = hostGeoModel ? 'o' + hostGeoModel.id : 'i' + seriesModel.getMapType();
            (seriesGroups[key] = seriesGroups[key] || []).push(seriesModel);
        });

        zrUtil.each(seriesGroups, function (seriesList, key) {
            var data = dataStatistics(
                zrUtil.map(seriesList, function (seriesModel) {
                    return seriesModel.getData();
                }),
                seriesList[0].get('mapValueCalculation')
            );

            for (var i = 0; i < seriesList.length; i++) {
                seriesList[i].originalData = seriesList[i].getData();
            }

            // FIXME Put where?
            for (var i = 0; i < seriesList.length; i++) {
                seriesList[i].seriesGroup = seriesList;
                seriesList[i].needsDrawMap = i === 0 && !seriesList[i].getHostGeoModel();

                seriesList[i].setData(data.cloneShallow());
                seriesList[i].mainSeries = seriesList[0];
            }
        });
    };
});
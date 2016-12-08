/**
 * Single coordinate system creator.
 */
define(function (require) {

    var Single = require('./Single');

    /**
     * Create single coordinate system and inject it into seriesModel.
     *
     * @param {module:echarts/model/Global} ecModel
     * @param {module:echarts/ExtensionAPI} api
     * @return {Array.<module:echarts/coord/single/Single>}
     */
    function create(ecModel, api) {
        var singles = [];

        ecModel.eachComponent('singleAxis', function(axisModel, idx) {

            var single = new Single(axisModel, ecModel, api);
            single.name = 'single_' + idx;
            single.resize(axisModel, api);
            axisModel.coordinateSystem = single;
            singles.push(single);

        });

        ecModel.eachSeries(function (seriesModel) {
            if (seriesModel.get('coordinateSystem') === 'singleAxis') {
                seriesModel.coordinateSystem = findSingleAxis(seriesModel, ecModel);
            }
        });

        return singles;
    }

    function findSingleAxis(seriesModel, ecModel) {
        var query = {
            mainType: 'singleAxis',
            index: seriesModel.get('singleAxisIndex'),
            id: seriesModel.get('singleAxisId')
        };
        if (query.id == null && query.index == null) {
            query.index = 0;
        }
        var singleAxisModel = ecModel.queryComponents(query)[0];
        return singleAxisModel && singleAxisModel.coordinateSystem;
    }

    require('../../CoordinateSystem').register('single', {
        create: create,
        dimensions: Single.prototype.dimensions
    });
});
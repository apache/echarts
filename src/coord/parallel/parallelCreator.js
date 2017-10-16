/**
 * Parallel coordinate system creater.
 */

import Parallel from './Parallel';
import CoordinateSystem from '../../CoordinateSystem';

function create(ecModel, api) {
    var coordSysList = [];

    ecModel.eachComponent('parallel', function (parallelModel, idx) {
        var coordSys = new Parallel(parallelModel, ecModel, api);

        coordSys.name = 'parallel_' + idx;
        coordSys.resize(parallelModel, api);

        parallelModel.coordinateSystem = coordSys;
        coordSys.model = parallelModel;

        coordSysList.push(coordSys);
    });

    // Inject the coordinateSystems into seriesModel
    ecModel.eachSeries(function (seriesModel) {
        if (seriesModel.get('coordinateSystem') === 'parallel') {
            var parallelModel = ecModel.queryComponents({
                mainType: 'parallel',
                index: seriesModel.get('parallelIndex'),
                id: seriesModel.get('parallelId')
            })[0];
            seriesModel.coordinateSystem = parallelModel.coordinateSystem;
        }
    });

    return coordSysList;
}

CoordinateSystem.register('parallel', {create: create});

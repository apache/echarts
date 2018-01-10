import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import '../coord/geo/GeoModel';
import '../coord/geo/geoCreator';
import './geo/GeoView';
import '../action/geoRoam';

function makeAction(method, actionInfo) {
    actionInfo.update = 'updateView';
    echarts.registerAction(actionInfo, function (payload, ecModel) {
        var selected = {};

        ecModel.eachComponent(
            { mainType: 'geo', query: payload},
            function (geoModel) {
                geoModel[method](payload.name);
                var geo = geoModel.coordinateSystem;
                zrUtil.each(geo.regions, function (region) {
                    selected[region.name] = geoModel.isSelected(region.name) || false;
                });
            }
        );

        return {
            selected: selected,
            name: payload.name
        };
    });
}

makeAction('toggleSelected', {
    type: 'geoToggleSelect',
    event: 'geoselectchanged'
});
makeAction('select', {
    type: 'geoSelect',
    event: 'geoselected'
});
makeAction('unSelect', {
    type: 'geoUnSelect',
    event: 'geounselected'
});
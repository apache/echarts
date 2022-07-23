/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import { EChartsExtensionInstallRegisters } from '../../extension';
import GeoModel from '../../coord/geo/GeoModel';
import geoCreator from '../../coord/geo/geoCreator';
import { ActionInfo } from '../../util/types';
import { each } from 'zrender/src/core/util';
import GlobalModel from '../../model/Global';
import { updateCenterAndZoom, RoamPayload } from '../../action/roamHelper';
import MapSeries from '../../chart/map/MapSeries';
import GeoView from './GeoView';
import geoSourceManager from '../../coord/geo/geoSourceManager';
import type ExtensionAPI from '../../core/ExtensionAPI';

type RegisterMapParams = Parameters<typeof geoSourceManager.registerMap>;
function registerMap(
    mapName: RegisterMapParams[0],
    geoJson: RegisterMapParams[1],
    specialAreas?: RegisterMapParams[2]
) {
    geoSourceManager.registerMap(mapName, geoJson, specialAreas);
}

export function install(registers: EChartsExtensionInstallRegisters) {

    registers.registerCoordinateSystem('geo', geoCreator);

    registers.registerComponentModel(GeoModel);
    registers.registerComponentView(GeoView);

    registers.registerImpl('registerMap', registerMap);
    registers.registerImpl('getMap', (mapName: string) => geoSourceManager.getMapForUser(mapName));


    function makeAction(
        method: 'toggleSelected' | 'select' | 'unSelect',
        actionInfo: ActionInfo
    ): void {
        actionInfo.update = 'geo:updateSelectStatus';
        registers.registerAction(actionInfo, function (payload, ecModel) {
            const selected = {} as {[regionName: string]: boolean};
            const allSelected = [] as ({ name: string[], geoIndex: number })[];

            ecModel.eachComponent(
                { mainType: 'geo', query: payload},
                function (geoModel: GeoModel) {
                    geoModel[method](payload.name);
                    const geo = geoModel.coordinateSystem;

                    each(geo.regions, function (region) {
                        selected[region.name] = geoModel.isSelected(region.name) || false;
                    });

                    // Notice: there might be duplicated name in different regions.
                    const names = [] as string[];
                    each(selected, function (v, name) {
                        selected[name] && names.push(name);
                    });
                    allSelected.push({
                        geoIndex: geoModel.componentIndex,
                        // Use singular, the same naming convention as the event `selectchanged`.
                        name: names
                    });
                }
            );

            return {
                selected: selected,
                allSelected: allSelected,
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

    /**
     * @payload
     * @property {string} [componentType=series]
     * @property {number} [dx]
     * @property {number} [dy]
     * @property {number} [zoom]
     * @property {number} [originX]
     * @property {number} [originY]
     */
    registers.registerAction({
        type: 'geoRoam',
        event: 'geoRoam',
        update: 'updateTransform'
    }, function (payload: RoamPayload, ecModel: GlobalModel, api: ExtensionAPI) {
        const componentType = payload.componentType || 'series';

        ecModel.eachComponent(
            { mainType: componentType, query: payload },
            function (componentModel: GeoModel | MapSeries) {
                const geo = componentModel.coordinateSystem;
                if (geo.type !== 'geo') {
                    return;
                }

                const res = updateCenterAndZoom(
                    geo, payload, (componentModel as GeoModel).get('scaleLimit'), api
                );

                componentModel.setCenter
                    && componentModel.setCenter(res.center);

                componentModel.setZoom
                    && componentModel.setZoom(res.zoom);

                // All map series with same `map` use the same geo coordinate system
                // So the center and zoom must be in sync. Include the series not selected by legend
                if (componentType === 'series') {
                    each((componentModel as MapSeries).seriesGroup, function (seriesModel) {
                        seriesModel.setCenter(res.center);
                        seriesModel.setZoom(res.zoom);
                    });
                }
            }
        );
    });
}

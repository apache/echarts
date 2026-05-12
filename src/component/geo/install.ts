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
import { ActionInfo, COMPONENT_MAIN_TYPE_SERIES, RoamHostModel, RoamPayload } from '../../util/types';
import { each } from 'zrender/src/core/util';
import GlobalModel from '../../model/Global';
import MapSeries, { mapSeriesNeedsDrawMap } from '../../chart/map/MapSeries';
import GeoView from './GeoView';
import geoSourceManager from '../../coord/geo/geoSourceManager';
import type ExtensionAPI from '../../core/ExtensionAPI';
import { makeQueryConditionKindA } from '../../util/model';
import { ownRoamModelCoordSysUpdateInAction, ownRoamViewUpdateDirectlyInAction } from '../../coord/View';

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
        update: 'updateTransform',
    }, function (payload: RoamPayload, ecModel: GlobalModel, api: ExtensionAPI) {
        // `payload.componentType` is supported only for backward compatibility.
        const mainType = payload.componentType
            || (
                (payload.geoId != null || payload.geoName != null || payload.geoIndex != null)
                ? 'geo' : COMPONENT_MAIN_TYPE_SERIES
            );
        const isSeries = mainType === COMPONENT_MAIN_TYPE_SERIES;
        if (mainType !== 'geo' && !isSeries) {
            return;
        }
        const subType = isSeries ? 'map' : null;

        ecModel.eachComponent(
            makeQueryConditionKindA(payload, mainType, subType),
            function (componentOrSeries: (GeoModel | MapSeries) & RoamHostModel) {
                if (isSeries
                    // Only when `needsDrawMap: true`, the `MapSeries` host geo coord sys and call `MapDraw`.
                    && !mapSeriesNeedsDrawMap(componentOrSeries as MapSeries)
                ) {
                    return;
                }
                // Since 'updateTransform' is used, geo model and view update firstly here, and then series
                // and components laid out on this VIEW_COORD_SYS update in `View['updateTransform']`.
                ownRoamModelCoordSysUpdateInAction(
                    payload, componentOrSeries, isSeries ? (componentOrSeries as MapSeries).seriesGroup.r : null
                );
                ownRoamViewUpdateDirectlyInAction(payload, componentOrSeries, ecModel, api);
            }
        );
    });
}

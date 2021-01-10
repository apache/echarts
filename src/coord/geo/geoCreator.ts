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

import * as zrUtil from 'zrender/src/core/util';
import Geo from './Geo';
import * as layout from '../../util/layout';
import * as numberUtil from '../../util/number';
import geoSourceManager from './geoSourceManager';
import mapDataStorage from './mapDataStorage';
import GeoModel, { GeoOption, RegoinOption } from './GeoModel';
import MapSeries, { MapSeriesOption } from '../../chart/map/MapSeries';
import ExtensionAPI from '../../core/ExtensionAPI';
import { CoordinateSystemCreator } from '../CoordinateSystem';
import { NameMap } from './geoTypes';
import SeriesModel from '../../model/Series';
import { SeriesOption, SeriesOnGeoOptionMixin } from '../../util/types';
import { Dictionary } from 'zrender/src/core/types';
import GlobalModel from '../../model/Global';
import ComponentModel from '../../model/Component';


export type resizeGeoType = typeof resizeGeo;
/**
 * Resize method bound to the geo
 */
function resizeGeo(this: Geo, geoModel: ComponentModel<GeoOption | MapSeriesOption>, api: ExtensionAPI): void {

    const boundingCoords = geoModel.get('boundingCoords');
    if (boundingCoords != null) {
        const leftTop = boundingCoords[0];
        const rightBottom = boundingCoords[1];
        if (isNaN(leftTop[0]) || isNaN(leftTop[1]) || isNaN(rightBottom[0]) || isNaN(rightBottom[1])) {
            if (__DEV__) {
                console.error('Invalid boundingCoords');
            }
        }
        else {
            this.setBoundingRect(leftTop[0], leftTop[1], rightBottom[0] - leftTop[0], rightBottom[1] - leftTop[1]);
        }
    }

    const rect = this.getBoundingRect();

    const centerOption = geoModel.get('layoutCenter');
    const sizeOption = geoModel.get('layoutSize');

    const viewWidth = api.getWidth();
    const viewHeight = api.getHeight();

    const aspect = rect.width / rect.height * this.aspectScale;

    let useCenterAndSize = false;
    let center: number[];
    let size: number;

    if (centerOption && sizeOption) {
        center = [
            numberUtil.parsePercent(centerOption[0], viewWidth),
            numberUtil.parsePercent(centerOption[1], viewHeight)
        ];
        size = numberUtil.parsePercent(sizeOption, Math.min(viewWidth, viewHeight));

        if (!isNaN(center[0]) && !isNaN(center[1]) && !isNaN(size)) {
            useCenterAndSize = true;
        }
        else {
            if (__DEV__) {
                console.warn('Given layoutCenter or layoutSize data are invalid. Use left/top/width/height instead.');
            }
        }
    }

    let viewRect: layout.LayoutRect;
    if (useCenterAndSize) {
        viewRect = {} as layout.LayoutRect;
        if (aspect > 1) {
            // Width is same with size
            viewRect.width = size;
            viewRect.height = size / aspect;
        }
        else {
            viewRect.height = size;
            viewRect.width = size * aspect;
        }
        viewRect.y = center[1] - viewRect.height / 2;
        viewRect.x = center[0] - viewRect.width / 2;
    }
    else {
        // Use left/top/width/height
        const boxLayoutOption = geoModel.getBoxLayoutParams() as Parameters<typeof layout.getLayoutRect>[0];

        // 0.75 rate
        boxLayoutOption.aspect = aspect;

        viewRect = layout.getLayoutRect(boxLayoutOption, {
            width: viewWidth,
            height: viewHeight
        });
    }

    this.setViewRect(viewRect.x, viewRect.y, viewRect.width, viewRect.height);

    this.setCenter(geoModel.get('center'));
    this.setZoom(geoModel.get('zoom'));
}

// Back compat for ECharts2, where the coord map is set on map series:
// {type: 'map', geoCoord: {'cityA': [116.46,39.92], 'cityA': [119.12,24.61]}},
function setGeoCoords(geo: Geo, model: MapSeries) {
    zrUtil.each(model.get('geoCoord'), function (geoCoord, name) {
        geo.addGeoCoord(name, geoCoord);
    });
}

class GeoCreator implements CoordinateSystemCreator {

    // For deciding which dimensions to use when creating list data
    dimensions = Geo.prototype.dimensions;

    create(ecModel: GlobalModel, api: ExtensionAPI): Geo[] {
        const geoList = [] as Geo[];

        // FIXME Create each time may be slow
        ecModel.eachComponent('geo', function (geoModel: GeoModel, idx) {
            const name = geoModel.get('map');

            let aspectScale = geoModel.get('aspectScale');
            let invertLongitute = true;
            const mapRecords = mapDataStorage.retrieveMap(name);
            if (mapRecords && mapRecords[0] && mapRecords[0].type === 'svg') {
                aspectScale == null && (aspectScale = 1);
                invertLongitute = false;
            }
            else {
                aspectScale == null && (aspectScale = 0.75);
            }

            const geo = new Geo(name + idx, name, geoModel.get('nameMap'), invertLongitute);

            geo.aspectScale = aspectScale;
            geo.zoomLimit = geoModel.get('scaleLimit');
            geoList.push(geo);

            // setGeoCoords(geo, geoModel);

            geoModel.coordinateSystem = geo;
            geo.model = geoModel;

            // Inject resize method
            geo.resize = resizeGeo;

            geo.resize(geoModel, api);
        });

        ecModel.eachSeries(function (seriesModel) {
            const coordSys = seriesModel.get('coordinateSystem');
            if (coordSys === 'geo') {
                const geoIndex = (
                    seriesModel as SeriesModel<SeriesOption & SeriesOnGeoOptionMixin>
                ).get('geoIndex') || 0;
                seriesModel.coordinateSystem = geoList[geoIndex];
            }
        });

        // If has map series
        const mapModelGroupBySeries = {} as Dictionary<MapSeries[]>;

        ecModel.eachSeriesByType('map', function (seriesModel: MapSeries) {
            if (!seriesModel.getHostGeoModel()) {
                const mapType = seriesModel.getMapType();
                mapModelGroupBySeries[mapType] = mapModelGroupBySeries[mapType] || [];
                mapModelGroupBySeries[mapType].push(seriesModel);
            }
        });

        zrUtil.each(mapModelGroupBySeries, function (mapSeries, mapType) {
            const nameMapList = zrUtil.map(mapSeries, function (singleMapSeries) {
                return singleMapSeries.get('nameMap');
            });
            const geo = new Geo(mapType, mapType, zrUtil.mergeAll(nameMapList));

            geo.zoomLimit = zrUtil.retrieve.apply(null, zrUtil.map(mapSeries, function (singleMapSeries) {
                return singleMapSeries.get('scaleLimit');
            }));
            geoList.push(geo);

            // Inject resize method
            geo.resize = resizeGeo;
            geo.aspectScale = mapSeries[0].get('aspectScale');

            geo.resize(mapSeries[0], api);

            zrUtil.each(mapSeries, function (singleMapSeries) {
                singleMapSeries.coordinateSystem = geo;

                setGeoCoords(geo, singleMapSeries);
            });
        });

        return geoList;
    }

    /**
     * Fill given regions array
     */
    getFilledRegions(
        originRegionArr: RegoinOption[], mapName: string, nameMap?: NameMap
    ): RegoinOption[] {
        // Not use the original
        const regionsArr = (originRegionArr || []).slice();

        const dataNameMap = zrUtil.createHashMap();
        for (let i = 0; i < regionsArr.length; i++) {
            dataNameMap.set(regionsArr[i].name, regionsArr[i]);
        }

        const source = geoSourceManager.load(mapName, nameMap);
        zrUtil.each(source.regions, function (region) {
            const name = region.name;
            !dataNameMap.get(name) && regionsArr.push({name: name});
        });

        return regionsArr;
    }
}

const geoCreator = new GeoCreator();

export default geoCreator;

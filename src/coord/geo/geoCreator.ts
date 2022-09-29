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
import Geo, { geo2DDimensions } from './Geo';
import * as layout from '../../util/layout';
import * as numberUtil from '../../util/number';
import geoSourceManager from './geoSourceManager';
import GeoModel, { GeoCommonOptionMixin, GeoOption, RegoinOption } from './GeoModel';
import MapSeries, { MapSeriesOption } from '../../chart/map/MapSeries';
import ExtensionAPI from '../../core/ExtensionAPI';
import { CoordinateSystemCreator } from '../CoordinateSystem';
import { NameMap } from './geoTypes';
import { SeriesOption, SeriesOnGeoOptionMixin } from '../../util/types';
import { Dictionary } from 'zrender/src/core/types';
import type Model from '../../model/Model';
import type GlobalModel from '../../model/Global';
import type SeriesModel from '../../model/Series';
import type ComponentModel from '../../model/Component';
import * as vector from 'zrender/src/core/vector';

export type resizeGeoType = typeof resizeGeo;

/**
 * Resize method bound to the geo
 */
function resizeGeo(this: Geo, geoModel: ComponentModel<GeoOption | MapSeriesOption>, api: ExtensionAPI): void {

    const boundingCoords = geoModel.get('boundingCoords');
    if (boundingCoords != null) {
        let leftTop = boundingCoords[0];
        let rightBottom = boundingCoords[1];
        if (!(
            isFinite(leftTop[0]) && isFinite(leftTop[1])
            && isFinite(rightBottom[0]) && isFinite(rightBottom[1])
        )) {
            if (__DEV__) {
                console.error('Invalid boundingCoords');
            }
        }
        else {
            // Sample around the lng/lat rect and use projection to calculate actual bounding rect.
            const projection = this.projection;
            if (projection) {
                const xMin = leftTop[0];
                const yMin = leftTop[1];
                const xMax = rightBottom[0];
                const yMax = rightBottom[1];
                leftTop = [Infinity, Infinity];
                rightBottom = [-Infinity, -Infinity];

                // TODO better way?
                const sampleLine = (x0: number, y0: number, x1: number, y1: number) => {
                    const dx = x1 - x0;
                    const dy = y1 - y0;
                    for (let i = 0; i <= 100; i++) {
                        const p = i / 100;
                        const pt = projection.project([x0 + dx * p, y0 + dy * p]);
                        vector.min(leftTop, leftTop, pt);
                        vector.max(rightBottom, rightBottom, pt);
                    }
                };
                // Top
                sampleLine(xMin, yMin, xMax, yMin);
                // Right
                sampleLine(xMax, yMin, xMax, yMax);
                // Bottom
                sampleLine(xMax, yMax, xMin, yMax);
                // Left
                sampleLine(xMin, yMax, xMax, yMin);
            }

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

        boxLayoutOption.aspect = aspect;

        viewRect = layout.getLayoutRect(boxLayoutOption, {
            width: viewWidth,
            height: viewHeight
        });
    }

    this.setViewRect(viewRect.x, viewRect.y, viewRect.width, viewRect.height);

    this.setCenter(geoModel.get('center'), api);
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
    dimensions = geo2DDimensions;

    create(ecModel: GlobalModel, api: ExtensionAPI): Geo[] {
        const geoList = [] as Geo[];

        function getCommonGeoProperties(model: Model<GeoCommonOptionMixin>) {
            return {
                nameProperty: model.get('nameProperty'),
                aspectScale: model.get('aspectScale'),
                projection: model.get('projection')
            };
        }

        // FIXME Create each time may be slow
        ecModel.eachComponent('geo', function (geoModel: GeoModel, idx) {
            const mapName = geoModel.get('map');

            const geo = new Geo(mapName + idx, mapName, zrUtil.extend({
                nameMap: geoModel.get('nameMap')
            }, getCommonGeoProperties(geoModel)));

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

            const geo = new Geo(mapType, mapType, zrUtil.extend({
                nameMap: zrUtil.mergeAll(nameMapList)
            }, getCommonGeoProperties(mapSeries[0])));

            geo.zoomLimit = zrUtil.retrieve.apply(null, zrUtil.map(mapSeries, function (singleMapSeries) {
                return singleMapSeries.get('scaleLimit');
            }));
            geoList.push(geo);

            // Inject resize method
            geo.resize = resizeGeo;

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
        originRegionArr: RegoinOption[],
        mapName: string,
        nameMap: NameMap,
        nameProperty: string
    ): RegoinOption[] {
        // Not use the original
        const regionsArr = (originRegionArr || []).slice();

        const dataNameMap = zrUtil.createHashMap();
        for (let i = 0; i < regionsArr.length; i++) {
            dataNameMap.set(regionsArr[i].name, regionsArr[i]);
        }

        const source = geoSourceManager.load(mapName, nameMap, nameProperty);
        zrUtil.each(source.regions, function (region) {
            const name = region.name;
            !dataNameMap.get(name) && regionsArr.push({name: name});
        });

        return regionsArr;
    }
}


const geoCreator = new GeoCreator();

export default geoCreator;

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
import BoundingRect from 'zrender/src/core/BoundingRect';
import View from '../View';
import geoSourceManager from './geoSourceManager';
import { GeoJSONRegion, Region } from './Region';
import { GeoResource, NameMap } from './geoTypes';
import GlobalModel from '../../model/Global';
import { ParsedModelFinder, ParsedModelFinderKnown, SINGLE_REFERRING } from '../../util/model';
import GeoModel from './GeoModel';
import { resizeGeoType } from './geoCreator';

const GEO_DEFAULT_PARAMS: {
    [type in GeoResource['type']]: {
        aspectScale: number;
        invertLongitute: boolean;
    }
} = {
    'geoJSON': {
        aspectScale: 0.75,
        invertLongitute: true
    },
    'geoSVG': {
        aspectScale: 1,
        invertLongitute: false
    }
} as const;

export const geo2DDimensions = ['lng', 'lat'];


class Geo extends View {

    dimensions = geo2DDimensions;

    type = 'geo';

    // map type
    readonly map: string;
    readonly resourceType: GeoResource['type'];

    // Only store specified name coord via `addGeoCoord`.
    private _nameCoordMap: zrUtil.HashMap<number[]> = zrUtil.createHashMap<number[], string>();
    private _regionsMap: zrUtil.HashMap<Region>;
    private _invertLongitute: boolean;
    readonly regions: Region[];
    readonly aspectScale: number;

    // Injected outside
    model: GeoModel;
    resize: resizeGeoType;

    constructor(
        name: string,
        map: string,
        opt: {
            // Specify name alias
            nameMap?: NameMap;
            nameProperty?: string;
            aspectScale?: number;
        }
    ) {
        super(name);

        this.map = map;

        const source = geoSourceManager.load(map, opt.nameMap, opt.nameProperty);
        const resource = geoSourceManager.getGeoResource(map);
        this.resourceType = resource ? resource.type : null;

        const defaultParmas = GEO_DEFAULT_PARAMS[resource.type];

        this._regionsMap = source.regionsMap;
        this._invertLongitute = defaultParmas.invertLongitute;
        this.regions = source.regions;
        this.aspectScale = zrUtil.retrieve2(opt.aspectScale, defaultParmas.aspectScale);

        const boundingRect = source.boundingRect;
        this.setBoundingRect(boundingRect.x, boundingRect.y, boundingRect.width, boundingRect.height);
    }

    /**
     * Whether contain the given [lng, lat] coord.
     */
    // Never used yet.
    // containCoord(coord: number[]) {
    //     const regions = this.regions;
    //     for (let i = 0; i < regions.length; i++) {
    //         const region = regions[i];
    //         if (region.type === 'geoJSON' && (region as GeoJSONRegion).contain(coord)) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    protected _transformTo(x: number, y: number, width: number, height: number): void {
        let rect = this.getBoundingRect();
        const invertLongitute = this._invertLongitute;

        rect = rect.clone();

        if (invertLongitute) {
            // Longitute is inverted
            rect.y = -rect.y - rect.height;
        }

        const rawTransformable = this._rawTransformable;

        rawTransformable.transform = rect.calculateTransform(
            new BoundingRect(x, y, width, height)
        );

        const rawParent = rawTransformable.parent;
        rawTransformable.parent = null;
        rawTransformable.decomposeTransform();
        rawTransformable.parent = rawParent;

        if (invertLongitute) {
            rawTransformable.scaleY = -rawTransformable.scaleY;
        }

        this._updateTransform();
    }

    getRegion(name: string): Region {
        return this._regionsMap.get(name);
    }

    getRegionByCoord(coord: number[]): Region {
        const regions = this.regions;
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            if (region.type === 'geoJSON' && (region as GeoJSONRegion).contain(coord)) {
                return regions[i];
            }
        }
    }

    /**
     * Add geoCoord for indexing by name
     */
    addGeoCoord(name: string, geoCoord: number[]): void {
        this._nameCoordMap.set(name, geoCoord);
    }

    /**
     * Get geoCoord by name
     */
    getGeoCoord(name: string): number[] {
        const region = this._regionsMap.get(name);
        // calcualte center only on demand.
        return this._nameCoordMap.get(name) || (region && region.getCenter());
    }

    dataToPoint(data: number[] | string, noRoam?: boolean, out?: number[]): number[] {
        if (typeof data === 'string') {
            // Map area name to geoCoord
            data = this.getGeoCoord(data);
        }
        if (data) {
            return View.prototype.dataToPoint.call(this, data, noRoam, out);
        }
    }

    convertToPixel(ecModel: GlobalModel, finder: ParsedModelFinder, value: number[]): number[] {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? coordSys.dataToPoint(value) : null;
    }

    convertFromPixel(ecModel: GlobalModel, finder: ParsedModelFinder, pixel: number[]): number[] {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? coordSys.pointToData(pixel) : null;
    }

};

zrUtil.mixin(Geo, View);

function getCoordSys(finder: ParsedModelFinderKnown): Geo {
    const geoModel = finder.geoModel as GeoModel;
    const seriesModel = finder.seriesModel;
    return geoModel
        ? geoModel.coordinateSystem
        : seriesModel
        ? (
            seriesModel.coordinateSystem as Geo // For map series.
            || (
                (seriesModel.getReferringComponents('geo', SINGLE_REFERRING).models[0] || {}
            ) as GeoModel).coordinateSystem
        )
        : null;
}

export default Geo;

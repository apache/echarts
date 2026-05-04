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
import View, {
    useLegacyViewCoordSysCenterBase, viewCoordSysCopyViewRect, viewCoordSysSetBoundingRect
} from '../View';
import geoSourceManager from './geoSourceManager';
import { GeoJSONRegion, Region } from './Region';
import { GeoProjection, GeoResource, NameMap } from './geoTypes';
import GlobalModel from '../../model/Global';
import { ParsedModelFinder, ParsedModelFinderKnown, SINGLE_REFERRING } from '../../util/model';
import type GeoModel from './GeoModel';
import { resizeGeoType } from './geoCreator';
import { warn } from '../../util/log';
import type ExtensionAPI from '../../core/ExtensionAPI';
import { CoordinateSystemMaster, GeoLikeCoordSys } from '../CoordinateSystem';
import BoundingRect from 'zrender/src/core/BoundingRect';
import Transformable from 'zrender/src/core/Transformable';
import { MatrixArray } from 'zrender/src/core/matrix';
import { NullUndefined } from 'zrender/src/core/types';

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

export const geo2DDimensions: ['lng', 'lat'] = ['lng', 'lat'];


class Geo
    extends Transformable // See VIEW_COORD_SYS_TRANS_OVERALL_BACKWARD_COMPATIBILITY
    implements CoordinateSystemMaster, GeoLikeCoordSys {

    dimensions: ['lng', 'lat'] = geo2DDimensions;

    type = 'geo';

    // map type
    readonly map: string;
    readonly resourceType: GeoResource['type'];

    readonly view: View;
    readonly name: string;

    // Only store specified name coord via `addGeoCoord`.
    private _nameCoordMap: zrUtil.HashMap<number[]> = zrUtil.createHashMap<number[], string>();
    private _regionsMap: zrUtil.HashMap<Region>;
    private _clip: boolean;
    readonly regions: Region[];
    readonly aspectScale: number;


    projection: GeoProjection;
    // Injected outside
    model: GeoModel | NullUndefined;
    resize: resizeGeoType;

    constructor(
        name: string,
        map: string,
        opt: {
            projection?: GeoProjection;
            // Specify name alias
            nameMap?: NameMap;
            nameProperty?: string;
            aspectScale?: number;
            api: ExtensionAPI;
            ecModel: GlobalModel;
            clip?: boolean;
        }
    ) {
        super();

        this.name = name;
        let projection = opt.projection;
        const source = geoSourceManager.load(
            map,
            opt.nameMap,
            opt.nameProperty
        );
        const resource = geoSourceManager.getGeoResource(map);
        const resourceType = this.resourceType = resource ? resource.type : null;
        const regions = this.regions = source.regions;
        const defaultParams = GEO_DEFAULT_PARAMS[resource.type];
        this._clip = opt.clip;

        // Not invert longitude if projection exits.
        const invertLongitute = projection ? false : defaultParams.invertLongitute;

        this.view = new View(
            invertLongitute,
            useLegacyViewCoordSysCenterBase(opt.ecModel, opt.api),
            this
        );

        this.map = map;
        this._regionsMap = source.regionsMap;
        this.regions = source.regions;

        if (__DEV__ && projection) {
            // Do some check
            if (resourceType === 'geoSVG') {
                if (__DEV__) {
                    warn(`Map ${map} with SVG source can't use projection. Only GeoJSON source supports projection.`);
                }
                projection = null;
            }
            if (!(projection.project && projection.unproject)) {
                if (__DEV__) {
                    warn('project and unproject must be both provided in the projeciton.');
                }
                projection = null;
            }
        }
        this.projection = projection;

        let boundingRect;
        if (projection) {
            // Can't reuse the raw bounding rect
            for (let i = 0; i < regions.length; i++) {
                const regionRect = (regions[i] as GeoJSONRegion).getBoundingRect(projection);
                boundingRect = boundingRect || regionRect.clone();
                boundingRect.union(regionRect);
            }
        }
        else {
            boundingRect = source.boundingRect;
        }
        viewCoordSysSetBoundingRect(
            this.view, boundingRect.x, boundingRect.y, boundingRect.width, boundingRect.height
        );

        // aspectScale and invertLongitute actually is the parameters default raw projection.
        // So we ignore them if projection is given.

        // Ignore default aspect scale if projection exits.
        this.aspectScale = projection ? 1 : zrUtil.retrieve2(opt.aspectScale, defaultParams.aspectScale);
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
        // Calculate center only on demand.
        return this._nameCoordMap.get(name) || (region && region.getCenter());
    }

    dataToPoint(data: number[] | string, noRoam?: boolean, out?: number[]): number[] {
        if (zrUtil.isString(data)) {
            // Map area name to geoCoord
            data = this.getGeoCoord(data);
        }
        if (data) {
            const projection = this.projection;
            if (projection) {
                // projection may return null point.
                data = projection.project(data);
            }
            return data && this.view.dataToPoint(data, noRoam, out);
        }
    }

    pointToData(point: number[], reserved?: unknown, out?: number[]) {
        const projection = this.projection;
        if (projection) {
            // projection may return null point.
            point = projection.unproject(point);
        }
        // FIXME: if no `point`, should return [NaN, NaN], rather than undefined.
        //  null/undefined has special meaning in `convertFromPixel`.
        return point && this.view.pointToData(point, out);
    }

    convertToPixel(
        ecModel: GlobalModel, finder: ParsedModelFinder, value: number[]
    ): number[] {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? coordSys.dataToPoint(value) : null;
    }

    convertFromPixel(
        ecModel: GlobalModel, finder: ParsedModelFinder, pixel: number[]
    ): number[] {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? coordSys.pointToData(pixel) : null;
    }

    containPoint(point: number[]): boolean {
        return this.view.containPoint(point);
    }

    getArea(tolerance?: number): BoundingRect {
        tolerance = tolerance || 0;
        const rect = viewCoordSysCopyViewRect(null, this.view);
        rect.x -= tolerance;
        rect.y -= tolerance;
        rect.width += 2 * tolerance;
        rect.height += 2 * tolerance;
        return rect;
    }

    shouldClip(): boolean {
        return this._clip;
    }

    /**
     * @implements CoordinateSystem['getBoundingRect']
     */
    getBoundingRect(): BoundingRect {
        return this.view.getBoundingRect();
    }

    /**
     * @implements CoordinateSystem['getViewRect']
     */
    getViewRect(): BoundingRect {
        return this.view.getViewRect();
    }

    /**
     * @implements CoordinateSystem['getRoamTransform']
     */
    getRoamTransform(): MatrixArray {
        return this.view.getRoamTransform();
    }

};

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

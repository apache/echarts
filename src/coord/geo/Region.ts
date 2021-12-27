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


import BoundingRect from 'zrender/src/core/BoundingRect';
import * as bbox from 'zrender/src/core/bbox';
import * as vec2 from 'zrender/src/core/vector';
import * as polygonContain from 'zrender/src/contain/polygon';
import { GeoJSON, GeoSVGGraphicRoot } from './geoTypes';
import * as matrix from 'zrender/src/core/matrix';
import Element from 'zrender/src/Element';

const TMP_TRANSFORM = [] as number[];

export class Region {

    readonly name: string;
    readonly type: 'geoJSON' | 'geoSVG';

    constructor(
        name: string
    ) {
        this.name = name;
    }

    /**
     * Get center point in data unit. That is,
     * for GeoJSONRegion, the unit is lat/lng,
     * for GeoSVGRegion, the unit is SVG local coord.
     */
    getCenter(): number[] {
        return;
    }

}


export class GeoJSONRegion extends Region {

    readonly type = 'geoJSON';

    readonly geometries: {
        type: 'polygon'; // FIXME:TS Is there other types?
        exterior: number[][];
        interiors?: number[][][];
    }[];

    private _center: number[];

    // Injected outside.
    properties: GeoJSON['features'][0]['properties'];

    private _rect: BoundingRect;


    constructor(
        name: string,
        geometries: GeoJSONRegion['geometries'],
        cp: GeoJSON['features'][0]['properties']['cp']
    ) {
        super(name);

        this.geometries = geometries;

        if (!cp) {
            const rect = this.getBoundingRect();
            cp = [
                rect.x + rect.width / 2,
                rect.y + rect.height / 2
            ];
        }
        else {
            cp = [cp[0], cp[1]];
        }
        this._center = cp;
    }

    getBoundingRect(): BoundingRect {
        const rect = this._rect;
        if (rect) {
            return rect;
        }

        const MAX_NUMBER = Number.MAX_VALUE;
        const min = [MAX_NUMBER, MAX_NUMBER];
        const max = [-MAX_NUMBER, -MAX_NUMBER];
        const min2 = [] as number[];
        const max2 = [] as number[];
        const geometries = this.geometries;
        let i = 0;
        for (; i < geometries.length; i++) {
            // Only support polygon
            if (geometries[i].type !== 'polygon') {
                continue;
            }
            // Doesn't consider hole
            const exterior = geometries[i].exterior;
            bbox.fromPoints(exterior, min2, max2);
            vec2.min(min, min, min2);
            vec2.max(max, max, max2);
        }
        // No data
        if (i === 0) {
            min[0] = min[1] = max[0] = max[1] = 0;
        }

        return (this._rect = new BoundingRect(
            min[0], min[1], max[0] - min[0], max[1] - min[1]
        ));
    }

    contain(coord: number[]): boolean {
        const rect = this.getBoundingRect();
        const geometries = this.geometries;
        if (!rect.contain(coord[0], coord[1])) {
            return false;
        }
        loopGeo: for (let i = 0, len = geometries.length; i < len; i++) {
            // Only support polygon.
            if (geometries[i].type !== 'polygon') {
                continue;
            }
            const exterior = geometries[i].exterior;
            const interiors = geometries[i].interiors;
            if (polygonContain.contain(exterior, coord[0], coord[1])) {
                // Not in the region if point is in the hole.
                for (let k = 0; k < (interiors ? interiors.length : 0); k++) {
                    if (polygonContain.contain(interiors[k], coord[0], coord[1])) {
                        continue loopGeo;
                    }
                }
                return true;
            }
        }
        return false;
    }

    transformTo(x: number, y: number, width: number, height: number): void {
        let rect = this.getBoundingRect();
        const aspect = rect.width / rect.height;
        if (!width) {
            width = aspect * height;
        }
        else if (!height) {
            height = width / aspect;
        }
        const target = new BoundingRect(x, y, width, height);
        const transform = rect.calculateTransform(target);
        const geometries = this.geometries;
        for (let i = 0; i < geometries.length; i++) {
            // Only support polygon.
            if (geometries[i].type !== 'polygon') {
                continue;
            }
            const exterior = geometries[i].exterior;
            const interiors = geometries[i].interiors;
            for (let p = 0; p < exterior.length; p++) {
                vec2.applyTransform(exterior[p], exterior[p], transform);
            }
            for (let h = 0; h < (interiors ? interiors.length : 0); h++) {
                for (let p = 0; p < interiors[h].length; p++) {
                    vec2.applyTransform(interiors[h][p], interiors[h][p], transform);
                }
            }
        }
        rect = this._rect;
        rect.copy(target);
        // Update center
        this._center = [
            rect.x + rect.width / 2,
            rect.y + rect.height / 2
        ];
    }

    cloneShallow(name: string): GeoJSONRegion {
        name == null && (name = this.name);
        const newRegion = new GeoJSONRegion(name, this.geometries, this._center);
        newRegion._rect = this._rect;
        newRegion.transformTo = null; // Simply avoid to be called.
        return newRegion;
    }

    getCenter() {
        return this._center;
    }

    setCenter(center: number[]) {
        this._center = center;
    }

}

export class GeoSVGRegion extends Region {

    readonly type = 'geoSVG';

    private _center: number[];

    // Can only be used to calculate, but not be modified.
    // Becuase this el may not belongs to this view,
    // but been displaying on some other view.
    private _elOnlyForCalculate: Element;

    constructor(
        name: string,
        elOnlyForCalculate: Element
    ) {
        super(name);
        this._elOnlyForCalculate = elOnlyForCalculate;
    }

    getCenter() {
        let center = this._center;
        if (!center) {
            // In most cases there are no need to calculate this center.
            // So calculate only when called.
            center = this._center = this._calculateCenter();
        }
        return center;
    }

    private _calculateCenter(): number[] {
        const el = this._elOnlyForCalculate;
        const rect = el.getBoundingRect();
        const center = [
            rect.x + rect.width / 2,
            rect.y + rect.height / 2
        ];

        const mat = matrix.identity(TMP_TRANSFORM);

        let target = el;
        while (target && !(target as GeoSVGGraphicRoot).isGeoSVGGraphicRoot) {
            matrix.mul(mat, target.getLocalTransform(), mat);
            target = target.parent;
        }

        matrix.invert(mat, mat);

        vec2.applyTransform(center, center, mat);

        return center;
    }

}


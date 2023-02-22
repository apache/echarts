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
import * as vec2 from 'zrender/src/core/vector';
import * as polygonContain from 'zrender/src/contain/polygon';
import { GeoJSON, GeoProjection, GeoSVGGraphicRoot } from './geoTypes';
import * as matrix from 'zrender/src/core/matrix';
import Element from 'zrender/src/Element';
import { each } from 'zrender/src/core/util';

const TMP_TRANSFORM = [] as number[];

function transformPoints(points: number[][], transform: matrix.MatrixArray) {
    for (let p = 0; p < points.length; p++) {
        vec2.applyTransform(points[p], points[p], transform);
    }
}
function updateBBoxFromPoints(
    points: ArrayLike<number>[],
    min: vec2.VectorArray,
    max: vec2.VectorArray,
    projection: GeoProjection
) {
    for (let i = 0; i < points.length; i++) {
        let p = points[i];
        if (projection) {
            // projection may return null point.
            p = projection.project(p as number[]);
        }
        if (p && isFinite(p[0]) && isFinite(p[1])) {
            vec2.min(min, min, p as vec2.VectorArray);
            vec2.max(max, max, p as vec2.VectorArray);
        }
    }
}

function centroid(points: number[][]) {
    let signedArea = 0;
    let cx = 0;
    let cy = 0;
    const len = points.length;
    let x0 = points[len - 1][0];
    let y0 = points[len - 1][1];
    // Polygon should been closed.
    for (let i = 0; i < len; i++) {
        const x1 = points[i][0];
        const y1 = points[i][1];
        const a = x0 * y1 - x1 * y0;
        signedArea += a;
        cx += (x0 + x1) * a;
        cy += (y0 + y1) * a;
        x0 = x1;
        y0 = y1;
    }

    return signedArea
        ? [cx / signedArea / 3, cy / signedArea / 3, signedArea]
        : [points[0][0] || 0, points[0][1] || 0];
}
export abstract class Region {

    readonly name: string;
    readonly type: 'geoJSON' | 'geoSVG';

    protected _center: number[];
    protected _rect: BoundingRect;

    constructor(
        name: string
    ) {
        this.name = name;
    }

    setCenter(center: number[]) {
        this._center = center;
    }

    /**
     * Get center point in data unit. That is,
     * for GeoJSONRegion, the unit is lat/lng,
     * for GeoSVGRegion, the unit is SVG local coord.
     */
    getCenter() {
        let center = this._center;
        if (!center) {
            // In most cases there are no need to calculate this center.
            // So calculate only when called.
            center = this._center = this.calcCenter();
        }
        return center;
    }


    abstract calcCenter(): number[];
}

export class GeoJSONPolygonGeometry {
    readonly type = 'polygon';
    exterior: number[][];
    interiors?: number[][][];
    constructor(exterior: number[][], interiors: number[][][]) {
        this.exterior = exterior;
        this.interiors = interiors;
    }
}
export class GeoJSONLineStringGeometry {
    readonly type = 'linestring';
    points: number[][][];
    constructor(points: number[][][]) {
        this.points = points;
    }
}
export class GeoJSONRegion extends Region {

    readonly type = 'geoJSON';

    readonly geometries: (GeoJSONPolygonGeometry | GeoJSONLineStringGeometry)[];

    // Injected outside.
    properties: GeoJSON['features'][0]['properties'];

    constructor(
        name: string,
        geometries: GeoJSONRegion['geometries'],
        cp: GeoJSON['features'][0]['properties']['cp']
    ) {
        super(name);

        this.geometries = geometries;

        this._center = cp && [cp[0], cp[1]];
    }

    calcCenter() {
        const geometries = this.geometries;
        let largestGeo: GeoJSONPolygonGeometry;
        let largestGeoSize = 0;
        for (let i = 0; i < geometries.length; i++) {
            const geo = geometries[i] as GeoJSONPolygonGeometry;
            const exterior = geo.exterior;
            // Simple trick to use points count instead of polygon area as region size.
            // Ignore linestring
            const size = exterior && exterior.length;
            if (size > largestGeoSize) {
                largestGeo = geo;
                largestGeoSize = size;
            }
        }
        if (largestGeo) {
            return centroid(largestGeo.exterior);
        }

        // from bounding rect by default.
        const rect = this.getBoundingRect();
        return [
            rect.x + rect.width / 2,
            rect.y + rect.height / 2
        ];
    }

    getBoundingRect(projection?: GeoProjection): BoundingRect {
        let rect = this._rect;
        // Always recalculate if using projection.
        if (rect && !projection) {
            return rect;
        }

        const min = [Infinity, Infinity];
        const max = [-Infinity, -Infinity];
        const geometries = this.geometries;

        each(geometries, geo => {
            if (geo.type === 'polygon') {
                // Doesn't consider hole
                updateBBoxFromPoints(geo.exterior, min, max, projection);
            }
            else {
                each(geo.points, (points) => {
                    updateBBoxFromPoints(points, min, max, projection);
                });
            }
        });
        // Normalie invalid bounding.
        if (!(isFinite(min[0]) && isFinite(min[1]) && isFinite(max[0]) && isFinite(max[1]))) {
            min[0] = min[1] = max[0] = max[1] = 0;
        }
        rect = new BoundingRect(
            min[0], min[1], max[0] - min[0], max[1] - min[1]
        );
        if (!projection) {
            this._rect = rect;
        }

        return rect;
    }

    contain(coord: number[]): boolean {
        const rect = this.getBoundingRect();
        const geometries = this.geometries;
        if (!rect.contain(coord[0], coord[1])) {
            return false;
        }
        loopGeo: for (let i = 0, len = geometries.length; i < len; i++) {
            const geo = geometries[i];
            // Only support polygon.
            if (geo.type !== 'polygon') {
                continue;
            }
            const exterior = geo.exterior;
            const interiors = geo.interiors;
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

    /**
     * Transform the raw coords to target bounding.
     * @param x
     * @param y
     * @param width
     * @param height
     */
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
            const geo = geometries[i];
            if (geo.type === 'polygon') {
                transformPoints(geo.exterior, transform);
                each(geo.interiors, interior => {
                    transformPoints(interior, transform);
                });
            }
            else {
                each(geo.points, points => {
                    transformPoints(points, transform);
                });
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
}

export class GeoSVGRegion extends Region {

    readonly type = 'geoSVG';

    // Can only be used to calculate, but not be modified.
    // Because this el may not belong to this view,
    // but been displaying on some other view.
    private _elOnlyForCalculate: Element;

    constructor(
        name: string,
        elOnlyForCalculate: Element
    ) {
        super(name);
        this._elOnlyForCalculate = elOnlyForCalculate;
    }

    calcCenter(): number[] {
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


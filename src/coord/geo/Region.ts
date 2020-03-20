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
import { GeoJSON } from './geoTypes';


class Region {

    readonly geometries: {
        type: 'polygon'; // FIXME:TS Is there other types?
        exterior: number[][];
        interiors?: number[][][];
    }[];

    readonly name: string;

    center: number[];

    // Injected outside.
    properties: GeoJSON['features'][0]['properties'];

    private _rect: BoundingRect;


    constructor(
        name: string,
        geometries: Region['geometries'],
        cp: GeoJSON['features'][0]['properties']['cp']
    ) {
        this.name = name;
        this.geometries = geometries;

        if (!cp) {
            let rect = this.getBoundingRect();
            cp = [
                rect.x + rect.width / 2,
                rect.y + rect.height / 2
            ];
        }
        else {
            cp = [cp[0], cp[1]];
        }
        this.center = cp;
    }

    getBoundingRect(): BoundingRect {
        let rect = this._rect;
        if (rect) {
            return rect;
        }

        let MAX_NUMBER = Number.MAX_VALUE;
        let min = [MAX_NUMBER, MAX_NUMBER];
        let max = [-MAX_NUMBER, -MAX_NUMBER];
        let min2 = [] as number[];
        let max2 = [] as number[];
        let geometries = this.geometries;
        let i = 0;
        for (; i < geometries.length; i++) {
            // Only support polygon
            if (geometries[i].type !== 'polygon') {
                continue;
            }
            // Doesn't consider hole
            let exterior = geometries[i].exterior;
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
        let rect = this.getBoundingRect();
        let geometries = this.geometries;
        if (!rect.contain(coord[0], coord[1])) {
            return false;
        }
        loopGeo: for (let i = 0, len = geometries.length; i < len; i++) {
            // Only support polygon.
            if (geometries[i].type !== 'polygon') {
                continue;
            }
            let exterior = geometries[i].exterior;
            let interiors = geometries[i].interiors;
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
        let aspect = rect.width / rect.height;
        if (!width) {
            width = aspect * height;
        }
        else if (!height) {
            height = width / aspect;
        }
        let target = new BoundingRect(x, y, width, height);
        let transform = rect.calculateTransform(target);
        let geometries = this.geometries;
        for (let i = 0; i < geometries.length; i++) {
            // Only support polygon.
            if (geometries[i].type !== 'polygon') {
                continue;
            }
            let exterior = geometries[i].exterior;
            let interiors = geometries[i].interiors;
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
        this.center = [
            rect.x + rect.width / 2,
            rect.y + rect.height / 2
        ];
    }

    cloneShallow(name: string): Region {
        name == null && (name = this.name);
        let newRegion = new Region(name, this.geometries, this.center);
        newRegion._rect = this._rect;
        newRegion.transformTo = null; // Simply avoid to be called.
        return newRegion;
    }

}

export default Region;

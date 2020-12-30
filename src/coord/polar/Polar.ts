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

import RadiusAxis from './RadiusAxis';
import AngleAxis from './AngleAxis';
import PolarModel from './PolarModel';
import { CoordinateSystem, CoordinateSystemMaster, CoordinateSystemClipArea } from '../CoordinateSystem';
import GlobalModel from '../../model/Global';
import { ParsedModelFinder, ParsedModelFinderKnown } from '../../util/model';
import { ScaleDataValue } from '../../util/types';
import ExtensionAPI from '../../core/ExtensionAPI';

interface Polar {
    update(ecModel: GlobalModel, api: ExtensionAPI): void
}
class Polar implements CoordinateSystem, CoordinateSystemMaster {

    readonly name: string;

    readonly dimensions = ['radius', 'angle'];

    readonly type = 'polar';

    /**
     * x of polar center
     */
    cx = 0;

    /**
     * y of polar center
     */
    cy = 0;

    private _radiusAxis = new RadiusAxis();

    private _angleAxis = new AngleAxis();

    axisPointerEnabled = true;

    model: PolarModel;

    constructor(name: string) {
        this.name = name || '';

        this._radiusAxis.polar = this._angleAxis.polar = this;
    }

    /**
     * If contain coord
     */
    containPoint(point: number[]) {
        const coord = this.pointToCoord(point);
        return this._radiusAxis.contain(coord[0])
            && this._angleAxis.contain(coord[1]);
    }

    /**
     * If contain data
     */
    containData(data: number[]) {
        return this._radiusAxis.containData(data[0])
            && this._angleAxis.containData(data[1]);
    }

    getAxis(dim: 'radius' | 'angle') {
        const key = ('_' + dim + 'Axis') as '_radiusAxis' | '_angleAxis';
        return this[key];
    }

    getAxes() {
        return [this._radiusAxis, this._angleAxis];
    }

    /**
     * Get axes by type of scale
     */
    getAxesByScale(scaleType: 'ordinal' | 'interval' | 'time' | 'log') {
        const axes = [];
        const angleAxis = this._angleAxis;
        const radiusAxis = this._radiusAxis;
        angleAxis.scale.type === scaleType && axes.push(angleAxis);
        radiusAxis.scale.type === scaleType && axes.push(radiusAxis);

        return axes;
    }

    getAngleAxis() {
        return this._angleAxis;
    }

    getRadiusAxis() {
        return this._radiusAxis;
    }

    getOtherAxis(axis: AngleAxis | RadiusAxis): AngleAxis | RadiusAxis {
        const angleAxis = this._angleAxis;
        return axis === angleAxis ? this._radiusAxis : angleAxis;
    }

    /**
     * Base axis will be used on stacking.
     *
     */
    getBaseAxis() {
        return this.getAxesByScale('ordinal')[0]
            || this.getAxesByScale('time')[0]
            || this.getAngleAxis();
    }

    getTooltipAxes(dim: 'radius' | 'angle' | 'auto') {
        const baseAxis = (dim != null && dim !== 'auto')
            ? this.getAxis(dim) : this.getBaseAxis();
        return {
            baseAxes: [baseAxis],
            otherAxes: [this.getOtherAxis(baseAxis)]
        };
    }

    /**
     * Convert a single data item to (x, y) point.
     * Parameter data is an array which the first element is radius and the second is angle
     */
    dataToPoint(data: ScaleDataValue[], clamp?: boolean) {
        return this.coordToPoint([
            this._radiusAxis.dataToRadius(data[0], clamp),
            this._angleAxis.dataToAngle(data[1], clamp)
        ]);
    }

    /**
     * Convert a (x, y) point to data
     */
    pointToData(point: number[], clamp?: boolean) {
        const coord = this.pointToCoord(point);
        return [
            this._radiusAxis.radiusToData(coord[0], clamp),
            this._angleAxis.angleToData(coord[1], clamp)
        ];
    }

    /**
     * Convert a (x, y) point to (radius, angle) coord
     */
    pointToCoord(point: number[]) {
        let dx = point[0] - this.cx;
        let dy = point[1] - this.cy;
        const angleAxis = this.getAngleAxis();
        const extent = angleAxis.getExtent();
        let minAngle = Math.min(extent[0], extent[1]);
        let maxAngle = Math.max(extent[0], extent[1]);
        // Fix fixed extent in polarCreator
        // FIXME
        angleAxis.inverse
            ? (minAngle = maxAngle - 360)
            : (maxAngle = minAngle + 360);

        const radius = Math.sqrt(dx * dx + dy * dy);
        dx /= radius;
        dy /= radius;

        let radian = Math.atan2(-dy, dx) / Math.PI * 180;

        // move to angleExtent
        const dir = radian < minAngle ? 1 : -1;
        while (radian < minAngle || radian > maxAngle) {
            radian += dir * 360;
        }

        return [radius, radian];
    }

    /**
     * Convert a (radius, angle) coord to (x, y) point
     */
    coordToPoint(coord: number[]) {
        const radius = coord[0];
        const radian = coord[1] / 180 * Math.PI;
        const x = Math.cos(radian) * radius + this.cx;
        // Inverse the y
        const y = -Math.sin(radian) * radius + this.cy;

        return [x, y];
    }

    /**
     * Get ring area of cartesian.
     * Area will have a contain function to determine if a point is in the coordinate system.
     */
    getArea(): PolarArea {

        const angleAxis = this.getAngleAxis();
        const radiusAxis = this.getRadiusAxis();

        const radiusExtent = radiusAxis.getExtent().slice();
        radiusExtent[0] > radiusExtent[1] && radiusExtent.reverse();
        const angleExtent = angleAxis.getExtent();

        const RADIAN = Math.PI / 180;

        return {
            cx: this.cx,
            cy: this.cy,
            r0: radiusExtent[0],
            r: radiusExtent[1],
            startAngle: -angleExtent[0] * RADIAN,
            endAngle: -angleExtent[1] * RADIAN,
            clockwise: angleAxis.inverse,
            contain(x: number, y: number) {
                // It's a ring shape.
                // Start angle and end angle don't matter
                const dx = x - this.cx;
                const dy = y - this.cy;
                const d2 = dx * dx + dy * dy;
                const r = this.r;
                const r0 = this.r0;

                return d2 <= r * r && d2 >= r0 * r0;
            }
        };
    }

    convertToPixel(ecModel: GlobalModel, finder: ParsedModelFinder, value: ScaleDataValue[]) {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? this.dataToPoint(value) : null;
    }

    convertFromPixel(ecModel: GlobalModel, finder: ParsedModelFinder, pixel: number[]) {
        const coordSys = getCoordSys(finder);
        return coordSys === this ? this.pointToData(pixel) : null;
    }
}

function getCoordSys(finder: ParsedModelFinderKnown) {
    const seriesModel = finder.seriesModel;
    const polarModel = finder.polarModel as PolarModel;
    return polarModel && polarModel.coordinateSystem
        || seriesModel && seriesModel.coordinateSystem as Polar;
}

interface PolarArea extends CoordinateSystemClipArea {
    cx: number
    cy: number
    r0: number
    r: number
    startAngle: number
    endAngle: number
    clockwise: boolean
}

export default Polar;
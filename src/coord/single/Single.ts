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

/**
 * Single coordinates system.
 */

import SingleAxis from './SingleAxis';
import * as axisHelper from '../axisHelper';
import {getLayoutRect} from '../../util/layout';
import {each} from 'zrender/src/core/util';
import { CoordinateSystem, CoordinateSystemMaster } from '../CoordinateSystem';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import BoundingRect from 'zrender/src/core/BoundingRect';
import SingleAxisModel from './AxisModel';
import { ParsedModelFinder, ParsedModelFinderKnown } from '../../util/model';
import { ScaleDataValue } from '../../util/types';

/**
 * Create a single coordinates system.
 */
class Single implements CoordinateSystem, CoordinateSystemMaster {

    readonly type = 'single';

    readonly dimension = 'single';
    /**
     * Add it just for draw tooltip.
     */
    readonly dimensions = ['single'];

    name: string;

    axisPointerEnabled: boolean = true;

    model: SingleAxisModel;

    private _axis: SingleAxis;

    private _rect: BoundingRect;

    constructor(axisModel: SingleAxisModel, ecModel: GlobalModel, api: ExtensionAPI) {

        this.model = axisModel;

        this._init(axisModel, ecModel, api);
    }

    /**
     * Initialize single coordinate system.
     */
    _init(axisModel: SingleAxisModel, ecModel: GlobalModel, api: ExtensionAPI) {

        const dim = this.dimension;

        const axis = new SingleAxis(
            dim,
            axisHelper.createScaleByModel(axisModel),
            [0, 0],
            axisModel.get('type'),
            axisModel.get('position')
        );

        const isCategory = axis.type === 'category';
        axis.onBand = isCategory && axisModel.get('boundaryGap');
        axis.inverse = axisModel.get('inverse');
        axis.orient = axisModel.get('orient');

        axisModel.axis = axis;
        axis.model = axisModel;
        axis.coordinateSystem = this;
        this._axis = axis;
    }

    /**
     * Update axis scale after data processed
     */
    update(ecModel: GlobalModel, api: ExtensionAPI) {
        ecModel.eachSeries(function (seriesModel) {
            if (seriesModel.coordinateSystem === this) {
                const data = seriesModel.getData();
                each(data.mapDimensionsAll(this.dimension), function (dim) {
                    this._axis.scale.unionExtentFromData(data, dim);
                }, this);
                axisHelper.niceScaleExtent(this._axis.scale, this._axis.model);
            }
        }, this);
    }

    /**
     * Resize the single coordinate system.
     */
    resize(axisModel: SingleAxisModel, api: ExtensionAPI) {
        this._rect = getLayoutRect(
            {
                left: axisModel.get('left'),
                top: axisModel.get('top'),
                right: axisModel.get('right'),
                bottom: axisModel.get('bottom'),
                width: axisModel.get('width'),
                height: axisModel.get('height')
            },
            {
                width: api.getWidth(),
                height: api.getHeight()
            }
        );

        this._adjustAxis();
    }

    getRect() {
        return this._rect;
    }

    private _adjustAxis() {

        const rect = this._rect;
        const axis = this._axis;

        const isHorizontal = axis.isHorizontal();
        const extent = isHorizontal ? [0, rect.width] : [0, rect.height];
        const idx = axis.reverse ? 1 : 0;

        axis.setExtent(extent[idx], extent[1 - idx]);

        this._updateAxisTransform(axis, isHorizontal ? rect.x : rect.y);

    }


    private _updateAxisTransform(axis: SingleAxis, coordBase: number) {

        const axisExtent = axis.getExtent();
        const extentSum = axisExtent[0] + axisExtent[1];
        const isHorizontal = axis.isHorizontal();

        axis.toGlobalCoord = isHorizontal
            ? function (coord) {
                return coord + coordBase;
            }
            : function (coord) {
                return extentSum - coord + coordBase;
            };

        axis.toLocalCoord = isHorizontal
            ? function (coord) {
                return coord - coordBase;
            }
            : function (coord) {
                return extentSum - coord + coordBase;
            };
    }

    /**
     * Get axis.
     */
    getAxis() {
        return this._axis;
    }

    /**
     * Get axis, add it just for draw tooltip.
     */
    getBaseAxis() {
        return this._axis;
    }

    getAxes() {
        return [this._axis];
    }

    getTooltipAxes() {
        return {
            baseAxes: [this.getAxis()],
            // Empty otherAxes
            otherAxes: [] as SingleAxis[]
        };
    }

    /**
     * If contain point.
     */
    containPoint(point: number[]) {
        const rect = this.getRect();
        const axis = this.getAxis();
        const orient = axis.orient;
        if (orient === 'horizontal') {
            return axis.contain(axis.toLocalCoord(point[0]))
            && (point[1] >= rect.y && point[1] <= (rect.y + rect.height));
        }
        else {
            return axis.contain(axis.toLocalCoord(point[1]))
            && (point[0] >= rect.y && point[0] <= (rect.y + rect.height));
        }
    }

    pointToData(point: number[]) {
        const axis = this.getAxis();
        return [axis.coordToData(axis.toLocalCoord(
            point[axis.orient === 'horizontal' ? 0 : 1]
        ))];
    }

    /**
     * Convert the series data to concrete point.
     * Can be [val] | val
     */
    dataToPoint(val: ScaleDataValue | ScaleDataValue[]) {
        const axis = this.getAxis();
        const rect = this.getRect();
        const pt = [];
        const idx = axis.orient === 'horizontal' ? 0 : 1;

        if (val instanceof Array) {
            val = val[0];
        }

        pt[idx] = axis.toGlobalCoord(axis.dataToCoord(+val));
        pt[1 - idx] = idx === 0 ? (rect.y + rect.height / 2) : (rect.x + rect.width / 2);
        return pt;
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

function getCoordSys(finder: ParsedModelFinderKnown): Single {
    const seriesModel = finder.seriesModel;
    const singleModel = finder.singleAxisModel as SingleAxisModel;
    return singleModel && singleModel.coordinateSystem
        || seriesModel && seriesModel.coordinateSystem as Single;
}

export default Single;

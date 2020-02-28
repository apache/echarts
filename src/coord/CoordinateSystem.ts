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

import Model from '../model/Model';
import GlobalModel from '../model/Global';
import {ParsedModelFinder} from '../util/model';
import ExtensionAPI from '../ExtensionAPI';
import { DimensionDefinitionLoose, ScaleDataValue, DimensionName } from '../util/types';
import Axis from './Axis';
import { BoundingRect } from '../util/graphic';
import { MatrixArray } from 'zrender/src/core/matrix';
import ComponentModel from '../model/Component';
import { RectLike } from 'zrender/src/core/BoundingRect';


export interface CoordinateSystemCreator {

    create: (ecModel: GlobalModel, api: ExtensionAPI) => CoordinateSystemMaster[];

    // FIXME current dimensions must be string[].
    // check and unify the definition.
    // FIXME:TS check where used (seams only HeatmapSeries used?)
    dimensions: DimensionName[];

    // dimensionsInfo like [{name: ..., type: ...}, 'xxx', ...]
    getDimensionsInfo?: () => DimensionDefinitionLoose[];
}

/**
 * The instance get from `CoordinateSystemManger` is `CoordinateSystemMaster`.
 */
export interface CoordinateSystemMaster {

    // FIXME current dimensions must be string[].
    // check and unify the definition.
    // Should be the same as its coordinateSystemCreator.
    dimensions: DimensionName[];

    model?: Model;

    update?: (ecModel: GlobalModel, api: ExtensionAPI) => void;

    // This methods is also responsible for determine whether this
    // coodinate system is applicable to the given `finder`.
    // Each coordinate system will be tried, util one returns none
    // null/undefined value.
    convertToPixel(
        ecModel: GlobalModel, finder: ParsedModelFinder, value: ScaleDataValue | ScaleDataValue[]
    ): number | number[];

    // This methods is also responsible for determine whether this
    // coodinate system is applicable to the given `finder`.
    // Each coordinate system will be tried, util one returns none
    // null/undefined value.
    convertFromPixel(
        ecModel: GlobalModel, finder: ParsedModelFinder, pixelValue: number | number[]
    ): ScaleDataValue | ScaleDataValue[];

    // @param point Point in global pixel coordinate system.
    // The signature of this method should be the same as `CoordinateSystemExecutive`
    containPoint(point: number[]): boolean;

    // Must be implemented when `axisPointerEnabled` is `true`.
    getAxes?: () => Axis[];

    axisPointerEnabled?: boolean;

    getTooltipAxes?: (dim: DimensionName | 'auto') => {baseAxes: Axis[], otherAxes: Axis[]};

    /**
     * Get layout rect or coordinate system
     */
    getRect?: () => RectLike

}

/**
 * For example: cartesian is CoordinateSystem.
 * series.coordinateSystem is CoordinateSystem.
 */
export interface CoordinateSystem {

    type: string

    // Should be the same as its coordinateSystemCreator.
    dimensions: DimensionName[];

    model?: Model;

    // @param data
    // @param reserved Defined by the coordinate system itself
    // @param out
    // @return {Array.<number>} point Point in global pixel coordinate system.
    dataToPoint(
        data: ScaleDataValue | ScaleDataValue[],
        reserved?: any,
        out?: number[]
    ): number[];

    // @param point point Point in global pixel coordinate system.
    // @param reserved Defined by the coordinate system itself
    // @param out
    // @return data
    pointToData(
        point: number[],
        reserved?: any,
        out?: number[]
    ): number | number[];

    // @param point Point in global pixel coordinate system.
    containPoint(point: number[]): boolean;

    getAxis?: (dim?: DimensionName) => Axis;

    getBaseAxis?: () => Axis;

    getOtherAxis?: (baseAxis: Axis) => Axis;

    clampData?: (data: ScaleDataValue[], out?: number[]) => number[];

    getRoamTransform?: () => MatrixArray;

    getArea?: () => {
        contain(x: number, y: number): boolean
    };

    // Only `coord/View.js` implements `getBoundingRect`.
    // But if other coord sys implement it, should follow this signature.
    getBoundingRect?: () => BoundingRect;

    // Currently only Cartesian2D implements it.
    // But if other coordinate systems implement it, should follow this signature.
    getAxesByScale?: (scaleType: string) => Axis[];

}

/**
 * Like GridModel, PolarModel, ...
 */
export interface CoordinateSystemHostModel extends ComponentModel {
    coordinateSystem?: CoordinateSystemMaster
}

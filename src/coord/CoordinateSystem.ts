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

import GlobalModel from '../model/Global';
import {ParsedModelFinder} from '../util/model';
import ExtensionAPI from '../core/ExtensionAPI';
import {
    DimensionDefinitionLoose, ScaleDataValue, DimensionName, NullUndefined, CoordinateSystemDataLayout,
    CoordinateSystemDataCoord
} from '../util/types';
import Axis from './Axis';
import { BoundingRect } from '../util/graphic';
import { MatrixArray } from 'zrender/src/core/matrix';
import ComponentModel from '../model/Component';
import { RectLike } from 'zrender/src/core/BoundingRect';
import type { PrepareCustomInfo } from '../chart/custom/CustomSeries';


export interface CoordinateSystemCreator {

    create: (ecModel: GlobalModel, api: ExtensionAPI) => CoordinateSystemMaster[];

    // FIXME current dimensions must be string[].
    // check and unify the definition.
    // FIXME:TS check where used (seams only HeatmapSeries used?)
    // Some coordinate system do not have static dimensions (like parallel)
    dimensions?: DimensionName[];

    // dimensionsInfo like [{name: ..., type: ...}, 'xxx', ...]
    getDimensionsInfo?: () => DimensionDefinitionLoose[];
}

/**
 * The instance get from `CoordinateSystemManger` is `CoordinateSystemMaster`.
 * Consider a typical case: `grid` is a `CoordinateSystemMaster`, and it contains
 * one or multiple `cartesian2d`s, which are `CoordinateSystem`s.
 */
export interface CoordinateSystemMaster {

    // FIXME current dimensions must be string[].
    // check and unify the definition.
    // Should be the same as its coordinateSystemCreator.
    dimensions: DimensionName[];

    model?: ComponentModel;

    // Injected if required.
    boxCoordinateSystem?: CoordinateSystem;

    update?: (ecModel: GlobalModel, api: ExtensionAPI) => void;

    // This methods is also responsible for determining whether this
    // coordinate system is applicable to the given `finder`.
    // Each coordinate system will be tried, until one returns non-
    // null/undefined value.
    // Aslo support
    //  const resultNumber = convertToPixel({someAxis: 0}, number);
    convertToPixel?(
        ecModel: GlobalModel,
        finder: ParsedModelFinder,
        value: Parameters<CoordinateSystem['dataToPoint']>[0],
        opt?: unknown
    ): ReturnType<CoordinateSystem['dataToPoint']> | number | NullUndefined;

    // This methods is also responsible for determining whether this
    // coordinate system is applicable to the given `finder`.
    // Each coordinate system will be tried, until one returns non-
    // null/undefined value.
    convertToLayout?(
        ecModel: GlobalModel,
        finder: ParsedModelFinder,
        value: Parameters<NonNullable<CoordinateSystem['dataToLayout']>>[0],
        opt?: unknown
    ): ReturnType<NonNullable<CoordinateSystem['dataToLayout']>> | NullUndefined;

    // This methods is also responsible for determining whether this
    // coordinate system is applicable to the given `finder`.
    // Each coordinate system will be tried, until one returns non-
    // null/undefined value.
    convertFromPixel?(
        ecModel: GlobalModel,
        finder: ParsedModelFinder,
        pixelValue: Parameters<NonNullable<CoordinateSystem['pointToData']>>[0],
        opt?: unknown
    ): ReturnType<NonNullable<CoordinateSystem['pointToData']>> | NullUndefined;

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

    /**
     * Master of coordinate system. For example:
     * Grid is master of cartesian.
     */
    master?: CoordinateSystemMaster

    // Should be the same as its coordinateSystemCreator.
    dimensions: DimensionName[];

    model?: ComponentModel;

    /**
     * @param data
     * @param reserved Defined by the coordinate system itself
     * @param out Fill it if passing, and return. For performance optimization.
     * @return Point in global pixel coordinate system.
     *  An invalid returned point should be represented by `[NaN, NaN]`,
     *  rather than `null/undefined`.
     */
    dataToPoint(
        data: CoordinateSystemDataCoord,
        opt?: unknown,
        out?: number[]
    ): number[];

    /**
     * @param data See the meaning in `dataToPoint`.
     * @param reserved Defined by the coordinate system itself
     * @param out Fill it if passing, and return. For performance optimization. Vary by different coord sys.
     * @return Layout in global pixel coordinate system.
     *  An invalid returned rect should be represented by `{x: NaN, y: NaN, width: NaN, height: NaN}`,
     *  Never return `null/undefined`.
     */
    dataToLayout?(
        data: CoordinateSystemDataCoord,
        opt?: unknown,
        out?: CoordinateSystemDataLayout
    ): CoordinateSystemDataLayout;

    /**
     * Some coord sys (like Parallel) might do not have `pointToData`,
     * or the meaning of this kind of features is not clear yet.
     * @param point point Point in global pixel coordinate system.
     * @param out Fill it if passing, and return. For performance optimization.
     * @return data
     *  An invalid returned data should be represented by `[NaN, NaN]` or `NaN`,
     *  rather than `null/undefined`, which represents not-applicable in `convertFromPixel`.
     *  Return `OrdinalNumber` in ordianal (category axis) case.
     *  Return timestamp in time axis.
     */
    pointToData?(
        point: number[],
        opt?: unknown,
        out?: number | number[]
    ): number | number[];

    // @param point Point in global pixel coordinate system.
    containPoint(point: number[]): boolean;

    getAxes?: () => Axis[];

    getAxis?: (dim?: DimensionName) => Axis;

    getBaseAxis?: () => Axis;

    getOtherAxis?: (baseAxis: Axis) => Axis;

    clampData?: (data: ScaleDataValue[], out?: number[]) => number[];

    getRoamTransform?: () => MatrixArray;

    getArea?: (tolerance?: number) => CoordinateSystemClipArea

    // Only `coord/View.js` implements `getBoundingRect`.
    // But if other coord sys implement it, should follow this signature.
    getBoundingRect?: () => BoundingRect;

    // Currently only Cartesian2D implements it.
    // But if other coordinate systems implement it, should follow this signature.
    getAxesByScale?: (scaleType: string) => Axis[];

    prepareCustoms?: PrepareCustomInfo;
}

/**
 * Like GridModel, PolarModel, ...
 */
export interface CoordinateSystemHostModel extends ComponentModel {
    coordinateSystem?: CoordinateSystemMaster
}

/**
 * Clip area will be returned by getArea of CoordinateSystem.
 * It is used to clip the graphic elements with the contain methods.
 */
export interface CoordinateSystemClipArea {
    x: number;
    y: number;
    width: number;
    height: number;
    contain(x: number, y: number): boolean;
}

export function isCoordinateSystemType<T extends CoordinateSystem, S = T['type']>(
    coordSys: CoordinateSystem, type: S
): coordSys is T {
    return (coordSys.type as unknown as S) === type;
}

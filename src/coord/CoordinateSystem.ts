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

// @ts-nocheck

import Model from '../model/Model';
import GlobalModel from '../model/Global';
import {ModelFinder} from '../util/model';
import ExtensionAPI from '../ExtensionAPI';
import { DimensionDefinitionLoose } from '../util/types';

export interface CoordinateSystemCreator {

    create: (ecModel: GlobalModel, api: ExtensionAPI) => CoordinateSystem;

    // FIXME current dimensions must be string[].
    // check and unify the definition.
    dimensions: string[];

    // dimensionsInfo like [{name: ..., type: ...}, 'xxx', ...]
    getDimensionsInfo?: () => DimensionDefinitionLoose[];

}

export interface CoordinateSystem {

    // FIXME current dimensions must be string[].
    // check and unify the definition.
    dimensions: string[];

    model: Model;

    update: (ecModel: GlobalModel, api: ExtensionAPI) => void;

    // @return {module:echarts/coord/Axis}
    getAxis: (dim: string) => any; // FIXME:TS temp any

    // @return {Array.<module:echarts/coord/Axis>}
    getAxes?: () => [] // FIXME:TS temp any

    axisPointerEnabled?: () => boolean;

    // @param {*|Array.<*>} data
    // @param {*} Defined by the coordinate system itself
    // @param {Array.<*>} out
    // @return {Array.<number>} point Point in global pixel coordinate system.
    dataToPoint: (...args) => number[];

    // @param {Array.<number>} point Point in global pixel coordinate system.
    // @param {*} Defined by the coordinate system itself
    // @param {Array.<*>} out
    // @return {*|Array.<*>} data
    pointToData: (...args) => any;

    // @param point Point in global pixel coordinate system.
    containPoint: (point: number[]) => boolean;

    // This methods is also responsible for determine whether this
    // coodinate system is applicable to the given `finder`.
    // Each coordinate system will be tried, util one returns none
    // null/undefined value.
    convertToPixel: (ecModel: any, finder: ModelFinder, value: any) => number | number[];

    // This methods is also responsible for determine whether this
    // coodinate system is applicable to the given `finder`.
    // Each coordinate system will be tried, util one returns none
    // null/undefined value.
    convertFromPixel: (ecModel: any, finder: ModelFinder, pixelValue: number | number[]) => any;

}
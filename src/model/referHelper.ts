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
 * Helper for model references.
 * There are many manners to refer axis/coordSys.
 */

// TODO
// merge relevant logic to this file?
// check: "modelHelper" of tooltip and "BrushTargetManager".

import {createHashMap, retrieve, each, HashMap} from 'zrender/src/core/util';
import SeriesModel from './Series';
import type PolarModel from '../coord/polar/PolarModel';
import type { SeriesOption, SeriesOnCartesianOptionMixin } from '../util/types';
import type { AxisBaseModel } from '../coord/AxisBaseModel';
import { SINGLE_REFERRING } from '../util/model';
import { ParallelSeriesOption } from '../chart/parallel/ParallelSeries';
import ParallelModel from '../coord/parallel/ParallelModel';
import ParallelAxisModel from '../coord/parallel/AxisModel';

/**
 * @class
 * For example:
 * {
 *     coordSysName: 'cartesian2d',
 *     coordSysDims: ['x', 'y', ...],
 *     axisMap: HashMap({
 *         x: xAxisModel,
 *         y: yAxisModel
 *     }),
 *     categoryAxisMap: HashMap({
 *         x: xAxisModel,
 *         y: undefined
 *     }),
 *     // The index of the first category axis in `coordSysDims`.
 *     // `null/undefined` means no category axis exists.
 *     firstCategoryDimIndex: 1,
 *     // To replace user specified encode.
 * }
 */

class CoordSysInfo {

    coordSysName: string;

    coordSysDims: string[] = [];

    axisMap = createHashMap<AxisBaseModel>();

    categoryAxisMap = createHashMap<AxisBaseModel>();

    firstCategoryDimIndex: number;

    constructor(coordSysName: string) {
        this.coordSysName = coordSysName;
    }
}

type SupportedCoordSys = 'cartesian2d' | 'polar' | 'singleAxis' | 'geo' | 'parallel';
type Fetcher = (
    seriesModel: SeriesModel,
    result: CoordSysInfo,
    axisMap: HashMap<AxisBaseModel>,
    categoryAxisMap: HashMap<AxisBaseModel>
) => void;

export function getCoordSysInfoBySeries(seriesModel: SeriesModel) {
    const coordSysName = seriesModel.get('coordinateSystem') as SupportedCoordSys;
    const result = new CoordSysInfo(coordSysName);
    const fetch = fetchers[coordSysName];
    if (fetch) {
        fetch(seriesModel, result, result.axisMap, result.categoryAxisMap);
        return result;
    }
}

const fetchers: Record<SupportedCoordSys, Fetcher> = {

    cartesian2d: function (
        seriesModel: SeriesModel<SeriesOption & SeriesOnCartesianOptionMixin>, result, axisMap, categoryAxisMap
    ) {
        const xAxisModel = seriesModel.getReferringComponents('xAxis', SINGLE_REFERRING).models[0] as AxisBaseModel;
        const yAxisModel = seriesModel.getReferringComponents('yAxis', SINGLE_REFERRING).models[0] as AxisBaseModel;

        if (__DEV__) {
            if (!xAxisModel) {
                throw new Error('xAxis "' + retrieve<number | string>(
                    seriesModel.get('xAxisIndex'),
                    seriesModel.get('xAxisId'),
                    0
                ) + '" not found');
            }
            if (!yAxisModel) {
                throw new Error('yAxis "' + retrieve<number | string>(
                    seriesModel.get('xAxisIndex'),
                    seriesModel.get('yAxisId'),
                    0
                ) + '" not found');
            }
        }

        result.coordSysDims = ['x', 'y'];
        axisMap.set('x', xAxisModel);
        axisMap.set('y', yAxisModel);

        if (isCategory(xAxisModel)) {
            categoryAxisMap.set('x', xAxisModel);
            result.firstCategoryDimIndex = 0;
        }
        if (isCategory(yAxisModel)) {
            categoryAxisMap.set('y', yAxisModel);
            result.firstCategoryDimIndex == null && (result.firstCategoryDimIndex = 1);
        }
    },

    singleAxis: function (seriesModel, result, axisMap, categoryAxisMap) {
        const singleAxisModel = seriesModel.getReferringComponents(
            'singleAxis', SINGLE_REFERRING
        ).models[0] as AxisBaseModel;

        if (__DEV__) {
            if (!singleAxisModel) {
                throw new Error('singleAxis should be specified.');
            }
        }

        result.coordSysDims = ['single'];
        axisMap.set('single', singleAxisModel);

        if (isCategory(singleAxisModel)) {
            categoryAxisMap.set('single', singleAxisModel);
            result.firstCategoryDimIndex = 0;
        }
    },

    polar: function (seriesModel, result, axisMap, categoryAxisMap) {
        const polarModel = seriesModel.getReferringComponents('polar', SINGLE_REFERRING).models[0] as PolarModel;
        const radiusAxisModel = polarModel.findAxisModel('radiusAxis');
        const angleAxisModel = polarModel.findAxisModel('angleAxis');

        if (__DEV__) {
            if (!angleAxisModel) {
                throw new Error('angleAxis option not found');
            }
            if (!radiusAxisModel) {
                throw new Error('radiusAxis option not found');
            }
        }

        result.coordSysDims = ['radius', 'angle'];
        axisMap.set('radius', radiusAxisModel);
        axisMap.set('angle', angleAxisModel);

        if (isCategory(radiusAxisModel)) {
            categoryAxisMap.set('radius', radiusAxisModel);
            result.firstCategoryDimIndex = 0;
        }
        if (isCategory(angleAxisModel)) {
            categoryAxisMap.set('angle', angleAxisModel);
            result.firstCategoryDimIndex == null && (result.firstCategoryDimIndex = 1);
        }
    },

    geo: function (seriesModel, result, axisMap, categoryAxisMap) {
        result.coordSysDims = ['lng', 'lat'];
    },

    parallel: function (seriesModel, result, axisMap, categoryAxisMap) {
        const ecModel = seriesModel.ecModel;
        const parallelModel = ecModel.getComponent(
            'parallel', (seriesModel as SeriesModel<ParallelSeriesOption>).get('parallelIndex')
        ) as ParallelModel;
        const coordSysDims = result.coordSysDims = parallelModel.dimensions.slice();

        each(parallelModel.parallelAxisIndex, function (axisIndex, index) {
            const axisModel = ecModel.getComponent('parallelAxis', axisIndex) as ParallelAxisModel;
            const axisDim = coordSysDims[index];
            axisMap.set(axisDim, axisModel);

            if (isCategory(axisModel)) {
                categoryAxisMap.set(axisDim, axisModel);
                if (result.firstCategoryDimIndex == null) {
                    result.firstCategoryDimIndex = index;
                }
            }
        });
    }
};

function isCategory(axisModel: AxisBaseModel) {
    return axisModel.get('type') === 'category';
}


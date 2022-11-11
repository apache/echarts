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

import {each, isString} from 'zrender/src/core/util';
import SeriesDimensionDefine from '../SeriesDimensionDefine';
import SeriesModel from '../../model/Series';
import SeriesData, { DataCalculationInfo } from '../SeriesData';
import type { SeriesOption, SeriesStackOptionMixin, DimensionName } from '../../util/types';
import { isSeriesDataSchema, SeriesDataSchema } from './SeriesDataSchema';
import DataStore from '../DataStore';

type EnableDataStackDimensionsInput = {
    schema: SeriesDataSchema;
    // If given, stack dimension will be ensured on this store.
    // Otherwise, stack dimension will be appended at the tail, and should not
    // be used on a shared store, but should create a brand new storage later.
    store?: DataStore;
};
type EnableDataStackDimensionsInputLegacy = (SeriesDimensionDefine | string)[];

/**
 * Note that it is too complicated to support 3d stack by value
 * (have to create two-dimension inverted index), so in 3d case
 * we just support that stacked by index.
 *
 * @param seriesModel
 * @param dimensionsInput The same as the input of <module:echarts/data/SeriesData>.
 *        The input will be modified.
 * @param opt
 * @param opt.stackedCoordDimension Specify a coord dimension if needed.
 * @param opt.byIndex=false
 * @return calculationInfo
 * {
 *     stackedDimension: string
 *     stackedByDimension: string
 *     isStackedByIndex: boolean
 *     stackedOverDimension: string
 *     stackResultDimension: string
 * }
 */
export function enableDataStack(
    seriesModel: SeriesModel<SeriesOption & SeriesStackOptionMixin>,
    dimensionsInput: EnableDataStackDimensionsInput | EnableDataStackDimensionsInputLegacy,
    opt?: {
        // Backward compat
        stackedCoordDimension?: string
        byIndex?: boolean
    }
): Pick<
    DataCalculationInfo<unknown>,
    'stackedDimension'
    | 'stackedByDimension'
    | 'isStackedByIndex'
    | 'stackedOverDimension'
    | 'stackResultDimension'
> {
    opt = opt || {};
    let byIndex = opt.byIndex;
    const stackedCoordDimension = opt.stackedCoordDimension;

    let dimensionDefineList: EnableDataStackDimensionsInputLegacy;
    let schema: SeriesDataSchema;
    let store: DataStore;

    if (isLegacyDimensionsInput(dimensionsInput)) {
        dimensionDefineList = dimensionsInput;
    }
    else {
        schema = dimensionsInput.schema;
        dimensionDefineList = schema.dimensions;
        store = dimensionsInput.store;
    }

    // Compatibal: when `stack` is set as '', do not stack.
    const mayStack = !!(seriesModel && seriesModel.get('stack'));
    let stackedByDimInfo: SeriesDimensionDefine;
    let stackedDimInfo: SeriesDimensionDefine;
    let stackResultDimension: string;
    let stackedOverDimension: string;

    each(dimensionDefineList, function (dimensionInfo, index) {
        if (isString(dimensionInfo)) {
            dimensionDefineList[index] = dimensionInfo = {
                name: dimensionInfo as string
            } as SeriesDimensionDefine;
        }

        if (mayStack && !dimensionInfo.isExtraCoord) {
            // Find the first ordinal dimension as the stackedByDimInfo.
            if (!byIndex && !stackedByDimInfo && dimensionInfo.ordinalMeta) {
                stackedByDimInfo = dimensionInfo;
            }
            // Find the first stackable dimension as the stackedDimInfo.
            if (!stackedDimInfo
                && dimensionInfo.type !== 'ordinal'
                && dimensionInfo.type !== 'time'
                && (!stackedCoordDimension || stackedCoordDimension === dimensionInfo.coordDim)
            ) {
                stackedDimInfo = dimensionInfo;
            }
        }
    });

    if (stackedDimInfo && !byIndex && !stackedByDimInfo) {
        // Compatible with previous design, value axis (time axis) only stack by index.
        // It may make sense if the user provides elaborately constructed data.
        byIndex = true;
    }

    // Add stack dimension, they can be both calculated by coordinate system in `unionExtent`.
    // That put stack logic in List is for using conveniently in echarts extensions, but it
    // might not be a good way.
    if (stackedDimInfo) {
        // Use a weird name that not duplicated with other names.
        // Also need to use seriesModel.id as postfix because different
        // series may share same data store. The stack dimension needs to be distinguished.
        stackResultDimension = '__\0ecstackresult_' + seriesModel.id;
        stackedOverDimension = '__\0ecstackedover_' + seriesModel.id;

        // Create inverted index to fast query index by value.
        if (stackedByDimInfo) {
            stackedByDimInfo.createInvertedIndices = true;
        }

        const stackedDimCoordDim = stackedDimInfo.coordDim;
        const stackedDimType = stackedDimInfo.type;
        let stackedDimCoordIndex = 0;

        each(dimensionDefineList, function (dimensionInfo: SeriesDimensionDefine) {
            if (dimensionInfo.coordDim === stackedDimCoordDim) {
                stackedDimCoordIndex++;
            }
        });

        const stackedOverDimensionDefine: SeriesDimensionDefine = {
            name: stackResultDimension,
            coordDim: stackedDimCoordDim,
            coordDimIndex: stackedDimCoordIndex,
            type: stackedDimType,
            isExtraCoord: true,
            isCalculationCoord: true,
            storeDimIndex: dimensionDefineList.length
        };

        const stackResultDimensionDefine: SeriesDimensionDefine = {
            name: stackedOverDimension,
            // This dimension contains stack base (generally, 0), so do not set it as
            // `stackedDimCoordDim` to avoid extent calculation, consider log scale.
            coordDim: stackedOverDimension,
            coordDimIndex: stackedDimCoordIndex + 1,
            type: stackedDimType,
            isExtraCoord: true,
            isCalculationCoord: true,
            storeDimIndex: dimensionDefineList.length + 1
        };

        if (schema) {
            if (store) {
                stackedOverDimensionDefine.storeDimIndex =
                    store.ensureCalculationDimension(stackedOverDimension, stackedDimType);
                stackResultDimensionDefine.storeDimIndex =
                    store.ensureCalculationDimension(stackResultDimension, stackedDimType);
            }

            schema.appendCalculationDimension(stackedOverDimensionDefine);
            schema.appendCalculationDimension(stackResultDimensionDefine);
        }
        else {
            dimensionDefineList.push(stackedOverDimensionDefine);
            dimensionDefineList.push(stackResultDimensionDefine);
        }
    }

    return {
        stackedDimension: stackedDimInfo && stackedDimInfo.name,
        stackedByDimension: stackedByDimInfo && stackedByDimInfo.name,
        isStackedByIndex: byIndex,
        stackedOverDimension: stackedOverDimension,
        stackResultDimension: stackResultDimension
    };
}

function isLegacyDimensionsInput(
    dimensionsInput: Parameters<typeof enableDataStack>[1]
): dimensionsInput is EnableDataStackDimensionsInputLegacy {
    return !isSeriesDataSchema((dimensionsInput as EnableDataStackDimensionsInput).schema);
}

export function isDimensionStacked(data: SeriesData, stackedDim: string): boolean {
    // Each single series only maps to one pair of axis. So we do not need to
    // check stackByDim, whatever stacked by a dimension or stacked by index.
    return !!stackedDim && stackedDim === data.getCalculationInfo('stackedDimension');
}

export function getStackedDimension(data: SeriesData, targetDim: string): DimensionName {
    return isDimensionStacked(data, targetDim)
        ? data.getCalculationInfo('stackResultDimension')
        : targetDim;
}

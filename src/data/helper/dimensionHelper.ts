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


import {each, createHashMap, assert, map} from 'zrender/src/core/util';
import SeriesData from '../SeriesData';
import {
    DimensionName, VISUAL_DIMENSIONS, DimensionType, DimensionIndex
} from '../../util/types';
import { DataStoreDimensionType } from '../DataStore';
import { SeriesDataSchema } from './SeriesDataSchema';

export type DimensionSummaryEncode = {
    defaultedLabel: DimensionName[],
    defaultedTooltip: DimensionName[],
    [coordOrVisualDimName: string]:
        // index: coordDimIndex, value: dataDimName
        DimensionName[]
};
export type DimensionSummary = {
    encode: DimensionSummaryEncode,
    // Those details that can be expose to users are put int `userOutput`.
    userOutput: DimensionUserOuput,
    // All of the data dim names that mapped by coordDim.
    dataDimsOnCoord: DimensionName[],
    dataDimIndicesOnCoord: DimensionIndex[],
    encodeFirstDimNotExtra: {[coordDim: string]: DimensionName},
};

export type DimensionUserOuputEncode = {
    // index: coordDimIndex, value: dataDimIndex
    [coordOrVisualDimName: string]: DimensionIndex[]
};

class DimensionUserOuput {
    private _encode: DimensionUserOuputEncode;
    private _cachedDimNames: DimensionName[];
    private _schema?: SeriesDataSchema;

    constructor(
        encode: DimensionUserOuputEncode,
        dimRequest?: SeriesDataSchema
    ) {
        this._encode = encode;
        this._schema = dimRequest;
    }

    get(): {
        fullDimensions: DimensionName[];
        encode: DimensionUserOuputEncode;
    } {
        return {
            // Do not generate full dimension name until fist used.
            fullDimensions: this._getFullDimensionNames(),
            encode: this._encode
        };
    }

    /**
     * Get all data store dimension names.
     * Theoretically a series data store is defined both by series and used dataset (if any).
     * If some dimensions are omitted for performance reason in `this.dimensions`,
     * the dimension name may not be auto-generated if user does not specify a dimension name.
     * In this case, the dimension name is `null`/`undefined`.
     */
    private _getFullDimensionNames(): DimensionName[] {
        if (!this._cachedDimNames) {
            this._cachedDimNames = this._schema
                ? this._schema.makeOutputDimensionNames()
                : [];
        }
        return this._cachedDimNames;
    }
};


export function summarizeDimensions(
    data: SeriesData,
    schema?: SeriesDataSchema
): DimensionSummary {
    const summary: DimensionSummary = {} as DimensionSummary;
    const encode = summary.encode = {} as DimensionSummaryEncode;
    const notExtraCoordDimMap = createHashMap<1, DimensionName>();
    let defaultedLabel = [] as DimensionName[];
    let defaultedTooltip = [] as DimensionName[];

    const userOutputEncode = {} as DimensionUserOuputEncode;

    each(data.dimensions, function (dimName) {
        const dimItem = data.getDimensionInfo(dimName);

        const coordDim = dimItem.coordDim;
        if (coordDim) {
            if (__DEV__) {
                assert(VISUAL_DIMENSIONS.get(coordDim as any) == null);
            }

            const coordDimIndex = dimItem.coordDimIndex;
            getOrCreateEncodeArr(encode, coordDim)[coordDimIndex] = dimName;

            if (!dimItem.isExtraCoord) {
                notExtraCoordDimMap.set(coordDim, 1);

                // Use the last coord dim (and label friendly) as default label,
                // because when dataset is used, it is hard to guess which dimension
                // can be value dimension. If both show x, y on label is not look good,
                // and conventionally y axis is focused more.
                if (mayLabelDimType(dimItem.type)) {
                    defaultedLabel[0] = dimName;
                }

                // User output encode do not contain generated coords.
                // And it only has index. User can use index to retrieve value from the raw item array.
                getOrCreateEncodeArr(userOutputEncode, coordDim)[coordDimIndex] =
                    data.getDimensionIndex(dimItem.name);
            }
            if (dimItem.defaultTooltip) {
                defaultedTooltip.push(dimName);
            }
        }

        VISUAL_DIMENSIONS.each(function (v, otherDim) {
            const encodeArr = getOrCreateEncodeArr(encode, otherDim);

            const dimIndex = dimItem.otherDims[otherDim];
            if (dimIndex != null && dimIndex !== false) {
                encodeArr[dimIndex] = dimItem.name;
            }
        });
    });

    let dataDimsOnCoord = [] as DimensionName[];
    const encodeFirstDimNotExtra = {} as {[coordDim: string]: DimensionName};

    notExtraCoordDimMap.each(function (v, coordDim) {
        const dimArr = encode[coordDim];
        encodeFirstDimNotExtra[coordDim] = dimArr[0];
        // Not necessary to remove duplicate, because a data
        // dim canot on more than one coordDim.
        dataDimsOnCoord = dataDimsOnCoord.concat(dimArr);
    });

    summary.dataDimsOnCoord = dataDimsOnCoord;
    summary.dataDimIndicesOnCoord = map(
        dataDimsOnCoord, dimName => data.getDimensionInfo(dimName).storeDimIndex
    );
    summary.encodeFirstDimNotExtra = encodeFirstDimNotExtra;

    const encodeLabel = encode.label;
    // FIXME `encode.label` is not recommended, because formatter cannot be set
    // in this way. Use label.formatter instead. Maybe remove this approach someday.
    if (encodeLabel && encodeLabel.length) {
        defaultedLabel = encodeLabel.slice();
    }

    const encodeTooltip = encode.tooltip;
    if (encodeTooltip && encodeTooltip.length) {
        defaultedTooltip = encodeTooltip.slice();
    }
    else if (!defaultedTooltip.length) {
        defaultedTooltip = defaultedLabel.slice();
    }

    encode.defaultedLabel = defaultedLabel;
    encode.defaultedTooltip = defaultedTooltip;

    summary.userOutput = new DimensionUserOuput(userOutputEncode, schema);

    return summary;
}

function getOrCreateEncodeArr(
    encode: DimensionSummaryEncode | DimensionUserOuputEncode, dim: DimensionName
): (DimensionIndex | DimensionName)[] {
    if (!encode.hasOwnProperty(dim)) {
        encode[dim] = [];
    }
    return encode[dim];
}

// FIXME:TS should be type `AxisType`
export function getDimensionTypeByAxis(axisType: string): DataStoreDimensionType {
    return axisType === 'category'
        ? 'ordinal'
        : axisType === 'time'
        ? 'time'
        : 'float';
}

function mayLabelDimType(dimType: DimensionType): boolean {
    // In most cases, ordinal and time do not suitable for label.
    // Ordinal info can be displayed on axis. Time is too long.
    return !(dimType === 'ordinal' || dimType === 'time');
}

// function findTheLastDimMayLabel(data) {
//     // Get last value dim
//     let dimensions = data.dimensions.slice();
//     let valueType;
//     let valueDim;
//     while (dimensions.length && (
//         valueDim = dimensions.pop(),
//         valueType = data.getDimensionInfo(valueDim).type,
//         valueType === 'ordinal' || valueType === 'time'
//     )) {} // jshint ignore:line
//     return valueDim;
// }

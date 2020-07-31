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

import {
    Dictionary, OptionSourceData, DimensionDefinitionLoose, OptionSourceHeader,
    SourceFormat, DimensionDefinition, OptionDataItem, DimensionIndex,
    OptionDataValue, DimensionLoose, DimensionName, ParsedValue, SERIES_LAYOUT_BY_COLUMN
} from '../../util/types';
import Source from '../Source';
import { normalizeToArray } from '../../util/model';
import {
    assert, createHashMap, bind, each, hasOwn, map, clone, isObject,
    isArrayLike
} from 'zrender/src/core/util';
import {
    getRawSourceItemGetter, getRawSourceDataCounter, getRawSourceValueGetter
} from './dataProvider';
import { parseDataValue } from './parseDataValue';
import { createSource } from './sourceHelper';
import { consoleLog, makePrintable } from '../../util/log';


export type PipedDataTransformOption = DataTransformOption[];
export type DataTransformType = string;
export type DataTransformConfig = unknown;

export interface DataTransformOption {
    type: DataTransformType;
    config: DataTransformConfig;
    // Print the result via `console.log` when transform performed. Only work in dev mode for debug.
    print?: boolean;
}

export interface DataTransformResult {
    source: Source;
}

export interface DataTransform {
    (sourceList: Source[], config: DataTransformConfig): {
    }
}

export interface ExternalDataTransform<TO extends DataTransformOption = DataTransformOption> {
    // Must include namespace like: 'ecStat:regression'
    type: string,
    transform?: (
        param: ExternalDataTransformParam<TO>
    ) => ExternalDataTransformResultItem | ExternalDataTransformResultItem[]
}

interface ExternalDataTransformParam<TO extends DataTransformOption = DataTransformOption> {
    // This is the first source in sourceList. In most cases,
    // there is only one upstream source.
    source: ExternalSource;
    sourceList: ExternalSource[];
    config: TO['config'];
}
export interface ExternalDataTransformResultItem {
    data: OptionSourceData;
    dimensions?: DimensionDefinitionLoose[];
    sourceHeader?: OptionSourceHeader;
}
export interface ExternalDimensionDefinition extends DimensionDefinition {
    // Mandatory
    index: DimensionIndex;
}

/**
 * TODO: disable writable.
 * This structure will be exposed to users.
 */
class ExternalSource {
    /**
     * [Caveat]
     * This instance is to be exposed to users.
     * DO NOT mount private members on this instance directly.
     * If we have to use private members, we can make them in closure or use `makeInner`.
     */

    data: OptionSourceData;
    sourceFormat: SourceFormat;
    dimensions: ExternalDimensionDefinition[];
    sourceHeaderCount: number;

    getDimensionInfo(dim: DimensionLoose): ExternalDimensionDefinition {
        return;
    }

    getRawDataItem(dataIndex: number): OptionDataItem {
        return;
    }

    getRawHeaderItem(dataIndex: number): OptionDataItem {
        return;
    }

    count(): number {
        return;
    }

    /**
     * Only support by dimension index.
     * No need to support by dimension name in transform function,
     * becuase transform function is not case-specific, no need to use name literally.
     */
    retrieveItemValue(rawItem: OptionDataItem, dimIndex: DimensionIndex): OptionDataValue {
        return;
    }

    convertDataValue(rawVal: unknown, dimInfo: ExternalDimensionDefinition): ParsedValue {
        return parseDataValue(rawVal, dimInfo);
    }
}

function createExternalSource(
    data: OptionSourceData,
    sourceFormat: SourceFormat,
    dimsDef: DimensionDefinition[],
    sourceHeaderCount: number
): ExternalSource {
    const extSource = new ExternalSource();

    extSource.data = data;
    extSource.sourceFormat = sourceFormat;
    extSource.sourceHeaderCount = sourceHeaderCount;

    // Create a new dimensions structure for exposing.
    const dimensions = extSource.dimensions = [] as ExternalDimensionDefinition[];
    const dimsByName = {} as Dictionary<ExternalDimensionDefinition>;
    each(dimsDef, function (dimDef, idx) {
        const name = dimDef.name;
        const dimDefExt = {
            index: idx,
            name: name,
            displayName: dimDef.displayName
        };
        dimensions.push(dimDefExt);
        // Users probably not sepcify dimension name. For simplicity, data transform
        // do not generate dimension name.
        if (name != null) {
            // Dimension name should not be duplicated.
            // For simplicity, data transform forbid name duplication, do not generate
            // new name like module `completeDimensions.ts` did, but just tell users.
            assert(!hasOwn(dimsByName, name), 'dimension name "' + name + '" duplicated.');
            dimsByName[name] = dimDefExt;
        }
    });

    // Implement public methods:
    const rawItemGetter = getRawSourceItemGetter(sourceFormat, SERIES_LAYOUT_BY_COLUMN);
    extSource.getRawDataItem = bind(rawItemGetter, null, data, sourceHeaderCount, dimensions);
    extSource.getRawHeaderItem = function (dataIndex: number) {
        if (dataIndex < sourceHeaderCount) {
            return rawItemGetter(data, 0, dimensions, dataIndex);
        }
    };

    const rawCounter = getRawSourceDataCounter(sourceFormat, SERIES_LAYOUT_BY_COLUMN);
    extSource.count = bind(rawCounter, null, data, sourceHeaderCount, dimensions);

    const rawValueGetter = getRawSourceValueGetter(sourceFormat);
    extSource.retrieveItemValue = function (rawItem, dimIndex) {
        if (rawItem == null) {
            return;
        }
        const dimDef = extSource.dimensions[dimIndex];
        // When `dimIndex` is `null`, `rawValueGetter` return the whole item.
        if (dimDef) {
            return rawValueGetter(rawItem, dimIndex, dimDef.name) as OptionDataValue;
        }
    };

    extSource.getDimensionInfo = bind(getDimensionInfo, null, dimensions, dimsByName);

    return extSource;
}


function getDimensionInfo(
    dimensions: ExternalDimensionDefinition[],
    dimsByName: Dictionary<ExternalDimensionDefinition>,
    dim: DimensionLoose
): ExternalDimensionDefinition {
    if (dim == null) {
        return;
    }
    // Keep the same logic as `List::getDimension` did.
    if (typeof dim === 'number'
        // If being a number-like string but not being defined a dimension name.
        || (!isNaN(dim as any) && !hasOwn(dimsByName, dim))
    ) {
        return dimensions[dim as DimensionIndex];
    }
    else if (hasOwn(dimsByName, dim)) {
        return dimsByName[dim as DimensionName];
    }
}



const externalTransformMap = createHashMap<ExternalDataTransform, string>();

export function registerExternalTransform(
    externalTransform: ExternalDataTransform
): void {
    externalTransform = clone(externalTransform);
    let type = externalTransform.type;
    assert(type, 'Must have a `type` when `registerTransform`.');
    const typeParsed = type.split(':');
    assert(typeParsed.length === 2, 'Name must include namespace like "ns:regression".');
    // Namespace 'echarts:xxx' is official namespace, where the transforms should
    // be called directly via 'xxx' rather than 'echarts:xxx'.
    if (typeParsed[0] === 'echarts') {
        type = typeParsed[1];
    }
    externalTransformMap.set(type, externalTransform);
}

export function applyDataTransform(
    rawTransOption: DataTransformOption | PipedDataTransformOption,
    sourceList: Source[],
    infoForPrint: { datasetIndex: number }
): Source[] {
    const pipedTransOption: PipedDataTransformOption = normalizeToArray(rawTransOption);

    for (let i = 0, len = pipedTransOption.length; i < len; i++) {
        const transOption = pipedTransOption[i];
        sourceList = applySingleDataTransform(transOption, sourceList);
        // piped transform only support single input, except the fist one.
        // piped transform only support single output, except the last one.
        if (i < len - 1) {
            sourceList.length = Math.max(sourceList.length, 1);
        }

        if (__DEV__) {
            if (transOption.print) {
                const printStrArr = map(sourceList, source => {
                    return '--- datasetIndex: ' + infoForPrint.datasetIndex + ', transform result: ---\n'
                        + makePrintable(source.data);
                }).join('\n');
                consoleLog(printStrArr);
            }
        }
    }

    return sourceList;
}

function applySingleDataTransform(
    rawTransOption: DataTransformOption,
    upSourceList: Source[]
): Source[] {
    assert(upSourceList.length, 'Must have at least one upstream dataset.');

    const transOption = rawTransOption;
    const transType = transOption.type;
    const externalTransform = externalTransformMap.get(transType);

    assert(externalTransform, 'Can not find transform on type "' + transType + '".');

    // Prepare source
    const sourceList = map(upSourceList, function (source) {
        return createExternalSource(
            source.data,
            source.sourceFormat,
            source.dimensionsDefine,
            source.startIndex
        );
    });

    const resultList = normalizeToArray(
        externalTransform.transform({
            source: sourceList[0],
            sourceList: sourceList,
            config: clone(transOption.config)
        })
    );

    return map(resultList, function (result) {
        assert(
            isObject(result),
            'A transform should not return some empty results.'
        );
        assert(
            isObject(result.data) || isArrayLike(result.data),
            'Result data should be object or array in data transform.'
        );

        return createSource(
            result.data,
            {
                seriesLayoutBy: SERIES_LAYOUT_BY_COLUMN,
                sourceHeader: result.sourceHeader,
                dimensions: result.dimensions
            },
            null,
            null
        );
    });
}


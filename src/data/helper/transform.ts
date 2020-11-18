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
    Dictionary, OptionSourceData, DimensionDefinitionLoose,
    SourceFormat, DimensionDefinition, OptionDataItem, DimensionIndex,
    OptionDataValue, DimensionLoose, DimensionName, ParsedValue,
    SERIES_LAYOUT_BY_COLUMN, SOURCE_FORMAT_OBJECT_ROWS, SOURCE_FORMAT_ARRAY_ROWS,
    OptionSourceDataObjectRows, OptionSourceDataArrayRows
} from '../../util/types';
import { normalizeToArray } from '../../util/model';
import {
    createHashMap, bind, each, hasOwn, map, clone, isObject,
    isArrayLike,
    extend,
    isArray
} from 'zrender/src/core/util';
import {
    getRawSourceItemGetter, getRawSourceDataCounter, getRawSourceValueGetter
} from './dataProvider';
import { parseDataValue } from './dataValueHelper';
import { inheritSourceMetaRawOption } from './sourceHelper';
import { consoleLog, makePrintable, throwError } from '../../util/log';
import { createSource, Source } from '../Source';


export type PipedDataTransformOption = DataTransformOption[];
export type DataTransformType = string;
export type DataTransformConfig = unknown;

export interface DataTransformOption {
    type: DataTransformType;
    config: DataTransformConfig;
    // Print the result via `console.log` when transform performed. Only work in dev mode for debug.
    print?: boolean;
}

export interface ExternalDataTransform<TO extends DataTransformOption = DataTransformOption> {
    // Must include namespace like: 'ecStat:regression'
    type: string;
    __isBuiltIn?: boolean;
    transform: (
        param: ExternalDataTransformParam<TO>
    ) => ExternalDataTransformResultItem | ExternalDataTransformResultItem[];
}

interface ExternalDataTransformParam<TO extends DataTransformOption = DataTransformOption> {
    // This is the first source in upstreamList. In most cases,
    // there is only one upstream source.
    upstream: ExternalSource;
    upstreamList: ExternalSource[];
    config: TO['config'];
}
export interface ExternalDataTransformResultItem {
    /**
     * If `data` is null/undefined, inherit upstream data.
     */
    data: OptionSourceData;
    /**
     * A `transform` can optionally return a dimensions definition.
     * The rule:
     * If this `transform result` have different dimensions from the upstream, it should return
     * a new dimension definition. For example, this transform inherit the upstream data totally
     * but add a extra dimension.
     * Otherwise, do not need to return that dimension definition. echarts will inherit dimension
     * definition from the upstream.
     */
    dimensions?: DimensionDefinitionLoose[];
}
interface ExternalDimensionDefinition extends Partial<DimensionDefinition> {
    // Mandatory
    index: DimensionIndex;
}

/**
 * TODO: disable writable.
 * This structure will be exposed to users.
 */
export class ExternalSource {
    /**
     * [Caveat]
     * This instance is to be exposed to users.
     * (1) DO NOT mount private members on this instance directly.
     * If we have to use private members, we can make them in closure or use `makeInner`.
     * (2) "soruce header count" is not provided to transform, because it's complicated to manage
     * header and dimensions definition in each transfrom. Source header are all normalized to
     * dimensions definitions in transforms and their downstreams.
     */

    sourceFormat: SourceFormat;

    getRawData(): Source['data'] {
        // Only built-in transform available.
        throw new Error('not supported');
    }

    getRawDataItem(dataIndex: number): OptionDataItem {
        // Only built-in transform available.
        throw new Error('not supported');
    }

    cloneRawData(): Source['data'] {
        return;
    }

    /**
     * @return If dimension not found, return null/undefined.
     */
    getDimensionInfo(dim: DimensionLoose): ExternalDimensionDefinition {
        return;
    }

    /**
     * dimensions defined if and only if either:
     * (a) dataset.dimensions are declared.
     * (b) dataset data include dimensions definitions in data (detected or via specified `sourceHeader`).
     * If dimensions are defined, `dimensionInfoAll` is corresponding to
     * the defined dimensions.
     * Otherwise, `dimensionInfoAll` is determined by data columns.
     * @return Always return an array (even empty array).
     */
    cloneAllDimensionInfo(): ExternalDimensionDefinition[] {
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
    retrieveValue(dataIndex: number, dimIndex: DimensionIndex): OptionDataValue {
        return;
    }

    retrieveValueFromItem(dataItem: OptionDataItem, dimIndex: DimensionIndex): OptionDataValue {
        return;
    }

    convertValue(rawVal: unknown, dimInfo: ExternalDimensionDefinition): ParsedValue {
        return parseDataValue(rawVal, dimInfo);
    }
}


function createExternalSource(internalSource: Source, externalTransform: ExternalDataTransform): ExternalSource {
    const extSource = new ExternalSource();

    const data = internalSource.data;
    const sourceFormat = extSource.sourceFormat = internalSource.sourceFormat;
    const sourceHeaderCount = internalSource.startIndex;

    // [MEMO]
    // Create a new dimensions structure for exposing.
    // Do not expose all dimension info to users directly.
    // Becuase the dimension is probably auto detected from data and not might reliable.
    // Should not lead the transformers to think that is relialbe and return it.
    // See [DIMENSION_INHERIT_RULE] in `sourceManager.ts`.
    const dimensions = [] as ExternalDimensionDefinition[];
    const dimsByName = {} as Dictionary<ExternalDimensionDefinition>;

    const dimsDef = internalSource.dimensionsDefine;
    if (dimsDef) {
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
                let errMsg = '';
                if (hasOwn(dimsByName, name)) {
                    if (__DEV__) {
                        errMsg = 'dimension name "' + name + '" duplicated.';
                    }
                    throwError(errMsg);
                }
                dimsByName[name] = dimDefExt;
            }
        });
    }
    // If dimension definitions are not defined and can not be detected.
    // e.g., pure data `[[11, 22], ...]`.
    else {
        for (let i = 0; i < internalSource.dimensionsDetectedCount || 0; i++) {
            // Do not generete name or anything others. The consequence process in
            // `transform` or `series` probably have there own name generation strategry.
            dimensions.push({ index: i });
        }
    }

    // Implement public methods:
    const rawItemGetter = getRawSourceItemGetter(sourceFormat, SERIES_LAYOUT_BY_COLUMN);
    if (externalTransform.__isBuiltIn) {
        extSource.getRawDataItem = function (dataIndex) {
            return rawItemGetter(data, sourceHeaderCount, dimensions, dataIndex);
        };
        extSource.getRawData = bind(getRawData, null, internalSource);
    }

    extSource.cloneRawData = bind(cloneRawData, null, internalSource);

    const rawCounter = getRawSourceDataCounter(sourceFormat, SERIES_LAYOUT_BY_COLUMN);
    extSource.count = bind(rawCounter, null, data, sourceHeaderCount, dimensions);

    const rawValueGetter = getRawSourceValueGetter(sourceFormat);
    extSource.retrieveValue = function (dataIndex, dimIndex) {
        const rawItem = rawItemGetter(data, sourceHeaderCount, dimensions, dataIndex);
        return retrieveValueFromItem(rawItem, dimIndex);
    };
    const retrieveValueFromItem = extSource.retrieveValueFromItem = function (dataItem, dimIndex) {
        if (dataItem == null) {
            return;
        }
        const dimDef = dimensions[dimIndex];
        // When `dimIndex` is `null`, `rawValueGetter` return the whole item.
        if (dimDef) {
            return rawValueGetter(dataItem, dimIndex, dimDef.name) as OptionDataValue;
        }
    };

    extSource.getDimensionInfo = bind(getDimensionInfo, null, dimensions, dimsByName);
    extSource.cloneAllDimensionInfo = bind(cloneAllDimensionInfo, null, dimensions);

    return extSource;
}

function getRawData(upstream: Source): Source['data'] {
    const sourceFormat = upstream.sourceFormat;
    const data = upstream.data;

    if (sourceFormat === SOURCE_FORMAT_ARRAY_ROWS
        || sourceFormat === SOURCE_FORMAT_OBJECT_ROWS
        || !data
        || (isArray(data) && !data.length)
    ) {
        return upstream.data;
    }

    let errMsg = '';
    if (__DEV__) {
        errMsg = '`getRawData` is not supported in source format ' + sourceFormat;
    }
    throwError(errMsg);
}

function cloneRawData(upstream: Source): Source['data'] {
    const sourceFormat = upstream.sourceFormat;
    const data = upstream.data;

    if (!data) {
        return data;
    }
    else if (isArray(data) && !data.length) {
        return [];
    }
    else if (sourceFormat === SOURCE_FORMAT_ARRAY_ROWS) {
        const result = [];
        for (let i = 0, len = data.length; i < len; i++) {
            // Not strictly clone for performance
            result.push((data as OptionSourceDataArrayRows)[i].slice());
        }
        return result;
    }
    else if (sourceFormat === SOURCE_FORMAT_OBJECT_ROWS) {
        const result = [];
        for (let i = 0, len = data.length; i < len; i++) {
            // Not strictly clone for performance
            result.push(extend({}, (data as OptionSourceDataObjectRows)[i]));
        }
        return result;
    }
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

function cloneAllDimensionInfo(dimensions: ExternalDimensionDefinition[]): ExternalDimensionDefinition[] {
    return clone(dimensions);
}


const externalTransformMap = createHashMap<ExternalDataTransform, string>();

export function registerExternalTransform(
    externalTransform: ExternalDataTransform
): void {
    externalTransform = clone(externalTransform);
    let type = externalTransform.type;
    let errMsg = '';
    if (!type) {
        if (__DEV__) {
            errMsg = 'Must have a `type` when `registerTransform`.';
        }
        throwError(errMsg);
    }
    const typeParsed = type.split(':');
    if (typeParsed.length !== 2) {
        if (__DEV__) {
            errMsg = 'Name must include namespace like "ns:regression".';
        }
        throwError(errMsg);
    }
    // Namespace 'echarts:xxx' is official namespace, where the transforms should
    // be called directly via 'xxx' rather than 'echarts:xxx'.
    let isBuiltIn = false;
    if (typeParsed[0] === 'echarts') {
        type = typeParsed[1];
        isBuiltIn = true;
    }
    externalTransform.__isBuiltIn = isBuiltIn;
    externalTransformMap.set(type, externalTransform);
}

export function applyDataTransform(
    rawTransOption: DataTransformOption | PipedDataTransformOption,
    sourceList: Source[],
    infoForPrint: { datasetIndex: number }
): Source[] {
    const pipedTransOption: PipedDataTransformOption = normalizeToArray(rawTransOption);
    const pipeLen = pipedTransOption.length;

    let errMsg = '';
    if (!pipeLen) {
        if (__DEV__) {
            errMsg = 'If `transform` declared, it should at least contain one transform.';
        }
        throwError(errMsg);
    }

    for (let i = 0, len = pipeLen; i < len; i++) {
        const transOption = pipedTransOption[i];
        sourceList = applySingleDataTransform(transOption, sourceList, infoForPrint, pipeLen === 1 ? null : i);
        // piped transform only support single input, except the fist one.
        // piped transform only support single output, except the last one.
        if (i !== len - 1) {
            sourceList.length = Math.max(sourceList.length, 1);
        }
    }

    return sourceList;
}

function applySingleDataTransform(
    transOption: DataTransformOption,
    upSourceList: Source[],
    infoForPrint: { datasetIndex: number },
    // If `pipeIndex` is null/undefined, no piped transform.
    pipeIndex: number
): Source[] {
    let errMsg = '';
    if (!upSourceList.length) {
        if (__DEV__) {
            errMsg = 'Must have at least one upstream dataset.';
        }
        throwError(errMsg);
    }
    if (!isObject(transOption)) {
        if (__DEV__) {
            errMsg = 'transform declaration must be an object rather than ' + typeof transOption + '.';
        }
        throwError(errMsg);
    }

    const transType = transOption.type;
    const externalTransform = externalTransformMap.get(transType);

    if (!externalTransform) {
        if (__DEV__) {
            errMsg = 'Can not find transform on type "' + transType + '".';
        }
        throwError(errMsg);
    }

    // Prepare source
    const extUpSourceList = map(upSourceList, upSource => createExternalSource(upSource, externalTransform));

    const resultList = normalizeToArray(
        externalTransform.transform({
            upstream: extUpSourceList[0],
            upstreamList: extUpSourceList,
            config: clone(transOption.config)
        })
    );

    if (__DEV__) {
        if (transOption.print) {
            const printStrArr = map(resultList, extSource => {
                const pipeIndexStr = pipeIndex != null ? ' === pipe index: ' + pipeIndex : '';
                return [
                    '=== dataset index: ' + infoForPrint.datasetIndex + pipeIndexStr + ' ===',
                    '- transform result data:',
                    makePrintable(extSource.data),
                    '- transform result dimensions:',
                    makePrintable(extSource.dimensions)
                ].join('\n');
            }).join('\n');
            consoleLog(printStrArr);
        }
    }

    return map(resultList, function (result) {
        let errMsg = '';
        if (!isObject(result)) {
            if (__DEV__) {
                errMsg = 'A transform should not return some empty results.';
            }
            throwError(errMsg);
        }
        let resultData = result.data;
        if (resultData != null) {
            if (!isObject(resultData) && !isArrayLike(resultData)) {
                if (__DEV__) {
                    errMsg = 'Result data should be object or array in data transform.';
                }
                throwError(errMsg);
            }
        }
        else {
            // Inherit from upstream[0]
            resultData = upSourceList[0].data;
        }

        const resultMetaRawOption = inheritSourceMetaRawOption(
            upSourceList[0],
            {
                seriesLayoutBy: SERIES_LAYOUT_BY_COLUMN,
                sourceHeader: 0,
                dimensions: result.dimensions
            }
        );

        return createSource(
            resultData,
            resultMetaRawOption,
            null,
            null
        );
    });
}


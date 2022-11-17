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
    DimensionDefinitionLoose, OptionEncode, OptionEncodeValue,
    EncodeDefaulter,
    OptionSourceData,
    DimensionName,
    DimensionDefinition,
    DataVisualDimensions,
    DimensionIndex,
    VISUAL_DIMENSIONS
} from '../../util/types';
import SeriesDimensionDefine from '../SeriesDimensionDefine';
import {
    createHashMap, defaults, each, extend, HashMap, isObject, isString
} from 'zrender/src/core/util';
import OrdinalMeta from '../OrdinalMeta';
import { createSourceFromSeriesDataOption, isSourceInstance, Source } from '../Source';
import { CtorInt32Array } from '../DataStore';
import { normalizeToArray } from '../../util/model';
import { BE_ORDINAL, guessOrdinal } from './sourceHelper';
import {
    createDimNameMap, ensureSourceDimNameMap, SeriesDataSchema, shouldOmitUnusedDimensions
} from './SeriesDataSchema';


export interface CoordDimensionDefinition extends DimensionDefinition {
    dimsDef?: (DimensionName | { name: DimensionName, defaultTooltip?: boolean })[];
    otherDims?: DataVisualDimensions;
    ordinalMeta?: OrdinalMeta;
    coordDim?: DimensionName;
    coordDimIndex?: DimensionIndex;
}
export type CoordDimensionDefinitionLoose = CoordDimensionDefinition['name'] | CoordDimensionDefinition;

export type PrepareSeriesDataSchemaParams = {
    coordDimensions?: CoordDimensionDefinitionLoose[],
    /**
     * Will use `source.dimensionsDefine` if not given.
     */
    dimensionsDefine?: DimensionDefinitionLoose[],
    /**
     * Will use `source.encodeDefine` if not given.
     */
    encodeDefine?: HashMap<OptionEncodeValue, DimensionName> | OptionEncode,
    dimensionsCount?: number,
    /**
     * Make default encode if user not specified.
     */
    encodeDefaulter?: EncodeDefaulter,
    generateCoord?: string,
    generateCoordCount?: number,

    /**
     * If be able to omit unused dimension
     * Used to improve the performance on high dimension data.
     */
    canOmitUnusedDimensions?: boolean
};

/**
 * For outside usage compat (like echarts-gl are using it).
 */
export function createDimensions(
    source: Source | OptionSourceData,
    opt?: PrepareSeriesDataSchemaParams
): SeriesDimensionDefine[] {
    return prepareSeriesDataSchema(source, opt).dimensions;
}

/**
 * This method builds the relationship between:
 * + "what the coord sys or series requires (see `coordDimensions`)",
 * + "what the user defines (in `encode` and `dimensions`, see `opt.dimensionsDefine` and `opt.encodeDefine`)"
 * + "what the data source provids (see `source`)".
 *
 * Some guess strategy will be adapted if user does not define something.
 * If no 'value' dimension specified, the first no-named dimension will be
 * named as 'value'.
 *
 * @return The results are always sorted by `storeDimIndex` asc.
 */
export default function prepareSeriesDataSchema(
    // TODO: TYPE completeDimensions type
    source: Source | OptionSourceData,
    opt?: PrepareSeriesDataSchemaParams
): SeriesDataSchema {
    if (!isSourceInstance(source)) {
        source = createSourceFromSeriesDataOption(source as OptionSourceData);
    }

    opt = opt || {};

    const sysDims = opt.coordDimensions || [];
    const dimsDef = opt.dimensionsDefine || source.dimensionsDefine || [];
    const coordDimNameMap = createHashMap<true, DimensionName>();
    const resultList: SeriesDimensionDefine[] = [];
    const dimCount = getDimCount(source, sysDims, dimsDef, opt.dimensionsCount);

    // Try to ignore unused dimensions if sharing a high dimension datastore
    // 30 is an experience value.
    const omitUnusedDimensions = opt.canOmitUnusedDimensions && shouldOmitUnusedDimensions(dimCount);

    const isUsingSourceDimensionsDef = dimsDef === source.dimensionsDefine;
    const dataDimNameMap = isUsingSourceDimensionsDef
        ? ensureSourceDimNameMap(source) : createDimNameMap(dimsDef);

    let encodeDef = opt.encodeDefine;
    if (!encodeDef && opt.encodeDefaulter) {
        encodeDef = opt.encodeDefaulter(source, dimCount);
    }
    const encodeDefMap = createHashMap<DimensionIndex[] | false, DimensionName>(encodeDef as any);

    const indicesMap = new CtorInt32Array(dimCount);
    for (let i = 0; i < indicesMap.length; i++) {
        indicesMap[i] = -1;
    }

    function getResultItem(dimIdx: number) {
        const idx = indicesMap[dimIdx];
        if (idx < 0) {
            const dimDefItemRaw = dimsDef[dimIdx];
            const dimDefItem = isObject(dimDefItemRaw) ? dimDefItemRaw : { name: dimDefItemRaw };
            const resultItem = new SeriesDimensionDefine();
            const userDimName = dimDefItem.name;
            if (userDimName != null && dataDimNameMap.get(userDimName) != null) {
                // Only if `series.dimensions` is defined in option
                // displayName, will be set, and dimension will be displayed vertically in
                // tooltip by default.
                resultItem.name = resultItem.displayName = userDimName;
            }
            dimDefItem.type != null && (resultItem.type = dimDefItem.type);
            dimDefItem.displayName != null && (resultItem.displayName = dimDefItem.displayName);
            const newIdx = resultList.length;
            indicesMap[dimIdx] = newIdx;
            resultItem.storeDimIndex = dimIdx;
            resultList.push(resultItem);
            return resultItem;
        }
        return resultList[idx];
    }

    if (!omitUnusedDimensions) {
        for (let i = 0; i < dimCount; i++) {
            getResultItem(i);
        }
    }

    // Set `coordDim` and `coordDimIndex` by `encodeDefMap` and normalize `encodeDefMap`.
    encodeDefMap.each(function (dataDimsRaw, coordDim) {
        const dataDims = normalizeToArray(dataDimsRaw as []).slice();

        // Note: It is allowed that `dataDims.length` is `0`, e.g., options is
        // `{encode: {x: -1, y: 1}}`. Should not filter anything in
        // this case.
        if (dataDims.length === 1 && !isString(dataDims[0]) && dataDims[0] < 0) {
            encodeDefMap.set(coordDim, false);
            return;
        }

        const validDataDims = encodeDefMap.set(coordDim, []) as DimensionIndex[];
        each(dataDims, function (resultDimIdxOrName, idx) {
            // The input resultDimIdx can be dim name or index.
            const resultDimIdx = isString(resultDimIdxOrName)
                ? dataDimNameMap.get(resultDimIdxOrName)
                : resultDimIdxOrName;
            if (resultDimIdx != null && resultDimIdx < dimCount) {
                validDataDims[idx] = resultDimIdx;
                applyDim(getResultItem(resultDimIdx), coordDim, idx);
            }
        });
    });

    // Apply templates and default order from `sysDims`.
    let availDimIdx = 0;
    each(sysDims, function (sysDimItemRaw) {
        let coordDim: DimensionName;
        let sysDimItemDimsDef: CoordDimensionDefinition['dimsDef'];
        let sysDimItemOtherDims: CoordDimensionDefinition['otherDims'];
        let sysDimItem: CoordDimensionDefinition;
        if (isString(sysDimItemRaw)) {
            coordDim = sysDimItemRaw;
            sysDimItem = {} as CoordDimensionDefinition;
        }
        else {
            sysDimItem = sysDimItemRaw;
            coordDim = sysDimItem.name;
            const ordinalMeta = sysDimItem.ordinalMeta;
            sysDimItem.ordinalMeta = null;
            sysDimItem = extend({}, sysDimItem);
            sysDimItem.ordinalMeta = ordinalMeta;
            // `coordDimIndex` should not be set directly.
            sysDimItemDimsDef = sysDimItem.dimsDef;
            sysDimItemOtherDims = sysDimItem.otherDims;
            sysDimItem.name = sysDimItem.coordDim = sysDimItem.coordDimIndex =
                sysDimItem.dimsDef = sysDimItem.otherDims = null;
        }

        let dataDims = encodeDefMap.get(coordDim);

        // negative resultDimIdx means no need to mapping.
        if (dataDims === false) {
            return;
        }

        dataDims = normalizeToArray(dataDims);

        // dimensions provides default dim sequences.
        if (!dataDims.length) {
            for (let i = 0; i < (sysDimItemDimsDef && sysDimItemDimsDef.length || 1); i++) {
                while (availDimIdx < dimCount && getResultItem(availDimIdx).coordDim != null) {
                    availDimIdx++;
                }
                availDimIdx < dimCount && dataDims.push(availDimIdx++);
            }
        }

        // Apply templates.
        each(dataDims, function (resultDimIdx, coordDimIndex) {
            const resultItem = getResultItem(resultDimIdx);
            // Coordinate system has a higher priority on dim type than source.
            if (isUsingSourceDimensionsDef && sysDimItem.type != null) {
                resultItem.type = sysDimItem.type;
            }
            applyDim(defaults(resultItem, sysDimItem), coordDim, coordDimIndex);
            if (resultItem.name == null && sysDimItemDimsDef) {
                let sysDimItemDimsDefItem = sysDimItemDimsDef[coordDimIndex];
                !isObject(sysDimItemDimsDefItem) && (sysDimItemDimsDefItem = {
                    name: sysDimItemDimsDefItem
                });
                resultItem.name = resultItem.displayName = sysDimItemDimsDefItem.name;
                resultItem.defaultTooltip = sysDimItemDimsDefItem.defaultTooltip;
            }
            // FIXME refactor, currently only used in case: {otherDims: {tooltip: false}}
            sysDimItemOtherDims && defaults(resultItem.otherDims, sysDimItemOtherDims);
        });
    });

    function applyDim(resultItem: SeriesDimensionDefine, coordDim: DimensionName, coordDimIndex: DimensionIndex) {
        if (VISUAL_DIMENSIONS.get(coordDim as keyof DataVisualDimensions) != null) {
            resultItem.otherDims[coordDim as keyof DataVisualDimensions] = coordDimIndex;
        }
        else {
            resultItem.coordDim = coordDim;
            resultItem.coordDimIndex = coordDimIndex;
            coordDimNameMap.set(coordDim, true);
        }
    }

    // Make sure the first extra dim is 'value'.
    const generateCoord = opt.generateCoord;
    let generateCoordCount = opt.generateCoordCount;
    const fromZero = generateCoordCount != null;
    generateCoordCount = generateCoord ? (generateCoordCount || 1) : 0;
    const extra = generateCoord || 'value';

    function ifNoNameFillWithCoordName(resultItem: SeriesDimensionDefine): void {
        if (resultItem.name == null) {
            // Duplication will be removed in the next step.
            resultItem.name = resultItem.coordDim;
        }
    }

    // Set dim `name` and other `coordDim` and other props.
    if (!omitUnusedDimensions) {
        for (let resultDimIdx = 0; resultDimIdx < dimCount; resultDimIdx++) {
            const resultItem = getResultItem(resultDimIdx);
            const coordDim = resultItem.coordDim;

            if (coordDim == null) {
                // TODO no need to generate coordDim for isExtraCoord?
                resultItem.coordDim = genCoordDimName(
                    extra, coordDimNameMap, fromZero
                );

                resultItem.coordDimIndex = 0;
                // Series specified generateCoord is using out.
                if (!generateCoord || generateCoordCount <= 0) {
                    resultItem.isExtraCoord = true;
                }
                generateCoordCount--;
            }

            ifNoNameFillWithCoordName(resultItem);

            if (resultItem.type == null
                && (
                    guessOrdinal(source, resultDimIdx) === BE_ORDINAL.Must
                    // Consider the case:
                    // {
                    //    dataset: {source: [
                    //        ['2001', 123],
                    //        ['2002', 456],
                    //        ...
                    //        ['The others', 987],
                    //    ]},
                    //    series: {type: 'pie'}
                    // }
                    // The first column should better be treated as a "ordinal" although it
                    // might not be detected as an "ordinal" by `guessOrdinal`.
                    || (resultItem.isExtraCoord
                        && (resultItem.otherDims.itemName != null
                            || resultItem.otherDims.seriesName != null
                        )
                    )
                )
            ) {
                resultItem.type = 'ordinal';
            }
        }
    }
    else {
        each(resultList, resultItem => {
            // PENDING: guessOrdinal or let user specify type: 'ordinal' manually?
            ifNoNameFillWithCoordName(resultItem);
        });
        // Sort dimensions: there are some rule that use the last dim as label,
        // and for some latter travel process easier.
        resultList.sort((item0, item1) => item0.storeDimIndex - item1.storeDimIndex);
    }

    removeDuplication(resultList);

    return new SeriesDataSchema({
        source,
        dimensions: resultList,
        fullDimensionCount: dimCount,
        dimensionOmitted: omitUnusedDimensions
    });
}

function removeDuplication(result: SeriesDimensionDefine[]) {
    const duplicationMap = createHashMap<number>();
    for (let i = 0; i < result.length; i++) {
        const dim = result[i];
        const dimOriginalName = dim.name;
        let count = duplicationMap.get(dimOriginalName) || 0;
        if (count > 0) {
            // Starts from 0.
            dim.name = dimOriginalName + (count - 1);
        }
        count++;
        duplicationMap.set(dimOriginalName, count);
    }
}

// ??? TODO
// Originally detect dimCount by data[0]. Should we
// optimize it to only by sysDims and dimensions and encode.
// So only necessary dims will be initialized.
// But
// (1) custom series should be considered. where other dims
// may be visited.
// (2) sometimes user need to calculate bubble size or use visualMap
// on other dimensions besides coordSys needed.
// So, dims that is not used by system, should be shared in data store?
function getDimCount(
    source: Source,
    sysDims: CoordDimensionDefinitionLoose[],
    dimsDef: DimensionDefinitionLoose[],
    optDimCount?: number
): number {
    // Note that the result dimCount should not small than columns count
    // of data, otherwise `dataDimNameMap` checking will be incorrect.
    let dimCount = Math.max(
        source.dimensionsDetectedCount || 1,
        sysDims.length,
        dimsDef.length,
        optDimCount || 0
    );
    each(sysDims, function (sysDimItem) {
        let sysDimItemDimsDef;
        if (isObject(sysDimItem) && (sysDimItemDimsDef = sysDimItem.dimsDef)) {
            dimCount = Math.max(dimCount, sysDimItemDimsDef.length);
        }
    });
    return dimCount;
}

function genCoordDimName(
    name: DimensionName,
    map: HashMap<unknown, DimensionName>,
    fromZero: boolean
) {
    if (fromZero || map.hasKey(name)) {
        let i = 0;
        while (map.hasKey(name + i)) {
            i++;
        }
        name += i;
    }
    map.set(name, true);
    return name;
}

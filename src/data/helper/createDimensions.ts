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
import SeriesData from '../SeriesData';
import DataDimensionInfo from '../DataDimensionInfo';
import { createHashMap, defaults, each, extend, HashMap, isObject, isString, map } from 'zrender/src/core/util';
import OrdinalMeta from '../OrdinalMeta';
import { createSourceFromSeriesDataOption, isSourceInstance, Source } from '../Source';
import DataStorage, { CtorInt32Array } from '../DataStorage';
import { makeInner, normalizeToArray } from '../../util/model';
import { BE_ORDINAL, guessOrdinal } from './sourceHelper';

const inner = makeInner<{
    dimNameMap: HashMap<DimensionIndex, DimensionName>
}, Source>();

export interface CoordDimensionDefinition extends DimensionDefinition {
    dimsDef?: (DimensionName | { name: DimensionName, defaultTooltip?: boolean })[];
    otherDims?: DataVisualDimensions;
    ordinalMeta?: OrdinalMeta;
    coordDim?: DimensionName;
    coordDimIndex?: DimensionIndex;
}
export type CoordDimensionDefinitionLoose = CoordDimensionDefinition['name'] | CoordDimensionDefinition;

export type CreateDimensionsParams = {
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
     * If omit unused dimension
     * Used to improve the performance on high dimension data.
     */
    omitUnusedDimensions?: boolean
};

/**
 * This method builds the relationship between:
 * + "what the coord sys or series requires (see `coordDimensions`)",
 * + "what the user defines (in `encode` and `dimensions`, see `opt.dimensionsDefine` and `opt.encodeDefine`)"
 * + "what the data source provids (see `source`)".
 *
 * Some guess strategy will be adapted if user does not define something.
 * If no 'value' dimension specified, the first no-named dimension will be
 * named as 'value'.
 */
export default function createDimensions(
    // TODO: TYPE completeDimensions type
    source: Source | SeriesData | OptionSourceData | DataStorage,
    opt?: CreateDimensionsParams
): DataDimensionInfo[] {
    if (source instanceof DataStorage) {
        source = source.getSource();
    }
    else if (source instanceof SeriesData) {
        source = source.getStorage().getSource();
    }
    else if (!isSourceInstance(source)) {
        source = createSourceFromSeriesDataOption(source as OptionSourceData);
    }

    opt = opt || {};

    const sysDims = opt.coordDimensions || [];
    const dimsDef = opt.dimensionsDefine || source.dimensionsDefine || [];
    const coordDimNameMap = createHashMap<true, DimensionName>();
    const result: DataDimensionInfo[] = [];
    const omitUnusedDimensions = opt.omitUnusedDimensions;
    const isUsingSourceDimensionsDef = dimsDef === source.dimensionsDefine;
    // Try to cache the dimNameMap if the dimensionsDefine is from source.
    const canCacheDimNameMap = (isUsingSourceDimensionsDef && omitUnusedDimensions);
    let dataDimNameMap = canCacheDimNameMap && inner(source).dimNameMap;
    let needsUpdateDataDimNameMap = false;
    if (!dataDimNameMap) {
        needsUpdateDataDimNameMap = true;
        dataDimNameMap = createHashMap<DimensionIndex, DimensionName>();
    }

    const dimCount = getDimCount(source, sysDims, dimsDef, opt.dimensionsCount);

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
            const resultItem = new DataDimensionInfo();
            const userDimName = dimDefItem.name;
            if (dataDimNameMap.get(userDimName) != null) {
                resultItem.name = resultItem.displayName = userDimName;
            }
            dimDefItem.type != null && (resultItem.type = dimDefItem.type);
            dimDefItem.displayName != null && (resultItem.displayName = dimDefItem.displayName);
            const newIdx = result.length;
            indicesMap[dimIdx] = newIdx;
            result.push(resultItem);
            return resultItem;
        }
        return result[idx];
    }

    if (needsUpdateDataDimNameMap) {
        for (let i = 0; i < dimCount; i++) {
            const dimDefItemRaw = dimsDef[i];
            const userDimName = isObject(dimDefItemRaw) ? dimDefItemRaw.name : dimDefItemRaw;
            // Name will be applied later for avoiding duplication.
            if (userDimName != null && dataDimNameMap.get(userDimName) == null) {
                // Only if `series.dimensions` is defined in option
                // displayName, will be set, and dimension will be diplayed vertically in
                // tooltip by default.
                dataDimNameMap.set(userDimName, i);
            }
        }
        if (canCacheDimNameMap) {
            inner(source).dimNameMap = dataDimNameMap;
        }
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

    // Apply templetes and default order from `sysDims`.
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
                !isObject(sysDimItemDimsDefItem) && (sysDimItemDimsDefItem = {name: sysDimItemDimsDefItem});
                resultItem.name = resultItem.displayName = sysDimItemDimsDefItem.name;
                resultItem.defaultTooltip = sysDimItemDimsDefItem.defaultTooltip;
            }
            // FIXME refactor, currently only used in case: {otherDims: {tooltip: false}}
            sysDimItemOtherDims && defaults(resultItem.otherDims, sysDimItemOtherDims);
        });
    });

    function applyDim(resultItem: DataDimensionInfo, coordDim: DimensionName, coordDimIndex: DimensionIndex) {
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
    let coordDimNameAutoIdx = 0;
    let dataDimNameAutoIdx = 0;

    // Set dim `name` and other `coordDim` and other props.
    if (!omitUnusedDimensions) {
        for (let resultDimIdx = 0; resultDimIdx < dimCount; resultDimIdx++) {
            const resultItem = getResultItem(resultDimIdx);
            const coordDim = resultItem.coordDim;

            if (coordDim == null) {
                const res = genName(
                    extra, coordDimNameMap, coordDimNameAutoIdx, fromZero
                );
                coordDimNameAutoIdx = res.autoIdx;
                resultItem.coordDim = res.name;
                resultItem.coordDimIndex = 0;
                // Series specified generateCoord is using out.
                if (!generateCoord || generateCoordCount <= 0) {
                    resultItem.isExtraCoord = true;
                }
                generateCoordCount--;
            }

            if (resultItem.name == null) {
                const res = genName(
                    resultItem.coordDim, dataDimNameMap, dataDimNameAutoIdx, false
                );
                resultItem.name = res.name;
                dataDimNameAutoIdx = res.autoIdx;
            }

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
                    // The first colum should better be treated as a "ordinal" although it
                    // might not able to be detected as an "ordinal" by `guessOrdinal`.
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
        return result;
    }
    else {
        // Sort dimensions
        const toSort = [];
        for (let i = 0; i < indicesMap.length; i++) {
            if (indicesMap[i] >= 0) {
                toSort.push({ i, o: result[indicesMap[i]]});
            }
        }
        toSort.sort((a, b) => a.i - b.i);
        return map(toSort, item => item.o);
    }
}


// ??? TODO
// Originally detect dimCount by data[0]. Should we
// optimize it to only by sysDims and dimensions and encode.
// So only necessary dims will be initialized.
// But
// (1) custom series should be considered. where other dims
// may be visited.
// (2) sometimes user need to calcualte bubble size or use visualMap
// on other dimensions besides coordSys needed.
// So, dims that is not used by system, should be shared in storage?
export function getDimCount(
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

function genName(
    name: DimensionName,
    map: HashMap<unknown, DimensionName>,
    autoIdx: number,
    fromZero: boolean
): { name: DimensionName, autoIdx: number } {
    const mapData = map.data;
    if (fromZero || mapData.hasOwnProperty(name)) {
        let i = autoIdx || 0;
        while (mapData.hasOwnProperty(name + i)) {
            i++;
        }
        name += i;
        autoIdx = i + 1;
    }
    map.set(name, true);
    return { name, autoIdx };
}
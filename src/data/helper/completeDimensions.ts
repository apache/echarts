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
 * @deprecated
 * Use `echarts/data/helper/createDimensions` instead.
 */

import {createHashMap, each, isString, defaults, extend, isObject, clone, HashMap} from 'zrender/src/core/util';
import {normalizeToArray} from '../../util/model';
import {guessOrdinal, BE_ORDINAL} from './sourceHelper';
import { createSourceFromSeriesDataOption, isSourceInstance, Source } from '../Source';
import {
    VISUAL_DIMENSIONS, DimensionDefinitionLoose, OptionSourceData,
    EncodeDefaulter, OptionEncodeValue, OptionEncode, DimensionName, DimensionIndex, DataVisualDimensions
} from '../../util/types';
import DataDimensionInfo from '../DataDimensionInfo';
import List from '../List';
import { CoordDimensionDefinition, CoordDimensionDefinitionLoose } from './createDimensions';

/**
 * @see {module:echarts/test/ut/spec/data/completeDimensions}
 *
 * This method builds the relationship between:
 * + "what the coord sys or series requires (see `sysDims`)",
 * + "what the user defines (in `encode` and `dimensions`, see `opt.dimsDef` and `opt.encodeDef`)"
 * + "what the data source provids (see `source`)".
 *
 * Some guess strategy will be adapted if user does not define something.
 * If no 'value' dimension specified, the first no-named dimension will be
 * named as 'value'.
 *
 * @param {Array.<string>} sysDims Necessary dimensions, like ['x', 'y'], which
 *      provides not only dim template, but also default order.
 *      properties: 'name', 'type', 'displayName'.
 *      `name` of each item provides default coord name.
 *      [{dimsDef: [string|Object, ...]}, ...] dimsDef of sysDim item provides default dim name, and
 *                                    provide dims count that the sysDim required.
 *      [{ordinalMeta}] can be specified.
 * @param {module:echarts/data/Source|Array|Object} source or data (for compatibal with pervious)
 * @param {Object} [opt]
 * @param {Array.<Object|string>} [opt.dimsDef] option.series.dimensions User defined dimensions
 *      For example: ['asdf', {name, type}, ...].
 * @param {Object|HashMap} [opt.encodeDef] option.series.encode {x: 2, y: [3, 1], tooltip: [1, 2], label: 3}
 * @param {Function} [opt.encodeDefaulter] Called if no `opt.encodeDef` exists.
 *      If not specified, auto find the next available data dim.
 *      param source {module:data/Source}
 *      param dimCount {number}
 *      return {Object} encode Never be `null/undefined`.
 * @param {string} [opt.generateCoord] Generate coord dim with the given name.
 *      If not specified, extra dim names will be:
 *      'value', 'value0', 'value1', ...
 * @param {number} [opt.generateCoordCount] By default, the generated dim name is `generateCoord`.
 *      If `generateCoordCount` specified, the generated dim names will be:
 *      `generateCoord` + 0, `generateCoord` + 1, ...
 *      can be Infinity, indicate that use all of the remain columns.
 * @param {number} [opt.dimCount] If not specified, guess by the first data item.
 * @return {Array.<module:data/DataDimensionInfo>}
 */
function completeDimensions(
    sysDims: CoordDimensionDefinitionLoose[],
    source: Source | List | OptionSourceData,
    opt: {
        dimsDef?: DimensionDefinitionLoose[];
        encodeDef?: HashMap<OptionEncodeValue, DimensionName> | OptionEncode;
        dimCount?: number;
        encodeDefaulter?: EncodeDefaulter;
        generateCoord?: string;
        generateCoordCount?: number;
    }
): DataDimensionInfo[] {
    if (!isSourceInstance(source)) {
        source = createSourceFromSeriesDataOption(source as OptionSourceData);
    }

    opt = opt || {};
    sysDims = (sysDims || []).slice();
    const dimsDef = (opt.dimsDef || []).slice();
    const dataDimNameMap = createHashMap<DimensionIndex, DimensionName>();
    const coordDimNameMap = createHashMap<true, DimensionName>();
    // let valueCandidate;
    const result: DataDimensionInfo[] = [];

    const dimCount = getDimCount(source, sysDims, dimsDef, opt.dimCount);

    // Apply user defined dims (`name` and `type`) and init result.
    for (let i = 0; i < dimCount; i++) {
        const dimDefItemRaw = dimsDef[i];
        const dimDefItem = dimsDef[i] = extend(
            {}, isObject(dimDefItemRaw) ? dimDefItemRaw : { name: dimDefItemRaw }
        );
        const userDimName = dimDefItem.name;
        const resultItem = result[i] = new DataDimensionInfo();
        // Name will be applied later for avoiding duplication.
        if (userDimName != null && dataDimNameMap.get(userDimName) == null) {
            // Only if `series.dimensions` is defined in option
            // displayName, will be set, and dimension will be diplayed vertically in
            // tooltip by default.
            resultItem.name = resultItem.displayName = userDimName;
            dataDimNameMap.set(userDimName, i);
        }
        dimDefItem.type != null && (resultItem.type = dimDefItem.type);
        dimDefItem.displayName != null && (resultItem.displayName = dimDefItem.displayName);
    }

    let encodeDef = opt.encodeDef;
    if (!encodeDef && opt.encodeDefaulter) {
        encodeDef = opt.encodeDefaulter(source, dimCount);
    }
    const encodeDefMap = createHashMap<DimensionIndex[] | false, DimensionName>(encodeDef as any);

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
                applyDim(result[resultDimIdx], coordDim, idx);
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
            sysDimItem = clone(sysDimItem);
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
                while (availDimIdx < result.length && result[availDimIdx].coordDim != null) {
                    availDimIdx++;
                }
                availDimIdx < result.length && dataDims.push(availDimIdx++);
            }
        }

        // Apply templates.
        each(dataDims, function (resultDimIdx, coordDimIndex) {
            const resultItem = result[resultDimIdx];
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

    // Set dim `name` and other `coordDim` and other props.
    for (let resultDimIdx = 0; resultDimIdx < dimCount; resultDimIdx++) {
        const resultItem = result[resultDimIdx] = result[resultDimIdx] || new DataDimensionInfo();
        const coordDim = resultItem.coordDim;

        if (coordDim == null) {
            resultItem.coordDim = genName(
                extra, coordDimNameMap, fromZero
            );
            resultItem.coordDimIndex = 0;
            if (!generateCoord || generateCoordCount <= 0) {
                resultItem.isExtraCoord = true;
            }
            generateCoordCount--;
        }

        resultItem.name == null && (resultItem.name = genName(
            resultItem.coordDim, dataDimNameMap, false
        ));

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
function getDimCount(
    source: Source,
    sysDims: CoordDimensionDefinitionLoose[],
    dimsDef: DimensionDefinitionLoose[],
    optDimCount: number
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
    fromZero: boolean
): DimensionName {
    if (fromZero || map.get(name) != null) {
        let i = 0;
        while (map.get(name + i) != null) {
            i++;
        }
        name += i;
    }
    map.set(name, true);
    return name;
}

export default completeDimensions;

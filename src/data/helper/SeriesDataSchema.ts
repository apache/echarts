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

import { createHashMap, HashMap, isObject, retrieve2 } from 'zrender/src/core/util';
import { makeInner } from '../../util/model';
import {
    DimensionDefinition, DimensionDefinitionLoose, DimensionIndex, DimensionName, DimensionType
} from '../../util/types';
import { DataStoreDimensionDefine } from '../DataStore';
import OrdinalMeta from '../OrdinalMeta';
import SeriesDimensionDefine from '../SeriesDimensionDefine';
import { shouldRetrieveDataByName, Source } from '../Source';

const inner = makeInner<{
    dimNameMap: HashMap<DimensionIndex, DimensionName>;
}, Source>();

const dimTypeShort = {
    float: 'f', int: 'i', ordinal: 'o', number: 'n', time: 't'
} as const;

/**
 * Represents the dimension requirement of a series.
 *
 * NOTICE:
 * When there are too many dimensions in dataset and many series, only the used dimensions
 * (i.e., used by coord sys and declared in `series.encode`) are add to `dimensionDefineList`.
 * But users may query data by other unused dimension names.
 * In this case, users can only query data if and only if they have defined dimension names
 * via ec option, so we provide `getDimensionIndexFromSource`, which only query them from
 * `source` dimensions.
 */
export class SeriesDataSchema {

    /**
     * When there are too many dimensions, `dimensionDefineList` might only contain
     * used dimensions.
     *
     * CAUTION:
     * Should have been sorted by `storeDimIndex` asc.
     *
     * PENDING:
     * The item can still be modified outsite.
     * But MUST NOT add/remove item of this array.
     */
    readonly dimensions: SeriesDimensionDefine[];

    readonly source: Source;

    private _fullDimCount: number;
    private _dimNameMap: ReturnType<typeof inner>['dimNameMap'];
    private _dimOmitted: boolean;

    constructor(opt: {
        source: Source,
        dimensions: SeriesDimensionDefine[],
        fullDimensionCount: number,
        dimensionOmitted: boolean
    }) {
        this.dimensions = opt.dimensions;
        this._dimOmitted = opt.dimensionOmitted;
        this.source = opt.source;
        this._fullDimCount = opt.fullDimensionCount;

        this._updateDimOmitted(opt.dimensionOmitted);
    }

    isDimensionOmitted(): boolean {
        return this._dimOmitted;
    }

    private _updateDimOmitted(dimensionOmitted: boolean): void {
        this._dimOmitted = dimensionOmitted;
        if (!dimensionOmitted) {
            return;
        }
        if (!this._dimNameMap) {
            this._dimNameMap = ensureSourceDimNameMap(this.source);
        }
    }

    /**
     * @caution Can only be used when `dimensionOmitted: true`.
     *
     * Get index by user defined dimension name (i.e., not internal generate name).
     * That is, get index from `dimensionsDefine`.
     * If no `dimensionsDefine`, or no name get, return -1.
     */
    getSourceDimensionIndex(dimName: DimensionName): DimensionIndex {
        return retrieve2(this._dimNameMap.get(dimName), -1);
    }

    /**
     * @caution Can only be used when `dimensionOmitted: true`.
     *
     * Notice: may return `null`/`undefined` if user not specify dimension names.
     */
    getSourceDimension(dimIndex: DimensionIndex): DimensionDefinition {
        const dimensionsDefine = this.source.dimensionsDefine;
        if (dimensionsDefine) {
            return dimensionsDefine[dimIndex];
        }
    }

    makeStoreSchema(): {
        dimensions: DataStoreDimensionDefine[];
        hash: string
    } {
        const dimCount = this._fullDimCount;
        const willRetrieveDataByName = shouldRetrieveDataByName(this.source);
        const makeHashStrict = !shouldOmitUnusedDimensions(dimCount);

        // If source don't have dimensions or series don't omit unsed dimensions.
        // Generate from seriesDimList directly
        let dimHash = '';
        const dims: DataStoreDimensionDefine[] = [];

        for (let fullDimIdx = 0, seriesDimIdx = 0; fullDimIdx < dimCount; fullDimIdx++) {
            let property: string;
            let type: DimensionType;
            let ordinalMeta: OrdinalMeta;

            const seriesDimDef = this.dimensions[seriesDimIdx];
            // The list has been sorted by `storeDimIndex` asc.
            if (seriesDimDef && seriesDimDef.storeDimIndex === fullDimIdx) {
                property = willRetrieveDataByName ? seriesDimDef.name : null;
                type = seriesDimDef.type;
                ordinalMeta = seriesDimDef.ordinalMeta;

                seriesDimIdx++;
            }
            else {
                const sourceDimDef = this.getSourceDimension(fullDimIdx);
                if (sourceDimDef) {
                    property = willRetrieveDataByName ? sourceDimDef.name : null;
                    type = sourceDimDef.type;
                }
            }

            dims.push({ property, type, ordinalMeta });

            // If retrieving data by index,
            //   use <index, type, ordinalMeta> to determine whether data can be shared.
            //   (Because in this case there might be no dimension name defined in dataset, but indices always exists).
            //   (Indices are always 0, 1, 2, ..., so we can ignore them to shorten the hash).
            // Otherwise if retrieving data by property name (like `data: [{aa: 123, bb: 765}, ...]`),
            //   use <property, type, ordinalMeta> in hash.
            if (willRetrieveDataByName
                && property != null
                // For data stack, we have make sure each series has its own dim on this store.
                // So we do not add property to hash to make sure they can share this store.
                && (!seriesDimDef || !seriesDimDef.isCalculationCoord)
            ) {
                dimHash += (makeHashStrict
                    // Use escape character '`' in case that property name contains '$'.
                    ? property.replace(/\`/g, '`1').replace(/\$/g, '`2')
                    // For better performance, when there are large dimensions, tolerant this defects that hardly meet.
                    : property
                );
            }
            dimHash += '$';
            dimHash += dimTypeShort[type] || 'f';

            if (ordinalMeta) {
                dimHash += ordinalMeta.uid;
            }

            dimHash += '$';
        }

        // Source from endpoint(usually series) will be read differently
        // when seriesLayoutBy or startIndex(which is affected by sourceHeader) are different.
        // So we use this three props as key.
        const source = this.source;
        const hash = [
            source.seriesLayoutBy,
            source.startIndex,
            dimHash
        ].join('$$');

        return {
            dimensions: dims,
            hash: hash
        };
    }

    makeOutputDimensionNames(): DimensionName[] {
        const result = [] as DimensionName[];

        for (let fullDimIdx = 0, seriesDimIdx = 0; fullDimIdx < this._fullDimCount; fullDimIdx++) {
            let name: DimensionName;
            const seriesDimDef = this.dimensions[seriesDimIdx];
            // The list has been sorted by `storeDimIndex` asc.
            if (seriesDimDef && seriesDimDef.storeDimIndex === fullDimIdx) {
                if (!seriesDimDef.isCalculationCoord) {
                    name = seriesDimDef.name;
                }
                seriesDimIdx++;
            }
            else {
                const sourceDimDef = this.getSourceDimension(fullDimIdx);
                if (sourceDimDef) {
                    name = sourceDimDef.name;
                }
            }
            result.push(name);
        }

        return result;
    }

    appendCalculationDimension(dimDef: SeriesDimensionDefine): void {
        this.dimensions.push(dimDef);
        dimDef.isCalculationCoord = true;
        this._fullDimCount++;
        // If append dimension on a data store, consider the store
        // might be shared by different series, series dimensions not
        // really map to store dimensions.
        this._updateDimOmitted(true);
    }
}

export function isSeriesDataSchema(
    schema: any
): schema is SeriesDataSchema {
    return schema instanceof SeriesDataSchema;
}


export function createDimNameMap(dimsDef: DimensionDefinitionLoose[]): HashMap<DimensionIndex, DimensionName> {
    const dataDimNameMap = createHashMap<DimensionIndex, DimensionName>();
    for (let i = 0; i < (dimsDef || []).length; i++) {
        const dimDefItemRaw = dimsDef[i];
        const userDimName = isObject(dimDefItemRaw) ? dimDefItemRaw.name : dimDefItemRaw;
        if (userDimName != null && dataDimNameMap.get(userDimName) == null) {
            dataDimNameMap.set(userDimName, i);
        }
    }
    return dataDimNameMap;
}

export function ensureSourceDimNameMap(source: Source): HashMap<DimensionIndex, DimensionName> {
    const innerSource = inner(source);
    return innerSource.dimNameMap || (
        innerSource.dimNameMap = createDimNameMap(source.dimensionsDefine)
    );
}

export function shouldOmitUnusedDimensions(dimCount: number): boolean {
    return dimCount > 30;
}

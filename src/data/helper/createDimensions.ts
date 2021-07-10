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
 * Substitute `completeDimensions`.
 * `completeDimensions` is to be deprecated.
 */
import completeDimensions from './completeDimensions';
import {
    DimensionDefinitionLoose, OptionEncode, OptionEncodeValue,
    EncodeDefaulter, OptionSourceData, DimensionName, DimensionDefinition, DataVisualDimensions, DimensionIndex
} from '../../util/types';
import SeriesData from '../SeriesData';
import DataDimensionInfo from '../DataDimensionInfo';
import { HashMap } from 'zrender/src/core/util';
import OrdinalMeta from '../OrdinalMeta';
import { createSourceFromSeriesDataOption, isSourceInstance, Source } from '../Source';
import DataStorage from '../DataStorage';


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
    dimensionsDefine?: DimensionDefinitionLoose[],
    encodeDefine?: HashMap<OptionEncodeValue, DimensionName> | OptionEncode,
    dimensionsCount?: number,
    encodeDefaulter?: EncodeDefaulter,
    generateCoord?: string,
    generateCoordCount?: number
};

/**
 * @param opt.coordDimensions
 * @param opt.dimensionsCount
 * @param opt.dimensionsDefine By default `source.dimensionsDefine` Overwrite source define.
 * @param opt.encodeDefine By default `source.encodeDefine` Overwrite source define.
 * @param opt.encodeDefaulter Make default encode if user not specified.
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
        source = source.getStore().getSource();
    }
    else if (!isSourceInstance(source)) {
        source = createSourceFromSeriesDataOption(source as OptionSourceData);
    }

    opt = opt || {};
    return completeDimensions(opt.coordDimensions || [], source, {
        // FIXME:TS detect whether source then call `.dimensionsDefine` and `.encodeDefine`?
        dimsDef: opt.dimensionsDefine,
        encodeDef: opt.encodeDefine,
        dimCount: opt.dimensionsCount,
        encodeDefaulter: opt.encodeDefaulter,
        generateCoord: opt.generateCoord,
        generateCoordCount: opt.generateCoordCount
    });
}

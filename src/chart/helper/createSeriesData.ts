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

import * as zrUtil from 'zrender/src/core/util';
import SeriesData from '../../data/SeriesData';
import prepareSeriesDataSchema from '../../data/helper/createDimensions';
import {getDimensionTypeByAxis} from '../../data/helper/dimensionHelper';
import {getDataItemValue} from '../../util/model';
import CoordinateSystem from '../../core/CoordinateSystem';
import {getCoordSysInfoBySeries} from '../../model/referHelper';
import { createSourceFromSeriesDataOption, Source } from '../../data/Source';
import {enableDataStack} from '../../data/helper/dataStackHelper';
import {makeSeriesEncodeForAxisCoordSys} from '../../data/helper/sourceHelper';
import {
    SOURCE_FORMAT_ORIGINAL,
    DimensionDefinitionLoose,
    DimensionDefinition,
    OptionSourceData,
    EncodeDefaulter
} from '../../util/types';
import SeriesModel from '../../model/Series';
import DataStore from '../../data/DataStore';
import SeriesDimensionDefine from '../../data/SeriesDimensionDefine';

function getCoordSysDimDefs(
    seriesModel: SeriesModel,
    coordSysInfo: ReturnType<typeof getCoordSysInfoBySeries>
) {
    const coordSysName = seriesModel.get('coordinateSystem');
    const registeredCoordSys = CoordinateSystem.get(coordSysName);

    let coordSysDimDefs: DimensionDefinitionLoose[];

    if (coordSysInfo && coordSysInfo.coordSysDims) {
        coordSysDimDefs = zrUtil.map(coordSysInfo.coordSysDims, function (dim) {
            const dimInfo = {
                name: dim
            } as DimensionDefinition;
            const axisModel = coordSysInfo.axisMap.get(dim);
            if (axisModel) {
                const axisType = axisModel.get('type');
                dimInfo.type = getDimensionTypeByAxis(axisType);
            }
            return dimInfo;
        });
    }

    if (!coordSysDimDefs) {
        // Get dimensions from registered coordinate system
        coordSysDimDefs = (registeredCoordSys && (
            registeredCoordSys.getDimensionsInfo
                ? registeredCoordSys.getDimensionsInfo()
                : registeredCoordSys.dimensions.slice()
        )) || ['x', 'y'];
    }

    return coordSysDimDefs;
}

function injectOrdinalMeta(
    dimInfoList: SeriesDimensionDefine[],
    createInvertedIndices: boolean,
    coordSysInfo: ReturnType<typeof getCoordSysInfoBySeries>
) {
    let firstCategoryDimIndex: number;
    let hasNameEncode: boolean;
    coordSysInfo && zrUtil.each(dimInfoList, function (dimInfo, dimIndex) {
        const coordDim = dimInfo.coordDim;
        const categoryAxisModel = coordSysInfo.categoryAxisMap.get(coordDim);
        if (categoryAxisModel) {
            if (firstCategoryDimIndex == null) {
                firstCategoryDimIndex = dimIndex;
            }
            dimInfo.ordinalMeta = categoryAxisModel.getOrdinalMeta();
            if (createInvertedIndices) {
                dimInfo.createInvertedIndices = true;
            }
        }
        if (dimInfo.otherDims.itemName != null) {
            hasNameEncode = true;
        }
    });
    if (!hasNameEncode && firstCategoryDimIndex != null) {
        dimInfoList[firstCategoryDimIndex].otherDims.itemName = 0;
    }
    return firstCategoryDimIndex;
}

/**
 * Caution: there are side effects to `sourceManager` in this method.
 * Should better only be called in `Series['getInitialData']`.
 */
function createSeriesData(
    sourceRaw: OptionSourceData | null | undefined,
    seriesModel: SeriesModel,
    opt?: {
        generateCoord?: string
        useEncodeDefaulter?: boolean | EncodeDefaulter
        // By default: auto. If `true`, create inverted indices for all ordinal dimension on coordSys.
        createInvertedIndices?: boolean
    }
): SeriesData {
    opt = opt || {};

    const sourceManager = seriesModel.getSourceManager();
    let source;
    let isOriginalSource = false;
    if (sourceRaw) {
        isOriginalSource = true;
        source = createSourceFromSeriesDataOption(sourceRaw);
    }
    else {
        source = sourceManager.getSource();
        // Is series.data. not dataset.
        isOriginalSource = source.sourceFormat === SOURCE_FORMAT_ORIGINAL;
    }
    const coordSysInfo = getCoordSysInfoBySeries(seriesModel);
    const coordSysDimDefs = getCoordSysDimDefs(seriesModel, coordSysInfo);
    const useEncodeDefaulter = opt.useEncodeDefaulter;

    const encodeDefaulter = zrUtil.isFunction(useEncodeDefaulter)
        ? useEncodeDefaulter
        : useEncodeDefaulter
        ? zrUtil.curry(makeSeriesEncodeForAxisCoordSys, coordSysDimDefs, seriesModel)
        : null;
    const createDimensionOptions = {
        coordDimensions: coordSysDimDefs,
        generateCoord: opt.generateCoord,
        encodeDefine: seriesModel.getEncode(),
        encodeDefaulter: encodeDefaulter,
        canOmitUnusedDimensions: !isOriginalSource
    };
    const schema = prepareSeriesDataSchema(source, createDimensionOptions);
    const firstCategoryDimIndex = injectOrdinalMeta(
        schema.dimensions, opt.createInvertedIndices, coordSysInfo
    );

    const store = !isOriginalSource ? sourceManager.getSharedDataStore(schema) : null;

    const stackCalculationInfo = enableDataStack(seriesModel, { schema, store });

    const data = new SeriesData(schema, seriesModel);
    data.setCalculationInfo(stackCalculationInfo);

    const dimValueGetter =
        firstCategoryDimIndex != null
        && isNeedCompleteOrdinalData(source)
            ? function (this: DataStore, itemOpt: any, dimName: string, dataIndex: number, dimIndex: number) {
                // Use dataIndex as ordinal value in categoryAxis
                return dimIndex === firstCategoryDimIndex
                    ? dataIndex
                    : this.defaultDimValueGetter(itemOpt, dimName, dataIndex, dimIndex);
            }
            : null;

    data.hasItemOption = false;
    data.initData(
        // Try to reuse the data store in sourceManager if using dataset.
        isOriginalSource ? source : store,
        null,
        dimValueGetter
    );

    return data;
}

function isNeedCompleteOrdinalData(source: Source) {
    if (source.sourceFormat === SOURCE_FORMAT_ORIGINAL) {
        const sampleItem = firstDataNotNull(source.data as ArrayLike<any> || []);
        return !zrUtil.isArray(getDataItemValue(sampleItem));
    }
}

function firstDataNotNull(arr: ArrayLike<any>) {
    let i = 0;
    while (i < arr.length && arr[i] == null) {
        i++;
    }
    return arr[i];
}

export default createSeriesData;

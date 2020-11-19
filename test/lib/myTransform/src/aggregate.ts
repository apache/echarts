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
    DataTransformOption, ExternalDataTransform, ExternalSource, ExternalDimensionDefinition
} from '../../../../src/data/helper/transform';
import {
    DimensionName, DimensionLoose, OptionDataValue
} from '../../../../src/util/types';
import { hasOwn, assert, map, each } from 'zrender/src/core/util';
import { quantile } from '../../../../src/util/number';


/**
 * @usage
 *
 * ```js
 * dataset: [{
 *     source: [
 *         ['aa', 'bb', 'cc', 'tag'],
 *         [12, 0.33, 5200, 'AA'],
 *         [21, 0.65, 7100, 'AA'],
 *         [51, 0.15, 1100, 'BB'],
 *         [71, 0.75, 9100, 'BB'],
 *         ...
 *     ]
 * }, {
 *     transform: {
 *         type: 'my:aggregate',
 *         config: {
 *             resultDimensions: [
 *                 // by default, use the same name with `from`.
 *                 { from: 'aa', method: 'sum' },
 *                 { from: 'bb', method: 'count' },
 *                 { from: 'cc' }, // method by default: use the first value.
 *                 { from: 'dd', method: 'Q1' },
 *                 { from: 'tag' }
 *             ],
 *             groupBy: 'tag'
 *         }
 *     }
 *     // Then the result data will be:
 *     // [
 *     //     ['aa', 'bb', 'cc', 'tag'],
 *     //     [12, 0.33, 5200, 'AA'],
 *     //     [21, 0.65, 8100, 'BB'],
 *     //     ...
 *     // ]
 * }]
 * ```
 *
 * Current supported methods (case insensitive):
 * 'sum'
 * 'count'
 * 'average'
 * 'Q1'
 * 'Q3'
 * 'Q2' or 'median'
 * 'min'
 * 'max'
 */

export interface AggregateTransformOption extends DataTransformOption {
    type: 'myTransform:aggregate';
    config: {
        // Mandatory
        resultDimensions: {
            // Optional. The name of the result dimensions.
            // If not provided, inherit the name from `from`.
            name: DimensionName;
            // Mandatory. `from` is used to reference dimension from `source`.
            from: DimensionLoose;
            // Optional. Aggregate method. Currently only these method supported.
            // If not provided, use `'first'`.
            method: AggregateMethodLoose;
        }[];
        // Optional
        groupBy: DimensionLoose;
    };
}

const METHOD_INTERNAL = {
    'SUM': true,
    'COUNT': true,
    'FIRST': true,
    'AVERAGE': true,
    'Q1': true,
    'Q2': true,
    'Q3': true,
    'MIN': true,
    'MAX': true
} as const;
const METHOD_NEEDS_COLLECT = {
    AVERAGE: ['COUNT']
} as const;
const METHOD_NEEDS_GATHER_VALUES = {
    Q1: true,
    Q2: true,
    Q3: true
} as const;
const METHOD_ALIAS = {
    MEDIAN: 'Q2'
} as const;

type AggregateMethodLoose =
    AggregateMethodInternal
    | 'sum' | 'count' | 'first' | 'average' | 'Q1' | 'Q2' | 'Q3' | 'median' | 'min' | 'max';
type AggregateMethodInternal = keyof typeof METHOD_INTERNAL;


class ResultDimInfoInternal {

    readonly method: AggregateMethodInternal;
    readonly name: DimensionName;
    readonly index: number;
    readonly indexInUpstream: number;

    readonly collectionInfoList = [] as {
        method: AggregateMethodInternal;
        indexInLine: number;
    }[];

    // FIXME: refactor
    readonly gatheredValuesByGroup: { [groupVal: string]: number[] } = {};
    readonly gatheredValuesNoGroup = [] as number[];
    readonly needGatherValues: boolean = false;

    __collectionResult: TravelResult<CollectionResultLine>;

    private _collectionInfoMap = {} as {
        // number is the index of `list`
        [method in AggregateMethodInternal]: number
    };

    constructor(
        index: number,
        indexInUpstream: number,
        method: AggregateMethodInternal,
        name: DimensionName,
        needGatherValues: boolean
    ) {
        this.method = method;
        this.name = name;
        this.index = index;
        this.indexInUpstream = indexInUpstream;
        this.needGatherValues = needGatherValues;
    }

    addCollectionInfo(item: ResultDimInfoInternal['collectionInfoList'][number]) {
        this._collectionInfoMap[item.method] = this.collectionInfoList.length;
        this.collectionInfoList.push(item);
    }

    getCollectionInfo(method: AggregateMethodInternal) {
        return this.collectionInfoList[this._collectionInfoMap[method]];
    }

    // FIXME: temp implementation. Need refactor.
    gatherValue(groupByDimInfo: ExternalDimensionDefinition, groupVal: OptionDataValue, value: OptionDataValue) {
        // FIXME: convert to number compulsorily temporarily.
        value = +value;
        if (groupByDimInfo) {
            if (groupVal != null) {
                const groupValStr = groupVal + '';
                const values = this.gatheredValuesByGroup[groupValStr]
                    || (this.gatheredValuesByGroup[groupValStr] = []);
                values.push(value);
            }
        }
        else {
            this.gatheredValuesNoGroup.push(value);
        }
    }
}

type CreateInTravel<LINE> = (
    upstream: ExternalSource,
    dataIndex: number,
    dimInfoList: ResultDimInfoInternal[],
    groupByDimInfo?: ExternalDimensionDefinition,
    groupByVal?: OptionDataValue
) => LINE;
type UpdateInTravel<LINE> = (
    upstream: ExternalSource,
    dataIndex: number,
    targetLine: LINE,
    dimInfoList: ResultDimInfoInternal[],
    groupByDimInfo?: ExternalDimensionDefinition,
    groupByVal?: OptionDataValue
) => void;

export const transform: ExternalDataTransform<AggregateTransformOption> = {

    type: 'myTransform:aggregate',

    transform: function (params) {
        const upstream = params.upstream;
        const config = params.config;

        const groupByDimInfo = prepareGroupByDimInfo(config, upstream);
        const { finalResultDimInfoList, collectionDimInfoList } = prepareDimensions(
            config, upstream, groupByDimInfo
        );

        // Collect
        let collectionResult: TravelResult<CollectionResultLine>;
        if (collectionDimInfoList.length) {
            collectionResult = travel(
                groupByDimInfo,
                upstream,
                collectionDimInfoList,
                createCollectionResultLine,
                updateCollectionResultLine
            );
        }

        each(collectionDimInfoList, dimInfo => {
            dimInfo.__collectionResult = collectionResult;
            // FIXME: just for Q1, Q2, Q3: need asc.
            asc(dimInfo.gatheredValuesNoGroup);
            each(dimInfo.gatheredValuesByGroup, values => {
                asc(values);
            });
        });

        // Calculate
        const finalResult = travel(
            groupByDimInfo,
            upstream,
            finalResultDimInfoList,
            createFinalResultLine,
            updateFinalResultLine
        );

        return {
            dimensions: map(finalResultDimInfoList, item => item.name),
            data: finalResult.outList
        };
    }
};

function prepareDimensions(
    config: AggregateTransformOption['config'],
    upstream: ExternalSource,
    groupByDimInfo: ExternalDimensionDefinition
): {
    finalResultDimInfoList: ResultDimInfoInternal[];
    collectionDimInfoList: ResultDimInfoInternal[];
} {
    const resultDimensionsConfig = config.resultDimensions;
    const finalResultDimInfoList: ResultDimInfoInternal[] = [];
    const collectionDimInfoList: ResultDimInfoInternal[] = [];
    let gIndexInLine = 0;

    for (let i = 0; i < resultDimensionsConfig.length; i++) {
        const resultDimInfoConfig = resultDimensionsConfig[i];

        const dimInfoInUpstream = upstream.getDimensionInfo(resultDimInfoConfig.from);
        assert(dimInfoInUpstream, 'Can not find dimension by `from`: ' + resultDimInfoConfig.from);

        const rawMethod = resultDimInfoConfig.method;

        assert(
            groupByDimInfo.index !== dimInfoInUpstream.index || rawMethod == null,
            `Dimension ${dimInfoInUpstream.name} is the "groupBy" dimension, must not have any "method".`
        );

        const method = normalizeMethod(rawMethod);
        assert(method, 'method is required');

        const name = resultDimInfoConfig.name != null ? resultDimInfoConfig.name : dimInfoInUpstream.name;

        const finalResultDimInfo = new ResultDimInfoInternal(
            finalResultDimInfoList.length,
            dimInfoInUpstream.index,
            method,
            name,
            hasOwn(METHOD_NEEDS_GATHER_VALUES, method)
        );
        finalResultDimInfoList.push(finalResultDimInfo);

        // For collection.
        let needCollect = false;
        if (hasOwn(METHOD_NEEDS_COLLECT, method)) {
            needCollect = true;
            const collectionTargetMethods = METHOD_NEEDS_COLLECT[method as keyof typeof METHOD_NEEDS_COLLECT];
            for (let j = 0; j < collectionTargetMethods.length; j++) {
                finalResultDimInfo.addCollectionInfo({
                    method: collectionTargetMethods[j],
                    indexInLine: gIndexInLine++
                });
            }
        }
        if (hasOwn(METHOD_NEEDS_GATHER_VALUES, method)) {
            needCollect = true;
        }
        if (needCollect) {
            collectionDimInfoList.push(finalResultDimInfo);
        }
    }

    return { collectionDimInfoList, finalResultDimInfoList };
}

function prepareGroupByDimInfo(
    config: AggregateTransformOption['config'],
    upstream: ExternalSource
): ExternalDimensionDefinition {
    const groupByConfig = config.groupBy;
    let groupByDimInfo;
    if (groupByConfig != null) {
        groupByDimInfo = upstream.getDimensionInfo(groupByConfig);
        assert(groupByDimInfo, 'Can not find dimension by `groupBy`: ' + groupByConfig);
    }
    return groupByDimInfo;
}

interface TravelResult<LINE> {
    mapByGroup: { [groupVal: string]: LINE };
    outList: LINE[];
}

function travel<LINE>(
    groupByDimInfo: ExternalDimensionDefinition,
    upstream: ExternalSource,
    resultDimInfoList: ResultDimInfoInternal[],
    doCreate: CreateInTravel<LINE>,
    doUpdate: UpdateInTravel<LINE>
): TravelResult<LINE> {
    const outList: TravelResult<LINE>['outList'] = [];
    let mapByGroup: TravelResult<LINE>['mapByGroup'];

    if (groupByDimInfo) {
        mapByGroup = {};

        for (let dataIndex = 0, len = upstream.count(); dataIndex < len; dataIndex++) {
            const groupByVal = upstream.retrieveValue(dataIndex, groupByDimInfo.index);

            // PENDING: when value is null/undefined
            if (groupByVal == null) {
                continue;
            }

            const groupByValStr = groupByVal + '';

            if (!hasOwn(mapByGroup, groupByValStr)) {
                const newLine = doCreate(upstream, dataIndex, resultDimInfoList, groupByDimInfo, groupByVal);
                outList.push(newLine);
                mapByGroup[groupByValStr] = newLine;
            }
            else {
                const targetLine = mapByGroup[groupByValStr];
                doUpdate(upstream, dataIndex, targetLine, resultDimInfoList, groupByDimInfo, groupByVal);
            }
        }
    }
    else {
        const targetLine = doCreate(upstream, 0, resultDimInfoList);
        outList.push(targetLine);
        for (let dataIndex = 1, len = upstream.count(); dataIndex < len; dataIndex++) {
            doUpdate(upstream, dataIndex, targetLine, resultDimInfoList);
        }
    }

    return { mapByGroup, outList };
}

function normalizeMethod(method: AggregateMethodLoose): AggregateMethodInternal {
    if (method == null) {
        return 'FIRST';
    }
    let methodInternal = method.toUpperCase() as AggregateMethodInternal;
    methodInternal = hasOwn(METHOD_ALIAS, methodInternal)
        ? METHOD_ALIAS[methodInternal as keyof typeof METHOD_ALIAS]
        : methodInternal;
    assert(hasOwn(METHOD_INTERNAL, methodInternal), `Illegal method ${method}.`);
    return methodInternal;
}



type CollectionResultLine = number[];

const createCollectionResultLine: CreateInTravel<CollectionResultLine> = (
    upstream, dataIndex, collectionDimInfoList, groupByDimInfo, groupByVal
) => {
    const newLine = [] as number[];
    for (let i = 0; i < collectionDimInfoList.length; i++) {
        const dimInfo = collectionDimInfoList[i];
        const collectionInfoList = dimInfo.collectionInfoList;
        for (let j = 0; j < collectionInfoList.length; j++) {
            const collectionInfo = collectionInfoList[j];
            // FIXME: convert to number compulsorily temporarily.
            newLine[collectionInfo.indexInLine] = +lineCreator[collectionInfo.method](
                upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal
            );
        }
        // FIXME: refactor
        if (dimInfo.needGatherValues) {
            const val = upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
            dimInfo.gatherValue(groupByDimInfo, groupByVal, val);
        }
    }
    return newLine;
};

const updateCollectionResultLine: UpdateInTravel<CollectionResultLine> = (
    upstream, dataIndex, targetLine: number[], collectionDimInfoList, groupByDimInfo, groupByVal
) => {
    for (let i = 0; i < collectionDimInfoList.length; i++) {
        const dimInfo = collectionDimInfoList[i];
        const collectionInfoList = dimInfo.collectionInfoList;
        for (let j = 0; j < collectionInfoList.length; j++) {
            const collectionInfo = collectionInfoList[j];
            const indexInLine = collectionInfo.indexInLine;
            // FIXME: convert to number compulsorily temporarily.
            targetLine[indexInLine] = +lineUpdater[collectionInfo.method](
                targetLine[indexInLine], upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal
            );
        }
        // FIXME: refactor
        if (dimInfo.needGatherValues) {
            const val = upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
            dimInfo.gatherValue(groupByDimInfo, groupByVal, val);
        }
    }
};



type FinalResultLine = OptionDataValue[];

const createFinalResultLine: CreateInTravel<FinalResultLine> = (
    upstream, dataIndex, finalResultDimInfoList, groupByDimInfo, groupByVal
) => {
    const newLine = [];
    for (let i = 0; i < finalResultDimInfoList.length; i++) {
        const dimInfo = finalResultDimInfoList[i];
        const method = dimInfo.method;
        newLine[i] = isGroupByDimension(groupByDimInfo, dimInfo)
            ? groupByVal
            : lineCreator[method](
                upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal
            );
    }
    return newLine;
};

const updateFinalResultLine: UpdateInTravel<FinalResultLine> = (
    upstream, dataIndex, targetLine, finalResultDimInfoList, groupByDimInfo, groupByVal
) => {
    for (let i = 0; i < finalResultDimInfoList.length; i++) {
        const dimInfo = finalResultDimInfoList[i];
        if (isGroupByDimension(groupByDimInfo, dimInfo)) {
            continue;
        }
        const method = dimInfo.method;
        targetLine[i] = lineUpdater[method](
            targetLine[i], upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal
        );
    }
};

function isGroupByDimension(
    groupByDimInfo: ExternalDimensionDefinition,
    targetDimInfo: ResultDimInfoInternal
): boolean {
    return groupByDimInfo && targetDimInfo.indexInUpstream === groupByDimInfo.index;
}

function asc(list: number[]) {
    list.sort((a, b) => {
        return a - b;
    });
}

const lineCreator: {
    [key in AggregateMethodInternal]: (
        upstream: ExternalSource,
        dataIndex: number,
        dimInfo: ResultDimInfoInternal,
        groupByDimInfo: ExternalDimensionDefinition,
        groupByVal: OptionDataValue
    ) => OptionDataValue
} = {
    'SUM'() {
        return 0;
    },
    'COUNT'() {
        return 1;
    },
    'FIRST'(upstream, dataIndex, dimInfo) {
        return upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
    },
    'MIN'(upstream, dataIndex, dimInfo) {
        return upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
    },
    'MAX'(upstream, dataIndex, dimInfo) {
        return upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
    },
    'AVERAGE'(upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
        // FIXME: refactor, bad implementation.
        const collectLine = groupByDimInfo
            ? dimInfo.__collectionResult.mapByGroup[groupByVal + '']
            : dimInfo.__collectionResult.outList[0];
        return (upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream) as number)
            / collectLine[dimInfo.getCollectionInfo('COUNT').indexInLine];
    },
    // FIXME: refactor
    'Q1'(upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
        return lineCreatorForQ(0.25, dimInfo, groupByDimInfo, groupByVal);
    },
    'Q2'(upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
        return lineCreatorForQ(0.5, dimInfo, groupByDimInfo, groupByVal);
    },
    'Q3'(upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
        return lineCreatorForQ(0.75, dimInfo, groupByDimInfo, groupByVal);
    }
};

const lineUpdater: {
    [key in AggregateMethodInternal]: (
        val: OptionDataValue,
        upstream: ExternalSource,
        dataIndex: number,
        dimInfo: ResultDimInfoInternal,
        groupByDimInfo: ExternalDimensionDefinition,
        groupByVal: OptionDataValue
    ) => OptionDataValue
} = {
    'SUM'(val, upstream, dataIndex, dimInfo) {
        // FIXME: handle other types
        return (val as number) + (upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream) as number);
    },
    'COUNT'(val) {
        return (val as number) + 1;
    },
    'FIRST'(val) {
        return val;
    },
    'MIN'(val, upstream, dataIndex, dimInfo) {
        return Math.min(val as number, upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream) as number);
    },
    'MAX'(val, upstream, dataIndex, dimInfo) {
        return Math.max(val as number, upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream) as number);
    },
    'AVERAGE'(val, upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
        // FIXME: refactor, bad implementation.
        const collectLine = groupByDimInfo
            ? dimInfo.__collectionResult.mapByGroup[groupByVal + '']
            : dimInfo.__collectionResult.outList[0];
        return (val as number)
            + (upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream) as number)
            / collectLine[dimInfo.getCollectionInfo('COUNT').indexInLine];
    },
    'Q1'(val, upstream, dataIndex, dimInfo) {
        return val;
    },
    'Q2'(val, upstream, dataIndex, dimInfo) {
        return val;
    },
    'Q3'(val, upstream, dataIndex, dimInfo) {
        return val;
    }
};

function lineCreatorForQ(
    percent: number,
    dimInfo: ResultDimInfoInternal,
    groupByDimInfo: ExternalDimensionDefinition,
    groupByVal: OptionDataValue
) {
    const gatheredValues = groupByDimInfo
        ? dimInfo.gatheredValuesByGroup[groupByVal + '']
        : dimInfo.gatheredValuesNoGroup;
    return quantile(gatheredValues, percent);
}

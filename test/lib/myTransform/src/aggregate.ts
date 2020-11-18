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
    DimensionName, DimensionLoose, DimensionDefinitionLoose, OptionDataValue
} from '../../../../src/util/types';
import { hasOwn, assert } from 'zrender/src/core/util';


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
 *                 { from: 'dd', method: 'Q1', boundIQR: 1 },
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
 *
 * Current supported other arguments:
 * boundIQR:
 *     Data less than min bound is outlier.
 *     default 1.5, means Q1 - 1.5 * (Q3 - Q1).
 *     If 'none'/0 passed, min bound will not be used.
 *
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
    AVERAGE: true,
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

interface ResultDimInfoInternal extends ExternalDimensionDefinition {
    method: AggregateMethodInternal;
}

type CreateInTravel = (
    upstream: ExternalSource,
    dataIndex: number,
    resultDimInfoList: ResultDimInfoInternal[],
    groupByDimInfo?: ExternalDimensionDefinition,
    groupByVal?: OptionDataValue
) => void;
type AggregateInTravel = (
    upstream: ExternalSource,
    dataIndex: number,
    targetLine: unknown,
    resultDimInfoList: ResultDimInfoInternal[],
    groupByDimInfo?: ExternalDimensionDefinition
) => void;

export const transform: ExternalDataTransform<AggregateTransformOption> = {

    type: 'myTransform:aggregate',

    transform: function (params) {
        const upstream = params.upstream;
        const config = params.config;

        const dimWrap = prepareDimensions(config, upstream);
        const resultDimInfoList = dimWrap.resultDimInfoList;
        const resultDimensions = dimWrap.resultDimensions;

        const groupByDimInfo = prepareGroupByDimInfo(config, upstream);

        // Collect
        // const collectResult;
        // const dimInfoListForCollect = makeDimInfoListForCollect(resultDimInfoList);
        // if (dimInfoListForCollect.length) {
        //     collectResult = travel(groupByDimInfo, upstream, resultDimInfoList, doCreate, doAggregate);
        // }

        // Calculate
        const finalResult = travel(
            groupByDimInfo, upstream, resultDimInfoList, createResultLine, aggregateResultLine
        );

        return {
            dimensions: resultDimensions,
            data: finalResult.outList
        };
    }
};

function prepareDimensions(
    config: AggregateTransformOption['config'],
    upstream: ExternalSource
): {
    resultDimInfoList: ResultDimInfoInternal[];
    resultDimensions: DimensionDefinitionLoose[];
} {
    const resultDimensionsConfig = config.resultDimensions;
    const resultDimInfoList: ResultDimInfoInternal[] = [];
    const resultDimensions: DimensionDefinitionLoose[] = [];

    for (let i = 0; i < resultDimensionsConfig.length; i++) {
        const resultDimInfoConfig = resultDimensionsConfig[i];

        const resultDimInfo = upstream.getDimensionInfo(resultDimInfoConfig.from) as ResultDimInfoInternal;
        assert(resultDimInfo, 'Can not find dimension by `from`: ' + resultDimInfoConfig.from);

        resultDimInfo.method = normalizeMethod(resultDimInfoConfig.method);
        assert(resultDimInfo.method, 'method is required');

        resultDimInfoList.push(resultDimInfo);

        if (resultDimInfoConfig.name != null) {
            resultDimInfo.name = resultDimInfoConfig.name;
        }

        resultDimensions.push(resultDimInfo.name);
    }

    return { resultDimensions, resultDimInfoList };
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

function travel(
    groupByDimInfo: ExternalDimensionDefinition,
    upstream: ExternalSource,
    resultDimInfoList: ResultDimInfoInternal[],
    doCreate: CreateInTravel,
    doAggregate: AggregateInTravel
): {
    groupMap: { [groupVal in string]: unknown };
    outList: unknown[];
} {
    const outList: unknown[] = [];
    let groupMap: { [groupVal in string]: unknown };

    if (groupByDimInfo) {
        groupMap = {};

        for (let dataIndex = 0, len = upstream.count(); dataIndex < len; dataIndex++) {
            const groupByVal = upstream.retrieveValue(dataIndex, groupByDimInfo.index);

            // PENDING: when value is null/undefined
            if (groupByVal == null) {
                continue;
            }

            const groupByValStr = groupByVal + '';

            if (!hasOwn(groupMap, groupByValStr)) {
                const newLine = doCreate(upstream, dataIndex, resultDimInfoList, groupByDimInfo, groupByVal);
                outList.push(newLine);
                groupMap[groupByValStr] = newLine;
            }
            else {
                const targetLine = groupMap[groupByValStr];
                doAggregate(upstream, dataIndex, targetLine, resultDimInfoList, groupByDimInfo);
            }
        }
    }
    else {
        const targetLine = doCreate(upstream, 0, resultDimInfoList);
        outList.push(targetLine);
        for (let dataIndex = 0, len = upstream.count(); dataIndex < len; dataIndex++) {
            doAggregate(upstream, dataIndex, targetLine, resultDimInfoList);
        }
    }

    return {
        groupMap: groupMap,
        outList: outList
    };
}

// function makeDimInfoListForCollect(resultDimInfoList) {
//     const dimInfoListForCollect = [];
//     for (const j = 0; j < resultDimInfoList.length; j++) {
//         const resultDimInfo = resultDimInfoList[j];
//         const method = resultDimInfo.method;
//         if (hasOwn(METHOD_NEEDS_COLLECT, method)) {
//             dimInfoListForCollect.push(resultDimInfo);
//         }
//     }
//     return dimInfoListForCollect;
// }

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

const createResultLine: CreateInTravel = (
    upstream, dataIndex, resultDimInfoList, groupByDimInfo, groupByVal
) => {
    const newLine = [];
    for (let j = 0; j < resultDimInfoList.length; j++) {
        const resultDimInfo = resultDimInfoList[j];
        const method = resultDimInfo.method;
        newLine[j] = (groupByDimInfo && resultDimInfo.index === groupByDimInfo.index)
            ? groupByVal
            : (method === 'SUM' || method === 'COUNT')
            ? 0
            // By default, method: 'first'
            : upstream.retrieveValue(dataIndex, resultDimInfo.index);
    }
    return newLine;
};

const aggregateResultLine: AggregateInTravel = (
    upstream, dataIndex, targetLine: number[], resultDimInfoList, groupByDimInfo
) => {
    for (let j = 0; j < resultDimInfoList.length; j++) {
        const resultDimInfo = resultDimInfoList[j];
        const method = resultDimInfo.method;

        if (groupByDimInfo && resultDimInfo.index === groupByDimInfo.index) {
            continue;
        }

        if (method === 'SUM') {
            // FIXME: handle other types
            targetLine[j] += upstream.retrieveValue(dataIndex, resultDimInfo.index) as number;
        }
        else if (method === 'COUNT') {
            targetLine[j] += 1;
        }
        else if (method === 'AVERAGE') {
            // FIXME: handle other types
            targetLine[j] += upstream.retrieveValue(dataIndex, resultDimInfo.index) as number / 1;
        }
    }
};

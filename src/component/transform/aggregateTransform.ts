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

import { validate } from '@babel/types';
import { assert, each, keys, map, retrieve2 } from 'zrender/src/core/util';
import {
    DataTransformOption,
    ExternalDataTransform,
    ExternalDimensionDefinition,
    ExternalSource
} from '../../data/helper/transform';
import { asc, quantile } from '../../util/number';
import { DimensionLoose, DimensionName, OptionDataValue } from '../../util/types';


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
 *         type: 'ecSimpleTransform:aggregate',
 *         config: {
 *             output: [
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
 */

export interface AggregateTransformOption extends DataTransformOption {
    type: 'echarts:aggregate';
    config: {
        // Mandatory
        output: {
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

type AggregateMethodInternal =
    'SUM' | 'COUNT' | 'FIRST' | 'AVERAGE' | 'Q1' | 'Q2' | 'Q3' | 'MEDIAN' | 'MIN' | 'MAX' | 'VALUES';
type AggregateMethodLoose =
    AggregateMethodInternal
    | 'sum' | 'count' | 'first' | 'average' | 'Q1' | 'Q2' | 'Q3' | 'median' | 'min' | 'max';

type AggregateResultValue = OptionDataValue | OptionDataValue[];
type AggregateResultValueByGroup = Record<string, AggregateResultValue>;
class AggregateResult {

    readonly method: AggregateMethodInternal;
    readonly name: DimensionName;
    readonly index: number;
    /**
     * Index in the upstream
     */
    readonly fromIndex: number;

    /**
     * Deps applied before this method
     */
    readonly dep: AggregateResult;

    readonly groupBy: ExternalDimensionDefinition;


    values: AggregateResultValue | AggregateResultValueByGroup;

    constructor(
        index: number,
        indexInUpstream: number,
        method: AggregateMethodInternal,
        name: DimensionName,
        groupBy: ExternalDimensionDefinition,
        dep?: AggregateResult
    ) {
        this.method = method;
        this.name = name;
        this.index = index;
        this.fromIndex = indexInUpstream;
        this.dep = dep;
        this.groupBy = groupBy;

        let valuesByGroup: AggregateResultValueByGroup = {};
        if (groupBy) {
            valuesByGroup = this.values = {};
        }

        this.set = groupBy
            ? (groupByVal, value) => valuesByGroup[groupByVal as string] = value
            : (groupByVal, value) => this.values = value;

        this.get = groupBy
            ? (groupByVal) => valuesByGroup[groupByVal as string]
            : () => this.values as AggregateResultValue;

    }

    set: (groupByVal: OptionDataValue, value: AggregateResultValue) => void;
    get: (groupByVal: OptionDataValue) => AggregateResultValue;

    // getValues(): AggregateResultValue[] {
    //     const values = this._values;
    //     return this.groupBy
    //         ? map(keys(values as AggregateResultValueByGroup), key => (values as AggregateResultValueByGroup)[key])
    //         : [values as AggregateResultValue];
    // }
}

export const aggregateTransform: ExternalDataTransform<AggregateTransformOption> = {

    type: 'echarts:aggregate',

    transform: function (params) {
        const upstream = params.upstream;
        const config = params.config;

        const { aggResults, groupByDim } = prepare(config, upstream);

        // Calculate
        doAggregate(groupByDim, upstream, aggResults);

        // Convert to output row format.
        let data: OptionDataValue[][];

        if (groupByDim && aggResults.length) {
            const groupKeys = keys(aggResults[0].values as any);
            data = map(groupKeys, key => []);

            each(aggResults, (agg, idx0) => {
                each(groupKeys, (key, idx1) => {
                    data[idx1][idx0] = (agg.values as any)[key];
                });
            });
        }
        else {
            data = [map(aggResults, dim => dim.values) as OptionDataValue[]];
        }

        return {
            dimensions: map(aggResults, dim => dim.name),
            // TODO Not provide values to developers?
            data
        };
    }
};

function prepare(
    config: AggregateTransformOption['config'],
    upstream: ExternalSource
): {
    aggResults: AggregateResult[];
    groupByDim: ExternalDimensionDefinition
} {
    const outputConfig = config.output;
    const aggResults: AggregateResult[] = [];

    const groupByConfig = config.groupBy;
    let groupByDim: ExternalDimensionDefinition;
    if (groupByConfig != null) {
        groupByDim = upstream.getDimensionInfo(groupByConfig);
        assert(groupByDim, 'Can not find dimension by `groupBy`: ' + groupByConfig);
    }

    each(outputConfig, resultDimInfoConfig => {

        const dimInfoInUpstream = upstream.getDimensionInfo(resultDimInfoConfig.from);
        if (__DEV__) {
            assert(dimInfoInUpstream, 'Can not find dimension by `from`: ' + resultDimInfoConfig.from);
            assert(
                groupByDim.index !== dimInfoInUpstream.index || resultDimInfoConfig.method == null,
                `Dimension ${dimInfoInUpstream.name} is the "groupBy" dimension, must not have any "method".`
            );
        }

        const methodName = (resultDimInfoConfig.method || '').toUpperCase() as AggregateMethodInternal
            || 'FIRST';
        const method = methods[methodName];
        if (__DEV__) {
            assert(method, `Illegal method ${methodName}.`);
        }

        const name = retrieve2(resultDimInfoConfig.name, dimInfoInUpstream.name);
        const indexInUpStream = dimInfoInUpstream.index;

        const finalResultDimInfo = new AggregateResult(
            aggResults.length,
            indexInUpStream,
            methodName,
            name,
            groupByDim,
            method.dep && new AggregateResult(
                -1, indexInUpStream, method.dep, name, groupByDim
            )
        );
        aggResults.push(finalResultDimInfo);
    });

    return { aggResults, groupByDim };
}

function doAggregate(
    groupByDim: ExternalDimensionDefinition,
    upstream: ExternalSource,
    aggResultDims: AggregateResult[]
) {

    function doCreate(aggResult: AggregateResult, dataIndex: number, groupByVal?: string) {
        const method = methods[aggResult.method];
        const val = upstream.retrieveValue(dataIndex, aggResult.fromIndex);
        aggResult.set(
            groupByVal,
            isGroupByDimension(groupByDim, aggResult)
                ? groupByVal
                : method.init(val, aggResult, groupByVal)
        );
    };
    function doUpdate(aggResult: AggregateResult, dataIndex: number, groupByVal?: string) {
        if (isGroupByDimension(groupByDim, aggResult)) {
            return;
        }
        const method = methods[aggResult.method];
        const val = upstream.retrieveValue(dataIndex, aggResult.fromIndex);
        if (method.add) {
            aggResult.set(
                groupByVal,
                method.add(aggResult.get(groupByVal), val, aggResult, groupByVal)
            );
        }
    };

    for (let i = 0; i < aggResultDims.length; i++) {
        const aggResult = aggResultDims[i];

        // TODO share dep result
        if (aggResult.dep) {
            doAggregate(groupByDim, upstream, [aggResult.dep]);
        }

        if (groupByDim) {
            const groupCreated: Record<string, boolean> = {};

            for (let dataIndex = 0, len = upstream.count(); dataIndex < len; dataIndex++) {
                let groupByVal = upstream.retrieveValue(dataIndex, groupByDim.index) as string;

                // PENDING: when value is null/undefined
                if (groupByVal == null) {
                    continue;
                }
                groupByVal += '';

                if (!groupCreated[groupByVal]) {
                    doCreate(aggResult, dataIndex, groupByVal);
                    groupCreated[groupByVal + ''] = true;
                }
                else {
                    doUpdate(aggResult, dataIndex, groupByVal);
                }
            }
        }
        else {
            doCreate(aggResult, 0);
            for (let dataIndex = 1, len = upstream.count(); dataIndex < len; dataIndex++) {
                doUpdate(aggResult, dataIndex);
            }
        }
    }
}


function isGroupByDimension(
    groupByDim: ExternalDimensionDefinition,
    targetDimInfo: AggregateResult
): boolean {
    return groupByDim && targetDimInfo.fromIndex === groupByDim.index;
}

type MethodInit = (
    curr: OptionDataValue,
    aggResult: AggregateResult,
    groupByVal: OptionDataValue
) => AggregateResultValue;
type MethodAdd = (
    prev: AggregateResultValue,
    curr: OptionDataValue,
    dimInfo: AggregateResult,
    groupByVal: OptionDataValue
) => AggregateResultValue;

type Method = {
    init: MethodInit
    add?: MethodAdd
    dep?: AggregateMethodInternal
};


function quantileMethod(
    percent: number,
    aggResult: AggregateResult,
    groupByVal: OptionDataValue
) {
    return quantile(asc(aggResult.get(groupByVal) as number[]), percent);
}
const Q2Method: Method = {
    init(curr, aggResult, groupByVal) {
        return quantileMethod(0.5, aggResult.dep, groupByVal);
    },
    dep: 'VALUES'
};

function identity(val: any) {
    return val;
}

const methods: {
    [key in AggregateMethodInternal]: Method
} = {
    VALUES: {
        init: (curr) => [curr],
        add(prev, curr) {
            // FIXME: handle other types
            (prev as any).push(curr);
            return prev;
        }
    },
    SUM: {
        init: identity,
        add: (prev, curr) => prev as number + (curr as number)
    },
    COUNT: {
        init: () => 1,
        add: (prev) => (prev as number)++
    },
    FIRST: {
        init: identity,
        add: identity
    },
    MIN: {
        init: identity,
        add: (prev, curr) => Math.min(prev as number, curr as number)
    },
    MAX: {
        init: identity,
        add: (prev, curr) => Math.max(prev as number, curr as number)
    },
    AVERAGE: {
        init: (curr, aggResult, groupByVal) => (curr as number) / (aggResult.dep.get(groupByVal) as number),
        add: (prev, curr, aggResult, groupByVal) =>
            (prev as number) + (curr as number) / (aggResult.dep.get(groupByVal) as number),
        dep: 'COUNT'
    },
    Q1: {
        init: (curr, aggResult, groupByVal) => quantileMethod(0.25, aggResult.dep, groupByVal),
        dep: 'VALUES'
    },
    Q2: Q2Method,
    // Alias
    MEDIAN: Q2Method,
    Q3: {
        init: (curr, aggResult, groupByVal) => quantileMethod(0.75, aggResult.dep, groupByVal),
        dep: 'VALUES'
    }
};
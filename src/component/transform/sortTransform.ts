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

import { DataTransformOption, ExternalDataTransform } from '../../data/helper/transform';
import {
    DimensionLoose, SOURCE_FORMAT_KEYED_COLUMNS, DimensionIndex, OptionDataValue
} from '../../util/types';
import { makePrintable, throwError } from '../../util/log';
import { isArray, each, hasOwn } from 'zrender/src/core/util';
import { normalizeToArray } from '../../util/model';
import {
    RawValueParserType, getRawValueParser, createRelationalComparator
} from '../../data/helper/dataValueHelper';

/**
 * @usage
 *
 * ```js
 * transform: {
 *     type: 'sort',
 *     config: { dimension: 'score', order: 'asc' }
 * }
 * transform: {
 *     type: 'sort',
 *     config: [
 *         { dimension: 1, order: 'asc' },
 *         { dimension: 'age', order: 'desc' }
 *     ]
 * }
 * ```
 */

export interface SortTransformOption extends DataTransformOption {
    type: 'sort';
    config: OrderExpression | OrderExpression[];
}

// PENDING: whether support { dimension: 'score', order: 'asc' } ?
type OrderExpression = {
    dimension: DimensionLoose;
    order: SortOrder;
    parse?: RawValueParserType;
};

type SortOrder = 'asc' | 'desc';
const SortOrderValidMap = { asc: true, desc: true } as const;

let sampleLog = '';
if (__DEV__) {
    sampleLog = [
        'Valid config is like:',
        '{ dimension: "age", order: "asc" }',
        'or [{ dimension: "age", order: "asc"], { dimension: "date", order: "desc" }]'
    ].join(' ');
}


export const sortTransform: ExternalDataTransform<SortTransformOption> = {

    type: 'echarts:sort',

    transform: function transform(params) {
        const source = params.source;
        const config = params.config;
        let errMsg = '';

        // Normalize
        // const orderExprList: OrderExpression[] = isArray(config[0])
        //     ? config as OrderExpression[]
        //     : [config as OrderExpression];
        const orderExprList: OrderExpression[] = normalizeToArray(config);

        if (!orderExprList.length) {
            if (__DEV__) {
                errMsg = 'Empty `config` in sort transform.';
            }
            throwError(errMsg);
        }

        const orderDefList: {
            dimIdx: DimensionIndex;
            orderReturn: -1 | 1;
            parser: ReturnType<typeof getRawValueParser>;
        }[] = [];
        each(orderExprList, function (orderExpr) {
            const dimLoose = orderExpr.dimension;
            const order = orderExpr.order;
            const parserName = orderExpr.parse;

            if (dimLoose == null) {
                if (__DEV__) {
                    errMsg = 'Sort transform config must has "dimension" specified.' + sampleLog;
                }
                throwError(errMsg);
            }

            if (!hasOwn(SortOrderValidMap, order)) {
                if (__DEV__) {
                    errMsg = 'Sort transform config must has "order" specified.' + sampleLog;
                }
                throwError(errMsg);
            }

            const dimInfo = source.getDimensionInfo(dimLoose);
            if (!dimInfo) {
                if (__DEV__) {
                    errMsg = makePrintable(
                        'Can not find dimension info via: "' + dimLoose + '".\n',
                        'Existing dimensions: ', source.getDimensionInfoAll(), '.\n',
                        'Illegal config:', orderExpr, '.\n'
                    );
                }
                throwError(errMsg);
            }

            const parser = parserName ? getRawValueParser(parserName) : null;
            if (parserName && !parser) {
                if (__DEV__) {
                    errMsg = makePrintable(
                        'Invalid parser name ' + parserName + '.\n',
                        'Illegal config:', orderExpr, '.\n'
                    );
                }
                throwError(errMsg);
            }

            orderDefList.push({
                dimIdx: dimInfo.index,
                orderReturn: order === 'asc' ? -1 : 1,
                parser: parser
            });
        });

        // TODO: support it?
        if (!isArray(source.data)) {
            if (__DEV__) {
                errMsg = source.sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS
                    ? 'sourceFormat ' + SOURCE_FORMAT_KEYED_COLUMNS + ' is not supported yet'
                    : source.data == null
                    ? 'Upstream source data is null/undefined'
                    : 'Unsupported source format.';
            }
            throwError(errMsg);
        }

        // Other source format are all array.
        const sourceHeaderCount = source.sourceHeaderCount;
        const resultData = [];
        const headerPlaceholder = {};
        for (let i = 0; i < sourceHeaderCount; i++) {
            resultData.push(headerPlaceholder);
        }
        for (let i = 0, len = source.count(); i < len; i++) {
            resultData.push(source.getRawDataItem(i));
        }

        const lt = createRelationalComparator('lt');
        const gt = createRelationalComparator('gt');

        resultData.sort(function (item0, item1) {
            if (item0 === headerPlaceholder) {
                return -1;
            }
            if (item1 === headerPlaceholder) {
                return 1;
            }
            // FIXME: check other empty?
            // Always put empty item last?
            if (item0 == null) {
                return 1;
            }
            if (item1 == null) {
                return -1;
            }
            // TODO Optimize a little: manually loop unrolling?
            for (let i = 0; i < orderDefList.length; i++) {
                const orderDef = orderDefList[i];
                let val0 = source.retrieveItemValue(item0, orderDef.dimIdx);
                let val1 = source.retrieveItemValue(item1, orderDef.dimIdx);
                if (orderDef.parser) {
                    val0 = orderDef.parser(val0) as OptionDataValue;
                    val1 = orderDef.parser(val1) as OptionDataValue;
                }
                if (lt.evaluate(val0, val1)) {
                    return orderDef.orderReturn;
                }
                else if (gt.evaluate(val0, val1)) {
                    return -orderDef.orderReturn;
                }
            }
            return 0;
        });

        for (let i = 0; i < sourceHeaderCount; i++) {
            resultData[i] = source.getRawHeaderItem(i);
        }

        return {
            data: resultData
        };
    }
};


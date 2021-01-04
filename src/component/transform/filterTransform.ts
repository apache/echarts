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
    DataTransformOption, ExternalDataTransform, DataTransformDataItem, ExternalDataTransformResultItem
} from '../../data/helper/transform';
import { DimensionIndex } from '../../util/types';
import { parseConditionalExpression, ConditionalExpressionOption } from '../../util/conditionalExpression';
import { hasOwn, createHashMap } from 'zrender/src/core/util';
import { makePrintable, throwError } from '../../util/log';


export interface FilterTransformOption extends DataTransformOption {
    type: 'filter';
    config: ConditionalExpressionOption;
}

export const filterTransform: ExternalDataTransform<FilterTransformOption> = {

    type: 'echarts:filter',

    // PEDING: enhance to filter by index rather than create new data
    transform: function (params) {
        // [Caveat] Fail-Fast:
        // Do not return the whole dataset unless user config indicate it explicitly.
        // For example, if no condition specified by mistake, return an empty result
        // is better than return the entire raw soruce for user to find the mistake.

        const upstream = params.upstream;
        let rawItem: DataTransformDataItem;

        const condition = parseConditionalExpression<{ dimIdx: DimensionIndex }>(params.config, {

            valueGetterAttrMap: createHashMap<boolean, string>({ dimension: true }),

            prepareGetValue: function (exprOption) {
                let errMsg = '';
                const dimLoose = exprOption.dimension;
                if (!hasOwn(exprOption, 'dimension')) {
                    if (__DEV__) {
                        errMsg = makePrintable(
                            'Relation condition must has prop "dimension" specified.',
                            'Illegal condition:', exprOption
                        );
                    }
                    throwError(errMsg);
                }

                const dimInfo = upstream.getDimensionInfo(dimLoose);
                if (!dimInfo) {
                    if (__DEV__) {
                        errMsg = makePrintable(
                            'Can not find dimension info via: ' + dimLoose + '.\n',
                            'Existing dimensions: ', upstream.cloneAllDimensionInfo(), '.\n',
                            'Illegal condition:', exprOption, '.\n'
                        );
                    }
                    throwError(errMsg);
                }

                return { dimIdx: dimInfo.index };
            },

            getValue: function (param) {
                return upstream.retrieveValueFromItem(rawItem, param.dimIdx);
            }
        });

        const resultData = [];
        for (let i = 0, len = upstream.count(); i < len; i++) {
            rawItem = upstream.getRawDataItem(i);
            if (condition.evaluate()) {
                resultData.push(rawItem as any);
            }
        }

        return {
            data: resultData as ExternalDataTransformResultItem['data']
        };
    }
};

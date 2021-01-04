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
import prepareBoxplotData, { PrepareBoxplotDataOpt } from './prepareBoxplotData';
import { throwError, makePrintable } from '../../util/log';
import { SOURCE_FORMAT_ARRAY_ROWS } from '../../util/types';


export interface BoxplotTransformOption extends DataTransformOption {
    type: 'boxplot';
    config: PrepareBoxplotDataOpt;
}

export const boxplotTransform: ExternalDataTransform<BoxplotTransformOption> = {

    type: 'echarts:boxplot',

    transform: function transform(params) {
        const upstream = params.upstream;

        if (upstream.sourceFormat !== SOURCE_FORMAT_ARRAY_ROWS) {
            let errMsg = '';
            if (__DEV__) {
                errMsg = makePrintable(
                    'source data is not applicable for this boxplot transform. Expect number[][].'
                );
            }
            throwError(errMsg);
        }

        const result = prepareBoxplotData(
            upstream.getRawData() as number[][],
            params.config
        );

        return [{
            dimensions: ['ItemName', 'Low', 'Q1', 'Q2', 'Q3', 'High'],
            data: result.boxData
        }, {
            data: result.outliers
        }];
    }
};


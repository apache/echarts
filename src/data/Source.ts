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

import {createHashMap, isTypedArray, HashMap} from 'zrender/src/core/util';
import {
    SourceFormat, SeriesLayoutBy, DimensionDefinition,
    OptionEncodeValue, OptionSourceData, OptionEncode,
    SOURCE_FORMAT_ORIGINAL,
    SERIES_LAYOUT_BY_COLUMN,
    SOURCE_FORMAT_UNKNOWN,
    SOURCE_FORMAT_KEYED_COLUMNS,
    SOURCE_FORMAT_TYPED_ARRAY
} from '../util/types';

/**
 * [sourceFormat]
 *
 * + "original":
 * This format is only used in series.data, where
 * itemStyle can be specified in data item.
 *
 * + "arrayRows":
 * [
 *     ['product', 'score', 'amount'],
 *     ['Matcha Latte', 89.3, 95.8],
 *     ['Milk Tea', 92.1, 89.4],
 *     ['Cheese Cocoa', 94.4, 91.2],
 *     ['Walnut Brownie', 85.4, 76.9]
 * ]
 *
 * + "objectRows":
 * [
 *     {product: 'Matcha Latte', score: 89.3, amount: 95.8},
 *     {product: 'Milk Tea', score: 92.1, amount: 89.4},
 *     {product: 'Cheese Cocoa', score: 94.4, amount: 91.2},
 *     {product: 'Walnut Brownie', score: 85.4, amount: 76.9}
 * ]
 *
 * + "keyedColumns":
 * {
 *     'product': ['Matcha Latte', 'Milk Tea', 'Cheese Cocoa', 'Walnut Brownie'],
 *     'count': [823, 235, 1042, 988],
 *     'score': [95.8, 81.4, 91.2, 76.9]
 * }
 *
 * + "typedArray"
 *
 * + "unknown"
 */

class Source {

    readonly fromDataset: boolean;

    /**
     * Not null/undefined.
     * @type {Array|Object}
     */
    readonly data: OptionSourceData;

    /**
     * See also "detectSourceFormat".
     * Not null/undefined.
     */
    readonly sourceFormat: SourceFormat;

    /**
     * 'row' or 'column'
     * Not null/undefined.
     */
    readonly seriesLayoutBy: SeriesLayoutBy;

    /**
     * dimensions definition in option.
     * can be null/undefined.
     */
    readonly dimensionsDefine: DimensionDefinition[];

    /**
     * encode definition in option.
     * can be null/undefined.
     */
    readonly encodeDefine: HashMap<OptionEncodeValue>;

    /**
     * Not null/undefined, uint.
     */
    readonly startIndex: number;

    /**
     * Can be null/undefined (when unknown), uint.
     */
    readonly dimensionsDetectCount: number;


    constructor(fields: {
        fromDataset: boolean,
        data?: OptionSourceData,
        sourceFormat?: SourceFormat, // default: SOURCE_FORMAT_UNKNOWN
        seriesLayoutBy?: SeriesLayoutBy, // default: 'column'
        dimensionsDefine?: DimensionDefinition[],
        encodeDefine?: OptionEncode,
        startIndex?: number, // default: 0
        dimensionsDetectCount?: number
    }) {

        this.fromDataset = fields.fromDataset;
        this.data = fields.data || (
            fields.sourceFormat === SOURCE_FORMAT_KEYED_COLUMNS ? {} : []
        );
        this.sourceFormat = fields.sourceFormat || SOURCE_FORMAT_UNKNOWN;
        this.seriesLayoutBy = fields.seriesLayoutBy || SERIES_LAYOUT_BY_COLUMN;
        this.dimensionsDefine = fields.dimensionsDefine;
        this.encodeDefine = fields.encodeDefine && createHashMap(fields.encodeDefine);
        this.startIndex = fields.startIndex || 0;
        this.dimensionsDetectCount = fields.dimensionsDetectCount;
    }

    /**
     * Wrap original series data for some compatibility cases.
     */
    static seriesDataToSource(data: OptionSourceData): Source {
        return new Source({
            data: data,
            sourceFormat: isTypedArray(data)
                ? SOURCE_FORMAT_TYPED_ARRAY
                : SOURCE_FORMAT_ORIGINAL,
            fromDataset: false
        });
    };
}

export default Source;
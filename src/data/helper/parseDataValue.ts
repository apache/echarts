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

import { ParsedValue, DimensionType } from '../../util/types';
import OrdinalMeta from '../OrdinalMeta';
import { parseDate } from '../../util/number';


/**
 * Convert raw the value in to inner value in List.
 *
 * [Performance sensitive]
 *
 * [Caution]: this is the key logic of user value parser.
 * For backward compatibiliy, do not modify it until have to !
 */
export function parseDataValue(
    value: any,
    // For high performance, do not omit the second param.
    opt: {
        // Default type: 'number'. There is no 'unknown' type. That is, a string
        // will be parsed to NaN if do not set `type` as 'ordinal'. It has been
        // the logic in `List.ts` for long time. Follow the same way if you need
        // to get same result as List did from a raw value.
        type?: DimensionType,
        ordinalMeta?: OrdinalMeta
    }
): ParsedValue {
    // Performance sensitive.
    const dimType = opt && opt.type;
    if (dimType === 'ordinal') {
        // If given value is a category string
        const ordinalMeta = opt && opt.ordinalMeta;
        return ordinalMeta
            ? ordinalMeta.parseAndCollect(value)
            : value;
    }

    if (dimType === 'time'
        // spead up when using timestamp
        && typeof value !== 'number'
        && value != null
        && value !== '-'
    ) {
        value = +parseDate(value);
    }

    // dimType defaults 'number'.
    // If dimType is not ordinal and value is null or undefined or NaN or '-',
    // parse to NaN.
    return (value == null || value === '')
        ? NaN
        // If string (like '-'), using '+' parse to NaN
        // If object, also parse to NaN
        : +value;
};


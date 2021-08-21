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

import prepareSeriesDataSchema, {PrepareSeriesDataSchemaParams} from '../../data/helper/createDimensions';
import SeriesData from '../../data/SeriesData';
import {extend, isArray} from 'zrender/src/core/util';
import SeriesModel from '../../model/Series';

/**
 * [Usage]:
 * (1)
 * createListSimply(seriesModel, ['value']);
 * (2)
 * createListSimply(seriesModel, {
 *     coordDimensions: ['value'],
 *     dimensionsCount: 5
 * });
 */
export default function createSeriesDataSimply(
    seriesModel: SeriesModel,
    opt: PrepareSeriesDataSchemaParams | PrepareSeriesDataSchemaParams['coordDimensions'],
    nameList?: string[]
): SeriesData {
    opt = isArray(opt) && {
        coordDimensions: opt
    } || extend({
        encodeDefine: seriesModel.getEncode()
    }, opt);

    const source = seriesModel.getSource();

    const { dimensions } = prepareSeriesDataSchema(source, opt as PrepareSeriesDataSchemaParams);

    const list = new SeriesData(dimensions, seriesModel);
    list.initData(source, nameList);

    return list;
}

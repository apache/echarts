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

import createDimensions, {CreateDimensionsParams} from '../../data/helper/createDimensions';
import List from '../../data/List';
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
export default function createListSimply(
    seriesModel: SeriesModel,
    opt: CreateDimensionsParams | CreateDimensionsParams['coordDimensions'],
    nameList?: string[]
): List {
    opt = isArray(opt) && {coordDimensions: opt} || extend({}, opt);

    const source = seriesModel.getSource();

    const dimensionsInfo = createDimensions(source, opt as CreateDimensionsParams);

    const list = new List(dimensionsInfo, seriesModel);
    list.initData(source, nameList);

    return list;
}

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


import createDimensions from '../../data/helper/createDimensions';
import List from '../../data/List';
import {extend, isArray} from 'zrender/src/core/util';

/**
 * [Usage]:
 * (1)
 * createListSimply(seriesModel, ['value']);
 * (2)
 * createListSimply(seriesModel, {
 *     coordDimensions: ['value'],
 *     dimensionsCount: 5
 * });
 *
 * @param {module:echarts/model/Series} seriesModel
 * @param {Object|Array.<string|Object>} opt opt or coordDimensions
 *        The options in opt, see `echarts/data/helper/createDimensions`
 * @param {Array.<string>} [nameList]
 * @return {module:echarts/data/List}
 */
export default function (seriesModel, opt, nameList) {
    opt = isArray(opt) && {coordDimensions: opt} || extend({}, opt);

    var source = seriesModel.getSource();

    var dimensionsInfo = createDimensions(source, opt);

    var list = new List(dimensionsInfo, seriesModel);
    list.initData(source, nameList);

    return list;
}

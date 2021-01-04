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

import {each} from 'zrender/src/core/util';
import {simpleLayout, simpleLayoutEdge} from './simpleLayoutHelper';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import GraphSeriesModel from './GraphSeries';

export default function graphSimpleLayout(ecModel: GlobalModel, api: ExtensionAPI) {
    ecModel.eachSeriesByType('graph', function (seriesModel: GraphSeriesModel) {
        const layout = seriesModel.get('layout');
        const coordSys = seriesModel.coordinateSystem;
        if (coordSys && coordSys.type !== 'view') {
            const data = seriesModel.getData();

            let dimensions: string[] = [];
            each(coordSys.dimensions, function (coordDim) {
                dimensions = dimensions.concat(data.mapDimensionsAll(coordDim));
            });

            for (let dataIndex = 0; dataIndex < data.count(); dataIndex++) {
                const value = [];
                let hasValue = false;
                for (let i = 0; i < dimensions.length; i++) {
                    const val = data.get(dimensions[i], dataIndex) as number;
                    if (!isNaN(val)) {
                        hasValue = true;
                    }
                    value.push(val);
                }
                if (hasValue) {
                    data.setItemLayout(dataIndex, coordSys.dataToPoint(value));
                }
                else {
                    // Also {Array.<number>}, not undefined to avoid if...else... statement
                    data.setItemLayout(dataIndex, [NaN, NaN]);
                }
            }

            simpleLayoutEdge(data.graph, seriesModel);
        }
        else if (!layout || layout === 'none') {
            simpleLayout(seriesModel);
        }
    });
}
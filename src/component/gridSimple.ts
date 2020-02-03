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

import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../util/graphic';

import '../coord/cartesian/Grid';
import './axis';

// Grid view
echarts.extendComponentView({

    type: 'grid',

    render: function (gridModel, ecModel) {
        this.group.removeAll();
        if (gridModel.get('show')) {
            this.group.add(new graphic.Rect({
                shape: gridModel.coordinateSystem.getRect(),
                style: zrUtil.defaults({
                    fill: gridModel.get('backgroundColor')
                }, gridModel.getItemStyle()),
                silent: true,
                z2: -1
            }));
        }
    }

});

echarts.registerPreprocessor(function (option) {
    // Only create grid when need
    if (option.xAxis && option.yAxis && !option.grid) {
        option.grid = {};
    }
});
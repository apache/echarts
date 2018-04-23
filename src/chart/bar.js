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
import {layout, largeLayout} from '../layout/barGrid';

import '../coord/cartesian/Grid';
import './bar/BarSeries';
import './bar/BarView';
// In case developer forget to include grid component
import '../component/gridSimple';


echarts.registerLayout(zrUtil.curry(layout, 'bar'));
// Should after normal bar layout, otherwise it is blocked by normal bar layout.
echarts.registerLayout(largeLayout);

echarts.registerVisual({
    seriesType: 'bar',
    reset: function (seriesModel) {
        // Visual coding for legend
        seriesModel.getData().setVisual('legendSymbol', 'roundRect');
    }
});

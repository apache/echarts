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

// Grid 是在有直角坐标系的时候必须要存在的
// 所以这里也要被 Cartesian2D 依赖

import './AxisModel';
import ComponentModel from '../../model/Component';

export default ComponentModel.extend({

    type: 'grid',

    dependencies: ['xAxis', 'yAxis'],

    layoutMode: 'box',

    /**
     * @type {module:echarts/coord/cartesian/Grid}
     */
    coordinateSystem: null,

    defaultOption: {
        show: false,
        zlevel: 0,
        z: 0,
        left: '10%',
        top: 60,
        right: '10%',
        bottom: 60,
        // If grid size contain label
        containLabel: false,
        // width: {totalWidth} - left - right,
        // height: {totalHeight} - top - bottom,
        backgroundColor: 'rgba(0,0,0,0)',
        borderWidth: 1,
        borderColor: '#ccc'
    }
});
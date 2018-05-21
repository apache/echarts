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

import * as echarts from '../../echarts';
import './AxisModel';

export default echarts.extendComponentModel({

    type: 'polar',

    dependencies: ['polarAxis', 'angleAxis'],

    /**
     * @type {module:echarts/coord/polar/Polar}
     */
    coordinateSystem: null,

    /**
     * @param {string} axisType
     * @return {module:echarts/coord/polar/AxisModel}
     */
    findAxisModel: function (axisType) {
        var foundAxisModel;
        var ecModel = this.ecModel;

        ecModel.eachComponent(axisType, function (axisModel) {
            if (axisModel.getCoordSysModel() === this) {
                foundAxisModel = axisModel;
            }
        }, this);
        return foundAxisModel;
    },

    defaultOption: {

        zlevel: 0,

        z: 0,

        center: ['50%', '50%'],

        radius: '80%'
    }
});
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

import * as zrUtil from 'zrender/src/core/util';
import Axis from '../Axis';

/**
 * @constructor module:echarts/coord/parallel/ParallelAxis
 * @extends {module:echarts/coord/Axis}
 * @param {string} dim
 * @param {*} scale
 * @param {Array.<number>} coordExtent
 * @param {string} axisType
 */
var ParallelAxis = function (dim, scale, coordExtent, axisType, axisIndex) {

    Axis.call(this, dim, scale, coordExtent);

    /**
     * Axis type
     *  - 'category'
     *  - 'value'
     *  - 'time'
     *  - 'log'
     * @type {string}
     */
    this.type = axisType || 'value';

    /**
     * @type {number}
     * @readOnly
     */
    this.axisIndex = axisIndex;
};

ParallelAxis.prototype = {

    constructor: ParallelAxis,

    /**
     * Axis model
     * @param {module:echarts/coord/parallel/AxisModel}
     */
    model: null,

    /**
     * @override
     */
    isHorizontal: function () {
        return this.coordinateSystem.getModel().get('layout') !== 'horizontal';
    }

};

zrUtil.inherits(ParallelAxis, Axis);

export default ParallelAxis;
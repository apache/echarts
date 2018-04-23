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
 * @constructor  module:echarts/coord/single/SingleAxis
 * @extends {module:echarts/coord/Axis}
 * @param {string} dim
 * @param {*} scale
 * @param {Array.<number>} coordExtent
 * @param {string} axisType
 * @param {string} position
 */
var SingleAxis = function (dim, scale, coordExtent, axisType, position) {

    Axis.call(this, dim, scale, coordExtent);

    /**
     * Axis type
     * - 'category'
     * - 'value'
     * - 'time'
     * - 'log'
     * @type {string}
     */
    this.type = axisType || 'value';

    /**
     * Axis position
     *  - 'top'
     *  - 'bottom'
     *  - 'left'
     *  - 'right'
     *  @type {string}
     */
    this.position = position || 'bottom';

    /**
     * Axis orient
     *  - 'horizontal'
     *  - 'vertical'
     * @type {[type]}
     */
    this.orient = null;

};

SingleAxis.prototype = {

    constructor: SingleAxis,

    /**
     * Axis model
     * @type {module:echarts/coord/single/AxisModel}
     */
    model: null,

    /**
     * Judge the orient of the axis.
     * @return {boolean}
     */
    isHorizontal: function () {
        var position = this.position;
        return position === 'top' || position === 'bottom';

    },

    /**
     * @override
     */
    pointToData: function (point, clamp) {
        return this.coordinateSystem.pointToData(point, clamp)[0];
    },

    /**
     * Convert the local coord(processed by dataToCoord())
     * to global coord(concrete pixel coord).
     * designated by module:echarts/coord/single/Single.
     * @type {Function}
     */
    toGlobalCoord: null,

    /**
     * Convert the global coord to local coord.
     * designated by module:echarts/coord/single/Single.
     * @type {Function}
     */
    toLocalCoord: null

};

zrUtil.inherits(SingleAxis, Axis);

export default SingleAxis;
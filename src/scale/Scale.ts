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

/**
 * // Scale class management
 * @module echarts/scale/Scale
 */

import * as clazzUtil from '../util/clazz';

/**
 * @param {Object} [setting]
 */
function Scale(setting) {
    this._setting = setting || {};

    /**
     * Extent
     * @type {Array.<number>}
     * @protected
     */
    this._extent = [Infinity, -Infinity];

    /**
     * Step is calculated in adjustExtent
     * @type {Array.<number>}
     * @protected
     */
    this._interval = 0;

    this.init && this.init.apply(this, arguments);
}

/**
 * Parse input val to valid inner number.
 * @param {*} val
 * @return {number}
 */
Scale.prototype.parse = function (val) {
    // Notice: This would be a trap here, If the implementation
    // of this method depends on extent, and this method is used
    // before extent set (like in dataZoom), it would be wrong.
    // Nevertheless, parse does not depend on extent generally.
    return val;
};

Scale.prototype.getSetting = function (name) {
    return this._setting[name];
};

Scale.prototype.contain = function (val) {
    var extent = this._extent;
    return val >= extent[0] && val <= extent[1];
};

/**
 * Normalize value to linear [0, 1], return 0.5 if extent span is 0
 * @param {number} val
 * @return {number}
 */
Scale.prototype.normalize = function (val) {
    var extent = this._extent;
    if (extent[1] === extent[0]) {
        return 0.5;
    }
    return (val - extent[0]) / (extent[1] - extent[0]);
};

/**
 * Scale normalized value
 * @param {number} val
 * @return {number}
 */
Scale.prototype.scale = function (val) {
    var extent = this._extent;
    return val * (extent[1] - extent[0]) + extent[0];
};

/**
 * Set extent from data
 * @param {Array.<number>} other
 */
Scale.prototype.unionExtent = function (other) {
    var extent = this._extent;
    other[0] < extent[0] && (extent[0] = other[0]);
    other[1] > extent[1] && (extent[1] = other[1]);
    // not setExtent because in log axis it may transformed to power
    // this.setExtent(extent[0], extent[1]);
};

/**
 * Set extent from data
 * @param {module:echarts/data/List} data
 * @param {string} dim
 */
Scale.prototype.unionExtentFromData = function (data, dim) {
    this.unionExtent(data.getApproximateExtent(dim));
};

/**
 * Get extent
 * @return {Array.<number>}
 */
Scale.prototype.getExtent = function () {
    return this._extent.slice();
};

/**
 * Set extent
 * @param {number} start
 * @param {number} end
 */
Scale.prototype.setExtent = function (start, end) {
    var thisExtent = this._extent;
    if (!isNaN(start)) {
        thisExtent[0] = start;
    }
    if (!isNaN(end)) {
        thisExtent[1] = end;
    }
};

/**
 * When axis extent depends on data and no data exists,
 * axis ticks should not be drawn, which is named 'blank'.
 */
Scale.prototype.isBlank = function () {
    return this._isBlank;
},

/**
 * When axis extent depends on data and no data exists,
 * axis ticks should not be drawn, which is named 'blank'.
 */
Scale.prototype.setBlank = function (isBlank) {
    this._isBlank = isBlank;
};

/**
 * @abstract
 * @param {*} tick
 * @return {string} label of the tick.
 */
Scale.prototype.getLabel = null;


clazzUtil.enableClassExtend(Scale);
clazzUtil.enableClassManagement(Scale, {
    registerWhenExtend: true
});

export default Scale;
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
 * Simple view coordinate system
 * Mapping given x, y to transformd view x, y
 */

import * as zrUtil from 'zrender/src/core/util';
import * as vector from 'zrender/src/core/vector';
import * as matrix from 'zrender/src/core/matrix';
import BoundingRect from 'zrender/src/core/BoundingRect';
import Transformable from 'zrender/src/mixin/Transformable';

var v2ApplyTransform = vector.applyTransform;

// Dummy transform node
function TransformDummy() {
    Transformable.call(this);
}
zrUtil.mixin(TransformDummy, Transformable);

function View(name) {
    /**
     * @type {string}
     */
    this.name = name;

    /**
     * @type {Object}
     */
    this.zoomLimit;

    Transformable.call(this);

    this._roamTransformable = new TransformDummy();

    this._rawTransformable = new TransformDummy();

    this._center;
    this._zoom;
}

View.prototype = {

    constructor: View,

    type: 'view',

    /**
     * @param {Array.<string>}
     * @readOnly
     */
    dimensions: ['x', 'y'],

    /**
     * Set bounding rect
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */

    // PENDING to getRect
    setBoundingRect: function (x, y, width, height) {
        this._rect = new BoundingRect(x, y, width, height);
        return this._rect;
    },

    /**
     * @return {module:zrender/core/BoundingRect}
     */
    // PENDING to getRect
    getBoundingRect: function () {
        return this._rect;
    },

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    setViewRect: function (x, y, width, height) {
        this.transformTo(x, y, width, height);
        this._viewRect = new BoundingRect(x, y, width, height);
    },

    /**
     * Transformed to particular position and size
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    transformTo: function (x, y, width, height) {
        var rect = this.getBoundingRect();
        var rawTransform = this._rawTransformable;

        rawTransform.transform = rect.calculateTransform(
            new BoundingRect(x, y, width, height)
        );

        rawTransform.decomposeTransform();

        this._updateTransform();
    },

    /**
     * Set center of view
     * @param {Array.<number>} [centerCoord]
     */
    setCenter: function (centerCoord) {
        if (!centerCoord) {
            return;
        }
        this._center = centerCoord;

        this._updateCenterAndZoom();
    },

    /**
     * @param {number} zoom
     */
    setZoom: function (zoom) {
        zoom = zoom || 1;

        var zoomLimit = this.zoomLimit;
        if (zoomLimit) {
            if (zoomLimit.max != null) {
                zoom = Math.min(zoomLimit.max, zoom);
            }
            if (zoomLimit.min != null) {
                zoom = Math.max(zoomLimit.min, zoom);
            }
        }
        this._zoom = zoom;

        this._updateCenterAndZoom();
    },

    /**
     * Get default center without roam
     */
    getDefaultCenter: function () {
        // Rect before any transform
        var rawRect = this.getBoundingRect();
        var cx = rawRect.x + rawRect.width / 2;
        var cy = rawRect.y + rawRect.height / 2;

        return [cx, cy];
    },

    getCenter: function () {
        return this._center || this.getDefaultCenter();
    },

    getZoom: function () {
        return this._zoom || 1;
    },

    /**
     * @return {Array.<number}
     */
    getRoamTransform: function () {
        return this._roamTransformable.getLocalTransform();
    },

    /**
     * Remove roam
     */
    _updateCenterAndZoom: function () {
        // Must update after view transform updated
        var rawTransformMatrix = this._rawTransformable.getLocalTransform();
        var roamTransform = this._roamTransformable;
        var defaultCenter = this.getDefaultCenter();
        var center = this.getCenter();
        var zoom = this.getZoom();

        center = vector.applyTransform([], center, rawTransformMatrix);
        defaultCenter = vector.applyTransform([], defaultCenter, rawTransformMatrix);

        roamTransform.origin = center;
        roamTransform.position = [
            defaultCenter[0] - center[0],
            defaultCenter[1] - center[1]
        ];
        roamTransform.scale = [zoom, zoom];

        this._updateTransform();
    },

    /**
     * Update transform from roam and mapLocation
     * @private
     */
    _updateTransform: function () {
        var roamTransformable = this._roamTransformable;
        var rawTransformable = this._rawTransformable;

        rawTransformable.parent = roamTransformable;
        roamTransformable.updateTransform();
        rawTransformable.updateTransform();

        matrix.copy(this.transform || (this.transform = []), rawTransformable.transform || matrix.create());

        this._rawTransform = rawTransformable.getLocalTransform();

        this.invTransform = this.invTransform || [];
        matrix.invert(this.invTransform, this.transform);

        this.decomposeTransform();
    },

    getTransformInfo: function () {
        var roamTransform = this._roamTransformable.transform;
        var rawTransformable = this._rawTransformable;
        return {
            roamTransform: roamTransform ? zrUtil.slice(roamTransform) : matrix.create(),
            rawScale: zrUtil.slice(rawTransformable.scale),
            rawPosition: zrUtil.slice(rawTransformable.position)
        };
    },

    /**
     * @return {module:zrender/core/BoundingRect}
     */
    getViewRect: function () {
        return this._viewRect;
    },

    /**
     * Get view rect after roam transform
     * @return {module:zrender/core/BoundingRect}
     */
    getViewRectAfterRoam: function () {
        var rect = this.getBoundingRect().clone();
        rect.applyTransform(this.transform);
        return rect;
    },

    /**
     * Convert a single (lon, lat) data item to (x, y) point.
     * @param {Array.<number>} data
     * @param {boolean} noRoam
     * @param {Array.<number>} [out]
     * @return {Array.<number>}
     */
    dataToPoint: function (data, noRoam, out) {
        var transform = noRoam ? this._rawTransform : this.transform;
        out = out || [];
        return transform
            ? v2ApplyTransform(out, data, transform)
            : vector.copy(out, data);
    },

    /**
     * Convert a (x, y) point to (lon, lat) data
     * @param {Array.<number>} point
     * @return {Array.<number>}
     */
    pointToData: function (point) {
        var invTransform = this.invTransform;
        return invTransform
            ? v2ApplyTransform([], point, invTransform)
            : [point[0], point[1]];
    },

    /**
     * @implements
     * see {module:echarts/CoodinateSystem}
     */
    convertToPixel: zrUtil.curry(doConvert, 'dataToPoint'),

    /**
     * @implements
     * see {module:echarts/CoodinateSystem}
     */
    convertFromPixel: zrUtil.curry(doConvert, 'pointToData'),

    /**
     * @implements
     * see {module:echarts/CoodinateSystem}
     */
    containPoint: function (point) {
        return this.getViewRectAfterRoam().contain(point[0], point[1]);
    }

    /**
     * @return {number}
     */
    // getScalarScale: function () {
    //     // Use determinant square root of transform to mutiply scalar
    //     var m = this.transform;
    //     var det = Math.sqrt(Math.abs(m[0] * m[3] - m[2] * m[1]));
    //     return det;
    // }
};

zrUtil.mixin(View, Transformable);

function doConvert(methodName, ecModel, finder, value) {
    var seriesModel = finder.seriesModel;
    var coordSys = seriesModel ? seriesModel.coordinateSystem : null; // e.g., graph.
    return coordSys === this ? coordSys[methodName](value) : null;
}

export default View;
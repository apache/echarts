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
import BoundingRect from 'zrender/src/core/BoundingRect';
import View from '../View';
import geoSourceManager from './geoSourceManager';


/**
 * [Geo description]
 * For backward compatibility, the orginal interface:
 * `name, map, geoJson, specialAreas, nameMap` is kept.
 *
 * @param {string|Object} name
 * @param {string} map Map type
 *        Specify the positioned areas by left, top, width, height
 * @param {Object.<string, string>} [nameMap]
 *        Specify name alias
 * @param {boolean} [invertLongitute=true]
 */
function Geo(name, map, nameMap, invertLongitute) {

    View.call(this, name);

    /**
     * Map type
     * @type {string}
     */
    this.map = map;

    var source = geoSourceManager.load(map, nameMap);

    this._nameCoordMap = source.nameCoordMap;
    this._regionsMap = source.regionsMap;
    this._invertLongitute = invertLongitute == null ? true : invertLongitute;

    /**
     * @readOnly
     */
    this.regions = source.regions;

    /**
     * @type {module:zrender/src/core/BoundingRect}
     */
    this._rect = source.boundingRect;
}

Geo.prototype = {

    constructor: Geo,

    type: 'geo',

    /**
     * @param {Array.<string>}
     * @readOnly
     */
    dimensions: ['lng', 'lat'],

    /**
     * If contain given lng,lat coord
     * @param {Array.<number>}
     * @readOnly
     */
    containCoord: function (coord) {
        var regions = this.regions;
        for (var i = 0; i < regions.length; i++) {
            if (regions[i].contain(coord)) {
                return true;
            }
        }
        return false;
    },

    /**
     * @override
     */
    transformTo: function (x, y, width, height) {
        var rect = this.getBoundingRect();
        var invertLongitute = this._invertLongitute;

        rect = rect.clone();

        if (invertLongitute) {
            // Longitute is inverted
            rect.y = -rect.y - rect.height;
        }

        var rawTransformable = this._rawTransformable;

        rawTransformable.transform = rect.calculateTransform(
            new BoundingRect(x, y, width, height)
        );

        rawTransformable.decomposeTransform();

        if (invertLongitute) {
            var scale = rawTransformable.scale;
            scale[1] = -scale[1];
        }

        rawTransformable.updateTransform();

        this._updateTransform();
    },

    /**
     * @param {string} name
     * @return {module:echarts/coord/geo/Region}
     */
    getRegion: function (name) {
        return this._regionsMap.get(name);
    },

    getRegionByCoord: function (coord) {
        var regions = this.regions;
        for (var i = 0; i < regions.length; i++) {
            if (regions[i].contain(coord)) {
                return regions[i];
            }
        }
    },

    /**
     * Add geoCoord for indexing by name
     * @param {string} name
     * @param {Array.<number>} geoCoord
     */
    addGeoCoord: function (name, geoCoord) {
        this._nameCoordMap.set(name, geoCoord);
    },

    /**
     * Get geoCoord by name
     * @param {string} name
     * @return {Array.<number>}
     */
    getGeoCoord: function (name) {
        return this._nameCoordMap.get(name);
    },

    /**
     * @override
     */
    getBoundingRect: function () {
        return this._rect;
    },

    /**
     * @param {string|Array.<number>} data
     * @param {boolean} noRoam
     * @param {Array.<number>} [out]
     * @return {Array.<number>}
     */
    dataToPoint: function (data, noRoam, out) {
        if (typeof data === 'string') {
            // Map area name to geoCoord
            data = this.getGeoCoord(data);
        }
        if (data) {
            return View.prototype.dataToPoint.call(this, data, noRoam, out);
        }
    },

    /**
     * @override
     */
    convertToPixel: zrUtil.curry(doConvert, 'dataToPoint'),

    /**
     * @override
     */
    convertFromPixel: zrUtil.curry(doConvert, 'pointToData')

};

zrUtil.mixin(Geo, View);

function doConvert(methodName, ecModel, finder, value) {
    var geoModel = finder.geoModel;
    var seriesModel = finder.seriesModel;

    var coordSys = geoModel
        ? geoModel.coordinateSystem
        : seriesModel
        ? (
            seriesModel.coordinateSystem // For map.
            || (seriesModel.getReferringComponents('geo')[0] || {}).coordinateSystem
        )
        : null;

    return coordSys === this ? coordSys[methodName](value) : null;
}

export default Geo;
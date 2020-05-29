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
 * Helper for model references.
 * There are many manners to refer axis/coordSys.
 */

// TODO
// merge relevant logic to this file?
// check: "modelHelper" of tooltip and "BrushTargetManager".

import {__DEV__} from '../config';
import {createHashMap, retrieve, each} from 'zrender/src/core/util';

/**
 * @class
 * For example:
 * {
 *     coordSysName: 'cartesian2d',
 *     coordSysDims: ['x', 'y', ...],
 *     axisMap: HashMap({
 *         x: xAxisModel,
 *         y: yAxisModel
 *     }),
 *     categoryAxisMap: HashMap({
 *         x: xAxisModel,
 *         y: undefined
 *     }),
 *     // The index of the first category axis in `coordSysDims`.
 *     // `null/undefined` means no category axis exists.
 *     firstCategoryDimIndex: 1,
 *     // To replace user specified encode.
 * }
 */
function CoordSysInfo(coordSysName) {
    /**
     * @type {string}
     */
    this.coordSysName = coordSysName;
    /**
     * @type {Array.<string>}
     */
    this.coordSysDims = [];
    /**
     * @type {module:zrender/core/util#HashMap}
     */
    this.axisMap = createHashMap();
    /**
     * @type {module:zrender/core/util#HashMap}
     */
    this.categoryAxisMap = createHashMap();
    /**
     * @type {number}
     */
    this.firstCategoryDimIndex = null;
}

/**
 * @return {module:model/referHelper#CoordSysInfo}
 */
export function getCoordSysInfoBySeries(seriesModel) {
    var coordSysName = seriesModel.get('coordinateSystem');
    var result = new CoordSysInfo(coordSysName);
    var fetch = fetchers[coordSysName];
    if (fetch) {
        fetch(seriesModel, result, result.axisMap, result.categoryAxisMap);
        return result;
    }
}

var fetchers = {

    cartesian2d: function (seriesModel, result, axisMap, categoryAxisMap) {
        var xAxisModel = seriesModel.getReferringComponents('xAxis')[0];
        var yAxisModel = seriesModel.getReferringComponents('yAxis')[0];

        if (__DEV__) {
            if (!xAxisModel) {
                throw new Error('xAxis "' + retrieve(
                    seriesModel.get('xAxisIndex'),
                    seriesModel.get('xAxisId'),
                    0
                ) + '" not found');
            }
            if (!yAxisModel) {
                throw new Error('yAxis "' + retrieve(
                    seriesModel.get('xAxisIndex'),
                    seriesModel.get('yAxisId'),
                    0
                ) + '" not found');
            }
        }

        result.coordSysDims = ['x', 'y'];
        axisMap.set('x', xAxisModel);
        axisMap.set('y', yAxisModel);

        if (isCategory(xAxisModel)) {
            categoryAxisMap.set('x', xAxisModel);
            result.firstCategoryDimIndex = 0;
        }
        if (isCategory(yAxisModel)) {
            categoryAxisMap.set('y', yAxisModel);
            result.firstCategoryDimIndex == null & (result.firstCategoryDimIndex = 1);
        }
    },

    singleAxis: function (seriesModel, result, axisMap, categoryAxisMap) {
        var singleAxisModel = seriesModel.getReferringComponents('singleAxis')[0];

        if (__DEV__) {
            if (!singleAxisModel) {
                throw new Error('singleAxis should be specified.');
            }
        }

        result.coordSysDims = ['single'];
        axisMap.set('single', singleAxisModel);

        if (isCategory(singleAxisModel)) {
            categoryAxisMap.set('single', singleAxisModel);
            result.firstCategoryDimIndex = 0;
        }
    },

    polar: function (seriesModel, result, axisMap, categoryAxisMap) {
        var polarModel = seriesModel.getReferringComponents('polar')[0];
        var radiusAxisModel = polarModel.findAxisModel('radiusAxis');
        var angleAxisModel = polarModel.findAxisModel('angleAxis');

        if (__DEV__) {
            if (!angleAxisModel) {
                throw new Error('angleAxis option not found');
            }
            if (!radiusAxisModel) {
                throw new Error('radiusAxis option not found');
            }
        }

        result.coordSysDims = ['radius', 'angle'];
        axisMap.set('radius', radiusAxisModel);
        axisMap.set('angle', angleAxisModel);

        if (isCategory(radiusAxisModel)) {
            categoryAxisMap.set('radius', radiusAxisModel);
            result.firstCategoryDimIndex = 0;
        }
        if (isCategory(angleAxisModel)) {
            categoryAxisMap.set('angle', angleAxisModel);
            result.firstCategoryDimIndex == null && (result.firstCategoryDimIndex = 1);
        }
    },

    geo: function (seriesModel, result, axisMap, categoryAxisMap) {
        result.coordSysDims = ['lng', 'lat'];
    },

    parallel: function (seriesModel, result, axisMap, categoryAxisMap) {
        var ecModel = seriesModel.ecModel;
        var parallelModel = ecModel.getComponent(
            'parallel', seriesModel.get('parallelIndex')
        );
        var coordSysDims = result.coordSysDims = parallelModel.dimensions.slice();

        each(parallelModel.parallelAxisIndex, function (axisIndex, index) {
            var axisModel = ecModel.getComponent('parallelAxis', axisIndex);
            var axisDim = coordSysDims[index];
            axisMap.set(axisDim, axisModel);

            if (isCategory(axisModel) && result.firstCategoryDimIndex == null) {
                categoryAxisMap.set(axisDim, axisModel);
                result.firstCategoryDimIndex = index;
            }
        });
    }
};

function isCategory(axisModel) {
    return axisModel.get('type') === 'category';
}


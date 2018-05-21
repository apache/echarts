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
 * @file Visual solution, for consistent option specification.
 */

import * as zrUtil from 'zrender/src/core/util';
import VisualMapping from './VisualMapping';

var each = zrUtil.each;

function hasKeys(obj) {
    if (obj) {
        for (var name in obj){
            if (obj.hasOwnProperty(name)) {
                return true;
            }
        }
    }
}

/**
 * @param {Object} option
 * @param {Array.<string>} stateList
 * @param {Function} [supplementVisualOption]
 * @return {Object} visualMappings <state, <visualType, module:echarts/visual/VisualMapping>>
 */
export function createVisualMappings(option, stateList, supplementVisualOption) {
    var visualMappings = {};

    each(stateList, function (state) {
        var mappings = visualMappings[state] = createMappings();

        each(option[state], function (visualData, visualType) {
            if (!VisualMapping.isValidType(visualType)) {
                return;
            }
            var mappingOption = {
                type: visualType,
                visual: visualData
            };
            supplementVisualOption && supplementVisualOption(mappingOption, state);
            mappings[visualType] = new VisualMapping(mappingOption);

            // Prepare a alpha for opacity, for some case that opacity
            // is not supported, such as rendering using gradient color.
            if (visualType === 'opacity') {
                mappingOption = zrUtil.clone(mappingOption);
                mappingOption.type = 'colorAlpha';
                mappings.__hidden.__alphaForOpacity = new VisualMapping(mappingOption);
            }
        });
    });

    return visualMappings;

    function createMappings() {
        var Creater = function () {};
        // Make sure hidden fields will not be visited by
        // object iteration (with hasOwnProperty checking).
        Creater.prototype.__hidden = Creater.prototype;
        var obj = new Creater();
        return obj;
    }
}

/**
 * @param {Object} thisOption
 * @param {Object} newOption
 * @param {Array.<string>} keys
 */
export function replaceVisualOption(thisOption, newOption, keys) {
    // Visual attributes merge is not supported, otherwise it
    // brings overcomplicated merge logic. See #2853. So if
    // newOption has anyone of these keys, all of these keys
    // will be reset. Otherwise, all keys remain.
    var has;
    zrUtil.each(keys, function (key) {
        if (newOption.hasOwnProperty(key) && hasKeys(newOption[key])) {
            has = true;
        }
    });
    has && zrUtil.each(keys, function (key) {
        if (newOption.hasOwnProperty(key) && hasKeys(newOption[key])) {
            thisOption[key] = zrUtil.clone(newOption[key]);
        }
        else {
            delete thisOption[key];
        }
    });
}

/**
 * @param {Array.<string>} stateList
 * @param {Object} visualMappings <state, Object.<visualType, module:echarts/visual/VisualMapping>>
 * @param {module:echarts/data/List} list
 * @param {Function} getValueState param: valueOrIndex, return: state.
 * @param {object} [scope] Scope for getValueState
 * @param {string} [dimension] Concrete dimension, if used.
 */
// ???! handle brush?
export function applyVisual(stateList, visualMappings, data, getValueState, scope, dimension) {
    var visualTypesMap = {};
    zrUtil.each(stateList, function (state) {
        var visualTypes = VisualMapping.prepareVisualTypes(visualMappings[state]);
        visualTypesMap[state] = visualTypes;
    });

    var dataIndex;

    function getVisual(key) {
        return data.getItemVisual(dataIndex, key);
    }

    function setVisual(key, value) {
        data.setItemVisual(dataIndex, key, value);
    }

    if (dimension == null) {
        data.each(eachItem);
    }
    else {
        data.each([dimension], eachItem);
    }

    function eachItem(valueOrIndex, index) {
        dataIndex = dimension == null ? valueOrIndex : index;

        var rawDataItem = data.getRawDataItem(dataIndex);
        // Consider performance
        if (rawDataItem && rawDataItem.visualMap === false) {
            return;
        }

        var valueState = getValueState.call(scope, valueOrIndex);
        var mappings = visualMappings[valueState];
        var visualTypes = visualTypesMap[valueState];

        for (var i = 0, len = visualTypes.length; i < len; i++) {
            var type = visualTypes[i];
            mappings[type] && mappings[type].applyVisual(
                valueOrIndex, getVisual, setVisual
            );
        }
    }
}

/**
 * @param {module:echarts/data/List} data
 * @param {Array.<string>} stateList
 * @param {Object} visualMappings <state, Object.<visualType, module:echarts/visual/VisualMapping>>
 * @param {Function} getValueState param: valueOrIndex, return: state.
 * @param {number} [dim] dimension or dimension index.
 */
export function incrementalApplyVisual(stateList, visualMappings, getValueState, dim) {
    var visualTypesMap = {};
    zrUtil.each(stateList, function (state) {
        var visualTypes = VisualMapping.prepareVisualTypes(visualMappings[state]);
        visualTypesMap[state] = visualTypes;
    });

    function progress(params, data) {
        if (dim != null) {
            dim = data.getDimension(dim);
        }

        function getVisual(key) {
            return data.getItemVisual(dataIndex, key);
        }

        function setVisual(key, value) {
            data.setItemVisual(dataIndex, key, value);
        }

        var dataIndex;
        while ((dataIndex = params.next()) != null) {
            var rawDataItem = data.getRawDataItem(dataIndex);

            // Consider performance
            if (rawDataItem && rawDataItem.visualMap === false) {
                return;
            }

            var value = dim != null
                ? data.get(dim, dataIndex, true)
                : dataIndex;

            var valueState = getValueState(value);
            var mappings = visualMappings[valueState];
            var visualTypes = visualTypesMap[valueState];

            for (var i = 0, len = visualTypes.length; i < len; i++) {
                var type = visualTypes[i];
                mappings[type] && mappings[type].applyVisual(value, getVisual, setVisual);
            }
        }
    }

    return {progress: progress};
}

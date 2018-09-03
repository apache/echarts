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

/*
* The implementation references to d3.js. The use of the source
* code of this file is also subject to the terms and consitions
* of its license (BSD-3Clause, see <echarts/src/licenses/LICENSE-d3>).
*/


import * as zrUtil from 'zrender/src/core/util';

/**
 * nest helper used to group by the array.
 * can specified the keys and sort the keys.
 */
export default function nest() {

    var keysFunction = [];
    var sortKeysFunction = [];

    /**
     * map an Array into the mapObject.
     * @param {Array} array
     * @param {number} depth
     */
    function map(array, depth) {
        if (depth >= keysFunction.length) {
            return array;
        }
        var i = -1;
        var n = array.length;
        var keyFunction = keysFunction[depth++];
        var mapObject = {};
        var valuesByKey = {};

        while (++i < n) {
            var keyValue = keyFunction(array[i]);
            var values = valuesByKey[keyValue];

            if (values) {
                values.push(array[i]);
            }
            else {
                valuesByKey[keyValue] = [array[i]];
            }
        }

        zrUtil.each(valuesByKey, function (value, key) {
            mapObject[key] = map(value, depth);
        });

        return mapObject;
    }

    /**
     * transform the Map Object to multidimensional Array
     * @param {Object} map
     * @param {number} depth
     */
    function entriesMap(mapObject, depth) {
        if (depth >= keysFunction.length) {
            return mapObject;
        }
        var array = [];
        var sortKeyFunction = sortKeysFunction[depth++];

        zrUtil.each(mapObject, function (value, key) {
            array.push({
                key: key, values: entriesMap(value, depth)
            });
        });

        if (sortKeyFunction) {
            return array.sort(function (a, b) {
                return sortKeyFunction(a.key, b.key);
            });
        }

        return array;
    }

    return {
        /**
         * specified the key to groupby the arrays.
         * users can specified one more keys.
         * @param {Function} d
         */
        key: function (d) {
            keysFunction.push(d);
            return this;
        },

        /**
         * specified the comparator to sort the keys
         * @param {Function} order
         */
        sortKeys: function (order) {
            sortKeysFunction[keysFunction.length - 1] = order;
            return this;
        },

        /**
         * the array to be grouped by.
         * @param {Array} array
         */
        entries: function (array) {
            return entriesMap(map(array, 0), 0);
        }
    };
}
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

(function (exports) {

    /**
     * @usage
     *
     * ```js
     * dataset: [{
     *     source: [
     *         ['aa', 'bb', 'cc', 'tag'],
     *         [12, 0.33, 5200, 'AA'],
     *         [21, 0.65, 8100, 'AA'],
     *         ...
     *     ]
     * }, {
     *     transform: {
     *         type: 'my:id',
     *         config: {
     *             dimensionIndex: 4,
     *             dimensionName: 'ID'
     *         }
     *     }
     *     // Then the result data will be:
     *     // [
     *     //     ['aa', 'bb', 'cc', 'tag', 'ID'],
     *     //     [12, 0.33, 5200, 'AA', 0],
     *     //     [21, 0.65, 8100, 'BB', 1],
     *     //     ...
     *     // ]
     * }]
     * ```
     */
    var transform = {

        type: 'myTransform:id',

        /**
         * @param params.config.dimensionIndex DimensionIndex
         *        Mandatory. Specify where to put the new id dimension.
         * @param params.config.dimensionName DimensionName
         *        Optional. If not provided, left the dimension name not defined.
         */
        transform: function (params) {
            var upstream = params.upstream;
            var config = params.config;
            var dimensionIndex = config.dimensionIndex;
            var dimensionName = config.dimensionName;

            var dimsDef = upstream.cloneAllDimensionInfo();
            dimsDef[dimensionIndex] = dimensionName;

            var data = upstream.cloneRawData();

            for (var i = 0, len = data.length; i < len; i++) {
                var line = data[i];
                line[dimensionIndex] = i;
            }

            return {
                dimensions: dimsDef,
                data: upstream.data
            };
        }
    };

    var myTransform = exports.myTransform = exports.myTransform || {};
    myTransform.id = transform;

})(this);


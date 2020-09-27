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
     *         [21, 0.65, 7100, 'AA'],
     *         [51, 0.15, 1100, 'BB'],
     *         [71, 0.75, 9100, 'BB'],
     *         ...
     *     ]
     * }, {
     *     transform: {
     *         type: 'my:aggregate',
     *         config: {
     *             resultDimensions: [
     *                 // by default, use the same name with `from`.
     *                 { from: 'aa', method: 'sum' },
     *                 { from: 'bb', method: 'count' },
     *                 { from: 'cc' }, // method by default: use the first value.
     *                 { from: 'tag' }
     *             ],
     *             groupBy: 'tag'
     *         }
     *     }
     *     // Then the result data will be:
     *     // [
     *     //     ['aa', 'bb', 'cc', 'tag'],
     *     //     [12, 0.33, 5200, 'AA'],
     *     //     [21, 0.65, 8100, 'BB'],
     *     //     ...
     *     // ]
     * }]
     * ```
     */
    var transform = {

        type: 'myTransform:aggregate',

        /**
         * @param params
         * @param params.config.resultDimensions Mandatory.
         *        {
         *            // Optional. The name of the result dimensions.
         *            // If not provided, inherit the name from `from`.
         *            name: DimensionName;
         *            // Mandatory. `from` is used to reference dimension from `source`.
         *            from: DimensionIndex | DimensionName;
         *            // Optional. Aggregate method. Currently only these method supported.
         *            // If not provided, use `'first'`.
         *            method: 'sum' | 'count' | 'first';
         *        }[]
         * @param params.config.groupBy DimensionIndex | DimensionName Optional.
         */
        transform: function (params) {
            var upstream = params.upstream;
            var config = params.config;
            var resultDimensionsConfig = config.resultDimensions;

            var resultDimInfoList = [];
            var resultDimensions = [];
            for (var i = 0; i < resultDimensionsConfig.length; i++) {
                var resultDimInfoConfig = resultDimensionsConfig[i];
                var resultDimInfo = upstream.getDimensionInfo(resultDimInfoConfig.from);
                assert(resultDimInfo, 'Can not find dimension by `from`: ' + resultDimInfoConfig.from);
                resultDimInfo.method = resultDimInfoConfig.method;
                resultDimInfoList.push(resultDimInfo);
                if (resultDimInfoConfig.name != null) {
                    resultDimInfo.name = resultDimInfoConfig.name;
                }
                resultDimensions.push(resultDimInfo.name);
            }

            var resultData = [];

            var groupBy = config.groupBy;
            var groupByDimInfo;
            if (groupBy != null) {
                var groupMap = {};
                groupByDimInfo = upstream.getDimensionInfo(groupBy);
                assert(groupByDimInfo, 'Can not find dimension by `groupBy`: ' + groupBy);

                for (var dataIndex = 0, len = upstream.count(); dataIndex < len; dataIndex++) {
                    var groupByVal = upstream.retrieveValue(dataIndex, groupByDimInfo.index);

                    if (!groupMap.hasOwnProperty(groupByVal)) {
                        var newLine = createLine(upstream, dataIndex, resultDimInfoList, groupByDimInfo, groupByVal);
                        resultData.push(newLine);
                        groupMap[groupByVal] = newLine;
                    }
                    else {
                        var targetLine = groupMap[groupByVal];
                        aggregateLine(upstream, dataIndex, targetLine, resultDimInfoList, groupByDimInfo);
                    }
                }
            }
            else {
                var targetLine = createLine(upstream, 0, resultDimInfoList);
                resultData.push(targetLine);
                for (var dataIndex = 0, len = upstream.count(); dataIndex < len; dataIndex++) {
                    aggregateLine(upstream, dataIndex, targetLine, resultDimInfoList);
                }
            }

            return {
                dimensions: resultDimensions,
                data: resultData
            };
        }
    };

    function createLine(upstream, dataIndex, resultDimInfoList, groupByDimInfo, groupByVal) {
        var newLine = [];
        for (var j = 0; j < resultDimInfoList.length; j++) {
            var resultDimInfo = resultDimInfoList[j];
            var method = resultDimInfo.method;
            newLine[j] = (groupByDimInfo && resultDimInfo.index === groupByDimInfo.index)
                ? groupByVal
                : (method === 'sum' || method === 'count')
                ? 0
                // By default, method: 'first'
                : upstream.retrieveValue(dataIndex, resultDimInfo.index);
        }
        return newLine;
    }

    function aggregateLine(upstream, dataIndex, targetLine, resultDimInfoList, groupByDimInfo) {
        for (var j = 0; j < resultDimInfoList.length; j++) {
            var resultDimInfo = resultDimInfoList[j];
            var method = resultDimInfo.method;
            if (!groupByDimInfo || resultDimInfo.index !== groupByDimInfo.index) {
                if (method === 'sum') {
                    targetLine[j] += upstream.retrieveValue(dataIndex, resultDimInfo.index);
                }
                else if (method === 'count') {
                    targetLine[j] += 1;
                }
            }
        }
    }

    function assert(cond, msg) {
        if (!cond) {
            throw new Error(msg || 'transition player error');
        }
    }

    var myTransform = exports.myTransform = exports.myTransform || {};
    myTransform.aggregate = transform;

})(this);

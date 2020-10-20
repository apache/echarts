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

    var transitionPlayer = {};

    /**
     * @usage
     * ```js
     * // Initialize with an array of echarts option info:
     * var player = transitionPlayer.create({
     *
     *     // The echarts instance or chart instance getter.
     *     chart: function () {
     *         return myChart;
     *     },
     *     seriesIndex: 0,
     *     replaceMerge: ['xAxis', 'yAxis']
     *
     *     // The data meta info used to determine how to
     *     // make transition mapping.
     *     // The strategy: If `uniqueDimension` provided and is a common
     *     // dimension, use `uniqueDimension`.
     *     dataMeta: {
     *         aaa: {
     *             dimensions: ['qqq', 'www', 'eee', 'rrr']
     *         },
     *         bbb: {
     *             dimensions: ['ccc', 'www', 'eee'],
     *             uniqueDimension: 'www',
     *             dividingMethod: 'duplicate'
     *         },
     *         ...
     *     },
     *
     *     // echarts option collection:
     *     optionList: [
     *         // dataMetaKey is the key of 'dataMeta'.
     *         { key: 'Time_Income_Bar', option: option0, dataMetaKey: 'aaa' },
     *         { key: 'Population_Income_Scatter', option: option1, dataMetaKey: 'bbb' },
     *         { key: 'Time_Income_Pie', option: option2, dataMetaKey: 'aaa' },
     *         ...
     *     ]
     * });
     *
     * // Then start to play:
     * player.next(); // Display next option (from the first option).
     * player.previous(); // Display previous optoin.
     * player.go('Time_Income_Pie'); // Display the specified option.
     * player.getOptionKeys(); // return `['Time_Income_Bar', 'Population_Income_Scatter', 'Time_Income_Pie']`
     * ```
     *
     * @parma opt See the constructor of `TransitionPlayer`.
     */
    transitionPlayer.create = function (opt) {
        return new TransitionPlayer(opt);
    };

    /**
     * @param opt
     * @param opt.chart
     *        (EChartsInstance | () => EChartsInstance)
     *        echarts instance or echarts instance getter.
     * @param opt.dataMeta
     *        {
     *            [dataMetaKey in string]: {
     *                dimensions: string[];
     *                uniqueDimension?: string;
     *                dividingMethod?: 'split' | 'duplicate'
     *            }
     *        }
     * @param opt.optionList
     *        {
     *            key: string;
     *            option: EChartsOption;
     *            dataMetaKey: string;
     *        }[]
     * @param opt.seriesIndex number
     *        Target series index to be transitioned.
     * @param opt.replaceMerge? string[]
     */
    function TransitionPlayer(opt) {
        assert(
            opt.chart
            && isObject(opt.dataMeta)
            && isArray(opt.optionList)
            && opt.seriesIndex != null
            && opt.optionList.length
        );

        this._chart = opt.chart;
        this._dataMeta = opt.dataMeta;
        var optionList = this._optionList = opt.optionList;
        var optionMap = this._optionMap = {};
        this._replaceMerge = opt.replaceMerge;
        this._seriesIndex = opt.seriesIndex;
        this._currOptionIdx = null;

        for (var i = 0; i < optionList.length; i++) {
            var optionWrap = optionList[i];
            var optionKey = optionWrap.key;
            if (optionKey != null) {
                assert(!hasOwn(optionMap, optionKey), 'option key duplicat: ' + optionKey);
                optionMap[optionKey] = i;
            }
        }
    }

    var proto = TransitionPlayer.prototype;

    proto.next = function () {
        var optionList = this._optionList;
        var newOptionIdx = this._currOptionIdx == null
            ? 0
            : Math.min(optionList.length - 1, this._currOptionIdx + 1);

        this._doChangeOption(newOptionIdx);
    };

    proto.previous = function () {
        var optionList = this._optionList;
        var newOptionIdx = this._currOptionIdx == null
            ? optionList.length - 1
            : Math.max(0, this._currOptionIdx - 1);

        this._doChangeOption(newOptionIdx);
    };

    /**
     * @param optionKey string
     */
    proto.go = function (optionKey) {
        var newOptionIdx = getMapValue(this._optionMap, optionKey);
        assert(newOptionIdx != null, 'Can not find option by option key: ' + optionKey);

        this._doChangeOption(newOptionIdx);
    };

    proto._doChangeOption = function (newOptionIdx) {
        var optionList = this._optionList;
        var oldOptionWrap = this._currOptionIdx != null ? optionList[this._currOptionIdx] : null;
        var newOptionWrap = optionList[newOptionIdx];
        var dataMeta = this._dataMeta;
        var targetSeriesIndex = this._seriesIndex;

        var transitionOpt = {
            // If can not find mapped dimensions, do not make transition animation
            // by default, becuase this transition probably bring about misleading.
            to: { seriesIndex: targetSeriesIndex }
        };

        if (oldOptionWrap) {
            var commonDimension =
                findCommonDimension(oldOptionWrap, newOptionWrap)
                || findCommonDimension(newOptionWrap, oldOptionWrap);
            if (commonDimension != null) {
                transitionOpt = {
                    from: {
                        seriesIndex: targetSeriesIndex,
                        dimension: commonDimension
                    },
                    to: {
                        seriesIndex: targetSeriesIndex,
                        dimension: commonDimension,
                    },
                    dividingMethod: dataMeta.dividingMethod
                };
            }
        }

        this._currOptionIdx = newOptionIdx;

        this._getChart().setOption(newOptionWrap.option, {
            replaceMerge: this._replaceMerge,
            transition: transitionOpt
        });

        function findCommonDimension(optionWrapA, optionWrapB) {
            var metaA = getMapValue(dataMeta, optionWrapA.dataMetaKey);
            var metaB = getMapValue(dataMeta, optionWrapB.dataMetaKey);
            var uniqueDimensionB = metaB.uniqueDimension;
            if (uniqueDimensionB != null && metaA.dimensions.indexOf(uniqueDimensionB) >= 0) {
                return uniqueDimensionB;
            }
        }

    };

    proto._getChart = function () {
        return isFunction(this._chart) ? this._chart() : this._chart;
    };

    /**
     * @return string[]
     */
    proto.getOptionKeys = function () {
        var optionKeys = [];
        var optionList = this._optionList;
        for (var i = 0; i < optionList.length; i++) {
            optionKeys.push(optionList[i].key);
        }
        return optionKeys;
    };


    function assert(cond, msg) {
        if (!cond) {
            throw new Error(msg || 'transition player error');
        }
    }

    function isObject(value) {
        const type = typeof value;
        return type === 'function' || (!!value && type === 'object');
    }

    function isArray(value) {
        if (Array.isArray) {
            return Array.isArray(value);
        }
        return Object.prototype.toString.call(value) === '[object Array]';
    }

    function isFunction(value) {
        return typeof value === 'function';
    }

    function hasOwn(obj, key) {
        return obj.hasOwnProperty(key);
    }

    function getMapValue(map, key) {
        return (key != null && hasOwn(map, key)) ? map[key] : null;
    }


    exports.transitionPlayer = transitionPlayer;

})(this);

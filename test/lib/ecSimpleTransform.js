(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ecSimpleTransform = {}));
}(this, (function (exports) { 'use strict';

    var transform = {
        type: 'ecSimpleTransform:id',
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
                data: data
            };
        }
    };

    function assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
    function hasOwn(own, prop) {
        return own.hasOwnProperty(prop);
    }
    function quantile(ascArr, p) {
        var H = (ascArr.length - 1) * p + 1;
        var h = Math.floor(H);
        var v = +ascArr[h - 1];
        var e = H - h;
        return e ? v + e * (ascArr[h] - v) : v;
    }

    var METHOD_INTERNAL = {
        'SUM': true,
        'COUNT': true,
        'FIRST': true,
        'AVERAGE': true,
        'Q1': true,
        'Q2': true,
        'Q3': true,
        'MIN': true,
        'MAX': true
    };
    var METHOD_NEEDS_COLLECT = {
        AVERAGE: ['COUNT']
    };
    var METHOD_NEEDS_GATHER_VALUES = {
        Q1: true,
        Q2: true,
        Q3: true
    };
    var METHOD_ALIAS = {
        MEDIAN: 'Q2'
    };
    var ResultDimInfoInternal = (function () {
        function ResultDimInfoInternal(index, indexInUpstream, method, name, needGatherValues) {
            this.collectionInfoList = [];
            this.gatheredValuesByGroup = {};
            this.gatheredValuesNoGroup = [];
            this.needGatherValues = false;
            this._collectionInfoMap = {};
            this.method = method;
            this.name = name;
            this.index = index;
            this.indexInUpstream = indexInUpstream;
            this.needGatherValues = needGatherValues;
        }
        ResultDimInfoInternal.prototype.addCollectionInfo = function (item) {
            this._collectionInfoMap[item.method] = this.collectionInfoList.length;
            this.collectionInfoList.push(item);
        };
        ResultDimInfoInternal.prototype.getCollectionInfo = function (method) {
            return this.collectionInfoList[this._collectionInfoMap[method]];
        };
        ResultDimInfoInternal.prototype.gatherValue = function (groupByDimInfo, groupVal, value) {
            value = +value;
            if (groupByDimInfo) {
                if (groupVal != null) {
                    var groupValStr = groupVal + '';
                    var values = this.gatheredValuesByGroup[groupValStr]
                        || (this.gatheredValuesByGroup[groupValStr] = []);
                    values.push(value);
                }
            }
            else {
                this.gatheredValuesNoGroup.push(value);
            }
        };
        return ResultDimInfoInternal;
    }());
    var transform$1 = {
        type: 'ecSimpleTransform:aggregate',
        transform: function (params) {
            var upstream = params.upstream;
            var config = params.config;
            var groupByDimInfo = prepareGroupByDimInfo(config, upstream);
            var _a = prepareDimensions(config, upstream, groupByDimInfo), finalResultDimInfoList = _a.finalResultDimInfoList, collectionDimInfoList = _a.collectionDimInfoList;
            var collectionResult;
            if (collectionDimInfoList.length) {
                collectionResult = travel(groupByDimInfo, upstream, collectionDimInfoList, createCollectionResultLine, updateCollectionResultLine);
            }
            for (var i = 0; i < collectionDimInfoList.length; i++) {
                var dimInfo = collectionDimInfoList[i];
                dimInfo.__collectionResult = collectionResult;
                asc(dimInfo.gatheredValuesNoGroup);
                var gatheredValuesByGroup = dimInfo.gatheredValuesByGroup;
                for (var key in gatheredValuesByGroup) {
                    if (hasOwn(gatheredValuesByGroup, key)) {
                        asc(gatheredValuesByGroup[key]);
                    }
                }
            }
            var finalResult = travel(groupByDimInfo, upstream, finalResultDimInfoList, createFinalResultLine, updateFinalResultLine);
            var dimensions = [];
            for (var i = 0; i < finalResultDimInfoList.length; i++) {
                dimensions.push(finalResultDimInfoList[i].name);
            }
            return {
                dimensions: dimensions,
                data: finalResult.outList
            };
        }
    };
    function prepareDimensions(config, upstream, groupByDimInfo) {
        var resultDimensionsConfig = config.resultDimensions;
        var finalResultDimInfoList = [];
        var collectionDimInfoList = [];
        var gIndexInLine = 0;
        for (var i = 0; i < resultDimensionsConfig.length; i++) {
            var resultDimInfoConfig = resultDimensionsConfig[i];
            var dimInfoInUpstream = upstream.getDimensionInfo(resultDimInfoConfig.from);
            assert(dimInfoInUpstream, 'Can not find dimension by `from`: ' + resultDimInfoConfig.from);
            var rawMethod = resultDimInfoConfig.method;
            assert(groupByDimInfo.index !== dimInfoInUpstream.index || rawMethod == null, "Dimension " + dimInfoInUpstream.name + " is the \"groupBy\" dimension, must not have any \"method\".");
            var method = normalizeMethod(rawMethod);
            assert(method, 'method is required');
            var name_1 = resultDimInfoConfig.name != null ? resultDimInfoConfig.name : dimInfoInUpstream.name;
            var finalResultDimInfo = new ResultDimInfoInternal(finalResultDimInfoList.length, dimInfoInUpstream.index, method, name_1, hasOwn(METHOD_NEEDS_GATHER_VALUES, method));
            finalResultDimInfoList.push(finalResultDimInfo);
            var needCollect = false;
            if (hasOwn(METHOD_NEEDS_COLLECT, method)) {
                needCollect = true;
                var collectionTargetMethods = METHOD_NEEDS_COLLECT[method];
                for (var j = 0; j < collectionTargetMethods.length; j++) {
                    finalResultDimInfo.addCollectionInfo({
                        method: collectionTargetMethods[j],
                        indexInLine: gIndexInLine++
                    });
                }
            }
            if (hasOwn(METHOD_NEEDS_GATHER_VALUES, method)) {
                needCollect = true;
            }
            if (needCollect) {
                collectionDimInfoList.push(finalResultDimInfo);
            }
        }
        return { collectionDimInfoList: collectionDimInfoList, finalResultDimInfoList: finalResultDimInfoList };
    }
    function prepareGroupByDimInfo(config, upstream) {
        var groupByConfig = config.groupBy;
        var groupByDimInfo;
        if (groupByConfig != null) {
            groupByDimInfo = upstream.getDimensionInfo(groupByConfig);
            assert(groupByDimInfo, 'Can not find dimension by `groupBy`: ' + groupByConfig);
        }
        return groupByDimInfo;
    }
    function travel(groupByDimInfo, upstream, resultDimInfoList, doCreate, doUpdate) {
        var outList = [];
        var mapByGroup;
        if (groupByDimInfo) {
            mapByGroup = {};
            for (var dataIndex = 0, len = upstream.count(); dataIndex < len; dataIndex++) {
                var groupByVal = upstream.retrieveValue(dataIndex, groupByDimInfo.index);
                if (groupByVal == null) {
                    continue;
                }
                var groupByValStr = groupByVal + '';
                if (!hasOwn(mapByGroup, groupByValStr)) {
                    var newLine = doCreate(upstream, dataIndex, resultDimInfoList, groupByDimInfo, groupByVal);
                    outList.push(newLine);
                    mapByGroup[groupByValStr] = newLine;
                }
                else {
                    var targetLine = mapByGroup[groupByValStr];
                    doUpdate(upstream, dataIndex, targetLine, resultDimInfoList, groupByDimInfo, groupByVal);
                }
            }
        }
        else {
            var targetLine = doCreate(upstream, 0, resultDimInfoList);
            outList.push(targetLine);
            for (var dataIndex = 1, len = upstream.count(); dataIndex < len; dataIndex++) {
                doUpdate(upstream, dataIndex, targetLine, resultDimInfoList);
            }
        }
        return { mapByGroup: mapByGroup, outList: outList };
    }
    function normalizeMethod(method) {
        if (method == null) {
            return 'FIRST';
        }
        var methodInternal = method.toUpperCase();
        methodInternal = hasOwn(METHOD_ALIAS, methodInternal)
            ? METHOD_ALIAS[methodInternal]
            : methodInternal;
        assert(hasOwn(METHOD_INTERNAL, methodInternal), "Illegal method " + method + ".");
        return methodInternal;
    }
    var createCollectionResultLine = function (upstream, dataIndex, collectionDimInfoList, groupByDimInfo, groupByVal) {
        var newLine = [];
        for (var i = 0; i < collectionDimInfoList.length; i++) {
            var dimInfo = collectionDimInfoList[i];
            var collectionInfoList = dimInfo.collectionInfoList;
            for (var j = 0; j < collectionInfoList.length; j++) {
                var collectionInfo = collectionInfoList[j];
                newLine[collectionInfo.indexInLine] = +lineCreator[collectionInfo.method](upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal);
            }
            if (dimInfo.needGatherValues) {
                var val = upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
                dimInfo.gatherValue(groupByDimInfo, groupByVal, val);
            }
        }
        return newLine;
    };
    var updateCollectionResultLine = function (upstream, dataIndex, targetLine, collectionDimInfoList, groupByDimInfo, groupByVal) {
        for (var i = 0; i < collectionDimInfoList.length; i++) {
            var dimInfo = collectionDimInfoList[i];
            var collectionInfoList = dimInfo.collectionInfoList;
            for (var j = 0; j < collectionInfoList.length; j++) {
                var collectionInfo = collectionInfoList[j];
                var indexInLine = collectionInfo.indexInLine;
                targetLine[indexInLine] = +lineUpdater[collectionInfo.method](targetLine[indexInLine], upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal);
            }
            if (dimInfo.needGatherValues) {
                var val = upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
                dimInfo.gatherValue(groupByDimInfo, groupByVal, val);
            }
        }
    };
    var createFinalResultLine = function (upstream, dataIndex, finalResultDimInfoList, groupByDimInfo, groupByVal) {
        var newLine = [];
        for (var i = 0; i < finalResultDimInfoList.length; i++) {
            var dimInfo = finalResultDimInfoList[i];
            var method = dimInfo.method;
            newLine[i] = isGroupByDimension(groupByDimInfo, dimInfo)
                ? groupByVal
                : lineCreator[method](upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal);
        }
        return newLine;
    };
    var updateFinalResultLine = function (upstream, dataIndex, targetLine, finalResultDimInfoList, groupByDimInfo, groupByVal) {
        for (var i = 0; i < finalResultDimInfoList.length; i++) {
            var dimInfo = finalResultDimInfoList[i];
            if (isGroupByDimension(groupByDimInfo, dimInfo)) {
                continue;
            }
            var method = dimInfo.method;
            targetLine[i] = lineUpdater[method](targetLine[i], upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal);
        }
    };
    function isGroupByDimension(groupByDimInfo, targetDimInfo) {
        return groupByDimInfo && targetDimInfo.indexInUpstream === groupByDimInfo.index;
    }
    function asc(list) {
        list.sort(function (a, b) {
            return a - b;
        });
    }
    var lineCreator = {
        'SUM': function () {
            return 0;
        },
        'COUNT': function () {
            return 1;
        },
        'FIRST': function (upstream, dataIndex, dimInfo) {
            return upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
        },
        'MIN': function (upstream, dataIndex, dimInfo) {
            return upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
        },
        'MAX': function (upstream, dataIndex, dimInfo) {
            return upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
        },
        'AVERAGE': function (upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
            var collectLine = groupByDimInfo
                ? dimInfo.__collectionResult.mapByGroup[groupByVal + '']
                : dimInfo.__collectionResult.outList[0];
            return upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream)
                / collectLine[dimInfo.getCollectionInfo('COUNT').indexInLine];
        },
        'Q1': function (upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
            return lineCreatorForQ(0.25, dimInfo, groupByDimInfo, groupByVal);
        },
        'Q2': function (upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
            return lineCreatorForQ(0.5, dimInfo, groupByDimInfo, groupByVal);
        },
        'Q3': function (upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
            return lineCreatorForQ(0.75, dimInfo, groupByDimInfo, groupByVal);
        }
    };
    var lineUpdater = {
        'SUM': function (val, upstream, dataIndex, dimInfo) {
            return val + upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream);
        },
        'COUNT': function (val) {
            return val + 1;
        },
        'FIRST': function (val) {
            return val;
        },
        'MIN': function (val, upstream, dataIndex, dimInfo) {
            return Math.min(val, upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream));
        },
        'MAX': function (val, upstream, dataIndex, dimInfo) {
            return Math.max(val, upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream));
        },
        'AVERAGE': function (val, upstream, dataIndex, dimInfo, groupByDimInfo, groupByVal) {
            var collectLine = groupByDimInfo
                ? dimInfo.__collectionResult.mapByGroup[groupByVal + '']
                : dimInfo.__collectionResult.outList[0];
            return val
                + upstream.retrieveValue(dataIndex, dimInfo.indexInUpstream)
                    / collectLine[dimInfo.getCollectionInfo('COUNT').indexInLine];
        },
        'Q1': function (val, upstream, dataIndex, dimInfo) {
            return val;
        },
        'Q2': function (val, upstream, dataIndex, dimInfo) {
            return val;
        },
        'Q3': function (val, upstream, dataIndex, dimInfo) {
            return val;
        }
    };
    function lineCreatorForQ(percent, dimInfo, groupByDimInfo, groupByVal) {
        var gatheredValues = groupByDimInfo
            ? dimInfo.gatheredValuesByGroup[groupByVal + '']
            : dimInfo.gatheredValuesNoGroup;
        return quantile(gatheredValues, percent);
    }

    exports.aggregate = transform$1;
    exports.id = transform;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map

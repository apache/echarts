(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : (global = global || self, factory(global.myTransform = {}));
})(this, function (exports) {
  'use strict';

  var transform = {
    type: 'myTransform:id',
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
  var arrayProto = Array.prototype;
  var nativeSlice = arrayProto.slice;

  var ctorFunction = function () {}.constructor;

  var protoFunction = ctorFunction ? ctorFunction.prototype : null;

  function bindPolyfill(func, context) {
    var args = [];

    for (var _i = 2; _i < arguments.length; _i++) {
      args[_i - 2] = arguments[_i];
    }

    return function () {
      return func.apply(context, args.concat(nativeSlice.call(arguments)));
    };
  }

  var bind = protoFunction && isFunction(protoFunction.bind) ? protoFunction.call.bind(protoFunction.bind) : bindPolyfill;

  function isFunction(value) {
    return typeof value === 'function';
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function hasOwn(own, prop) {
    return own.hasOwnProperty(prop);
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
  var METHOD_ALIAS = {
    MEDIAN: 'Q2'
  };
  var transform$1 = {
    type: 'myTransform:aggregate',
    transform: function (params) {
      var upstream = params.upstream;
      var config = params.config;
      var dimWrap = prepareDimensions(config, upstream);
      var resultDimInfoList = dimWrap.resultDimInfoList;
      var resultDimensions = dimWrap.resultDimensions;
      var groupByDimInfo = prepareGroupByDimInfo(config, upstream);
      var finalResult = travel(groupByDimInfo, upstream, resultDimInfoList, createResultLine, aggregateResultLine);
      return {
        dimensions: resultDimensions,
        data: finalResult.outList
      };
    }
  };

  function prepareDimensions(config, upstream) {
    var resultDimensionsConfig = config.resultDimensions;
    var resultDimInfoList = [];
    var resultDimensions = [];

    for (var i = 0; i < resultDimensionsConfig.length; i++) {
      var resultDimInfoConfig = resultDimensionsConfig[i];
      var resultDimInfo = upstream.getDimensionInfo(resultDimInfoConfig.from);
      assert(resultDimInfo, 'Can not find dimension by `from`: ' + resultDimInfoConfig.from);
      resultDimInfo.method = normalizeMethod(resultDimInfoConfig.method);
      assert(resultDimInfo.method, 'method is required');
      resultDimInfoList.push(resultDimInfo);

      if (resultDimInfoConfig.name != null) {
        resultDimInfo.name = resultDimInfoConfig.name;
      }

      resultDimensions.push(resultDimInfo.name);
    }

    return {
      resultDimensions: resultDimensions,
      resultDimInfoList: resultDimInfoList
    };
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

  function travel(groupByDimInfo, upstream, resultDimInfoList, doCreate, doAggregate) {
    var outList = [];
    var groupMap;

    if (groupByDimInfo) {
      groupMap = {};

      for (var dataIndex = 0, len = upstream.count(); dataIndex < len; dataIndex++) {
        var groupByVal = upstream.retrieveValue(dataIndex, groupByDimInfo.index);

        if (groupByVal == null) {
          continue;
        }

        var groupByValStr = groupByVal + '';

        if (!hasOwn(groupMap, groupByValStr)) {
          var newLine = doCreate(upstream, dataIndex, resultDimInfoList, groupByDimInfo, groupByVal);
          outList.push(newLine);
          groupMap[groupByValStr] = newLine;
        } else {
          var targetLine = groupMap[groupByValStr];
          doAggregate(upstream, dataIndex, targetLine, resultDimInfoList, groupByDimInfo);
        }
      }
    } else {
      var targetLine = doCreate(upstream, 0, resultDimInfoList);
      outList.push(targetLine);

      for (var dataIndex = 0, len = upstream.count(); dataIndex < len; dataIndex++) {
        doAggregate(upstream, dataIndex, targetLine, resultDimInfoList);
      }
    }

    return {
      groupMap: groupMap,
      outList: outList
    };
  }

  function normalizeMethod(method) {
    if (method == null) {
      return 'FIRST';
    }

    var methodInternal = method.toUpperCase();
    methodInternal = hasOwn(METHOD_ALIAS, methodInternal) ? METHOD_ALIAS[methodInternal] : methodInternal;
    assert(hasOwn(METHOD_INTERNAL, methodInternal), "Illegal method " + method + ".");
    return methodInternal;
  }

  var createResultLine = function (upstream, dataIndex, resultDimInfoList, groupByDimInfo, groupByVal) {
    var newLine = [];

    for (var j = 0; j < resultDimInfoList.length; j++) {
      var resultDimInfo = resultDimInfoList[j];
      var method = resultDimInfo.method;
      newLine[j] = groupByDimInfo && resultDimInfo.index === groupByDimInfo.index ? groupByVal : method === 'SUM' || method === 'COUNT' ? 0 : upstream.retrieveValue(dataIndex, resultDimInfo.index);
    }

    return newLine;
  };

  var aggregateResultLine = function (upstream, dataIndex, targetLine, resultDimInfoList, groupByDimInfo) {
    for (var j = 0; j < resultDimInfoList.length; j++) {
      var resultDimInfo = resultDimInfoList[j];
      var method = resultDimInfo.method;

      if (groupByDimInfo && resultDimInfo.index === groupByDimInfo.index) {
        continue;
      }

      if (method === 'SUM') {
        targetLine[j] += upstream.retrieveValue(dataIndex, resultDimInfo.index);
      } else if (method === 'COUNT') {
        targetLine[j] += 1;
      } else if (method === 'AVERAGE') {
        targetLine[j] += upstream.retrieveValue(dataIndex, resultDimInfo.index) / 1;
      }
    }
  };

  exports.aggregate = transform$1;
  exports.id = transform;
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
});
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ecSimpleOptionPlayer = {}));
}(this, (function (exports) { 'use strict';

    function assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
    function hasOwn(own, prop) {
        return own.hasOwnProperty(prop);
    }
    function isObject(value) {
        var type = typeof value;
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
    function getMapValue(map, key) {
        return (key != null && hasOwn(map, key)) ? map[key] : null;
    }

    function create(opt) {
        return new SimpleOptionPlayer(opt);
    }
    var SimpleOptionPlayer = (function () {
        function SimpleOptionPlayer(opt) {
            assert(opt.chart
                && isObject(opt.dataMeta)
                && isArray(opt.optionList)
                && opt.seriesIndex != null
                && opt.optionList.length);
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
        SimpleOptionPlayer.prototype.next = function () {
            var optionList = this._optionList;
            var newOptionIdx = this._currOptionIdx == null
                ? 0
                : Math.min(optionList.length - 1, this._currOptionIdx + 1);
            this._doChangeOption(newOptionIdx);
        };
        SimpleOptionPlayer.prototype.previous = function () {
            var optionList = this._optionList;
            var newOptionIdx = this._currOptionIdx == null
                ? optionList.length - 1
                : Math.max(0, this._currOptionIdx - 1);
            this._doChangeOption(newOptionIdx);
        };
        SimpleOptionPlayer.prototype.go = function (optionKey) {
            var newOptionIdx = getMapValue(this._optionMap, optionKey);
            assert(newOptionIdx != null, 'Can not find option by option key: ' + optionKey);
            this._doChangeOption(newOptionIdx);
        };
        SimpleOptionPlayer.prototype._doChangeOption = function (newOptionIdx) {
            var optionList = this._optionList;
            var oldOptionWrap = this._currOptionIdx != null ? optionList[this._currOptionIdx] : null;
            var newOptionWrap = optionList[newOptionIdx];
            var dataMeta = this._dataMeta;
            var targetSeriesIndex = this._seriesIndex;
            var transitionOpt = {
                to: { seriesIndex: targetSeriesIndex }
            };
            if (oldOptionWrap) {
                var common = findCommonDimension(oldOptionWrap, newOptionWrap)
                    || findCommonDimension(newOptionWrap, oldOptionWrap);
                if (common != null) {
                    transitionOpt = {
                        from: {
                            seriesIndex: targetSeriesIndex,
                            dimension: common.uniqueDimension
                        },
                        to: {
                            seriesIndex: targetSeriesIndex,
                            dimension: common.uniqueDimension,
                        },
                        dividingMethod: common.dividingMethod
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
                    return {
                        uniqueDimension: uniqueDimensionB,
                        dividingMethod: metaB.dividingMethod
                    };
                }
            }
        };
        SimpleOptionPlayer.prototype._getChart = function () {
            return isFunction(this._chart) ? this._chart() : this._chart;
        };
        SimpleOptionPlayer.prototype.getOptionKeys = function () {
            var optionKeys = [];
            var optionList = this._optionList;
            for (var i = 0; i < optionList.length; i++) {
                optionKeys.push(optionList[i].key);
            }
            return optionKeys;
        };
        return SimpleOptionPlayer;
    }());

    exports.create = create;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ecSimpleOptionPlayer.js.map

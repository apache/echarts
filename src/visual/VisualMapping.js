/**
 * @file Visual mapping.
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var zrColor = require('zrender/tool/color');
    var linearMap = require('../util/number').linearMap;
    var each = zrUtil.each;
    var isObject = zrUtil.isObject;

    /**
     * @param {Object} option
     * @param {string} [option.type] See visualHandlers.
     * @param {string} [option.dataNormalizer] 'linear' or 'piecewise' or 'category'
     * @param {Array.<number>=} [option.dataExtent] [minExtent, maxExtent],
     *                                              required when dataNormalizer is 'linear'
     * @param {Array.<Array>=} [option.intervals] [[min1, max1], [min2, max2], ...],
     *                                            required when dataNormalizer is 'piecewise'
     * @param {Array.<string>=} [option.categories] ['cate1', 'cate2', 'cate3', ...],
     *                                            required when dataNormalizer is 'category'
     * @param {Array.<Object>=} [option.specifiedVisuals] [visuals1, visuals2, ...],
     *                                            specific visual of some interval, available
     *                                            when dataNormalizer is 'piecewise' or 'category'
     * @param {(Array|Object)} [option.visual=] Visual data.
     *                                          object only when dataNormalizer is 'category',
     *                                          like: {cate1: '#222', none: '#fff'}
     */
    var VisualMapping = function (option) {
        var dataNormalizer = option.dataNormalizer;
        var visualType = option.type;

        /**
         * @readOnly
         * @type {string}
         */
        this.type = visualType;

        /**
         * @readOnly
         * @type {string}
         */
        this.dataNormalizer = dataNormalizer;

        // FIXME
        // 用 -1 做 key不太好。换种方式？至少参数初始化时候不要用-1。
        /**
         * @readOnly
         * @type {Object}
         */
        var thisOption = this.option = zrUtil.clone(option, true);
        thisOption.visual = this.option.visual;

        /**
         * @private
         * @type {Function}
         */
        this._normalizeData = dataNormalizers[dataNormalizer];

        /**
         * @private
         * @type {Function}
         */
        this._getSpecifiedVisual = zrUtil.bind(
            specifiedVisualGetters[dataNormalizer], this, visualType
        );

        zrUtil.extend(this, visualHandlers[visualType]);

        if (dataNormalizer === 'category') {
            preprocessForCategory(thisOption);
        }
    };

    VisualMapping.prototype = {

        constructor: VisualMapping,

        applyVisual: null,

        isValueActive: null,

        mapValueToVisual: null,

        _isCategory: function () {
            return this.option.dataNormalizer === 'category';
        }
    };

    var visualHandlers = VisualMapping.visualHandlers = {

        color: {

            applyVisual: defaultApplyColor,

            // value:
            // (1) {number}
            // (2) {Array.<number>} Represents a interval, for colorStops.
            // Return type:
            // (1) {string} color value like '#444'
            // (2) {Array.<Object>} colorStops,
            // like [{color: '#fff', offset: 0}, {color: '#444', offset: 1}]
            // where offset is between 0 and 1.
            mapValueToVisual: function (value) {
                var visual = this.option.visual;

                if (zrUtil.isArray(value)) {
                    value = [
                        this._normalizeData(value[0]),
                        this._normalizeData(value[1])
                    ];

                    // For creating graduate color list.
                    return zrColor.mapIntervalToColor(value, visual);
                }
                else {
                    var normalized = this._normalizeData(value);
                    var result = this._getSpecifiedVisual(normalized);

                    if (result == null) {
                        result = this._isCategory()
                            ? visual[normalized]
                            : zrColor.mapToColor(normalized, visual);
                    }

                    return result;
                }
            }
        },

        // FIXME
        // 和category一样？
        colorByIndex: {

            applyVisual: defaultApplyColor,

            mapValueToVisual: function (index) {
                var visual = this.option.visual;
                return visual[index % visual.length];
            }
        },

        colorS: makePartialColorVisualHandler(function (color, value) {
            return zrColor.modifyHSL(color, null, value);
        }),

        colorL: makePartialColorVisualHandler(function (color, value) {
            return zrColor.modifyHSL(color, null, null, value);
        }),

        colorA: makePartialColorVisualHandler(function (color, value) {
            return zrColor.modifyAlpha(color, value);
        }),

        symbol: {
            applyVisual: function (value, getter, setter) {
                var symbolCfg = this.mapValueToVisual(value);
                if (zrUtil.isString(symbolCfg)) {
                    setter('symbol', symbolCfg);
                }
                else if (isObject(symbolCfg)) {
                    for (var name in symbolCfg) {
                        if (symbolCfg.hasOwnProperty(name)) {
                            setter(name, symbolCfg[name]);
                        }
                    }
                }
            },

            mapValueToVisual: function (value) {
                var normalized = this._normalizeData(value);
                var result = this._getSpecifiedVisual(normalized);
                var visual = this.option.visual;

                if (result == null) {
                    result = this._isCategory()
                        ? visual[normalized]
                        : (arrayGetByNormalizedValue(visual, normalized) || {});
                }

                return result;
            }
        },

        symbolSize: {
            applyVisual: function (value, getter, setter) {
                setter('symbolSize', this.mapValueToVisual(value));
            },

            mapValueToVisual: function (value) {
                var normalized = this._normalizeData(value);
                var result = this._getSpecifiedVisual(normalized);
                var visual = this.option.visual;

                if (result == null) {
                    result = this._isCategory()
                        ? visual[normalized]
                        : linearMap(normalized, [0, 1], visual, true);
                }

                return result;
            }
        }
    };

    function preprocessForCategory(thisOption) {
        // Hash categories.
        var categories = thisOption.categories;
        var categoryMap = thisOption.categoryMap = {};
        each(categories, function (cate, index) {
            categoryMap[cate] = index;
        });

        // Process visual map input.
        var visual = thisOption.visual;
        if (!zrUtil.isArray(visual)) { // Is object.
            var visualArr = [];
            each(visual, function (v, cate) {
                var index = categoryMap[cate];
                // '-1' means default visaul.
                visualArr[index != null ? index : '-1'] = v;
            });
            visual = thisOption.visual = visualArr;
        }

        // Remove categories that has no visual,
        // then we can mapping them to '-1' visual.
        for (var i = categories.length - 1; i >= 0; i--) {
            if (visual[i] == null) {
                delete categoryMap[categories[i]];
                categories.pop();
            }
        }
    }

    function makePartialColorVisualHandler(applyValue) {
        return {

            applyVisual: function (value, getter, setter) {
                // color can be {string} or {Array.<Object>} (for gradient color stops)
                var color = getter('color');
                var isArrayValue = zrUtil.isArray(value);
                value = isArrayValue
                    ? [this.mapValueToVisual(value[0]), this.mapValueToVisual(value[1])]
                    : this.mapValueToVisual(value);

                if (zrUtil.isArray(color)) {
                    for (var i = 0, len = color.length; i < len; i++) {
                        color[i].color = applyValue(
                            color[i].color, isArrayValue ? value[i] : value
                        );
                    }
                }
                else {
                    // Must not be array value
                    setter('color', applyValue(color, value));
                }
            },

            mapValueToVisual: function (value) {
                var normalized = this._normalizeData(value);
                var result = this._getSpecifiedVisual(normalized);
                var visual = this.option.visual;

                if (result == null) {
                    result = this._isCategory()
                        ? visual[normalized]
                        : linearMap(normalized, [0, 1], visual, true);
                }

                return result;
            }
        };
    }

    function arrayGetByNormalizedValue(arr, normalized) {
        return arr[
            Math.round(linearMap(normalized, [0, 1], [0, arr.length - 1], true))
        ];
    }

    function defaultApplyColor(value, getter, setter) {
        setter('color', this.mapValueToVisual(value));
    }


    var dataNormalizers = {

        linear: function (value) {
            return linearMap(value, this.option.dataExtent, [0, 1], true);
        },

        piecewise: function (value) {
            var intervals = this.option.intervals;
            var len = intervals.length;

            for (var i = 0, interval; i < len; i++) {
                if ((interval = intervals[i])
                    && interval[0] <= value
                    && value <= interval[1]
                ) {
                    return linearMap(i, [0, len - 1], [0, 1], true);
                }
            }
        },

        category: function (value) {
            var index = this.option.categoryMap[value];
            return index == null ? -1 : index;
        }
    };


    var specifiedVisualGetters = {

        linear: zrUtil.noop, // Linear do not support this feature.

        piecewise: function (visualType, normalized) {
            var specifiedVisuals = this.option.specifiedVisuals;
            if (specifiedVisuals && specifiedVisuals.length) {
                var visual = arrayGetByNormalizedValue(specifiedVisuals, normalized);
                if (visual) {
                    return visual[visualType];
                }
            }
        },

        category: function (visualType, categoryIndex) {
            var specifiedVisuals = this.option.specifiedVisuals;
            var visual;
            if (specifiedVisuals && (visual = specifiedVisuals[categoryIndex])) {
                return visual[visualType];
            }
        }
    };

    /**
     * @public
     */
    VisualMapping.addDataNormalizer = function (name, normalizer) {
        dataNormalizers[name] = normalizer;
    };

    /**
     * @public
     */
    VisualMapping.addVisualHandler = function (name, handler) {
        visualHandlers[name] = handler;
    };

    /**
     * @public
     */
    VisualMapping.isValidType = function (visualType) {
        return visualHandlers.hasOwnProperty(visualType);
    };

    /**
     * @public
     */
    VisualMapping.getDefault = function (visualType, key, isCategory) {
        var value = (defaultOption[visualType] || {})[key];

        return VisualMapping.makeDefault(
            value != null ? zrUtil.clone(value, true) : null,
            isCategory
        );
    };

    /**
     * @public
     */
    VisualMapping.makeDefault = function (value, isCategory) {
        if (isCategory && zrUtil.isArray(value) && value.length) {
            var def = [];
            def[-1] = value[value.length - 1];
            return def;
        }
        else {
            return value;
        }
    };

    /**
     * @public
     */
    VisualMapping.eachVisual = function (visual, callback, context) {
        for (var i in visual) { // jshint ignore:line
            // visual can be Object or Array, Considering key: -1.
            callback.call(context, visual[i], i);
        }
    };

    /**
     * @public
     * @param {string} visualType
     * @return {boolean}
     */
    VisualMapping.isInVisualCategory = function (visualType, visualCategory) {
        return visualCategory === 'color'
            ? !!(visualType && visualType.indexOf(visualCategory) === 0)
            : visualType === visualCategory;
    };

    /**
     * @public
     * @param {Object} obj
     * @return {Oject} new object containers visual values.
     */
    VisualMapping.retrieveVisuals = function (obj) {
        var ret = {};

        obj && each(visualHandlers, function (h, visualType) {
            if (obj.hasOwnProperty(visualType)) {
                ret = obj[visualType];
            }
        });

        return ret;
    };

    /**
     * Give order to visual types, considering colorS, colorA depends on color.
     *
     * @public
     * @param {(Object|Array)} visualTypes If Object, like: {color: ..., colorS: ...}
     *                                     IF Array, like: ['color', 'symbol', 'colorS']
     * @return {Array.<string>} Sorted visual types.
     */
    VisualMapping.prepareVisualTypes = function (visualTypes) {
        if (isObject(visualTypes)) {
            var types = [];
            each(visualTypes, function (item, type) {
                types.push(type);
            });
            visualTypes = types;
        }
        else if (zrUtil.isArray(visualTypes)) {
            visualTypes = visualTypes.slice();
        }
        else {
            return [];
        }

        visualTypes.sort(function (type1, type2) {
            // color should be front of colorS, colorA, ...
            // symbol and symbolSize do not matter.
            return (type2 === 'color' && type1 !== 'color' && type1.indexOf('color') === 0)
                ? 1 : -1;
        });

        return visualTypes;
    };

    var defaultOption = {

        color: {
            active: ['#006edd', '#e0ffff'],
            inactive: ['rgba(0,0,0,0)']
        },

        colorS: {
            active: [0.3, 1],
            inactive: [0, 0]
        },

        colorL: {
            active: [0.9, 0.5],
            inactive: [0, 0]
        },

        colorA: {
            active: [0.3, 1],
            inactive: [0, 0]
        },

        symbol: {
            active: ['circle', 'roundRect', 'diamond'],
            inactive: ['none']
        },

        symbolSize: {
            active: [10, 50],
            inactive: [0, 0]
        }
    };

    return VisualMapping;

});

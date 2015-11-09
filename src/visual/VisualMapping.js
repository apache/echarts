/**
 * @file Visual mapping.
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var zrColor = require('zrender/tool/color');
    var linearMap = require('../util/number').linearMap;
    var each = zrUtil.each;
    var isObject = zrUtil.isObject;

    var CATEGORY_DEFAULT_VISUAL_INDEX = -1;

    /**
     * @param {Object} option
     * @param {string} [option.type] See visualHandlers.
     * @param {string} [option.mappingMethod] 'linear' or 'piecewise' or 'category'
     * @param {Array.<number>=} [option.dataExtent] [minExtent, maxExtent],
     *                                              required when mappingMethod is 'linear'
     * @param {Array.<Array>=} [option.intervals] [[min1, max1], [min2, max2], ...],
     *                                            required when mappingMethod is 'piecewise'
     * @param {Array.<string>=} [option.categories] ['cate1', 'cate2', 'cate3', ...],
     *                                            required when mappingMethod is 'category'.
     *                                            If no option.categories, it represents
     *                                            categories is [0, 1, 2, ...].
     * @param {boolean} [option.loop=false] Whether loop mapping when mappingMethod is 'category'.
     * @param {Array.<Object>=} [option.specifiedVisuals] [visuals1, visuals2, ...],
     *                                            specific visual of some interval, available
     *                                            when mappingMethod is 'piecewise' or 'category'
     * @param {(Array|Object|*)} [option.visual]  Visual data.
     *                                            when mappingMethod is 'category',
     *                                            visual data can be array or object
     *                                            (like: {cate1: '#222', none: '#fff'})
     *                                            or primary types (which represents
     *                                            defualt category visual), otherwise visual
     *                                            can only be array.
     *
     */
    var VisualMapping = function (option) {
        var mappingMethod = option.mappingMethod;
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
        this.mappingMethod = mappingMethod;

        /**
         * @readOnly
         * @type {Object}
         */
        var thisOption = this.option = zrUtil.clone(option, true);

        /**
         * @private
         * @type {Function}
         */
        this._normalizeData = normalizers[mappingMethod];

        /**
         * @private
         * @type {Function}
         */
        this._getSpecifiedVisual = zrUtil.bind(
            specifiedVisualGetters[mappingMethod], this, visualType
        );

        zrUtil.extend(this, visualHandlers[visualType]);

        if (mappingMethod === 'category') {
            preprocessForCategory(thisOption);
        }
    };

    VisualMapping.prototype = {

        constructor: VisualMapping,

        applyVisual: null,

        isValueActive: null,

        mapValueToVisual: null
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
                        result = isCategory(this)
                            ? getVisualForCategory(this, visual, normalized)
                            : zrColor.mapToColor(normalized, visual);
                    }

                    return result;
                }
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
                    result = isCategory(this)
                        ? getVisualForCategory(this, visual, normalized)
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
                    result = isCategory(this)
                        ? getVisualForCategory(this, visual, normalized)
                        : linearMap(normalized, [0, 1], visual, true);
                }
                return result;
            }
        }
    };

    function preprocessForCategory(thisOption) {
        // Hash categories.
        var categories = thisOption.categories;
        var visual = thisOption.visual;
        var isVisualArray = zrUtil.isArray(visual);

        if (!categories) {
            if (!isVisualArray) {
                // visual should be array when no categories.
                throw new Error();
            }
            else {
                return;
            }
        }

        var categoryMap = thisOption.categoryMap = {};
        each(categories, function (cate, index) {
            categoryMap[cate] = index;
        });

        // Process visual map input.
        if (!isVisualArray) {
            var visualArr = [];

            if (zrUtil.isObject(visual)) {
                each(visual, function (v, cate) {
                    var index = categoryMap[cate];
                    visualArr[index != null ? index : CATEGORY_DEFAULT_VISUAL_INDEX] = v;
                });
            }
            else { // Is primary type, represents default visual.
                visualArr[CATEGORY_DEFAULT_VISUAL_INDEX] = visual;
            }

            visual = thisOption.visual = visualArr;
        }

        // Remove categories that has no visual,
        // then we can mapping them to CATEGORY_DEFAULT_VISUAL_INDEX.
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
                    result = isCategory(this)
                        ? getVisualForCategory(this, visual, normalized)
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

    function getVisualForCategory(me, visual, normalized) {
        return visual[
            (me.option.loop && normalized !== CATEGORY_DEFAULT_VISUAL_INDEX)
                ? normalized % visual.length
                : normalized
        ];
    }

    function isCategory(me) {
        return me.option.mappingMethod === 'category';
    }


    var normalizers = {

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
            var index = this.option.categories
                ? this.option.categoryMap[value]
                : value; // ordinal
            return index == null ? CATEGORY_DEFAULT_VISUAL_INDEX : index;
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
     * Convinent method.
     * Visual can be Object or Array or primary type.
     *
     * @public
     */
    VisualMapping.eachVisual = function (visual, callback, context) {
        if (zrUtil.isObject(visual)) {
            zrUtil.each(visual, callback, context);
        }
        else {
            callback.call(context, visual);
        }
    };

    VisualMapping.mapVisual = function (visual, callback, context) {
        var isPrimary;
        var newVisual = zrUtil.isArray(visual)
            ? []
            : zrUtil.isObject(visual)
            ? {}
            : (isPrimary = true, null);

        VisualMapping.eachVisual(visual, function (v, key) {
            var newVal = callback.call(context, v, key);
            isPrimary ? (newVisual = newVal) : (newVisual[key] = newVal);
        });
        return newVisual;
    };

    /**
     * 'color', 'colorS', 'colorA', ... are in the same visualCluster named 'color'.
     * Other visuals are in the cluster named as the same as theirselves.
     *
     * @public
     * @param {string} visualType
     * @param {string} visualCluster
     * @return {boolean}
     */
    VisualMapping.isInVisualCluster = function (visualType, visualCluster) {
        return visualCluster === 'color'
            ? !!(visualType && visualType.indexOf(visualCluster) === 0)
            : visualType === visualCluster;
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

    return VisualMapping;

});

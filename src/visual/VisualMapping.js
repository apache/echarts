/**
 * @file Visual mapping.
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var zrColor = require('zrender/tool/color');
    var linearMap = require('../util/number').linearMap;

    /**
     * @param {Object} option
     * @param {string} [option.type] See visualHandlers.
     * @param {string} [option.dataNormalizer] 'linear' or 'piecewise'
     * @param {Array.<number>=} [option.dataExtent] [minExtent, maxExtent],
     *                                              required when dataNormalizer is 'linear'
     * @param {Array.<Array>=} [option.intervals] [[min1, max1], [min2, max2], ...],
     *                                            required when dataNormalizer is 'piecewise'
     * @param {Array.<Array>=} [option.intervalVisual] [value1, value2, ...],
     *                                            specific visual of some interval,
     *                                            available when dataNormalizer is 'piecewise'
     * @param {Array} [option.visual=] Visual data.
     */
    var VisualMapping = function (option) {

        /**
         * @readOnly
         * @type {string}
         */
        this.type = option.type;

        /**
         * @readOnly
         * @type {Object}
         */
        this.option = zrUtil.clone(option, true);

        /**
         * @private
         * @type {Function}
         */
        this._normalizeData = dataNormalizers[option.dataNormalizer];

        zrUtil.extend(this, visualHandlers[option.type]);
    };

    VisualMapping.prototype = {

        constructor: VisualMapping,

        applyVisual: null,

        isValueActive: null,

        mapValueToVisual: null,

        _getIntervalVisual: function(normalized) {
            var intervalVisuals = this.option.intervalVisuals;
            return (intervalVisuals && intervalVisuals.length)
                ? arrayGetByNormalizedValue(intervalVisuals, normalized)
                : null;
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
                var optionData = this.option.visual;

                if (zrUtil.isArray(value)) {
                    value = [
                        this._normalizeData(value[0]),
                        this._normalizeData(value[1])
                    ];

                    // For creating graduate color list.
                    return zrColor.mapIntervalToColor(value, optionData);
                }
                else {
                    var normalized = this._normalizeData(value);
                    var specifiedVisual = this._getIntervalVisual(normalized);

                    return specifiedVisual != null
                        ? specifiedVisual
                        : zrColor.mapToColor(normalized, optionData);
                }
            }
        },

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
                else if (zrUtil.isObject(symbolCfg)) {
                    for (var name in symbolCfg) {
                        if (symbolCfg.hasOwnProperty(name)) {
                            setter(name, symbolCfg[name]);
                        }
                    }
                }
            },

            mapValueToVisual: function (value) {
                var normalized = this._normalizeData(value);
                var specifiedVisual = this._getIntervalVisual(normalized);

                return specifiedVisual != null
                    ? specifiedVisual
                    : (arrayGetByNormalizedValue(this.option.visual, normalized) || {});
            }
        },

        symbolSize: {
            applyVisual: function (value, getter, setter) {
                setter('symbolSize', this.mapValueToVisual(value));
            },

            mapValueToVisual: function (value) {
                var normalized = this._normalizeData(value);
                var specifiedVisual = this._getIntervalVisual(normalized);

                return specifiedVisual != null
                    ? specifiedVisual
                    : linearMap(normalized, [0, 1], this.option.visual, true);
            }
        }
    };

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
                var specifiedVisual = this._getIntervalVisual(normalized);

                return specifiedVisual != null
                    ? specifiedVisual
                    : linearMap(normalized, [0, 1], this.option.visual, true);
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
    VisualMapping.getDefault = function (visualType, key) {
        var value = (defaultOption[visualType] || {})[key];
        return value != null ? zrUtil.clone(value, true) : null;
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
     * Give order to visual types, considering colorS, colorA depends on color.
     *
     * @public
     * @param {(Object|Array)} visualTypes If Object, like: {color: ..., colorS: ...}
     *                                     IF Array, like: ['color', 'symbol', 'colorS']
     * @return {Array.<string>} Sorted visual types.
     */
    VisualMapping.prepareVisualTypes = function (visualTypes) {
        if (zrUtil.isObject(visualTypes)) {
            var types = [];
            zrUtil.each(visualTypes, function (item, type) {
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

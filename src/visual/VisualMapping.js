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
     * @param {Array.<number>=} [option.dataExtent=] [minExtent, maxExtent],
     *                                              required when dataNormalizer is 'linear'
     * @param {Array.<Array>=} [option.intervals=] [[min1, max1], [min2, max2], ...],
     *                                            required when dataNormalizer is 'piecewise'
     * @param {Array.<Array>=} [option.intervalVisual=] [value1, value2, ...],
     *                                            specific visual of some interval,
     *                                            available when dataNormalizer is 'piecewise'
     * @param {Array} [option.data=] Visual data.
     */
    var VisualMapping = function (option) {

        /**
         * @readOnly
         */
        this.type = option.type;

        /**
         * @readOnly
         */
        this.option = zrUtil.clone(option, true);

        /**
         * @private
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

            applyVisual: function (value, data, index) {
                data.setItemVisual(index, 'color', this.mapValueToVisual(value));
            },

            mapValueToVisual: function (value) {
                var normalized = this._normalizeData(value);
                var specifiedVisual = this._getIntervalVisual(normalized);

                return specifiedVisual != null
                    ? specifiedVisual
                    : zrColor.mapToColor(normalized, this.option.data);
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

            applyVisual: function (value, data, index) {
                var symbolCfg = this.mapValueToVisual(value);
                if (typeof symbolCfg === 'string') {
                    symbolCfg = {symbol: symbolCfg};
                }
                data.setItemVisual(index, symbolCfg);
            },

            mapValueToVisual: function (value) {
                var normalized = this._normalizeData(value);
                var specifiedVisual = this._getIntervalVisual(normalized);

                return specifiedVisual != null
                    ? specifiedVisual
                    : (arrayGetByNormalizedValue(this.option.data, normalized) || {});
            }
        }
    };

    function makePartialColorVisualHandler(applyValue) {
        return {
            applyVisual: function (value, data, index) {
                var color = data.getItemVisual(index, 'color');
                color = applyValue(color, this.mapValueToVisual(value));
                data.setItemVisual(index, 'color', color);
            },

            mapValueToVisual: function (value) {
                var normalized = this._normalizeData(value);
                var specifiedVisual = this._getIntervalVisual(normalized);

                return specifiedVisual != null
                    ? specifiedVisual
                    : linearMap(normalized, [0, 1], this.option.data, true);
            }
        };
    }

    function arrayGetByNormalizedValue(arr, normalized) {
        return arr[
            Math.round(linearMap(normalized, [0, 1], [0, arr.length - 1], true))
        ];
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
    VisualMapping.defaultOption = {

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
        }
    };

    return VisualMapping;

});

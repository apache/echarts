/**
 * @file Brush model
 */
define(function(require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');

    var BrushModel = echarts.extendComponentModel({

        type: 'brush',

        dependencies: ['series'],

        /**
         * @protected
         */
        defaultOption: {
            inBrush: {
            },
            outOfBrush: {
                color: '#ddd'
            },
            toolbox: null,          // Default value see preprocessor.
            brushLink: null,        // Series indices array,
                                    // or 'all', which means all series.

            brushRanges: null,      // Array.<Object>, Initial brushRanges, which is not persistent.

            brushType: 'rect',      // Default brushType, see BrushController.
            brushMode: 'single',    // Default brushMode, 'single' or 'multiple'
            transformable: true,    // Default transformable.
            // FIXME
            // 是否要配置 brush 控制哪些 series？
            brushStyle: {           // Default brushStyle
                // lineWidth: 2,
                // stroke: 'rgba(0,0,0,0.3)',
                fill: 'rgba(0,0,0,0.15)'
            }
        },

        /**
         * @readOnly
         * @type {Array.<Object>} ranges
         */
        brushRanges: [],

        /**
         * Current activated brush type.
         * If null, brush is inactived.
         * see module:echarts/component/helper/BrushController
         * @readOnly
         * @type {string}
         */
        brushType: null,

        /**
         * Current brush opt.
         * see module:echarts/component/helper/BrushController
         * @readOnly
         * @type {Object}
         */
        brushOption: {},

        /**
         * @override
         */
        optionUpdated: function (newOption, isInit) {
            var thisOption = this.option;
            var initBrushRanges = thisOption.brushRanges;

            // Should not keep it, considering setOption next time.
            thisOption.brushRanges = null;

            initBrushRanges && this.setBrushRanges(initBrushRanges);
        },

        /**
         * @param {Array.<Object>} ranges
         */
        setBrushRanges: function (brushRanges) {

            if (__DEV__) {
                zrUtil.assert(zrUtil.isArray(brushRanges));
                zrUtil.each(brushRanges, function (brushRange) {
                    zrUtil.assert(brushRange.brushType && brushRange.range, 'Illegal brushRanges');
                });
            }

            this.brushRanges = zrUtil.map(brushRanges, function (brushRange) {
                return this._mergeBrushOption(brushRange);
            }, this);
        },

        /**
         * see module:echarts/component/helper/BrushController
         * @param {Object} brushOption
         */
        setBrushOption: function (brushOption) {
            this.brushOption = this._mergeBrushOption(brushOption);
            this.brushType = this.brushOption.brushType;
        },

        /**
         * @private
         */
        _mergeBrushOption: function (brushOption) {
            var option = this.option;
            return zrUtil.merge(
                {
                    brushType: option.brushType,
                    brushMode: option.brushMode,
                    transformable: option.transformable,
                    brushStyle: option.brushStyle
                },
                brushOption,
                true
            );
        }

    });

    return BrushModel;

});
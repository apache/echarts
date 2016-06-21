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
            brushLink: null,        // Series indices array, broadcast using dataIndex.
                                    // or 'all', which means all series.
            seriesIndex: 'all',     // seriesIndex array, specify series controlled by this brush component.
            gridIndex: null,        //
            geoIndex: null,         //

            brushType: 'rect',      // Default brushType, see BrushController.
            brushMode: 'single',    // Default brushMode, 'single' or 'multiple'
            transformable: true,    // Default transformable.
            brushStyle: {           // Default brushStyle
                // lineWidth: 2,
                // stroke: 'rgba(0,0,0,0.3)',
                fill: 'rgba(0,0,0,0.15)'
            },

            throttleType: 'fixRate',// Throttle in brushSelected event. 'fixRate' or 'debounce'.
                                    // If null, no throttle. Valid only in the first brush component
            throttleDelay: 0,       // Unit: ms, 0 means every event will be triggered.

            // FIXME
            // 试验效果
            removeOnClick: true
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
         * If ranges is null/undefined, range state remain.
         *
         * @param {Array.<Object>} [ranges]
         */
        setBrushRanges: function (brushRanges) {
            if (__DEV__) {
                zrUtil.assert(zrUtil.isArray(brushRanges));
                zrUtil.each(brushRanges, function (brushRange) {
                    zrUtil.assert(brushRange.brushType, 'Illegal brushRanges');
                });
            }

            // If ranges is null/undefined, range state remain.
            // This helps user to dispatchAction({type: 'brush'}) with no brushRanges
            // set but just want to get the current brush select info from a `brush` event.
            if (!brushRanges) {
                return;
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
                    brushStyle: option.brushStyle,
                    removeOnClick: option.removeOnClick
                },
                brushOption,
                true
            );
        }

    });

    return BrushModel;

});
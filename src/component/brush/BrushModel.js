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
            brushType: 'rect',
            brushStyle: {
                // lineWidth: 2,
                // stroke: 'rgba(0,0,0,0.3)',
                fill: 'rgba(0,0,0,0.15)'
            },
            brushMode: 'single', // 'single' or 'multiple'
            transformable: true,
            // FIXME
            // 是否要配置 brush 控制哪些 series？
            brushLink: null     // Series indices array,
                                // or 'all', which means all series.
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
         * @param {Array.<Object>} ranges
         */
        setBrushRanges: function (brushRanges) {
            this.brushRanges = brushRanges;
        },

        /**
         * see module:echarts/component/helper/BrushController
         * @param {Object} brushOption
         */
        setBrushOption: function (brushOption) {
            var option = this.option;

            this.brushOption = zrUtil.merge(
                {
                    brushType: option.brushType,
                    brushMode: option.brushMode,
                    transformable: option.transformable,
                    brushStyle: option.brushStyle
                },
                brushOption,
                true
            );

            this.brushType = this.brushOption.brushType;
        }

    });

    return BrushModel;

});
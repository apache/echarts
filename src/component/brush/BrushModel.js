/**
 * @file Brush model
 */
define(function(require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var visualSolution = require('../../visual/visualSolution');
    var Model = require('../../model/Model');

    var BrushModel = echarts.extendComponentModel({

        type: 'brush',

        dependencies: ['geo', 'grid', 'xAxis', 'yAxis', 'parallel', 'series'],

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
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.3)',
                color: 'rgba(0,0,0,0.15)',
                width: null         // do not use bursh width in line brush, but fetch from grid.
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
         * @readOnly
         * @type {Array.<Object>}
         */
        coordInfoList: [],

        init: function (option) {
            var newOption = zrUtil.clone(option);
            BrushModel.superApply(this, 'init', arguments);
            visualSolution.replaceVisualOption(this.option, newOption, ['inBrush', 'outOfBrush']);
        },

        mergeOption: function (newOption) {
            // FIXME init will pass a null newOption
            visualSolution.replaceVisualOption(
                this.option, newOption, ['inBrush', 'outOfBrush']
            );
            BrushModel.superApply(this, 'mergeOption', arguments);
        },

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
                    brushStyle: new Model(option.brushStyle).getItemStyle(),
                    removeOnClick: option.removeOnClick
                },
                brushOption,
                true
            );
        }

    });

    return BrushModel;

});
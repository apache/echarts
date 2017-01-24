/**
 * @file Brush model
 */
define(function(require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var visualSolution = require('../../visual/visualSolution');
    var Model = require('../../model/Model');

    var DEFAULT_OUT_OF_BRUSH_COLOR = ['#ddd'];

    var BrushModel = echarts.extendComponentModel({

        type: 'brush',

        dependencies: ['geo', 'grid', 'xAxis', 'yAxis', 'parallel', 'series'],

        /**
         * @protected
         */
        defaultOption: {
            // inBrush: null,
            // outOfBrush: null,
            toolbox: null,          // Default value see preprocessor.
            brushLink: null,        // Series indices array, broadcast using dataIndex.
                                    // or 'all', which means all series. 'none' or null means no series.
            seriesIndex: 'all',     // seriesIndex array, specify series controlled by this brush component.
            geoIndex: null,         //
            xAxisIndex: null,
            yAxisIndex: null,

            brushType: 'rect',      // Default brushType, see BrushController.
            brushMode: 'single',    // Default brushMode, 'single' or 'multiple'
            transformable: true,    // Default transformable.
            brushStyle: {           // Default brushStyle
                borderWidth: 1,
                color: 'rgba(120,140,180,0.3)',
                borderColor: 'rgba(120,140,180,0.8)',
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
         * @type {Array.<Object>}
         */
        areas: [],

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

        optionUpdated: function (newOption, isInit) {
            var thisOption = this.option;

            !isInit && visualSolution.replaceVisualOption(
                thisOption, newOption, ['inBrush', 'outOfBrush']
            );

            thisOption.inBrush = thisOption.inBrush || {};
            // Always give default visual, consider setOption at the second time.
            thisOption.outOfBrush = thisOption.outOfBrush || {color: DEFAULT_OUT_OF_BRUSH_COLOR};
        },

        /**
         * If ranges is null/undefined, range state remain.
         *
         * @param {Array.<Object>} [ranges]
         */
        setAreas: function (areas) {
            if (__DEV__) {
                zrUtil.assert(zrUtil.isArray(areas));
                zrUtil.each(areas, function (area) {
                    zrUtil.assert(area.brushType, 'Illegal areas');
                });
            }

            // If ranges is null/undefined, range state remain.
            // This helps user to dispatchAction({type: 'brush'}) with no areas
            // set but just want to get the current brush select info from a `brush` event.
            if (!areas) {
                return;
            }

            this.areas = zrUtil.map(areas, function (area) {
                return generateBrushOption(this.option, area);
            }, this);
        },

        /**
         * see module:echarts/component/helper/BrushController
         * @param {Object} brushOption
         */
        setBrushOption: function (brushOption) {
            this.brushOption = generateBrushOption(this.option, brushOption);
            this.brushType = this.brushOption.brushType;
        }

    });

    function generateBrushOption(option, brushOption) {
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

    return BrushModel;

});
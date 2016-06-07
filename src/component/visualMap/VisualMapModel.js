/**
 * @file Visual map model
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var env = require('zrender/core/env');
    var echarts = require('../../echarts');
    var modelUtil = require('../../util/model');
    var VisualMapping = require('../../visual/VisualMapping');
    var each = zrUtil.each;

    var VisualMapModel = echarts.extendComponentModel({

        type: 'visualMap',

        dependencies: ['series'],

        /**
         * @readOnly
         * @type {Array.<string>}
         */
        stateList: [],

        /**
         * @readOnly
         * @type {Array.<string>}
         */
        replacableOptionKeys: [],

        /**
         * @protected
         */
        defaultOption: {
            seriesIndex: null        // 所控制的series indices，默认所有有value的series.
        },

        /**
         * @protected
         */
        init: function (option, parentModel, ecModel) {
            this.mergeDefaultAndTheme(option, ecModel);
        },

        /**
         * @protected
         */
        optionUpdated: function (newOption, isInit) {
            var thisOption = this.option;

            !isInit && replaceVisualOption(thisOption, newOption, this.replacableOptionKeys);

            // FIXME
            // necessary?
            // Disable realtime view update if canvas is not supported.
            if (!env.canvasSupported) {
                thisOption.realtime = false;
            }
        },

        /**
         * @protected
         */
        resetTargetSeries: function () {
            var thisOption = this.option;
            var allSeriesIndex = thisOption.seriesIndex == null;
            thisOption.seriesIndex = allSeriesIndex
                ? [] : modelUtil.normalizeToArray(thisOption.seriesIndex);

            allSeriesIndex && this.ecModel.eachSeries(function (seriesModel, index) {
                thisOption.seriesIndex.push(index);
            });
        },

        /**
         * @protected
         * @param {string} baseAttr Attr in option
         * @param {Object} visualMappings <visualType, module:echarts/visual/VisualMapping>
         * @param {Function} [fillVisualOption]
         */
        resetVisual: function (baseAttr, visualMappings, fillVisualOption) {
            each(this.stateList, function (state) {

                var mappings = visualMappings[state] || (
                    visualMappings[state] = createMappings()
                );
                var visaulOption = this.option[baseAttr][state] || {};

                each(visaulOption, function (visualData, visualType) {
                    if (!VisualMapping.isValidType(visualType)) {
                        return;
                    }
                    var mappingOption = {
                        type: visualType,
                        visual: visualData
                    };
                    fillVisualOption && fillVisualOption.call(this, mappingOption, state);
                    mappings[visualType] = new VisualMapping(mappingOption);

                    // Prepare a alpha for opacity, for some case that opacity
                    // is not supported, such as rendering using gradient color.
                    if (baseAttr === 'controller' && visualType === 'opacity') {
                        mappingOption = zrUtil.clone(mappingOption);
                        mappingOption.type = 'colorAlpha';
                        mappings.__hidden.__alphaForOpacity = new VisualMapping(mappingOption);
                    }
                }, this);

            }, this);

            function createMappings() {
                var Creater = function () {};
                // Make sure hidden fields will not be visited by
                // object iteration (with hasOwnProperty checking).
                Creater.prototype.__hidden = Creater.prototype;
                var obj = new Creater();
                return obj;
            }
        },

        /**
         * @public
         */
        eachTargetSeries: function (callback, context) {
            zrUtil.each(this.option.seriesIndex, function (seriesIndex) {
                callback.call(context, this.ecModel.getSeriesByIndex(seriesIndex));
            }, this);
        },

        /**
         * @public
         * @abstract
         */
        setSelected: zrUtil.noop,

        /**
         * @public
         * @abstract
         */
        getValueState: zrUtil.noop

    });

    function replaceVisualOption(thisOption, newOption, replacableOptionKeys) {
        // Visual attributes merge is not supported, otherwise it
        // brings overcomplicated merge logic. See #2853. So if
        // newOption has anyone of these keys, all of these keys
        // will be reset. Otherwise, all keys remain.
        var has;
        zrUtil.each(replacableOptionKeys, function (key) {
            if (newOption.hasOwnProperty(key)) {
                has = true;
            }
        });
        has && zrUtil.each(replacableOptionKeys, function (key) {
            if (newOption.hasOwnProperty(key)) {
                thisOption[key] = zrUtil.clone(newOption[key]);
            }
            else {
                delete thisOption[key];
            }
        });
    }

    return VisualMapModel;

});
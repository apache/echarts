/**
 * ECharts option manager
 *
 * @module {echarts/model/OptionManager}
 */

define(function (require) {

    var zrUtil = require('zrender/core/util');
    var each = zrUtil.each;

    /**
     * TERM EXPLANATIONS:
     *
     * [option]:
     *
     *     An object that contains definitions of components. For example:
     *     var option = {
     *         title: {...},
     *         legend: {...},
     *         dataRange: {...},
     *         series: [
     *             {data: [...]},
     *             {data: [...]},
     *             ...
     *         ]
     *     };
     *
     * [rawOption]:
     *
     *     An object input to echarts.setOption. 'rawOption' may be an
     *     'option', or may be an object contains multi-options. For example:
     *     var option = {
     *         base: {
     *             title: {...},
     *             legend: {...},
     *             series: [
     *                 {data: [...]},
     *                 {data: [...]},
     *                 ...
     *             ]
     *         },
     *         timeline: {...},
     *         options: [
     *             {title: {...}, series: {data: [...]}},
     *             {title: {...}, series: {data: [...]}},
     *             ...
     *         ],
     *         defaults: {
     *             {series: {x: 20}, dataRange: {show: false}}
     *         },
     *         media: [
     *             {
     *                 query: {maxWidth: 320},
     *                 option: {series: {x: 20}, dataRange: {show: false}}
     *             },
     *             {
     *                 query: {minWidth: 320, maxWidth: 720},
     *                 option: {series: {x: 500}, dataRange: {show: true}}
     *             },
     *             {
     *                 option: {series: {x: 1200}, dataRange: {show: true}}
     *             }
     *         ]
     *     };
     *
     * @alias module:echarts/model/OptionManager
     */
    function OptionManager() {

        /**
         * @private
         * @type {Array.<number>}
         */
        this._timelineOptions = [];
    }

    OptionManager.prototype = {

        constructor: OptionManager,

        /**
         * @public
         * @param {Object} rawOption Raw option.
         * @param {Array.<Function>} optionPreprocessorFuncs
         * @param {module:echarts/model/Global} ecModel
         * @return {Object} Init option
         */
        updateRawOption: function (rawOption, optionPreprocessorFuncs) {
            rawOption = zrUtil.clone(rawOption, true);

            // FIXME
            // 如果 timeline options 或者 media 中设置了某个属性，而base中没有设置，则进行警告。

            return settleRawOption.call(this, rawOption, optionPreprocessorFuncs);
        },

        getPartialOption: function (ecModel) {
            var option;
            var timelineOptions = this._timelineOptions;

            if (timelineOptions.length) {
                // getPartialOption can only be called after ecModel inited,
                // so we can get currentIndex from timelineModel.
                var timelineModel = ecModel.getComponent('timeline');
                if (timelineModel) {
                    option = zrUtil.clone(
                        timelineOptions[timelineModel.getCurrentIndex()],
                        true
                    );
                }
            }

            // FIXME
            // and then merge media query option?

            return option;
        }
    };

    function settleRawOption(rawOption, optionPreprocessorFuncs) {
        var timelineOptions = [];
        var timelineOpt = rawOption.timeline;
        var baseOption;

        // For timeline
        if (timelineOpt || rawOption.options) {
            baseOption = rawOption.base || {};
            timelineOptions = (rawOption.options || []).slice();
        }
        // For media query
        else if (rawOption.media) {
            baseOption = rawOption.base || {};
            var media = rawOption.media;
            each(media, function (singleMedia) {
                singleMedia
                    && singleMedia.option
                    && timelineOptions.push(singleMedia.option);
            });
        }
        // For normal option
        else {
            baseOption = rawOption;
            timelineOptions.push(rawOption);
        }

        // Set timelineOpt to baseOption for convenience.
        baseOption.timeline = timelineOpt;

        // Preprocess.
        each([baseOption].concat(timelineOptions), function (option) {
            each(optionPreprocessorFuncs, function (preProcess) {
                preProcess(option);
            });
        });

        this._timelineOptions = timelineOptions;

        // timeline.notMerge is not supported in ec3. Firstly there is rearly
        // case that notMerge is needed. Secondly supporting 'notMerge' requires
        // rawOption cloned and backuped when timeline changed, which does no
        // good to performance. What's more, that both timeline and setOption
        // method supply 'notMerge' brings complex and some problems.
        // Consider this case:
        // (step1) chart.setOption({timeline: {notMerge: false}, ...}, false);
        // (step2) chart.setOption({timeline: {notMerge: true}, ...}, false);

        return baseOption;
    }

    return OptionManager;
});
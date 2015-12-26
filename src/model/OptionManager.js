/**
 * ECharts option manager
 *
 * @module {echarts/model/OptionManager}
 */

define(function (require) {

    var zrUtil = require('zrender/core/util');
    var each = zrUtil.each;
    var clone = zrUtil.clone;

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
        this._timelineOptions;

        /**
         * @private
         * @type {Array.<Object>}
         */
        this._mediaList;

        /**
         * @private
         * @type {Object}
         */
        this._mediaDefault;

        /**
         * @private
         * @type {Object}
         */
        this._optionBackup;
    }

    // timeline.notMerge is not supported in ec3. Firstly there is rearly
    // case that notMerge is needed. Secondly supporting 'notMerge' requires
    // rawOption cloned and backuped when timeline changed, which does no
    // good to performance. What's more, that both timeline and setOption
    // method supply 'notMerge' brings complex and some problems.
    // Consider this case:
    // (step1) chart.setOption({timeline: {notMerge: false}, ...}, false);
    // (step2) chart.setOption({timeline: {notMerge: true}, ...}, false);

    OptionManager.prototype = {

        constructor: OptionManager,

        /**
         * @public
         * @param {Object} rawOption Raw option.
         * @param {module:echarts/model/Global} ecModel
         * @param {Array.<Function>} optionPreprocessorFuncs
         * @return {Object} Init option
         */
        setOption: function (rawOption, optionPreprocessorFuncs) {
            rawOption = clone(rawOption, true);

            // FIXME
            // 如果 timeline options 或者 media 中设置了某个属性，而base中没有设置，则进行警告。

            this._optionBackup = parseRawOption.call(
                this, rawOption, optionPreprocessorFuncs
            );

            return this.resetOption();
        },

        /**
         * @param {module:echarts/model/Global} ecModel
         * @return {Object}
         */
        getTimelineOption: function (ecModel) {
            var option;
            var timelineOptions = this._timelineOptions;

            if (timelineOptions.length) {
                // getTimelineOption can only be called after ecModel inited,
                // so we can get currentIndex from timelineModel.
                var timelineModel = ecModel.getComponent('timeline');
                if (timelineModel) {
                    option = clone(
                        timelineOptions[timelineModel.getCurrentIndex()],
                        true
                    );
                }
            }

            return option;
        },

        /**
         * @return {Object}
         */
        resetOption: function () {
            var optionBackup = this._optionBackup;

            // FIXME
            // 如果没有reset功能则不clone。

            this._timelineOptions = zrUtil.map(optionBackup.timelineOptions, clone);

            return clone(optionBackup.baseOption);
        }
    };

    function parseRawOption(rawOption, optionPreprocessorFuncs) {
        var timelineOptions = [];
        var mediaList = [];
        var timelineOpt = rawOption.timeline;
        var baseOption;

        // For timeline
        if (timelineOpt || rawOption.options) {
            baseOption = rawOption.base || {};
            timelineOptions = (rawOption.options || []).slice();
        }
        // For media query
        if (rawOption.media) {
            baseOption = rawOption.base || {};
            var media = rawOption.media;
            each(media, function (singleMedia) {
                if (singleMedia && singleMedia.option) {
                    mediaList.push(singleMedia);
                }
                // else if (singleMedia && !singleMedia
            });
        }
        // For normal option
        if (!baseOption) {
            baseOption = rawOption;
        }

        // Set timelineOpt to baseOption for convenience.
        baseOption.timeline = timelineOpt;

        // Preprocess.
        each([baseOption].concat(timelineOptions), function (option) {
            each(optionPreprocessorFuncs, function (preProcess) {
                preProcess(option);
            });
        });

        return {baseOption: baseOption, timelineOptions: timelineOptions};
    }

    function applyMedia(ecModel, api) {
        var result;

        each(this._mediaList, function (singleMedia) {

        });

        return result;
    }

    return OptionManager;
});
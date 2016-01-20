/**
 * ECharts option manager
 *
 * @module {echarts/model/OptionManager}
 */

define(function (require) {

    var zrUtil = require('zrender/core/util');
    var each = zrUtil.each;
    var clone = zrUtil.clone;
    var map = zrUtil.map;

    var QUERY_REG = /^(min|max)?(.+)$/;

    /**
     * TERM EXPLANATIONS:
     *
     * [option]:
     *
     *     An object that contains definitions of components. For example:
     *     var option = {
     *         title: {...},
     *         legend: {...},
     *         visualMap: {...},
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
     *         baseOption: {
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
     *                 option: {series: {x: 20}, visualMap: {show: false}}
     *             },
     *             {
     *                 query: {minWidth: 320, maxWidth: 720},
     *                 option: {series: {x: 500}, visualMap: {show: true}}
     *             },
     *             {
     *                 option: {series: {x: 1200}, visualMap: {show: true}}
     *             }
     *         ]
     *     };
     *
     * @alias module:echarts/model/OptionManager
     * @param {module:echarts/ExtensionAPI} api
     */
    function OptionManager(api) {

        /**
         * @private
         * @type {module:echarts/ExtensionAPI}
         */
        this._api = api;

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
         * -1, means default.
         * empty means no media.
         * @private
         * @type {Array.<number>}
         */
        this._currentMediaIndices = [];

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
            // 如果 timeline options 或者 media 中设置了某个属性，而baseOption中没有设置，则进行警告。

            this._optionBackup = parseRawOption.call(
                this, rawOption, optionPreprocessorFuncs
            );
        },

        /**
         * @return {Object}
         */
        mountOption: function () {
            var optionBackup = this._optionBackup;

            // FIXME
            // 如果没有reset功能则不clone。

            this._timelineOptions = map(optionBackup.timelineOptions, clone);
            this._mediaList = map(optionBackup.mediaList, clone);
            this._mediaDefault = clone(optionBackup.mediaDefault);
            this._currentMediaIndices = [];

            return clone(optionBackup.baseOption);
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
         * @param {module:echarts/model/Global} ecModel
         * @return {Array.<Object>}
         */
        getMediaOption: function (ecModel) {
            var ecWidth = this._api.getWidth();
            var ecHeight = this._api.getHeight();
            var mediaList = this._mediaList;
            var mediaDefault = this._mediaDefault;
            var indices = [];
            var result = [];

            // No media defined.
            if (!mediaList.length && !mediaDefault) {
                return result;
            }

            // Multi media may be applied, the latter defined media has higher priority.
            for (var i = 0, len = mediaList.length; i < len; i++) {
                if (applyMediaQuery(mediaList[i].query, ecWidth, ecHeight)) {
                    indices.push(i);
                }
            }

            // FIXME
            // 是否mediaDefault应该强制用户设置，否则可能修改不能回归。
            if (!indices.length && mediaDefault) {
                indices = [-1];
            }

            if (indices.length && !indicesEquals(indices, this._currentMediaIndices)) {
                result = map(indices, function (index) {
                    return clone(
                        index === -1 ? mediaDefault.option : mediaList[index].option
                    );
                });
            }
            // Otherwise return nothing.

            this._currentMediaIndices = indices;

            return result;
        }
    };

    function parseRawOption(rawOption, optionPreprocessorFuncs) {
        var timelineOptions = [];
        var mediaList = [];
        var mediaDefault;
        var baseOption;

        // Compatible with ec2.
        var timelineOpt = rawOption.timeline;

        if (rawOption.baseOption) {
            baseOption = rawOption.baseOption;
        }

        // For timeline
        if (timelineOpt || rawOption.options) {
            baseOption = baseOption || {};
            timelineOptions = (rawOption.options || []).slice();
        }
        // For media query
        if (rawOption.media) {
            baseOption = baseOption || {};
            var media = rawOption.media;
            each(media, function (singleMedia) {
                if (singleMedia && singleMedia.option) {
                    if (singleMedia.query) {
                        mediaList.push(singleMedia);
                    }
                    else if (!mediaDefault) {
                        // Use the first media default.
                        mediaDefault = singleMedia;
                    }
                }
            });
        }

        // For normal option
        if (!baseOption) {
            baseOption = rawOption;
        }

        // Set timelineOpt to baseOption in ec3,
        // which is convenient for merge option.
        if (!baseOption.timeline) {
            baseOption.timeline = timelineOpt;
        }

        // Preprocess.
        each([baseOption].concat(timelineOptions)
            .concat(zrUtil.map(mediaList, function (media) {
                return media.option;
            })),
            function (option) {
                each(optionPreprocessorFuncs, function (preProcess) {
                    preProcess(option);
                });
            }
        );

        return {
            baseOption: baseOption,
            timelineOptions: timelineOptions,
            mediaDefault: mediaDefault,
            mediaList: mediaList
        };
    }

    /**
     * @see <http://www.w3.org/TR/css3-mediaqueries/#media1>
     * Support: width, height, aspectRatio
     * Can use max or min as prefix.
     */
    function applyMediaQuery(query, ecWidth, ecHeight) {
        var realMap = {
            width: ecWidth,
            height: ecHeight,
            aspectratio: ecWidth / ecHeight // lowser case for convenientce.
        };

        var applicatable = true;

        zrUtil.each(query, function (value, attr) {
            var matched = attr.match(QUERY_REG);

            if (!matched || !matched[1] || !matched[2]) {
                return;
            }

            var operator = matched[1];
            var realAttr = matched[2].toLowerCase();

            if (!compare(realMap[realAttr], value, operator)) {
                applicatable = false;
            }
        });

        return applicatable;
    }

    function compare(real, expect, operator) {
        if (operator === 'min') {
            return real >= expect;
        }
        else if (operator === 'max') {
            return real <= expect;
        }
        else { // Equals
            return real === expect;
        }
    }

    function indicesEquals(indices1, indices2) {
        // indices is always order by asc and has only finite number.
        return indices1.join(',') === indices2.join(',');
    }

    return OptionManager;
});
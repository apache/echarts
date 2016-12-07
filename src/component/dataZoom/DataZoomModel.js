/**
 * @file Data zoom model
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var env = require('zrender/core/env');
    var echarts = require('../../echarts');
    var modelUtil = require('../../util/model');
    var helper = require('./helper');
    var AxisProxy = require('./AxisProxy');
    var each = zrUtil.each;
    var eachAxisDim = helper.eachAxisDim;

    var DataZoomModel = echarts.extendComponentModel({

        type: 'dataZoom',

        dependencies: [
            'xAxis', 'yAxis', 'zAxis', 'radiusAxis', 'angleAxis', 'singleAxis', 'series'
        ],

        /**
         * @protected
         */
        defaultOption: {
            zlevel: 0,
            z: 4,                   // Higher than normal component (z: 2).
            orient: null,           // Default auto by axisIndex. Possible value: 'horizontal', 'vertical'.
            xAxisIndex: null,       // Default the first horizontal category axis.
            yAxisIndex: null,       // Default the first vertical category axis.

            filterMode: 'filter',   // Possible values: 'filter' or 'empty'.
                                    // 'filter': data items which are out of window will be removed.
                                    //           This option is applicable when filtering outliers.
                                    // 'empty': data items which are out of window will be set to empty.
                                    //          This option is applicable when user should not neglect
                                    //          that there are some data items out of window.
                                    // Taking line chart as an example, line will be broken in
                                    // the filtered points when filterModel is set to 'empty', but
                                    // be connected when set to 'filter'.

            throttle: null,         // Dispatch action by the fixed rate, avoid frequency.
                                    // default 100. Do not throttle when use null/undefined.
                                    // If animation === true and animationDurationUpdate > 0,
                                    // default value is 100, otherwise 20.
            start: 0,               // Start percent. 0 ~ 100
            end: 100,               // End percent. 0 ~ 100
            startValue: null,       // Start value. If startValue specified, start is ignored.
            endValue: null          // End value. If endValue specified, end is ignored.
        },

        /**
         * @override
         */
        init: function (option, parentModel, ecModel) {

            /**
             * key like x_0, y_1
             * @private
             * @type {Object}
             */
            this._dataIntervalByAxis = {};

            /**
             * @private
             */
            this._dataInfo = {};

            /**
             * key like x_0, y_1
             * @private
             */
            this._axisProxies = {};

            /**
             * @readOnly
             */
            this.textStyleModel;

            /**
             * @private
             */
            this._autoThrottle = true;

            var rawOption = retrieveRaw(option);

            this.mergeDefaultAndTheme(option, ecModel);

            this.doInit(rawOption);
        },

        /**
         * @override
         */
        mergeOption: function (newOption) {
            var rawOption = retrieveRaw(newOption);

            //FIX #2591
            zrUtil.merge(this.option, newOption, true);

            this.doInit(rawOption);
        },

        /**
         * @protected
         */
        doInit: function (rawOption) {
            var thisOption = this.option;

            // Disable realtime view update if canvas is not supported.
            if (!env.canvasSupported) {
                thisOption.realtime = false;
            }

            this._setDefaultThrottle(rawOption);

            processRangeProp('start', 'startValue', rawOption, thisOption);
            processRangeProp('end', 'endValue', rawOption, thisOption);

            this.textStyleModel = this.getModel('textStyle');

            this._resetTarget();

            this._giveAxisProxies();
        },

        /**
         * @private
         */
        _giveAxisProxies: function () {
            var axisProxies = this._axisProxies;

            this.eachTargetAxis(function (dimNames, axisIndex, dataZoomModel, ecModel) {
                var axisModel = this.dependentModels[dimNames.axis][axisIndex];

                // If exists, share axisProxy with other dataZoomModels.
                var axisProxy = axisModel.__dzAxisProxy || (
                    // Use the first dataZoomModel as the main model of axisProxy.
                    axisModel.__dzAxisProxy = new AxisProxy(
                        dimNames.name, axisIndex, this, ecModel
                    )
                );
                // FIXME
                // dispose __dzAxisProxy

                axisProxies[dimNames.name + '_' + axisIndex] = axisProxy;
            }, this);
        },

        /**
         * @private
         */
        _resetTarget: function () {
            var thisOption = this.option;

            var autoMode = this._judgeAutoMode();

            eachAxisDim(function (dimNames) {
                var axisIndexName = dimNames.axisIndex;
                thisOption[axisIndexName] = modelUtil.normalizeToArray(
                    thisOption[axisIndexName]
                );
            }, this);

            if (autoMode === 'axisIndex') {
                this._autoSetAxisIndex();
            }
            else if (autoMode === 'orient') {
                this._autoSetOrient();
            }
        },

        /**
         * @private
         */
        _judgeAutoMode: function () {
            // Auto set only works for setOption at the first time.
            // The following is user's reponsibility. So using merged
            // option is OK.
            var thisOption = this.option;

            var hasIndexSpecified = false;
            eachAxisDim(function (dimNames) {
                // When user set axisIndex as a empty array, we think that user specify axisIndex
                // but do not want use auto mode. Because empty array may be encountered when
                // some error occured.
                if (thisOption[dimNames.axisIndex] != null) {
                    hasIndexSpecified = true;
                }
            }, this);

            var orient = thisOption.orient;

            if (orient == null && hasIndexSpecified) {
                return 'orient';
            }
            else if (!hasIndexSpecified) {
                if (orient == null) {
                    thisOption.orient = 'horizontal';
                }
                return 'axisIndex';
            }
        },

        /**
         * @private
         */
        _autoSetAxisIndex: function () {
            var autoAxisIndex = true;
            var orient = this.get('orient', true);
            var thisOption = this.option;
            var dependentModels = this.dependentModels;

            if (autoAxisIndex) {
                // Find axis that parallel to dataZoom as default.
                var dimName = orient === 'vertical' ? 'y' : 'x';

                if (dependentModels[dimName + 'Axis'].length) {
                    thisOption[dimName + 'AxisIndex'] = [0];
                    autoAxisIndex = false;
                }
                else {
                    each(dependentModels.singleAxis, function (singleAxisModel) {
                        if (autoAxisIndex && singleAxisModel.get('orient', true) === orient) {
                            thisOption.singleAxisIndex = [singleAxisModel.componentIndex];
                            autoAxisIndex = false;
                        }
                    });
                }
            }

            if (autoAxisIndex) {
                // Find the first category axis as default. (consider polar)
                eachAxisDim(function (dimNames) {
                    if (!autoAxisIndex) {
                        return;
                    }
                    var axisIndices = [];
                    var axisModels = this.dependentModels[dimNames.axis];
                    if (axisModels.length && !axisIndices.length) {
                        for (var i = 0, len = axisModels.length; i < len; i++) {
                            if (axisModels[i].get('type') === 'category') {
                                axisIndices.push(i);
                            }
                        }
                    }
                    thisOption[dimNames.axisIndex] = axisIndices;
                    if (axisIndices.length) {
                        autoAxisIndex = false;
                    }
                }, this);
            }

            if (autoAxisIndex) {
                // FIXME
                // 这里是兼容ec2的写法（没指定xAxisIndex和yAxisIndex时把scatter和双数值轴折柱纳入dataZoom控制），
                // 但是实际是否需要Grid.js#getScaleByOption来判断（考虑time，log等axis type）？

                // If both dataZoom.xAxisIndex and dataZoom.yAxisIndex is not specified,
                // dataZoom component auto adopts series that reference to
                // both xAxis and yAxis which type is 'value'.
                this.ecModel.eachSeries(function (seriesModel) {
                    if (this._isSeriesHasAllAxesTypeOf(seriesModel, 'value')) {
                        eachAxisDim(function (dimNames) {
                            var axisIndices = thisOption[dimNames.axisIndex];

                            var axisIndex = seriesModel.get(dimNames.axisIndex);
                            var axisId = seriesModel.get(dimNames.axisId);

                            var axisModel = seriesModel.ecModel.queryComponents({
                                mainType: dimNames.axis,
                                index: axisIndex,
                                id: axisId
                            })[0];

                            if (__DEV__) {
                                if (!axisModel) {
                                    throw new Error(
                                        dimNames.axis + ' "' + zrUtil.retrieve(
                                            axisIndex,
                                            axisId,
                                            0
                                        ) + '" not found'
                                    );
                                }
                            }
                            axisIndex = axisModel.componentIndex;

                            if (zrUtil.indexOf(axisIndices, axisIndex) < 0) {
                                axisIndices.push(axisIndex);
                            }
                        });
                    }
                }, this);
            }
        },

        /**
         * @private
         */
        _autoSetOrient: function () {
            var dim;

            // Find the first axis
            this.eachTargetAxis(function (dimNames) {
                !dim && (dim = dimNames.name);
            }, this);

            this.option.orient = dim === 'y' ? 'vertical' : 'horizontal';
        },

        /**
         * @private
         */
        _isSeriesHasAllAxesTypeOf: function (seriesModel, axisType) {
            // FIXME
            // 需要series的xAxisIndex和yAxisIndex都首先自动设置上。
            // 例如series.type === scatter时。

            var is = true;
            eachAxisDim(function (dimNames) {
                var seriesAxisIndex = seriesModel.get(dimNames.axisIndex);
                var axisModel = this.dependentModels[dimNames.axis][seriesAxisIndex];

                if (!axisModel || axisModel.get('type') !== axisType) {
                    is = false;
                }
            }, this);
            return is;
        },

        /**
         * @private
         */
        _setDefaultThrottle: function (rawOption) {
            // When first time user set throttle, auto throttle ends.
            if (rawOption.hasOwnProperty('throttle')) {
                this._autoThrottle = false;
            }
            if (this._autoThrottle) {
                var globalOption = this.ecModel.option;
                this.option.throttle =
                    (globalOption.animation && globalOption.animationDurationUpdate > 0)
                    ? 100 : 20;
            }
        },

        /**
         * @public
         */
        getFirstTargetAxisModel: function () {
            var firstAxisModel;
            eachAxisDim(function (dimNames) {
                if (firstAxisModel == null) {
                    var indices = this.get(dimNames.axisIndex);
                    if (indices.length) {
                        firstAxisModel = this.dependentModels[dimNames.axis][indices[0]];
                    }
                }
            }, this);

            return firstAxisModel;
        },

        /**
         * @public
         * @param {Function} callback param: axisModel, dimNames, axisIndex, dataZoomModel, ecModel
         */
        eachTargetAxis: function (callback, context) {
            var ecModel = this.ecModel;
            eachAxisDim(function (dimNames) {
                each(
                    this.get(dimNames.axisIndex),
                    function (axisIndex) {
                        callback.call(context, dimNames, axisIndex, this, ecModel);
                    },
                    this
                );
            }, this);
        },

        getAxisProxy: function (dimName, axisIndex) {
            return this._axisProxies[dimName + '_' + axisIndex];
        },

        /**
         * If not specified, set to undefined.
         *
         * @public
         * @param {Object} opt
         * @param {number} [opt.start]
         * @param {number} [opt.end]
         * @param {number} [opt.startValue]
         * @param {number} [opt.endValue]
         */
        setRawRange: function (opt) {
            each(['start', 'end', 'startValue', 'endValue'], function (name) {
                // If any of those prop is null/undefined, we should alos set
                // them, because only one pair between start/end and
                // startValue/endValue can work.
                this.option[name] = opt[name];
            }, this);
        },

        /**
         * @public
         * @return {Array.<number>} [startPercent, endPercent]
         */
        getPercentRange: function () {
            var axisProxy = this.findRepresentativeAxisProxy();
            if (axisProxy) {
                return axisProxy.getDataPercentWindow();
            }
        },

        /**
         * @public
         * For example, chart.getModel().getComponent('dataZoom').getValueRange('y', 0);
         *
         * @param {string} [axisDimName]
         * @param {number} [axisIndex]
         * @return {Array.<number>} [startValue, endValue] value can only be '-' or finite number.
         */
        getValueRange: function (axisDimName, axisIndex) {
            if (axisDimName == null && axisIndex == null) {
                var axisProxy = this.findRepresentativeAxisProxy();
                if (axisProxy) {
                    return axisProxy.getDataValueWindow();
                }
            }
            else {
                return this.getAxisProxy(axisDimName, axisIndex).getDataValueWindow();
            }
        },

        /**
         * @public
         * @return {module:echarts/component/dataZoom/AxisProxy}
         */
        findRepresentativeAxisProxy: function () {
            // Find the first hosted axisProxy
            var axisProxies = this._axisProxies;
            for (var key in axisProxies) {
                if (axisProxies.hasOwnProperty(key) && axisProxies[key].hostedBy(this)) {
                    return axisProxies[key];
                }
            }

            // If no hosted axis find not hosted axisProxy.
            // Consider this case: dataZoomModel1 and dataZoomModel2 control the same axis,
            // and the option.start or option.end settings are different. The percentRange
            // should follow axisProxy.
            // (We encounter this problem in toolbox data zoom.)
            for (var key in axisProxies) {
                if (axisProxies.hasOwnProperty(key) && !axisProxies[key].hostedBy(this)) {
                    return axisProxies[key];
                }
            }
        }

    });

    function retrieveRaw(option) {
        var ret = {};
        each(
            ['start', 'end', 'startValue', 'endValue', 'throttle'],
            function (name) {
                option.hasOwnProperty(name) && (ret[name] = option[name]);
            }
        );
        return ret;
    }

    function processRangeProp(percentProp, valueProp, rawOption, thisOption) {
        // start/end has higher priority over startValue/endValue,
        // but we should make chart.setOption({endValue: 1000}) effective,
        // rather than chart.setOption({endValue: 1000, end: null}).
        if (rawOption[valueProp] != null && rawOption[percentProp] == null) {
            thisOption[percentProp] = null;
        }
        // Otherwise do nothing and use the merge result.
    }

    return DataZoomModel;
});

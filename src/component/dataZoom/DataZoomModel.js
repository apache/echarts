/**
 * @file Data zoom model
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var env = require('zrender/core/env');
    var echarts = require('../../echarts');
    var modelUtil = require('../../util/model');
    var AxisProxy = require('./AxisProxy');
    var each = zrUtil.each;
    var eachAxisDim = modelUtil.eachAxisDim;

    return echarts.extendComponentModel({

        type: 'dataZoom',

        dependencies: [
            'xAxis', 'yAxis', 'zAxis', 'radiusAxis', 'angleAxis', 'series'
        ],

        /**
         * @protected
         */
        defaultOption: {
            zlevel: 0,
            z: 4,                   // Higher than normal component (z: 2).
            orient: null,           // Default auto by axisIndex. Possible value: 'horizontal', 'vertical'.
            xAxisIndex: null,       // Default all horizontal category axis.
            yAxisIndex: null,       // Default all vertical category axis.
            filterMode: 'filter',   // 'filter' or 'empty'
                                    // 'filter': data items which are out of window will be removed.
                                    //           This option is applicable when filtering outliers.
                                    // 'empty': data items which are out of window will be set to empty.
                                    //          This option is applicable when user should not neglect
                                    //          that there are some data items out of window.
            throttle: 100,          // Dispatch action by the fixed rate, avoid frequency.
                                    // default 100. Do not throttle when use null/undefined.
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
             * can be 'axisIndex' or 'orient'
             *
             * @private
             * @type {string}
             */
            this._autoMode;

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

            this.mergeDefaultAndTheme(option, ecModel);
            this.mergeOption({}, true);
        },

        /**
         * @override
         */
        mergeOption: function (newOption, isInit) {
            var thisOption = this.option;

            newOption && zrUtil.merge(thisOption, newOption);

            // Disable realtime view update if canvas is not supported.
            if (!env.canvasSupported) {
                thisOption.realtime = false;
            }

            this.textStyleModel = this.getModel('textStyle');

            this._resetTarget(newOption, isInit);

            this._giveAxisProxies();

            this._backup();
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
        _resetTarget: function (newOption, isInit) {

            this._resetAutoMode(newOption, isInit);

            var thisOption = this.option;

            eachAxisDim(function (dimNames) {
                var axisIndexName = dimNames.axisIndex;
                thisOption[axisIndexName] = autoMode === 'axisIndex'
                    ? [] : modelUtil.normalizeToArray(thisOption[axisIndexName]);
            }, this);

            var autoMode = this._autoMode;

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
        _resetAutoMode: function (newOption, isInit) {
            // Consider this case:
            // There is no axisIndex specified at the begining,
            // which means that auto choise of axisIndex is required.
            // Then user modifies series using setOption and do not specify axisIndex either.
            // At that moment axisIndex should be re-choised, but not remain last choise.
            // So we keep auto mode util user specified axisIndex or orient in newOption.
            var option = isInit ? this.option : newOption;

            var hasIndexSpecified = false;
            eachAxisDim(function (dimNames) {
                // When user set axisIndex as a empty array, we think that user specify axisIndex
                // but do not want use auto mode. Because empty array may be encountered when
                // some error occured.
                if (option[dimNames.axisIndex] != null) {
                    hasIndexSpecified = true;
                }
            }, this);

            var orient = option.orient;

            if (orient == null && hasIndexSpecified) {
                // Auto set orient by axisIndex.
                this._autoMode = 'orient';
            }
            else {
                if (orient == null) {
                    this.option.orient = 'horizontal';
                }
                if (!hasIndexSpecified) {
                    // Auto set axisIndex by orient.
                    this._autoMode = 'axisIndex';
                }
            }
        },

        /**
         * @private
         */
        _autoSetAxisIndex: function () {
            var autoAxisIndex = this._autoMode === 'axisIndex';
            var orient = this.get('orient');
            var thisOption = this.option;

            if (autoAxisIndex) {
                // Find axis that parallel to dataZoom as default.
                var dimNames = orient === 'vertical'
                    ? {dim: 'y', axisIndex: 'yAxisIndex', axis: 'yAxis'}
                    : {dim: 'x', axisIndex: 'xAxisIndex', axis: 'xAxis'};

                if (this.dependentModels[dimNames.axis].length) {
                    thisOption[dimNames.axisIndex] = [0];
                    autoAxisIndex = false;
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
        _backup: function () {
            this.eachTargetAxis(function (dimNames, axisIndex, dataZoomModel, ecModel) {
                var axisModel = ecModel.getComponent(dimNames.axis, axisIndex);
                this.getAxisProxy(dimNames.name, axisIndex).backup(
                    this,
                    {
                        scale: axisModel.get('scale', true),
                        min: axisModel.get('min', true),
                        max: axisModel.get('max', true)
                    }
                );
            }, this);
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
                this.option[name] = opt[name];
            }, this);
        },

        /**
         * @public
         * @return {Array.<number>}
         */
        getPercentRange: function () {
            // Find the first hosted axisProxy
            var axisProxies = this._axisProxies;
            for (var key in axisProxies) {
                if (axisProxies.hasOwnProperty(key) && axisProxies[key].hostedBy(this)) {
                    return axisProxies[key].getDataPercentWindow();
                }
            }

            // If no hosted axis find not hosted axisProxy.
            // Consider this case: dataZoomModel1 and dataZoomModel2 control the same axis,
            // and the option.start or option.end settings are different. The percentRange
            // show follow axisProxy.
            // (We encounter this problem in toolbox data zoom.)
            for (var key in axisProxies) {
                if (axisProxies.hasOwnProperty(key) && !axisProxies[key].hostedBy(this)) {
                    return axisProxies[key].getDataPercentWindow();
                }
            }
        }

    });

});
/**
 * @file Data zoom model
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var env = require('zrender/core/env');
    var echarts = require('../../echarts');
    var modelUtil = require('../../util/model');
    var numberUtil = require('../../util/number');
    var AxisOperator = require('./AxisOperator');
    var asc = numberUtil.asc;
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
            zlevel: 0,                 // 一级层叠
            z: 4,                      // 二级层叠
            show: true,
            orient: null,             // 布局方式，默认根据axisIndex自适应。可选值为：'horizontal' ¦ 'vertical'
            xAxisIndex: null,         // 默认控制所有横向类目
            yAxisIndex: null,         // 默认控制所有横向类目
            filterMode: 'filter',       // 'filter' or 'empty'
                                      // 'filter': data items which are out of window will be removed.
                                      //           This option is applicable when filtering outliers.
                                      // 'empty': data items which are out of window will be set to empty.
                                      //          This option is applicable when user should not neglect
                                      //          that there are some data items out of window.
            throttle: 100,          // Dispatch action by the fixed rate, avoid frequency.
                                    // default 100. Do not throttle when use null/undefined.
            start: 0,               // 默认为0
            end: 100,               // 默认为全部 100%
            start2: 0,               // 默认为0
            end2: 100               // 默认为全部 100%
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
            this._axisOperators = {};

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

            this._giveAxisOperators();

            this._backup();

            this._resetRange();
        },

        /**
         * @private
         */
        _giveAxisOperators: function () {
            var axisOperators = this._axisOperators;

            this.eachTargetAxis(function (dimNames, axisIndex, dataZoomModel, ecModel) {
                var axisModel = this.dependentModels[dimNames.axis][axisIndex];

                // If exists, share axisOperator with other dataZoomModels.
                var axisOperator = axisModel.__dzAxisOperator || (
                    // Use the first dataZoomModel as the main model of axisOperator.
                    axisModel.__dzAxisOperator = new AxisOperator(
                        dimNames.name, axisIndex, this, ecModel
                    )
                );
                // FIXME
                // dispose __dzAxisOperator

                axisOperators[dimNames.name + '_' + axisIndex] = axisOperator;
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
                this.getAxisOperator(dimNames.name, axisIndex).backupCrossZero(
                    this,
                    !ecModel.getComponent(dimNames.axis, axisIndex).get('scale')
                );
            }, this);
        },

        /**
         * @private
         */
        _resetRange: function () {
            var thisOption = this.option;

            // TODO
            // 对于一个轴受多个dataZoom控制的情况（如toolbox）：
            // datazoom改变时，不直接改变，而是发全局事件，监听：
            // 如果轴是自己包含的轴，则自己改变start和end。
            // 所有都改完后，重新走process流程。

            // Determin which axes dataZoom.start/end and dataZoom.start2/end2 control.
            // When only xAxisIndex or only yAxisIndex is specified, start/end controls them.
            // targetDim === false means that both xAxisIndex and yAxisIndex are specified.
            var targetDim;
            eachAxisDim(function (dimNames) {
                if (thisOption[dimNames.axisIndex].length) {
                    targetDim = targetDim != null ? false : dimNames.name;
                }
            });

            // Otherwise, determine it by dataZoom.orient (compatibale with the logic in ec2.)
            // targetDim === 'y' means start/end control 'y' and start2/end2 control 'x'.

            var optAttrs = {};
            optAttrs[targetDim] = {start: 'start', end: 'end'};

            zrUtil.each(optAttrs, function (dimItem, targetDim) {
                var startValue = thisOption[dimItem.start];
                var endValue = thisOption[dimItem.end];

                // Auto reverse when start > end
                if (startValue > endValue) {
                    startValue = [endValue, endValue = startValue][0];
                }

                thisOption[dimItem.start] = startValue;
                thisOption[dimItem.end] = endValue;
            }, this);

            // Set "needsCrossZero" to axes
            this.eachTargetAxis(function (dimNames, axisIndex, dataZoomModel, ecModel) {
                var axisModel = ecModel.getComponent(dimNames.axis, axisIndex);
                axisModel.setNeedsCrossZero && axisModel.setNeedsCrossZero(
                    thisOption.start === 0 && thisOption.end === 100
                        ? this.getAxisOperator(dimNames.name, axisIndex).getCrossZero()
                        : false
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
                zrUtil.each(
                    this.get(dimNames.axisIndex),
                    function (axisIndex) {
                        callback.call(context, dimNames, axisIndex, this, ecModel);
                    },
                    this
                );
            }, this);
        },

        getAxisOperator: function (dimName, axisIndex) {
            return this._axisOperators[dimName + '_' + axisIndex];
        },

        /**
         * @public
         * @param {Array} param [start, end]
         */
        setRange: function (param) {
            // FIXME
            // 接口改变
            var thisOption = this.option;

            param[0] != null && (thisOption.start = param[0]);
            param[1] != null && (thisOption.end = param[1]);

            this._resetRange();
        },

        /**
         * @public
         */
        getRange: function () {
            var thisOption = this.option;
            var range = [thisOption.start, thisOption.end];

            return this.fixRange(range);
        },

        /**
         * @protected
         */
        fixRange: function (range) {
            // Make sure range[0] <= range[1]
            var range = asc(range);

            // Clamp
            range[0] > 100 && (range[0] = 100);
            range[1] > 100 && (range[1] = 100);
            range[0] < 0 && (range[0] = 0);
            range[1] < 0 && (range[1] = 0);

            return range;
        }

    });

});
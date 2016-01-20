/**
 * @file Axis operator
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var each = zrUtil.each;
    var asc = numberUtil.asc;

    /**
     * Operate single axis.
     * One axis can only operated by one axis operator.
     * Different dataZoomModels may be defined to operate the same axis.
     * (i.e. 'inside' data zoom and 'slider' data zoom components)
     * So dataZoomModels share one axisProxy in that case.
     *
     * @class
     */
    var AxisProxy = function (dimName, axisIndex, dataZoomModel, ecModel) {

        /**
         * @private
         * @type {string}
         */
        this._dimName = dimName;

        /**
         * @private
         */
        this._axisIndex = axisIndex;

        /**
         * @private
         * @type {Object}
         */
        this._backup;

        /**
         * @private
         * @type {Array.<number>}
         */
        this._valueWindow;

        /**
         * @private
         * @type {Array.<number>}
         */
        this._percentWindow;

        /**
         * @private
         * @type {Array.<number>}
         */
        this._dataExtent;

        /**
         * @readOnly
         * @type {module: echarts/model/Global}
         */
        this.ecModel = ecModel;

        /**
         * @private
         * @type {module: echarts/component/dataZoom/DataZoomModel}
         */
        this._model = dataZoomModel;
    };

    AxisProxy.prototype = {

        constructor: AxisProxy,

        /**
         * Whether the axisProxy is hosted by model.
         * @public
         * @return {boolean}
         */
        hostedBy: function (model) {
            return this._model === model;
        },

        /**
         * @param {Object} option
         */
        backup: function (model, option) {
            if (model === this._model) {
                this._backup = option;
            }
        },

        /**
         * @return {Object}
         */
        getBackup: function () {
            return zrUtil.clone(this._backup);
        },

        /**
         * @return {Array.<number>}
         */
        getDataExtent: function () {
            return this._dataExtent.slice();
        },

        /**
         * @return {Array.<number>}
         */
        getDataValueWindow: function () {
            return this._valueWindow.slice();
        },

        /**
         * @return {Array.<number>}
         */
        getDataPercentWindow: function () {
            return this._percentWindow.slice();
        },

        /**
         * @public
         * @param {number} axisIndex
         * @return {Array} seriesModels
         */
        getTargetSeriesModels: function () {
            var seriesModels = [];

            this.ecModel.eachSeries(function (seriesModel) {
                if (this._axisIndex === seriesModel.get(this._dimName + 'AxisIndex')) {
                    seriesModels.push(seriesModel);
                }
            }, this);

            return seriesModels;
        },

        getAxisModel: function () {
            return this.ecModel.getComponent(this._dimName + 'Axis', this._axisIndex);
        },

        getOtherAxisModel: function () {
            var axisDim = this._dimName;
            var ecModel = this.ecModel;
            var axisModel = this.getAxisModel();
            var isCartesian = axisDim === 'x' || axisDim === 'y';
            var otherAxisDim;
            var coordSysIndexName;
            if (isCartesian) {
                coordSysIndexName = 'gridIndex';
                otherAxisDim = axisDim === 'x' ? 'y' : 'x';
            }
            else {
                coordSysIndexName = 'polarIndex';
                otherAxisDim = axisDim === 'angle' ? 'radius' : 'angle';
            }
            var foundOtherAxisModel;
            ecModel.eachComponent(otherAxisDim + 'Axis', function (otherAxisModel) {
                if ((otherAxisModel.get(coordSysIndexName) || 0)
                    === (axisModel.get(coordSysIndexName) || 0)) {
                    foundOtherAxisModel = otherAxisModel;
                }
            });
            return foundOtherAxisModel;
        },

        /**
         * @param {module: echarts/component/dataZoom/DataZoomModel} model
         */
        reset: function (model) {
            if (model !== this._model) {
                return;
            }

            // Process axis data
            var axisDim = this._dimName;
            var axisModel = this.getAxisModel();
            var isCategoryFilter = axisModel.get('type') === 'category';
            var seriesModels = this.getTargetSeriesModels();

            var dataExtent = calculateDataExtent(axisDim, seriesModels);
            var dataWindow = calculateDataWindow(model, dataExtent, isCategoryFilter);

            // Record data window and data extent.
            this._dataExtent = dataExtent.slice();
            this._valueWindow = dataWindow.valueWindow.slice();
            this._percentWindow = dataWindow.percentWindow.slice();
        },

        /**
         * @param {module: echarts/component/dataZoom/DataZoomModel} model
         */
        filterData: function (model) {
            if (model !== this._model) {
                return;
            }

            var axisDim = this._dimName;
            var seriesModels = this.getTargetSeriesModels();
            var filterMode = model.get('filterMode');
            var valueWindow = this._valueWindow;

            // FIXME
            // Toolbox may has dataZoom injected. And if there are stacked bar chart
            // with NaN data. NaN will be filtered and stack will be wrong.
            // So we need to force the mode to be set empty
            var otherAxisModel = this.getOtherAxisModel();
            if (model.get('$fromToolbox')
                && otherAxisModel && otherAxisModel.get('type') === 'category') {
                filterMode = 'empty';
            }
            // Process series data
            each(seriesModels, function (seriesModel) {
                var seriesData = seriesModel.getData();
                if (!seriesData) {
                    return;
                }

                each(seriesModel.getDimensionsOnAxis(axisDim), function (dim) {
                    if (filterMode === 'empty') {
                        seriesModel.setData(
                            seriesData.map(dim, function (value) {
                                return !isInWindow(value) ? NaN : value;
                            })
                        );
                    }
                    else {
                        seriesData.filterSelf(dim, isInWindow);
                    }
                });
            });

            function isInWindow(value) {
                return value >= valueWindow[0] && value <= valueWindow[1];
            }
        }
    };

    function calculateDataExtent(axisDim, seriesModels) {
        var dataExtent = [Number.MAX_VALUE, Number.MIN_VALUE];

        each(seriesModels, function (seriesModel) {
            var seriesData = seriesModel.getData();
            if (seriesData) {
                each(seriesModel.getDimensionsOnAxis(axisDim), function (dim) {
                    var seriesExtent = seriesData.getDataExtent(dim);
                    seriesExtent[0] < dataExtent[0] && (dataExtent[0] = seriesExtent[0]);
                    seriesExtent[1] > dataExtent[1] && (dataExtent[1] = seriesExtent[1]);
                });
            }
        }, this);

        return dataExtent;
    }

    function calculateDataWindow(dataZoomModel, dataExtent, isCategoryFilter) {
        var percentExtent = [0, 100];
        var modelOption = dataZoomModel.option;
        var percentWindow = [
            modelOption.start,
            modelOption.end
        ];
        var valueWindow = [
            modelOption.startValue,
            modelOption.endValue
        ];
        var mathFn = ['floor', 'ceil'];

        // Normalize bound.
        each([0, 1], function (idx) {
            var boundValue = valueWindow[idx];
            var boundPercent;
            var calcuPercent = true;

            if (isInvalidNumber(boundValue)) {
                boundPercent = percentWindow[idx];
                if (isInvalidNumber(boundPercent)) {
                    boundPercent = percentExtent[idx];
                }
                boundValue = numberUtil.linearMap(
                    boundPercent, percentExtent, dataExtent, true
                );
                calcuPercent = false;
            }
            if (isCategoryFilter) {
                boundValue = Math[mathFn[idx]](boundValue);
            }
            if (calcuPercent) {
                boundPercent = numberUtil.linearMap(
                    boundValue, dataExtent, percentExtent, true
                );
            }
            valueWindow[idx] = boundValue;
            percentWindow[idx] = boundPercent;
        });

        return {
            valueWindow: asc(valueWindow),
            percentWindow: asc(percentWindow)
        };
    }

    function isInvalidNumber(val) {
        return isNaN(val) || val == null;
    }

    return AxisProxy;

});
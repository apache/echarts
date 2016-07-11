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
        this._dataZoomModel = dataZoomModel;
    };

    AxisProxy.prototype = {

        constructor: AxisProxy,

        /**
         * Whether the axisProxy is hosted by dataZoomModel.
         *
         * @public
         * @param {module: echarts/component/dataZoom/DataZoomModel} dataZoomModel
         * @return {boolean}
         */
        hostedBy: function (dataZoomModel) {
            return this._dataZoomModel === dataZoomModel;
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
                // Legacy problem: some one wrote xAxisIndex as [0] following the wrong way in example.
                if (this._axisIndex === +seriesModel.get(this._dimName + 'AxisIndex')) {
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
                    === (axisModel.get(coordSysIndexName) || 0)
                ) {
                    foundOtherAxisModel = otherAxisModel;
                }
            });
            return foundOtherAxisModel;
        },

        /**
         * Notice: reset should not be called before series.restoreData() called,
         * so it is recommanded to be called in "process stage" but not "model init
         * stage".
         *
         * @param {module: echarts/component/dataZoom/DataZoomModel} dataZoomModel
         */
        reset: function (dataZoomModel) {
            if (dataZoomModel !== this._dataZoomModel) {
                return;
            }

            // Culculate data window and data extent, and record them.
            var dataExtent = this._dataExtent = calculateDataExtent(
                this._dimName, this.getTargetSeriesModels()
            );
            var dataWindow = calculateDataWindow(
                dataZoomModel.option, dataExtent, this
            );
            this._valueWindow = dataWindow.valueWindow;
            this._percentWindow = dataWindow.percentWindow;

            // Update axis setting then.
            setAxisModel(this);
        },

        /**
         * @param {module: echarts/component/dataZoom/DataZoomModel} dataZoomModel
         */
        restore: function (dataZoomModel) {
            if (dataZoomModel !== this._dataZoomModel) {
                return;
            }

            this._valueWindow = this._percentWindow = null;
            setAxisModel(this, true);
        },

        /**
         * @param {module: echarts/component/dataZoom/DataZoomModel} dataZoomModel
         */
        filterData: function (dataZoomModel) {
            if (dataZoomModel !== this._dataZoomModel) {
                return;
            }

            var axisDim = this._dimName;
            var seriesModels = this.getTargetSeriesModels();
            var filterMode = dataZoomModel.get('filterMode');
            var valueWindow = this._valueWindow;

            // FIXME
            // Toolbox may has dataZoom injected. And if there are stacked bar chart
            // with NaN data, NaN will be filtered and stack will be wrong.
            // So we need to force the mode to be set empty.
            // In fect, it is not a big deal that do not support filterMode-'filter'
            // when using toolbox#dataZoom, utill tooltip#dataZoom support "single axis
            // selection" some day, which might need "adapt to data extent on the
            // otherAxis", which is disabled by filterMode-'empty'.
            var otherAxisModel = this.getOtherAxisModel();
            if (dataZoomModel.get('$fromToolbox')
                && otherAxisModel
                && otherAxisModel.get('type') === 'category'
            ) {
                filterMode = 'empty';
            }

            // Process series data
            each(seriesModels, function (seriesModel) {
                var seriesData = seriesModel.getData();

                seriesData && each(seriesModel.coordDimToDataDim(axisDim), function (dim) {
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
        var dataExtent = [Infinity, -Infinity];

        each(seriesModels, function (seriesModel) {
            var seriesData = seriesModel.getData();
            if (seriesData) {
                each(seriesModel.coordDimToDataDim(axisDim), function (dim) {
                    var seriesExtent = seriesData.getDataExtent(dim);
                    seriesExtent[0] < dataExtent[0] && (dataExtent[0] = seriesExtent[0]);
                    seriesExtent[1] > dataExtent[1] && (dataExtent[1] = seriesExtent[1]);
                });
            }
        }, this);

        return dataExtent;
    }

    function calculateDataWindow(opt, dataExtent, axisProxy) {
        var axisModel = axisProxy.getAxisModel();
        var scale = axisModel.axis.scale;
        var percentExtent = [0, 100];
        var percentWindow = [
            opt.start,
            opt.end
        ];
        var valueWindow = [];

        // In percent range is used and axis min/max/scale is set,
        // window should be based on min/max/0, but should not be
        // based on the extent of filtered data.
        dataExtent = dataExtent.slice();
        fixExtendByAxis(dataExtent, axisModel, scale);

        each(['startValue', 'endValue'], function (prop) {
            valueWindow.push(
                opt[prop] != null
                    ? scale.parse(opt[prop])
                    : null
            );
        });

        // Normalize bound.
        each([0, 1], function (idx) {
            var boundValue = valueWindow[idx];
            var boundPercent = percentWindow[idx];

            // start/end has higher priority over startValue/endValue,
            // because start/end can be consistent among different type
            // of axis but startValue/endValue not.

            if (boundPercent != null || boundValue == null) {
                if (boundPercent == null) {
                    boundPercent = percentExtent[idx];
                }
                // Use scale.parse to math round for category or time axis.
                boundValue = scale.parse(numberUtil.linearMap(
                    boundPercent, percentExtent, dataExtent, true
                ));
            }
            else { // boundPercent == null && boundValue != null
                boundPercent = numberUtil.linearMap(
                    boundValue, dataExtent, percentExtent, true
                );
            }
            // valueWindow[idx] = round(boundValue);
            // percentWindow[idx] = round(boundPercent);
            valueWindow[idx] = boundValue;
            percentWindow[idx] = boundPercent;
        });

        return {
            valueWindow: asc(valueWindow),
            percentWindow: asc(percentWindow)
        };
    }

    function fixExtendByAxis(dataExtent, axisModel, scale) {
        each(['min', 'max'], function (minMax, index) {
            var axisMax = axisModel.get(minMax, true);
            // Consider 'dataMin', 'dataMax'
            if (axisMax != null && (axisMax + '').toLowerCase() !== 'data' + minMax) {
                dataExtent[index] = scale.parse(axisMax);
            }
        });

        if (!axisModel.get('scale', true)) {
            dataExtent[0] > 0 && (dataExtent[0] = 0);
            dataExtent[1] < 0 && (dataExtent[1] = 0);
        }

        return dataExtent;
    }

    function setAxisModel(axisProxy, isRestore) {
        var axisModel = axisProxy.getAxisModel();

        var percentWindow = axisProxy._percentWindow;
        var valueWindow = axisProxy._valueWindow;

        if (!percentWindow) {
            return;
        }

        var isFull = isRestore || (percentWindow[0] === 0 && percentWindow[1] === 100);
        // [0, 500]: arbitrary value, guess axis extent.
        var precision = !isRestore && numberUtil.getPixelPrecision(valueWindow, [0, 500]);
        // toFixed() digits argument must be between 0 and 20
        var invalidPrecision = !isRestore && !(precision < 20 && precision >= 0);

        var useOrigin = isRestore || isFull || invalidPrecision;

        axisModel.setRange && axisModel.setRange(
            useOrigin ? null : +valueWindow[0].toFixed(precision),
            useOrigin ? null : +valueWindow[1].toFixed(precision)
        );
    }

    return AxisProxy;

});
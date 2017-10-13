/**
 * @file Axis operator
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');
    var helper = require('./helper');
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
         * {minSpan, maxSpan, minValueSpan, maxValueSpan}
         * @private
         * @type {Object}
         */
        this._minMaxSpan;

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
         * @return {Array.<number>} Value can only be NaN or finite value.
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
            var ecModel = this.ecModel;

            ecModel.eachSeries(function (seriesModel) {
                if (helper.isCoordSupported(seriesModel.get('coordinateSystem'))) {
                    var dimName = this._dimName;
                    var axisModel = ecModel.queryComponents({
                        mainType: dimName + 'Axis',
                        index: seriesModel.get(dimName + 'AxisIndex'),
                        id: seriesModel.get(dimName + 'AxisId')
                    })[0];
                    if (this._axisIndex === (axisModel && axisModel.componentIndex)) {
                        seriesModels.push(seriesModel);
                    }
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

        getMinMaxSpan: function () {
            return zrUtil.clone(this._minMaxSpan);
        },

        /**
         * Only calculate by given range and this._dataExtent, do not change anything.
         *
         * @param {Object} opt
         * @param {number} [opt.start]
         * @param {number} [opt.end]
         * @param {number} [opt.startValue]
         * @param {number} [opt.endValue]
         */
        calculateDataWindow: function (opt) {
            var dataExtent = this._dataExtent;
            var axisModel = this.getAxisModel();
            var scale = axisModel.axis.scale;
            var rangePropMode = this._dataZoomModel.getRangePropMode();
            var percentExtent = [0, 100];
            var percentWindow = [
                opt.start,
                opt.end
            ];
            var valueWindow = [];

            each(['startValue', 'endValue'], function (prop) {
                valueWindow.push(opt[prop] != null ? scale.parse(opt[prop]) : null);
            });

            // Normalize bound.
            each([0, 1], function (idx) {
                var boundValue = valueWindow[idx];
                var boundPercent = percentWindow[idx];

                // Notice: dataZoom is based either on `percentProp` ('start', 'end') or
                // on `valueProp` ('startValue', 'endValue'). The former one is suitable
                // for cases that a dataZoom component controls multiple axes with different
                // unit or extent, and the latter one is suitable for accurate zoom by pixel
                // (e.g., in dataZoomSelect). `valueProp` can be calculated from `percentProp`,
                // but it is awkward that `percentProp` can not be obtained from `valueProp`
                // accurately (because all of values that are overflow the `dataExtent` will
                // be calculated to percent '100%'). So we have to use
                // `dataZoom.getRangePropMode()` to mark which prop is used.
                // `rangePropMode` is updated only when setOption or dispatchAction, otherwise
                // it remains its original value.

                if (rangePropMode[idx] === 'percent') {
                    if (boundPercent == null) {
                        boundPercent = percentExtent[idx];
                    }
                    // Use scale.parse to math round for category or time axis.
                    boundValue = scale.parse(numberUtil.linearMap(
                        boundPercent, percentExtent, dataExtent, true
                    ));
                }
                else {
                    // Calculating `percent` from `value` may be not accurate, because
                    // This calculation can not be inversed, because all of values that
                    // are overflow the `dataExtent` will be calculated to percent '100%'
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
            this._dataExtent = calculateDataExtent(
                this, this._dimName, this.getTargetSeriesModels()
            );

            var dataWindow = this.calculateDataWindow(dataZoomModel.option);

            this._valueWindow = dataWindow.valueWindow;
            this._percentWindow = dataWindow.percentWindow;

            setMinMaxSpan(this);

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

            if (filterMode === 'none') {
                return;
            }

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
                var dataDims = seriesModel.coordDimToDataDim(axisDim);

                if (filterMode === 'weakFilter') {
                    seriesData && seriesData.filterSelf(function (dataIndex) {
                        var leftOut;
                        var rightOut;
                        var hasValue;
                        for (var i = 0; i < dataDims.length; i++) {
                            var value = seriesData.get(dataDims[i], dataIndex);
                            var thisHasValue = !isNaN(value);
                            var thisLeftOut = value < valueWindow[0];
                            var thisRightOut = value > valueWindow[1];
                            if (thisHasValue && !thisLeftOut && !thisRightOut) {
                                return true;
                            }
                            thisHasValue && (hasValue = true);
                            thisLeftOut && (leftOut = true);
                            thisRightOut && (rightOut = true);
                        }
                        // If both left out and right out, do not filter.
                        return hasValue && leftOut && rightOut;
                    });
                }
                else {
                    seriesData && each(dataDims, function (dim) {
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
                }
            });

            function isInWindow(value) {
                return value >= valueWindow[0] && value <= valueWindow[1];
            }
        }
    };

    function calculateDataExtent(axisProxy, axisDim, seriesModels) {
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
        });

        if (dataExtent[1] < dataExtent[0]) {
            dataExtent = [NaN, NaN];
        }

        // It is important to get "consistent" extent when more then one axes is
        // controlled by a `dataZoom`, otherwise those axes will not be synchronized
        // when zooming. But it is difficult to know what is "consistent", considering
        // axes have different type or even different meanings (For example, two
        // time axes are used to compare data of the same date in different years).
        // So basically dataZoom just obtains extent by series.data (in category axis
        // extent can be obtained from axis.data).
        // Nevertheless, user can set min/max/scale on axes to make extent of axes
        // consistent.
        fixExtentByAxis(axisProxy, dataExtent);

        return dataExtent;
    }

    function fixExtentByAxis(axisProxy, dataExtent) {
        var axisModel = axisProxy.getAxisModel();
        var min = axisModel.getMin(true);

        // For category axis, if min/max/scale are not set, extent is determined
        // by axis.data by default.
        var isCategoryAxis = axisModel.get('type') === 'category';
        var axisDataLen = isCategoryAxis && (axisModel.get('data') || []).length;

        if (min != null && min !== 'dataMin' && typeof min !== 'function') {
            dataExtent[0] = min;
        }
        else if (isCategoryAxis) {
            dataExtent[0] = axisDataLen > 0 ? 0 : NaN;
        }

        var max = axisModel.getMax(true);
        if (max != null && max !== 'dataMax' && typeof max !== 'function') {
            dataExtent[1] = max;
        }
        else if (isCategoryAxis) {
            dataExtent[1] = axisDataLen > 0 ? axisDataLen - 1 : NaN;
        }

        if (!axisModel.get('scale', true)) {
            dataExtent[0] > 0 && (dataExtent[0] = 0);
            dataExtent[1] < 0 && (dataExtent[1] = 0);
        }

        // For value axis, if min/max/scale are not set, we just use the extent obtained
        // by series data, which may be a little different from the extent calculated by
        // `axisHelper.getScaleExtent`. But the different just affects the experience a
        // little when zooming. So it will not be fixed until some users require it strongly.

        return dataExtent;
    }

    function setAxisModel(axisProxy, isRestore) {
        var axisModel = axisProxy.getAxisModel();

        var percentWindow = axisProxy._percentWindow;
        var valueWindow = axisProxy._valueWindow;

        if (!percentWindow) {
            return;
        }

        // [0, 500]: arbitrary value, guess axis extent.
        var precision = numberUtil.getPixelPrecision(valueWindow, [0, 500]);
        precision = Math.min(precision, 20);
        // isRestore or isFull
        var useOrigin = isRestore || (percentWindow[0] === 0 && percentWindow[1] === 100);

        axisModel.setRange(
            useOrigin ? null : +valueWindow[0].toFixed(precision),
            useOrigin ? null : +valueWindow[1].toFixed(precision)
        );
    }

    function setMinMaxSpan(axisProxy) {
        var minMaxSpan = axisProxy._minMaxSpan = {};
        var dataZoomModel = axisProxy._dataZoomModel;

        each(['min', 'max'], function (minMax) {
            minMaxSpan[minMax + 'Span'] = dataZoomModel.get(minMax + 'Span');

            // minValueSpan and maxValueSpan has higher priority than minSpan and maxSpan
            var valueSpan = dataZoomModel.get(minMax + 'ValueSpan');
            if (valueSpan != null) {
                minMaxSpan[minMax + 'ValueSpan'] = valueSpan;

                valueSpan = axisProxy.getAxisModel().axis.scale.parse(valueSpan);
                if (valueSpan != null) {
                    minMaxSpan[minMax + 'Span'] = numberUtil.linearMap(
                        valueSpan, axisProxy._dataExtent, [0, 100], true
                    );
                }
            }
        });
    }

    return AxisProxy;

});
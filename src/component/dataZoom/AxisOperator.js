/**
 * @file Axis operator
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');

    /**
     * Operate single axis.
     * One axis can only operated by one axis operator.
     * Different dataZoomModels may be defined to operate the same axis.
     * (i.e. 'inside' data zoom and 'slider' data zoom components)
     * So dataZoomModels share one axisOperator in that case.
     *
     * @class
     */
    var AxisOperator = function (dimName, axisIndex, dataZoomModel, ecModel) {

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
         * @type {boolean}
         */
        this._crossZero;

        /**
         * @private
         * @type {Array.<number>}
         */
        this._dataWindow;

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

    AxisOperator.prototype = {

        constructor: AxisOperator,

        /**
         * @param {boolean} crossZero
         */
        backupCrossZero: function (model, crossZero) {
            if (model === this._model) {
                this._crossZero = crossZero;
            }
        },

        /**
         * @return {boolean} crossZero
         */
        getCrossZero: function () {
            return this._crossZero;
        },

        /**
         * @param {boolean} crossZero
         */
        getDataWindow: function () {
            return this._dataWindow;
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

        /**
         * @param {module: echarts/component/dataZoom/DataZoomModel} model
         */
        filterData: function (model) {
            if (model !== this._model) {
                return;
            }

            // Process axis data
            var dimName = this._dimName;
            var axisModel = this.ecModel.getComponent(this._dimName + 'Axis', this._axisIndex);
            var isCategoryFilter = axisModel.get('type') === 'category';
            var seriesModels = this.getTargetSeriesModels();
            var dataZoomModel = this._model;

            var filterMode = dataZoomModel.get('filterMode');
            var dataExtent = calculateDataExtent(dimName, seriesModels);
            var dataWindow = calculateDataWindow(dataZoomModel, dataExtent, isCategoryFilter);

            // Record data window.
            this._dataWindow = dataWindow.slice();

            // Process series data
            zrUtil.each(seriesModels, function (seriesModel) {
                // FIXME
                // 这里仅仅处理了list类型
                var seriesData = seriesModel.getData();
                if (!seriesData) {
                    return;
                }

                if (filterMode === 'empty') {
                    seriesModel.setData(
                        seriesData.map(dimName, function (value) {
                            return !isInWindow(value) ? NaN : value;
                        })
                    );
                }
                else {
                    seriesData.filterSelf(dimName, isInWindow);
                }

                // FIXME
                // 对于数值轴，还要考虑log等情况.
                // FIXME
                // 对于时间河流图，还要考虑是否须整块移除。
            });

            function isInWindow(value) {
                return value >= dataWindow[0] && value <= dataWindow[1];
            }
        }
    };

    function calculateDataExtent(dimName, seriesModels) {
        var dataExtent = [Number.MAX_VALUE, Number.MIN_VALUE];

        zrUtil.each(seriesModels, function (seriesModel) {
            var seriesData = seriesModel.getData();
            if (seriesData) {
                var seriesExtent = seriesData.getDataExtent(dimName);
                seriesExtent[0] < dataExtent[0] && (dataExtent[0] = seriesExtent[0]);
                seriesExtent[1] > dataExtent[1] && (dataExtent[1] = seriesExtent[1]);
            }
        }, this);

        return dataExtent;
    }

    function calculateDataWindow(dataZoomModel, dataExtent, isCategoryFilter) {
        var result = numberUtil.linearMap(dataZoomModel.getRange(), [0, 100], dataExtent, true);

        if (isCategoryFilter) {
            result = [Math.floor(result[0]), Math.ceil(result[1])];
        }

        return result;
    }

    return AxisOperator;

});
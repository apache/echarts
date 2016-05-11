/**
 * @file Data zoom model
 */
define(function(require) {

    var VisualMapModel = require('./VisualMapModel');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');

    // Constant
    var DEFAULT_BAR_BOUND = [20, 140];

    var ContinuousModel = VisualMapModel.extend({

        type: 'visualMap.continuous',

        /**
         * @protected
         */
        defaultOption: {
            align: 'auto',          // 'auto', 'left', 'right', 'top', 'bottom'
            calculable: false,      // This prop effect default component type determine,
                                    // See echarts/component/visualMap/typeDefaulter.
            range: [-Infinity, Infinity], // selected range
            realtime: true,         // Whether realtime update.
            itemHeight: null,       // The length of the range control edge.
            itemWidth: null,        // The length of the other side.
            hoverLink: true         // Enable hover highlight.
        },

        /**
         * @override
         */
        doMergeOption: function (newOption, isInit) {
            ContinuousModel.superApply(this, 'doMergeOption', arguments);

            this.resetTargetSeries(newOption, isInit);
            this.resetExtent();

            this.resetVisual(function (mappingOption) {
                mappingOption.mappingMethod = 'linear';
            });

            this._resetRange();
        },

        /**
         * @protected
         * @override
         */
        resetItemSize: function () {
            VisualMapModel.prototype.resetItemSize.apply(this, arguments);

            var itemSize = this.itemSize;

            this._orient === 'horizontal' && itemSize.reverse();

            (itemSize[0] == null || isNaN(itemSize[0])) && (itemSize[0] = DEFAULT_BAR_BOUND[0]);
            (itemSize[1] == null || isNaN(itemSize[1])) && (itemSize[1] = DEFAULT_BAR_BOUND[1]);
        },

        /**
         * @private
         */
        _resetRange: function () {
            var dataExtent = this.getExtent();
            var range = this.option.range;
            if (range[0] > range[1]) {
                range.reverse();
            }
            range[0] = Math.max(range[0], dataExtent[0]);
            range[1] = Math.min(range[1], dataExtent[1]);
        },

        /**
         * @protected
         * @override
         */
        completeVisualOption: function () {
            VisualMapModel.prototype.completeVisualOption.apply(this, arguments);

            zrUtil.each(this.stateList, function (state) {
                var symbolSize = this.option.controller[state].symbolSize;
                if (symbolSize && symbolSize[0] !== symbolSize[1]) {
                    symbolSize[0] = 0; // For good looking.
                }
            }, this);
        },

        /**
         * @public
         * @override
         */
        setSelected: function (selected) {
            this.option.range = selected.slice();
            this._resetRange();
        },

        /**
         * @public
         */
        getSelected: function () {
            var dataExtent = this.getExtent();

            var dataInterval = numberUtil.asc(
                (this.get('range') || []).slice()
            );

            // Clamp
            dataInterval[0] > dataExtent[1] && (dataInterval[0] = dataExtent[1]);
            dataInterval[1] > dataExtent[1] && (dataInterval[1] = dataExtent[1]);
            dataInterval[0] < dataExtent[0] && (dataInterval[0] = dataExtent[0]);
            dataInterval[1] < dataExtent[0] && (dataInterval[1] = dataExtent[0]);

            return dataInterval;
        },

        /**
         * @public
         * @override
         */
        getValueState: function (value) {
            var range = this.option.range;
            var dataExtent = this.getExtent();

            // When range[0] === dataExtent[0], any value larger than dataExtent[0] maps to 'inRange'.
            // range[1] is processed likewise.
            return (
                (range[0] <= dataExtent[0] || range[0] <= value)
                && (range[1] >= dataExtent[1] || value <= range[1])
            ) ? 'inRange' : 'outOfRange';
        },

        /**
         * @public
         * @params {Array.<number>} range target value: range[0] <= value && value <= range[1]
         * @return {Array.<Object>} [{seriesId, dataIndices: <Array.<number>>}, ...]
         */
        findTargetDataIndices: function (range) {
            var result = [];

            this.eachTargetSeries(function (seriesModel) {
                var dataIndices = [];
                var data = seriesModel.getData();

                data.each(this.getDataDimension(data), function (value, dataIndex) {
                    range[0] <= value && value <= range[1] && dataIndices.push(dataIndex);
                }, true, this);

                result.push({seriesId: seriesModel.id, dataIndices: dataIndices});
            }, this);

            return result;
        }

    });

    return ContinuousModel;

});
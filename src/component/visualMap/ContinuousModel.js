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
            range: null,            // selected range. In default case `range` is [min, max]
                                    // and can auto change along with modification of min max,
                                    // util use specifid a range.
            realtime: true,         // Whether realtime update.
            itemHeight: null,       // The length of the range control edge.
            itemWidth: null,        // The length of the other side.
            hoverLink: true,        // Enable hover highlight.
            hoverLinkDataSize: null,// The size of hovered data.
            hoverLinkOnHandle: true // Whether trigger hoverLink when hover handle.
        },

        /**
         * @override
         */
        optionUpdated: function (newOption, isInit) {
            ContinuousModel.superApply(this, 'optionUpdated', arguments);

            this.resetTargetSeries();
            this.resetExtent();

            this.resetVisual(function (mappingOption) {
                mappingOption.mappingMethod = 'linear';
                mappingOption.dataExtent = this.getExtent();
            });

            this._resetRange();
        },

        /**
         * @protected
         * @override
         */
        resetItemSize: function () {
            ContinuousModel.superApply(this, 'resetItemSize', arguments);

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

            if (!range || range.auto) {
                // `range` should always be array (so we dont use other
                // value like 'auto') for user-friend. (consider getOption).
                dataExtent.auto = 1;
                this.option.range = dataExtent;
            }
            else if (zrUtil.isArray(range)) {
                if (range[0] > range[1]) {
                    range.reverse();
                }
                range[0] = Math.max(range[0], dataExtent[0]);
                range[1] = Math.min(range[1], dataExtent[1]);
            }
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

                result.push({seriesId: seriesModel.id, dataIndex: dataIndices});
            }, this);

            return result;
        },

        getStops: function (seriesModel, getColorVisual) {
            var result = [];
            insertStopList(this, 'outOfRange', this.getExtent(), result);
            insertStopList(this, 'inRange', this.option.range.slice(), result);

            zrUtil.each(result, function (item) {
                item.color = getColorVisual(this, item.value, item.valueState);
            }, this);

            return result;
        }

    });

    function getColorStopValues(visualMapModel, valueState, dataExtent) {
        var mapping = visualMapModel.targetVisuals[valueState].color;

        if (!mapping) {
            return dataExtent.slice();
        }

        var count = mapping.option.visual.length;

        if (count <= 1 || dataExtent[0] === dataExtent[1]) {
            return dataExtent.slice();
        }

        // We only use linear mappping for color, so we can do inverse mapping:
        var step = (dataExtent[1] - dataExtent[0]) / (count - 1);
        var value = dataExtent[0];
        var stopValues = [];
        for (var i = 0; i < count && value < dataExtent[1]; i++) {
            stopValues.push(value);
            value += step;
        }
        stopValues.push(dataExtent[1]);

        return stopValues;
    }

    function insertStopList(visualMapModel, valueState, dataExtent, result) {
        var stops = getColorStopValues(visualMapModel, valueState, dataExtent);

        zrUtil.each(stops, function (val) {
            var stop = {value: val, valueState: valueState};
            var inRange = 0;
            for (var i = 0; i < result.length; i++) {
                // Format to: outOfRange -- inRange -- outOfRange.
                inRange |= result[i].valueState === 'inRange';
                if (val < result[i].value) {
                    result.splice(i, 0, stop);
                    return;
                }
                inRange && (result[i].valueState = 'inRange');
            }
            result.push(stop);
        });
    }

    return ContinuousModel;

});
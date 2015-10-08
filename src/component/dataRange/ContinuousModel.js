
/**
 * @file Data zoom model
 */
define(function(require) {

    var DataRangeModel = require('./DataRangeModel');

    return DataRangeModel.extend({

        type: 'dataRange.continuous',

        /**
         * @protected
         */
        defaultOption: {
            handlePosition: 'auto',     // 'auto', 'left', 'right', 'top', 'bottom'
            calculable: false,         // 是否值域漫游，启用后无视splitNumber和splitList，线性渐变
            range: [-Infinity, Infinity], // 当前选中范围
            hoverLink: true,
            realtime: true,
            itemWidth: null,            // 值域图形宽度
            itemHeight: null            // 值域图形高度
        },

        /**
         * @override
         */
        mergeOption: function (newOption, isInit) {
            this.baseMergeOption(newOption);

            this.resetTargetSeries(newOption, isInit);
            this.resetExtent();

            this.resetVisual(function (mappingOption) {
                mappingOption.dataNormalizer = 'linear';
            });

            this._resetRange();
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
         * @public
         * @override
         */
        setSelected: function (selected) {
            this.option.range = selected.slice();
            this._resetRange();
        },

        /**
         * @public
         * @override
         */
        getValueState: function (value) {
            var range = this.option.range;
            return (range[0] <= value && value <= range[1])
                ? 'inRange' : 'outOfRange';
        }

    });

});
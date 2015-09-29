
/**
 * @file Data zoom model
 */
define(function(require) {

    var DataRangeModel = require('./DataRangeModel');
    var VisualMapping = require('../../visual/VisualMapping');
    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');

    return DataRangeModel.extend({

        type: 'dataRange.continuous',

        /**
         * @protected
         */
        defaultOption: {
            handlePosition: 'auto',     // 'auto', 'left', 'right', 'top', 'bottom'
            calculable: false,         // 是否值域漫游，启用后无视splitNumber和splitList，线性渐变
            hoverLink: true,
            realtime: true,
            itemWidth: 200,            // 值域图形宽度
            itemHeight: 140            // 值域图形高度
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
        },

        /**
         * @public
         * @override
         */
        getValueState: function (value) {
            var dataExtent = this.getExtent();
            return dataExtent[0] <= value && value <= dataExtent[1]
                ? 'inRange' : 'outOfRange';
        }

    });

});

/**
 * @file Data zoom model
 */
define(function(require) {

    var DataRangeModel = require('./DataRangeModel');
    var VisualMapping = require('../../visual/VisualMapping');
    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');

    return DataRangeModel.extend({

        type: 'dataRange.continuity',

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

            var thisOption = this.option;

            this.resetTargetSeries(newOption, isInit);
            this.resetExtent();

            this._resetVisual('selected');
            this._resetVisual('unselected');
            this._resetVisual('hovered');
        },

        _resetVisual: function () {
            var visualOption = this.option['visual' + modelUtil.capitalFirst(visualState)];
            if (!visualOption) {
                visualOption = zrUtil.clone(this.option.visualSelected, true);
            }
            visualOption.dataNormalizer = 'linear';
            visualOption.dataExtent = this.getExtent();

            this.visualMapping = new VisualMapping(visualOption);
        }

    });

});
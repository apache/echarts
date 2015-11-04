/**
 * Data selectable mixin for chart series.
 * To eanble data select, option of series must have `selectedMode`.
 * And each data item will use `selected` to toggle itself selected status
 *
 * @module echarts/chart/helper/DataSelectable
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');

    return {

        updateSelectedMap: function () {
            var option = this.option;
            this._dataOptMap = zrUtil.reduce(option.data, function (dataOptMap, dataOpt) {
                dataOptMap[dataOpt.name] = dataOpt;
                return dataOptMap;
            }, {});
        },
        /**
         * @param {string} name
         */
        // PENGING If selectedMode is null ?
        select: function (name) {
            var dataOptMap = this._dataOptMap;
            var dataOpt = dataOptMap[name];
            var selectedMode = this.get('selectedMode');
            if (selectedMode === 'single') {
                zrUtil.each(dataOptMap, function (dataOpt) {
                    dataOpt.selected = false;
                });
            }
            dataOpt && (dataOpt.selected = true);
        },

        /**
         * @param {string} name
         */
        unSelect: function (name) {
            var dataOpt = this._dataOptMap[name];
            // var selectedMode = this.get('selectedMode');
            // selectedMode !== 'single' && dataOpt && (dataOpt.selected = false);
            dataOpt && (dataOpt.selected = false);
        },

        /**
         * @param {string} name
         */
        toggleSelected: function (name) {
            var dataOpt = this._dataOptMap[name];
            if (dataOpt != null) {
                this[dataOpt.selected ? 'unSelect' : 'select'](name);
                return dataOpt.selected;
            }
        },

        /**
         * @param {string} name
         */
        isSelected: function (name) {
            var dataOpt = this._dataOptMap[name];
            return dataOpt && dataOpt.selected;
        }
    };
});
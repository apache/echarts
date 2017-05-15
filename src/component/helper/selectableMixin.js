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

        updateSelectedMap: function (targetList) {
            this._selectTargetMap = zrUtil.reduce(targetList || [], function (targetMap, target) {
                targetMap.set(target.name, target);
                return targetMap;
            }, zrUtil.createHashMap());
        },
        /**
         * @param {string} name
         */
        // PENGING If selectedMode is null ?
        select: function (name) {
            var targetMap = this._selectTargetMap;
            var target = targetMap.get(name);
            var selectedMode = this.get('selectedMode');
            if (selectedMode === 'single') {
                targetMap.each(function (target) {
                    target.selected = false;
                });
            }
            target && (target.selected = true);
        },

        /**
         * @param {string} name
         */
        unSelect: function (name) {
            var target = this._selectTargetMap.get(name);
            // var selectedMode = this.get('selectedMode');
            // selectedMode !== 'single' && target && (target.selected = false);
            target && (target.selected = false);
        },

        /**
         * @param {string} name
         */
        toggleSelected: function (name) {
            var target = this._selectTargetMap.get(name);
            if (target != null) {
                this[target.selected ? 'unSelect' : 'select'](name);
                return target.selected;
            }
        },

        /**
         * @param {string} name
         */
        isSelected: function (name) {
            var target = this._selectTargetMap.get(name);
            return target && target.selected;
        }
    };
});
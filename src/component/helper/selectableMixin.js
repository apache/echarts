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
            this._targetList = targetList.slice();
            this._selectTargetMap = zrUtil.reduce(targetList || [], function (targetMap, target) {
                targetMap.set(target.name, target);
                return targetMap;
            }, zrUtil.createHashMap());
        },
        /**
         * @param {object} payload object containing name or dataIndex
         */
        // PENGING If selectedMode is null ?
        select: function (name, id) {
            var target = id != null
                ? this._targetList[id]
                : this._selectTargetMap.get(name);
            var selectedMode = this.get('selectedMode');
            if (selectedMode === 'single') {
                this._selectTargetMap.each(function (target) {
                    target.selected = false;
                });
            }
            target && (target.selected = true);
        },

        /**
         * @param {object} payload object containing name or dataIndex
         */
        unSelect: function (name, id) {
            var target = id != null
                ? this._targetList[id]
                : this._selectTargetMap.get(name);
            // var selectedMode = this.get('selectedMode');
            // selectedMode !== 'single' && target && (target.selected = false);
            target && (target.selected = false);
        },

        /**
         * @param {object} payload object containing name or dataIndex
         */
        toggleSelected: function (name, id) {
            var target = id != null
                ? this._targetList[id]
                : this._selectTargetMap.get(name);
            if (target != null) {
                this[target.selected ? 'unSelect' : 'select'](name, id);
                return target.selected;
            }
        },

        /**
         * @param {object} payload object containing name or dataIndex
         */
        isSelected: function (name, id) {
            var target = id != null
                ? this._targetList[id]
                : this._selectTargetMap.get(name);
            return target && target.selected;
        }
    };
});
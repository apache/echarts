/**
 * Data selectable mixin for chart series.
 * To eanble data select, option of series must have `selectedMode`.
 * And each data item will use `selected` to toggle itself selected status
 *
 * @module echarts/chart/helper/DataSelectable
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');

    var _targetList;

    return {

        updateSelectedMap: function (targetList) {
            _targetList = targetList;
            this._selectTargetMap = zrUtil.reduce(targetList || [], function (targetMap, target) {
                targetMap.set(target.name, target);
                return targetMap;
            }, zrUtil.createHashMap());
        },
        /**
         * @param {string} nameOrId name or dataIndex
         */
        // PENGING If selectedMode is null ?
        select: function (nameOrId) {
            var targetMap = this._selectTargetMap;
            var target = typeof nameOrId === 'number'
                ? _targetList[nameOrId]
                : targetMap.get(nameOrId);
            var selectedMode = this.get('selectedMode');
            if (selectedMode === 'single') {
                targetMap.each(function (target) {
                    target.selected = false;
                });
            }
            target && (target.selected = true);
        },

        /**
         * @param {string} nameOrId name or dataIndex
         */
        unSelect: function (nameOrId) {
            var targetMap = this._selectTargetMap;
            var target = typeof nameOrId === 'number'
                ? _targetList[nameOrId]
                : targetMap.get(nameOrId);
            // var selectedMode = this.get('selectedMode');
            // selectedMode !== 'single' && target && (target.selected = false);
            target && (target.selected = false);
        },

        /**
         * @param {string} nameOrId name or dataIndex
         */
        toggleSelected: function (nameOrId) {
            var targetMap = this._selectTargetMap;
            var target = typeof nameOrId === 'number'
                ? _targetList[nameOrId]
                : targetMap.get(nameOrId);
            if (target != null) {
                this[target.selected ? 'unSelect' : 'select'](nameOrId);
                return target.selected;
            }
        },

        /**
         * @param {string} nameOrId name or dataIndex
         */
        isSelected: function (nameOrId) {
            var targetMap = this._selectTargetMap;
            var target = typeof nameOrId === 'number'
                ? _targetList[nameOrId]
                : targetMap.get(nameOrId);
            return target && target.selected;
        }
    };
});
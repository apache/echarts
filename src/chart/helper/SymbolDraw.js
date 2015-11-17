/**
 * @module echarts/chart/helper/SymbolDraw
 */
define(function (require) {

    var graphic = require('../../util/graphic');
    var Symbol = require('./Symbol');

    /**
     * @constructor
     */
    function SymbolDraw() {
        this.group = new graphic.Group();
    }

    var symbolDrawProto = SymbolDraw.prototype;

    /**
     * @param {module:echarts/data/List} data
     * @param {module:echarts/ExtensionAPI} api
     * @param {Array.<boolean>} [isIgnore]
     */
    symbolDrawProto.updateData = function (data, api, isIgnore) {
        var group = this.group;
        var oldData = this._data;

        data.diff(oldData)
            .add(function (newIdx) {
                if (
                    data.hasValue(newIdx) && !(isIgnore && isIgnore(newIdx))
                    && data.getItemVisual(newIdx, 'symbol') !== 'none'
                ) {
                    var symbolEl = new Symbol(data, newIdx, api);
                    symbolEl.attr('position', data.getItemLayout(newIdx));
                    data.setItemGraphicEl(newIdx, symbolEl);
                    group.add(symbolEl);
                }
            })
            .update(function (newIdx, oldIdx) {
                var symbolEl = oldData.getItemGraphicEl(oldIdx);
                // Empty data
                if (!data.hasValue(newIdx) || (isIgnore && isIgnore(newIdx))) {
                    group.remove(symbolEl);
                    return;
                }
                var point = data.getItemLayout(newIdx);
                if (!symbolEl) {
                    symbolEl = new Symbol(data, newIdx, api);
                    symbolEl.attr('position', point);
                }
                else {
                    symbolEl.updateSymbol(data, newIdx, api);
                    api.updateGraphicEl(symbolEl, {
                        position: point
                    });
                }

                // Add back
                group.add(symbolEl);

                data.setItemGraphicEl(newIdx, symbolEl);
            })
            .remove(function (oldIdx) {
                var el = oldData.getItemGraphicEl(oldIdx);
                el && el.fadeOut(function () {
                    group.remove(el);
                }, api);
            })
            .execute();

        this._data = data;
    };

    symbolDrawProto.updateLayout = function () {
        var data = this._data;
        if (data) {
            // Not use animation
            data.eachItemGraphicEl(function (el, idx) {
                el.attr('position', data.getItemLayout(idx));
            });
        }
    };

    symbolDrawProto.remove = function (api, enableAnimation) {
        var group = this.group;
        var data = this._data;
        if (data) {
            if (enableAnimation) {
                data.eachItemGraphicEl(function (el) {
                    el.fadeOut(function () {
                        group.remove(el);
                    }, api);
                });
            }
            else {
                group.removeAll();
            }
        }
    };

    return SymbolDraw;
});
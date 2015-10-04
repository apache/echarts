define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Group = require('zrender/container/Group');
    var symbolCreators = require('../../util/symbol');
    var graphic = require('../../util/graphic');

    function normalizeSymbolSize(symbolSize) {
        if (!zrUtil.isArray(symbolSize)) {
            symbolSize = [+symbolSize, +symbolSize];
        }
        return symbolSize;
    }

    function createSymbol(data, idx, enableAnimation) {
        var point = data.getItemLayout(idx);
        var color = data.getItemVisual(idx, 'color');

        var symbolSize = data.getItemVisual(idx, 'symbolSize');
        var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';

        if (!symbolType || symbolType === 'none') {
            return;
        }

        symbolSize = normalizeSymbolSize(symbolSize);

        var x = -0.5;
        var y = -0.5;
        var w = 1;
        var h = 1;
        // FIXME
        if (symbolType.match(/(pin|Pin)$/)) {
            y = -0.8;
            h = 1.6;
        }
        var symbolEl = symbolCreators.createSymbol(
            symbolType, x, y, w, h, color
        );

        symbolEl.position = point;

        symbolEl.z2 = 100;

        if (enableAnimation) {

            symbolEl.scale = [0.1, 0.1];

            symbolEl.animateTo({
                scale: symbolSize
            }, 500);

            // symbolEl
            //     .on('mouseover', function () {
            //         this.animateTo({
            //             scale: [symbolSize * 1.4, symbolSize * 1.4]
            //         }, 400, 'elasticOut');
            //     })
            //     .on('mouseout', function () {
            //         this.animateTo({
            //             scale: [symbolSize, symbolSize]
            //         }, 400, 'elasticOut');
            //     });
        }
        else {
            symbolEl.scale = [symbolSize, symbolSize];
        }

        return symbolEl;
    }

    function DataSymbol() {
        this.group = new Group();
    }

    DataSymbol.prototype = {

        getData: function () {
            return this._data;
        },

        updateData: function (data, enableAnimation) {

            var group = this.group;
            var oldData = this._data;

            data.diff(oldData)
                .add(function (newIdx) {
                    // 空数据
                    // TODO
                    if (!data.hasValue(newIdx)) {
                        return;
                    }

                    var symbolEl = createSymbol(
                        data, newIdx, enableAnimation
                    );

                    if (symbolEl) {
                        data.setItemGraphicEl(newIdx, symbolEl);

                        group.add(symbolEl);
                    }
                })
                .update(function (newIdx, oldIdx) {
                    var el = oldData.getItemGraphicEl(oldIdx);

                    // Empty data
                    if (!data.hasValue(newIdx)) {
                        group.remove(el);
                        return;
                    }

                    var symbolSize = normalizeSymbolSize(
                        data.getItemVisual(newIdx, 'symbolSize')
                    );
                    var point = data.getItemLayout(newIdx);

                    // Symbol changed
                    if (oldData.getItemVisual(newIdx, 'symbol') !== data.getItemVisual(oldIdx, 'symbol')) {
                        // Remove the old one
                        el && group.remove(el);
                        el = createSymbol(data, newIdx, enableAnimation);
                    }
                    // Disable symbol by setting `symbol: 'none'`
                    if (!el) {
                        return;
                    }

                    // Update color
                    // FIXME emptyXXX ?
                    var newColor = data.getItemVisual(newIdx, 'color');
                    el.setColor(newColor);

                    // TODO Merge animateTo and attr methods into one
                    if (enableAnimation) {
                        el.animateTo({
                            scale: symbolSize,
                            position: point
                        }, 300, 'cubicOut');
                    }
                    else {
                        // May still have animation. Must stop
                        el.stopAnimation();
                        el.attr({
                            scale: symbolSize.slice(),
                            position: point.slice()
                        });
                    }

                    data.setItemGraphicEl(newIdx, el);

                    // Add back
                    group.add(el);
                })
                .remove(function (oldIdx) {
                    var el = oldData.getItemGraphicEl(oldIdx);
                    if (enableAnimation) {
                        el.animateTo({
                            scale: [0, 0]
                        }, 200, 'cubicOut', function () {
                            group.remove(el);
                        });
                    }
                    else {
                        // console.log(oldIdx);
                        group.remove(el);
                    }
                })
                .execute();

            // Update common properties
            data.eachItemGraphicEl(function (el, idx) {

                var itemModel = data.getItemModel(idx);
                zrUtil.extend(
                    el.style,
                    itemModel.getModel('itemStyle.normal').getItemStyle(['color'])
                );

                graphic.setHoverStyle(
                    el,
                    itemModel.getModel('itemStyle.emphasis').getItemStyle()
                );

                var symbolSize = data.getItemVisual(idx, 'symbolSize');
                // Adjust the line width
                el.__lineWidth = el.__lineWidth || el.style.lineWidth;
                el.style.lineWidth = el.__lineWidth / (symbolSize[0] || symbolSize);
            }, this);

            this._data = data;
        },

        remove: function (enableAnimation) {
            if (this._data) {
                var group = this.group;
                if (enableAnimation) {
                    this._data.eachItemGraphicEl(function (el) {
                        el.animateTo({
                            scale: [0, 0]
                        }, 200, 'cubicOut', function () {
                            group.remove(el);
                        });
                    });
                }
                else {
                    group.removeAll();
                }
            }
        }
    }

    return DataSymbol;
});
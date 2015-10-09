define(function (require) {

    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');
    var graphic = require('../../util/graphic');

    function normalizeSymbolSize(symbolSize) {
        if (!zrUtil.isArray(symbolSize)) {
            symbolSize = [+symbolSize, +symbolSize];
        }
        return symbolSize;
    }

    function isAroundEqual(a, b) {
        return Math.abs(a - b) < 1e-4;
    }

    function isSymbolSizeSame(a, b) {
        return isAroundEqual(a[0], b[0]) && isAroundEqual(a[1], b[1]);
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

        var x = -symbolSize[0] / 2;
        var y = -symbolSize[1] / 2;
        var w = symbolSize[0];
        var h = symbolSize[1];
        var symbolEl = symbolUtil.createSymbol(
            symbolType, x, y, w, h, color
        );

        symbolEl.position = point;

        symbolEl.z2 = 100;

        if (enableAnimation) {

            symbolEl.scale = [0, 0];

            symbolEl.animateTo({
                scale: [1, 1]
            }, 500);
        }
        else {
            symbolEl.scale = [1, 1];
        }

        return symbolEl;
    }

    function DataSymbol() {
        this.group = new graphic.Group();
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

                    var symbolType = data.getItemVisual(newIdx, 'symbol');
                    // Symbol changed
                    if (oldData.getItemVisual(oldIdx, 'symbol') !== symbolType) {
                        // Remove the old one
                        el && group.remove(el);
                        el = createSymbol(data, newIdx, enableAnimation);
                        // Disable symbol by setting `symbol: 'none'`
                        if (!el) {
                            return;
                        }
                    }
                    else {
                        // Update animation
                        if (!el) {
                            return;
                        }
                        var newTarget = {};
                        if (!isSymbolSizeSame(
                            symbolSize, normalizeSymbolSize(
                                oldData.getItemVisual(oldIdx, 'symbolSize')
                            )
                        )) {
                            // FIXME symbol created with pathStr has symbolSizeChanged
                            newTarget = symbolUtil.getSymbolShape(
                                symbolType,
                                -symbolSize[0] / 2, -symbolSize[1] / 2,
                                symbolSize[0], symbolSize[1]
                            ) || {};
                        }
                        var newColor = data.getItemVisual(newIdx, 'color');
                        el.setColor(newColor);

                        // TODO Merge animateTo and attr methods into one
                        newTarget.position = point.slice();
                        if (!isAroundEqual(el.scale[0], 1)) {    // May have scale 0
                            newTarget.scale = [1, 1];
                        }
                        if (enableAnimation) {
                            el.animateTo(newTarget, 300, 'cubicOut');
                        }
                        else {
                            // May still have animation. Must stop
                            el.stopAnimation();
                            el.attr(newTarget);
                        }
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
                var labelModel = itemModel.getModel('itemStyle.normal.label');
                var color = data.getItemVisual(idx, 'color');

                zrUtil.extend(
                    el.style,
                    itemModel.getModel('itemStyle.normal').getItemStyle(['color'])
                );

                if (labelModel.get('show')) {
                    var labelPosition = labelModel.get('position') || 'inside';
                    var labelColor = labelPosition === 'inside' ? 'white' : color;
                    // Text use the value of last dimension
                    var lastDim = data.dimensions[data.dimensions.length - 1];
                    el.setStyle({
                        // FIXME
                        text: data.get(lastDim, idx),
                        textFont: labelModel.getModel('textStyle').getFont(),
                        textPosition: labelPosition,
                        textFill: labelColor
                    });
                }

                graphic.setHoverStyle(
                    el,
                    itemModel.getModel('itemStyle.emphasis').getItemStyle()
                );
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
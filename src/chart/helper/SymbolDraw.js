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

        var size = data.getItemVisual(idx, 'symbolSize');
        var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';

        if (symbolType === 'none') {
            return;
        }

        size = normalizeSymbolSize(size);

        var symbolEl = symbolUtil.createSymbol(
            symbolType, -size[0] / 2, -size[1] / 2, size[0], size[1], color
        );

        symbolEl.attr({
            position: point,
            z2: 100
        });

        if (enableAnimation) {
            // FIXME Use scale to improve performance
            var zeroShape = symbolUtil.getSymbolShape(
                symbolType, 0, 0, 0, 0
            ).shape;
            var normalShape = symbolEl.shape;
            symbolEl.shape = zeroShape;
            symbolEl.animateTo({
                shape: normalShape
            }, 500);
        }

        return symbolEl;
    }

    function SymbolDraw() {
        this.group = new graphic.Group();
    }

    var symbolProto = SymbolDraw.prototype;

    /**
     * @param {module:echarts/data/List} data
     * @param {module:echarts/model/Series} seriesModel
     * @param {module:echarts/ExtensionAPI} api
     * @param {boolean} [enableAnimation=false]
     * @param {Array.<boolean>} [isIgnore]
     */
    symbolProto.updateData = function (
        data, seriesModel, api, enableAnimation, isIgnore
    ) {

        var group = this.group;
        var oldData = this._data;

        data.diff(oldData)
            .add(function (newIdx) {
                if (data.hasValue(newIdx) && !(isIgnore && isIgnore(newIdx))) {
                    var symbolEl = createSymbol(data, newIdx, enableAnimation);

                    if (symbolEl) {
                        data.setItemGraphicEl(newIdx, symbolEl);
                        group.add(symbolEl);
                    }
                }
            })
            .update(function (newIdx, oldIdx) {
                var el = oldData.getItemGraphicEl(oldIdx);
                // Empty data
                if (!data.hasValue(newIdx) || (isIgnore && isIgnore(newIdx))) {
                    group.remove(el);
                    return;
                }

                var size = normalizeSymbolSize(
                    data.getItemVisual(newIdx, 'symbolSize')
                );
                var point = data.getItemLayout(newIdx);

                var symbolType = data.getItemVisual(newIdx, 'symbol');
                // Symbol changed
                if (
                    oldData.getItemVisual(oldIdx, 'symbol') !== symbolType
                    || (!el && !(isIgnore && isIgnore(newIdx)))
                ) {
                    // Remove the old one
                    el && group.remove(el);
                    el = createSymbol(data, newIdx, enableAnimation);
                    // Disable symbol by setting `symbol: 'none'`
                    if (!el) { return; }
                }
                else {
                    // Update animation
                    if (!el) { return; }

                    var newTarget = {};
                    if (!isSymbolSizeSame(
                        size, normalizeSymbolSize(
                            oldData.getItemVisual(oldIdx, 'symbolSize')
                        )
                    )) {
                        // FIXME symbol created with pathStr has symbolSizeChanged
                        newTarget = symbolUtil.getSymbolShape(
                            symbolType, -size[0] / 2, -size[1] / 2, size[0], size[1]
                        ) || {};
                    }

                    newTarget.position = point;
                    if (!isAroundEqual(el.scale[0], 1)) {    // May have scale 0
                        newTarget.scale = [1, 1];
                    }
                    if (enableAnimation) {
                        api.updateGraphicEl(el, newTarget);
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
        var normalStyleAccessPath = ['itemStyle', 'normal'];
        var emphasisStyleAccessPath = ['itemStyle', 'emphasis'];
        data.eachItemGraphicEl(function (el, idx) {
            var itemModel = data.getItemModel(idx);
            var normalItemStyleModel = itemModel.getModel(normalStyleAccessPath);
            var labelModel = itemModel.getModel('label.normal');
            var color = data.getItemVisual(idx, 'color');

            el.setColor(color);

            zrUtil.extend(
                el.style,
                normalItemStyleModel.getItemStyle(['color'])
            );

            if (labelModel.get('show')) {
                var textStyleModel = labelModel.getModel('textStyle');
                var labelPosition = labelModel.get('position') || 'inside';
                var labelColor = labelPosition === 'inside' ? 'white' : color;
                // Text use the value of last dimension
                var lastDim = data.dimensions[data.dimensions.length - 1];
                el.setStyle({
                    // FIXME
                    text: seriesModel.getFormattedLabel(idx, 'normal')
                        || data.get(lastDim, idx),
                    textFont: textStyleModel.getFont(),
                    textPosition: labelPosition,
                    textFill: textStyleModel.get('color') || labelColor
                });
            }

            graphic.setHoverStyle(
                el,
                itemModel.getModel(emphasisStyleAccessPath).getItemStyle()
            );
        }, this);

        this._data = data;
    };

    symbolProto.updateLayout = function () {
        var data = this._data;
        if (data) {
            // Not use animation
            data.eachItemGraphicEl(function (el, idx) {
                el.attr('position', data.getItemLayout(idx));
            });
        }
    };

    symbolProto.remove = function (enableAnimation) {
        var group = this.group;
        var data = this._data;
        if (data) {
            if (enableAnimation) {
                data.eachItemGraphicEl(function (el) {
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
    };

    return SymbolDraw;
});
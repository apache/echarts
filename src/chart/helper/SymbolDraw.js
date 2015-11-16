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

    // function isShapeSame(a, b) {
    //     // return isAroundEqual(a[0], b[0]) && isAroundEqual(a[1], b[1]);
    //     for (var name in a) {
    //         if (!isAroundEqual(a[name], b[name])) {
    //             return false;
    //         }
    //     }
    //     return true;
    // }

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

                    // FIXME symbol created with pathStr has symbolSizeChanged
                    // FIXME Can't use symbolSize to determine if symbol has changed it's size
                    // Or animation will be wrong if symbolSize changed to frequently
                    var newTarget = (symbolUtil.getSymbolShape(
                        symbolType, -size[0] / 2, -size[1] / 2, size[0], size[1]
                    ) || {});

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
            var color = data.getItemVisual(idx, 'color');

            var hoverStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();

            zrUtil.extend(
                el.style,
                normalItemStyleModel.getItemStyle()
            );
            color && el.setColor(color);

            var labelModel = itemModel.getModel('label.normal');
            var hoverLabelModel = itemModel.getModel('label.emphasis');
            var lastDim = data.dimensions[data.dimensions.length - 1];
            var labelText = seriesModel.getFormattedLabel(idx, 'normal')
                        || data.get(lastDim, idx);
            var elStyle = el.style;
            if (labelModel.get('show')) {
                graphic.setText(elStyle, labelModel, color);
                elStyle.text = labelText;
            }
            else {
                elStyle.text = '';
            }
            if (hoverLabelModel.get('show')) {
                graphic.setText(hoverStyle, hoverLabelModel, color);
                hoverStyle.text = labelText;
            }
            else {
                hoverStyle.text = '';
            }

            graphic.setHoverStyle(el, hoverStyle);
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
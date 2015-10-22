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

        var symbolElPos = symbolEl.position;
        symbolElPos[0] = point[0];
        symbolElPos[1] = point[1];

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

        /**
         * @param {module:echarts/data/List} data
         * @param {module:echarts/model/Series} seriesModel
         * @param {module:echarts/ExtensionAPI} api
         * @param {boolean} enableAnimation
         * @param {Array.<boolean>} [ignoreMap]
         */
        updateData: function (
            data, seriesModel, api, enableAnimation, ignoreMap
        ) {

            var group = this.group;
            var oldData = this._data;

            data.diff(oldData)
                .add(function (newIdx) {
                    // 空数据
                    // TODO
                    if (!data.hasValue(newIdx)) {
                        return;
                    }

                    if (!(ignoreMap && ignoreMap[newIdx])) {
                        var symbolEl = createSymbol(
                            data, newIdx, enableAnimation
                        );

                        if (symbolEl) {
                            data.setItemGraphicEl(newIdx, symbolEl);

                            group.add(symbolEl);
                        }
                    }
                })
                .update(function (newIdx, oldIdx) {
                    var el = oldData.getItemGraphicEl(oldIdx);
                    // Empty data
                    if (!data.hasValue(newIdx)
                        || (ignoreMap && ignoreMap[newIdx])
                    ) {
                        group.remove(el);
                        return;
                    }

                    var symbolSize = normalizeSymbolSize(
                        data.getItemVisual(newIdx, 'symbolSize')
                    );
                    var point = data.getItemLayout(newIdx);

                    var symbolType = data.getItemVisual(newIdx, 'symbol');
                    // Symbol changed
                    if (
                        oldData.getItemVisual(oldIdx, 'symbol') !== symbolType
                        || (!el && !(ignoreMap && ignoreMap[newIdx]))
                    ) {
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

                        // TODO Merge animateTo and attr methods into one
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
            var emphasisStyleAccessPath = [normalStyleAccessPath[0], 'emphasis'];
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
                    var labelPosition = labelModel.get('position') || 'inside';
                    var labelColor = labelPosition === 'inside' ? 'white' : color;
                    // Text use the value of last dimension
                    var lastDim = data.dimensions[data.dimensions.length - 1];
                    el.setStyle({
                        // FIXME
                        text: seriesModel.getFormattedLabel(idx, 'normal')
                            || data.get(lastDim, idx),
                        textFont: labelModel.getModel('textStyle').getFont(),
                        textPosition: labelPosition,
                        textFill: labelColor
                    });
                }

                graphic.setHoverStyle(
                    el,
                    itemModel.getModel(emphasisStyleAccessPath).getItemStyle()
                );
            }, this);

            this._data = data;
        },

        updateLayout: function () {
            var data = this._data;
            if (data) {
                // Not use animation
                data.eachItemGraphicEl(function (el, idx) {
                    el.attr('position', data.getItemLayout(idx));
                });
            }
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
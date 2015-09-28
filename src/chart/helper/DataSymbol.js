define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Group = require('zrender/container/Group');
    var symbolCreators = require('../../util/symbol');
    var graphic = require('../../util/graphic');

    function createSymbol(data, idx, enableAnimation) {
        var point = data.getItemLayout(idx).point;
        var color = data.getItemVisual(idx, 'color');

        var symbolSize = data.getItemVisual(idx, 'symbolSize');
        var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';

        var symbolEl = symbolCreators.createSymbol(
            symbolType, -0.5, -0.5, 1, 1, color
        );

        symbolEl.position = point;

        if (enableAnimation) {

            symbolEl.scale = [0.1, 0.1];

            symbolEl.animateTo({
                scale: [symbolSize, symbolSize]
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

                    data.setItemGraphicEl(newIdx, symbolEl);

                    group.add(symbolEl);
                })
                .update(function (newIdx, oldIdx) {
                    // Empty data
                    if (!data.hasValue(newIdx)) {
                        group.remove(el);
                        return;
                    }

                    var symbolSize = data.getItemVisual(newIdx, 'symbolSize');
                    var point = data.getItemLayout(newIdx).point;
                    var el = oldData.getItemGraphicEl(oldIdx);

                    // Symbol changed
                    if (oldData.getItemVisual(newIdx, 'symbol') !== data.getItemVisual(oldIdx, 'symbol')) {
                        // Remove the old one
                        group.remove(el);
                        el = createSymbol(data, newIdx, enableAnimation);
                    }

                    // Color changed
                    var newColor = data.getItemVisual(newIdx, 'color');
                    if (oldData.getItemVisual(newIdx, 'color') !== newColor) {
                        el.setStyle('fill', newColor);
                    }

                    // TODO Merge animateTo and attr methods into one
                    if (enableAnimation) {
                        el.animateTo({
                            scale: [symbolSize, symbolSize],
                            position: point
                        }, 300, 'cubicOut');
                    }
                    else {
                        el.attr({
                            scale: [symbolSize, symbolSize],
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
                var itemStyle = itemModel.getModel('itemStyle.normal').getItemStyle();
                // delete itemStyle.color;
                // delete itemStyle.symbolSize;

                zrUtil.extend(el.style, itemStyle);
                graphic.setHoverStyle(
                    el,
                    itemModel.getModel('itemStyle.emphasis').getItemStyle()
                );

                var symbolSize = data.getItemVisual(idx, 'symbolSize');
                // Adjust the line width
                el.__lineWidth = el.__lineWidth || el.style.lineWidth;
                el.style.lineWidth = el.__lineWidth / symbolSize;
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
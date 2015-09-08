define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Group = require('zrender/container/Group');
    var symbolCreators = require('../../util/symbol');

    function DataSymbol() {

        this.group = new Group();

        this.z = 0;

        this.zlevel = 0;
    }

    DataSymbol.prototype = {

        getData: function () {
            return this._data;
        },

        updateData: function (data) {

            var group = this.group;

            data.diff(this._data)
                .add(function (dataItem) {
                    // 空数据
                    // TODO
                    // if (dataItem.getValue() == null) {
                    //     return;
                    // }

                    var layout = dataItem.layout;
                    var color = dataItem.getVisual('color');

                    var symbolSize = dataItem.getVisual('symbolSize');
                    var symbolType = dataItem.getVisual('symbol') || 'circle';
                    var symbolShape = symbolCreators.createSymbol(symbolType, -0.5, -0.5, 1, 1, color);

                    symbolShape.scale = [0.1, 0.1];
                    symbolShape.position = [layout.x, layout.y];

                    symbolShape.animateTo({
                        scale: [symbolSize, symbolSize]
                    }, 500);

                    dataItem.__el = symbolShape;

                    group.add(symbolShape);
                })
                .update(function (newData, oldData) {
                    var symbolSize = newData.getVisual('symbolSize');
                    var layout = newData.layout;
                    var el = oldData.__el;

                    // 空数据
                    // TODO
                    // if (newData.getValue() == null) {
                    //     group.remove(oldData.__el);
                    //     return;
                    // }
                    el.animateTo({
                        scale: [symbolSize, symbolSize],
                        position: [layout.x, layout.y]
                    }, 500, 'cubicOut');

                    newData.__el = el;

                    // Add back
                    group.add(el);
                })
                .remove(function (dataItem) {
                    if (dataItem.__el) {
                        group.remove(dataItem.__el);
                    }
                })
                .execute();

            // Update common properties
            data.each(function (dataItem) {
                var el = dataItem.__el;
                el.z = this.z;

                zrUtil.extend(
                    el.style,
                    dataItem.getModel('itemStyle.normal').getItemStyle(['fill', 'stroke'])
                );

                var symbolSize = dataItem.getVisual('symbolSize');
                // Adjust the line width
                el.__lineWidth = el.__lineWidth || el.style.lineWidth;
                el.style.lineWidth = el.__lineWidth / symbolSize;
            }, this)

            this._data = data;
        },

        remove: function () {
            if (this._data) {
                var group = this.group;
                this._data.each(function (dataItem) {
                    var el = dataItem.__el;
                    el.stopAnimation();
                    el.animateTo({
                        scale: [0, 0]
                    }, 200, 'cubicOut', function () {
                        group.remove(dataItem.__el);
                    });
                });
            }
        }
    }

    return DataSymbol;
});
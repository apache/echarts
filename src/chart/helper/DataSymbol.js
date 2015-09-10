define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Group = require('zrender/container/Group');
    var symbolCreators = require('../../util/symbol');

    function getSymbolElement(dataItem) {
        return dataItem.__symbolEl;
    }

    function createSymbol(dataItem, enableAnimation) {
        var layout = dataItem.layout;
        var color = dataItem.getVisual('color');

        var symbolSize = dataItem.getVisual('symbolSize');
        var symbolType = dataItem.getVisual('symbol') || 'circle';
        var symbolEl = symbolCreators.createSymbol(symbolType, -0.5, -0.5, 1, 1, color);

        symbolEl.position = [layout.x, layout.y];

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

        this.z = 0;

        this.zlevel = 0;
    }

    DataSymbol.prototype = {

        getData: function () {
            return this._data;
        },

        getSymbolElements: function () {
            return this._data.map(getSymbolElement);
        },

        updateData: function (data, enableAnimation) {

            var group = this.group;

            data.diff(this._data)
                .add(function (dataItem) {
                    // 空数据
                    // TODO
                    if (dataItem.getValue() == null) {
                        return;
                    }

                    var symbolShape = createSymbol(dataItem, enableAnimation);

                    dataItem.__symbolEl = symbolShape;

                    // Attach data on the el
                    symbolShape.data = dataItem;

                    group.add(symbolShape);
                })
                .update(function (newData, oldData) {
                    var symbolSize = newData.getVisual('symbolSize');
                    var layout = newData.layout;
                    var el = oldData.__symbolEl;

                    // 空数据
                    // TODO
                    if (newData.getValue() == null) {
                        group.remove(el);
                        return;
                    }

                    // TODO Merge animateTo and attr methods into one
                    if (enableAnimation) {
                        el.animateTo({
                            scale: [symbolSize, symbolSize],
                            position: [layout.x, layout.y]
                        }, 300, 'cubicOut');
                    }
                    else {
                        el.attr({
                            scale: [symbolSize, symbolSize],
                            position: [layout.x, layout.y]
                        });
                    }

                    newData.__symbolEl = el;

                    // Add back
                    group.add(el);
                })
                .remove(function (dataItem) {
                    var el = dataItem.__symbolEl;
                    if (el) {
                        if (enableAnimation) {
                            el.animateTo({
                                scale: [0, 0]
                            }, 200, 'cubicOut', function () {
                                group.remove(el);
                            });
                        }
                        else {
                            group.remove(el);
                        }
                    }
                })
                .execute();

            // Update common properties
            data.each(function (dataItem) {
                var el = dataItem.__symbolEl;
                el.z = this.z;

                zrUtil.extend(
                    el.style,
                    dataItem.getModel('itemStyle.normal').getItemStyle()
                );

                var symbolSize = dataItem.getVisual('symbolSize');
                // Adjust the line width
                el.__lineWidth = el.__lineWidth || el.style.lineWidth;
                el.style.lineWidth = el.__lineWidth / symbolSize;
            }, this);

            this._data = data;
        },

        remove: function (enableAnimation) {
            if (this._data) {
                var group = this.group;
                this._data.each(function (dataItem) {
                    var el = dataItem.__symbolEl;
                    el.animateTo({
                        scale: [0, 0]
                    }, 200, 'cubicOut', function () {
                        group.remove(el);
                    });
                });
            }
        }
    }

    return DataSymbol;
});
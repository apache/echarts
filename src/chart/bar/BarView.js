define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    zrUtil.extend(require('../../model/Model').prototype, require('./barItemStyle'));

    return require('../../echarts').extendChartView({

        type: 'bar',

        render: function (seriesModel, ecModel) {
            var coordinateSystemType = seriesModel.get('coordinateSystem');

            if (coordinateSystemType === 'cartesian2d') {
                this._renderCartesian(seriesModel, ecModel);
            }

            return this.group;
        },

        _renderCartesian: function (seriesModel, ecModel) {
            var group = this.group;
            var data = seriesModel.getData();
            var oldData = this._data;

            data.diff(oldData)
                .add(function (dataIndex) {
                    // 空数据
                    if (!data.hasValue(dataIndex)) {
                        return;
                    }

                    var layout = data.getItemLayout(dataIndex);
                    var rect = new graphic.Rect({
                        shape: {
                            x: layout.x,
                            y: layout.y + layout.height,
                            width: layout.width
                        }
                    });

                    data.setItemGraphicEl(dataIndex, rect);

                    group.add(rect);

                    // Animation
                    rect.animateTo({
                        shape: layout
                    }, 1000, 300 * dataIndex / data.count(), 'cubicOut');
                })
                .update(function (newIndex, oldIndex) {
                    var rect = oldData.getItemGraphicEl(oldIndex);
                    // 空数据
                    if (!data.hasValue(newIndex)) {
                        group.remove(rect);
                        return;
                    }

                    rect.animateTo({
                        shape: data.getItemLayout(newIndex)
                    }, 500, 'cubicOut');

                    data.setItemGraphicEl(newIndex, rect);

                    // Add back
                    group.add(rect);
                })
                .remove(function (idx) {
                    var el = oldData.getItemGraphicEl(idx);
                    el.animateTo({
                        shape: {
                            width: 0
                        }
                    }, 300, 'cubicOut',
                    function () {
                        group.remove(el);
                    });
                })
                .execute();

            data.eachItemGraphicEl(function (rect, idx) {
                var itemModel = data.getItemModel(idx);
                rect.setStyle(zrUtil.defaults(
                    {
                        fill: data.getItemVisual(idx, 'color')
                    },
                    itemModel.getModel('itemStyle.normal').getBarItemStyle()
                ));
                graphic.setHoverStyle(
                    rect, itemModel.getModel('itemStyle.emphasis').getBarItemStyle()
                );
            });

            this._data = data;
        },

        remove: function () {
            if (this._data) {
                var group = this.group;
                this._data.eachItemGraphicEl(function (el) {
                    el.animateTo({
                        shape: {
                            width: 0
                        }
                    }, 300, 'cubicOut',
                    function () {
                        group.remove(el);
                    });
                });
            }
        }
    });
});
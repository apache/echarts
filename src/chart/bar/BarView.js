define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');

    return require('../../echarts').extendChartView({

        type: 'bar',

        render: function (seriesModel, ecModel, api) {
            var coordinateSystemType = seriesModel.get('coordinateSystem');

            if (coordinateSystemType === 'cartesian2d') {
                this._renderCartesian(seriesModel, ecModel, api);
            }

            return this.group;
        },

        _renderCartesian: function (seriesModel, ecModel, api) {
            var group = this.group;
            var data = seriesModel.getData();
            var oldData = this._data;

            data.diff(oldData)
                .add(function (dataIndex) {
                    // 空数据
                    if (! data.hasValue(dataIndex)) {
                        return;
                    }

                    var layout = data.getItemLayout(dataIndex);
                    var itemModel = data.getItemModel(dataIndex);
                    var rect = new api.Rect({
                        shape: {
                            x: layout.x,
                            y: layout.y + layout.height,
                            width: layout.width
                        },
                        style: zrUtil.extend(
                            itemModel.getModel('itemStyle.normal').getItemStyle(),
                            {
                                fill: data.getItemVisual(dataIndex, 'color')
                            }
                        )
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
                    if (! data.hasValue(newIndex)) {
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
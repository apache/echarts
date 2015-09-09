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

            data.diff(this._data)
                .add(function (dataItem, dataIndex) {
                    // 空数据
                    if (dataItem.getValue() == null) {
                        return;
                    }

                    var layout = dataItem.layout;
                    var rect = new api.Rect({
                        shape: {
                            x: layout.x,
                            y: layout.y + layout.height,
                            width: layout.width
                        },
                        style: zrUtil.extend(
                            dataItem.getModel('itemStyle.normal').getItemStyle(),
                            {
                                fill: dataItem.getVisual('color')
                            }
                        )
                    });

                    dataItem.__el = rect;
                    rect.__data = dataItem;

                    group.add(rect);

                    // Animation
                    rect.animateTo({
                        shape: layout
                    }, 1000, 300 * dataIndex / data.count(), 'cubicOut');
                })
                .update(function (newData, oldData) {
                    var el = oldData.__el;
                    // 空数据
                    if (newData.getValue() == null) {
                        group.remove(el);
                        return;
                    }
                    el.animateTo({
                        shape: newData.layout
                    }, 500, 'cubicOut');

                    newData.__el = el;

                    // Add back
                    group.add(el);
                })
                .remove(function (dataItem, idx) {
                    var el = dataItem.__el;
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
                this._data.each(function (dataItem) {
                    var el = dataItem.__el;
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
define(function (require) {

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

            data.diff(this.data)
                .add(function (dataItem, idx) {
                    // 空数据
                    if (dataItem.getValue() == null) {
                        return;
                    }

                    var layout = dataItem.layout;
                    var normalItemStyle = dataItem.getModel('itemStyle.normal');
                    var rect = new api.Rect({
                        shape: {
                            x: layout.x,
                            y: layout.y + layout.height,
                            width: layout.width
                        },
                        style: {
                            fill: dataItem.getVisual('color'),
                            stroke: normalItemStyle.get('borderColor'),
                            lineWidth: normalItemStyle.get('borderWidth')
                        }
                    });

                    dataItem.__el = rect;
                    rect.__data = dataItem;

                    group.add(rect);

                    // Animation
                    rect.animateShape()
                        .when(500, layout)
                        .delay(300 * dataItem.dataIndex / data.elements.length)
                        .start('cubicOut');
                })
                .update(function (newData, oldData) {
                    // 空数据
                    if (newData.getValue() == null) {
                        group.remove(oldData.__el);
                        return;
                    }
                    oldData.__el.animateShape()
                        .when(500, newData.layout)
                        .start('cubicOut');

                    newData.__el = oldData.__el;
                })
                .remove(function (dataItem, idx) {
                    if (dataItem.__el) {
                        group.remove(dataItem.__el);
                    }
                })
                .execute();

            this.data = data;
        }
    });
});
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

            var cartesian = seriesModel.coordinateSystem;
            var baseAxis = cartesian.getBaseAxis();
            var isInverse = cartesian.getOtherAxis(baseAxis).inverse;
            var isHorizontal = baseAxis.isHorizontal();

            var enableAnimation = ecModel.get('animation');

            data.diff(oldData)
                .add(function (dataIndex) {
                    // 空数据
                    if (!data.hasValue(dataIndex)) {
                        return;
                    }

                    var layout = data.getItemLayout(dataIndex);
                    var rect = new graphic.Rect({
                        shape: zrUtil.extend({}, layout)
                    });

                    data.setItemGraphicEl(dataIndex, rect);

                    group.add(rect);

                    // Animation
                    if (enableAnimation) {
                        var rectShape = rect.shape;
                        var animateProperty = isHorizontal ? 'height' : 'width';
                        var animateTarget = {};
                        rectShape[animateProperty] = 0;
                        animateTarget[animateProperty] = layout[animateProperty];
                        rect.animateTo({
                            shape: animateTarget
                        }, 1000, 300 * dataIndex / data.count(), 'cubicOut');
                    }
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
                    el.style.text = '';
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
                var labelModel = itemModel.getModel('itemStyle.normal.label');
                var color = data.getItemVisual(idx, 'color');
                var layout = data.getItemLayout(idx);
                rect.setStyle(zrUtil.defaults(
                    {
                        fill: color
                    },
                    itemModel.getModel('itemStyle.normal').getBarItemStyle()
                ));
                if (labelModel.get('show')) {
                    var labelPosition = labelModel.get('position') || 'inside';
                    // FIXME
                    var labelColor = labelPosition === 'inside' ? 'white' : color;
                    var labelPositionOutside = isHorizontal
                        ? (layout.height > 0 ? 'bottom' : 'top')
                        : (layout.width > 0 ? 'left' : 'right');

                    rect.setStyle({
                        text: data.getRawValue(idx),
                        textFont: labelModel.getModel('textStyle').getFont(),
                        textPosition: labelPosition === 'outside' ? labelPositionOutside : 'inside',
                        textFill: labelColor
                    });
                }
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
                    // Not show text when animating
                    el.style.text = '';
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
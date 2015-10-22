define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    zrUtil.extend(require('../../model/Model').prototype, require('./barItemStyle'));

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

            var cartesian = seriesModel.coordinateSystem;
            var baseAxis = cartesian.getBaseAxis();
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

                    api.updateGraphicEl(rect, {
                        shape: data.getItemLayout(newIndex)
                    });

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

            this._updateStyle(seriesModel, data, isHorizontal);

            this._data = data;
        },

        _updateStyle: function (seriesModel, data, isHorizontal) {
            data.eachItemGraphicEl(function (rect, idx) {
                var itemModel = data.getItemModel(idx);
                var labelModel = itemModel.getModel('label.normal');
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
                    var labelColor = labelPosition.indexOf('inside') === 0 ? 'white' : color;
                    var labelPositionOutside = isHorizontal
                        ? (layout.height > 0 ? 'bottom' : 'top')
                        : (layout.width > 0 ? 'left' : 'right');

                    rect.setStyle({
                        text: seriesModel.getFormattedLabel(idx, 'normal')
                            || data.getRawValue(idx),
                        textFont: labelModel.getModel('textStyle').getFont(),
                        textPosition: labelPosition === 'outside' ? labelPositionOutside : labelPosition,
                        textFill: labelColor
                    });

                    graphic.setHoverStyle(
                        rect, itemModel.getModel('itemStyle.emphasis').getBarItemStyle()
                    );
                }
            });
        },

        remove: function (ecModel) {
            var group = this.group;
            if (ecModel.get('animation')) {
                if (this._data) {
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
            else {
                group.removeAll();
            }
        }
    });
});
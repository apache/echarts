define(function (require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var helper = require('./helper');

    var BAR_BORDER_WIDTH_QUERY = ['itemStyle', 'normal', 'barBorderWidth'];

    // FIXME
    // Just for compatible with ec2.
    zrUtil.extend(require('../../model/Model').prototype, require('./barItemStyle'));

    var BarView = require('../../echarts').extendChartView({

        type: 'bar',

        render: function (seriesModel, ecModel, api) {
            var coordinateSystemType = seriesModel.get('coordinateSystem');

            if (coordinateSystemType === 'cartesian2d') {
                this._renderOnCartesian(seriesModel, ecModel, api);
            }

            return this.group;
        },

        dispose: zrUtil.noop,

        _renderOnCartesian: function (seriesModel, ecModel, api) {
            var group = this.group;
            var data = seriesModel.getData();
            var oldData = this._data;

            var cartesian = seriesModel.coordinateSystem;
            var baseAxis = cartesian.getBaseAxis();
            var isHorizontal = baseAxis.isHorizontal();
            var animationModel = seriesModel.isAnimationEnabled() ? seriesModel : null;

            data.diff(oldData)
                .add(function (dataIndex) {
                    if (!data.hasValue(dataIndex)) {
                        return;
                    }

                    var itemModel = data.getItemModel(dataIndex);
                    var layout = getRectItemLayout(data, dataIndex, itemModel);
                    var el = createRect(data, dataIndex, itemModel, layout, isHorizontal, animationModel);
                    data.setItemGraphicEl(dataIndex, el);
                    group.add(el);

                    updateStyle(el, data, dataIndex, itemModel, layout, seriesModel, isHorizontal);
                })
                .update(function (newIndex, oldIndex) {
                    var el = oldData.getItemGraphicEl(oldIndex);

                    if (!data.hasValue(newIndex)) {
                        group.remove(el);
                        return;
                    }

                    var itemModel = data.getItemModel(newIndex);
                    var layout = getRectItemLayout(data, newIndex, itemModel);

                    if (el) {
                        graphic.updateProps(el, {shape: layout}, animationModel, newIndex);
                    }
                    else {
                        el = createRect(data, newIndex, itemModel, layout, isHorizontal, animationModel, true);
                    }

                    data.setItemGraphicEl(newIndex, el);
                    // Add back
                    group.add(el);

                    updateStyle(el, data, newIndex, itemModel, layout, seriesModel, isHorizontal);
                })
                .remove(function (dataIndex) {
                    var el = oldData.getItemGraphicEl(dataIndex);
                    el && removeRect(dataIndex, animationModel, el);
                })
                .execute();

            this._data = data;
        },

        remove: function (ecModel, api) {
            var group = this.group;
            var data = this._data;
            if (ecModel.get('animation')) {
                if (data) {
                    data.eachItemGraphicEl(function (el) {
                        removeRect(el.dataIndex, ecModel, el);
                    });
                }
            }
            else {
                group.removeAll();
            }
        }
    });

    function createRect(data, dataIndex, itemModel, layout, isHorizontal, animationModel, isUpdate) {
        var rect = new graphic.Rect({shape: zrUtil.extend({}, layout)});

        // Animation
        if (animationModel) {
            var rectShape = rect.shape;
            var animateProperty = isHorizontal ? 'height' : 'width';
            var animateTarget = {};
            rectShape[animateProperty] = 0;
            animateTarget[animateProperty] = layout[animateProperty];
            graphic[isUpdate ? 'updateProps' : 'initProps'](rect, {
                shape: animateTarget
            }, animationModel, dataIndex);
        }

        return rect;
    }

    function removeRect(dataIndex, animationModel, el) {
        // Not show text when animating
        el.style.text = '';
        graphic.updateProps(el, {
            shape: {
                width: 0
            }
        }, animationModel, dataIndex, function () {
            el.parent && el.parent.remove(el);
        });
    }

    function getRectItemLayout(data, dataIndex, itemModel) {
        var layout = data.getItemLayout(dataIndex);
        var fixedLineWidth = getLineWidth(itemModel, layout);

        // fix layout with lineWidth
        var signX = layout.width > 0 ? 1 : -1;
        var signY = layout.height > 0 ? 1 : -1;
        return {
            x: layout.x + signX * fixedLineWidth / 2,
            y: layout.y + signY * fixedLineWidth / 2,
            width: layout.width - signX * fixedLineWidth,
            height: layout.height - signY * fixedLineWidth
        };
    }

    function updateStyle(el, data, dataIndex, itemModel, layout, seriesModel, isHorizontal) {
        var color = data.getItemVisual(dataIndex, 'color');
        var opacity = data.getItemVisual(dataIndex, 'opacity');
        var itemStyleModel = itemModel.getModel('itemStyle.normal');
        var hoverStyle = itemModel.getModel('itemStyle.emphasis').getBarItemStyle();

        el.setShape('r', itemStyleModel.get('barBorderRadius') || 0);

        el.useStyle(zrUtil.defaults(
            {
                fill: color,
                opacity: opacity
            },
            itemStyleModel.getBarItemStyle()
        ));

        var labelPositionOutside = isHorizontal
            ? (layout.height > 0 ? 'bottom' : 'top')
            : (layout.width > 0 ? 'left' : 'right');

        helper.setLabel(
            el.style, hoverStyle, itemModel, color,
            seriesModel, dataIndex, labelPositionOutside
        );

        graphic.setHoverStyle(el, hoverStyle);
    }

    // In case width or height are too small.
    function getLineWidth(itemModel, rawLayout) {
        var lineWidth = itemModel.get(BAR_BORDER_WIDTH_QUERY) || 0;
        return Math.min(lineWidth, Math.abs(rawLayout.width), Math.abs(rawLayout.height));
    }

    return BarView;
});
define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    function createLabel(labelLayout) {
        return new graphic.Text({
            style: {
                x: labelLayout.x,
                y: labelLayout.y,
                textAlign: labelLayout.textAlign,
                textBaseline: labelLayout.textBaseline
            },
            z2: 10,
            silent: true
        });
    }

    function fadeOut(el, group, enableAnimation) {
        if (enableAnimation) {
            el.animateTo({
                style: {
                    opacity: 0
                }
            }, 300, function () {
                group.remove(el);
            });
        }
        else {
            group.remove(el);
        }
    }

    var Funnel = require('../../view/Chart').extend({
        
        type: 'funnel',

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var oldData = this._data;

            var group = this.group;

            var enableAnimation = ecModel.get('animation');

            var opacityAccessPath = ['itemStyle', 'normal', 'opacity'];
            data.diff(oldData)
                .add(function (idx) {
                    var layout = data.getItemLayout(idx);
                    var labelLayout = layout.label;

                    var itemModel = data.getItemModel(idx);

                    var poly = new graphic.Polygon({
                        shape: {
                            points: layout.points
                        }
                    });

                    var opacity = data.getItemModel(idx).get(opacityAccessPath);
                    opacity = opacity == null ? 1 : opacity;
                    if (enableAnimation) {
                        poly.setStyle({ opacity : 0 });
                        poly.animateTo({
                            style: {
                                opacity: opacity   
                            }
                        }, 300, 'cubicIn');
                    }
                    else {
                        poly.setStyle({ opacity: opacity });
                    }

                    var labelText = createLabel(labelLayout);

                    var labelLine = new graphic.Polyline({
                        shape: {
                            points: labelLayout.linePoints
                        },
                        ignore: !itemModel.get('labelLine.show'),
                        silent: true
                    });
                    poly.__labelLine = labelLine;
                    poly.__labelText = labelText;

                    group.add(poly);
                    group.add(labelText);
                    group.add(labelLine);

                    data.setItemGraphicEl(idx, poly);
                })
                .update(function (newIdx, oldIdx) {
                    var poly = oldData.getItemGraphicEl(oldIdx);

                    var layout = data.getItemLayout(newIdx);
                    var labelLayout = layout.label;
                    var itemModel = data.getItemModel(newIdx);

                    api.updateGraphicEl(poly, {
                        shape: {
                            points: layout.points
                        }
                    });

                    var labelLine = poly.__labelLine;
                    var labelText = poly.__labelText;

                    api.updateGraphicEl(labelLine, {
                        shape: {
                            points: labelLayout.linePoints
                        },
                        ignore: !itemModel.get('labelLine.show')
                    });
                    api.updateGraphicEl(labelText, {
                        style: {
                            x: labelLayout.x,
                            y: labelLayout.y
                        }
                    });
                    // Set none animating style
                    labelText.setStyle({
                        textAlign: labelLayout.textAlign,
                        textBaseline: labelLayout.textBaseline
                    });

                    poly.setStyle('opacity', data.getItemModel(newIdx).get(opacityAccessPath));

                    group.add(poly);
                    group.add(labelLine);
                    group.add(labelText);

                    data.setItemGraphicEl(newIdx, poly);
                })
                .remove(function (idx) {
                    var poly = oldData.getItemGraphicEl(idx);

                    fadeOut(poly, group, enableAnimation);
                    group.remove(poly.__labelLine);
                    group.remove(poly.__labelText);
                })
                .execute();

            this._data = data;

            this._updateAll(data, seriesModel);
        },

        remove: function () {
            this.group.removeAll();
            this._data = null;
        },

        _updateAll: function (data, seriesModel) {
            data.eachItemGraphicEl(function (poly, idx) {
                var itemModel = data.getItemModel(idx);
                var itemStyleModel = itemModel.getModel('itemStyle');

                var visualColor = data.getItemVisual(idx, 'color');

                poly.setStyle(
                    zrUtil.extend(
                        {
                            fill: data.getItemVisual(idx, 'color')
                        },
                        itemStyleModel.getModel('normal').getItemStyle(['opacity'])
                    )
                );
                graphic.setHoverStyle(
                    poly,
                    itemStyleModel.getModel('emphasis').getItemStyle()
                );

                var labelText = poly.__labelText;
                var labelLine = poly.__labelLine;
                if (labelText) {
                    var labelModel = itemModel.getModel('label.normal');
                    var textStyleModel = labelModel.getModel('textStyle');
                    var labelPosition = labelModel.get('position');
                    var isLabelInside = labelPosition === 'inside'
                        || labelPosition === 'inner' || labelPosition === 'center';
                    // Default use item visual color
                    labelText.setStyle({
                        fill: textStyleModel.get('color')
                            || isLabelInside ? '#fff' : visualColor
                    });
                    labelText.setStyle({
                        text: seriesModel.getFormattedLabel(idx, 'normal')
                            || data.getName(idx),
                        font: textStyleModel.getFont()
                    });
                }
                if (labelLine) {
                    // Default use item visual color
                    labelLine.setStyle({
                        stroke: visualColor
                    });
                    labelLine.setStyle(
                        itemModel.getModel('labelLine.lineStyle').getLineStyle()
                    );
                }
            });
        }
    });

    return Funnel;
});
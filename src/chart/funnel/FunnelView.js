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
            }
        });
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
                    var itemModel = data.getItemModel();

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

                    var labelText = createLabel(layout.label);
                    poly.__labelText = labelText;

                    if (itemModel.get('labelLine.show')) {
                        var labelLine = new graphic.Polyline({
                            shape: {
                                points: layout.label.linePoints
                            }
                        });
                        group.add(labelLine);
                        poly.__labelLine = labelLine;
                    }

                    group.add(poly);
                    group.add(labelText);
                    data.setItemGraphicEl(idx, poly);
                })
                .update(function (newIdx, oldIdx) {
                    var poly = oldData.getItemGraphicEl(oldIdx);

                    api.updateGraphicEl(poly, {
                        shape: {
                            points: data.getItemLayout(newIdx).points
                        }
                    });

                    poly.setStyle('opacity', data.getItemModel(newIdx).get(opacityAccessPath));

                    group.add(poly);

                    data.setItemGraphicEl(newIdx, poly);
                })
                .remove(function (idx) {
                    var poly = oldData.getItemGraphicEl(idx);
                    enableAnimation
                        ? poly.animateTo({
                                style: {
                                    opacity: 0
                                }
                            }, 300, 'cubicOut', function () {
                                group.remove(poly);
                            })
                        : group.remove(poly);
                })
                .execute();

            this._data = data;

            this._updateAll(data, seriesModel);
        },

        _updateAll: function (data, seriesModel) {
            data.eachItemGraphicEl(function (poly, idx) {
                var itemModel = data.getItemModel(idx);
                var itemStyleModel = itemModel.getModel('itemStyle');

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
                if (labelText) {
                    var textStyleModel = itemModel.getModel('label.normal.textStyle');
                    labelText.setStyle({
                        text: seriesModel.getFormattedLabel(idx, 'normal')
                            || data.getName(idx),
                        font: textStyleModel.getFont()
                    });
                }
            });
        }
    });

    return Funnel;
});
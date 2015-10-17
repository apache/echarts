define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    function selectData(seriesModel) {
        var data = seriesModel.getData();
        var dataIndex = this.dataIndex;
        var name = data.getName(dataIndex);

        updateSelected(this,
            seriesModel.toggleSelected(name),
            seriesModel.get('selectedOffset')
        );
    }

    function updateSelected(el, isSelected, selectedOffset) {
        var shape = el.shape;
        var midAngle = (shape.startAngle + shape.endAngle) / 2;

        var dx = Math.cos(midAngle);
        var dy = (shape.clockwise ? 1 : -1) * Math.sin(midAngle);

        var offset = isSelected ? selectedOffset : 0;

        // animateTo will stop revious animation like update transition
        el.animate()
            .when(200, {
                position: [dx * offset, dy * offset]
            })
            .start('bounceOut');
    }

    function createSectorAndLabel(layout, text, hasAnimation) {
        var shape = zrUtil.extend({}, layout);
        delete shape.label;

        var sector = new graphic.Sector({
            shape: shape
        });

        var labelLayout = layout.label;
        var labelLine = new graphic.Polyline({
            shape: {
                points: labelLayout.linePoints
            }
        });

        var labelText = new graphic.Text({
            style: {
                x: labelLayout.x,
                y: labelLayout.y,
                text: text,
                textAlign: labelLayout.textAlign,
                textBaseline: labelLayout.textBaseline,
                font: labelLayout.font
            }
        });

        sector.__labelLine = labelLine;
        sector.__labelText = labelText;

        if (hasAnimation) {
            sector.shape.endAngle = layout.startAngle;
            sector.animateTo({
                shape: {
                    endAngle: layout.endAngle
                }
            }, 300, 'cubicOut');
        }

        return sector;
    }

    var Pie = require('../../view/Chart').extend({

        type: 'pie',

        init: function () {
            var sectorGroup = new graphic.Group();
            this._sectorGroup = sectorGroup;
        },

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var oldData = this._data;
            var sectorGroup = this._sectorGroup;
            var group = this.group;

            var hasAnimation = ecModel.get('animation');
            var isFirstRender = !oldData;

            var firstSector;
            var onSectorClick = zrUtil.curry(selectData, seriesModel);

            data.diff(oldData)
                .add(function (idx) {
                    var layout = data.getItemLayout(idx);

                    var sector = createSectorAndLabel(
                        layout, '', hasAnimation && !isFirstRender
                    );

                    sector.on('click', onSectorClick);

                    data.setItemGraphicEl(idx, sector);

                    sectorGroup.add(sector);

                    group.add(sector.__labelLine);
                    group.add(sector.__labelText);

                    firstSector = firstSector || sector;
                })
                .update(function (newIdx, oldIdx) {
                    var sector = oldData.getItemGraphicEl(oldIdx);
                    var layout = data.getItemLayout(newIdx);
                    var labelLayout = layout.label;

                    sector.animateTo({
                        shape: layout
                    }, 300, 'cubicOut');

                    var labelLine = sector.__labelLine;
                    var labelText = sector.__labelText;

                    labelLine.animateTo({
                        shape: {
                            points: labelLayout.linePoints
                        }
                    }, 300, 'cubicOut');
                    labelText.animateTo({
                        style: {
                            x: labelLayout.x,
                            y: labelLayout.y
                        }
                    }, 300, 'cubicOut');

                    labelText.setStyle({
                        textAlign: labelLayout.textAlign,
                        textBaseline: labelLayout.textBaseline,
                        font: labelLayout.font
                    });

                    sectorGroup.add(sector);
                    data.setItemGraphicEl(newIdx, sector);

                    group.add(labelLine);
                    group.add(labelText);
                })
                .remove(function (idx) {
                    var sector = oldData.getItemGraphicEl(idx);
                    sectorGroup.remove(sector);

                    group.remove(sector.__labelLine);
                    group.remove(sector.__labelText);
                })
                .execute();

            if (hasAnimation && isFirstRender && firstSector) {
                var shape = firstSector.shape;
                var r = Math.max(api.getWidth(), api.getHeight()) / 2;

                var removeClipPath = zrUtil.bind(sectorGroup.removeClipPath, sectorGroup);
                sectorGroup.setClipPath(this._createClipPath(
                    shape.cx, shape.cy, r, shape.startAngle, shape.clockwise, removeClipPath
                ));
            }

            // Make sure sectors is on top of labels
            group.remove(sectorGroup);
            group.add(sectorGroup);

            this._updateAll(data, seriesModel);

            this._data = data;
        },

        _updateAll: function (data, seriesModel) {
            var selectedOffset = seriesModel.get('selectedOffset');
            data.eachItemGraphicEl(function (sector, idx) {
                var itemModel = data.getItemModel(idx);
                var itemStyleModel = itemModel.getModel('itemStyle');

                sector.setStyle(
                    zrUtil.extend(
                        {
                            fill: data.getItemVisual(idx, 'color')
                        },
                        itemStyleModel.getModel('normal').getItemStyle()
                    )
                );
                graphic.setHoverStyle(
                    sector,
                    itemStyleModel.getModel('emphasis').getItemStyle()
                );

                var labelText = sector.__labelText;
                if (labelText) {
                    labelText.setStyle({
                        text: seriesModel.getFormattedLabel(idx, 'normal')
                            || data.getName(idx)
                    });
                }

                updateSelected(sector, itemModel.get('selected'), selectedOffset);
            });
        },

        _createClipPath: function (cx, cy, r, startAngle, clockwise, cb) {
            var clipPath = new graphic.Sector({
                shape: {
                    cx: cx,
                    cy: cy,
                    r0: 0,
                    r: r,
                    startAngle: startAngle,
                    endAngle: startAngle,
                    clockwise: clockwise
                }
            });

            clipPath.animateTo({
                shape: {
                    endAngle: startAngle + Math.PI * 2
                }
            }, 1000, 'cubicOut', cb);

            return clipPath;
        },

        dispose: function () {}
    });

    return Pie;
});
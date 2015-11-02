define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    /**
     * @param {module:echarts/model/Series} seriesModel
     * @inner
     */
    function updateDataSelected(seriesModel) {
        var data = seriesModel.getData();
        var dataIndex = this.dataIndex;
        var name = data.getName(dataIndex);
        var selectedOffset = seriesModel.get('selectedOffset');

        seriesModel.toggleSelected(name);

        data.each(function (idx) {
            toggleItemSelected(
                data.getItemGraphicEl(idx),
                data.getItemLayout(idx),
                seriesModel.isSelected(data.getName(idx)),
                selectedOffset
            );
        });
    }

    /**
     * @param {module:zrender/graphic/Sector} el
     * @param {Object} layout
     * @param {boolean} isSelected
     * @param {number} selectedOffset
     * @inner
     */
    function toggleItemSelected(el, layout, isSelected, selectedOffset) {
        var shape = el.shape;
        var midAngle = (layout.startAngle + layout.endAngle) / 2;

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

    /**
     * Create sector, label, and label line for each data
     * @param {Object} layout
     * @param {string} text
     * @param {boolean} hasAnimations
     * @return {module:zrender/graphic/Sector}
     */
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
            },
            silent: true
        });

        var labelText = new graphic.Text({
            style: {
                text: text,
                textAlign: labelLayout.textAlign,
                textBaseline: labelLayout.textBaseline,
                font: labelLayout.font
            },
            rotation: labelLayout.rotation,
            position: [labelLayout.x, labelLayout.y],
            silent: true
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
            var onSectorClick = zrUtil.curry(updateDataSelected, seriesModel);

            var selectedMode = seriesModel.get('selectedMode');

            data.diff(oldData)
                .add(function (idx) {
                    var layout = data.getItemLayout(idx);

                    var sector = createSectorAndLabel(
                        layout, '', hasAnimation && !isFirstRender
                    );

                    selectedMode
                        && sector.on('click', onSectorClick);

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

                    var labelLine = sector.__labelLine;
                    var labelText = sector.__labelText;

                    selectedMode
                        ? sector.on('click', onSectorClick)
                        : sector.off('click');

                    api.updateGraphicEl(sector, {
                        shape: layout
                    });
                    labelLine && api.updateGraphicEl(labelLine, {
                        shape: {
                            points: labelLayout.linePoints
                        }
                    });
                    if (labelText) {
                        api.updateGraphicEl(labelText, {
                            position: [labelLayout.x, labelLayout.y],
                            rotation: labelLayout.rotation
                        });
                        labelText.setStyle({
                            textAlign: labelLayout.textAlign,
                            textBaseline: labelLayout.textBaseline,
                            font: labelLayout.font
                        });
                    }

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
                var labelLine = sector.__labelLine;
                if (labelText) {
                    labelText.setStyle({
                        text: seriesModel.getFormattedLabel(idx, 'normal')
                            || data.getName(idx)
                    });
                }
                if (labelLine) {
                    labelLine.setStyle(itemModel.getModel('labelLine').getLineStyle());
                }

                toggleItemSelected(
                    sector,
                    data.getItemLayout(idx),
                    itemModel.get('selected'),
                    selectedOffset
                );
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
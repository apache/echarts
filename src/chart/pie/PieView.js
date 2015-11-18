define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    /**
     * @param {module:echarts/model/Series} seriesModel
     * @param {boolean} hasAnimation
     * @inner
     */
    function updateDataSelected(uid, seriesModel, hasAnimation, api) {
        var data = seriesModel.getData();
        var dataIndex = this.dataIndex;
        var name = data.getName(dataIndex);
        var selectedOffset = seriesModel.get('selectedOffset');

        api.dispatch({
            type: 'pieToggleSelect',
            from: uid,
            name: name,
            seriesName: seriesModel.name
        });

        data.each(function (idx) {
            toggleItemSelected(
                data.getItemGraphicEl(idx),
                data.getItemLayout(idx),
                seriesModel.isSelected(data.getName(idx)),
                selectedOffset,
                hasAnimation
            );
        });
    }

    function updateElementSelect(el, pos, hasAnimation) {
        hasAnimation
            // animateTo will stop revious animation like update transition
            ? el.animate()
                .when(200, {
                    position: pos
                })
                .start('bounceOut')
            : el.attr('position', pos);
    }
    /**
     * @param {module:zrender/graphic/Sector} el
     * @param {Object} layout
     * @param {boolean} isSelected
     * @param {number} selectedOffset
     * @param {boolean} hasAnimation
     * @inner
     */
    function toggleItemSelected(el, layout, isSelected, selectedOffset, hasAnimation) {
        var midAngle = (layout.startAngle + layout.endAngle) / 2;

        var dx = Math.cos(midAngle);
        var dy = Math.sin(midAngle);

        var offset = isSelected ? selectedOffset : 0;
        var position = [dx * offset, dy * offset];
        updateElementSelect(el, position, hasAnimation);
        updateElementSelect(el.__labelLine, position, hasAnimation);
        updateElementSelect(el.__labelText, position, hasAnimation);
    }

    /**
     * Create sector, label, and label line for each data
     * @param {Object} layout
     * @param {string} text
     * @param {boolean} hasAnimation
     * @return {module:zrender/graphic/Sector}
     */
    function createSectorAndLabel(layout, text, hasAnimation, api) {
        var shape = zrUtil.extend({}, layout);
        delete shape.label;

        var sector = new graphic.Sector({
            shape: shape
        });

        var labelLayout = layout.label;
        var labelLine = new graphic.Polyline({
            shape: {
                points: labelLayout.linePoints || [
                    [layout.x, layout.y], [layout.x, layout.y], [layout.x, layout.y]
                ]
            },
            silent: true
        });

        var labelText = new graphic.Text({
            style: {
                x: labelLayout.x,
                y: labelLayout.y,
                text: text,
                textAlign: labelLayout.textAlign,
                textBaseline: labelLayout.textBaseline,
                textFont: labelLayout.font
            },
            rotation: labelLayout.rotation,
            origin: [labelLayout.x, labelLayout.y],
            silent: true,
            z2: 10
        });

        sector.__labelLine = labelLine;
        sector.__labelText = labelText;

        if (hasAnimation) {
            sector.shape.endAngle = layout.startAngle;
            api.updateGraphicEl(sector, {
                shape: {
                    endAngle: layout.endAngle
                }
            });
        }

        return sector;
    }

    var Pie = require('../../view/Chart').extend({

        type: 'pie',

        init: function () {
            var sectorGroup = new graphic.Group();
            this._sectorGroup = sectorGroup;
        },

        render: function (seriesModel, ecModel, api, payload) {
            if (
                payload && (payload.from === this.uid
                || (payload.type === 'pieToggleSelect'
                    && payload.seriesName !== seriesModel.name))
            ) {
                return;
            }

            var data = seriesModel.getData();
            var oldData = this._data;
            var sectorGroup = this._sectorGroup;
            var group = this.group;

            var hasAnimation = ecModel.get('animation');
            var isFirstRender = !oldData;

            var firstSector;
            var onSectorClick = zrUtil.curry(
                updateDataSelected, this.uid, seriesModel, hasAnimation, api
            );

            var selectedMode = seriesModel.get('selectedMode');

            data.diff(oldData)
                .add(function (idx) {
                    var layout = data.getItemLayout(idx);

                    var sector = createSectorAndLabel(
                        layout, '', !isFirstRender, api
                    );

                    selectedMode && sector.on('click', onSectorClick);

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
                    api.updateGraphicEl(labelLine, {
                        shape: {
                            points: labelLayout.linePoints || [
                                [labelLayout.x, labelLayout.y],
                                [labelLayout.x, labelLayout.y],
                                [labelLayout.x, labelLayout.y]
                            ]
                        }
                    });
                    api.updateGraphicEl(labelText, {
                        style: {
                            x: labelLayout.x,
                            y: labelLayout.y
                        },
                        rotation: labelLayout.rotation
                    });

                    // Set none animating style
                    labelText.setStyle({
                        textAlign: labelLayout.textAlign,
                        textBaseline: labelLayout.textBaseline,
                        textFont: labelLayout.font
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
                    shape.cx, shape.cy, r, shape.startAngle, shape.clockwise, removeClipPath, api
                ));
            }

            // Make sure sectors is on top of labels
            group.remove(sectorGroup);
            group.add(sectorGroup);

            this._updateAll(data, seriesModel);

            this._data = data;
        },

        _updateAll: function (data, seriesModel, hasAnimation) {
            var selectedOffset = seriesModel.get('selectedOffset');
            data.eachItemGraphicEl(function (sector, idx) {
                var itemModel = data.getItemModel(idx);
                var itemStyleModel = itemModel.getModel('itemStyle');
                var visualColor = data.getItemVisual(idx, 'color');

                sector.setStyle(
                    zrUtil.extend(
                        {
                            fill: visualColor
                        },
                        itemStyleModel.getModel('normal').getItemStyle()
                    )
                );
                graphic.setHoverStyle(
                    sector,
                    itemStyleModel.getModel('emphasis').getItemStyle()
                );

                // Set label style
                var labelText = sector.__labelText;
                var labelLine = sector.__labelLine;
                var labelModel = itemModel.getModel('label.normal');
                var textStyleModel = labelModel.getModel('textStyle');
                var labelPosition = labelModel.get('position');
                var isLabelInside = labelPosition === 'inside';
                labelText.setStyle({
                    fill: textStyleModel.get('color')
                        || isLabelInside ? '#fff' : visualColor,
                    text: seriesModel.getFormattedLabel(idx, 'normal')
                        || data.getName(idx),
                    textFont: textStyleModel.getFont()
                });
                labelText.attr('ignore', !labelModel.get('show'));
                // Default use item visual color
                labelLine.attr('ignore', !itemModel.get('labelLine.show'));
                labelLine.setStyle({
                    stroke: visualColor
                });
                labelLine.setStyle(itemModel.getModel('labelLine').getLineStyle());

                toggleItemSelected(
                    sector,
                    data.getItemLayout(idx),
                    itemModel.get('selected'),
                    selectedOffset,
                    hasAnimation
                );
            });
        },

        _createClipPath: function (
            cx, cy, r, startAngle, clockwise, cb, api
        ) {
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

            api.initGraphicEl(clipPath, {
                shape: {
                    endAngle: startAngle + (clockwise ? 1 : -1) * Math.PI * 2
                }
            }, cb);

            return clipPath;
        },

        dispose: function () {}
    });

    return Pie;
});
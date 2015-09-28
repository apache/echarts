define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    function selectData(seriesModel) {
        var data = seriesModel.getData();
        var dataIndex = this.dataIndex;
        var name = data.getName(dataIndex);

        updateSelected(this, seriesModel.toggleSelected(name));
    }

    function updateSelected(el, isSelected) {
        var shape = el.shape;
        var midAngle = (shape.startAngle + shape.endAngle) / 2;

        var dx = Math.cos(midAngle);
        var dy = (shape.clockwise ? 1 : -1) * Math.sin(midAngle);

        var offset = isSelected ? shape.r * 0.1 : 0;

        // animateTo will stop revious animation like update transition
        el.animate()
            .when(200, {
                position: [dx * offset, dy * offset]
            })
            .start('bounceOut');
    }

    var Pie = require('../../view/Chart').extend({

        type: 'pie',

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var oldData = this._data;
            var group = this.group;

            var hasAnimation = ecModel.get('animation');
            var isFirstRender = !oldData;

            var firstSector;
            var onSectorClick = zrUtil.curry(selectData, seriesModel);

            data.diff(oldData)
                .add(function (idx) {
                    var layout = data.getItemLayout(idx);
                    var sector = new graphic.Sector({
                        shape: zrUtil.extend({}, layout)
                    });

                    if (hasAnimation && !isFirstRender) {
                        sector.shape.endAngle = layout.startAngle;
                        sector.animateTo({
                            shape: {
                                endAngle: layout.endAngle
                            }
                        }, 300, 'cubicOut');
                    }

                    sector.on('click', onSectorClick);

                    data.setItemGraphicEl(idx, sector);
                    group.add(sector);

                    firstSector = firstSector || sector;
                })
                .update(function (newIdx, oldIdx) {
                    var sector = oldData.getItemGraphicEl(oldIdx);
                    sector.animateTo({
                        shape: data.getItemLayout(newIdx)
                    }, 300, 'cubicOut');

                    group.add(sector);
                    data.setItemGraphicEl(newIdx, sector);
                })
                .remove(function (idx) {
                    var sector = oldData.getItemGraphicEl(idx);
                    group.remove(sector);
                })
                .execute();

            if (hasAnimation && isFirstRender && firstSector) {
                var shape = firstSector.shape;
                var r = Math.max(api.getWidth(), api.getHeight()) / 2;

                var removeClipPath = zrUtil.bind(group.removeClipPath, group);
                group.setClipPath(this._createClipPath(
                    shape.cx, shape.cy, r, shape.startAngle, shape.clockwise, removeClipPath
                ));
            }

            this._updateAll(data, seriesModel);

            this._data = data;
        },

        _updateAll: function (data, seriesModel) {
            data.eachItemGraphicEl(function (sector, idx) {
                var itemModel = data.getItemModel(idx);

                sector.setStyle(
                    zrUtil.extend(
                        {
                            fill: data.getItemVisual(idx, 'color')
                        },
                        itemModel.getModel('itemStyle.normal').getItemStyle()
                    )
                );
                graphic.setHoverStyle(
                    sector,
                    itemModel.getModel('itemStyle.emphasis').getItemStyle()
                );

                updateSelected(sector, itemModel.get('selected'));
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
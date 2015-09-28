define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    var Pie = require('../../view/Chart').extend({

        type: 'pie',

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var oldData = this._data;
            var group = this.group;
            data.diff(oldData)
                .add(function (idx) {
                    var sector = new graphic.Sector({
                        shape: data.getItemLayout(idx)
                    });
                    data.setItemGraphicEl(idx, sector);

                    group.add(sector);
                })
                .update(function (newIdx, oldIdx) {
                    var sector = oldData.getItemGraphicEl(oldIdx);

                    group.add(sector);
                })
                .remove(function (idx) {
                    var sector = oldData.getItemGraphicEl(idx);
                    group.remove(sector);
                })
                .execute();

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
            });
        },

        dispose: function () {}
    });

    return Pie;
});
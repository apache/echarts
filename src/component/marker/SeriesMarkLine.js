define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    function SeriesMarkLine() {

        this.group = new graphic.Group();
    }

    var seriesMarkLineProto = SeriesMarkLine.prototype;

    seriesMarkLineProto.update = function (fromData, toData) {

        var oldFromData = this._fromData;
        var group = this.group;

        fromData.diff(oldFromData)
            .add(function (idx) {
                var p1 = fromData.getItemLayout(idx);
                var p2 = toData.getItemLayout(idx);

                var line = new graphic.Line({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p1[0],
                        y2: p1[1]
                    }
                });

                line.animateTo({
                    shape: {
                        x2: p2[0],
                        y2: p2[1]
                    }
                }, 1000);

                group.add(line);

                fromData.setItemGraphicEl(idx, line);
            })
            .update(function (newIdx, oldIdx) {
                var line = oldFromData.getItemGraphicEl(oldIdx);

                var p1 = fromData.getItemLayout(newIdx);
                var p2 = toData.getItemLayout(newIdx);

                line.animateTo({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    }
                }, 300, 'cubicOut');

                fromData.setItemGraphicEl(newIdx, line);

                group.add(line);
            })
            .remove(function (idx) {
                var line = oldFromData.getItemGraphicEl(idx);

                group.remove(line);
            })
            .execute();

        fromData.eachItemGraphicEl(function (line, idx) {
            var itemModel = fromData.getItemModel(idx);

            line.setStyle(zrUtil.defaults(
                {
                    stroke: fromData.getItemVisual(idx, 'color')
                },
                itemModel.getModel('itemStyle.normal.lineStyle').getLineStyle()
            ));

            graphic.setHoverStyle(
                line,
                itemModel.getModel('itemStyle.emphasis.lineStyle').getLineStyle()
            );

        });

        this._fromData = fromData;
        // this._toData = toData;
    }

    return SeriesMarkLine;
});
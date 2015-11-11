/**
 * @module echarts/component/marker/SeriesMarkLine
 */
define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');

    function tangentRotation(p1, p2) {
        return -Math.PI / 2 - Math.atan2(
            p2[1] - p1[1], p2[0] - p1[0]
        );
    }
    /**
     * @inner
     */
    function createSymbol(data, idx, p1, p2, hasAnimation) {
        var color = data.getItemVisual(idx, 'color');
        var symbolType = data.getItemVisual(idx, 'symbol');
        var symbolSize = data.getItemVisual(idx, 'symbolSize');

        if (symbolType === 'none') {
            return;
        }

        if (!zrUtil.isArray(symbolSize)) {
            symbolSize = [symbolSize, symbolSize];
        }
        var symbolPath = symbolUtil.createSymbol(
            symbolType, -symbolSize[0] / 2, -symbolSize[1] / 2,
            symbolSize[0], symbolSize[1], color
        );

        if (hasAnimation) {
            symbolPath.position = p1.slice();
            symbolPath.animateTo({
                position: p2
            }, 1000);
        }
        else {
            symbolPath.position = p2.slice();
        }

        // Rotate the arrow
        // FIXME Hard coded ?
        if (symbolType === 'arrow') {
            symbolPath.rotation = tangentRotation(p1, p2);
        }

        return symbolPath;
    }

    /**
     * @alias module:echarts/component/marker/SeriesMarkLine
     * @constructor
     */
    function SeriesMarkLine() {

        this.group = new graphic.Group();
    }

    var seriesMarkLineProto = SeriesMarkLine.prototype;

    /**
     * @param {module:echarts/data/List} fromData
     * @param {module:echarts/data/List} toData
     */
    seriesMarkLineProto.update = function (fromData, toData) {

        var oldFromData = this._fromData;
        var oldToData = this._toData;
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

                var symbolFrom = createSymbol(fromData, idx, p2, p1);
                var symbolTo = createSymbol(toData, idx, p1, p2, true);

                group.add(line);
                group.add(symbolFrom);
                group.add(symbolTo);

                line.__symbolFrom = symbolFrom;
                line.__symbolTo = symbolTo;

                fromData.setItemGraphicEl(idx, line);
            })
            .update(function (newIdx, oldIdx) {
                var line = oldFromData.getItemGraphicEl(oldIdx);

                var p1 = fromData.getItemLayout(newIdx);
                var p2 = toData.getItemLayout(newIdx);

                var fromSymbolType = fromData.getItemVisual(newIdx, 'symbol');
                var toSymbolType = toData.getItemVisual(newIdx, 'symbol');

                line.animateTo({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    }
                }, 300, 'cubicOut');

                var rotation = tangentRotation(p1, p2);

                var symbolFrom = line.__symbolFrom;
                var symbolTo = line.__symbolTo;

                // Symbol changed
                if (fromSymbolType !== oldFromData.getItemVisual(oldIdx, 'symbol')) {
                    symbolFrom = line.__symbolFrom = createSymbol(fromData, newIdx, p2, p1);
                }
                else {
                    symbolFrom && symbolFrom.animateTo({
                        position: p1,
                        rotation: rotation
                    }, 300, 'cubicOut');
                }
                // Symbol changed
                if (toSymbolType !== oldToData.getItemVisual(oldIdx, 'symbol')) {
                    symbolTo = line.__symbolTo = createSymbol(toData, newIdx, p1, p2);
                }
                else {
                    symbolTo && symbolTo.animateTo({
                        position: p2,
                        rotation: rotation
                    }, 300, 'cubicOut');
                }

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
                itemModel.getModel('lineStyle.normal').getLineStyle()
            ));

            graphic.setHoverStyle(
                line,
                itemModel.getModel('lineStyle.emphasis').getLineStyle()
            );
        });

        this._fromData = fromData;
        this._toData = toData;
    };

    return SeriesMarkLine;
});
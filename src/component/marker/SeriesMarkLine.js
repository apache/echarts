/**
 * @module echarts/component/marker/SeriesMarkLine
 */
define(function (require) {

    var graphic = require('../../util/graphic');
    var numberUtil = require('../../util/number');
    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');
    var vector = require('zrender/core/vector');

    function tangentRotation(p1, p2) {
        return -Math.PI / 2 - Math.atan2(
            p2[1] - p1[1], p2[0] - p1[0]
        );
    }
    /**
     * @inner
     */
    function createSymbol(data, idx) {
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

        return symbolPath;
    }

    function updateSymbolBeforeLineUpdate () {
        var line = this;
        var symbolFrom = line.__symbolFrom;
        var symbolTo = line.__symbolTo;
        var label = line.__label;
        var lineShape = line.shape;
        var fromPos = [lineShape.x1, lineShape.y1];
        var toPos = [lineShape.x2, lineShape.y2];

        var d = vector.sub([], toPos, fromPos);
        vector.normalize(d, d);

        symbolFrom.attr('position', fromPos);
        symbolTo.attr('position', toPos);
        // Rotate the arrow
        // FIXME Hard coded ?
        if (symbolTo.type === 'arrow') {
            symbolTo.attr('rotation', tangentRotation(fromPos, toPos));
        }
        if (symbolFrom.type === 'arrow') {
            symbolFrom.attr('rotation', tangentRotation(toPos, fromPos));
        }
        label.attr('position', toPos);

        var textPosition;
        var textAlign;
        var textBaseline;
        // End
        if (line.__labelPosition === 'end') {
            textPosition = [d[0] * 5 + toPos[0], d[1] * 5 + toPos[1]];
            textAlign = d[0] > 0.8 ? 'left' : (d[0] < -0.8 ? 'right' : 'center');
            textBaseline = d[1] > 0.8 ? 'top' : (d[1] < -0.8 ? 'bottom' : 'middle');
        }
        // Start
        else {
            textPosition = [-d[0] * 5 + fromPos[0], -d[1] * 5 + fromPos[1]];
            textAlign = d[0] > 0.8 ? 'right' : (d[0] < -0.8 ? 'left' : 'center');
            textBaseline = d[1] > 0.8 ? 'bottom' : (d[1] < -0.8 ? 'top' : 'middle');
        }
        label.attr({
            style: {
                textBaseline: textBaseline,
                textAlign: textAlign
            },
            position: textPosition
        });
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
    seriesMarkLineProto.update = function (
        fromData, toData, mlModel, enableAnimation
    ) {

        var oldFromData = this._fromData;
        var oldToData = this._toData;
        var group = this.group;

        fromData.diff(oldFromData)
            .add(function (idx) {
                var p1 = fromData.getItemLayout(idx);
                var p2 = toData.getItemLayout(idx);

                var itemModel = fromData.getItemModel(idx);
                var labelModel = itemModel.getModel('label.normal');
                var textStyleModel = labelModel.getModel('textStyle');

                var line = new graphic.Line({
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    }
                });

                if (enableAnimation) {
                    line.shape.x1 = p1[0];
                    line.shape.y1 = p1[1];
                    line.animateTo({
                        shape: {
                            x2: p2[0],
                            y2: p2[1]
                        }
                    }, 1000);
                }

                var symbolFrom = createSymbol(fromData, idx);
                var symbolTo = createSymbol(toData, idx);
                var label = new graphic.Text({
                    style: {
                        text: mlModel.getFormattedLabel(idx, 'normal')
                            || numberUtil.round(mlModel.getData().getRawValue(idx)),
                        textFont: textStyleModel.getFont(),
                        fill: textStyleModel.get('color') || fromData.getItemVisual(idx, 'color')
                    }
                });

                group.add(line);

                // symbols must added after line to make sure
                // it will be updated after line#update.
                // Or symbol position and rotation update in line#beforeUpdate will be one frame slow
                group.add(symbolFrom);
                group.add(symbolTo);
                group.add(label);

                line.__symbolFrom = symbolFrom;
                line.__symbolTo = symbolTo;
                line.__label = label;
                line.__labelPosition = labelModel.get('position');

                // Update symbol position and rotation
                line.beforeUpdate = updateSymbolBeforeLineUpdate;

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

                // Symbol changed
                if (fromSymbolType !== oldFromData.getItemVisual(oldIdx, 'symbol')) {
                    line.__symbolFrom = createSymbol(fromData, newIdx, p2, p1);
                }
                // Symbol changed
                if (toSymbolType !== oldToData.getItemVisual(oldIdx, 'symbol')) {
                    line.__symbolTo = createSymbol(toData, newIdx, p1, p2);
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
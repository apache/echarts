/**
 * @module echarts/component/marker/LineDraw
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

    function createLine(points) {
        var line = new graphic[points[2] ? 'BezierCurve' : 'Line']({
            name: 'line',
            shape: {
                x1: points[0][0],
                y1: points[0][1],
                x2: points[1][0],
                y2: points[1][1]
            }
        });
        if (points[2]) {
            line.setShape({
                cpx1: points[2][0],
                cpy1: points[2][1]
            });
        }
        return line;
    }

    function isSymbolArrow(symbol) {
        return symbol.type === 'symbol' && symbol.shape.symbolType === 'arrow';
    }

    function updateSymbolBeforeLineUpdate () {
        var lineGroup = this;
        var line = lineGroup.childOfName('line');
        var symbolFrom = lineGroup.childOfName('fromSymbol');
        var symbolTo = lineGroup.childOfName('toSymbol');
        var label = lineGroup.childOfName('label');
        var fromPos = line.pointAt(0);
        var toPos = line.pointAt(line.shape.percent);

        var d = vector.sub([], toPos, fromPos);
        vector.normalize(d, d);

        if (symbolFrom) {
            symbolFrom.attr('position', fromPos);
            // Rotate the arrow
            // FIXME Hard coded ?
            if (isSymbolArrow(symbolTo)) {
                symbolTo.attr('rotation', tangentRotation(fromPos, toPos));
            }
        }
        if (symbolTo) {
            symbolTo.attr('position', toPos);
            if (isSymbolArrow(symbolFrom)) {
                symbolFrom.attr('rotation', tangentRotation(toPos, fromPos));
            }
        }

        label.attr('position', toPos);

        var textPosition;
        var textAlign;
        var textBaseline;
        // End
        if (label.__position === 'end') {
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
     * @alias module:echarts/component/marker/LineDraw
     * @constructor
     */
    function LineDraw() {
        this.group = new graphic.Group();
    }

    var lineDrawProto = LineDraw.prototype;

    /**
     * @param {module:echarts/data/List} lineData
     * @param {module:echarts/data/List} [fromData]
     * @param {module:echarts/data/List} [toData]
     * @param {module:echarts/ExtensionAPI} api
     */
    lineDrawProto.updateData = function (lineData, fromData, toData, api) {

        var oldFromData = this._fromData;
        var oldToData = this._toData;
        var oldLineData = this._lineData;
        var group = this.group;
        var seriesModel = lineData.hostModel;

        lineData.diff(oldLineData)
            .add(function (idx) {
                var linePoints = lineData.getItemLayout(idx);

                var itemModel = lineData.getItemModel(idx);
                var labelModel = itemModel.getModel('label.normal');
                var textStyleModel = labelModel.getModel('textStyle');

                var lineGroup = new graphic.Group();

                var line = createLine(linePoints);
                line.shape.percent = 0;
                api.initGraphicEl(line, {
                    shape: {
                        percent: 1
                    }
                });

                lineGroup.add(line);

                var label = new graphic.Text({
                    name: 'label',
                    style: {
                        text: seriesModel.getFormattedLabel(idx, 'normal')
                            || numberUtil.round(seriesModel.getData().getRawValue(idx)),
                        textFont: textStyleModel.getFont(),
                        fill: textStyleModel.get('color') || lineData.getItemVisual(idx, 'color')
                    }
                });
                lineGroup.add(label);
                label.__position = labelModel.get('position');

                if (fromData) {
                    var symbolFrom = createSymbol(fromData, idx);
                    symbolFrom.name = 'fromSymbol';
                    // symbols must added after line to make sure
                    // it will be updated after line#update.
                    // Or symbol position and rotation update in line#beforeUpdate will be one frame slow
                    lineGroup.add(symbolFrom);
                }
                if (toData) {
                    var symbolTo = createSymbol(toData, idx);
                    symbolTo.name = 'toSymbol';
                    lineGroup.add(symbolTo);
                }

                // Update symbol position and rotation
                lineGroup.beforeUpdate = updateSymbolBeforeLineUpdate;
                lineData.setItemGraphicEl(idx, lineGroup);

                group.add(lineGroup);
            })
            .update(function (newIdx, oldIdx) {
                var lineGroup = oldLineData.getItemGraphicEl(oldIdx);
                var line = lineGroup.childOfName('line');

                var linePoints = lineData.getItemLayout(newIdx);
                var p1 = linePoints[0];
                var p2 = linePoints[1];
                var cp1 = linePoints[2];
                var target = {
                    shape: {
                        x1: p1[0],
                        y1: p1[1],
                        x2: p2[0],
                        y2: p2[1]
                    }
                };
                if (cp1) {
                    target.shape.cpx1 = cp1[0];
                    target.shape.cpy1 = cp1[1];
                }

                api.updateGraphicEl(line, target);

                // Symbol changed
                if (fromData) {
                    var fromSymbolType = fromData.getItemVisual(newIdx, 'symbol');
                    if (!oldFromData || fromSymbolType !== oldFromData.getItemVisual(oldIdx, 'symbol')) {
                        var symbolFrom = createSymbol(fromData, newIdx);
                        symbolFrom.name = 'fromSymbol';
                        lineGroup.remove(line.childOfName('fromSymbol'));
                        lineGroup.add(symbolFrom);
                    }
                }
                if (toData) {
                    var toSymbolType = toData.getItemVisual(newIdx, 'symbol');
                    // Symbol changed
                    if (!oldToData || toSymbolType !== oldToData.getItemVisual(oldIdx, 'symbol')) {
                        var symbolTo = createSymbol(toData, newIdx);
                        symbolTo.name = 'toSymbol';
                        lineGroup.remove(line.childOfName('toSymbol'));
                        lineGroup.add(symbolTo);
                    }
                }

                lineData.setItemGraphicEl(newIdx, lineGroup);

                group.add(lineGroup);
            })
            .remove(function (idx) {
                group.remove(oldLineData.getItemGraphicEl(idx));
            })
            .execute();

        lineData.eachItemGraphicEl(function (lineGroup, idx) {
            var line = lineGroup.childOfName('line');
            var itemModel = lineData.getItemModel(idx);

            line.setStyle(zrUtil.defaults(
                {
                    stroke: lineData.getItemVisual(idx, 'color')
                },
                itemModel.getModel('lineStyle.normal').getLineStyle()
            ));

            graphic.setHoverStyle(
                line,
                itemModel.getModel('lineStyle.emphasis').getLineStyle()
            );
        });

        this._lineData = lineData;
        this._fromData = fromData;
        this._toData = toData;
    };

    lineDrawProto.updateLayout = function () {

    };

    lineDrawProto.remove = function () {
        this.group.removeAll();
    };

    return LineDraw;
});
/**
 * @module echarts/component/marker/LineDraw
 */
define(function (require) {

    var numberUtil = require('../../util/number');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');
    var vector = require('zrender/core/vector');
    var LinePath = require('./LinePath');

    function tangentRotation(p1, p2) {
        return -Math.PI / 2 - Math.atan2(
            p2[1] - p1[1], p2[0] - p1[0]
        );
    }
    /**
     * @inner
     */
    function createSymbol(name, data, idx) {
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
        symbolPath.name = name;

        return symbolPath;
    }

    function createLine(points) {
        var line = new LinePath({
            name: 'line'
        });
        setLinePoints(line.shape, points);
        return line;
    }

    function setLinePoints(targetShape, points) {
        var p1 = points[0];
        var p2 = points[1];
        var cp1 = points[2];
        targetShape.x1 = p1[0];
        targetShape.y1 = p1[1];
        targetShape.x2 = p2[0];
        targetShape.y2 = p2[1];
        targetShape.percent = 1;

        if (cp1) {
            targetShape.cpx1 = cp1[0];
            targetShape.cpy1 = cp1[1];
        }
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
                // Use the user specified text align and baseline first
                textBaseline: label.__textBaseline || textBaseline,
                textAlign: label.__textAlign || textAlign
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
     */
    lineDrawProto.updateData = function (lineData, fromData, toData) {

        var oldFromData = this._fromData;
        var oldToData = this._toData;
        var oldLineData = this._lineData;
        var group = this.group;
        var seriesModel = lineData.hostModel;

        lineData.diff(oldLineData)
            .add(function (idx) {
                var linePoints = lineData.getItemLayout(idx);

                var lineGroup = new graphic.Group();

                var line = createLine(linePoints);
                line.shape.percent = 0;
                graphic.initProps(line, {
                    shape: {
                        percent: 1
                    }
                }, seriesModel);

                lineGroup.add(line);

                var label = new graphic.Text({
                    name: 'label'
                });
                lineGroup.add(label);

                if (fromData) {
                    var symbolFrom = createSymbol('fromSymbol', fromData, idx);
                    // symbols must added after line to make sure
                    // it will be updated after line#update.
                    // Or symbol position and rotation update in line#beforeUpdate will be one frame slow
                    lineGroup.add(symbolFrom);
                }
                if (toData) {
                    var symbolTo = createSymbol('toSymbol', toData, idx);
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
                var target = {
                    shape: {}
                };
                setLinePoints(target.shape, linePoints);

                graphic.updateProps(line, target, seriesModel);

                // Symbol changed
                if (fromData) {
                    var fromSymbolType = fromData.getItemVisual(newIdx, 'symbol');
                    if (!oldFromData || fromSymbolType !== oldFromData.getItemVisual(oldIdx, 'symbol')) {
                        var symbolFrom = createSymbol('fromSymbol', fromData, newIdx);
                        lineGroup.remove(line.childOfName('fromSymbol'));
                        lineGroup.add(symbolFrom);
                    }
                }
                if (toData) {
                    var toSymbolType = toData.getItemVisual(newIdx, 'symbol');
                    // Symbol changed
                    if (!oldToData || toSymbolType !== oldToData.getItemVisual(oldIdx, 'symbol')) {
                        var symbolTo = createSymbol('toSymbol', toData, newIdx);
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

            var labelModel = itemModel.getModel('label.normal');
            var textStyleModel = labelModel.getModel('textStyle');
            var labelHoverModel = itemModel.getModel('label.emphasis');
            var textStyleHoverModel = labelHoverModel.getModel('textStyle');

            var defaultText = numberUtil.round(seriesModel.getData().getRawValue(idx));
            line.setStyle(zrUtil.extend(
                {
                    stroke: lineData.getItemVisual(idx, 'color')
                },
                itemModel.getModel('lineStyle.normal').getLineStyle()
            ));

            var label = lineGroup.childOfName('label');
            label.setStyle({
                text: labelModel.get('show')
                    ? seriesModel.getFormattedLabel(idx, 'normal') || defaultText
                    : '',
                textFont: textStyleModel.getFont(),
                fill: textStyleModel.get('color') || lineData.getItemVisual(idx, 'color')
            });
            label.hoverStyle = {
                text: labelHoverModel.get('show')
                    ? seriesModel.getFormattedLabel(idx, 'emphasis') || defaultText
                    : '',
                textFont: textStyleModel.getFont(),
                fill: textStyleHoverModel.get('color')
            };
            label.__textAlign = textStyleModel.get('align');
            label.__textBaseline = textStyleModel.get('baseline');
            label.__position = labelModel.get('position');

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
        var lineData = this._lineData;
        var fromData = this._fromData;
        var toData = this._toData;
        lineData.eachItemGraphicEl(function (el, idx) {
            var points = lineData.getItemLayout(idx);
            var linePath = el.childOfName('line');
            setLinePoints(linePath.shape, points);
            linePath.dirty(true);
            fromData && fromData.getItemGraphicEl(idx).attr('position', points[0]);
            toData && toData.getItemGraphicEl(idx).attr('position', points[1]);
        });
    };

    lineDrawProto.remove = function () {
        this.group.removeAll();
    };

    return LineDraw;
});
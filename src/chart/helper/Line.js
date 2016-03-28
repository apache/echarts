/**
 * @module echarts/chart/helper/Line
 */
define(function (require) {

    var symbolUtil = require('../../util/symbol');
    var vector = require('zrender/core/vector');
    var LinePath = require('./LinePath');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');

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
            name: 'line',
            style: {
                strokeNoScale: true
            }
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
        // If line not changed
        if (!this.__dirty && !line.__dirty) {
            return;
        }
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
            if (isSymbolArrow(symbolFrom)) {
                symbolFrom.attr('rotation', tangentRotation(toPos, fromPos));
            }
        }
        if (symbolTo) {
            symbolTo.attr('position', toPos);
            if (isSymbolArrow(symbolTo)) {
                symbolTo.attr('rotation', tangentRotation(fromPos, toPos));
            }
        }

        label.attr('position', toPos);

        var textPosition;
        var textAlign;
        var textVerticalAlign;
        // End
        if (label.__position === 'end') {
            textPosition = [d[0] * 5 + toPos[0], d[1] * 5 + toPos[1]];
            textAlign = d[0] > 0.8 ? 'left' : (d[0] < -0.8 ? 'right' : 'center');
            textVerticalAlign = d[1] > 0.8 ? 'top' : (d[1] < -0.8 ? 'bottom' : 'middle');
        }
        // Start
        else {
            textPosition = [-d[0] * 5 + fromPos[0], -d[1] * 5 + fromPos[1]];
            textAlign = d[0] > 0.8 ? 'right' : (d[0] < -0.8 ? 'left' : 'center');
            textVerticalAlign = d[1] > 0.8 ? 'bottom' : (d[1] < -0.8 ? 'top' : 'middle');
        }
        label.attr({
            style: {
                // Use the user specified text align and baseline first
                textVerticalAlign: label.__verticalAlign || textVerticalAlign,
                textAlign: label.__textAlign || textAlign
            },
            position: textPosition
        });
    }

    function tangentRotation(p1, p2) {
        return -Math.PI / 2 - Math.atan2(
            p2[1] - p1[1], p2[0] - p1[0]
        );
    }

    /**
     * @constructor
     * @extends {module:zrender/graphic/Group}
     * @alias {module:echarts/chart/helper/Line}
     */
    function Line(lineData, fromData, toData, idx) {
        graphic.Group.call(this);

        this._createLine(lineData, fromData, toData, idx);
    }

    var lineProto = Line.prototype;

    // Update symbol position and rotation
    lineProto.beforeUpdate = updateSymbolBeforeLineUpdate;

    lineProto._createLine = function (lineData, fromData, toData, idx) {
        var seriesModel = lineData.hostModel;
        var linePoints = lineData.getItemLayout(idx);

        var line = createLine(linePoints);
        line.shape.percent = 0;
        graphic.initProps(line, {
            shape: {
                percent: 1
            }
        }, seriesModel);

        this.add(line);

        var label = new graphic.Text({
            name: 'label'
        });
        this.add(label);

        if (fromData) {
            var symbolFrom = createSymbol('fromSymbol', fromData, idx);
            // symbols must added after line to make sure
            // it will be updated after line#update.
            // Or symbol position and rotation update in line#beforeUpdate will be one frame slow
            this.add(symbolFrom);

            this._fromSymbolType = fromData.getItemVisual(idx, 'symbol');
        }
        if (toData) {
            var symbolTo = createSymbol('toSymbol', toData, idx);
            this.add(symbolTo);

            this._toSymbolType = toData.getItemVisual(idx, 'symbol');
        }

        this._updateCommonStl(lineData, fromData, toData, idx);
    };

    lineProto.updateData = function (lineData, fromData, toData, idx) {
        var seriesModel = lineData.hostModel;

        var line = this.childOfName('line');
        var linePoints = lineData.getItemLayout(idx);
        var target = {
            shape: {}
        };
        setLinePoints(target.shape, linePoints);
        graphic.updateProps(line, target, seriesModel);

        // Symbol changed
        if (fromData) {
            var fromSymbolType = fromData.getItemVisual(idx, 'symbol');
            if (this._fromSymbolType !== fromSymbolType) {
                var symbolFrom = createSymbol('fromSymbol', fromData, idx);
                this.remove(this.childOfName('fromSymbol'));
                this.add(symbolFrom);
            }
            this._fromSymbolType = fromSymbolType;
        }
        if (toData) {
            var toSymbolType = toData.getItemVisual(idx, 'symbol');
            // Symbol changed
            if (toSymbolType !== this._toSymbolType) {
                var symbolTo = createSymbol('toSymbol', toData, idx);
                this.remove(this.childOfName('toSymbol'));
                this.add(symbolTo);
            }
            this._toSymbolType = toSymbolType;
        }

        this._updateCommonStl(lineData, fromData, toData, idx);
    };

    lineProto._updateCommonStl = function (lineData, fromData, toData, idx) {
        var seriesModel = lineData.hostModel;

        var line = this.childOfName('line');
        var itemModel = lineData.getItemModel(idx);

        var labelModel = itemModel.getModel('label.normal');
        var textStyleModel = labelModel.getModel('textStyle');
        var labelHoverModel = itemModel.getModel('label.emphasis');
        var textStyleHoverModel = labelHoverModel.getModel('textStyle');

        var defaultText = numberUtil.round(seriesModel.getRawValue(idx));
        if (isNaN(defaultText)) {
            // Use name
            defaultText = lineData.getName(idx);
        }
        line.setStyle(zrUtil.extend(
            {
                stroke: lineData.getItemVisual(idx, 'color')
            },
            itemModel.getModel('lineStyle.normal').getLineStyle()
        ));

        var label = this.childOfName('label');
        label.setStyle({
            text: labelModel.get('show')
                ? zrUtil.retrieve(
                    seriesModel.getFormattedLabel(idx, 'normal'),
                    defaultText
                )
                : '',
            textFont: textStyleModel.getFont(),
            fill: textStyleModel.getTextColor() || lineData.getItemVisual(idx, 'color')
        });
        label.hoverStyle = {
            text: labelHoverModel.get('show')
                ? zrUtil.retrieve(
                    seriesModel.getFormattedLabel(idx, 'emphasis'),
                    defaultText
                )
                : '',
            textFont: textStyleHoverModel.getFont(),
            fill: textStyleHoverModel.getTextColor()
        };
        label.__textAlign = textStyleModel.get('align');
        label.__verticalAlign = textStyleModel.get('baseline');
        label.__position = labelModel.get('position');

        graphic.setHoverStyle(
            this, itemModel.getModel('lineStyle.emphasis').getLineStyle()
        );
    };

    lineProto.updateLayout = function (lineData, fromData, toData, idx) {
        var points = lineData.getItemLayout(idx);
        var linePath = this.childOfName('line');
        setLinePoints(linePath.shape, points);
        linePath.dirty(true);
        // var fromEl = fromData && fromData.getItemGraphicEl(idx);
        // var toEl = toData && toData.getItemGraphicEl(idx);
        // fromEl && fromEl.attr('position', points[0]);
        // toEl && toEl.attr('position', points[1]);
    };

    zrUtil.inherits(Line, graphic.Group);

    return Line;
});
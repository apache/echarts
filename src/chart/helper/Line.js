/**
 * @module echarts/chart/helper/Line
 */
define(function (require) {

    var symbolUtil = require('../../util/symbol');
    var vector = require('zrender/core/vector');
    // var matrix = require('zrender/core/matrix');
    var LinePath = require('./LinePath');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../util/number');

    var SYMBOL_CATEGORIES = ['fromSymbol', 'toSymbol'];
    function makeSymbolTypeKey(symbolCategory) {
        return '_' + symbolCategory + 'Type';
    }
    /**
     * @inner
     */
    function createSymbol(name, lineData, idx) {
        var color = lineData.getItemVisual(idx, 'color');
        var symbolType = lineData.getItemVisual(idx, name);
        var symbolSize = lineData.getItemVisual(idx, name + 'Size');

        if (!symbolType || symbolType === 'none') {
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

    // function lineAfterUpdate() {
        // Ignore scale
        // var m = this.transform;
        // if (m) {
        //     var sx = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
        //     var sy = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
        //     m[0] /= sx;
        //     m[1] /= sx;
        //     m[2] /= sy;
        //     m[3] /= sy;

        //     matrix.invert(this.invTransform, m);
        // }
    // }

    // function isSymbolArrow(symbol) {
    //     return symbol.type === 'symbol' && symbol.shape.symbolType === 'arrow';
    // }

    function updateSymbolAndLabelBeforeLineUpdate () {
        var lineGroup = this;
        var symbolFrom = lineGroup.childOfName('fromSymbol');
        var symbolTo = lineGroup.childOfName('toSymbol');
        var label = lineGroup.childOfName('label');
        // Quick reject
        if (!symbolFrom && !symbolTo && label.ignore) {
            return;
        }

        var invScale = 1;
        var parentNode = this.parent;
        while (parentNode) {
            if (parentNode.scale) {
                invScale /= parentNode.scale[0];
            }
            parentNode = parentNode.parent;
        }

        var line = lineGroup.childOfName('line');
        // If line not changed
        // FIXME Parent scale changed
        if (!this.__dirty && !line.__dirty) {
            return;
        }

        var fromPos = line.pointAt(0);
        var toPos = line.pointAt(line.shape.percent);

        var d = vector.sub([], toPos, fromPos);
        vector.normalize(d, d);

        if (symbolFrom) {
            symbolFrom.attr('position', fromPos);
            var tangent = line.tangentAt(0);
            symbolFrom.attr('rotation', -Math.PI / 2 - Math.atan2(
                tangent[1], tangent[0]
            ));
            symbolFrom.attr('scale', [invScale, invScale]);
        }
        if (symbolTo) {
            symbolTo.attr('position', toPos);
            var tangent = line.tangentAt(1);
            symbolTo.attr('rotation', -Math.PI / 2 - Math.atan2(
                tangent[1], tangent[0]
            ));
            symbolTo.attr('scale', [invScale, invScale]);
        }

        if (!label.ignore) {
            label.attr('position', toPos);

            var textPosition;
            var textAlign;
            var textVerticalAlign;

            var distance = 5 * invScale;
            // End
            if (label.__position === 'end') {
                textPosition = [d[0] * distance + toPos[0], d[1] * distance + toPos[1]];
                textAlign = d[0] > 0.8 ? 'left' : (d[0] < -0.8 ? 'right' : 'center');
                textVerticalAlign = d[1] > 0.8 ? 'top' : (d[1] < -0.8 ? 'bottom' : 'middle');
            }
            // Middle
            else if (label.__position === 'middle') {
                var halfPercent = line.shape.percent / 2;
                var tangent = line.tangentAt(halfPercent);
                var n = [tangent[1], -tangent[0]];
                var cp = line.pointAt(halfPercent);
                if (n[1] > 0) {
                    n[0] = -n[0];
                    n[1] = -n[1];
                }
                textPosition = [cp[0] + n[0] * distance, cp[1] + n[1] * distance];
                textAlign = 'center';
                textVerticalAlign = 'bottom';
                var rotation = -Math.atan2(tangent[1], tangent[0]);
                if (toPos[0] < fromPos[0]) {
                    rotation = Math.PI + rotation;
                }
                label.attr('rotation', rotation);
            }
            // Start
            else {
                textPosition = [-d[0] * distance + fromPos[0], -d[1] * distance + fromPos[1]];
                textAlign = d[0] > 0.8 ? 'right' : (d[0] < -0.8 ? 'left' : 'center');
                textVerticalAlign = d[1] > 0.8 ? 'bottom' : (d[1] < -0.8 ? 'top' : 'middle');
            }
            label.attr({
                style: {
                    // Use the user specified text align and baseline first
                    textVerticalAlign: label.__verticalAlign || textVerticalAlign,
                    textAlign: label.__textAlign || textAlign
                },
                position: textPosition,
                scale: [invScale, invScale]
            });
        }
    }

    /**
     * @constructor
     * @extends {module:zrender/graphic/Group}
     * @alias {module:echarts/chart/helper/Line}
     */
    function Line(lineData, idx) {
        graphic.Group.call(this);

        this._createLine(lineData, idx);
    }

    var lineProto = Line.prototype;

    // Update symbol position and rotation
    lineProto.beforeUpdate = updateSymbolAndLabelBeforeLineUpdate;

    lineProto._createLine = function (lineData, idx) {
        var seriesModel = lineData.hostModel;
        var linePoints = lineData.getItemLayout(idx);

        var line = createLine(linePoints);
        line.shape.percent = 0;
        graphic.initProps(line, {
            shape: {
                percent: 1
            }
        }, seriesModel, idx);

        this.add(line);

        var label = new graphic.Text({
            name: 'label'
        });
        this.add(label);

        zrUtil.each(SYMBOL_CATEGORIES, function (symbolCategory) {
            var symbol = createSymbol(symbolCategory, lineData, idx);
            // symbols must added after line to make sure
            // it will be updated after line#update.
            // Or symbol position and rotation update in line#beforeUpdate will be one frame slow
            this.add(symbol);
            this[makeSymbolTypeKey(symbolCategory)] = lineData.getItemVisual(idx, symbolCategory);
        }, this);

        this._updateCommonStl(lineData, idx);
    };

    lineProto.updateData = function (lineData, idx) {
        var seriesModel = lineData.hostModel;

        var line = this.childOfName('line');
        var linePoints = lineData.getItemLayout(idx);
        var target = {
            shape: {}
        };
        setLinePoints(target.shape, linePoints);
        graphic.updateProps(line, target, seriesModel, idx);

        zrUtil.each(SYMBOL_CATEGORIES, function (symbolCategory) {
            var symbolType = lineData.getItemVisual(idx, symbolCategory);
            var key = makeSymbolTypeKey(symbolCategory);
            // Symbol changed
            if (this[key] !== symbolType) {
                var symbol = createSymbol(symbolCategory, lineData, idx);
                this.remove(this.childOfName(symbolCategory));
                this.add(symbol);
            }
            this[key] = symbolType;
        }, this);

        this._updateCommonStl(lineData, idx);
    };

    lineProto._updateCommonStl = function (lineData, idx) {
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
        line.useStyle(zrUtil.extend(
            {
                strokeNoScale: true,
                fill: 'none',
                stroke: lineData.getItemVisual(idx, 'color')
            },
            itemModel.getModel('lineStyle.normal').getLineStyle()
        ));
        line.hoverStyle = itemModel.getModel('lineStyle.emphasis').getLineStyle();
        var defaultColor = lineData.getItemVisual(idx, 'color') || '#000';
        var label = this.childOfName('label');
        // label.afterUpdate = lineAfterUpdate;
        label.setStyle({
            text: labelModel.get('show')
                ? zrUtil.retrieve(
                    seriesModel.getFormattedLabel(idx, 'normal', lineData.dataType),
                    defaultText
                )
                : '',
            textFont: textStyleModel.getFont(),
            fill: textStyleModel.getTextColor() || defaultColor
        });
        label.hoverStyle = {
            text: labelHoverModel.get('show')
                ? zrUtil.retrieve(
                    seriesModel.getFormattedLabel(idx, 'emphasis', lineData.dataType),
                    defaultText
                )
                : '',
            textFont: textStyleHoverModel.getFont(),
            fill: textStyleHoverModel.getTextColor() || defaultColor
        };
        label.__textAlign = textStyleModel.get('align');
        label.__verticalAlign = textStyleModel.get('baseline');
        label.__position = labelModel.get('position');

        label.ignore = !label.style.text && !label.hoverStyle.text;

        graphic.setHoverStyle(this);
    };

    lineProto.updateLayout = function (lineData, idx) {
        var points = lineData.getItemLayout(idx);
        var linePath = this.childOfName('line');
        setLinePoints(linePath.shape, points);
        linePath.dirty(true);
    };

    lineProto.setLinePoints = function (points) {
        var linePath = this.childOfName('line');
        setLinePoints(linePath.shape, points);
        linePath.dirty();
    };

    zrUtil.inherits(Line, graphic.Group);

    return Line;
});
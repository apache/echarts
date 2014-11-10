define('echarts/chart/gauge', [
    'require',
    '../component/base',
    './base',
    '../util/shape/GaugePointer',
    'zrender/shape/Text',
    'zrender/shape/Line',
    'zrender/shape/Rectangle',
    'zrender/shape/Circle',
    'zrender/shape/Sector',
    '../config',
    '../util/ecData',
    '../util/accMath',
    'zrender/tool/util',
    '../chart'
], function (require) {
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    var GaugePointerShape = require('../util/shape/GaugePointer');
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var RectangleShape = require('zrender/shape/Rectangle');
    var CircleShape = require('zrender/shape/Circle');
    var SectorShape = require('zrender/shape/Sector');
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var accMath = require('../util/accMath');
    var zrUtil = require('zrender/tool/util');
    function Gauge(ecTheme, messageCenter, zr, option, myChart) {
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        ChartBase.call(this);
        this.refresh(option);
    }
    Gauge.prototype = {
        type: ecConfig.CHART_TYPE_GAUGE,
        _buildShape: function () {
            var series = this.series;
            this._paramsMap = {};
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_GAUGE) {
                    series[i] = this.reformOption(series[i]);
                    this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
                    this._buildSingleGauge(i);
                    this.buildMark(i);
                }
            }
            this.addShapeList();
        },
        _buildSingleGauge: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            this._paramsMap[seriesIndex] = {
                center: this.parseCenter(this.zr, serie.center),
                radius: this.parseRadius(this.zr, serie.radius),
                startAngle: serie.startAngle.toFixed(2) - 0,
                endAngle: serie.endAngle.toFixed(2) - 0
            };
            this._paramsMap[seriesIndex].totalAngle = this._paramsMap[seriesIndex].startAngle - this._paramsMap[seriesIndex].endAngle;
            this._colorMap(seriesIndex);
            this._buildAxisLine(seriesIndex);
            this._buildSplitLine(seriesIndex);
            this._buildAxisTick(seriesIndex);
            this._buildAxisLabel(seriesIndex);
            this._buildPointer(seriesIndex);
            this._buildTitle(seriesIndex);
            this._buildDetail(seriesIndex);
        },
        _buildAxisLine: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.axisLine.show) {
                return;
            }
            var min = serie.min;
            var total = serie.max - min;
            var params = this._paramsMap[seriesIndex];
            var center = params.center;
            var startAngle = params.startAngle;
            var totalAngle = params.totalAngle;
            var colorArray = params.colorArray;
            var lineStyle = serie.axisLine.lineStyle;
            var lineWidth = this.parsePercent(lineStyle.width, params.radius[1]);
            var r = params.radius[1];
            var r0 = r - lineWidth;
            var sectorShape;
            var lastAngle = startAngle;
            var newAngle;
            for (var i = 0, l = colorArray.length; i < l; i++) {
                newAngle = startAngle - totalAngle * (colorArray[i][0] - min) / total;
                sectorShape = this._getSector(center, r0, r, newAngle, lastAngle, colorArray[i][1], lineStyle);
                lastAngle = newAngle;
                sectorShape._animationAdd = 'r';
                ecData.set(sectorShape, 'seriesIndex', seriesIndex);
                ecData.set(sectorShape, 'dataIndex', i);
                this.shapeList.push(sectorShape);
            }
        },
        _buildSplitLine: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.splitLine.show) {
                return;
            }
            var params = this._paramsMap[seriesIndex];
            var splitNumber = serie.splitNumber;
            var min = serie.min;
            var total = serie.max - min;
            var splitLine = serie.splitLine;
            var length = this.parsePercent(splitLine.length, params.radius[1]);
            var lineStyle = splitLine.lineStyle;
            var color = lineStyle.color;
            var center = params.center;
            var startAngle = params.startAngle * Math.PI / 180;
            var totalAngle = params.totalAngle * Math.PI / 180;
            var r = params.radius[1];
            var r0 = r - length;
            var angle;
            var sinAngle;
            var cosAngle;
            for (var i = 0; i <= splitNumber; i++) {
                angle = startAngle - totalAngle / splitNumber * i;
                sinAngle = Math.sin(angle);
                cosAngle = Math.cos(angle);
                this.shapeList.push(new LineShape({
                    zlevel: this._zlevelBase + 1,
                    hoverable: false,
                    style: {
                        xStart: center[0] + cosAngle * r,
                        yStart: center[1] - sinAngle * r,
                        xEnd: center[0] + cosAngle * r0,
                        yEnd: center[1] - sinAngle * r0,
                        strokeColor: color === 'auto' ? this._getColor(seriesIndex, min + total / splitNumber * i) : color,
                        lineType: lineStyle.type,
                        lineWidth: lineStyle.width,
                        shadowColor: lineStyle.shadowColor,
                        shadowBlur: lineStyle.shadowBlur,
                        shadowOffsetX: lineStyle.shadowOffsetX,
                        shadowOffsetY: lineStyle.shadowOffsetY
                    }
                }));
            }
        },
        _buildAxisTick: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.axisTick.show) {
                return;
            }
            var params = this._paramsMap[seriesIndex];
            var splitNumber = serie.splitNumber;
            var min = serie.min;
            var total = serie.max - min;
            var axisTick = serie.axisTick;
            var tickSplit = axisTick.splitNumber;
            var length = this.parsePercent(axisTick.length, params.radius[1]);
            var lineStyle = axisTick.lineStyle;
            var color = lineStyle.color;
            var center = params.center;
            var startAngle = params.startAngle * Math.PI / 180;
            var totalAngle = params.totalAngle * Math.PI / 180;
            var r = params.radius[1];
            var r0 = r - length;
            var angle;
            var sinAngle;
            var cosAngle;
            for (var i = 0, l = splitNumber * tickSplit; i <= l; i++) {
                if (i % tickSplit === 0) {
                    continue;
                }
                angle = startAngle - totalAngle / l * i;
                sinAngle = Math.sin(angle);
                cosAngle = Math.cos(angle);
                this.shapeList.push(new LineShape({
                    zlevel: this._zlevelBase + 1,
                    hoverable: false,
                    style: {
                        xStart: center[0] + cosAngle * r,
                        yStart: center[1] - sinAngle * r,
                        xEnd: center[0] + cosAngle * r0,
                        yEnd: center[1] - sinAngle * r0,
                        strokeColor: color === 'auto' ? this._getColor(seriesIndex, min + total / l * i) : color,
                        lineType: lineStyle.type,
                        lineWidth: lineStyle.width,
                        shadowColor: lineStyle.shadowColor,
                        shadowBlur: lineStyle.shadowBlur,
                        shadowOffsetX: lineStyle.shadowOffsetX,
                        shadowOffsetY: lineStyle.shadowOffsetY
                    }
                }));
            }
        },
        _buildAxisLabel: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.axisLabel.show) {
                return;
            }
            var splitNumber = serie.splitNumber;
            var min = serie.min;
            var total = serie.max - min;
            var textStyle = serie.axisLabel.textStyle;
            var textFont = this.getFont(textStyle);
            var color = textStyle.color;
            var params = this._paramsMap[seriesIndex];
            var center = params.center;
            var startAngle = params.startAngle;
            var totalAngle = params.totalAngle;
            var r0 = params.radius[1] - this.parsePercent(serie.splitLine.length, params.radius[1]) - 10;
            var angle;
            var sinAngle;
            var cosAngle;
            var value;
            for (var i = 0; i <= splitNumber; i++) {
                value = accMath.accAdd(min, accMath.accMul(accMath.accDiv(total, splitNumber), i));
                angle = startAngle - totalAngle / splitNumber * i;
                sinAngle = Math.sin(angle * Math.PI / 180);
                cosAngle = Math.cos(angle * Math.PI / 180);
                angle = (angle + 360) % 360;
                this.shapeList.push(new TextShape({
                    zlevel: this._zlevelBase + 1,
                    hoverable: false,
                    style: {
                        x: center[0] + cosAngle * r0,
                        y: center[1] - sinAngle * r0,
                        color: color === 'auto' ? this._getColor(seriesIndex, value) : color,
                        text: this._getLabelText(serie.axisLabel.formatter, value),
                        textAlign: angle >= 110 && angle <= 250 ? 'left' : angle <= 70 || angle >= 290 ? 'right' : 'center',
                        textBaseline: angle >= 10 && angle <= 170 ? 'top' : angle >= 190 && angle <= 350 ? 'bottom' : 'middle',
                        textFont: textFont,
                        shadowColor: textStyle.shadowColor,
                        shadowBlur: textStyle.shadowBlur,
                        shadowOffsetX: textStyle.shadowOffsetX,
                        shadowOffsetY: textStyle.shadowOffsetY
                    }
                }));
            }
        },
        _buildPointer: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.pointer.show) {
                return;
            }
            var total = serie.max - serie.min;
            var pointer = serie.pointer;
            var params = this._paramsMap[seriesIndex];
            var length = this.parsePercent(pointer.length, params.radius[1]);
            var width = this.parsePercent(pointer.width, params.radius[1]);
            var center = params.center;
            var value = this._getValue(seriesIndex);
            value = value < serie.max ? value : serie.max;
            var angle = (params.startAngle - params.totalAngle / total * (value - serie.min)) * Math.PI / 180;
            var color = pointer.color === 'auto' ? this._getColor(seriesIndex, value) : pointer.color;
            var pointShape = new GaugePointerShape({
                zlevel: this._zlevelBase + 1,
                style: {
                    x: center[0],
                    y: center[1],
                    r: length,
                    startAngle: params.startAngle * Math.PI / 180,
                    angle: angle,
                    color: color,
                    width: width,
                    shadowColor: pointer.shadowColor,
                    shadowBlur: pointer.shadowBlur,
                    shadowOffsetX: pointer.shadowOffsetX,
                    shadowOffsetY: pointer.shadowOffsetY
                },
                highlightStyle: {
                    brushType: 'fill',
                    width: width > 2 ? 2 : width / 2,
                    color: '#fff'
                }
            });
            ecData.pack(pointShape, this.series[seriesIndex], seriesIndex, this.series[seriesIndex].data[0], 0, this.series[seriesIndex].data[0].name, value);
            this.shapeList.push(pointShape);
            this.shapeList.push(new CircleShape({
                zlevel: this._zlevelBase + 2,
                hoverable: false,
                style: {
                    x: center[0],
                    y: center[1],
                    r: pointer.width / 2.5,
                    color: '#fff'
                }
            }));
        },
        _buildTitle: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.title.show) {
                return;
            }
            var data = serie.data[0];
            var name = data.name != null ? data.name : '';
            if (name !== '') {
                var title = serie.title;
                var offsetCenter = title.offsetCenter;
                var textStyle = title.textStyle;
                var textColor = textStyle.color;
                var params = this._paramsMap[seriesIndex];
                var x = params.center[0] + this.parsePercent(offsetCenter[0], params.radius[1]);
                var y = params.center[1] + this.parsePercent(offsetCenter[1], params.radius[1]);
                this.shapeList.push(new TextShape({
                    zlevel: this._zlevelBase + (Math.abs(x - params.center[0]) + Math.abs(y - params.center[1])) < textStyle.fontSize * 2 ? 2 : 1,
                    hoverable: false,
                    style: {
                        x: x,
                        y: y,
                        color: textColor === 'auto' ? this._getColor(seriesIndex) : textColor,
                        text: name,
                        textAlign: 'center',
                        textFont: this.getFont(textStyle),
                        shadowColor: textStyle.shadowColor,
                        shadowBlur: textStyle.shadowBlur,
                        shadowOffsetX: textStyle.shadowOffsetX,
                        shadowOffsetY: textStyle.shadowOffsetY
                    }
                }));
            }
        },
        _buildDetail: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.detail.show) {
                return;
            }
            var detail = serie.detail;
            var offsetCenter = detail.offsetCenter;
            var color = detail.backgroundColor;
            var textStyle = detail.textStyle;
            var textColor = textStyle.color;
            var params = this._paramsMap[seriesIndex];
            var value = this._getValue(seriesIndex);
            var x = params.center[0] - detail.width / 2 + this.parsePercent(offsetCenter[0], params.radius[1]);
            var y = params.center[1] + this.parsePercent(offsetCenter[1], params.radius[1]);
            this.shapeList.push(new RectangleShape({
                zlevel: this._zlevelBase + (Math.abs(x + detail.width / 2 - params.center[0]) + Math.abs(y + detail.height / 2 - params.center[1])) < textStyle.fontSize ? 2 : 1,
                hoverable: false,
                style: {
                    x: x,
                    y: y,
                    width: detail.width,
                    height: detail.height,
                    brushType: 'both',
                    color: color === 'auto' ? this._getColor(seriesIndex, value) : color,
                    lineWidth: detail.borderWidth,
                    strokeColor: detail.borderColor,
                    shadowColor: detail.shadowColor,
                    shadowBlur: detail.shadowBlur,
                    shadowOffsetX: detail.shadowOffsetX,
                    shadowOffsetY: detail.shadowOffsetY,
                    text: this._getLabelText(detail.formatter, value),
                    textFont: this.getFont(textStyle),
                    textPosition: 'inside',
                    textColor: textColor === 'auto' ? this._getColor(seriesIndex, value) : textColor
                }
            }));
        },
        _getValue: function (seriesIndex) {
            var data = this.series[seriesIndex].data[0];
            return data.value != null ? data.value : data;
        },
        _colorMap: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            var min = serie.min;
            var total = serie.max - min;
            var color = serie.axisLine.lineStyle.color;
            if (!(color instanceof Array)) {
                color = [[
                        1,
                        color
                    ]];
            }
            var colorArray = [];
            for (var i = 0, l = color.length; i < l; i++) {
                colorArray.push([
                    color[i][0] * total + min,
                    color[i][1]
                ]);
            }
            this._paramsMap[seriesIndex].colorArray = colorArray;
        },
        _getColor: function (seriesIndex, value) {
            if (value == null) {
                value = this._getValue(seriesIndex);
            }
            var colorArray = this._paramsMap[seriesIndex].colorArray;
            for (var i = 0, l = colorArray.length; i < l; i++) {
                if (colorArray[i][0] >= value) {
                    return colorArray[i][1];
                }
            }
            return colorArray[colorArray.length - 1][1];
        },
        _getSector: function (center, r0, r, startAngle, endAngle, color, lineStyle) {
            return new SectorShape({
                zlevel: this._zlevelBase,
                hoverable: false,
                style: {
                    x: center[0],
                    y: center[1],
                    r0: r0,
                    r: r,
                    startAngle: startAngle,
                    endAngle: endAngle,
                    brushType: 'fill',
                    color: color,
                    shadowColor: lineStyle.shadowColor,
                    shadowBlur: lineStyle.shadowBlur,
                    shadowOffsetX: lineStyle.shadowOffsetX,
                    shadowOffsetY: lineStyle.shadowOffsetY
                }
            });
        },
        _getLabelText: function (formatter, value) {
            if (formatter) {
                if (typeof formatter === 'function') {
                    return formatter.call(this.myChart, value);
                } else if (typeof formatter === 'string') {
                    return formatter.replace('{value}', value);
                }
            }
            return value;
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            this.backupShapeList();
            this._buildShape();
        }
    };
    zrUtil.inherits(Gauge, ChartBase);
    zrUtil.inherits(Gauge, ComponentBase);
    require('../chart').define('gauge', Gauge);
    return Gauge;
});define('echarts/util/shape/GaugePointer', [
    'require',
    'zrender/shape/Base',
    'zrender/tool/util',
    './normalIsCover'
], function (require) {
    var Base = require('zrender/shape/Base');
    var zrUtil = require('zrender/tool/util');
    function GaugePointer(options) {
        Base.call(this, options);
    }
    GaugePointer.prototype = {
        type: 'gauge-pointer',
        buildPath: function (ctx, style) {
            var r = style.r;
            var width = style.width;
            var angle = style.angle;
            var x = style.x - Math.cos(angle) * width * (width >= r / 3 ? 1 : 2);
            var y = style.y + Math.sin(angle) * width * (width >= r / 3 ? 1 : 2);
            angle = style.angle - Math.PI / 2;
            ctx.moveTo(x, y);
            ctx.lineTo(style.x + Math.cos(angle) * width, style.y - Math.sin(angle) * width);
            ctx.lineTo(style.x + Math.cos(style.angle) * r, style.y - Math.sin(style.angle) * r);
            ctx.lineTo(style.x - Math.cos(angle) * width, style.y + Math.sin(angle) * width);
            ctx.lineTo(x, y);
            return;
        },
        getRect: function (style) {
            if (style.__rect) {
                return style.__rect;
            }
            var width = style.width * 2;
            var xStart = style.x;
            var yStart = style.y;
            var xEnd = xStart + Math.cos(style.angle) * style.r;
            var yEnd = yStart - Math.sin(style.angle) * style.r;
            style.__rect = {
                x: Math.min(xStart, xEnd) - width,
                y: Math.min(yStart, yEnd) - width,
                width: Math.abs(xStart - xEnd) + width,
                height: Math.abs(yStart - yEnd) + width
            };
            return style.__rect;
        },
        isCover: require('./normalIsCover')
    };
    zrUtil.inherits(GaugePointer, Base);
    return GaugePointer;
});
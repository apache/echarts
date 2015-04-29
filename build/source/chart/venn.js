define('echarts/chart/venn', [
    'require',
    './base',
    'zrender/shape/Text',
    'zrender/shape/Circle',
    'zrender/shape/Path',
    '../config',
    '../util/ecData',
    'zrender/tool/util',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var TextShape = require('zrender/shape/Text');
    var CircleShape = require('zrender/shape/Circle');
    var PathShape = require('zrender/shape/Path');
    var ecConfig = require('../config');
    ecConfig.venn = {
        zlevel: 0,
        z: 1,
        calculable: false
    };
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    function Venn(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Venn.prototype = {
        type: ecConfig.CHART_TYPE_VENN,
        _buildShape: function () {
            this.selectedMap = {};
            this._symbol = this.option.symbolList;
            this._queryTarget;
            this._dropBoxList = [];
            this._vennDataCounter = 0;
            var series = this.series;
            this.data = series[0].data;
            this._buildVenn(this.data);
            this.addShapeList();
        },
        _buildVenn: function (data) {
            var r0;
            var r1;
            if (data[0].value > data[1].value) {
                r0 = this.zr.getHeight() / 3;
                r1 = r0 * Math.sqrt(data[1].value) / Math.sqrt(data[0].value);
            } else {
                r1 = this.zr.getHeight() / 3;
                r0 = r1 * Math.sqrt(data[0].value) / Math.sqrt(data[1].value);
            }
            var x0 = this.zr.getWidth() / 2 - r0;
            var coincideLengthAnchor = (r0 + r1) / 2 * Math.sqrt(data[2].value) / Math.sqrt((data[0].value + data[1].value) / 2);
            var coincideLength = r0 + r1;
            if (data[2].value !== 0) {
                coincideLength = this._getCoincideLength(data[0].value, data[1].value, data[2].value, r0, r1, coincideLengthAnchor, Math.abs(r0 - r1), r0 + r1);
            }
            var x1 = x0 + coincideLength;
            var y = this.zr.getHeight() / 2;
            this._buildItem(0, 0, x0, y, r0);
            this._buildItem(0, 1, x1, y, r1);
            if (data[2].value !== 0 && data[2].value !== data[0].value && data[2].value !== data[1].value) {
                var xLeft = (r0 * r0 - r1 * r1) / (2 * coincideLength) + coincideLength / 2;
                var xRight = coincideLength / 2 - (r0 * r0 - r1 * r1) / (2 * coincideLength);
                var h = Math.sqrt(r0 * r0 - xLeft * xLeft);
                var rightLargeArcFlag = 0;
                var leftLargeArcFlag = 0;
                if (data[0].value > data[1].value && x1 < x0 + xLeft) {
                    leftLargeArcFlag = 1;
                }
                if (data[0].value < data[1].value && x1 < x0 + xRight) {
                    rightLargeArcFlag = 1;
                }
                this._buildCoincideItem(2, x0 + xLeft, y - h, y + h, r0, r1, rightLargeArcFlag, leftLargeArcFlag);
            }
        },
        _getCoincideLength: function (value0, value1, value2, r0, r1, coincideLengthAnchor, coincideLengthAnchorMin, coincideLengthAnchorMax) {
            var x = (r0 * r0 - r1 * r1) / (2 * coincideLengthAnchor) + coincideLengthAnchor / 2;
            var y = coincideLengthAnchor / 2 - (r0 * r0 - r1 * r1) / (2 * coincideLengthAnchor);
            var alfa = Math.acos(x / r0);
            var beta = Math.acos(y / r1);
            var area0 = r0 * r0 * Math.PI;
            var area2 = alfa * r0 * r0 - x * r0 * Math.sin(alfa) + beta * r1 * r1 - y * r1 * Math.sin(beta);
            var scaleAnchor = area2 / area0;
            var scale = value2 / value0;
            var approximateValue = Math.abs(scaleAnchor / scale);
            if (approximateValue > 0.999 && approximateValue < 1.001) {
                return coincideLengthAnchor;
            } else if (approximateValue <= 0.999) {
                coincideLengthAnchorMax = coincideLengthAnchor;
                coincideLengthAnchor = (coincideLengthAnchor + coincideLengthAnchorMin) / 2;
                return this._getCoincideLength(value0, value1, value2, r0, r1, coincideLengthAnchor, coincideLengthAnchorMin, coincideLengthAnchorMax);
            } else {
                coincideLengthAnchorMin = coincideLengthAnchor;
                coincideLengthAnchor = (coincideLengthAnchor + coincideLengthAnchorMax) / 2;
                return this._getCoincideLength(value0, value1, value2, r0, r1, coincideLengthAnchor, coincideLengthAnchorMin, coincideLengthAnchorMax);
            }
        },
        _buildItem: function (seriesIndex, dataIndex, x, y, r) {
            var series = this.series;
            var circle = this.getCircle(dataIndex, x, y, r);
            ecData.pack(circle, series[0], seriesIndex, series[0].data[dataIndex], dataIndex, series[0].data[dataIndex].name);
            this.shapeList.push(circle);
            if (series[0].itemStyle.normal.label.show) {
                var label = this.getLabel(dataIndex, x, y, r);
                ecData.pack(label, series[0], seriesIndex, series[0].data[dataIndex], dataIndex, series[0].data[dataIndex].name);
                this.shapeList.push(label);
            }
        },
        _buildCoincideItem: function (dataIndex, x, y0, y1, r0, r1, rightLargeArcFlag, leftLargeArcFlag) {
            var series = this.series;
            var serie = series[0];
            var data = this.data[dataIndex];
            var queryTarget = [
                data,
                serie
            ];
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
            var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis') || {};
            var normalColor = normal.color || this.zr.getColor(dataIndex);
            var emphasisColor = emphasis.color || this.zr.getColor(dataIndex);
            var path = 'M' + x + ',' + y0 + 'A' + r0 + ',' + r0 + ',0,' + rightLargeArcFlag + ',1,' + x + ',' + y1 + 'A' + r1 + ',' + r1 + ',0,' + leftLargeArcFlag + ',1,' + x + ',' + y0;
            var style = {
                color: normalColor,
                path: path
            };
            var shape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: style,
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }
            };
            shape = new PathShape(shape);
            if (shape.buildPathArray) {
                shape.style.pathArray = shape.buildPathArray(style.path);
            }
            ecData.pack(shape, series[0], 0, series[0].data[dataIndex], dataIndex, series[0].data[dataIndex].name);
            this.shapeList.push(shape);
        },
        getCircle: function (dataIndex, x, y, r) {
            var serie = this.series[0];
            var data = this.data[dataIndex];
            var queryTarget = [
                data,
                serie
            ];
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
            var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis') || {};
            var normalColor = normal.color || this.zr.getColor(dataIndex);
            var emphasisColor = emphasis.color || this.zr.getColor(dataIndex);
            var circle = {
                zlevel: this.getZlevelBase(),
                clickable: true,
                style: {
                    x: x,
                    y: y,
                    r: r,
                    brushType: 'fill',
                    opacity: 1,
                    color: normalColor
                },
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }
            };
            if (this.deepQuery([
                    data,
                    serie,
                    this.option
                ], 'calculable')) {
                this.setCalculable(circle);
                circle.draggable = true;
            }
            return new CircleShape(circle);
        },
        getLabel: function (dataIndex, x, y, r) {
            var serie = this.series[0];
            var itemStyle = serie.itemStyle;
            var data = this.data[dataIndex];
            var queryTarget = [
                data,
                serie
            ];
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
            var status = 'normal';
            var labelControl = itemStyle[status].label;
            var textStyle = labelControl.textStyle || {};
            var text = this.getLabelText(dataIndex, status);
            var textFont = this.getFont(textStyle);
            var textColor = normal.color || this.zr.getColor(dataIndex);
            var textSize = textStyle.fontSize || 12;
            var textShape = {
                zlevel: ecConfig.venn.zlevel + 1,
                style: {
                    x: x,
                    y: y - r - textSize,
                    color: textStyle.color || textColor,
                    text: text,
                    textFont: textFont,
                    textAlign: 'center'
                }
            };
            return new TextShape(textShape);
        },
        getLabelText: function (dataIndex, status) {
            var series = this.series;
            var serie = series[0];
            var data = serie.data[dataIndex];
            var formatter = this.deepQuery([
                data,
                serie
            ], 'itemStyle.' + status + '.label.formatter');
            if (formatter) {
                if (typeof formatter == 'function') {
                    return formatter(serie.name, data.name, data.value);
                } else if (typeof formatter == 'string') {
                    formatter = formatter.replace('{a}', '{a0}').replace('{b}', '{b0}').replace('{c}', '{c0}');
                    formatter = formatter.replace('{a0}', serie.name).replace('{b0}', data.name).replace('{c0}', data.value);
                    return formatter;
                }
            } else {
                return data.name;
            }
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            this._buildShape();
        }
    };
    zrUtil.inherits(Venn, ChartBase);
    require('../chart').define('venn', Venn);
    return Venn;
});define('zrender/shape/Path', [
    'require',
    './Base',
    './util/PathProxy',
    '../tool/util'
], function (require) {
    var Base = require('./Base');
    var PathProxy = require('./util/PathProxy');
    var PathSegment = PathProxy.PathSegment;
    var vMag = function (v) {
        return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    };
    var vRatio = function (u, v) {
        return (u[0] * v[0] + u[1] * v[1]) / (vMag(u) * vMag(v));
    };
    var vAngle = function (u, v) {
        return (u[0] * v[1] < u[1] * v[0] ? -1 : 1) * Math.acos(vRatio(u, v));
    };
    var Path = function (options) {
        Base.call(this, options);
    };
    Path.prototype = {
        type: 'path',
        buildPathArray: function (data, x, y) {
            if (!data) {
                return [];
            }
            x = x || 0;
            y = y || 0;
            var cs = data;
            var cc = [
                'm',
                'M',
                'l',
                'L',
                'v',
                'V',
                'h',
                'H',
                'z',
                'Z',
                'c',
                'C',
                'q',
                'Q',
                't',
                'T',
                's',
                'S',
                'a',
                'A'
            ];
            cs = cs.replace(/-/g, ' -');
            cs = cs.replace(/  /g, ' ');
            cs = cs.replace(/ /g, ',');
            cs = cs.replace(/,,/g, ',');
            var n;
            for (n = 0; n < cc.length; n++) {
                cs = cs.replace(new RegExp(cc[n], 'g'), '|' + cc[n]);
            }
            var arr = cs.split('|');
            var ca = [];
            var cpx = 0;
            var cpy = 0;
            for (n = 1; n < arr.length; n++) {
                var str = arr[n];
                var c = str.charAt(0);
                str = str.slice(1);
                str = str.replace(new RegExp('e,-', 'g'), 'e-');
                var p = str.split(',');
                if (p.length > 0 && p[0] === '') {
                    p.shift();
                }
                for (var i = 0; i < p.length; i++) {
                    p[i] = parseFloat(p[i]);
                }
                while (p.length > 0) {
                    if (isNaN(p[0])) {
                        break;
                    }
                    var cmd = null;
                    var points = [];
                    var ctlPtx;
                    var ctlPty;
                    var prevCmd;
                    var rx;
                    var ry;
                    var psi;
                    var fa;
                    var fs;
                    var x1 = cpx;
                    var y1 = cpy;
                    switch (c) {
                    case 'l':
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'L':
                        cpx = p.shift();
                        cpy = p.shift();
                        points.push(cpx, cpy);
                        break;
                    case 'm':
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'M';
                        points.push(cpx, cpy);
                        c = 'l';
                        break;
                    case 'M':
                        cpx = p.shift();
                        cpy = p.shift();
                        cmd = 'M';
                        points.push(cpx, cpy);
                        c = 'L';
                        break;
                    case 'h':
                        cpx += p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'H':
                        cpx = p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'v':
                        cpy += p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'V':
                        cpy = p.shift();
                        cmd = 'L';
                        points.push(cpx, cpy);
                        break;
                    case 'C':
                        points.push(p.shift(), p.shift(), p.shift(), p.shift());
                        cpx = p.shift();
                        cpy = p.shift();
                        points.push(cpx, cpy);
                        break;
                    case 'c':
                        points.push(cpx + p.shift(), cpy + p.shift(), cpx + p.shift(), cpy + p.shift());
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'C';
                        points.push(cpx, cpy);
                        break;
                    case 'S':
                        ctlPtx = cpx;
                        ctlPty = cpy;
                        prevCmd = ca[ca.length - 1];
                        if (prevCmd.command === 'C') {
                            ctlPtx = cpx + (cpx - prevCmd.points[2]);
                            ctlPty = cpy + (cpy - prevCmd.points[3]);
                        }
                        points.push(ctlPtx, ctlPty, p.shift(), p.shift());
                        cpx = p.shift();
                        cpy = p.shift();
                        cmd = 'C';
                        points.push(cpx, cpy);
                        break;
                    case 's':
                        ctlPtx = cpx, ctlPty = cpy;
                        prevCmd = ca[ca.length - 1];
                        if (prevCmd.command === 'C') {
                            ctlPtx = cpx + (cpx - prevCmd.points[2]);
                            ctlPty = cpy + (cpy - prevCmd.points[3]);
                        }
                        points.push(ctlPtx, ctlPty, cpx + p.shift(), cpy + p.shift());
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'C';
                        points.push(cpx, cpy);
                        break;
                    case 'Q':
                        points.push(p.shift(), p.shift());
                        cpx = p.shift();
                        cpy = p.shift();
                        points.push(cpx, cpy);
                        break;
                    case 'q':
                        points.push(cpx + p.shift(), cpy + p.shift());
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'Q';
                        points.push(cpx, cpy);
                        break;
                    case 'T':
                        ctlPtx = cpx, ctlPty = cpy;
                        prevCmd = ca[ca.length - 1];
                        if (prevCmd.command === 'Q') {
                            ctlPtx = cpx + (cpx - prevCmd.points[0]);
                            ctlPty = cpy + (cpy - prevCmd.points[1]);
                        }
                        cpx = p.shift();
                        cpy = p.shift();
                        cmd = 'Q';
                        points.push(ctlPtx, ctlPty, cpx, cpy);
                        break;
                    case 't':
                        ctlPtx = cpx, ctlPty = cpy;
                        prevCmd = ca[ca.length - 1];
                        if (prevCmd.command === 'Q') {
                            ctlPtx = cpx + (cpx - prevCmd.points[0]);
                            ctlPty = cpy + (cpy - prevCmd.points[1]);
                        }
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'Q';
                        points.push(ctlPtx, ctlPty, cpx, cpy);
                        break;
                    case 'A':
                        rx = p.shift();
                        ry = p.shift();
                        psi = p.shift();
                        fa = p.shift();
                        fs = p.shift();
                        x1 = cpx, y1 = cpy;
                        cpx = p.shift(), cpy = p.shift();
                        cmd = 'A';
                        points = this._convertPoint(x1, y1, cpx, cpy, fa, fs, rx, ry, psi);
                        break;
                    case 'a':
                        rx = p.shift();
                        ry = p.shift();
                        psi = p.shift();
                        fa = p.shift();
                        fs = p.shift();
                        x1 = cpx, y1 = cpy;
                        cpx += p.shift();
                        cpy += p.shift();
                        cmd = 'A';
                        points = this._convertPoint(x1, y1, cpx, cpy, fa, fs, rx, ry, psi);
                        break;
                    }
                    for (var j = 0, l = points.length; j < l; j += 2) {
                        points[j] += x;
                        points[j + 1] += y;
                    }
                    ca.push(new PathSegment(cmd || c, points));
                }
                if (c === 'z' || c === 'Z') {
                    ca.push(new PathSegment('z', []));
                }
            }
            return ca;
        },
        _convertPoint: function (x1, y1, x2, y2, fa, fs, rx, ry, psiDeg) {
            var psi = psiDeg * (Math.PI / 180);
            var xp = Math.cos(psi) * (x1 - x2) / 2 + Math.sin(psi) * (y1 - y2) / 2;
            var yp = -1 * Math.sin(psi) * (x1 - x2) / 2 + Math.cos(psi) * (y1 - y2) / 2;
            var lambda = xp * xp / (rx * rx) + yp * yp / (ry * ry);
            if (lambda > 1) {
                rx *= Math.sqrt(lambda);
                ry *= Math.sqrt(lambda);
            }
            var f = Math.sqrt((rx * rx * (ry * ry) - rx * rx * (yp * yp) - ry * ry * (xp * xp)) / (rx * rx * (yp * yp) + ry * ry * (xp * xp)));
            if (fa === fs) {
                f *= -1;
            }
            if (isNaN(f)) {
                f = 0;
            }
            var cxp = f * rx * yp / ry;
            var cyp = f * -ry * xp / rx;
            var cx = (x1 + x2) / 2 + Math.cos(psi) * cxp - Math.sin(psi) * cyp;
            var cy = (y1 + y2) / 2 + Math.sin(psi) * cxp + Math.cos(psi) * cyp;
            var theta = vAngle([
                1,
                0
            ], [
                (xp - cxp) / rx,
                (yp - cyp) / ry
            ]);
            var u = [
                (xp - cxp) / rx,
                (yp - cyp) / ry
            ];
            var v = [
                (-1 * xp - cxp) / rx,
                (-1 * yp - cyp) / ry
            ];
            var dTheta = vAngle(u, v);
            if (vRatio(u, v) <= -1) {
                dTheta = Math.PI;
            }
            if (vRatio(u, v) >= 1) {
                dTheta = 0;
            }
            if (fs === 0 && dTheta > 0) {
                dTheta = dTheta - 2 * Math.PI;
            }
            if (fs === 1 && dTheta < 0) {
                dTheta = dTheta + 2 * Math.PI;
            }
            return [
                cx,
                cy,
                rx,
                ry,
                theta,
                dTheta,
                psi,
                fs
            ];
        },
        buildPath: function (ctx, style) {
            var path = style.path;
            var x = style.x || 0;
            var y = style.y || 0;
            style.pathArray = style.pathArray || this.buildPathArray(path, x, y);
            var pathArray = style.pathArray;
            var pointList = style.pointList = [];
            var singlePointList = [];
            for (var i = 0, l = pathArray.length; i < l; i++) {
                if (pathArray[i].command.toUpperCase() == 'M') {
                    singlePointList.length > 0 && pointList.push(singlePointList);
                    singlePointList = [];
                }
                var p = pathArray[i].points;
                for (var j = 0, k = p.length; j < k; j += 2) {
                    singlePointList.push([
                        p[j],
                        p[j + 1]
                    ]);
                }
            }
            singlePointList.length > 0 && pointList.push(singlePointList);
            for (var i = 0, l = pathArray.length; i < l; i++) {
                var c = pathArray[i].command;
                var p = pathArray[i].points;
                switch (c) {
                case 'L':
                    ctx.lineTo(p[0], p[1]);
                    break;
                case 'M':
                    ctx.moveTo(p[0], p[1]);
                    break;
                case 'C':
                    ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
                    break;
                case 'Q':
                    ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
                    break;
                case 'A':
                    var cx = p[0];
                    var cy = p[1];
                    var rx = p[2];
                    var ry = p[3];
                    var theta = p[4];
                    var dTheta = p[5];
                    var psi = p[6];
                    var fs = p[7];
                    var r = rx > ry ? rx : ry;
                    var scaleX = rx > ry ? 1 : rx / ry;
                    var scaleY = rx > ry ? ry / rx : 1;
                    ctx.translate(cx, cy);
                    ctx.rotate(psi);
                    ctx.scale(scaleX, scaleY);
                    ctx.arc(0, 0, r, theta, theta + dTheta, 1 - fs);
                    ctx.scale(1 / scaleX, 1 / scaleY);
                    ctx.rotate(-psi);
                    ctx.translate(-cx, -cy);
                    break;
                case 'z':
                    ctx.closePath();
                    break;
                }
            }
            return;
        },
        getRect: function (style) {
            if (style.__rect) {
                return style.__rect;
            }
            var lineWidth;
            if (style.brushType == 'stroke' || style.brushType == 'fill') {
                lineWidth = style.lineWidth || 1;
            } else {
                lineWidth = 0;
            }
            var minX = Number.MAX_VALUE;
            var maxX = Number.MIN_VALUE;
            var minY = Number.MAX_VALUE;
            var maxY = Number.MIN_VALUE;
            var x = style.x || 0;
            var y = style.y || 0;
            var pathArray = style.pathArray || this.buildPathArray(style.path);
            for (var i = 0; i < pathArray.length; i++) {
                var p = pathArray[i].points;
                for (var j = 0; j < p.length; j++) {
                    if (j % 2 === 0) {
                        if (p[j] + x < minX) {
                            minX = p[j];
                        }
                        if (p[j] + x > maxX) {
                            maxX = p[j];
                        }
                    } else {
                        if (p[j] + y < minY) {
                            minY = p[j];
                        }
                        if (p[j] + y > maxY) {
                            maxY = p[j];
                        }
                    }
                }
            }
            var rect;
            if (minX === Number.MAX_VALUE || maxX === Number.MIN_VALUE || minY === Number.MAX_VALUE || maxY === Number.MIN_VALUE) {
                rect = {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                };
            } else {
                rect = {
                    x: Math.round(minX - lineWidth / 2),
                    y: Math.round(minY - lineWidth / 2),
                    width: maxX - minX + lineWidth,
                    height: maxY - minY + lineWidth
                };
            }
            style.__rect = rect;
            return rect;
        }
    };
    require('../tool/util').inherits(Path, Base);
    return Path;
});
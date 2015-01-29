define('echarts/chart/pie', [
    'require',
    './base',
    'zrender/shape/Text',
    'zrender/shape/Ring',
    'zrender/shape/Circle',
    'zrender/shape/Sector',
    'zrender/shape/Polyline',
    '../config',
    '../util/ecData',
    'zrender/tool/util',
    'zrender/tool/math',
    'zrender/tool/color',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var TextShape = require('zrender/shape/Text');
    var RingShape = require('zrender/shape/Ring');
    var CircleShape = require('zrender/shape/Circle');
    var SectorShape = require('zrender/shape/Sector');
    var PolylineShape = require('zrender/shape/Polyline');
    var ecConfig = require('../config');
    ecConfig.pie = {
        zlevel: 0,
        z: 2,
        clickable: true,
        legendHoverLink: true,
        center: [
            '50%',
            '50%'
        ],
        radius: [
            0,
            '75%'
        ],
        clockWise: true,
        startAngle: 90,
        minAngle: 0,
        selectedOffset: 10,
        itemStyle: {
            normal: {
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
                label: {
                    show: true,
                    position: 'outer'
                },
                labelLine: {
                    show: true,
                    length: 20,
                    lineStyle: {
                        width: 1,
                        type: 'solid'
                    }
                }
            },
            emphasis: {
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
                label: { show: false },
                labelLine: {
                    show: false,
                    length: 20,
                    lineStyle: {
                        width: 1,
                        type: 'solid'
                    }
                }
            }
        }
    };
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrMath = require('zrender/tool/math');
    var zrColor = require('zrender/tool/color');
    function Pie(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        var self = this;
        self.shapeHandler.onmouseover = function (param) {
            var shape = param.target;
            var seriesIndex = ecData.get(shape, 'seriesIndex');
            var dataIndex = ecData.get(shape, 'dataIndex');
            var percent = ecData.get(shape, 'special');
            var center = [
                shape.style.x,
                shape.style.y
            ];
            var startAngle = shape.style.startAngle;
            var endAngle = shape.style.endAngle;
            var midAngle = ((endAngle + startAngle) / 2 + 360) % 360;
            var defaultColor = shape.highlightStyle.color;
            var label = self.getLabel(seriesIndex, dataIndex, percent, center, midAngle, defaultColor, true);
            if (label) {
                self.zr.addHoverShape(label);
            }
            var labelLine = self.getLabelLine(seriesIndex, dataIndex, center, shape.style.r0, shape.style.r, midAngle, defaultColor, true);
            if (labelLine) {
                self.zr.addHoverShape(labelLine);
            }
        };
        this.refresh(option);
    }
    Pie.prototype = {
        type: ecConfig.CHART_TYPE_PIE,
        _buildShape: function () {
            var series = this.series;
            var legend = this.component.legend;
            this.selectedMap = {};
            this._selected = {};
            var center;
            var radius;
            var pieCase;
            this._selectedMode = false;
            var serieName;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_PIE) {
                    series[i] = this.reformOption(series[i]);
                    this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
                    serieName = series[i].name || '';
                    this.selectedMap[serieName] = legend ? legend.isSelected(serieName) : true;
                    if (!this.selectedMap[serieName]) {
                        continue;
                    }
                    center = this.parseCenter(this.zr, series[i].center);
                    radius = this.parseRadius(this.zr, series[i].radius);
                    this._selectedMode = this._selectedMode || series[i].selectedMode;
                    this._selected[i] = [];
                    if (this.deepQuery([
                            series[i],
                            this.option
                        ], 'calculable')) {
                        pieCase = {
                            zlevel: this.getZlevelBase(),
                            z: this.getZBase(),
                            hoverable: false,
                            style: {
                                x: center[0],
                                y: center[1],
                                r0: radius[0] <= 10 ? 0 : radius[0] - 10,
                                r: radius[1] + 10,
                                brushType: 'stroke',
                                lineWidth: 1,
                                strokeColor: series[i].calculableHolderColor || this.ecTheme.calculableHolderColor || ecConfig.calculableHolderColor
                            }
                        };
                        ecData.pack(pieCase, series[i], i, undefined, -1);
                        this.setCalculable(pieCase);
                        pieCase = radius[0] <= 10 ? new CircleShape(pieCase) : new RingShape(pieCase);
                        this.shapeList.push(pieCase);
                    }
                    this._buildSinglePie(i);
                    this.buildMark(i);
                }
            }
            this.addShapeList();
        },
        _buildSinglePie: function (seriesIndex) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data;
            var legend = this.component.legend;
            var itemName;
            var totalSelected = 0;
            var totalSelectedValue0 = 0;
            var totalValue = 0;
            var maxValue = Number.NEGATIVE_INFINITY;
            var singleShapeList = [];
            for (var i = 0, l = data.length; i < l; i++) {
                itemName = data[i].name;
                this.selectedMap[itemName] = legend ? legend.isSelected(itemName) : true;
                if (this.selectedMap[itemName] && !isNaN(data[i].value)) {
                    if (+data[i].value !== 0) {
                        totalSelected++;
                    } else {
                        totalSelectedValue0++;
                    }
                    totalValue += +data[i].value;
                    maxValue = Math.max(maxValue, +data[i].value);
                }
            }
            if (totalValue === 0) {
                return;
            }
            var percent = 100;
            var clockWise = serie.clockWise;
            var startAngle = (serie.startAngle.toFixed(2) - 0 + 360) % 360;
            var endAngle;
            var minAngle = serie.minAngle || 0.01;
            var totalAngle = 360 - minAngle * totalSelected - 0.01 * totalSelectedValue0;
            var defaultColor;
            var roseType = serie.roseType;
            var center;
            var radius;
            var r0;
            var r1;
            for (var i = 0, l = data.length; i < l; i++) {
                itemName = data[i].name;
                if (!this.selectedMap[itemName] || isNaN(data[i].value)) {
                    continue;
                }
                defaultColor = legend ? legend.getColor(itemName) : this.zr.getColor(i);
                percent = data[i].value / totalValue;
                if (roseType != 'area') {
                    endAngle = clockWise ? startAngle - percent * totalAngle - (percent !== 0 ? minAngle : 0.01) : percent * totalAngle + startAngle + (percent !== 0 ? minAngle : 0.01);
                } else {
                    endAngle = clockWise ? startAngle - 360 / l : 360 / l + startAngle;
                }
                endAngle = endAngle.toFixed(2) - 0;
                percent = (percent * 100).toFixed(2);
                center = this.parseCenter(this.zr, serie.center);
                radius = this.parseRadius(this.zr, serie.radius);
                r0 = +radius[0];
                r1 = +radius[1];
                if (roseType === 'radius') {
                    r1 = data[i].value / maxValue * (r1 - r0) * 0.8 + (r1 - r0) * 0.2 + r0;
                } else if (roseType === 'area') {
                    r1 = Math.sqrt(data[i].value / maxValue) * (r1 - r0) + r0;
                }
                if (clockWise) {
                    var temp;
                    temp = startAngle;
                    startAngle = endAngle;
                    endAngle = temp;
                }
                this._buildItem(singleShapeList, seriesIndex, i, percent, data[i].selected, center, r0, r1, startAngle, endAngle, defaultColor);
                if (!clockWise) {
                    startAngle = endAngle;
                }
            }
            this._autoLabelLayout(singleShapeList, center, r1);
            for (var i = 0, l = singleShapeList.length; i < l; i++) {
                this.shapeList.push(singleShapeList[i]);
            }
            singleShapeList = null;
        },
        _buildItem: function (singleShapeList, seriesIndex, dataIndex, percent, isSelected, center, r0, r1, startAngle, endAngle, defaultColor) {
            var series = this.series;
            var midAngle = ((endAngle + startAngle) / 2 + 360) % 360;
            var sector = this.getSector(seriesIndex, dataIndex, percent, isSelected, center, r0, r1, startAngle, endAngle, defaultColor);
            ecData.pack(sector, series[seriesIndex], seriesIndex, series[seriesIndex].data[dataIndex], dataIndex, series[seriesIndex].data[dataIndex].name, percent);
            singleShapeList.push(sector);
            var label = this.getLabel(seriesIndex, dataIndex, percent, center, midAngle, defaultColor, false);
            var labelLine = this.getLabelLine(seriesIndex, dataIndex, center, r0, r1, midAngle, defaultColor, false);
            if (labelLine) {
                ecData.pack(labelLine, series[seriesIndex], seriesIndex, series[seriesIndex].data[dataIndex], dataIndex, series[seriesIndex].data[dataIndex].name, percent);
                singleShapeList.push(labelLine);
            }
            if (label) {
                ecData.pack(label, series[seriesIndex], seriesIndex, series[seriesIndex].data[dataIndex], dataIndex, series[seriesIndex].data[dataIndex].name, percent);
                label._labelLine = labelLine;
                singleShapeList.push(label);
            }
        },
        getSector: function (seriesIndex, dataIndex, percent, isSelected, center, r0, r1, startAngle, endAngle, defaultColor) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var queryTarget = [
                data,
                serie
            ];
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
            var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis') || {};
            var normalColor = this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data) || defaultColor;
            var emphasisColor = this.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data) || (typeof normalColor === 'string' ? zrColor.lift(normalColor, -0.2) : normalColor);
            var sector = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                clickable: this.deepQuery(queryTarget, 'clickable'),
                style: {
                    x: center[0],
                    y: center[1],
                    r0: r0,
                    r: r1,
                    startAngle: startAngle,
                    endAngle: endAngle,
                    brushType: 'both',
                    color: normalColor,
                    lineWidth: normal.borderWidth,
                    strokeColor: normal.borderColor,
                    lineJoin: 'round'
                },
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor,
                    lineJoin: 'round'
                },
                _seriesIndex: seriesIndex,
                _dataIndex: dataIndex
            };
            if (isSelected) {
                var midAngle = ((sector.style.startAngle + sector.style.endAngle) / 2).toFixed(2) - 0;
                sector.style._hasSelected = true;
                sector.style._x = sector.style.x;
                sector.style._y = sector.style.y;
                var offset = this.query(serie, 'selectedOffset');
                sector.style.x += zrMath.cos(midAngle, true) * offset;
                sector.style.y -= zrMath.sin(midAngle, true) * offset;
                this._selected[seriesIndex][dataIndex] = true;
            } else {
                this._selected[seriesIndex][dataIndex] = false;
            }
            if (this._selectedMode) {
                sector.onclick = this.shapeHandler.onclick;
            }
            if (this.deepQuery([
                    data,
                    serie,
                    this.option
                ], 'calculable')) {
                this.setCalculable(sector);
                sector.draggable = true;
            }
            if (this._needLabel(serie, data, true) || this._needLabelLine(serie, data, true)) {
                sector.onmouseover = this.shapeHandler.onmouseover;
            }
            sector = new SectorShape(sector);
            return sector;
        },
        getLabel: function (seriesIndex, dataIndex, percent, center, midAngle, defaultColor, isEmphasis) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            if (!this._needLabel(serie, data, isEmphasis)) {
                return;
            }
            var status = isEmphasis ? 'emphasis' : 'normal';
            var itemStyle = zrUtil.merge(zrUtil.clone(data.itemStyle) || {}, serie.itemStyle);
            var labelControl = itemStyle[status].label;
            var textStyle = labelControl.textStyle || {};
            var centerX = center[0];
            var centerY = center[1];
            var x;
            var y;
            var radius = this.parseRadius(this.zr, serie.radius);
            var textAlign;
            var textBaseline = 'middle';
            labelControl.position = labelControl.position || itemStyle.normal.label.position;
            if (labelControl.position === 'center') {
                x = centerX;
                y = centerY;
                textAlign = 'center';
            } else if (labelControl.position === 'inner' || labelControl.position === 'inside') {
                radius = (radius[0] + radius[1]) * (labelControl.distance || 0.5);
                x = Math.round(centerX + radius * zrMath.cos(midAngle, true));
                y = Math.round(centerY - radius * zrMath.sin(midAngle, true));
                defaultColor = '#fff';
                textAlign = 'center';
            } else {
                radius = radius[1] - -itemStyle[status].labelLine.length;
                x = Math.round(centerX + radius * zrMath.cos(midAngle, true));
                y = Math.round(centerY - radius * zrMath.sin(midAngle, true));
                textAlign = midAngle >= 90 && midAngle <= 270 ? 'right' : 'left';
            }
            if (labelControl.position != 'center' && labelControl.position != 'inner' && labelControl.position != 'inside') {
                x += textAlign === 'left' ? 20 : -20;
            }
            data.__labelX = x - (textAlign === 'left' ? 5 : -5);
            data.__labelY = y;
            var ts = new TextShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                hoverable: false,
                style: {
                    x: x,
                    y: y,
                    color: textStyle.color || defaultColor,
                    text: this.getLabelText(seriesIndex, dataIndex, percent, status),
                    textAlign: textStyle.align || textAlign,
                    textBaseline: textStyle.baseline || textBaseline,
                    textFont: this.getFont(textStyle)
                },
                highlightStyle: { brushType: 'fill' }
            });
            ts._radius = radius;
            ts._labelPosition = labelControl.position || 'outer';
            ts._rect = ts.getRect(ts.style);
            ts._seriesIndex = seriesIndex;
            ts._dataIndex = dataIndex;
            return ts;
        },
        getLabelText: function (seriesIndex, dataIndex, percent, status) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var formatter = this.deepQuery([
                data,
                serie
            ], 'itemStyle.' + status + '.label.formatter');
            if (formatter) {
                if (typeof formatter === 'function') {
                    return formatter.call(this.myChart, serie.name, data.name, data.value, percent);
                } else if (typeof formatter === 'string') {
                    formatter = formatter.replace('{a}', '{a0}').replace('{b}', '{b0}').replace('{c}', '{c0}').replace('{d}', '{d0}');
                    formatter = formatter.replace('{a0}', serie.name).replace('{b0}', data.name).replace('{c0}', data.value).replace('{d0}', percent);
                    return formatter;
                }
            } else {
                return data.name;
            }
        },
        getLabelLine: function (seriesIndex, dataIndex, center, r0, r1, midAngle, defaultColor, isEmphasis) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            if (this._needLabelLine(serie, data, isEmphasis)) {
                var status = isEmphasis ? 'emphasis' : 'normal';
                var itemStyle = zrUtil.merge(zrUtil.clone(data.itemStyle) || {}, serie.itemStyle);
                var labelLineControl = itemStyle[status].labelLine;
                var lineStyle = labelLineControl.lineStyle || {};
                var centerX = center[0];
                var centerY = center[1];
                var minRadius = r1;
                var maxRadius = this.parseRadius(this.zr, serie.radius)[1] - -labelLineControl.length;
                var cosValue = zrMath.cos(midAngle, true);
                var sinValue = zrMath.sin(midAngle, true);
                return new PolylineShape({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase() + 1,
                    hoverable: false,
                    style: {
                        pointList: [
                            [
                                centerX + minRadius * cosValue,
                                centerY - minRadius * sinValue
                            ],
                            [
                                centerX + maxRadius * cosValue,
                                centerY - maxRadius * sinValue
                            ],
                            [
                                data.__labelX,
                                data.__labelY
                            ]
                        ],
                        strokeColor: lineStyle.color || defaultColor,
                        lineType: lineStyle.type,
                        lineWidth: lineStyle.width
                    },
                    _seriesIndex: seriesIndex,
                    _dataIndex: dataIndex
                });
            } else {
                return;
            }
        },
        _needLabel: function (serie, data, isEmphasis) {
            return this.deepQuery([
                data,
                serie
            ], 'itemStyle.' + (isEmphasis ? 'emphasis' : 'normal') + '.label.show');
        },
        _needLabelLine: function (serie, data, isEmphasis) {
            return this.deepQuery([
                data,
                serie
            ], 'itemStyle.' + (isEmphasis ? 'emphasis' : 'normal') + '.labelLine.show');
        },
        _autoLabelLayout: function (sList, center, r) {
            var leftList = [];
            var rightList = [];
            for (var i = 0, l = sList.length; i < l; i++) {
                if (sList[i]._labelPosition === 'outer' || sList[i]._labelPosition === 'outside') {
                    sList[i]._rect._y = sList[i]._rect.y;
                    if (sList[i]._rect.x < center[0]) {
                        leftList.push(sList[i]);
                    } else {
                        rightList.push(sList[i]);
                    }
                }
            }
            this._layoutCalculate(leftList, center, r, -1);
            this._layoutCalculate(rightList, center, r, 1);
        },
        _layoutCalculate: function (tList, center, r, direction) {
            tList.sort(function (a, b) {
                return a._rect.y - b._rect.y;
            });
            function _changeDown(start, end, delta, direction) {
                for (var j = start; j < end; j++) {
                    tList[j]._rect.y += delta;
                    tList[j].style.y += delta;
                    if (tList[j]._labelLine) {
                        tList[j]._labelLine.style.pointList[1][1] += delta;
                        tList[j]._labelLine.style.pointList[2][1] += delta;
                    }
                    if (j > start && j + 1 < end && tList[j + 1]._rect.y > tList[j]._rect.y + tList[j]._rect.height) {
                        _changeUp(j, delta / 2);
                        return;
                    }
                }
                _changeUp(end - 1, delta / 2);
            }
            function _changeUp(end, delta) {
                for (var j = end; j >= 0; j--) {
                    tList[j]._rect.y -= delta;
                    tList[j].style.y -= delta;
                    if (tList[j]._labelLine) {
                        tList[j]._labelLine.style.pointList[1][1] -= delta;
                        tList[j]._labelLine.style.pointList[2][1] -= delta;
                    }
                    if (j > 0 && tList[j]._rect.y > tList[j - 1]._rect.y + tList[j - 1]._rect.height) {
                        break;
                    }
                }
            }
            function _changeX(sList, isDownList, center, r, direction) {
                var x = center[0];
                var y = center[1];
                var deltaX;
                var deltaY;
                var length;
                var lastDeltaX = direction > 0 ? isDownList ? Number.MAX_VALUE : 0 : isDownList ? Number.MAX_VALUE : 0;
                for (var i = 0, l = sList.length; i < l; i++) {
                    deltaY = Math.abs(sList[i]._rect.y - y);
                    length = sList[i]._radius - r;
                    deltaX = deltaY < r + length ? Math.sqrt((r + length + 20) * (r + length + 20) - Math.pow(sList[i]._rect.y - y, 2)) : Math.abs(sList[i]._rect.x + (direction > 0 ? 0 : sList[i]._rect.width) - x);
                    if (isDownList && deltaX >= lastDeltaX) {
                        deltaX = lastDeltaX - 10;
                    }
                    if (!isDownList && deltaX <= lastDeltaX) {
                        deltaX = lastDeltaX + 10;
                    }
                    sList[i]._rect.x = sList[i].style.x = x + deltaX * direction;
                    if (sList[i]._labelLine) {
                        sList[i]._labelLine.style.pointList[2][0] = x + (deltaX - 5) * direction;
                        sList[i]._labelLine.style.pointList[1][0] = x + (deltaX - 20) * direction;
                    }
                    lastDeltaX = deltaX;
                }
            }
            var lastY = 0;
            var delta;
            var len = tList.length;
            var upList = [];
            var downList = [];
            for (var i = 0; i < len; i++) {
                delta = tList[i]._rect.y - lastY;
                if (delta < 0) {
                    _changeDown(i, len, -delta, direction);
                }
                lastY = tList[i]._rect.y + tList[i]._rect.height;
            }
            if (this.zr.getHeight() - lastY < 0) {
                _changeUp(len - 1, lastY - this.zr.getHeight());
            }
            for (var i = 0; i < len; i++) {
                if (tList[i]._rect.y >= center[1]) {
                    downList.push(tList[i]);
                } else {
                    upList.push(tList[i]);
                }
            }
            _changeX(downList, true, center, r, direction);
            _changeX(upList, false, center, r, direction);
        },
        reformOption: function (opt) {
            var _merge = zrUtil.merge;
            opt = _merge(_merge(opt || {}, zrUtil.clone(this.ecTheme.pie || {})), zrUtil.clone(ecConfig.pie));
            opt.itemStyle.normal.label.textStyle = this.getTextStyle(opt.itemStyle.normal.label.textStyle);
            opt.itemStyle.emphasis.label.textStyle = this.getTextStyle(opt.itemStyle.emphasis.label.textStyle);
            return opt;
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            this.backupShapeList();
            this._buildShape();
        },
        addDataAnimation: function (params) {
            var series = this.series;
            var aniMap = {};
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var sectorMap = {};
            var textMap = {};
            var lineMap = {};
            var backupShapeList = this.shapeList;
            this.shapeList = [];
            var seriesIndex;
            var isHead;
            var dataGrow;
            var deltaIdxMap = {};
            for (var i = 0, l = params.length; i < l; i++) {
                seriesIndex = params[i][0];
                isHead = params[i][2];
                dataGrow = params[i][3];
                if (series[seriesIndex] && series[seriesIndex].type === ecConfig.CHART_TYPE_PIE) {
                    if (isHead) {
                        if (!dataGrow) {
                            sectorMap[seriesIndex + '_' + series[seriesIndex].data.length] = 'delete';
                        }
                        deltaIdxMap[seriesIndex] = 1;
                    } else {
                        if (!dataGrow) {
                            sectorMap[seriesIndex + '_-1'] = 'delete';
                            deltaIdxMap[seriesIndex] = -1;
                        } else {
                            deltaIdxMap[seriesIndex] = 0;
                        }
                    }
                    this._buildSinglePie(seriesIndex);
                }
            }
            var dataIndex;
            var key;
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                seriesIndex = this.shapeList[i]._seriesIndex;
                dataIndex = this.shapeList[i]._dataIndex;
                key = seriesIndex + '_' + dataIndex;
                switch (this.shapeList[i].type) {
                case 'sector':
                    sectorMap[key] = this.shapeList[i];
                    break;
                case 'text':
                    textMap[key] = this.shapeList[i];
                    break;
                case 'polyline':
                    lineMap[key] = this.shapeList[i];
                    break;
                }
            }
            this.shapeList = [];
            var targeSector;
            for (var i = 0, l = backupShapeList.length; i < l; i++) {
                seriesIndex = backupShapeList[i]._seriesIndex;
                if (aniMap[seriesIndex]) {
                    dataIndex = backupShapeList[i]._dataIndex + deltaIdxMap[seriesIndex];
                    key = seriesIndex + '_' + dataIndex;
                    targeSector = sectorMap[key];
                    if (!targeSector) {
                        continue;
                    }
                    if (backupShapeList[i].type === 'sector') {
                        if (targeSector != 'delete') {
                            this.zr.animate(backupShapeList[i].id, 'style').when(400, {
                                startAngle: targeSector.style.startAngle,
                                endAngle: targeSector.style.endAngle
                            }).start();
                        } else {
                            this.zr.animate(backupShapeList[i].id, 'style').when(400, deltaIdxMap[seriesIndex] < 0 ? { startAngle: backupShapeList[i].style.startAngle } : { endAngle: backupShapeList[i].style.endAngle }).start();
                        }
                    } else if (backupShapeList[i].type === 'text' || backupShapeList[i].type === 'polyline') {
                        if (targeSector === 'delete') {
                            this.zr.delShape(backupShapeList[i].id);
                        } else {
                            switch (backupShapeList[i].type) {
                            case 'text':
                                targeSector = textMap[key];
                                this.zr.animate(backupShapeList[i].id, 'style').when(400, {
                                    x: targeSector.style.x,
                                    y: targeSector.style.y
                                }).start();
                                break;
                            case 'polyline':
                                targeSector = lineMap[key];
                                this.zr.animate(backupShapeList[i].id, 'style').when(400, { pointList: targeSector.style.pointList }).start();
                                break;
                            }
                        }
                    }
                }
            }
            this.shapeList = backupShapeList;
        },
        onclick: function (param) {
            var series = this.series;
            if (!this.isClick || !param.target) {
                return;
            }
            this.isClick = false;
            var offset;
            var target = param.target;
            var style = target.style;
            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');
            for (var i = 0, len = this.shapeList.length; i < len; i++) {
                if (this.shapeList[i].id === target.id) {
                    seriesIndex = ecData.get(target, 'seriesIndex');
                    dataIndex = ecData.get(target, 'dataIndex');
                    if (!style._hasSelected) {
                        var midAngle = ((style.startAngle + style.endAngle) / 2).toFixed(2) - 0;
                        target.style._hasSelected = true;
                        this._selected[seriesIndex][dataIndex] = true;
                        target.style._x = target.style.x;
                        target.style._y = target.style.y;
                        offset = this.query(series[seriesIndex], 'selectedOffset');
                        target.style.x += zrMath.cos(midAngle, true) * offset;
                        target.style.y -= zrMath.sin(midAngle, true) * offset;
                    } else {
                        target.style.x = target.style._x;
                        target.style.y = target.style._y;
                        target.style._hasSelected = false;
                        this._selected[seriesIndex][dataIndex] = false;
                    }
                    this.zr.modShape(target.id, target);
                } else if (this.shapeList[i].style._hasSelected && this._selectedMode === 'single') {
                    seriesIndex = ecData.get(this.shapeList[i], 'seriesIndex');
                    dataIndex = ecData.get(this.shapeList[i], 'dataIndex');
                    this.shapeList[i].style.x = this.shapeList[i].style._x;
                    this.shapeList[i].style.y = this.shapeList[i].style._y;
                    this.shapeList[i].style._hasSelected = false;
                    this._selected[seriesIndex][dataIndex] = false;
                    this.zr.modShape(this.shapeList[i].id, this.shapeList[i]);
                }
            }
            this.messageCenter.dispatch(ecConfig.EVENT.PIE_SELECTED, param.event, {
                selected: this._selected,
                target: ecData.get(target, 'name')
            }, this.myChart);
            this.zr.refreshNextFrame();
        }
    };
    zrUtil.inherits(Pie, ChartBase);
    require('../chart').define('pie', Pie);
    return Pie;
});
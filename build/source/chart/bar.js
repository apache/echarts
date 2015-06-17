define('echarts/chart/bar', [
    'require',
    './base',
    'zrender/shape/Rectangle',
    '../component/axis',
    '../component/grid',
    '../component/dataZoom',
    '../config',
    '../util/ecData',
    'zrender/tool/util',
    'zrender/tool/color',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var RectangleShape = require('zrender/shape/Rectangle');
    require('../component/axis');
    require('../component/grid');
    require('../component/dataZoom');
    var ecConfig = require('../config');
    ecConfig.bar = {
        zlevel: 0,
        z: 2,
        clickable: true,
        legendHoverLink: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        barMinHeight: 0,
        barGap: '30%',
        barCategoryGap: '20%',
        itemStyle: {
            normal: {
                barBorderColor: '#fff',
                barBorderRadius: 0,
                barBorderWidth: 0,
                label: { show: false }
            },
            emphasis: {
                barBorderColor: '#fff',
                barBorderRadius: 0,
                barBorderWidth: 0,
                label: { show: false }
            }
        }
    };
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    function Bar(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Bar.prototype = {
        type: ecConfig.CHART_TYPE_BAR,
        _buildShape: function () {
            this._buildPosition();
        },
        _buildNormal: function (seriesArray, maxDataLength, locationMap, xMarkMap, orient) {
            var series = this.series;
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var isHorizontal = orient == 'horizontal';
            var xAxis = this.component.xAxis;
            var yAxis = this.component.yAxis;
            var categoryAxis = isHorizontal ? xAxis.getAxis(serie.xAxisIndex) : yAxis.getAxis(serie.yAxisIndex);
            var valueAxis;
            var size = this._mapSize(categoryAxis, locationMap);
            var gap = size.gap;
            var barGap = size.barGap;
            var barWidthMap = size.barWidthMap;
            var barMaxWidthMap = size.barMaxWidthMap;
            var barWidth = size.barWidth;
            var barMinHeightMap = size.barMinHeightMap;
            var barHeight;
            var curBarWidth;
            var interval = size.interval;
            var x;
            var y;
            var lastP;
            var baseP;
            var lastN;
            var baseN;
            var barShape;
            var data;
            var value;
            var islandR = this.deepQuery([
                this.ecTheme,
                ecConfig
            ], 'island.r');
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (categoryAxis.getNameByIndex(i) == null) {
                    break;
                }
                isHorizontal ? x = categoryAxis.getCoordByIndex(i) - gap / 2 : y = categoryAxis.getCoordByIndex(i) + gap / 2;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    var yAxisIndex = series[locationMap[j][0]].yAxisIndex || 0;
                    var xAxisIndex = series[locationMap[j][0]].xAxisIndex || 0;
                    valueAxis = isHorizontal ? yAxis.getAxis(yAxisIndex) : xAxis.getAxis(xAxisIndex);
                    baseP = lastP = baseN = lastN = valueAxis.getCoord(0);
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = this.getDataFromOption(data, '-');
                        xMarkMap[seriesIndex] = xMarkMap[seriesIndex] || {
                            min: Number.POSITIVE_INFINITY,
                            max: Number.NEGATIVE_INFINITY,
                            sum: 0,
                            counter: 0,
                            average: 0
                        };
                        curBarWidth = Math.min(barMaxWidthMap[seriesIndex] || Number.MAX_VALUE, barWidthMap[seriesIndex] || barWidth);
                        if (value === '-') {
                            continue;
                        }
                        if (value > 0) {
                            barHeight = m > 0 ? valueAxis.getCoordSize(value) : isHorizontal ? baseP - valueAxis.getCoord(value) : valueAxis.getCoord(value) - baseP;
                            if (n === 1 && barMinHeightMap[seriesIndex] > barHeight) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            if (isHorizontal) {
                                lastP -= barHeight;
                                y = lastP;
                            } else {
                                x = lastP;
                                lastP += barHeight;
                            }
                        } else if (value < 0) {
                            barHeight = m > 0 ? valueAxis.getCoordSize(value) : isHorizontal ? valueAxis.getCoord(value) - baseN : baseN - valueAxis.getCoord(value);
                            if (n === 1 && barMinHeightMap[seriesIndex] > barHeight) {
                                barHeight = barMinHeightMap[seriesIndex];
                            }
                            if (isHorizontal) {
                                y = lastN;
                                lastN += barHeight;
                            } else {
                                lastN -= barHeight;
                                x = lastN;
                            }
                        } else {
                            barHeight = 0;
                            if (isHorizontal) {
                                lastP -= barHeight;
                                y = lastP;
                            } else {
                                x = lastP;
                                lastP += barHeight;
                            }
                        }
                        xMarkMap[seriesIndex][i] = isHorizontal ? x + curBarWidth / 2 : y - curBarWidth / 2;
                        if (xMarkMap[seriesIndex].min > value) {
                            xMarkMap[seriesIndex].min = value;
                            if (isHorizontal) {
                                xMarkMap[seriesIndex].minY = y;
                                xMarkMap[seriesIndex].minX = xMarkMap[seriesIndex][i];
                            } else {
                                xMarkMap[seriesIndex].minX = x + barHeight;
                                xMarkMap[seriesIndex].minY = xMarkMap[seriesIndex][i];
                            }
                        }
                        if (xMarkMap[seriesIndex].max < value) {
                            xMarkMap[seriesIndex].max = value;
                            if (isHorizontal) {
                                xMarkMap[seriesIndex].maxY = y;
                                xMarkMap[seriesIndex].maxX = xMarkMap[seriesIndex][i];
                            } else {
                                xMarkMap[seriesIndex].maxX = x + barHeight;
                                xMarkMap[seriesIndex].maxY = xMarkMap[seriesIndex][i];
                            }
                        }
                        xMarkMap[seriesIndex].sum += value;
                        xMarkMap[seriesIndex].counter++;
                        if (i % interval === 0) {
                            barShape = this._getBarItem(seriesIndex, i, categoryAxis.getNameByIndex(i), x, y - (isHorizontal ? 0 : curBarWidth), isHorizontal ? curBarWidth : barHeight, isHorizontal ? barHeight : curBarWidth, isHorizontal ? 'vertical' : 'horizontal');
                            this.shapeList.push(new RectangleShape(barShape));
                        }
                    }
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = this.getDataFromOption(data, '-');
                        curBarWidth = Math.min(barMaxWidthMap[seriesIndex] || Number.MAX_VALUE, barWidthMap[seriesIndex] || barWidth);
                        if (value != '-') {
                            continue;
                        }
                        if (this.deepQuery([
                                data,
                                serie,
                                this.option
                            ], 'calculable')) {
                            if (isHorizontal) {
                                lastP -= islandR;
                                y = lastP;
                            } else {
                                x = lastP;
                                lastP += islandR;
                            }
                            barShape = this._getBarItem(seriesIndex, i, categoryAxis.getNameByIndex(i), x, y - (isHorizontal ? 0 : curBarWidth), isHorizontal ? curBarWidth : islandR, isHorizontal ? islandR : curBarWidth, isHorizontal ? 'vertical' : 'horizontal');
                            barShape.hoverable = false;
                            barShape.draggable = false;
                            barShape.style.lineWidth = 1;
                            barShape.style.brushType = 'stroke';
                            barShape.style.strokeColor = serie.calculableHolderColor || this.ecTheme.calculableHolderColor || ecConfig.calculableHolderColor;
                            this.shapeList.push(new RectangleShape(barShape));
                        }
                    }
                    isHorizontal ? x += curBarWidth + barGap : y -= curBarWidth + barGap;
                }
            }
            this._calculMarkMapXY(xMarkMap, locationMap, isHorizontal ? 'y' : 'x');
        },
        _buildHorizontal: function (seriesArray, maxDataLength, locationMap, xMarkMap) {
            return this._buildNormal(seriesArray, maxDataLength, locationMap, xMarkMap, 'horizontal');
        },
        _buildVertical: function (seriesArray, maxDataLength, locationMap, xMarkMap) {
            return this._buildNormal(seriesArray, maxDataLength, locationMap, xMarkMap, 'vertical');
        },
        _buildOther: function (seriesArray, maxDataLength, locationMap, xMarkMap) {
            var series = this.series;
            for (var j = 0, k = locationMap.length; j < k; j++) {
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    var seriesIndex = locationMap[j][m];
                    var serie = series[seriesIndex];
                    var xAxisIndex = serie.xAxisIndex || 0;
                    var xAxis = this.component.xAxis.getAxis(xAxisIndex);
                    var baseX = xAxis.getCoord(0);
                    var yAxisIndex = serie.yAxisIndex || 0;
                    var yAxis = this.component.yAxis.getAxis(yAxisIndex);
                    var baseY = yAxis.getCoord(0);
                    xMarkMap[seriesIndex] = xMarkMap[seriesIndex] || {
                        min0: Number.POSITIVE_INFINITY,
                        min1: Number.POSITIVE_INFINITY,
                        max0: Number.NEGATIVE_INFINITY,
                        max1: Number.NEGATIVE_INFINITY,
                        sum0: 0,
                        sum1: 0,
                        counter0: 0,
                        counter1: 0,
                        average0: 0,
                        average1: 0
                    };
                    for (var i = 0, l = serie.data.length; i < l; i++) {
                        var data = serie.data[i];
                        var value = this.getDataFromOption(data, '-');
                        if (!(value instanceof Array)) {
                            continue;
                        }
                        var x = xAxis.getCoord(value[0]);
                        var y = yAxis.getCoord(value[1]);
                        var queryTarget = [
                            data,
                            serie
                        ];
                        var barWidth = this.deepQuery(queryTarget, 'barWidth') || 10;
                        var barHeight = this.deepQuery(queryTarget, 'barHeight');
                        var orient;
                        var barShape;
                        if (barHeight != null) {
                            orient = 'horizontal';
                            if (value[0] > 0) {
                                barWidth = x - baseX;
                                x -= barWidth;
                            } else if (value[0] < 0) {
                                barWidth = baseX - x;
                            } else {
                                barWidth = 0;
                            }
                            barShape = this._getBarItem(seriesIndex, i, value[0], x, y - barHeight / 2, barWidth, barHeight, orient);
                        } else {
                            orient = 'vertical';
                            if (value[1] > 0) {
                                barHeight = baseY - y;
                            } else if (value[1] < 0) {
                                barHeight = y - baseY;
                                y -= barHeight;
                            } else {
                                barHeight = 0;
                            }
                            barShape = this._getBarItem(seriesIndex, i, value[0], x - barWidth / 2, y, barWidth, barHeight, orient);
                        }
                        this.shapeList.push(new RectangleShape(barShape));
                        x = xAxis.getCoord(value[0]);
                        y = yAxis.getCoord(value[1]);
                        if (xMarkMap[seriesIndex].min0 > value[0]) {
                            xMarkMap[seriesIndex].min0 = value[0];
                            xMarkMap[seriesIndex].minY0 = y;
                            xMarkMap[seriesIndex].minX0 = x;
                        }
                        if (xMarkMap[seriesIndex].max0 < value[0]) {
                            xMarkMap[seriesIndex].max0 = value[0];
                            xMarkMap[seriesIndex].maxY0 = y;
                            xMarkMap[seriesIndex].maxX0 = x;
                        }
                        xMarkMap[seriesIndex].sum0 += value[0];
                        xMarkMap[seriesIndex].counter0++;
                        if (xMarkMap[seriesIndex].min1 > value[1]) {
                            xMarkMap[seriesIndex].min1 = value[1];
                            xMarkMap[seriesIndex].minY1 = y;
                            xMarkMap[seriesIndex].minX1 = x;
                        }
                        if (xMarkMap[seriesIndex].max1 < value[1]) {
                            xMarkMap[seriesIndex].max1 = value[1];
                            xMarkMap[seriesIndex].maxY1 = y;
                            xMarkMap[seriesIndex].maxX1 = x;
                        }
                        xMarkMap[seriesIndex].sum1 += value[1];
                        xMarkMap[seriesIndex].counter1++;
                    }
                }
            }
            this._calculMarkMapXY(xMarkMap, locationMap, 'xy');
        },
        _mapSize: function (categoryAxis, locationMap, ignoreUserDefined) {
            var res = this._findSpecialBarSzie(locationMap, ignoreUserDefined);
            var barWidthMap = res.barWidthMap;
            var barMaxWidthMap = res.barMaxWidthMap;
            var barMinHeightMap = res.barMinHeightMap;
            var sBarWidthCounter = res.sBarWidthCounter;
            var sBarWidthTotal = res.sBarWidthTotal;
            var barGap = res.barGap;
            var barCategoryGap = res.barCategoryGap;
            var gap;
            var barWidth;
            var interval = 1;
            if (locationMap.length != sBarWidthCounter) {
                if (!ignoreUserDefined) {
                    gap = typeof barCategoryGap === 'string' && barCategoryGap.match(/%$/) ? (categoryAxis.getGap() * (100 - parseFloat(barCategoryGap)) / 100).toFixed(2) - 0 : categoryAxis.getGap() - barCategoryGap;
                    if (typeof barGap === 'string' && barGap.match(/%$/)) {
                        barGap = parseFloat(barGap) / 100;
                        barWidth = +((gap - sBarWidthTotal) / ((locationMap.length - 1) * barGap + locationMap.length - sBarWidthCounter)).toFixed(2);
                        barGap = barWidth * barGap;
                    } else {
                        barGap = parseFloat(barGap);
                        barWidth = +((gap - sBarWidthTotal - barGap * (locationMap.length - 1)) / (locationMap.length - sBarWidthCounter)).toFixed(2);
                    }
                    if (barWidth <= 0) {
                        return this._mapSize(categoryAxis, locationMap, true);
                    }
                } else {
                    gap = categoryAxis.getGap();
                    barGap = 0;
                    barWidth = +(gap / locationMap.length).toFixed(2);
                    if (barWidth <= 0) {
                        interval = Math.floor(locationMap.length / gap);
                        barWidth = 1;
                    }
                }
            } else {
                gap = sBarWidthCounter > 1 ? typeof barCategoryGap === 'string' && barCategoryGap.match(/%$/) ? +(categoryAxis.getGap() * (100 - parseFloat(barCategoryGap)) / 100).toFixed(2) : categoryAxis.getGap() - barCategoryGap : sBarWidthTotal;
                barWidth = 0;
                barGap = sBarWidthCounter > 1 ? +((gap - sBarWidthTotal) / (sBarWidthCounter - 1)).toFixed(2) : 0;
                if (barGap < 0) {
                    return this._mapSize(categoryAxis, locationMap, true);
                }
            }
            return this._recheckBarMaxWidth(locationMap, barWidthMap, barMaxWidthMap, barMinHeightMap, gap, barWidth, barGap, interval);
        },
        _findSpecialBarSzie: function (locationMap, ignoreUserDefined) {
            var series = this.series;
            var barWidthMap = {};
            var barMaxWidthMap = {};
            var barMinHeightMap = {};
            var sBarWidth;
            var sBarMaxWidth;
            var sBarWidthCounter = 0;
            var sBarWidthTotal = 0;
            var barGap;
            var barCategoryGap;
            for (var j = 0, k = locationMap.length; j < k; j++) {
                var hasFound = {
                    barWidth: false,
                    barMaxWidth: false
                };
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    var seriesIndex = locationMap[j][m];
                    var queryTarget = series[seriesIndex];
                    if (!ignoreUserDefined) {
                        if (!hasFound.barWidth) {
                            sBarWidth = this.query(queryTarget, 'barWidth');
                            if (sBarWidth != null) {
                                barWidthMap[seriesIndex] = sBarWidth;
                                sBarWidthTotal += sBarWidth;
                                sBarWidthCounter++;
                                hasFound.barWidth = true;
                                for (var ii = 0, ll = m; ii < ll; ii++) {
                                    var pSeriesIndex = locationMap[j][ii];
                                    barWidthMap[pSeriesIndex] = sBarWidth;
                                }
                            }
                        } else {
                            barWidthMap[seriesIndex] = sBarWidth;
                        }
                        if (!hasFound.barMaxWidth) {
                            sBarMaxWidth = this.query(queryTarget, 'barMaxWidth');
                            if (sBarMaxWidth != null) {
                                barMaxWidthMap[seriesIndex] = sBarMaxWidth;
                                hasFound.barMaxWidth = true;
                                for (var ii = 0, ll = m; ii < ll; ii++) {
                                    var pSeriesIndex = locationMap[j][ii];
                                    barMaxWidthMap[pSeriesIndex] = sBarMaxWidth;
                                }
                            }
                        } else {
                            barMaxWidthMap[seriesIndex] = sBarMaxWidth;
                        }
                    }
                    barMinHeightMap[seriesIndex] = this.query(queryTarget, 'barMinHeight');
                    barGap = barGap != null ? barGap : this.query(queryTarget, 'barGap');
                    barCategoryGap = barCategoryGap != null ? barCategoryGap : this.query(queryTarget, 'barCategoryGap');
                }
            }
            return {
                barWidthMap: barWidthMap,
                barMaxWidthMap: barMaxWidthMap,
                barMinHeightMap: barMinHeightMap,
                sBarWidth: sBarWidth,
                sBarMaxWidth: sBarMaxWidth,
                sBarWidthCounter: sBarWidthCounter,
                sBarWidthTotal: sBarWidthTotal,
                barGap: barGap,
                barCategoryGap: barCategoryGap
            };
        },
        _recheckBarMaxWidth: function (locationMap, barWidthMap, barMaxWidthMap, barMinHeightMap, gap, barWidth, barGap, interval) {
            for (var j = 0, k = locationMap.length; j < k; j++) {
                var seriesIndex = locationMap[j][0];
                if (barMaxWidthMap[seriesIndex] && barMaxWidthMap[seriesIndex] < barWidth) {
                    gap -= barWidth - barMaxWidthMap[seriesIndex];
                }
            }
            return {
                barWidthMap: barWidthMap,
                barMaxWidthMap: barMaxWidthMap,
                barMinHeightMap: barMinHeightMap,
                gap: gap,
                barWidth: barWidth,
                barGap: barGap,
                interval: interval
            };
        },
        _getBarItem: function (seriesIndex, dataIndex, name, x, y, width, height, orient) {
            var series = this.series;
            var barShape;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var defaultColor = this._sIndex2ColorMap[seriesIndex];
            var queryTarget = [
                data,
                serie
            ];
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal');
            var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis');
            var normalBorderWidth = normal.barBorderWidth;
            barShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                clickable: this.deepQuery(queryTarget, 'clickable'),
                style: {
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    brushType: 'both',
                    color: this.getItemStyleColor(this.deepQuery(queryTarget, 'itemStyle.normal.color') || defaultColor, seriesIndex, dataIndex, data),
                    radius: normal.barBorderRadius,
                    lineWidth: normalBorderWidth,
                    strokeColor: normal.barBorderColor
                },
                highlightStyle: {
                    color: this.getItemStyleColor(this.deepQuery(queryTarget, 'itemStyle.emphasis.color'), seriesIndex, dataIndex, data),
                    radius: emphasis.barBorderRadius,
                    lineWidth: emphasis.barBorderWidth,
                    strokeColor: emphasis.barBorderColor
                },
                _orient: orient
            };
            var barShapeStyle = barShape.style;
            barShape.highlightStyle.color = barShape.highlightStyle.color || (typeof barShapeStyle.color === 'string' ? zrColor.lift(barShapeStyle.color, -0.3) : barShapeStyle.color);
            barShapeStyle.x = Math.floor(barShapeStyle.x);
            barShapeStyle.y = Math.floor(barShapeStyle.y);
            barShapeStyle.height = Math.ceil(barShapeStyle.height);
            barShapeStyle.width = Math.ceil(barShapeStyle.width);
            if (normalBorderWidth > 0 && barShapeStyle.height > normalBorderWidth && barShapeStyle.width > normalBorderWidth) {
                barShapeStyle.y += normalBorderWidth / 2;
                barShapeStyle.height -= normalBorderWidth;
                barShapeStyle.x += normalBorderWidth / 2;
                barShapeStyle.width -= normalBorderWidth;
            } else {
                barShapeStyle.brushType = 'fill';
            }
            barShape.highlightStyle.textColor = barShape.highlightStyle.color;
            barShape = this.addLabel(barShape, serie, data, name, orient);
            var barShapeStyleList = [
                barShapeStyle,
                barShape.highlightStyle
            ];
            for (var i = 0, l = barShapeStyleList.length; i < l; i++) {
                var textPosition = barShapeStyleList[i].textPosition;
                if (textPosition === 'insideLeft' || textPosition === 'insideRight' || textPosition === 'insideTop' || textPosition === 'insideBottom') {
                    var gap = 5;
                    switch (textPosition) {
                    case 'insideLeft':
                        barShapeStyleList[i].textX = barShapeStyle.x + gap;
                        barShapeStyleList[i].textY = barShapeStyle.y + barShapeStyle.height / 2;
                        barShapeStyleList[i].textAlign = 'left';
                        barShapeStyleList[i].textBaseline = 'middle';
                        break;
                    case 'insideRight':
                        barShapeStyleList[i].textX = barShapeStyle.x + barShapeStyle.width - gap;
                        barShapeStyleList[i].textY = barShapeStyle.y + barShapeStyle.height / 2;
                        barShapeStyleList[i].textAlign = 'right';
                        barShapeStyleList[i].textBaseline = 'middle';
                        break;
                    case 'insideTop':
                        barShapeStyleList[i].textX = barShapeStyle.x + barShapeStyle.width / 2;
                        barShapeStyleList[i].textY = barShapeStyle.y + gap / 2;
                        barShapeStyleList[i].textAlign = 'center';
                        barShapeStyleList[i].textBaseline = 'top';
                        break;
                    case 'insideBottom':
                        barShapeStyleList[i].textX = barShapeStyle.x + barShapeStyle.width / 2;
                        barShapeStyleList[i].textY = barShapeStyle.y + barShapeStyle.height - gap / 2;
                        barShapeStyleList[i].textAlign = 'center';
                        barShapeStyleList[i].textBaseline = 'bottom';
                        break;
                    }
                    barShapeStyleList[i].textPosition = 'specific';
                    barShapeStyleList[i].textColor = barShapeStyleList[i].textColor || '#fff';
                }
            }
            if (this.deepQuery([
                    data,
                    serie,
                    this.option
                ], 'calculable')) {
                this.setCalculable(barShape);
                barShape.draggable = true;
            }
            ecData.pack(barShape, series[seriesIndex], seriesIndex, series[seriesIndex].data[dataIndex], dataIndex, name);
            return barShape;
        },
        getMarkCoord: function (seriesIndex, mpData) {
            var serie = this.series[seriesIndex];
            var xMarkMap = this.xMarkMap[seriesIndex];
            var xAxis = this.component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = this.component.yAxis.getAxis(serie.yAxisIndex);
            var dataIndex;
            var pos;
            if (mpData.type && (mpData.type === 'max' || mpData.type === 'min' || mpData.type === 'average')) {
                var valueIndex = mpData.valueIndex != null ? mpData.valueIndex : xMarkMap.maxX0 != null ? '1' : '';
                pos = [
                    xMarkMap[mpData.type + 'X' + valueIndex],
                    xMarkMap[mpData.type + 'Y' + valueIndex],
                    xMarkMap[mpData.type + 'Line' + valueIndex],
                    xMarkMap[mpData.type + valueIndex]
                ];
            } else if (xMarkMap.isHorizontal) {
                dataIndex = typeof mpData.xAxis === 'string' && xAxis.getIndexByName ? xAxis.getIndexByName(mpData.xAxis) : mpData.xAxis || 0;
                var x = xMarkMap[dataIndex];
                x = x != null ? x : typeof mpData.xAxis != 'string' && xAxis.getCoordByIndex ? xAxis.getCoordByIndex(mpData.xAxis || 0) : xAxis.getCoord(mpData.xAxis || 0);
                pos = [
                    x,
                    yAxis.getCoord(mpData.yAxis || 0)
                ];
            } else {
                dataIndex = typeof mpData.yAxis === 'string' && yAxis.getIndexByName ? yAxis.getIndexByName(mpData.yAxis) : mpData.yAxis || 0;
                var y = xMarkMap[dataIndex];
                y = y != null ? y : typeof mpData.yAxis != 'string' && yAxis.getCoordByIndex ? yAxis.getCoordByIndex(mpData.yAxis || 0) : yAxis.getCoord(mpData.yAxis || 0);
                pos = [
                    xAxis.getCoord(mpData.xAxis || 0),
                    y
                ];
            }
            return pos;
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            this.backupShapeList();
            this._buildShape();
        },
        addDataAnimation: function (params, done) {
            var series = this.series;
            var aniMap = {};
            for (var i = 0, l = params.length; i < l; i++) {
                aniMap[params[i][0]] = params[i];
            }
            var x;
            var dx;
            var y;
            var dy;
            var serie;
            var seriesIndex;
            var dataIndex;
            var aniCount = 0;
            function animationDone() {
                aniCount--;
                if (aniCount === 0) {
                    done && done();
                }
            }
            for (var i = this.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = ecData.get(this.shapeList[i], 'seriesIndex');
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    if (this.shapeList[i].type === 'rectangle') {
                        dataIndex = ecData.get(this.shapeList[i], 'dataIndex');
                        serie = series[seriesIndex];
                        if (aniMap[seriesIndex][2] && dataIndex === serie.data.length - 1) {
                            this.zr.delShape(this.shapeList[i].id);
                            continue;
                        } else if (!aniMap[seriesIndex][2] && dataIndex === 0) {
                            this.zr.delShape(this.shapeList[i].id);
                            continue;
                        }
                        if (this.shapeList[i]._orient === 'horizontal') {
                            dy = this.component.yAxis.getAxis(serie.yAxisIndex || 0).getGap();
                            y = aniMap[seriesIndex][2] ? -dy : dy;
                            x = 0;
                        } else {
                            dx = this.component.xAxis.getAxis(serie.xAxisIndex || 0).getGap();
                            x = aniMap[seriesIndex][2] ? dx : -dx;
                            y = 0;
                        }
                        this.shapeList[i].position = [
                            0,
                            0
                        ];
                        aniCount++;
                        this.zr.animate(this.shapeList[i].id, '').when(this.query(this.option, 'animationDurationUpdate'), {
                            position: [
                                x,
                                y
                            ]
                        }).done(animationDone).start();
                    }
                }
            }
            if (!aniCount) {
                done && done();
            }
        }
    };
    zrUtil.inherits(Bar, ChartBase);
    require('../chart').define('bar', Bar);
    return Bar;
});
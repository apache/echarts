define('echarts/chart/line', [
    'require',
    './base',
    'zrender/shape/Polyline',
    '../util/shape/Icon',
    '../util/shape/HalfSmoothPolygon',
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
    var PolylineShape = require('zrender/shape/Polyline');
    var IconShape = require('../util/shape/Icon');
    var HalfSmoothPolygonShape = require('../util/shape/HalfSmoothPolygon');
    require('../component/axis');
    require('../component/grid');
    require('../component/dataZoom');
    var ecConfig = require('../config');
    ecConfig.line = {
        zlevel: 0,
        z: 2,
        clickable: true,
        legendHoverLink: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        dataFilter: 'nearest',
        itemStyle: {
            normal: {
                label: { show: false },
                lineStyle: {
                    width: 2,
                    type: 'solid',
                    shadowColor: 'rgba(0,0,0,0)',
                    shadowBlur: 0,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0
                }
            },
            emphasis: { label: { show: false } }
        },
        symbolSize: 2,
        showAllSymbol: false
    };
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    function Line(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Line.prototype = {
        type: ecConfig.CHART_TYPE_LINE,
        _buildShape: function () {
            this.finalPLMap = {};
            this._buildPosition();
        },
        _buildHorizontal: function (seriesArray, maxDataLength, locationMap, xMarkMap) {
            var series = this.series;
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var categoryAxis = this.component.xAxis.getAxis(serie.xAxisIndex || 0);
            var valueAxis;
            var x;
            var y;
            var lastYP;
            var baseYP;
            var lastYN;
            var baseYN;
            var curPLMap = {};
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (categoryAxis.getNameByIndex(i) == null) {
                    break;
                }
                x = categoryAxis.getCoordByIndex(i);
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    valueAxis = this.component.yAxis.getAxis(series[locationMap[j][0]].yAxisIndex || 0);
                    baseYP = lastYP = baseYN = lastYN = valueAxis.getCoord(0);
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = this.getDataFromOption(data, '-');
                        curPLMap[seriesIndex] = curPLMap[seriesIndex] || [];
                        xMarkMap[seriesIndex] = xMarkMap[seriesIndex] || {
                            min: Number.POSITIVE_INFINITY,
                            max: Number.NEGATIVE_INFINITY,
                            sum: 0,
                            counter: 0,
                            average: 0
                        };
                        if (value === '-') {
                            if (curPLMap[seriesIndex].length > 0) {
                                this.finalPLMap[seriesIndex] = this.finalPLMap[seriesIndex] || [];
                                this.finalPLMap[seriesIndex].push(curPLMap[seriesIndex]);
                                curPLMap[seriesIndex] = [];
                            }
                            continue;
                        }
                        if (value >= 0) {
                            lastYP -= m > 0 ? valueAxis.getCoordSize(value) : baseYP - valueAxis.getCoord(value);
                            y = lastYP;
                        } else if (value < 0) {
                            lastYN += m > 0 ? valueAxis.getCoordSize(value) : valueAxis.getCoord(value) - baseYN;
                            y = lastYN;
                        }
                        curPLMap[seriesIndex].push([
                            x,
                            y,
                            i,
                            categoryAxis.getNameByIndex(i),
                            x,
                            baseYP
                        ]);
                        if (xMarkMap[seriesIndex].min > value) {
                            xMarkMap[seriesIndex].min = value;
                            xMarkMap[seriesIndex].minY = y;
                            xMarkMap[seriesIndex].minX = x;
                        }
                        if (xMarkMap[seriesIndex].max < value) {
                            xMarkMap[seriesIndex].max = value;
                            xMarkMap[seriesIndex].maxY = y;
                            xMarkMap[seriesIndex].maxX = x;
                        }
                        xMarkMap[seriesIndex].sum += value;
                        xMarkMap[seriesIndex].counter++;
                    }
                }
                lastYP = this.component.grid.getY();
                var symbolSize;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = this.getDataFromOption(data, '-');
                        if (value != '-') {
                            continue;
                        }
                        if (this.deepQuery([
                                data,
                                serie,
                                this.option
                            ], 'calculable')) {
                            symbolSize = this.deepQuery([
                                data,
                                serie
                            ], 'symbolSize');
                            lastYP += symbolSize * 2 + 5;
                            y = lastYP;
                            this.shapeList.push(this._getCalculableItem(seriesIndex, i, categoryAxis.getNameByIndex(i), x, y, 'horizontal'));
                        }
                    }
                }
            }
            for (var sId in curPLMap) {
                if (curPLMap[sId].length > 0) {
                    this.finalPLMap[sId] = this.finalPLMap[sId] || [];
                    this.finalPLMap[sId].push(curPLMap[sId]);
                    curPLMap[sId] = [];
                }
            }
            this._calculMarkMapXY(xMarkMap, locationMap, 'y');
            this._buildBorkenLine(seriesArray, this.finalPLMap, categoryAxis, 'horizontal');
        },
        _buildVertical: function (seriesArray, maxDataLength, locationMap, xMarkMap) {
            var series = this.series;
            var seriesIndex = locationMap[0][0];
            var serie = series[seriesIndex];
            var categoryAxis = this.component.yAxis.getAxis(serie.yAxisIndex || 0);
            var valueAxis;
            var x;
            var y;
            var lastXP;
            var baseXP;
            var lastXN;
            var baseXN;
            var curPLMap = {};
            var data;
            var value;
            for (var i = 0, l = maxDataLength; i < l; i++) {
                if (categoryAxis.getNameByIndex(i) == null) {
                    break;
                }
                y = categoryAxis.getCoordByIndex(i);
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    valueAxis = this.component.xAxis.getAxis(series[locationMap[j][0]].xAxisIndex || 0);
                    baseXP = lastXP = baseXN = lastXN = valueAxis.getCoord(0);
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = this.getDataFromOption(data, '-');
                        curPLMap[seriesIndex] = curPLMap[seriesIndex] || [];
                        xMarkMap[seriesIndex] = xMarkMap[seriesIndex] || {
                            min: Number.POSITIVE_INFINITY,
                            max: Number.NEGATIVE_INFINITY,
                            sum: 0,
                            counter: 0,
                            average: 0
                        };
                        if (value === '-') {
                            if (curPLMap[seriesIndex].length > 0) {
                                this.finalPLMap[seriesIndex] = this.finalPLMap[seriesIndex] || [];
                                this.finalPLMap[seriesIndex].push(curPLMap[seriesIndex]);
                                curPLMap[seriesIndex] = [];
                            }
                            continue;
                        }
                        if (value >= 0) {
                            lastXP += m > 0 ? valueAxis.getCoordSize(value) : valueAxis.getCoord(value) - baseXP;
                            x = lastXP;
                        } else if (value < 0) {
                            lastXN -= m > 0 ? valueAxis.getCoordSize(value) : baseXN - valueAxis.getCoord(value);
                            x = lastXN;
                        }
                        curPLMap[seriesIndex].push([
                            x,
                            y,
                            i,
                            categoryAxis.getNameByIndex(i),
                            baseXP,
                            y
                        ]);
                        if (xMarkMap[seriesIndex].min > value) {
                            xMarkMap[seriesIndex].min = value;
                            xMarkMap[seriesIndex].minX = x;
                            xMarkMap[seriesIndex].minY = y;
                        }
                        if (xMarkMap[seriesIndex].max < value) {
                            xMarkMap[seriesIndex].max = value;
                            xMarkMap[seriesIndex].maxX = x;
                            xMarkMap[seriesIndex].maxY = y;
                        }
                        xMarkMap[seriesIndex].sum += value;
                        xMarkMap[seriesIndex].counter++;
                    }
                }
                lastXP = this.component.grid.getXend();
                var symbolSize;
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    for (var m = 0, n = locationMap[j].length; m < n; m++) {
                        seriesIndex = locationMap[j][m];
                        serie = series[seriesIndex];
                        data = serie.data[i];
                        value = this.getDataFromOption(data, '-');
                        if (value != '-') {
                            continue;
                        }
                        if (this.deepQuery([
                                data,
                                serie,
                                this.option
                            ], 'calculable')) {
                            symbolSize = this.deepQuery([
                                data,
                                serie
                            ], 'symbolSize');
                            lastXP -= symbolSize * 2 + 5;
                            x = lastXP;
                            this.shapeList.push(this._getCalculableItem(seriesIndex, i, categoryAxis.getNameByIndex(i), x, y, 'vertical'));
                        }
                    }
                }
            }
            for (var sId in curPLMap) {
                if (curPLMap[sId].length > 0) {
                    this.finalPLMap[sId] = this.finalPLMap[sId] || [];
                    this.finalPLMap[sId].push(curPLMap[sId]);
                    curPLMap[sId] = [];
                }
            }
            this._calculMarkMapXY(xMarkMap, locationMap, 'x');
            this._buildBorkenLine(seriesArray, this.finalPLMap, categoryAxis, 'vertical');
        },
        _buildOther: function (seriesArray, maxDataLength, locationMap, xMarkMap) {
            var series = this.series;
            var curPLMap = {};
            var xAxis;
            for (var j = 0, k = locationMap.length; j < k; j++) {
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    var seriesIndex = locationMap[j][m];
                    var serie = series[seriesIndex];
                    xAxis = this.component.xAxis.getAxis(serie.xAxisIndex || 0);
                    var yAxis = this.component.yAxis.getAxis(serie.yAxisIndex || 0);
                    var baseY = yAxis.getCoord(0);
                    curPLMap[seriesIndex] = curPLMap[seriesIndex] || [];
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
                        curPLMap[seriesIndex].push([
                            x,
                            y,
                            i,
                            value[0],
                            x,
                            baseY
                        ]);
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
            for (var sId in curPLMap) {
                if (curPLMap[sId].length > 0) {
                    this.finalPLMap[sId] = this.finalPLMap[sId] || [];
                    this.finalPLMap[sId].push(curPLMap[sId]);
                    curPLMap[sId] = [];
                }
            }
            this._calculMarkMapXY(xMarkMap, locationMap, 'xy');
            this._buildBorkenLine(seriesArray, this.finalPLMap, xAxis, 'other');
        },
        _buildBorkenLine: function (seriesArray, pointList, categoryAxis, curOrient) {
            var orient = curOrient == 'other' ? 'horizontal' : curOrient;
            var series = this.series;
            var data;
            for (var sIdx = seriesArray.length - 1; sIdx >= 0; sIdx--) {
                var seriesIndex = seriesArray[sIdx];
                var serie = series[seriesIndex];
                var seriesPL = pointList[seriesIndex];
                if (serie.type === this.type && seriesPL != null) {
                    var bbox = this._getBbox(seriesIndex, orient);
                    var defaultColor = this._sIndex2ColorMap[seriesIndex];
                    var lineWidth = this.query(serie, 'itemStyle.normal.lineStyle.width');
                    var lineType = this.query(serie, 'itemStyle.normal.lineStyle.type');
                    var lineColor = this.query(serie, 'itemStyle.normal.lineStyle.color');
                    var normalColor = this.getItemStyleColor(this.query(serie, 'itemStyle.normal.color'), seriesIndex, -1);
                    var isFill = this.query(serie, 'itemStyle.normal.areaStyle') != null;
                    var fillNormalColor = this.query(serie, 'itemStyle.normal.areaStyle.color');
                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        var singlePL = seriesPL[i];
                        var isLarge = curOrient != 'other' && this._isLarge(orient, singlePL);
                        if (!isLarge) {
                            for (var j = 0, k = singlePL.length; j < k; j++) {
                                data = serie.data[singlePL[j][2]];
                                if (this.deepQuery([
                                        data,
                                        serie,
                                        this.option
                                    ], 'calculable') || this.deepQuery([
                                        data,
                                        serie
                                    ], 'showAllSymbol') || categoryAxis.type === 'categoryAxis' && categoryAxis.isMainAxis(singlePL[j][2]) && this.deepQuery([
                                        data,
                                        serie
                                    ], 'symbol') != 'none') {
                                    this.shapeList.push(this._getSymbol(seriesIndex, singlePL[j][2], singlePL[j][3], singlePL[j][0], singlePL[j][1], orient));
                                }
                            }
                        } else {
                            singlePL = this._getLargePointList(orient, singlePL, serie.dataFilter);
                        }
                        var polylineShape = new PolylineShape({
                            zlevel: this.getZlevelBase(),
                            z: this.getZBase(),
                            style: {
                                miterLimit: lineWidth,
                                pointList: singlePL,
                                strokeColor: lineColor || normalColor || defaultColor,
                                lineWidth: lineWidth,
                                lineType: lineType,
                                smooth: this._getSmooth(serie.smooth),
                                smoothConstraint: bbox,
                                shadowColor: this.query(serie, 'itemStyle.normal.lineStyle.shadowColor'),
                                shadowBlur: this.query(serie, 'itemStyle.normal.lineStyle.shadowBlur'),
                                shadowOffsetX: this.query(serie, 'itemStyle.normal.lineStyle.shadowOffsetX'),
                                shadowOffsetY: this.query(serie, 'itemStyle.normal.lineStyle.shadowOffsetY')
                            },
                            hoverable: false,
                            _main: true,
                            _seriesIndex: seriesIndex,
                            _orient: orient
                        });
                        ecData.pack(polylineShape, series[seriesIndex], seriesIndex, 0, i, series[seriesIndex].name);
                        this.shapeList.push(polylineShape);
                        if (isFill) {
                            var halfSmoothPolygonShape = new HalfSmoothPolygonShape({
                                zlevel: this.getZlevelBase(),
                                z: this.getZBase(),
                                style: {
                                    miterLimit: lineWidth,
                                    pointList: zrUtil.clone(singlePL).concat([
                                        [
                                            singlePL[singlePL.length - 1][4],
                                            singlePL[singlePL.length - 1][5]
                                        ],
                                        [
                                            singlePL[0][4],
                                            singlePL[0][5]
                                        ]
                                    ]),
                                    brushType: 'fill',
                                    smooth: this._getSmooth(serie.smooth),
                                    smoothConstraint: bbox,
                                    color: fillNormalColor ? fillNormalColor : zrColor.alpha(defaultColor, 0.5)
                                },
                                highlightStyle: { brushType: 'fill' },
                                hoverable: false,
                                _main: true,
                                _seriesIndex: seriesIndex,
                                _orient: orient
                            });
                            ecData.pack(halfSmoothPolygonShape, series[seriesIndex], seriesIndex, 0, i, series[seriesIndex].name);
                            this.shapeList.push(halfSmoothPolygonShape);
                        }
                    }
                }
            }
        },
        _getBbox: function (seriesIndex, orient) {
            var bbox = this.component.grid.getBbox();
            var xMarkMap = this.xMarkMap[seriesIndex];
            if (xMarkMap.minX0 != null) {
                return [
                    [
                        Math.min(xMarkMap.minX0, xMarkMap.maxX0, xMarkMap.minX1, xMarkMap.maxX1),
                        Math.min(xMarkMap.minY0, xMarkMap.maxY0, xMarkMap.minY1, xMarkMap.maxY1)
                    ],
                    [
                        Math.max(xMarkMap.minX0, xMarkMap.maxX0, xMarkMap.minX1, xMarkMap.maxX1),
                        Math.max(xMarkMap.minY0, xMarkMap.maxY0, xMarkMap.minY1, xMarkMap.maxY1)
                    ]
                ];
            } else if (orient === 'horizontal') {
                bbox[0][1] = Math.min(xMarkMap.minY, xMarkMap.maxY);
                bbox[1][1] = Math.max(xMarkMap.minY, xMarkMap.maxY);
            } else {
                bbox[0][0] = Math.min(xMarkMap.minX, xMarkMap.maxX);
                bbox[1][0] = Math.max(xMarkMap.minX, xMarkMap.maxX);
            }
            return bbox;
        },
        _isLarge: function (orient, singlePL) {
            if (singlePL.length < 2) {
                return false;
            } else {
                return orient === 'horizontal' ? Math.abs(singlePL[0][0] - singlePL[1][0]) < 0.5 : Math.abs(singlePL[0][1] - singlePL[1][1]) < 0.5;
            }
        },
        _getLargePointList: function (orient, singlePL, filter) {
            var total;
            if (orient === 'horizontal') {
                total = this.component.grid.getWidth();
            } else {
                total = this.component.grid.getHeight();
            }
            var len = singlePL.length;
            var newList = [];
            if (typeof filter != 'function') {
                switch (filter) {
                case 'min':
                    filter = function (arr) {
                        return Math.max.apply(null, arr);
                    };
                    break;
                case 'max':
                    filter = function (arr) {
                        return Math.min.apply(null, arr);
                    };
                    break;
                case 'average':
                    filter = function (arr) {
                        var total = 0;
                        for (var i = 0; i < arr.length; i++) {
                            total += arr[i];
                        }
                        return total / arr.length;
                    };
                    break;
                default:
                    filter = function (arr) {
                        return arr[0];
                    };
                }
            }
            var windowData = [];
            for (var i = 0; i < total; i++) {
                var idx0 = Math.floor(len / total * i);
                var idx1 = Math.min(Math.floor(len / total * (i + 1)), len);
                if (idx1 <= idx0) {
                    continue;
                }
                for (var j = idx0; j < idx1; j++) {
                    windowData[j - idx0] = orient === 'horizontal' ? singlePL[j][1] : singlePL[j][0];
                }
                windowData.length = idx1 - idx0;
                var filteredVal = filter(windowData);
                var nearestIdx = -1;
                var minDist = Infinity;
                for (var j = idx0; j < idx1; j++) {
                    var val = orient === 'horizontal' ? singlePL[j][1] : singlePL[j][0];
                    var dist = Math.abs(val - filteredVal);
                    if (dist < minDist) {
                        nearestIdx = j;
                        minDist = dist;
                    }
                }
                var newItem = singlePL[nearestIdx].slice();
                if (orient === 'horizontal') {
                    newItem[1] = filteredVal;
                } else {
                    newItem[0] = filteredVal;
                }
                newList.push(newItem);
            }
            return newList;
        },
        _getSmooth: function (isSmooth) {
            if (isSmooth) {
                return 0.3;
            } else {
                return 0;
            }
        },
        _getCalculableItem: function (seriesIndex, dataIndex, name, x, y, orient) {
            var series = this.series;
            var color = series[seriesIndex].calculableHolderColor || this.ecTheme.calculableHolderColor || ecConfig.calculableHolderColor;
            var itemShape = this._getSymbol(seriesIndex, dataIndex, name, x, y, orient);
            itemShape.style.color = color;
            itemShape.style.strokeColor = color;
            itemShape.rotation = [
                0,
                0
            ];
            itemShape.hoverable = false;
            itemShape.draggable = false;
            itemShape.style.text = undefined;
            return itemShape;
        },
        _getSymbol: function (seriesIndex, dataIndex, name, x, y, orient) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var itemShape = this.getSymbolShape(serie, seriesIndex, data, dataIndex, name, x, y, this._sIndex2ShapeMap[seriesIndex], this._sIndex2ColorMap[seriesIndex], '#fff', orient === 'vertical' ? 'horizontal' : 'vertical');
            itemShape.zlevel = this.getZlevelBase();
            itemShape.z = this.getZBase() + 1;
            if (this.deepQuery([
                    data,
                    serie,
                    this.option
                ], 'calculable')) {
                this.setCalculable(itemShape);
                itemShape.draggable = true;
            }
            return itemShape;
        },
        getMarkCoord: function (seriesIndex, mpData) {
            var serie = this.series[seriesIndex];
            var xMarkMap = this.xMarkMap[seriesIndex];
            var xAxis = this.component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = this.component.yAxis.getAxis(serie.yAxisIndex);
            if (mpData.type && (mpData.type === 'max' || mpData.type === 'min' || mpData.type === 'average')) {
                var valueIndex = mpData.valueIndex != null ? mpData.valueIndex : xMarkMap.maxX0 != null ? '1' : '';
                return [
                    xMarkMap[mpData.type + 'X' + valueIndex],
                    xMarkMap[mpData.type + 'Y' + valueIndex],
                    xMarkMap[mpData.type + 'Line' + valueIndex],
                    xMarkMap[mpData.type + valueIndex]
                ];
            }
            return [
                typeof mpData.xAxis != 'string' && xAxis.getCoordByIndex ? xAxis.getCoordByIndex(mpData.xAxis || 0) : xAxis.getCoord(mpData.xAxis || 0),
                typeof mpData.yAxis != 'string' && yAxis.getCoordByIndex ? yAxis.getCoordByIndex(mpData.yAxis || 0) : yAxis.getCoord(mpData.yAxis || 0)
            ];
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            this.backupShapeList();
            this._buildShape();
        },
        ontooltipHover: function (param, tipShape) {
            var seriesIndex = param.seriesIndex;
            var dataIndex = param.dataIndex;
            var seriesPL;
            var singlePL;
            var len = seriesIndex.length;
            while (len--) {
                seriesPL = this.finalPLMap[seriesIndex[len]];
                if (seriesPL) {
                    for (var i = 0, l = seriesPL.length; i < l; i++) {
                        singlePL = seriesPL[i];
                        for (var j = 0, k = singlePL.length; j < k; j++) {
                            if (dataIndex === singlePL[j][2]) {
                                tipShape.push(this._getSymbol(seriesIndex[len], singlePL[j][2], singlePL[j][3], singlePL[j][0], singlePL[j][1], 'horizontal'));
                            }
                        }
                    }
                }
            }
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
            var seriesIndex;
            var pointList;
            var isHorizontal;
            var aniCount = 0;
            function animationDone() {
                aniCount--;
                if (aniCount === 0) {
                    done && done();
                }
            }
            function animationDuring(target) {
                target.style.controlPointList = null;
            }
            for (var i = this.shapeList.length - 1; i >= 0; i--) {
                seriesIndex = this.shapeList[i]._seriesIndex;
                if (aniMap[seriesIndex] && !aniMap[seriesIndex][3]) {
                    if (this.shapeList[i]._main && this.shapeList[i].style.pointList.length > 1) {
                        pointList = this.shapeList[i].style.pointList;
                        dx = Math.abs(pointList[0][0] - pointList[1][0]);
                        dy = Math.abs(pointList[0][1] - pointList[1][1]);
                        isHorizontal = this.shapeList[i]._orient === 'horizontal';
                        if (aniMap[seriesIndex][2]) {
                            if (this.shapeList[i].type === 'half-smooth-polygon') {
                                var len = pointList.length;
                                this.shapeList[i].style.pointList[len - 3] = pointList[len - 2];
                                this.shapeList[i].style.pointList[len - 3][isHorizontal ? 0 : 1] = pointList[len - 4][isHorizontal ? 0 : 1];
                                this.shapeList[i].style.pointList[len - 2] = pointList[len - 1];
                            }
                            this.shapeList[i].style.pointList.pop();
                            isHorizontal ? (x = dx, y = 0) : (x = 0, y = -dy);
                        } else {
                            this.shapeList[i].style.pointList.shift();
                            if (this.shapeList[i].type === 'half-smooth-polygon') {
                                var targetPoint = this.shapeList[i].style.pointList.pop();
                                isHorizontal ? targetPoint[0] = pointList[0][0] : targetPoint[1] = pointList[0][1];
                                this.shapeList[i].style.pointList.push(targetPoint);
                            }
                            isHorizontal ? (x = -dx, y = 0) : (x = 0, y = dy);
                        }
                        this.shapeList[i].style.controlPointList = null;
                        this.zr.modShape(this.shapeList[i]);
                    } else {
                        if (aniMap[seriesIndex][2] && this.shapeList[i]._dataIndex === series[seriesIndex].data.length - 1) {
                            this.zr.delShape(this.shapeList[i].id);
                            continue;
                        } else if (!aniMap[seriesIndex][2] && this.shapeList[i]._dataIndex === 0) {
                            this.zr.delShape(this.shapeList[i].id);
                            continue;
                        }
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
                    }).during(animationDuring).done(animationDone).start();
                }
            }
            if (!aniCount) {
                done && done();
            }
        }
    };
    function legendLineIcon(ctx, style, refreshNextFrame) {
        var x = style.x;
        var y = style.y;
        var width = style.width;
        var height = style.height;
        var dy = height / 2;
        if (style.symbol.match('empty')) {
            ctx.fillStyle = '#fff';
        }
        style.brushType = 'both';
        var symbol = style.symbol.replace('empty', '').toLowerCase();
        if (symbol.match('star')) {
            dy = symbol.replace('star', '') - 0 || 5;
            y -= 1;
            symbol = 'star';
        } else if (symbol === 'rectangle' || symbol === 'arrow') {
            x += (width - height) / 2;
            width = height;
        }
        var imageLocation = '';
        if (symbol.match('image')) {
            imageLocation = symbol.replace(new RegExp('^image:\\/\\/'), '');
            symbol = 'image';
            x += Math.round((width - height) / 2) - 1;
            width = height = height + 2;
        }
        symbol = IconShape.prototype.iconLibrary[symbol];
        if (symbol) {
            var x2 = style.x;
            var y2 = style.y;
            ctx.moveTo(x2, y2 + dy);
            ctx.lineTo(x2 + 5, y2 + dy);
            ctx.moveTo(x2 + style.width - 5, y2 + dy);
            ctx.lineTo(x2 + style.width, y2 + dy);
            var self = this;
            symbol(ctx, {
                x: x + 4,
                y: y + 4,
                width: width - 8,
                height: height - 8,
                n: dy,
                image: imageLocation
            }, function () {
                self.modSelf();
                refreshNextFrame();
            });
        } else {
            ctx.moveTo(x, y + dy);
            ctx.lineTo(x + width, y + dy);
        }
    }
    IconShape.prototype.iconLibrary['legendLineIcon'] = legendLineIcon;
    zrUtil.inherits(Line, ChartBase);
    require('../chart').define('line', Line);
    return Line;
});define('echarts/util/shape/HalfSmoothPolygon', [
    'require',
    'zrender/shape/Base',
    'zrender/shape/util/smoothBezier',
    'zrender/tool/util',
    'zrender/shape/Polygon'
], function (require) {
    var Base = require('zrender/shape/Base');
    var smoothBezier = require('zrender/shape/util/smoothBezier');
    var zrUtil = require('zrender/tool/util');
    function HalfSmoothPolygon(options) {
        Base.call(this, options);
    }
    HalfSmoothPolygon.prototype = {
        type: 'half-smooth-polygon',
        buildPath: function (ctx, style) {
            var pointList = style.pointList;
            if (pointList.length < 2) {
                return;
            }
            if (style.smooth) {
                var controlPoints = smoothBezier(pointList.slice(0, -2), style.smooth, false, style.smoothConstraint);
                ctx.moveTo(pointList[0][0], pointList[0][1]);
                var cp1;
                var cp2;
                var p;
                var l = pointList.length;
                for (var i = 0; i < l - 3; i++) {
                    cp1 = controlPoints[i * 2];
                    cp2 = controlPoints[i * 2 + 1];
                    p = pointList[i + 1];
                    ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]);
                }
                ctx.lineTo(pointList[l - 2][0], pointList[l - 2][1]);
                ctx.lineTo(pointList[l - 1][0], pointList[l - 1][1]);
                ctx.lineTo(pointList[0][0], pointList[0][1]);
            } else {
                require('zrender/shape/Polygon').prototype.buildPath(ctx, style);
            }
            return;
        }
    };
    zrUtil.inherits(HalfSmoothPolygon, Base);
    return HalfSmoothPolygon;
});
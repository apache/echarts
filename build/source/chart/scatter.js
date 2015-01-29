define('echarts/chart/scatter', [
    'require',
    './base',
    '../util/shape/Symbol',
    '../component/axis',
    '../component/grid',
    '../component/dataZoom',
    '../component/dataRange',
    '../config',
    'zrender/tool/util',
    'zrender/tool/color',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var SymbolShape = require('../util/shape/Symbol');
    require('../component/axis');
    require('../component/grid');
    require('../component/dataZoom');
    require('../component/dataRange');
    var ecConfig = require('../config');
    ecConfig.scatter = {
        zlevel: 0,
        z: 2,
        clickable: true,
        legendHoverLink: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        symbolSize: 4,
        large: false,
        largeThreshold: 2000,
        itemStyle: {
            normal: { label: { show: false } },
            emphasis: { label: { show: false } }
        }
    };
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    function Scatter(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Scatter.prototype = {
        type: ecConfig.CHART_TYPE_SCATTER,
        _buildShape: function () {
            var series = this.series;
            this._sIndex2ColorMap = {};
            this._symbol = this.option.symbolList;
            this._sIndex2ShapeMap = {};
            this.selectedMap = {};
            this.xMarkMap = {};
            var legend = this.component.legend;
            var seriesArray = [];
            var serie;
            var serieName;
            var iconShape;
            var iconType;
            for (var i = 0, l = series.length; i < l; i++) {
                serie = series[i];
                serieName = serie.name;
                if (serie.type === ecConfig.CHART_TYPE_SCATTER) {
                    series[i] = this.reformOption(series[i]);
                    this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
                    this._sIndex2ShapeMap[i] = this.query(serie, 'symbol') || this._symbol[i % this._symbol.length];
                    if (legend) {
                        this.selectedMap[serieName] = legend.isSelected(serieName);
                        this._sIndex2ColorMap[i] = zrColor.alpha(legend.getColor(serieName), 0.5);
                        iconShape = legend.getItemShape(serieName);
                        if (iconShape) {
                            var iconType = this._sIndex2ShapeMap[i];
                            iconShape.style.brushType = iconType.match('empty') ? 'stroke' : 'both';
                            iconType = iconType.replace('empty', '').toLowerCase();
                            if (iconType.match('rectangle')) {
                                iconShape.style.x += Math.round((iconShape.style.width - iconShape.style.height) / 2);
                                iconShape.style.width = iconShape.style.height;
                            }
                            if (iconType.match('star')) {
                                iconShape.style.n = iconType.replace('star', '') - 0 || 5;
                                iconType = 'star';
                            }
                            if (iconType.match('image')) {
                                iconShape.style.image = iconType.replace(new RegExp('^image:\\/\\/'), '');
                                iconShape.style.x += Math.round((iconShape.style.width - iconShape.style.height) / 2);
                                iconShape.style.width = iconShape.style.height;
                                iconType = 'image';
                            }
                            iconShape.style.iconType = iconType;
                            legend.setItemShape(serieName, iconShape);
                        }
                    } else {
                        this.selectedMap[serieName] = true;
                        this._sIndex2ColorMap[i] = zrColor.alpha(this.zr.getColor(i), 0.5);
                    }
                    if (this.selectedMap[serieName]) {
                        seriesArray.push(i);
                    }
                }
            }
            this._buildSeries(seriesArray);
            this.addShapeList();
        },
        _buildSeries: function (seriesArray) {
            if (seriesArray.length === 0) {
                return;
            }
            var series = this.series;
            var seriesIndex;
            var serie;
            var data;
            var value;
            var xAxis;
            var yAxis;
            var pointList = {};
            var x;
            var y;
            for (var j = 0, k = seriesArray.length; j < k; j++) {
                seriesIndex = seriesArray[j];
                serie = series[seriesIndex];
                if (serie.data.length === 0) {
                    continue;
                }
                xAxis = this.component.xAxis.getAxis(serie.xAxisIndex || 0);
                yAxis = this.component.yAxis.getAxis(serie.yAxisIndex || 0);
                pointList[seriesIndex] = [];
                for (var i = 0, l = serie.data.length; i < l; i++) {
                    data = serie.data[i];
                    value = this.getDataFromOption(data, '-');
                    if (value === '-' || value.length < 2) {
                        continue;
                    }
                    x = xAxis.getCoord(value[0]);
                    y = yAxis.getCoord(value[1]);
                    pointList[seriesIndex].push([
                        x,
                        y,
                        i,
                        data.name || ''
                    ]);
                }
                this.xMarkMap[seriesIndex] = this._markMap(xAxis, yAxis, serie.data, pointList[seriesIndex]);
                this.buildMark(seriesIndex);
            }
            this._buildPointList(pointList);
        },
        _markMap: function (xAxis, yAxis, data, pointList) {
            var xMarkMap = {
                min0: Number.POSITIVE_INFINITY,
                max0: Number.NEGATIVE_INFINITY,
                sum0: 0,
                counter0: 0,
                average0: 0,
                min1: Number.POSITIVE_INFINITY,
                max1: Number.NEGATIVE_INFINITY,
                sum1: 0,
                counter1: 0,
                average1: 0
            };
            var value;
            for (var i = 0, l = pointList.length; i < l; i++) {
                value = data[pointList[i][2]].value || data[pointList[i][2]];
                if (xMarkMap.min0 > value[0]) {
                    xMarkMap.min0 = value[0];
                    xMarkMap.minY0 = pointList[i][1];
                    xMarkMap.minX0 = pointList[i][0];
                }
                if (xMarkMap.max0 < value[0]) {
                    xMarkMap.max0 = value[0];
                    xMarkMap.maxY0 = pointList[i][1];
                    xMarkMap.maxX0 = pointList[i][0];
                }
                xMarkMap.sum0 += value[0];
                xMarkMap.counter0++;
                if (xMarkMap.min1 > value[1]) {
                    xMarkMap.min1 = value[1];
                    xMarkMap.minY1 = pointList[i][1];
                    xMarkMap.minX1 = pointList[i][0];
                }
                if (xMarkMap.max1 < value[1]) {
                    xMarkMap.max1 = value[1];
                    xMarkMap.maxY1 = pointList[i][1];
                    xMarkMap.maxX1 = pointList[i][0];
                }
                xMarkMap.sum1 += value[1];
                xMarkMap.counter1++;
            }
            var gridX = this.component.grid.getX();
            var gridXend = this.component.grid.getXend();
            var gridY = this.component.grid.getY();
            var gridYend = this.component.grid.getYend();
            xMarkMap.average0 = xMarkMap.sum0 / xMarkMap.counter0;
            var x = xAxis.getCoord(xMarkMap.average0);
            xMarkMap.averageLine0 = [
                [
                    x,
                    gridYend
                ],
                [
                    x,
                    gridY
                ]
            ];
            xMarkMap.minLine0 = [
                [
                    xMarkMap.minX0,
                    gridYend
                ],
                [
                    xMarkMap.minX0,
                    gridY
                ]
            ];
            xMarkMap.maxLine0 = [
                [
                    xMarkMap.maxX0,
                    gridYend
                ],
                [
                    xMarkMap.maxX0,
                    gridY
                ]
            ];
            xMarkMap.average1 = xMarkMap.sum1 / xMarkMap.counter1;
            var y = yAxis.getCoord(xMarkMap.average1);
            xMarkMap.averageLine1 = [
                [
                    gridX,
                    y
                ],
                [
                    gridXend,
                    y
                ]
            ];
            xMarkMap.minLine1 = [
                [
                    gridX,
                    xMarkMap.minY1
                ],
                [
                    gridXend,
                    xMarkMap.minY1
                ]
            ];
            xMarkMap.maxLine1 = [
                [
                    gridX,
                    xMarkMap.maxY1
                ],
                [
                    gridXend,
                    xMarkMap.maxY1
                ]
            ];
            return xMarkMap;
        },
        _buildPointList: function (pointList) {
            var series = this.series;
            var serie;
            var seriesPL;
            var singlePoint;
            var shape;
            for (var seriesIndex in pointList) {
                serie = series[seriesIndex];
                seriesPL = pointList[seriesIndex];
                if (serie.large && serie.data.length > serie.largeThreshold) {
                    this.shapeList.push(this._getLargeSymbol(seriesPL, this.getItemStyleColor(this.query(serie, 'itemStyle.normal.color'), seriesIndex, -1) || this._sIndex2ColorMap[seriesIndex]));
                    continue;
                }
                for (var i = 0, l = seriesPL.length; i < l; i++) {
                    singlePoint = seriesPL[i];
                    shape = this._getSymbol(seriesIndex, singlePoint[2], singlePoint[3], singlePoint[0], singlePoint[1]);
                    shape && this.shapeList.push(shape);
                }
            }
        },
        _getSymbol: function (seriesIndex, dataIndex, name, x, y) {
            var series = this.series;
            var serie = series[seriesIndex];
            var data = serie.data[dataIndex];
            var dataRange = this.component.dataRange;
            var rangColor;
            if (dataRange) {
                rangColor = isNaN(data[2]) ? this._sIndex2ColorMap[seriesIndex] : dataRange.getColor(data[2]);
                if (!rangColor) {
                    return null;
                }
            } else {
                rangColor = this._sIndex2ColorMap[seriesIndex];
            }
            var itemShape = this.getSymbolShape(serie, seriesIndex, data, dataIndex, name, x, y, this._sIndex2ShapeMap[seriesIndex], rangColor, 'rgba(0,0,0,0)', 'vertical');
            itemShape.zlevel = this.getZlevelBase();
            itemShape.z = this.getZBase();
            itemShape._main = true;
            return itemShape;
        },
        _getLargeSymbol: function (pointList, nColor) {
            return new SymbolShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                _main: true,
                hoverable: false,
                style: {
                    pointList: pointList,
                    color: nColor,
                    strokeColor: nColor
                },
                highlightStyle: { pointList: [] }
            });
        },
        getMarkCoord: function (seriesIndex, mpData) {
            var serie = this.series[seriesIndex];
            var xMarkMap = this.xMarkMap[seriesIndex];
            var xAxis = this.component.xAxis.getAxis(serie.xAxisIndex);
            var yAxis = this.component.yAxis.getAxis(serie.yAxisIndex);
            var pos;
            if (mpData.type && (mpData.type === 'max' || mpData.type === 'min' || mpData.type === 'average')) {
                var valueIndex = mpData.valueIndex != null ? mpData.valueIndex : 1;
                pos = [
                    xMarkMap[mpData.type + 'X' + valueIndex],
                    xMarkMap[mpData.type + 'Y' + valueIndex],
                    xMarkMap[mpData.type + 'Line' + valueIndex],
                    xMarkMap[mpData.type + valueIndex]
                ];
            } else {
                pos = [
                    typeof mpData.xAxis != 'string' && xAxis.getCoordByIndex ? xAxis.getCoordByIndex(mpData.xAxis || 0) : xAxis.getCoord(mpData.xAxis || 0),
                    typeof mpData.yAxis != 'string' && yAxis.getCoordByIndex ? yAxis.getCoordByIndex(mpData.yAxis || 0) : yAxis.getCoord(mpData.yAxis || 0)
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
        ondataRange: function (param, status) {
            if (this.component.dataRange) {
                this.refresh();
                status.needRefresh = true;
            }
            return;
        }
    };
    zrUtil.inherits(Scatter, ChartBase);
    require('../chart').define('scatter', Scatter);
    return Scatter;
});define('echarts/component/dataRange', [
    'require',
    './base',
    'zrender/shape/Text',
    'zrender/shape/Rectangle',
    '../util/shape/HandlePolygon',
    '../config',
    'zrender/tool/util',
    'zrender/tool/event',
    'zrender/tool/area',
    'zrender/tool/color',
    '../component'
], function (require) {
    var Base = require('./base');
    var TextShape = require('zrender/shape/Text');
    var RectangleShape = require('zrender/shape/Rectangle');
    var HandlePolygonShape = require('../util/shape/HandlePolygon');
    var ecConfig = require('../config');
    ecConfig.dataRange = {
        zlevel: 0,
        z: 4,
        show: true,
        orient: 'vertical',
        x: 'left',
        y: 'bottom',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#ccc',
        borderWidth: 0,
        padding: 5,
        itemGap: 10,
        itemWidth: 20,
        itemHeight: 14,
        precision: 0,
        splitNumber: 5,
        calculable: false,
        selectedMode: true,
        hoverLink: true,
        realtime: true,
        color: [
            '#006edd',
            '#e0ffff'
        ],
        textStyle: { color: '#333' }
    };
    var zrUtil = require('zrender/tool/util');
    var zrEvent = require('zrender/tool/event');
    var zrArea = require('zrender/tool/area');
    var zrColor = require('zrender/tool/color');
    function DataRange(ecTheme, messageCenter, zr, option, myChart) {
        if (typeof this.query(option, 'dataRange.min') == 'undefined' || typeof this.query(option, 'dataRange.max') == 'undefined') {
            console.error('option.dataRange.min or option.dataRange.max has not been defined.');
            return;
        }
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);
        var self = this;
        self._ondrift = function (dx, dy) {
            return self.__ondrift(this, dx, dy);
        };
        self._ondragend = function () {
            return self.__ondragend();
        };
        self._dataRangeSelected = function (param) {
            return self.__dataRangeSelected(param);
        };
        self._dispatchHoverLink = function (param) {
            return self.__dispatchHoverLink(param);
        };
        self._onhoverlink = function (params) {
            return self.__onhoverlink(params);
        };
        this._selectedMap = {};
        this._range = {};
        this.refresh(option);
        messageCenter.bind(ecConfig.EVENT.HOVER, this._onhoverlink);
    }
    DataRange.prototype = {
        type: ecConfig.COMPONENT_TYPE_DATARANGE,
        _textGap: 10,
        _buildShape: function () {
            this._itemGroupLocation = this._getItemGroupLocation();
            this._buildBackground();
            if (this.dataRangeOption.splitNumber <= 0 || this.dataRangeOption.calculable) {
                this._buildGradient();
            } else {
                this._buildItem();
            }
            if (this.dataRangeOption.show) {
                for (var i = 0, l = this.shapeList.length; i < l; i++) {
                    this.zr.addShape(this.shapeList[i]);
                }
            }
            this._syncShapeFromRange();
        },
        _buildItem: function () {
            var data = this._valueTextList;
            var dataLength = data.length;
            var itemName;
            var itemShape;
            var textShape;
            var font = this.getFont(this.dataRangeOption.textStyle);
            var lastX = this._itemGroupLocation.x;
            var lastY = this._itemGroupLocation.y;
            var itemWidth = this.dataRangeOption.itemWidth;
            var itemHeight = this.dataRangeOption.itemHeight;
            var itemGap = this.dataRangeOption.itemGap;
            var textHeight = zrArea.getTextHeight('国', font);
            var color;
            if (this.dataRangeOption.orient == 'vertical' && this.dataRangeOption.x == 'right') {
                lastX = this._itemGroupLocation.x + this._itemGroupLocation.width - itemWidth;
            }
            var needValueText = true;
            if (this.dataRangeOption.text) {
                needValueText = false;
                if (this.dataRangeOption.text[0]) {
                    textShape = this._getTextShape(lastX, lastY, this.dataRangeOption.text[0]);
                    if (this.dataRangeOption.orient == 'horizontal') {
                        lastX += zrArea.getTextWidth(this.dataRangeOption.text[0], font) + this._textGap;
                    } else {
                        lastY += textHeight + this._textGap;
                        textShape.style.y += textHeight / 2 + this._textGap;
                        textShape.style.textBaseline = 'bottom';
                    }
                    this.shapeList.push(new TextShape(textShape));
                }
            }
            for (var i = 0; i < dataLength; i++) {
                itemName = data[i];
                color = this.getColorByIndex(i);
                itemShape = this._getItemShape(lastX, lastY, itemWidth, itemHeight, this._selectedMap[i] ? color : '#ccc');
                itemShape._idx = i;
                itemShape.onmousemove = this._dispatchHoverLink;
                if (this.dataRangeOption.selectedMode) {
                    itemShape.clickable = true;
                    itemShape.onclick = this._dataRangeSelected;
                }
                this.shapeList.push(new RectangleShape(itemShape));
                if (needValueText) {
                    textShape = {
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        style: {
                            x: lastX + itemWidth + 5,
                            y: lastY,
                            color: this._selectedMap[i] ? this.dataRangeOption.textStyle.color : '#ccc',
                            text: data[i],
                            textFont: font,
                            textBaseline: 'top'
                        },
                        highlightStyle: { brushType: 'fill' }
                    };
                    if (this.dataRangeOption.orient == 'vertical' && this.dataRangeOption.x == 'right') {
                        textShape.style.x -= itemWidth + 10;
                        textShape.style.textAlign = 'right';
                    }
                    textShape._idx = i;
                    textShape.onmousemove = this._dispatchHoverLink;
                    if (this.dataRangeOption.selectedMode) {
                        textShape.clickable = true;
                        textShape.onclick = this._dataRangeSelected;
                    }
                    this.shapeList.push(new TextShape(textShape));
                }
                if (this.dataRangeOption.orient == 'horizontal') {
                    lastX += itemWidth + (needValueText ? 5 : 0) + (needValueText ? zrArea.getTextWidth(itemName, font) : 0) + itemGap;
                } else {
                    lastY += itemHeight + itemGap;
                }
            }
            if (!needValueText && this.dataRangeOption.text[1]) {
                if (this.dataRangeOption.orient == 'horizontal') {
                    lastX = lastX - itemGap + this._textGap;
                } else {
                    lastY = lastY - itemGap + this._textGap;
                }
                textShape = this._getTextShape(lastX, lastY, this.dataRangeOption.text[1]);
                if (this.dataRangeOption.orient != 'horizontal') {
                    textShape.style.y -= 5;
                    textShape.style.textBaseline = 'top';
                }
                this.shapeList.push(new TextShape(textShape));
            }
        },
        _buildGradient: function () {
            var itemShape;
            var textShape;
            var font = this.getFont(this.dataRangeOption.textStyle);
            var lastX = this._itemGroupLocation.x;
            var lastY = this._itemGroupLocation.y;
            var itemWidth = this.dataRangeOption.itemWidth;
            var itemHeight = this.dataRangeOption.itemHeight;
            var textHeight = zrArea.getTextHeight('国', font);
            var mSize = 10;
            var needValueText = true;
            if (this.dataRangeOption.text) {
                needValueText = false;
                if (this.dataRangeOption.text[0]) {
                    textShape = this._getTextShape(lastX, lastY, this.dataRangeOption.text[0]);
                    if (this.dataRangeOption.orient == 'horizontal') {
                        lastX += zrArea.getTextWidth(this.dataRangeOption.text[0], font) + this._textGap;
                    } else {
                        lastY += textHeight + this._textGap;
                        textShape.style.y += textHeight / 2 + this._textGap;
                        textShape.style.textBaseline = 'bottom';
                    }
                    this.shapeList.push(new TextShape(textShape));
                }
            }
            var zrColor = require('zrender/tool/color');
            var per = 1 / (this.dataRangeOption.color.length - 1);
            var colorList = [];
            for (var i = 0, l = this.dataRangeOption.color.length; i < l; i++) {
                colorList.push([
                    i * per,
                    this.dataRangeOption.color[i]
                ]);
            }
            if (this.dataRangeOption.orient == 'horizontal') {
                itemShape = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: lastX,
                        y: lastY,
                        width: itemWidth * mSize,
                        height: itemHeight,
                        color: zrColor.getLinearGradient(lastX, lastY, lastX + itemWidth * mSize, lastY, colorList)
                    },
                    hoverable: false
                };
                lastX += itemWidth * mSize + this._textGap;
            } else {
                itemShape = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: lastX,
                        y: lastY,
                        width: itemWidth,
                        height: itemHeight * mSize,
                        color: zrColor.getLinearGradient(lastX, lastY, lastX, lastY + itemHeight * mSize, colorList)
                    },
                    hoverable: false
                };
                lastY += itemHeight * mSize + this._textGap;
            }
            this.shapeList.push(new RectangleShape(itemShape));
            this._calculableLocation = itemShape.style;
            if (this.dataRangeOption.calculable) {
                this._buildFiller();
                this._bulidMask();
                this._bulidHandle();
            }
            this._buildIndicator();
            if (!needValueText && this.dataRangeOption.text[1]) {
                textShape = this._getTextShape(lastX, lastY, this.dataRangeOption.text[1]);
                this.shapeList.push(new TextShape(textShape));
            }
        },
        _buildIndicator: function () {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            var size = 5;
            var pointList;
            var textPosition;
            if (this.dataRangeOption.orient == 'horizontal') {
                if (this.dataRangeOption.y != 'bottom') {
                    pointList = [
                        [
                            x,
                            y + height
                        ],
                        [
                            x - size,
                            y + height + size
                        ],
                        [
                            x + size,
                            y + height + size
                        ]
                    ];
                    textPosition = 'bottom';
                } else {
                    pointList = [
                        [
                            x,
                            y
                        ],
                        [
                            x - size,
                            y - size
                        ],
                        [
                            x + size,
                            y - size
                        ]
                    ];
                    textPosition = 'top';
                }
            } else {
                if (this.dataRangeOption.x != 'right') {
                    pointList = [
                        [
                            x + width,
                            y
                        ],
                        [
                            x + width + size,
                            y - size
                        ],
                        [
                            x + width + size,
                            y + size
                        ]
                    ];
                    textPosition = 'right';
                } else {
                    pointList = [
                        [
                            x,
                            y
                        ],
                        [
                            x - size,
                            y - size
                        ],
                        [
                            x - size,
                            y + size
                        ]
                    ];
                    textPosition = 'left';
                }
            }
            this._indicatorShape = {
                style: {
                    pointList: pointList,
                    color: '#fff',
                    __rect: {
                        x: Math.min(pointList[0][0], pointList[1][0]),
                        y: Math.min(pointList[0][1], pointList[1][1]),
                        width: size * (this.dataRangeOption.orient == 'horizontal' ? 2 : 1),
                        height: size * (this.dataRangeOption.orient == 'horizontal' ? 1 : 2)
                    }
                },
                highlightStyle: {
                    brushType: 'fill',
                    textPosition: textPosition,
                    textColor: this.dataRangeOption.textStyle.color
                },
                hoverable: false
            };
            this._indicatorShape = new HandlePolygonShape(this._indicatorShape);
        },
        _buildFiller: function () {
            this._fillerShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                style: {
                    x: this._calculableLocation.x,
                    y: this._calculableLocation.y,
                    width: this._calculableLocation.width,
                    height: this._calculableLocation.height,
                    color: 'rgba(255,255,255,0)'
                },
                highlightStyle: {
                    strokeColor: 'rgba(255,255,255,0.5)',
                    lineWidth: 1
                },
                draggable: true,
                ondrift: this._ondrift,
                ondragend: this._ondragend,
                onmousemove: this._dispatchHoverLink,
                _type: 'filler'
            };
            this._fillerShape = new RectangleShape(this._fillerShape);
            this.shapeList.push(this._fillerShape);
        },
        _bulidHandle: function () {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            var font = this.getFont(this.dataRangeOption.textStyle);
            var textHeight = zrArea.getTextHeight('国', font);
            var textWidth = Math.max(zrArea.getTextWidth(this._textFormat(this.dataRangeOption.max), font), zrArea.getTextWidth(this._textFormat(this.dataRangeOption.min), font)) + 2;
            var pointListStart;
            var textXStart;
            var textYStart;
            var coverRectStart;
            var pointListEnd;
            var textXEnd;
            var textYEnd;
            var coverRectEnd;
            if (this.dataRangeOption.orient == 'horizontal') {
                if (this.dataRangeOption.y != 'bottom') {
                    pointListStart = [
                        [
                            x,
                            y
                        ],
                        [
                            x,
                            y + height + textHeight
                        ],
                        [
                            x - textHeight,
                            y + height + textHeight
                        ],
                        [
                            x - 1,
                            y + height
                        ],
                        [
                            x - 1,
                            y
                        ]
                    ];
                    textXStart = x - textWidth / 2 - textHeight;
                    textYStart = y + height + textHeight / 2 + 2;
                    coverRectStart = {
                        x: x - textWidth - textHeight,
                        y: y + height,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                    pointListEnd = [
                        [
                            x + width,
                            y
                        ],
                        [
                            x + width,
                            y + height + textHeight
                        ],
                        [
                            x + width + textHeight,
                            y + height + textHeight
                        ],
                        [
                            x + width + 1,
                            y + height
                        ],
                        [
                            x + width + 1,
                            y
                        ]
                    ];
                    textXEnd = x + width + textWidth / 2 + textHeight;
                    textYEnd = textYStart;
                    coverRectEnd = {
                        x: x + width,
                        y: y + height,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                } else {
                    pointListStart = [
                        [
                            x,
                            y + height
                        ],
                        [
                            x,
                            y - textHeight
                        ],
                        [
                            x - textHeight,
                            y - textHeight
                        ],
                        [
                            x - 1,
                            y
                        ],
                        [
                            x - 1,
                            y + height
                        ]
                    ];
                    textXStart = x - textWidth / 2 - textHeight;
                    textYStart = y - textHeight / 2 - 2;
                    coverRectStart = {
                        x: x - textWidth - textHeight,
                        y: y - textHeight,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                    pointListEnd = [
                        [
                            x + width,
                            y + height
                        ],
                        [
                            x + width,
                            y - textHeight
                        ],
                        [
                            x + width + textHeight,
                            y - textHeight
                        ],
                        [
                            x + width + 1,
                            y
                        ],
                        [
                            x + width + 1,
                            y + height
                        ]
                    ];
                    textXEnd = x + width + textWidth / 2 + textHeight;
                    textYEnd = textYStart;
                    coverRectEnd = {
                        x: x + width,
                        y: y - textHeight,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                }
            } else {
                textWidth += textHeight;
                if (this.dataRangeOption.x != 'right') {
                    pointListStart = [
                        [
                            x,
                            y
                        ],
                        [
                            x + width + textHeight,
                            y
                        ],
                        [
                            x + width + textHeight,
                            y - textHeight
                        ],
                        [
                            x + width,
                            y - 1
                        ],
                        [
                            x,
                            y - 1
                        ]
                    ];
                    textXStart = x + width + textWidth / 2 + textHeight / 2;
                    textYStart = y - textHeight / 2;
                    coverRectStart = {
                        x: x + width,
                        y: y - textHeight,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                    pointListEnd = [
                        [
                            x,
                            y + height
                        ],
                        [
                            x + width + textHeight,
                            y + height
                        ],
                        [
                            x + width + textHeight,
                            y + textHeight + height
                        ],
                        [
                            x + width,
                            y + 1 + height
                        ],
                        [
                            x,
                            y + height + 1
                        ]
                    ];
                    textXEnd = textXStart;
                    textYEnd = y + height + textHeight / 2;
                    coverRectEnd = {
                        x: x + width,
                        y: y + height,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                } else {
                    pointListStart = [
                        [
                            x + width,
                            y
                        ],
                        [
                            x - textHeight,
                            y
                        ],
                        [
                            x - textHeight,
                            y - textHeight
                        ],
                        [
                            x,
                            y - 1
                        ],
                        [
                            x + width,
                            y - 1
                        ]
                    ];
                    textXStart = x - textWidth / 2 - textHeight / 2;
                    textYStart = y - textHeight / 2;
                    coverRectStart = {
                        x: x - textWidth - textHeight,
                        y: y - textHeight,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                    pointListEnd = [
                        [
                            x + width,
                            y + height
                        ],
                        [
                            x - textHeight,
                            y + height
                        ],
                        [
                            x - textHeight,
                            y + textHeight + height
                        ],
                        [
                            x,
                            y + 1 + height
                        ],
                        [
                            x + width,
                            y + height + 1
                        ]
                    ];
                    textXEnd = textXStart;
                    textYEnd = y + height + textHeight / 2;
                    coverRectEnd = {
                        x: x - textWidth - textHeight,
                        y: y + height,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                }
            }
            this._startShape = {
                style: {
                    pointList: pointListStart,
                    text: this._textFormat(this.dataRangeOption.max),
                    textX: textXStart,
                    textY: textYStart,
                    textFont: font,
                    color: this.getColor(this.dataRangeOption.max),
                    rect: coverRectStart,
                    x: pointListStart[0][0],
                    y: pointListStart[0][1],
                    _x: pointListStart[0][0],
                    _y: pointListStart[0][1]
                }
            };
            this._startShape.highlightStyle = {
                strokeColor: this._startShape.style.color,
                lineWidth: 1
            };
            this._endShape = {
                style: {
                    pointList: pointListEnd,
                    text: this._textFormat(this.dataRangeOption.min),
                    textX: textXEnd,
                    textY: textYEnd,
                    textFont: font,
                    color: this.getColor(this.dataRangeOption.min),
                    rect: coverRectEnd,
                    x: pointListEnd[0][0],
                    y: pointListEnd[0][1],
                    _x: pointListEnd[0][0],
                    _y: pointListEnd[0][1]
                }
            };
            this._endShape.highlightStyle = {
                strokeColor: this._endShape.style.color,
                lineWidth: 1
            };
            this._startShape.zlevel = this._endShape.zlevel = this.getZlevelBase();
            this._startShape.z = this._endShape.z = this.getZBase() + 1;
            this._startShape.draggable = this._endShape.draggable = true;
            this._startShape.ondrift = this._endShape.ondrift = this._ondrift;
            this._startShape.ondragend = this._endShape.ondragend = this._ondragend;
            this._startShape.style.textColor = this._endShape.style.textColor = this.dataRangeOption.textStyle.color;
            this._startShape.style.textAlign = this._endShape.style.textAlign = 'center';
            this._startShape.style.textPosition = this._endShape.style.textPosition = 'specific';
            this._startShape.style.textBaseline = this._endShape.style.textBaseline = 'middle';
            this._startShape.style.width = this._endShape.style.width = 0;
            this._startShape.style.height = this._endShape.style.height = 0;
            this._startShape.style.textPosition = this._endShape.style.textPosition = 'specific';
            this._startShape = new HandlePolygonShape(this._startShape);
            this._endShape = new HandlePolygonShape(this._endShape);
            this.shapeList.push(this._startShape);
            this.shapeList.push(this._endShape);
        },
        _bulidMask: function () {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            this._startMask = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                style: {
                    x: x,
                    y: y,
                    width: this.dataRangeOption.orient == 'horizontal' ? 0 : width,
                    height: this.dataRangeOption.orient == 'horizontal' ? height : 0,
                    color: '#ccc'
                },
                hoverable: false
            };
            this._endMask = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                style: {
                    x: this.dataRangeOption.orient == 'horizontal' ? x + width : x,
                    y: this.dataRangeOption.orient == 'horizontal' ? y : y + height,
                    width: this.dataRangeOption.orient == 'horizontal' ? 0 : width,
                    height: this.dataRangeOption.orient == 'horizontal' ? height : 0,
                    color: '#ccc'
                },
                hoverable: false
            };
            this._startMask = new RectangleShape(this._startMask);
            this._endMask = new RectangleShape(this._endMask);
            this.shapeList.push(this._startMask);
            this.shapeList.push(this._endMask);
        },
        _buildBackground: function () {
            var padding = this.reformCssArray(this.dataRangeOption.padding);
            this.shapeList.push(new RectangleShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable: false,
                style: {
                    x: this._itemGroupLocation.x - padding[3],
                    y: this._itemGroupLocation.y - padding[0],
                    width: this._itemGroupLocation.width + padding[3] + padding[1],
                    height: this._itemGroupLocation.height + padding[0] + padding[2],
                    brushType: this.dataRangeOption.borderWidth === 0 ? 'fill' : 'both',
                    color: this.dataRangeOption.backgroundColor,
                    strokeColor: this.dataRangeOption.borderColor,
                    lineWidth: this.dataRangeOption.borderWidth
                }
            }));
        },
        _getItemGroupLocation: function () {
            var data = this._valueTextList;
            var dataLength = data.length;
            var itemGap = this.dataRangeOption.itemGap;
            var itemWidth = this.dataRangeOption.itemWidth;
            var itemHeight = this.dataRangeOption.itemHeight;
            var totalWidth = 0;
            var totalHeight = 0;
            var font = this.getFont(this.dataRangeOption.textStyle);
            var textHeight = zrArea.getTextHeight('国', font);
            var mSize = 10;
            if (this.dataRangeOption.orient == 'horizontal') {
                if (this.dataRangeOption.text || this.dataRangeOption.splitNumber <= 0 || this.dataRangeOption.calculable) {
                    totalWidth = (this.dataRangeOption.splitNumber <= 0 || this.dataRangeOption.calculable ? itemWidth * mSize + itemGap : dataLength * (itemWidth + itemGap)) + (this.dataRangeOption.text && typeof this.dataRangeOption.text[0] != 'undefined' ? zrArea.getTextWidth(this.dataRangeOption.text[0], font) + this._textGap : 0) + (this.dataRangeOption.text && typeof this.dataRangeOption.text[1] != 'undefined' ? zrArea.getTextWidth(this.dataRangeOption.text[1], font) + this._textGap : 0);
                } else {
                    itemWidth += 5;
                    for (var i = 0; i < dataLength; i++) {
                        totalWidth += itemWidth + zrArea.getTextWidth(data[i], font) + itemGap;
                    }
                }
                totalWidth -= itemGap;
                totalHeight = Math.max(textHeight, itemHeight);
            } else {
                var maxWidth;
                if (this.dataRangeOption.text || this.dataRangeOption.splitNumber <= 0 || this.dataRangeOption.calculable) {
                    totalHeight = (this.dataRangeOption.splitNumber <= 0 || this.dataRangeOption.calculable ? itemHeight * mSize + itemGap : dataLength * (itemHeight + itemGap)) + (this.dataRangeOption.text && typeof this.dataRangeOption.text[0] != 'undefined' ? this._textGap + textHeight : 0) + (this.dataRangeOption.text && typeof this.dataRangeOption.text[1] != 'undefined' ? this._textGap + textHeight : 0);
                    maxWidth = Math.max(zrArea.getTextWidth(this.dataRangeOption.text && this.dataRangeOption.text[0] || '', font), zrArea.getTextWidth(this.dataRangeOption.text && this.dataRangeOption.text[1] || '', font));
                    totalWidth = Math.max(itemWidth, maxWidth);
                } else {
                    totalHeight = (itemHeight + itemGap) * dataLength;
                    itemWidth += 5;
                    maxWidth = 0;
                    for (var i = 0; i < dataLength; i++) {
                        maxWidth = Math.max(maxWidth, zrArea.getTextWidth(data[i], font));
                    }
                    totalWidth = itemWidth + maxWidth;
                }
                totalHeight -= itemGap;
            }
            var padding = this.reformCssArray(this.dataRangeOption.padding);
            var x;
            var zrWidth = this.zr.getWidth();
            switch (this.dataRangeOption.x) {
            case 'center':
                x = Math.floor((zrWidth - totalWidth) / 2);
                break;
            case 'left':
                x = padding[3] + this.dataRangeOption.borderWidth;
                break;
            case 'right':
                x = zrWidth - totalWidth - padding[1] - this.dataRangeOption.borderWidth;
                break;
            default:
                x = this.parsePercent(this.dataRangeOption.x, zrWidth);
                x = isNaN(x) ? 0 : x;
                break;
            }
            var y;
            var zrHeight = this.zr.getHeight();
            switch (this.dataRangeOption.y) {
            case 'top':
                y = padding[0] + this.dataRangeOption.borderWidth;
                break;
            case 'bottom':
                y = zrHeight - totalHeight - padding[2] - this.dataRangeOption.borderWidth;
                break;
            case 'center':
                y = Math.floor((zrHeight - totalHeight) / 2);
                break;
            default:
                y = this.parsePercent(this.dataRangeOption.y, zrHeight);
                y = isNaN(y) ? 0 : y;
                break;
            }
            if (this.dataRangeOption.calculable) {
                var handlerWidth = Math.max(zrArea.getTextWidth(this.dataRangeOption.max, font), zrArea.getTextWidth(this.dataRangeOption.min, font)) + textHeight;
                if (this.dataRangeOption.orient == 'horizontal') {
                    if (x < handlerWidth) {
                        x = handlerWidth;
                    }
                    if (x + totalWidth + handlerWidth > zrWidth) {
                        x -= handlerWidth;
                    }
                } else {
                    if (y < textHeight) {
                        y = textHeight;
                    }
                    if (y + totalHeight + textHeight > zrHeight) {
                        y -= textHeight;
                    }
                }
            }
            return {
                x: x,
                y: y,
                width: totalWidth,
                height: totalHeight
            };
        },
        _getTextShape: function (x, y, text) {
            return {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    x: this.dataRangeOption.orient == 'horizontal' ? x : this._itemGroupLocation.x + this._itemGroupLocation.width / 2,
                    y: this.dataRangeOption.orient == 'horizontal' ? this._itemGroupLocation.y + this._itemGroupLocation.height / 2 : y,
                    color: this.dataRangeOption.textStyle.color,
                    text: text,
                    textFont: this.getFont(this.dataRangeOption.textStyle),
                    textBaseline: this.dataRangeOption.orient == 'horizontal' ? 'middle' : 'top',
                    textAlign: this.dataRangeOption.orient == 'horizontal' ? 'left' : 'center'
                },
                hoverable: false
            };
        },
        _getItemShape: function (x, y, width, height, color) {
            return {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    x: x,
                    y: y + 1,
                    width: width,
                    height: height - 2,
                    color: color
                },
                highlightStyle: {
                    strokeColor: color,
                    lineWidth: 1
                }
            };
        },
        __ondrift: function (shape, dx, dy) {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            if (this.dataRangeOption.orient == 'horizontal') {
                if (shape.style.x + dx <= x) {
                    shape.style.x = x;
                } else if (shape.style.x + dx + shape.style.width >= x + width) {
                    shape.style.x = x + width - shape.style.width;
                } else {
                    shape.style.x += dx;
                }
            } else {
                if (shape.style.y + dy <= y) {
                    shape.style.y = y;
                } else if (shape.style.y + dy + shape.style.height >= y + height) {
                    shape.style.y = y + height - shape.style.height;
                } else {
                    shape.style.y += dy;
                }
            }
            if (shape._type == 'filler') {
                this._syncHandleShape();
            } else {
                this._syncFillerShape(shape);
            }
            if (this.dataRangeOption.realtime) {
                this._dispatchDataRange();
            }
            return true;
        },
        __ondragend: function () {
            this.isDragend = true;
        },
        ondragend: function (param, status) {
            if (!this.isDragend || !param.target) {
                return;
            }
            status.dragOut = true;
            status.dragIn = true;
            if (!this.dataRangeOption.realtime) {
                this._dispatchDataRange();
            }
            status.needRefresh = false;
            this.isDragend = false;
            return;
        },
        _syncShapeFromRange: function () {
            var range = this.dataRangeOption.range || {};
            this._range.end = typeof this._range.end != 'undefined' ? this._range.end : typeof range.start != 'undefined' ? range.start : 0;
            this._range.start = typeof this._range.start != 'undefined' ? this._range.start : typeof range.end != 'undefined' ? range.end : 100;
            if (this._range.start != 100 || this._range.end !== 0) {
                if (this.dataRangeOption.orient == 'horizontal') {
                    var width = this._fillerShape.style.width;
                    this._fillerShape.style.x += width * (100 - this._range.start) / 100;
                    this._fillerShape.style.width = width * (this._range.start - this._range.end) / 100;
                } else {
                    var height = this._fillerShape.style.height;
                    this._fillerShape.style.y += height * (100 - this._range.start) / 100;
                    this._fillerShape.style.height = height * (this._range.start - this._range.end) / 100;
                }
                this.zr.modShape(this._fillerShape.id);
                this._syncHandleShape();
            }
        },
        _syncHandleShape: function () {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            if (this.dataRangeOption.orient == 'horizontal') {
                this._startShape.style.x = this._fillerShape.style.x;
                this._startMask.style.width = this._startShape.style.x - x;
                this._endShape.style.x = this._fillerShape.style.x + this._fillerShape.style.width;
                this._endMask.style.x = this._endShape.style.x;
                this._endMask.style.width = x + width - this._endShape.style.x;
                this._range.start = Math.ceil(100 - (this._startShape.style.x - x) / width * 100);
                this._range.end = Math.floor(100 - (this._endShape.style.x - x) / width * 100);
            } else {
                this._startShape.style.y = this._fillerShape.style.y;
                this._startMask.style.height = this._startShape.style.y - y;
                this._endShape.style.y = this._fillerShape.style.y + this._fillerShape.style.height;
                this._endMask.style.y = this._endShape.style.y;
                this._endMask.style.height = y + height - this._endShape.style.y;
                this._range.start = Math.ceil(100 - (this._startShape.style.y - y) / height * 100);
                this._range.end = Math.floor(100 - (this._endShape.style.y - y) / height * 100);
            }
            this._syncShape();
        },
        _syncFillerShape: function (e) {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            var a;
            var b;
            if (this.dataRangeOption.orient == 'horizontal') {
                a = this._startShape.style.x;
                b = this._endShape.style.x;
                if (e.id == this._startShape.id && a >= b) {
                    b = a;
                    this._endShape.style.x = a;
                } else if (e.id == this._endShape.id && a >= b) {
                    a = b;
                    this._startShape.style.x = a;
                }
                this._fillerShape.style.x = a;
                this._fillerShape.style.width = b - a;
                this._startMask.style.width = a - x;
                this._endMask.style.x = b;
                this._endMask.style.width = x + width - b;
                this._range.start = Math.ceil(100 - (a - x) / width * 100);
                this._range.end = Math.floor(100 - (b - x) / width * 100);
            } else {
                a = this._startShape.style.y;
                b = this._endShape.style.y;
                if (e.id == this._startShape.id && a >= b) {
                    b = a;
                    this._endShape.style.y = a;
                } else if (e.id == this._endShape.id && a >= b) {
                    a = b;
                    this._startShape.style.y = a;
                }
                this._fillerShape.style.y = a;
                this._fillerShape.style.height = b - a;
                this._startMask.style.height = a - y;
                this._endMask.style.y = b;
                this._endMask.style.height = y + height - b;
                this._range.start = Math.ceil(100 - (a - y) / height * 100);
                this._range.end = Math.floor(100 - (b - y) / height * 100);
            }
            this._syncShape();
        },
        _syncShape: function () {
            this._startShape.position = [
                this._startShape.style.x - this._startShape.style._x,
                this._startShape.style.y - this._startShape.style._y
            ];
            this._startShape.style.text = this._textFormat(this._gap * this._range.start + this.dataRangeOption.min);
            this._startShape.style.color = this._startShape.highlightStyle.strokeColor = this.getColor(this._gap * this._range.start + this.dataRangeOption.min);
            this._endShape.position = [
                this._endShape.style.x - this._endShape.style._x,
                this._endShape.style.y - this._endShape.style._y
            ];
            this._endShape.style.text = this._textFormat(this._gap * this._range.end + this.dataRangeOption.min);
            this._endShape.style.color = this._endShape.highlightStyle.strokeColor = this.getColor(this._gap * this._range.end + this.dataRangeOption.min);
            this.zr.modShape(this._startShape.id);
            this.zr.modShape(this._endShape.id);
            this.zr.modShape(this._startMask.id);
            this.zr.modShape(this._endMask.id);
            this.zr.modShape(this._fillerShape.id);
            this.zr.refreshNextFrame();
        },
        _dispatchDataRange: function () {
            this.messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE, null, {
                range: {
                    start: this._range.end,
                    end: this._range.start
                }
            }, this.myChart);
        },
        __dataRangeSelected: function (param) {
            if (this.dataRangeOption.selectedMode === 'single') {
                for (var k in this._selectedMap) {
                    this._selectedMap[k] = false;
                }
            }
            var idx = param.target._idx;
            this._selectedMap[idx] = !this._selectedMap[idx];
            var valueMax = (this._colorList.length - idx) * this._gap + this.dataRangeOption.min;
            this.messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE_SELECTED, param.event, {
                selected: this._selectedMap,
                target: idx,
                valueMax: valueMax,
                valueMin: valueMax - this._gap
            }, this.myChart);
            this.messageCenter.dispatch(ecConfig.EVENT.REFRESH, null, null, this.myChart);
        },
        __dispatchHoverLink: function (param) {
            var valueMin;
            var valueMax;
            if (this.dataRangeOption.calculable) {
                var totalValue = this.dataRangeOption.max - this.dataRangeOption.min;
                var curValue;
                if (this.dataRangeOption.orient == 'horizontal') {
                    curValue = (1 - (zrEvent.getX(param.event) - this._calculableLocation.x) / this._calculableLocation.width) * totalValue;
                } else {
                    curValue = (1 - (zrEvent.getY(param.event) - this._calculableLocation.y) / this._calculableLocation.height) * totalValue;
                }
                valueMin = curValue - totalValue * 0.05;
                valueMax = curValue + totalValue * 0.05;
            } else {
                var idx = param.target._idx;
                valueMax = (this._colorList.length - idx) * this._gap + this.dataRangeOption.min;
                valueMin = valueMax - this._gap;
            }
            this.messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE_HOVERLINK, param.event, {
                valueMin: valueMin,
                valueMax: valueMax
            }, this.myChart);
            return;
        },
        __onhoverlink: function (param) {
            if (this.dataRangeOption.show && this.dataRangeOption.hoverLink && this._indicatorShape && param && param.seriesIndex != null && param.dataIndex != null) {
                var curValue = param.value;
                if (curValue === '' || isNaN(curValue)) {
                    return;
                }
                if (curValue < this.dataRangeOption.min) {
                    curValue = this.dataRangeOption.min;
                } else if (curValue > this.dataRangeOption.max) {
                    curValue = this.dataRangeOption.max;
                }
                if (this.dataRangeOption.orient == 'horizontal') {
                    this._indicatorShape.position = [
                        (this.dataRangeOption.max - curValue) / (this.dataRangeOption.max - this.dataRangeOption.min) * this._calculableLocation.width,
                        0
                    ];
                } else {
                    this._indicatorShape.position = [
                        0,
                        (this.dataRangeOption.max - curValue) / (this.dataRangeOption.max - this.dataRangeOption.min) * this._calculableLocation.height
                    ];
                }
                this._indicatorShape.style.text = this._textFormat(param.value);
                this._indicatorShape.style.color = this.getColor(curValue);
                this.zr.addHoverShape(this._indicatorShape);
            }
        },
        _textFormat: function (valueStart, valueEnd) {
            valueStart = valueStart.toFixed(this.dataRangeOption.precision);
            valueEnd = valueEnd != null ? valueEnd.toFixed(this.dataRangeOption.precision) : '';
            if (this.dataRangeOption.formatter) {
                if (typeof this.dataRangeOption.formatter == 'string') {
                    return this.dataRangeOption.formatter.replace('{value}', valueStart).replace('{value2}', valueEnd);
                } else if (typeof this.dataRangeOption.formatter == 'function') {
                    return this.dataRangeOption.formatter.call(this.myChart, valueStart, valueEnd);
                }
            }
            if (valueEnd !== '') {
                return valueStart + ' - ' + valueEnd;
            }
            return valueStart;
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.option.dataRange = this.reformOption(this.option.dataRange);
                this.dataRangeOption = this.option.dataRange;
                if (!this.myChart.canvasSupported) {
                    this.dataRangeOption.realtime = false;
                }
                var splitNumber = this.dataRangeOption.splitNumber <= 0 || this.dataRangeOption.calculable ? 100 : this.dataRangeOption.splitNumber;
                this._colorList = zrColor.getGradientColors(this.dataRangeOption.color, Math.max((splitNumber - this.dataRangeOption.color.length) / (this.dataRangeOption.color.length - 1), 0) + 1);
                if (this._colorList.length > splitNumber) {
                    var len = this._colorList.length;
                    var newColorList = [this._colorList[0]];
                    var step = len / (splitNumber - 1);
                    for (var i = 1; i < splitNumber - 1; i++) {
                        newColorList.push(this._colorList[Math.floor(i * step)]);
                    }
                    newColorList.push(this._colorList[len - 1]);
                    this._colorList = newColorList;
                }
                var precision = this.dataRangeOption.precision;
                this._gap = (this.dataRangeOption.max - this.dataRangeOption.min) / splitNumber;
                while (this._gap.toFixed(precision) - 0 != this._gap && precision < 5) {
                    precision++;
                }
                this.dataRangeOption.precision = precision;
                this._gap = ((this.dataRangeOption.max - this.dataRangeOption.min) / splitNumber).toFixed(precision) - 0;
                this._valueTextList = [];
                for (var i = 0; i < splitNumber; i++) {
                    this._selectedMap[i] = true;
                    this._valueTextList.unshift(this._textFormat(i * this._gap + this.dataRangeOption.min, (i + 1) * this._gap + this.dataRangeOption.min));
                }
            }
            this.clear();
            this._buildShape();
        },
        getColor: function (value) {
            if (isNaN(value)) {
                return null;
            }
            if (this.dataRangeOption.min == this.dataRangeOption.max) {
                return this._colorList[0];
            }
            if (value < this.dataRangeOption.min) {
                value = this.dataRangeOption.min;
            } else if (value > this.dataRangeOption.max) {
                value = this.dataRangeOption.max;
            }
            if (this.dataRangeOption.calculable) {
                if (value - (this._gap * this._range.start + this.dataRangeOption.min) > 0.00005 || value - (this._gap * this._range.end + this.dataRangeOption.min) < -0.00005) {
                    return null;
                }
            }
            var idx = this._colorList.length - Math.ceil((value - this.dataRangeOption.min) / (this.dataRangeOption.max - this.dataRangeOption.min) * this._colorList.length);
            if (idx == this._colorList.length) {
                idx--;
            }
            if (this._selectedMap[idx]) {
                return this._colorList[idx];
            } else {
                return null;
            }
        },
        getColorByIndex: function (idx) {
            if (idx >= this._colorList.length) {
                idx = this._colorList.length - 1;
            } else if (idx < 0) {
                idx = 0;
            }
            return this._colorList[idx];
        },
        onbeforDispose: function () {
            this.messageCenter.unbind(ecConfig.EVENT.HOVER, this._onhoverlink);
        }
    };
    zrUtil.inherits(DataRange, Base);
    require('../component').define('dataRange', DataRange);
    return DataRange;
});define('echarts/util/shape/HandlePolygon', [
    'require',
    'zrender/shape/Base',
    'zrender/shape/Polygon',
    'zrender/tool/util'
], function (require) {
    var Base = require('zrender/shape/Base');
    var PolygonShape = require('zrender/shape/Polygon');
    var zrUtil = require('zrender/tool/util');
    function HandlePolygon(options) {
        Base.call(this, options);
    }
    HandlePolygon.prototype = {
        type: 'handle-polygon',
        buildPath: function (ctx, style) {
            PolygonShape.prototype.buildPath(ctx, style);
        },
        isCover: function (x, y) {
            var originPos = this.getTansform(x, y);
            x = originPos[0];
            y = originPos[1];
            var rect = this.style.rect;
            if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
                return true;
            } else {
                return false;
            }
        }
    };
    zrUtil.inherits(HandlePolygon, Base);
    return HandlePolygon;
});
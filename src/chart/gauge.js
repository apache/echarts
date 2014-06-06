/**
 * echarts图表类：仪表盘
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');
    
    // 图形依赖
    var GaugePointerShape = require('../util/shape/GaugePointer');
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var RectangleShape = require('zrender/shape/Rectangle');
    var CircleShape = require('zrender/shape/Circle');
    var SectorShape = require('zrender/shape/Sector');

    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var number = require('../util/number');
    var zrUtil = require('zrender/tool/util');
    var zrMath = require('zrender/tool/math');
    var zrColor = require('zrender/tool/color');
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Gauge(ecTheme, messageCenter, zr, option, myChart){
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);
        // 复用参数索引
        this.paramsMap = {};
        this.refresh(option);
    }
    
    Gauge.prototype = {
        type : ecConfig.CHART_TYPE_GAUGE,
        /**
         * 绘制图形
         */
        _buildShape : function () {
            var series = this.series;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_GAUGE) {
                    series[i] = this.reformOption(series[i]);
                    this._buildSingleGauge(i);
                    this.buildMark(i);
                }
            }

            this.addShapeList();
        },
        
        /**
         * 构建单个仪表盘
         *
         * @param {number} seriesIndex 系列索引
         */
        _buildSingleGauge : function (seriesIndex) {
            var serie = this.series[seriesIndex];

            this.paramsMap[seriesIndex] = {
                center : this.parseCenter(this.zr, serie.center),
                radius : this.parseRadius(this.zr, serie.radius),
                startAngle : serie.startAngle.toFixed(2) - 0,
                endAngle : serie.endAngle.toFixed(2) - 0
            };
            this.paramsMap[seriesIndex].totalAngle = this.paramsMap[seriesIndex].startAngle
                                                   - this.paramsMap[seriesIndex].endAngle;
            
            this._colorMap(seriesIndex);
            
            this._buildAxisLine(seriesIndex);
            
            this._buildSplitLine(seriesIndex);
            
            this._buildAxisTick(seriesIndex);
            
            this._buildAxisLabel(seriesIndex);
            
            this._buildPointer(seriesIndex);
            
            this._buildTitle(seriesIndex);
            
            this._buildDetail(seriesIndex);
        },
        
        // 轴线
        _buildAxisLine : function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.axisLine.show) {
                return
            }
            var min         = serie.min;
            var total       = serie.max - min;
            var params      = this.paramsMap[seriesIndex];
            var center      = params.center;
            var startAngle  = params.startAngle;
            var totalAngle  = params.totalAngle;
            var colorArray  = params.colorArray;
            var lineWidth   = serie.axisLine.lineStyle.width;
            var r           = params.radius[1];
            var r0          = r - lineWidth;
            
            var sectorShape;
            var len = colorArray.length;
            var lastAngle = startAngle;
            var newAngle;
            for (var i = 0, l = colorArray.length; i < l; i++) {
                newAngle = startAngle - totalAngle * colorArray[i][0] / total;
                sectorShape = this._getSector(
                    center, r0, r, 
                    newAngle,     // startAngle
                    lastAngle,                                             // endAngle
                    colorArray[i][1]                                        // color
                );
                lastAngle = newAngle;
                sectorShape._animationAdd = 'r';
                ecData.set(sectorShape, 'seriesIndex', seriesIndex);
                ecData.set(sectorShape, 'dataIndex', i);
                this.shapeList.push(sectorShape);
            }
        },
        
        // 坐标轴分割线
        _buildSplitLine : function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.axisLine.show) {
                return
            }
            
            var splitNumber = serie.splitNumber;
            var min         = serie.min;
            var total       = serie.max - min;
            var splitLine   = serie.splitLine;
            var length      = splitLine.length;
            var lineType    = splitLine.lineStyle.type;
            var lineWidth   = splitLine.lineStyle.width;
            var color       = splitLine.lineStyle.color;
            
            var params = this.paramsMap[seriesIndex];
            var center = params.center;
            var startAngle = params.startAngle * Math.PI / 180;
            var totalAngle = params.totalAngle * Math.PI / 180;
            var r = params.radius[1];
            var r0 = r - length;
            
            var axShape;
            var angle;
            var sinAngle;
            var cosAngle;
            for (var i = 0; i <= splitNumber; i++) {
                angle = startAngle - totalAngle / splitNumber * i;
                sinAngle = Math.sin(angle);
                cosAngle = Math.cos(angle);
                this.shapeList.push(new LineShape({
                    zlevel : this._zlevelBase + 1,
                    hoverable : false,
                    style : {
                        xStart : center[0] + cosAngle * r,
                        yStart : center[1] - sinAngle * r,
                        xEnd : center[0] + cosAngle * r0,
                        yEnd : center[1] - sinAngle * r0,
                        strokeColor : color == 'auto' 
                                      ? this._getColor(seriesIndex, min + total / splitNumber * i)
                                      : color,
                        lineType : lineType,
                        lineWidth : lineWidth
                    }
                }));
            }
        },
        
        // 小标记
        _buildAxisTick : function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.axisTick.show) {
                return
            }
            
            var splitNumber = serie.splitNumber;
            var min         = serie.min;
            var total       = serie.max - min;
            var axisTick    = serie.axisTick;
            var tickSplit   = axisTick.splitNumber;
            var length      = axisTick.length;
            var lineType    = axisTick.lineStyle.type;
            var lineWidth   = axisTick.lineStyle.width;
            var color       = axisTick.lineStyle.color;
            
            var params = this.paramsMap[seriesIndex];
            var center = params.center;
            var startAngle = params.startAngle * Math.PI / 180;
            var totalAngle = params.totalAngle * Math.PI / 180;
            var r = params.radius[1];
            var r0 = r - length;
            
            var axShape;
            var angle;
            var sinAngle;
            var cosAngle;
            for (var i = 0, l = splitNumber * tickSplit; i <= l; i++) {
                if (i % tickSplit == 0) {   // 同splitLine
                    continue;
                }
                angle = startAngle - totalAngle / l * i;
                sinAngle = Math.sin(angle);
                cosAngle = Math.cos(angle);
                this.shapeList.push(new LineShape({
                    zlevel : this._zlevelBase + 1,
                    hoverable : false,
                    style : {
                        xStart : center[0] + cosAngle * r,
                        yStart : center[1] - sinAngle * r,
                        xEnd : center[0] + cosAngle * r0,
                        yEnd : center[1] - sinAngle * r0,
                        strokeColor : color == 'auto' 
                                      ? this._getColor(seriesIndex, min + total / l * i)
                                      : color,
                        lineType : lineType,
                        lineWidth : lineWidth
                    }
                }));
            }
        },
        
        // 坐标轴文本
        _buildAxisLabel : function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.axisLabel.show) {
                return
            }
            
            var splitNumber = serie.splitNumber;
            var min         = serie.min;
            var total       = serie.max - min;
            var textStyle   = serie.axisLabel.textStyle;
            var textFont    = this.getFont(textStyle);
            var color       = textStyle.color;
            
            var params = this.paramsMap[seriesIndex];
            var center = params.center;
            var startAngle = params.startAngle;
            var totalAngle = params.totalAngle;
            var r0 = params.radius[1] - serie.splitLine.length - 10;
            var axShape;
            var angle;
            var sinAngle;
            var cosAngle;
            var value;
            for (var i = 0; i <= splitNumber; i++) {
                value = min + total / splitNumber * i;
                angle = startAngle - totalAngle / splitNumber * i;
                sinAngle = Math.sin(angle * Math.PI / 180);
                cosAngle = Math.cos(angle * Math.PI / 180);
                angle = (angle + 360) % 360;
                this.shapeList.push(new TextShape({
                    zlevel : this._zlevelBase,
                    hoverable : false,
                    style : {
                        x : center[0] + cosAngle * r0,
                        y : center[1] - sinAngle * r0,
                        color : color == 'auto' ? this._getColor(seriesIndex, value) : color,
                        text : this._getLabelText(serie.axisLabel.formatter, value),
                        textAlign : (angle >= 100 && angle <= 260)
                                    ? 'left' 
                                    : (angle <= 80 || angle >= 280)
                                        ? 'right'
                                        : 'center',
                        textBaseline : (angle >= 10 && angle <= 170)
                                       ? 'top' 
                                       : (angle >= 190 && angle <= 350)
                                            ? 'bottom'
                                            : 'middle',
                        textFont : textFont
                    }
                }));
            }
        },
        
        _buildPointer : function (seriesIndex) {
            var serie       = this.series[seriesIndex];
            var total       = serie.max - serie.min;
            var pointer     = serie.pointer;
            var lineWidth   = pointer.width;
            
            var params = this.paramsMap[seriesIndex];
            var length = number.parsePercent(pointer.length, params.radius[1]);
            var center = params.center;
            var value = this._getValue(seriesIndex);
            value = value < serie.max ? value : serie.max;
            
            var angle  = (params.startAngle - params.totalAngle / total * value) * Math.PI / 180;
            var color = pointer.color == 'auto' 
                        ? this._getColor(seriesIndex, value) : pointer.color;
            
            var pointShape = new GaugePointerShape({
                zlevel : this._zlevelBase,
                style : {
                    x : center[0],
                    y : center[1],
                    r : length,
                    startAngle : params.startAngle * Math.PI / 180,
                    angle : angle,
                    color : color,
                    width : pointer.width
                },
                highlightStyle : {
                    brushType : 'fill',
                    width : pointer.width > 2 ? 2 : (pointer.width / 2),
                    color : '#fff'
                }
            });
            ecData.pack(
                pointShape,
                this.series[seriesIndex], seriesIndex,
                this.series[seriesIndex].data[0], 0,
                this.series[seriesIndex].data[0].name,
                value
            );
            this.shapeList.push(pointShape);
            
            this.shapeList.push(new CircleShape({
                zlevel : this._zlevelBase + 1,
                hoverable : false,
                style : {
                    x : center[0],
                    y : center[1],
                    r : pointer.width / 2.5,
                    color : '#fff'
                }
            }));
        },
        
        _buildTitle : function(seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.title.show) {
                return
            }
            
            var data = serie.data[0];
            var name = typeof data.name != 'undefined' ? data.name : '';
            if (name !== '') {
                var title           = serie.title;
                var offsetCenter    = title.offsetCenter;
                var textColor       = title.textStyle.color;
                var params          = this.paramsMap[seriesIndex];
                this.shapeList.push(new TextShape({
                    zlevel : this._zlevelBase,
                    hoverable : false,
                    style : {
                        x : params.center[0] 
                            + number.parsePercent(offsetCenter[0], params.radius[1]),
                        y : params.center[1] 
                            + number.parsePercent(offsetCenter[1], params.radius[1]),
                        color: textColor == 'auto' ? this._getColor(seriesIndex) : textColor,
                        text: name,
                        textAlign: 'center',
                        textFont : this.getFont(title.textStyle)
                    }
                }));
            }
        },
        
        _buildDetail : function(seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.detail.show) {
                return
            }
            
            var detail          = serie.detail;
            var offsetCenter    = detail.offsetCenter;
            var color           = detail.backgroundColor;
            var textColor       = detail.textStyle.color;
                
            var params = this.paramsMap[seriesIndex];
            var value = this._getValue(seriesIndex);
            this.shapeList.push(new RectangleShape({
                zlevel : this._zlevelBase,
                hoverable : false,
                style : {
                    x : params.center[0] - detail.width / 2 
                        + number.parsePercent(offsetCenter[0], params.radius[1]),
                    y : params.center[1] 
                        + number.parsePercent(offsetCenter[1], params.radius[1]),
                    width : detail.width,
                    height : detail.height,
                    brushType: 'both',
                    color: color == 'auto' ? this._getColor(seriesIndex, value) : color,
                    lineWidth : detail.borderWidth,
                    strokeColor : detail.borderColor,
                    
                    text: this._getLabelText(detail.formatter, value),
                    textFont: this.getFont(detail.textStyle),
                    textPosition: 'inside',
                    textColor : textColor == 'auto' ? this._getColor(seriesIndex, value) : textColor
                }
            }));
        },
        
        _getValue : function(seriesIndex) {
            var data = this.series[seriesIndex].data[0];
            return typeof data.value != 'undefined' ? data.value : data;
        },
        
        /**
         * 颜色索引 
         */
        _colorMap : function (seriesIndex) {
            var serie = this.series[seriesIndex];
            var min = serie.min;
            var total = serie.max - min;
            var color = serie.axisLine.lineStyle.color;
            if (!(color instanceof Array)) {
                color = [[1, color]];
            }
            var colorArray = [];
            for (var i = 0, l = color.length; i < l; i++) {
                colorArray.push([color[i][0] * total + min, color[i][1]]);
            }
            this.paramsMap[seriesIndex].colorArray = colorArray;
        },
        
        /**
         * 自动颜色 
         */
        _getColor : function (seriesIndex, value) {
            if (typeof value == 'undefined') {
                value = this._getValue(seriesIndex);
            }
            
            var colorArray = this.paramsMap[seriesIndex].colorArray;
            for (var i = 0, l = colorArray.length; i < l; i++) {
                if (colorArray[i][0] >= value) {
                    return colorArray[i][1];
                }
            }
            return colorArray[colorArray.length - 1][1];
        },
        
        /**
         * 构建扇形
         */
        _getSector : function (center, r0, r, startAngle, endAngle, color) {
            return new SectorShape ({
                zlevel : this._zlevelBase,
                hoverable : false,
                style : {
                    x : center[0],      // 圆心横坐标
                    y : center[1],      // 圆心纵坐标
                    r0 : r0,            // 圆环内半径
                    r : r,              // 圆环外半径
                    startAngle : startAngle,
                    endAngle : endAngle,
                    brushType : 'fill',
                    color : color
                }
            });
        },

        /**
         * 根据lable.format计算label text
         */
        _getLabelText : function (formatter, value) {
            if (formatter) {
                if (typeof formatter == 'function') {
                    return formatter(value);
                }
                else if (typeof formatter == 'string') {
                    return formatter.replace('{value}', value);
                }
            }
            return value;
        },
        
        /**
         * 刷新
         */
        refresh : function (newOption) {
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
    
    // 图表注册
    require('../chart').define('gauge', Gauge);
    
    return Gauge;
});
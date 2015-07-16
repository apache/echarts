/**
 * echarts图表类：仪表盘
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *
 */
define(function (require) {
    var ChartBase = require('./base');
    
    // 图形依赖
    var GaugePointerShape = require('../util/shape/GaugePointer');
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var RectangleShape = require('zrender/shape/Rectangle');
    var CircleShape = require('zrender/shape/Circle');
    var SectorShape = require('zrender/shape/Sector');

    var ecConfig = require('../config');
    // 仪表盘默认参数
    ecConfig.gauge = {
        zlevel: 0,                  // 一级层叠
        z: 2,                       // 二级层叠
        center: ['50%', '50%'],    // 默认全局居中
        clickable: true,
        legendHoverLink: true,
        radius: '75%',
        startAngle: 225,
        endAngle: -45,
        min: 0,                     // 最小值
        max: 100,                   // 最大值
        splitNumber: 10,            // 分割段数，默认为10
        axisLine: {            // 坐标轴线
            show: true,        // 默认显示，属性show控制显示与否
            lineStyle: {       // 属性lineStyle控制线条样式
                color: [[0.2, '#228b22'],[0.8, '#48b'],[1, '#ff4500']], 
                width: 30
            }
        },
        axisTick: {            // 坐标轴小标记
            show: true,        // 属性show控制显示与否，默认不显示
            splitNumber: 5,    // 每份split细分多少段
            length :8,         // 属性length控制线长
            lineStyle: {       // 属性lineStyle控制线条样式
                color: '#eee',
                width: 1,
                type: 'solid'
            }
        },
        axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
            show: true,
            // formatter: null,
            textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                color: 'auto'
            }
        },
        splitLine: {           // 分隔线
            show: true,        // 默认显示，属性show控制显示与否
            length :30,         // 属性length控制线长
            lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                color: '#eee',
                width: 2,
                type: 'solid'
            }
        },
        pointer: {
            show: true,
            length: '80%',
            width: 8,
            color: 'auto'
        },
        title: {
            show: true,
            offsetCenter: [0, '-40%'],      // x, y，单位px
            textStyle: {                    // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                color: '#333',
                fontSize: 15
            }
        },
        detail: {
            show: true,
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 0,
            borderColor: '#ccc',
            width: 100,
            height: 40,
            offsetCenter: [0, '40%'],   // x, y，单位px
            // formatter: null,
            textStyle: {                // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                color: 'auto',
                fontSize: 30
            }
        }
    };

    var ecData = require('../util/ecData');
    var accMath = require('../util/accMath');
    var zrUtil = require('zrender/tool/util');
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Gauge(ecTheme, messageCenter, zr, option, myChart) {
        // 图表基类
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    
    Gauge.prototype = {
        type: ecConfig.CHART_TYPE_GAUGE,
        /**
         * 绘制图形
         */
        _buildShape: function () {
            var series = this.series;
            // 复用参数索引
            this._paramsMap = {};
            this.selectedMap = {};
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_GAUGE) {
                    //仪表图不用去legend 获取状态，默认这里给的true 
                    this.selectedMap[series[i].name] = true;
                    series[i] = this.reformOption(series[i]);
                    this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
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
        _buildSingleGauge: function (seriesIndex) {
            var serie = this.series[seriesIndex];

            this._paramsMap[seriesIndex] = {
                center: this.parseCenter(this.zr, serie.center),
                radius: this.parseRadius(this.zr, serie.radius),
                startAngle: serie.startAngle.toFixed(2) - 0,
                endAngle: serie.endAngle.toFixed(2) - 0
            };
            this._paramsMap[seriesIndex].totalAngle = this._paramsMap[seriesIndex].startAngle
                                                    - this._paramsMap[seriesIndex].endAngle;
            
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
                sectorShape = this._getSector(
                    center, r0, r, 
                    newAngle,           // startAngle
                    lastAngle,          // endAngle
                    colorArray[i][1],   // color
                    lineStyle,
                    serie.zlevel,
                    serie.z
                );
                lastAngle = newAngle;
                sectorShape._animationAdd = 'r';
                ecData.set(sectorShape, 'seriesIndex', seriesIndex);
                ecData.set(sectorShape, 'dataIndex', i);
                this.shapeList.push(sectorShape);
            }
        },
        
        // 坐标轴分割线
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
                    zlevel: serie.zlevel,
                    z: serie.z + 1,
                    hoverable: false,
                    style: {
                        xStart: center[0] + cosAngle * r,
                        yStart: center[1] - sinAngle * r,
                        xEnd: center[0] + cosAngle * r0,
                        yEnd: center[1] - sinAngle * r0,
                        strokeColor: color === 'auto' 
                                     ? this._getColor(seriesIndex, min + total / splitNumber * i)
                                     : color,
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
        
        // 小标记
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
                if (i % tickSplit === 0) {   // 同splitLine
                    continue;
                }
                angle = startAngle - totalAngle / l * i;
                sinAngle = Math.sin(angle);
                cosAngle = Math.cos(angle);
                this.shapeList.push(new LineShape({
                    zlevel: serie.zlevel,
                    z: serie.z + 1,
                    hoverable: false,
                    style: {
                        xStart: center[0] + cosAngle * r,
                        yStart: center[1] - sinAngle * r,
                        xEnd: center[0] + cosAngle * r0,
                        yEnd: center[1] - sinAngle * r0,
                        strokeColor: color === 'auto' 
                                     ? this._getColor(seriesIndex, min + total / l * i)
                                     : color,
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
        
        // 坐标轴文本
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
            var r0 = params.radius[1] 
                     - this.parsePercent(serie.splitLine.length, params.radius[1])
                     - 5;
            
            var angle;
            var sinAngle;
            var cosAngle;
            var value;
            for (var i = 0; i <= splitNumber; i++) {
                value = accMath.accAdd(
                            min , accMath.accMul(accMath.accDiv(total , splitNumber), i)
                        );
                angle = startAngle - totalAngle / splitNumber * i;
                sinAngle = Math.sin(angle * Math.PI / 180);
                cosAngle = Math.cos(angle * Math.PI / 180);
                angle = (angle + 360) % 360;
                this.shapeList.push(new TextShape({
                    zlevel: serie.zlevel,
                    z: serie.z + 1,
                    hoverable: false,
                    style: {
                        x: center[0] + cosAngle * r0,
                        y: center[1] - sinAngle * r0,
                        color: color === 'auto' ? this._getColor(seriesIndex, value) : color,
                        text: this._getLabelText(serie.axisLabel.formatter, value),
                        textAlign: (angle >= 110 && angle <= 250)
                                   ? 'left' 
                                   : (angle <= 70 || angle >= 290)
                                       ? 'right'
                                       : 'center',
                        textBaseline: (angle >= 10 && angle <= 170)
                                      ? 'top' 
                                      : (angle >= 190 && angle <= 350)
                                          ? 'bottom'
                                          : 'middle',
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
            
            var angle = (params.startAngle - params.totalAngle / total * (value - serie.min))
                        * Math.PI / 180;
            var color = pointer.color === 'auto' 
                        ? this._getColor(seriesIndex, value)
                        : pointer.color;
            
            var pointShape = new GaugePointerShape({
                zlevel: serie.zlevel,
                z: serie.z + 1,
                clickable: this.query(serie, 'clickable'),
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
                    width: width > 2 ? 2 : (width / 2),
                    color: '#fff'
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
                zlevel: serie.zlevel,
                z: serie.z + 2,
                hoverable: false,
                style: {
                    x: center[0],
                    y: center[1],
                    r: pointer.width / 2.5,
                    color: '#fff'
                }
            }));
        },
        
        _buildTitle: function(seriesIndex) {
            var serie = this.series[seriesIndex];
            if (!serie.title.show) {
                return;
            }
            
            var data = serie.data[0];
            var name = data.name != null ? data.name : '';
            if (name !== '') { // 不要帮我代码规范
                var title = serie.title;
                var offsetCenter = title.offsetCenter;
                var textStyle = title.textStyle;
                var textColor = textStyle.color;
                var params = this._paramsMap[seriesIndex];
                var x = params.center[0] + this.parsePercent(offsetCenter[0], params.radius[1]);
                var y = params.center[1] + this.parsePercent(offsetCenter[1], params.radius[1]);
                this.shapeList.push(new TextShape({
                    zlevel: serie.zlevel,
                    z: serie.z + (
                        (Math.abs(x - params.center[0]) + Math.abs(y - params.center[1])) 
                          < textStyle.fontSize * 2 ? 2 : 1
                    ),
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
        
        _buildDetail: function(seriesIndex) {
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
            var x = params.center[0] - detail.width / 2 
                    + this.parsePercent(offsetCenter[0], params.radius[1]);
            var y = params.center[1] 
                    + this.parsePercent(offsetCenter[1], params.radius[1]);
            this.shapeList.push(new RectangleShape({
                zlevel: serie.zlevel,
                z: serie.z + (
                    (Math.abs(x + detail.width / 2 - params.center[0]) 
                     + Math.abs(y + detail.height / 2 - params.center[1])) < textStyle.fontSize 
                    ? 2 : 1
                ),
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
        
        _getValue: function(seriesIndex) {
            return this.getDataFromOption(this.series[seriesIndex].data[0]);
        },
        
        /**
         * 颜色索引 
         */
        _colorMap: function (seriesIndex) {
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
            this._paramsMap[seriesIndex].colorArray = colorArray;
        },
        
        /**
         * 自动颜色 
         */
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
        
        /**
         * 构建扇形
         */
        _getSector: function (center, r0, r, startAngle, endAngle, color, lineStyle, zlevel, z) {
            return new SectorShape ({
                zlevel: zlevel,
                z: z,
                hoverable: false,
                style: {
                    x: center[0],      // 圆心横坐标
                    y: center[1],      // 圆心纵坐标
                    r0: r0,            // 圆环内半径
                    r: r,              // 圆环外半径
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

        /**
         * 根据lable.format计算label text
         */
        _getLabelText: function (formatter, value) {
            if (formatter) {
                if (typeof formatter === 'function') {
                    return formatter.call(this.myChart, value);
                }
                else if (typeof formatter === 'string') {
                    return formatter.replace('{value}', value);
                }
            }
            return value;
        },
        
        /**
         * 刷新
         */
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
    
    // 图表注册
    require('../chart').define('gauge', Gauge);
    
    return Gauge;
});

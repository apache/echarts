/**
 * echarts组件：数据区域缩放
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    var Base = require('./base');
    
    // 图形依赖
    var RectangleShape = require('zrender/shape/Rectangle');
    var PolygonShape = require('zrender/shape/Polygon');
    var IconShape = require('../util/shape/Icon');
    
    var ecConfig = require('../config');
    var zrUtil = require('zrender/tool/util');

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 图表参数
     * @param {Object} component 组件
     */
    function DataZoom(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);

        var self = this;
        self._ondrift = function (dx, dy) {
            return self.__ondrift(this, dx, dy);
        };
        self._ondragend = function () {
            return self.__ondragend();
        };

        this._fillerSize = 28;       // 控件大小，水平布局为高，纵向布局为宽
        this._handleSize = 8;        // 手柄大小
        // this._fillerShae;            // 填充
        // this._startShape;            // 起始手柄
        // this._endShape;              // 结束手柄
        // this._startFrameShape;       // 起始特效边框
        // this._endFrameShape;         // 结束特效边框
        // this._syncTicket;
        this._isSilence = false;
        this._zoom = {};
        // this._originalData;
        
        this.option.dataZoom = this.reformOption(this.option.dataZoom);
        this.zoomOption = this.option.dataZoom;

        // 位置参数，通过计算所得x, y, width, height
        this._location = this._getLocation();
        // 缩放参数
        this._zoom =  this._getZoom();
        this._backupData();
        
        if (this.option.dataZoom.show) {
            this._buildShape();
        }
        this._syncData();
    }
    
    DataZoom.prototype = {
        type : ecConfig.COMPONENT_TYPE_DATAZOOM,
        _buildShape : function () {
            this._buildBackground();
            this._buildFiller();
            this._buildHandle();
            this._buildFrame();

            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                this.zr.addShape(this.shapeList[i]);
            }
            this._syncFrameShape();
        },

        /**
         * 根据选项计算实体的位置坐标
         */
        _getLocation : function () {
            var x;
            var y;
            var width;
            var height;
            var grid = this.component.grid;

            // 不指定则根据grid适配
            if (this.zoomOption.orient == 'horizontal') {
                // 水平布局
                width = this.zoomOption.width || grid.getWidth();
                height = this.zoomOption.height || this._fillerSize;
                x = typeof this.zoomOption.x != 'undefined'
                    ? this.zoomOption.x : grid.getX();
                y = typeof this.zoomOption.y != 'undefined'
                    ? this.zoomOption.y : (this.zr.getHeight() - height - 2);
            }
            else {
                // 垂直布局
                width = this.zoomOption.width || this._fillerSize;
                height = this.zoomOption.height || grid.getHeight();
                x = typeof this.zoomOption.x != 'undefined'
                    ? this.zoomOption.x : 2;
                y = typeof this.zoomOption.y != 'undefined'
                    ? this.zoomOption.y : grid.getY();
            }

            return {
                x : x,
                y : y,
                width : width,
                height : height
            };
        },

        /**
         * 计算缩放参数
         * 修正单坐标轴只传对象为数组。
         */
        _getZoom : function () {
            var series = this.option.series;
            var xAxis = this.option.xAxis;
            if (xAxis && !(xAxis instanceof Array)) {
                xAxis = [xAxis];
                this.option.xAxis = xAxis;
            }
            var yAxis = this.option.yAxis;
            if (yAxis && !(yAxis instanceof Array)) {
                yAxis = [yAxis];
                this.option.yAxis = yAxis;
            }

            var zoomSeriesIndex = [];
            var xAxisIndex;
            var yAxisIndex;

            var zOptIdx = this.zoomOption.xAxisIndex;
            if (xAxis && typeof zOptIdx == 'undefined') {
                xAxisIndex = [];
                for (var i = 0, l = xAxis.length; i < l; i++) {
                    // 横纵默认为类目轴
                    if (xAxis[i].type == 'category'
                        || typeof xAxis[i].type == 'undefined'
                    ) {
                        xAxisIndex.push(i);
                    }
                }
            }
            else {
                if (zOptIdx instanceof Array) {
                    xAxisIndex = zOptIdx;
                }
                else if (typeof zOptIdx != 'undefined') {
                    xAxisIndex = [zOptIdx];
                }
                else {
                    xAxisIndex = [];
                }
            }

            zOptIdx = this.zoomOption.yAxisIndex;
            if (yAxis && typeof zOptIdx == 'undefined') {
                yAxisIndex = [];
                for (var i = 0, l = yAxis.length; i < l; i++) {
                    if (yAxis[i].type == 'category') {
                        yAxisIndex.push(i);
                    }
                }
            }
            else {
                if (zOptIdx instanceof Array) {
                    yAxisIndex = zOptIdx;
                }
                else if (typeof zOptIdx != 'undefined') {
                    yAxisIndex = [zOptIdx];
                }
                else {
                    yAxisIndex = [];
                }
            }

            // 找到缩放控制的所有series
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type != ecConfig.CHART_TYPE_LINE
                    && series[i].type != ecConfig.CHART_TYPE_BAR
                    && series[i].type != ecConfig.CHART_TYPE_SCATTER
                    && series[i].type != ecConfig.CHART_TYPE_K
                ) {
                    continue;
                }
                for (var j = 0, k = xAxisIndex.length; j < k; j++) {
                    if (xAxisIndex[j] == (series[i].xAxisIndex || 0)) {
                        zoomSeriesIndex.push(i);
                        break;
                    }
                }
                for (var j = 0, k = yAxisIndex.length; j < k; j++) {
                    if (yAxisIndex[j] == (series[i].yAxisIndex || 0)) {
                        zoomSeriesIndex.push(i);
                        break;
                    }
                }
                // 不指定接管坐标轴，则散点图被纳入接管范围
                if (series[i].type == ecConfig.CHART_TYPE_SCATTER
                    && typeof this.zoomOption.xAxisIndex == 'undefined'
                    && typeof this.zoomOption.yAxisIndex == 'undefined'
                ) {
                    zoomSeriesIndex.push(i);
                }
            }

            var start = typeof this._zoom.start != 'undefined'
                        ? this._zoom.start
                        : (typeof this.zoomOption.start != 'undefined' ? this.zoomOption.start : 0);
            var end = typeof this._zoom.end != 'undefined'
                      ? this._zoom.end
                      : (typeof this.zoomOption.end != 'undefined' ? this.zoomOption.end : 100);
            /*
            var start = typeof this.zoomOption.start != 'undefined'
                        && this.zoomOption.start >= 0
                        && this.zoomOption.start <= 100
                        ? this.zoomOption.start : 0;
            var end = typeof this.zoomOption.end != 'undefined'
                      && this.zoomOption.end >= 0
                      && this.zoomOption.end <= 100
                      ? this.zoomOption.end : 100;
            */
            if (start > end) {
                // 大小颠倒自动翻转
                start = start + end;
                end = start - end;
                start = start - end;
            }
            var size = Math.round(
                           (end - start) / 100
                           * (this.zoomOption.orient == 'horizontal'
                             ? this._location.width : this._location.height)
                       );
            return {
                start : start,
                end : end,
                start2 : 0,
                end2 : 100,
                size : size,
                xAxisIndex : xAxisIndex,
                yAxisIndex : yAxisIndex,
                seriesIndex : zoomSeriesIndex,
                scatterMap : this._zoom.scatterMap || {}
            };
        },

        _backupData : function () {
            this._originalData = {
                xAxis : {},
                yAxis : {},
                series : {}
            };
            var xAxis = this.option.xAxis;
            var xAxisIndex = this._zoom.xAxisIndex;
            for (var i = 0, l = xAxisIndex.length; i < l; i++) {
                this._originalData.xAxis[xAxisIndex[i]] = xAxis[xAxisIndex[i]].data;
            }

            var yAxis = this.option.yAxis;
            var yAxisIndex = this._zoom.yAxisIndex;
            for (var i = 0, l = yAxisIndex.length; i < l; i++) {
                this._originalData.yAxis[yAxisIndex[i]] = yAxis[yAxisIndex[i]].data;
            }

            var series = this.option.series;
            var seriesIndex = this._zoom.seriesIndex;
            var serie;
            for (var i = 0, l = seriesIndex.length; i < l; i++) {
                serie = series[seriesIndex[i]];
                this._originalData.series[seriesIndex[i]] = serie.data;
                if (serie.type == ecConfig.CHART_TYPE_SCATTER) {
                    this._calculScatterMap(seriesIndex[i]);
                }
            }
        },
        
        _calculScatterMap : function (seriesIndex) {
            this._zoom.scatterMap = this._zoom.scatterMap || {};
            this._zoom.scatterMap[seriesIndex] = this._zoom.scatterMap[seriesIndex] || {};
            var componentLibrary = require('../component');
            // x轴极值
            var Axis = componentLibrary.get('axis');
            var axisOption = zrUtil.clone(this.option.xAxis);
            if (axisOption instanceof Array) {
                axisOption[0].type = 'value';
                axisOption[0].boundary = [0, 0];
                axisOption[1] && (axisOption[1].type = 'value', axisOption[1].boundary = [0, 0]);
            }
            else {
                axisOption.type = 'value';
                axisOption.boundary = [0, 0];
            }
            var vAxis = new Axis(
                this.ecTheme,
                null,   // messageCenter
                false,  // this.zr
                {
                    xAxis: axisOption,
                    series : this.option.series
                }, 
                this,
                'xAxis'
            );
            var axisIndex = this.option.series[seriesIndex].xAxisIndex || 0;
            this._zoom.scatterMap[seriesIndex].x = vAxis.getAxis(axisIndex).getExtremum();
            vAxis.dispose();
            
            // y轴极值
            axisOption = zrUtil.clone(this.option.yAxis);
            if (axisOption instanceof Array) {
                axisOption[0].type = 'value';
                axisOption[1] && (axisOption[1].type = 'value', axisOption[1].boundary = [0, 0]);
            }
            else {
                axisOption.type = 'value';
                axisOption.boundary = [0, 0];
            }
            vAxis = new Axis(
                this.ecTheme,
                null,   // messageCenter
                false,  // this.zr
                {
                    yAxis: axisOption,
                    series : this.option.series
                }, 
                this,
                'yAxis'
            );
            axisIndex = this.option.series[seriesIndex].yAxisIndex || 0;
            this._zoom.scatterMap[seriesIndex].y = vAxis.getAxis(axisIndex).getExtremum();
            vAxis.dispose();
            // console.log(this._zoom.scatterMap);
        },

        _buildBackground : function () {
            var width = this._location.width;
            var height = this._location.height;
            
            // 背景
            this.shapeList.push(new RectangleShape({
                zlevel : this._zlevelBase,
                hoverable :false,
                style : {
                    x : this._location.x,
                    y : this._location.y,
                    width : width,
                    height : height,
                    color : this.zoomOption.backgroundColor
                }
            }));
            
            // 数据阴影
            var maxLength = 0;
            var xAxis = this._originalData.xAxis;
            var xAxisIndex = this._zoom.xAxisIndex;
            for (var i = 0, l = xAxisIndex.length; i < l; i++) {
                maxLength = Math.max(
                    maxLength, xAxis[xAxisIndex[i]].length
                );
            }
            var yAxis = this._originalData.yAxis;
            var yAxisIndex = this._zoom.yAxisIndex;
            for (var i = 0, l = yAxisIndex.length; i < l; i++) {
                maxLength = Math.max(
                    maxLength, yAxis[yAxisIndex[i]].length
                );
            }

            var seriesIndex = this._zoom.seriesIndex[0];
            var data = this._originalData.series[seriesIndex];
            var maxValue = Number.MIN_VALUE;
            var minValue = Number.MAX_VALUE;
            var value;
            for (var i = 0, l = data.length; i < l; i++) {
                value = typeof data[i] != 'undefined'
                        ? (typeof data[i].value != 'undefined' ? data[i].value : data[i])
                        : 0;
                if (this.option.series[seriesIndex].type == ecConfig.CHART_TYPE_K) {
                    value = value[1];   // 收盘价
                }
                if (isNaN(value)) {
                    value = 0;
                }
                maxValue = Math.max(maxValue, value);
                minValue = Math.min(minValue, value);
            }
            var valueRange = maxValue - minValue;

            var pointList = [];
            var x = width / (maxLength - (maxLength > 1 ? 1 : 0));
            var y = height / (maxLength - (maxLength > 1 ? 1 : 0));
            var step = 1;
            if (this.zoomOption.orient == 'horizontal' && x < 1) {
                step = Math.floor(maxLength * 3 / width);
            }
            else if (this.zoomOption.orient == 'vertical' && y < 1){
                step = Math.floor(maxLength * 3 / height);
            }
            
            for (var i = 0, l = maxLength; i < l; i += step) {
                value = typeof data[i] != 'undefined'
                        ? (typeof data[i].value != 'undefined'
                          ? data[i].value : data[i])
                        : 0;
                if (this.option.series[seriesIndex].type == ecConfig.CHART_TYPE_K) {
                    value = value[1];   // 收盘价
                }
                if (isNaN(value)) {
                    value = 0;
                }
                if (this.zoomOption.orient == 'horizontal') {
                    pointList.push([
                        this._location.x + x * i,
                        this._location.y + height - 5 - Math.round(
                            (value - minValue) / valueRange * (height - 10)
                        )
                    ]);
                }
                else {
                    pointList.push([
                        this._location.x + 5 + Math.round(
                            (value - minValue) / valueRange * (width - 10)
                        ),
                        this._location.y + y * i
                    ]);
                }
            }
            if (this.zoomOption.orient == 'horizontal') {
                 pointList.push([
                    this._location.x + width,
                    this._location.y + height
                ]);
                pointList.push([
                    this._location.x, this._location.y + height
                ]);
            }
            else {
                pointList.push([
                    this._location.x, this._location.y + height
                ]);
                pointList.push([
                    this._location.x, this._location.y
                ]);
            }

            this.shapeList.push(new PolygonShape({
                zlevel : this._zlevelBase,
                style : {
                    pointList : pointList,
                    color : this.zoomOption.dataBackgroundColor
                },
                hoverable : false
            }));
        },

        /**
         * 构建填充物
         */
        _buildFiller : function () {
            this._fillerShae = {
                zlevel : this._zlevelBase,
                draggable : true,
                ondrift : this._ondrift,
                ondragend : this._ondragend,
                _type : 'filler'
            };

            if (this.zoomOption.orient == 'horizontal') {
                // 横向
                this._fillerShae.style = {
                    x : this._location.x
                        + Math.round(this._zoom.start / 100 * this._location.width)
                        + this._handleSize,
                    y : this._location.y,
                    width : this._zoom.size - this._handleSize * 2,
                    height : this._location.height,
                    color : this.zoomOption.fillerColor,
                    // strokeColor : '#fff', // this.zoomOption.handleColor,
                    // lineWidth: 2,
                    text : ':::',
                    textPosition : 'inside'
                };
            }
            else {
                // 纵向
                this._fillerShae.style ={
                    x : this._location.x,
                    y : this._location.y
                        + Math.round(this._zoom.start / 100 * this._location.height)
                        + this._handleSize,
                    width :  this._location.width,
                    height : this._zoom.size - this._handleSize * 2,
                    color : this.zoomOption.fillerColor,
                    // strokeColor : '#fff', // this.zoomOption.handleColor,
                    // lineWidth: 2,
                    text : '::',
                    textPosition : 'inside'
                };
            }
            
            this._fillerShae.highlightStyle = {
                brushType: 'fill',
                color : 'rgba(0,0,0,0)'
                /*
                color : require('zrender/tool/color').alpha(
                            this._fillerShae.style.color, 0
                        )
                */
            };
            this._fillerShae = new RectangleShape(this._fillerShae);
            this.shapeList.push(this._fillerShae);
        },

        /**
         * 构建拖拽手柄
         */
        _buildHandle : function () {
            this._startShape = {
                zlevel : this._zlevelBase,
                draggable : true,
                style : {
                    iconType: 'rectangle',
                    x : this._location.x,
                    y : this._location.y,
                    width : this._handleSize,
                    height : this._handleSize,
                    color : this.zoomOption.handleColor,
                    text : '=',
                    textPosition : 'inside'
                },
                highlightStyle : {
                    brushType: 'fill'
                },
                ondrift : this._ondrift,
                ondragend : this._ondragend
            };
            
            if (this.zoomOption.orient == 'horizontal') {
                this._startShape.style.height = this._location.height;
                this._endShape = zrUtil.clone(this._startShape);
                
                this._startShape.style.x = this._fillerShae.style.x - this._handleSize,
                this._endShape.style.x = this._fillerShae.style.x  
                                    + this._fillerShae.style.width;
            }
            else {
                this._startShape.style.width = this._location.width;
                this._endShape = zrUtil.clone(this._startShape);
                
                this._startShape.style.y = this._fillerShae.style.y - this._handleSize;
                this._endShape.style.y = this._fillerShae.style.y 
                                    + this._fillerShae.style.height;
            }
            this._startShape = new IconShape(this._startShape);
            this._endShape = new IconShape(this._endShape);
            this.shapeList.push(this._startShape);
            this.shapeList.push(this._endShape);
        },

        /**
         * 构建特效边框
         */
        _buildFrame : function () {
            // 特效框线，亚像素优化
            var x = this.subPixelOptimize(this._location.x, 1);
            var y = this.subPixelOptimize(this._location.y, 1);
            this._startFrameShape = {
                zlevel : this._zlevelBase,
                hoverable :false,
                style : {
                    x : x,
                    y : y,
                    width : this._location.width - (x > this._location.x ? 1 : 0),
                    height : this._location.height - (y > this._location.y ? 1 : 0),
                    lineWidth: 1,
                    brushType: 'stroke',
                    strokeColor : this.zoomOption.handleColor
                }
            };
            this._endFrameShape = zrUtil.clone(this._startFrameShape);
            
            this._startFrameShape = new RectangleShape(this._startFrameShape);
            this._endFrameShape = new RectangleShape(this._endFrameShape);
            this.shapeList.push(this._startFrameShape);
            this.shapeList.push(this._endFrameShape);
            return;
        },
        
        _syncHandleShape : function () {
            if (this.zoomOption.orient == 'horizontal') {
                this._startShape.style.x = this._fillerShae.style.x - this._handleSize;
                this._endShape.style.x = this._fillerShae.style.x
                                    + this._fillerShae.style.width;
                
                this._zoom.start = Math.floor(
                    (this._startShape.style.x - this._location.x)
                    / this._location.width * 100
                );
                this._zoom.end = Math.ceil(
                    (this._endShape.style.x + this._handleSize - this._location.x)
                    / this._location.width * 100
                );
            }
            else {
                this._startShape.style.y = this._fillerShae.style.y - this._handleSize;
                this._endShape.style.y = this._fillerShae.style.y
                                    + this._fillerShae.style.height;
                this._zoom.start = Math.floor(
                    (this._startShape.style.y - this._location.y)
                    / this._location.height * 100
                );
                this._zoom.end = Math.ceil(
                    (this._endShape.style.y + this._handleSize - this._location.y)
                    / this._location.height * 100
                );
            }

            this.zr.modShape(this._startShape.id);
            this.zr.modShape(this._endShape.id);
            
            // 同步边框
            this._syncFrameShape();
            
            this.zr.refresh();
        },

        _syncFillerShape : function () {
            var a;
            var b;
            if (this.zoomOption.orient == 'horizontal') {
                a = this._startShape.style.x;
                b = this._endShape.style.x;
                this._fillerShae.style.x = Math.min(a, b) + this._handleSize;
                this._fillerShae.style.width = Math.abs(a - b) - this._handleSize;
                this._zoom.start = Math.floor(
                    (Math.min(a, b) - this._location.x)
                    / this._location.width * 100
                );
                this._zoom.end = Math.ceil(
                    (Math.max(a, b) + this._handleSize - this._location.x)
                    / this._location.width * 100
                );
            }
            else {
                a = this._startShape.style.y;
                b = this._endShape.style.y;
                this._fillerShae.style.y = Math.min(a, b) + this._handleSize;
                this._fillerShae.style.height = Math.abs(a - b) - this._handleSize;
                this._zoom.start = Math.floor(
                    (Math.min(a, b) - this._location.y)
                    / this._location.height * 100
                );
                this._zoom.end = Math.ceil(
                    (Math.max(a, b) + this._handleSize - this._location.y)
                    / this._location.height * 100
                );
            }

            this.zr.modShape(this._fillerShae.id);
            
            // 同步边框
            this._syncFrameShape();
            
            this.zr.refresh();
        },
        
        _syncFrameShape : function () {
            if (this.zoomOption.orient == 'horizontal') {
                this._startFrameShape.style.width = 
                    this._fillerShae.style.x - this._location.x;
                this._endFrameShape.style.x = 
                    this._fillerShae.style.x + this._fillerShae.style.width;
                this._endFrameShape.style.width = 
                    this._location.x + this._location.width - this._endFrameShape.style.x;
            }
            else {
                this._startFrameShape.style.height = 
                    this._fillerShae.style.y - this._location.y;
                this._endFrameShape.style.y = 
                    this._fillerShae.style.y + this._fillerShae.style.height;
                this._endFrameShape.style.height = 
                    this._location.y + this._location.height - this._endFrameShape.style.y;
            }
                    
            this.zr.modShape(this._startFrameShape.id);
            this.zr.modShape(this._endFrameShape.id);
        },
        
        _syncShape : function () {
            if (!this.zoomOption.show) {
                // 没有伸缩控件
                return;
            }
            if (this.zoomOption.orient == 'horizontal') {
                this._startShape.style.x = this._location.x 
                                      + this._zoom.start / 100 * this._location.width;
                this._endShape.style.x = this._location.x 
                                    + this._zoom.end / 100 * this._location.width
                                    - this._handleSize;
                    
                this._fillerShae.style.x = this._startShape.style.x + this._handleSize;
                this._fillerShae.style.width = this._endShape.style.x 
                                          - this._startShape.style.x
                                          - this._handleSize;
            }
            else {
                this._startShape.style.y = this._location.y 
                                      + this._zoom.start / 100 * this._location.height;
                this._endShape.style.y = this._location.y 
                                    + this._zoom.end / 100 * this._location.height
                                    - this._handleSize;
                    
                this._fillerShae.style.y = this._startShape.style.y + this._handleSize;
                this._fillerShae.style.height = this._endShape.style.y 
                                          - this._startShape.style.y
                                          - this._handleSize;
            }
            
            this.zr.modShape(this._startShape.id);
            this.zr.modShape(this._endShape.id);
            this.zr.modShape(this._fillerShae.id);
            // 同步边框
            this._syncFrameShape();
            this.zr.refresh();
        },
        
         _syncData : function (dispatchNow) {
            var target;
            var start;
            var end;
            var length;
            var data;
            
            for (var key in this._originalData) {
                target = this._originalData[key];
                for (var idx in target) {
                    data = target[idx];
                    if (typeof data == 'undefined') {
                        continue;
                    }
                    length = data.length;
                    start = Math.floor(this._zoom.start / 100 * length);
                    end = Math.ceil(this._zoom.end / 100 * length);
                    if (this.option[key][idx].type != ecConfig.CHART_TYPE_SCATTER) {
                        this.option[key][idx].data = data.slice(start, end);
                    }
                    else {
                        // 散点图特殊处理
                        this.option[key][idx].data = this._synScatterData(idx, data);
                    }
                }
            }

            if (!this._isSilence && (this.zoomOption.realtime || dispatchNow)) {
                this.messageCenter.dispatch(
                    ecConfig.EVENT.DATA_ZOOM,
                    null,
                    {zoom: this._zoom},
                    this.myChart
                );
            }

            //this.zoomOption.start = this._zoom.start;
            //this.zoomOption.end = this._zoom.end;
        },
        
        _synScatterData : function (seriesIndex, data) {
            if (this._zoom.start === 0 
                && this._zoom.end == 100
                && this._zoom.start2 === 0 
                && this._zoom.end2 == 100
            ) {
                return data;
            }
            var newData = [];
            var scale = this._zoom.scatterMap[seriesIndex];
            var total;
            var xStart;
            var xEnd;
            var yStart;
            var yEnd;
            
            if (this.zoomOption.orient == 'horizontal') {
                total = scale.x.max - scale.x.min;
                xStart = this._zoom.start / 100 * total + scale.x.min;
                xEnd = this._zoom.end / 100 * total + scale.x.min;
                
                total = scale.y.max - scale.y.min;
                yStart = this._zoom.start2 / 100 * total + scale.y.min;
                yEnd = this._zoom.end2 / 100 * total + scale.y.min;
            }
            else {
                total = scale.x.max - scale.x.min;
                xStart = this._zoom.start2 / 100 * total + scale.x.min;
                xEnd = this._zoom.end2 / 100 * total + scale.x.min;
                
                total = scale.y.max - scale.y.min;
                yStart = this._zoom.start / 100 * total + scale.y.min;
                yEnd = this._zoom.end / 100 * total + scale.y.min;
            }
            
            // console.log(xStart,xEnd,yStart,yEnd);
            var value;
            for (var i = 0, l = data.length; i < l; i++) {
                value = data[i].value || data[i];
                if (value[0] >= xStart 
                    && value[0] <= xEnd
                    && value[1] >= yStart
                    && value[1] <= yEnd
                ) {
                    newData.push(data[i]);
                }
            }
            
            return newData;
        },
        /**
         * 拖拽范围控制
         */
        __ondrift : function (shape, dx, dy) {
            if (this.zoomOption.zoomLock) {
                // zoomLock时把handle转成filler的拖拽
                shape = this._fillerShae;
            }
            
            var detailSize = shape._type == 'filler' ? this._handleSize : 0;
            if (this.zoomOption.orient == 'horizontal') {
                if (shape.style.x + dx - detailSize <= this._location.x) {
                    shape.style.x = this._location.x + detailSize;
                }
                else if (shape.style.x + dx + shape.style.width + detailSize
                         >= this._location.x + this._location.width
                ) {
                    shape.style.x = this._location.x + this._location.width
                                - shape.style.width - detailSize;
                }
                else {
                    shape.style.x += dx;
                }
            }
            else {
                if (shape.style.y + dy - detailSize <= this._location.y) {
                    shape.style.y = this._location.y + detailSize;
                }
                else if (shape.style.y + dy + shape.style.height + detailSize
                         >= this._location.y + this._location.height
                ) {
                    shape.style.y = this._location.y + this._location.height
                                - shape.style.height - detailSize;
                }
                else {
                    shape.style.y += dy;
                }
            }

            if (shape._type == 'filler') {
                this._syncHandleShape();
            }
            else {
                this._syncFillerShape();
            }

            if (this.zoomOption.realtime) {
                this._syncData();
            }

            return true;
        },
        
        __ondragend : function () {
            this.isDragend = true;
        },
        
        /**
         * 数据项被拖拽出去
         */
        ondragend : function (param, status) {
            if (!this.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            !this.zoomOption.realtime && this._syncData();

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.dragIn = true;
            if (!this._isSilence && !this.zoomOption.realtime) {
                this.messageCenter.dispatch(
                    ecConfig.EVENT.DATA_ZOOM,
                    null,
                    {zoom: this._zoom},
                    this.myChart
                );
            }
            status.needRefresh = false; // 会有消息触发fresh，不用再刷一遍
            // 处理完拖拽事件后复位
            this.isDragend = false;

            return;
        },

        ondataZoom : function (param, status) {
            status.needRefresh = true;
            return;
        },
        
        absoluteZoom : function (param) {
            //this.zoomOption.start = 
            this._zoom.start = param.start;
            //this.zoomOption.end = 
            this._zoom.end = param.end;
            //this.zoomOption.start2 = 
            this._zoom.start2 = param.start2;
            //this.zoomOption.end2 = 
            this._zoom.end2 = param.end2;
            this._syncShape();
            this._syncData(true);
            return;
        },
        
        rectZoom : function (param) {
            if (!param) {
                // 重置拖拽
                //this.zoomOption.start = 
                //this.zoomOption.start2 = 
                this._zoom.start = 
                this._zoom.start2 = 0;
                    
                //this.zoomOption.end =
                //this.zoomOption.end2 = 
                this._zoom.end = 
                this._zoom.end2 = 100;
                
                this._syncShape();
                this._syncData(true);
                return this._zoom;
            }
            var gridArea = this.component.grid.getArea();
            var rect = {
                x : param.x,
                y : param.y,
                width : param.width,
                height : param.height
            };
            // 修正方向框选
            if (rect.width < 0) {
                rect.x += rect.width;
                rect.width = -rect.width;
            }
            if (rect.height < 0) {
                rect.y += rect.height;
                rect.height = -rect.height;
            }
            // console.log(rect,this._zoom);
            
            // 剔除无效缩放
            if (rect.x > gridArea.x + gridArea.width
                || rect.y > gridArea.y + gridArea.height
            ) {
                return false; // 无效缩放
            }
            
            // 修正框选超出
            if (rect.x < gridArea.x) {
                rect.x = gridArea.x;
            }
            if (rect.x + rect.width > gridArea.x + gridArea.width) {
                rect.width = gridArea.x + gridArea.width - rect.x;
            }
            if (rect.y + rect.height > gridArea.y + gridArea.height) {
                rect.height = gridArea.y + gridArea.height - rect.y;
            }
            
            var total;
            var sdx = (rect.x - gridArea.x) / gridArea.width;
            var edx = 1 - (rect.x + rect.width - gridArea.x) / gridArea.width;
            var sdy = 1 - (rect.y + rect.height - gridArea.y) / gridArea.height;
            var edy = (rect.y - gridArea.y) / gridArea.height;
            //console.log('this',sdy,edy,this._zoom.start,this._zoom.end)
            if (this.zoomOption.orient == 'horizontal') {
                total = this._zoom.end - this._zoom.start;
                this._zoom.start += total * sdx;
                this._zoom.end -= total * edx;
                
                total = this._zoom.end2 - this._zoom.start2;
                this._zoom.start2 += total * sdy;
                this._zoom.end2 -= total * edy;
            }
            else {
                total = this._zoom.end - this._zoom.start;
                this._zoom.start += total * sdy;
                this._zoom.end -= total * edy;
                
                total = this._zoom.end2 - this._zoom.start2;
                this._zoom.start2 += total * sdx;
                this._zoom.end2 -= total * edx;
            }
            //console.log(this._zoom.start,this._zoom.end,this._zoom.start2,this._zoom.end2)
            //this.zoomOption.start = this._zoom.start;
            //this.zoomOption.end = this._zoom.end;
            //this.zoomOption.start2 = this._zoom.start2;
            //this.zoomOption.end2 = this._zoom.end2;
            //console.log(rect,gridArea,this._zoom,total)
            this._syncShape();
            this._syncData(true);
            return this._zoom;
        },
        
        syncBackupData : function (curOption) {
            var start;
            var target = this._originalData['series'];
            var curSeries = curOption.series;
            var curData;
            for (var i = 0, l = curSeries.length; i < l; i++) {
                curData = curSeries[i].data;
                if (target[i]) {
                    // dataZoom接管的
                    start = Math.floor(this._zoom.start / 100 * target[i].length);
                }
                else {
                    // 非dataZoom接管
                    start = 0;
                }
                for (var j = 0, k = curData.length; j < k; j++) {
                    //optionBackup.series[i].data[j + start] = curData[j];
                    if (target[i]) {
                        // 同步内部备份
                        target[i][j + start] = curData[j];
                    }
                }
            }
        },
        
        syncOption : function(magicOption) {
            this.silence(true);
            this.option = magicOption;
            
            this.clear();
            // 位置参数，通过计算所得x, y, width, height
            this._location = this._getLocation();
            // 缩放参数
            this._zoom =  this._getZoom();
            
            this._backupData();
            if (this.option.dataZoom && this.option.dataZoom.show) {
                this._buildShape();
            }
            this._syncData();
            
            this.silence(false);
        },
        
        silence : function (s) {
            this._isSilence = s;
        },
        
        getRealDataIndex : function (sIdx, dIdx) {
            if (!this._originalData || (this._zoom.start === 0 && this._zoom.end == 100)) {
                return dIdx;
            }
            var sreies = this._originalData.series;
            if (sreies[sIdx]) {
                return Math.floor(this._zoom.start / 100 * sreies[sIdx].length) + dIdx;
            }
            return -1;
        },

        /**
         * 避免dataZoom带来两次refresh，不设refresh接口，resize重复一下buildshape逻辑 
         */
        resize : function () {
            this.clear();
            
            // 位置参数，通过计算所得x, y, width, height
            this._location = this._getLocation();
            // 缩放参数
            this._zoom =  this._getZoom();
            
            if (this.option.dataZoom.show) {
                this._buildShape();
            }
        }
    };
    
    zrUtil.inherits(DataZoom, Base);
    
    require('../component').define('dataZoom', DataZoom);
    
    return DataZoom;
});
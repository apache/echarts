/**
 * echarts组件： 类目轴
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 *
 */
define(function (require) {
    var Base = require('./base');
    
    // 图形依赖
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var RectangleShape = require('zrender/shape/Rectangle');
    
    var ecConfig = require('../config');
    var zrUtil = require('zrender/tool/util');
    var zrArea = require('zrender/tool/area');
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 类目轴参数
     * @param {Grid} component 组件
     */
    function CategoryAxis(ecTheme, messageCenter, zr, option, myChart, axisBase) {
        if (option.data.length < 1) {
            console.error('option.data.length < 1.');
            return;
        }
        
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);
        
        this.grid = this.component.grid;
        
        for (var method in axisBase) {
            this[method] = axisBase[method];
        }
        
        this.refresh(option);
    }
    
    CategoryAxis.prototype = {
        type : ecConfig.COMPONENT_TYPE_AXIS_CATEGORY,
        _getReformedLabel : function (idx) {
            var data = typeof this.option.data[idx].value != 'undefined'
                       ? this.option.data[idx].value
                       : this.option.data[idx];
            var formatter = this.option.data[idx].formatter 
                            || this.option.axisLabel.formatter;
            if (formatter) {
                if (typeof formatter == 'function') {
                    data = formatter.call(this.myChart, data);
                }
                else if (typeof formatter == 'string') {
                    data = formatter.replace('{value}', data);
                }
            }
            return data;
        },
        
        /**
         * 计算标签显示挑选间隔
         */
        _getInterval : function () {
            var interval   = this.option.axisLabel.interval;
            if (interval == 'auto') {
                // 麻烦的自适应计算
                var fontSize = this.option.axisLabel.textStyle.fontSize;
                var data = this.option.data;
                var dataLength = this.option.data.length;

                if (this.isHorizontal()) {
                    // 横向
                    if (dataLength > 3) {
                        var gap = this.getGap();
                        var isEnough = false;
                        var labelSpace;
                        var labelSize;
                        var step = Math.floor(0.5 / gap);
                        step = step < 1 ? 1 : step;
                        interval = Math.floor(15 / gap);
                        while (!isEnough && interval < dataLength) {
                            interval += step;
                            isEnough = true;
                            labelSpace = Math.floor(gap * interval); // 标签左右至少间隔为3px
                            for (var i = Math.floor((dataLength - 1)/ interval) * interval; 
                                 i >= 0; i -= interval
                             ) {
                                if (this.option.axisLabel.rotate !== 0) {
                                    // 有旋转
                                    labelSize = fontSize;
                                }
                                else if (data[i].textStyle) {
                                    labelSize = zrArea.getTextWidth(
                                        this._getReformedLabel(i),
                                        this.getFont(
                                            zrUtil.merge(
                                                data[i].textStyle,
                                                this.option.axisLabel.textStyle
                                           )
                                        )
                                    );
                                }
                                else {
                                    /*
                                    labelSize = zrArea.getTextWidth(
                                        this._getReformedLabel(i),
                                        font
                                    );
                                    */
                                    // 不定义data级特殊文本样式，用fontSize优化getTextWidth
                                    var label = this._getReformedLabel(i) + '';
                                    var wLen = (label.match(/\w/g) || '').length;
                                    var oLen = label.length - wLen;
                                    labelSize = wLen * fontSize * 2 / 3 + oLen * fontSize;
                                }

                                if (labelSpace < labelSize) {
                                    // 放不下，中断循环让interval++
                                    isEnough = false;
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        // 少于3个则全部显示
                        interval = 1;
                    }
                }
                else {
                    // 纵向
                    if (dataLength > 3) {
                        var gap = this.getGap();
                        interval = Math.floor(11 / gap);
                        // 标签上下至少间隔为3px
                        while ((gap * interval - 6) < fontSize
                                && interval < dataLength
                        ) {
                            interval++;
                        }
                    }
                    else {
                        // 少于3个则全部显示
                        interval = 1;
                    }
                }
            }
            else {
                // 用户自定义间隔
                interval = interval - 0 + 1;
            }

            return interval;
        },
        
        /**
         * 绘制图形
         */
        _buildShape : function () {
            // 标签显示的挑选间隔
            this._interval = this._getInterval();
            if (!this.option.show) {
                return;
            }
            this.option.splitArea.show && this._buildSplitArea();
            this.option.splitLine.show && this._buildSplitLine();
            this.option.axisLine.show && this._buildAxisLine();
            this.option.axisTick.show && this._buildAxisTick();
            this.option.axisLabel.show && this._buildAxisLabel();

            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                this.zr.addShape(this.shapeList[i]);
            }
        },

        // 小标记
        _buildAxisTick : function () {
            var axShape;
            //var data       = this.option.data;
            var dataLength = this.option.data.length;
            var tickOption = this.option.axisTick;
            var length     = tickOption.length;
            var color      = tickOption.lineStyle.color;
            var lineWidth  = tickOption.lineStyle.width;
            var interval   = tickOption.interval == 'auto' 
                             ? this._interval : (tickOption.interval - 0 + 1);
            var onGap      = tickOption.onGap;
            var optGap     = onGap 
                             ? (this.getGap() / 2) 
                             : typeof onGap == 'undefined'
                                   ? (this.option.boundaryGap ? (this.getGap() / 2) : 0)
                                   : 0;
            var startIndex = optGap > 0 ? -interval : 0;                       
            if (this.isHorizontal()) {
                // 横向
                var yPosition = this.option.position == 'bottom'
                        ? (tickOption.inside 
                           ? (this.grid.getYend() - length - 1) : (this.grid.getYend() + 1))
                        : (tickOption.inside 
                           ? (this.grid.getY() + 1) : (this.grid.getY() - length - 1));
                var x;
                for (var i = startIndex; i < dataLength; i += interval) {
                    // 亚像素优化
                    x = this.subPixelOptimize(
                        this.getCoordByIndex(i) + (i >= 0 ? optGap : 0), lineWidth
                    );
                    axShape = {
                        _axisShape : 'axisTick',
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : x,
                            yStart : yPosition,
                            xEnd : x,
                            yEnd : yPosition + length,
                            strokeColor : color,
                            lineWidth : lineWidth
                        }
                    };
                    this.shapeList.push(new LineShape(axShape));
                }
            }
            else {
                // 纵向
                var xPosition = this.option.position == 'left'
                    ? (tickOption.inside 
                       ? (this.grid.getX() + 1) : (this.grid.getX() - length - 1))
                    : (tickOption.inside 
                       ? (this.grid.getXend() - length - 1) : (this.grid.getXend() + 1));
                        
                var y;
                for (var i = startIndex; i < dataLength; i += interval) {
                    // 亚像素优化
                    y = this.subPixelOptimize(
                        this.getCoordByIndex(i) - (i >= 0 ? optGap : 0), lineWidth
                    );
                    axShape = {
                        _axisShape : 'axisTick',
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : xPosition,
                            yStart : y,
                            xEnd : xPosition + length,
                            yEnd : y,
                            strokeColor : color,
                            lineWidth : lineWidth
                        }
                    };
                    this.shapeList.push(new LineShape(axShape));
                }
            }
        },

        // 坐标轴文本
        _buildAxisLabel : function () {
            var axShape;
            var data       = this.option.data;
            var dataLength = this.option.data.length;
            var rotate     = this.option.axisLabel.rotate;
            var margin     = this.option.axisLabel.margin;
            var clickable  = this.option.axisLabel.clickable;
            var textStyle  = this.option.axisLabel.textStyle;
            var dataTextStyle;

            if (this.isHorizontal()) {
                // 横向
                var yPosition;
                var baseLine;
                if (this.option.position == 'bottom') {
                    yPosition = this.grid.getYend() + margin;
                    baseLine = 'top';
                }
                else {
                    yPosition = this.grid.getY() - margin;
                    baseLine = 'bottom';
                }

                for (var i = 0; i < dataLength; i += this._interval) {
                    if (this._getReformedLabel(i) === '') {
                        // 空文本优化
                        continue;
                    }
                    dataTextStyle = zrUtil.merge(
                        data[i].textStyle || {},
                        textStyle
                    );
                    axShape = {
                        // shape : 'text',
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            x : this.getCoordByIndex(i),
                            y : yPosition,
                            color : dataTextStyle.color,
                            text : this._getReformedLabel(i),
                            textFont : this.getFont(dataTextStyle),
                            textAlign : dataTextStyle.align || 'center',
                            textBaseline : dataTextStyle.baseline || baseLine
                        }
                    };
                    if (rotate) {
                        axShape.style.textAlign = rotate > 0
                                                  ? (this.option.position == 'bottom'
                                                    ? 'right' : 'left')
                                                  : (this.option.position == 'bottom'
                                                    ? 'left' : 'right');
                        axShape.rotation = [
                            rotate * Math.PI / 180,
                            axShape.style.x,
                            axShape.style.y
                        ];
                    }
                    this.shapeList.push(new TextShape(
                        this._axisLabelClickable(clickable, axShape)
                    ));
                }
            }
            else {
                // 纵向
                var xPosition;
                var align;
                if (this.option.position == 'left') {
                    xPosition = this.grid.getX() - margin;
                    align = 'right';
                }
                else {
                    xPosition = this.grid.getXend() + margin;
                    align = 'left';
                }

                for (var i = 0; i < dataLength; i += this._interval) {
                    if (this._getReformedLabel(i) === '') {
                        // 空文本优化
                        continue;
                    }
                    dataTextStyle = zrUtil.merge(
                        data[i].textStyle || {},
                        textStyle
                    );
                    axShape = {
                        // shape : 'text',
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            x : xPosition,
                            y : this.getCoordByIndex(i),
                            color : dataTextStyle.color,
                            text : this._getReformedLabel(i),
                            textFont : this.getFont(dataTextStyle),
                            textAlign : dataTextStyle.align || align,
                            textBaseline : dataTextStyle.baseline 
                                           || (i === 0 && this.option.name !== '')
                                               ? 'bottom'
                                               : (i == (dataLength - 1) 
                                                  && this.option.name !== '')
                                                 ? 'top'
                                                 : 'middle'
                        }
                    };
                    
                    if (rotate) {
                        axShape.rotation = [
                            rotate * Math.PI / 180,
                            axShape.style.x,
                            axShape.style.y
                        ];
                    }
                    this.shapeList.push(new TextShape(
                        this._axisLabelClickable(clickable, axShape)
                    ));
                }
            }
        },
        
        _buildSplitLine : function () {
            var axShape;
            //var data       = this.option.data;
            var dataLength  = this.option.data.length;
            var sLineOption = this.option.splitLine;
            var lineType    = sLineOption.lineStyle.type;
            var lineWidth   = sLineOption.lineStyle.width;
            var color       = sLineOption.lineStyle.color;
            color = color instanceof Array ? color : [color];
            var colorLength = color.length;
            
            var onGap      = sLineOption.onGap;
            var optGap     = onGap 
                             ? (this.getGap() / 2) 
                             : typeof onGap == 'undefined'
                                   ? (this.option.boundaryGap ? (this.getGap() / 2) : 0)
                                   : 0;
            dataLength -= (onGap || (typeof onGap == 'undefined' && this.option.boundaryGap)) 
                          ? 1 : 0;
            if (this.isHorizontal()) {
                // 横向
                var sy = this.grid.getY();
                var ey = this.grid.getYend();
                var x;

                for (var i = 0; i < dataLength; i += this._interval) {
                    // 亚像素优化
                    x = this.subPixelOptimize(
                        this.getCoordByIndex(i) + optGap, lineWidth
                    );
                    axShape = {
                        // shape : 'line',
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : x,
                            yStart : sy,
                            xEnd : x,
                            yEnd : ey,
                            strokeColor : color[(i / this._interval) % colorLength],
                            lineType : lineType,
                            lineWidth : lineWidth
                        }
                    };
                    this.shapeList.push(new LineShape(axShape));
                }

            }
            else {
                // 纵向
                var sx = this.grid.getX();
                var ex = this.grid.getXend();
                var y;

                for (var i = 0; i < dataLength; i += this._interval) {
                    // 亚像素优化
                    y = this.subPixelOptimize(
                        this.getCoordByIndex(i) - optGap, lineWidth
                    );
                    axShape = {
                        // shape : 'line',
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : sx,
                            yStart : y,
                            xEnd : ex,
                            yEnd : y,
                            strokeColor : color[(i / this._interval) % colorLength],
                            linetype : lineType,
                            lineWidth : lineWidth
                        }
                    };
                    this.shapeList.push(new LineShape(axShape));
                }
            }
        },

        _buildSplitArea : function () {
            var axShape;
            var sAreaOption = this.option.splitArea;
            var color = sAreaOption.areaStyle.color;
            if (!(color instanceof Array)) {
                // 非数组一律认为是单一颜色的字符串，单一颜色则用一个背景，颜色错误不负责啊！！！
                axShape = {
                    // shape : 'rectangle',
                    zlevel : this._zlevelBase,
                    hoverable : false,
                    style : {
                        x : this.grid.getX(),
                        y : this.grid.getY(),
                        width : this.grid.getWidth(),
                        height : this.grid.getHeight(),
                        color : color
                        // type : this.option.splitArea.areaStyle.type,
                    }
                };
                this.shapeList.push(new RectangleShape(axShape));
            }
            else {
                // 多颜色
                var colorLength = color.length;
                var dataLength  = this.option.data.length;
        
                var onGap      = sAreaOption.onGap;
                var optGap     = onGap 
                                 ? (this.getGap() / 2) 
                                 : typeof onGap == 'undefined'
                                       ? (this.option.boundaryGap ? (this.getGap() / 2) : 0)
                                       : 0;
                if (this.isHorizontal()) {
                    // 横向
                    var y = this.grid.getY();
                    var height = this.grid.getHeight();
                    var lastX = this.grid.getX();
                    var curX;
    
                    for (var i = 0; i <= dataLength; i += this._interval) {
                        curX = i < dataLength
                               ? (this.getCoordByIndex(i) + optGap)
                               : this.grid.getXend();
                        axShape = {
                            // shape : 'rectangle',
                            zlevel : this._zlevelBase,
                            hoverable : false,
                            style : {
                                x : lastX,
                                y : y,
                                width : curX - lastX,
                                height : height,
                                color : color[(i / this._interval) % colorLength]
                                // type : this.option.splitArea.areaStyle.type,
                            }
                        };
                        this.shapeList.push(new RectangleShape(axShape));
                        lastX = curX;
                    }
                }
                else {
                    // 纵向
                    var x = this.grid.getX();
                    var width = this.grid.getWidth();
                    var lastYend = this.grid.getYend();
                    var curY;
    
                    for (var i = 0; i <= dataLength; i += this._interval) {
                        curY = i < dataLength
                               ? (this.getCoordByIndex(i) - optGap)
                               : this.grid.getY();
                        axShape = {
                            // shape : 'rectangle',
                            zlevel : this._zlevelBase,
                            hoverable : false,
                            style : {
                                x : x,
                                y : curY,
                                width : width,
                                height : lastYend - curY,
                                color : color[(i / this._interval) % colorLength]
                                // type : this.option.splitArea.areaStyle.type
                            }
                        };
                        this.shapeList.push(new RectangleShape(axShape));
                        lastYend = curY;
                    }
                }
            }
        },

        /**
         * 刷新
         */
        refresh : function (newOption) {
            if (newOption) {
                this.option = this.reformOption(newOption);
                // 通用字体设置
                this.option.axisLabel.textStyle = zrUtil.merge(
                    this.option.axisLabel.textStyle || {},
                    this.ecTheme.textStyle
                );
            }
            this.clear();
            this._buildShape();
        },

        /**
         * 返回间隔
         */
        getGap : function () {
            var dataLength = this.option.data.length;
            var total = this.isHorizontal()
                        ? this.grid.getWidth()
                        : this.grid.getHeight();
            if (this.option.boundaryGap) {              // 留空
                return total / dataLength;
            }
            else {                                      // 顶头
                return total / (dataLength > 1 ? (dataLength - 1) : 1);
            }
        },

        // 根据值换算位置
        getCoord : function (value) {
            var data = this.option.data;
            var dataLength = data.length;
            var gap = this.getGap();
            var position = this.option.boundaryGap ? (gap / 2) : 0;

            for (var i = 0; i < dataLength; i++) {
                if (data[i] == value
                    || (typeof data[i].value != 'undefined' 
                        && data[i].value == value)
                ) {
                    if (this.isHorizontal()) {
                        // 横向
                        position = this.grid.getX() + position;
                    }
                    else {
                        // 纵向
                        position = this.grid.getYend() - position;
                    }
                    
                    return position;
                    // Math.floor可能引起一些偏差，但性能会更好
                    /* 准确更重要
                    return (i === 0 || i == dataLength - 1)
                           ? position
                           : Math.floor(position);
                    */
                }
                position += gap;
            }
        },

        // 根据类目轴数据索引换算位置
        getCoordByIndex : function (dataIndex) {
            if (dataIndex < 0) {
                if (this.isHorizontal()) {
                    return this.grid.getX();
                }
                else {
                    return this.grid.getYend();
                }
            }
            else if (dataIndex > this.option.data.length - 1) {
                if (this.isHorizontal()) {
                    return this.grid.getXend();
                }
                else {
                    return this.grid.getY();
                }
            }
            else {
                var gap = this.getGap();
                var position = this.option.boundaryGap ? (gap / 2) : 0;
                position += dataIndex * gap;
                
                if (this.isHorizontal()) {
                    // 横向
                    position = this.grid.getX() + position;
                }
                else {
                    // 纵向
                    position = this.grid.getYend() - position;
                }
                
                return position;
                /* 准确更重要
                return (dataIndex === 0 || dataIndex == this.option.data.length - 1)
                       ? position
                       : Math.floor(position);
                */
            }
        },

        // 根据类目轴数据索引换算类目轴名称
        getNameByIndex : function (dataIndex) {
            var data = this.option.data[dataIndex];
            if (typeof data != 'undefined' && typeof data.value != 'undefined')
            {
                return data.value;
            }
            else {
                return data;
            }
        },
        
        // 根据类目轴名称换算类目轴数据索引
        getIndexByName : function (name) {
            var data = this.option.data;
            var dataLength = data.length;

            for (var i = 0; i < dataLength; i++) {
                if (data[i] == name
                    || (typeof data[i].value != 'undefined' 
                        && data[i].value == name)
                ) {
                    return i;
                }
            }
            
            return -1;
        },
        
        // 根据位置换算值
        getValueFromCoord : function() {
            return '';
        },

        /**
         * 根据类目轴数据索引返回是否为主轴线
         * @param {number} dataIndex 类目轴数据索引
         * @return {boolean} 是否为主轴
         */
        isMainAxis : function (dataIndex) {
            return dataIndex % this._interval === 0;
        }
    };
    
    zrUtil.inherits(CategoryAxis, Base);
    
    require('../component').define('categoryAxis', CategoryAxis);
    
    return CategoryAxis;
});
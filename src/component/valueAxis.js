/**
 * echarts组件： 数值轴
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
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

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 类目轴参数
     * @param {Object} component 组件
     * @param {Array} series 数据对象
     */
    function ValueAxis(ecTheme, messageCenter, zr, option, myChart, axisBase, series) {
        if (!series || series.length === 0) {
            console.err('option.series.length == 0.');
            return;
        }
        
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);

        this.series = series;
        this.grid = this.component.grid;
        
        for (var method in axisBase) {
            this[method] = axisBase[method];
        }
        
        this.refresh(option, series);
    }
    
    ValueAxis.prototype = {
        type : ecConfig.COMPONENT_TYPE_AXIS_VALUE,
        _buildShape : function () {
            this._hasData = false;
            this._calculateValue();
            if (!this._hasData) {
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
            var data       = this._valueList;
            var dataLength = this._valueList.length;
            var tickOption = this.option.axisTick;
            var length     = tickOption.length;
            var color      = tickOption.lineStyle.color;
            var lineWidth  = tickOption.lineStyle.width;

            if (this.isHorizontal()) {
                // 横向
                var yPosition = this.option.position == 'bottom'
                        ? (tickOption.inside 
                           ? (this.grid.getYend() - length - 1) : (this.grid.getYend()) + 1)
                        : (tickOption.inside 
                           ? (this.grid.getY() + 1) : (this.grid.getY() - length - 1));
                var x;
                for (var i = 0; i < dataLength; i++) {
                    // 亚像素优化
                    x = this.subPixelOptimize(this.getCoord(data[i]), lineWidth);
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
                for (var i = 0; i < dataLength; i++) {
                    // 亚像素优化
                    y = this.subPixelOptimize(this.getCoord(data[i]), lineWidth);
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
            var data       = this._valueList;
            var dataLength = this._valueList.length;
            var rotate     = this.option.axisLabel.rotate;
            var margin     = this.option.axisLabel.margin;
            var clickable  = this.option.axisLabel.clickable;
            var textStyle  = this.option.axisLabel.textStyle;

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

                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            x : this.getCoord(data[i]),
                            y : yPosition,
                            color : typeof textStyle.color == 'function'
                                    ? textStyle.color(data[i]) : textStyle.color,
                            text : this._valueLabel[i],
                            textFont : this.getFont(textStyle),
                            textAlign : textStyle.align || 'center',
                            textBaseline : textStyle.baseline || baseLine
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

                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            x : xPosition,
                            y : this.getCoord(data[i]),
                            color : typeof textStyle.color == 'function'
                                    ? textStyle.color(data[i]) : textStyle.color,
                            text : this._valueLabel[i],
                            textFont : this.getFont(textStyle),
                            textAlign : textStyle.align || align,
                            textBaseline : textStyle.baseline 
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
            var data        = this._valueList;
            var dataLength  = this._valueList.length;
            var sLineOption = this.option.splitLine;
            var lineType    = sLineOption.lineStyle.type;
            var lineWidth   = sLineOption.lineStyle.width;
            var color       = sLineOption.lineStyle.color;
            color = color instanceof Array ? color : [color];
            var colorLength = color.length;

            if (this.isHorizontal()) {
                // 横向
                var sy = this.grid.getY();
                var ey = this.grid.getYend();
                var x;

                for (var i = 0; i < dataLength; i++) {
                    // 亚像素优化
                    x = this.subPixelOptimize(this.getCoord(data[i]), lineWidth);
                    axShape = {
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : x,
                            yStart : sy,
                            xEnd : x,
                            yEnd : ey,
                            strokeColor : color[i % colorLength],
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

                for (var i = 0; i < dataLength; i++) {
                    // 亚像素优化
                    y = this.subPixelOptimize(this.getCoord(data[i]), lineWidth);
                    axShape = {
                        zlevel : this._zlevelBase,
                        hoverable : false,
                        style : {
                            xStart : sx,
                            yStart : y,
                            xEnd : ex,
                            yEnd : y,
                            strokeColor : color[i % colorLength],
                            lineType : lineType,
                            lineWidth : lineWidth
                        }
                    };
                    this.shapeList.push(new LineShape(axShape));
                }
            }
        },

        _buildSplitArea : function () {
            var axShape;
            var color = this.option.splitArea.areaStyle.color;

            if (!(color instanceof Array)) {
                // 非数组一律认为是单一颜色的字符串，单一颜色则用一个背景，颜色错误不负责啊！！！
                axShape = {
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
                var data        = this._valueList;
                var dataLength  = this._valueList.length;

                if (this.isHorizontal()) {
                    // 横向
                    var y = this.grid.getY();
                    var height = this.grid.getHeight();
                    var lastX = this.grid.getX();
                    var curX;

                    for (var i = 0; i <= dataLength; i++) {
                        curX = i < dataLength
                               ? this.getCoord(data[i])
                               : this.grid.getXend();
                        axShape = {
                            zlevel : this._zlevelBase,
                            hoverable : false,
                            style : {
                                x : lastX,
                                y : y,
                                width : curX - lastX,
                                height : height,
                                color : color[i % colorLength]
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

                    for (var i = 0; i <= dataLength; i++) {
                        curY = i < dataLength
                               ? this.getCoord(data[i])
                               : this.grid.getY();
                        axShape = {
                            zlevel : this._zlevelBase,
                            hoverable : false,
                            style : {
                                x : x,
                                y : curY,
                                width : width,
                                height : lastYend - curY,
                                color : color[i % colorLength]
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
         * 极值计算
         */
        _calculateValue : function () {
            if (isNaN(this.option.min - 0) || isNaN(this.option.max - 0)) {
                // 有一个没指定都得算
                // 数据整形
                var oriData;            // 原始数据
                var data = {};          // 整形后数据抽取
                var value;
                var xIdx;
                var yIdx;
                var legend = this.component.legend;
                for (var i = 0, l = this.series.length; i < l; i++) {
                    if (this.series[i].type != ecConfig.CHART_TYPE_LINE
                        && this.series[i].type != ecConfig.CHART_TYPE_BAR
                        && this.series[i].type != ecConfig.CHART_TYPE_SCATTER
                        && this.series[i].type != ecConfig.CHART_TYPE_K
                    ) {
                        // 非坐标轴支持的不算极值
                        continue;
                    }
                    // 请允许我写开，跟上面一个不是一样东西
                    if (legend && !legend.isSelected(this.series[i].name)){
                        continue;
                    }

                    // 不指定默认为第一轴线
                    xIdx = this.series[i].xAxisIndex || 0;
                    yIdx = this.series[i].yAxisIndex || 0;
                    if ((this.option.xAxisIndex != xIdx)
                        && (this.option.yAxisIndex != yIdx)
                    ) {
                        // 不是自己的数据不计算极值
                        continue;
                    }
                    
                    var key = this.series[i].name || 'kener';
                    if (!this.series[i].stack) {
                        data[key] = data[key] || [];
                        oriData = this.series[i].data;
                        for (var j = 0, k = oriData.length; j < k; j++) {
                            value = typeof oriData[j].value != 'undefined'
                                    ? oriData[j].value
                                    : oriData[j];
                            if (this.series[i].type == ecConfig.CHART_TYPE_SCATTER) {
                                if (this.option.xAxisIndex != -1) {
                                    data[key].push(value[0]);
                                }
                                if (this.option.yAxisIndex != -1) {
                                    data[key].push(value[1]);
                                }
                            }
                            else if (this.series[i].type == ecConfig.CHART_TYPE_K) {
                                data[key].push(value[0]);
                                data[key].push(value[1]);
                                data[key].push(value[2]);
                                data[key].push(value[3]);
                            }
                            else {
                                data[key].push(value);
                            }
                        }
                    }
                    else {
                        // 堆积数据，需要区分正负向堆积
                        var keyP = '__Magic_Key_Positive__' + this.series[i].stack;
                        var keyN = '__Magic_Key_Negative__' + this.series[i].stack;
                        data[keyP] = data[keyP] || [];
                        data[keyN] = data[keyN] || [];
                        data[key] = data[key] || [];  // scale下还需要记录每一个量
                        oriData = this.series[i].data;
                        for (var j = 0, k = oriData.length; j < k; j++) {
                            value = typeof oriData[j].value != 'undefined'
                                    ? oriData[j].value
                                    : oriData[j];
                            if (value == '-') {
                                continue;
                            }
                            value = value - 0;
                            if (value >= 0) {
                                if (typeof data[keyP][j] != 'undefined') {
                                    data[keyP][j] += value;
                                }
                                else {
                                    data[keyP][j] = value;
                                }
                            }
                            else {
                                if (typeof data[keyN][j] != 'undefined') {
                                    data[keyN][j] += value;
                                }
                                else {
                                    data[keyN][j] = value;
                                }
                            }
                            if (this.option.scale) {
                                data[key].push(value);
                            }
                        }
                    }
                }
                // 找极值
                for (var i in data){
                    oriData = data[i];
                    for (var j = 0, k = oriData.length; j < k; j++) {
                        if (!isNaN(oriData[j])){
                            this._hasData = true;
                            this._min = oriData[j];
                            this._max = oriData[j];
                            break;
                        }
                    }
                    if (this._hasData) {
                        break;
                    }
                }
                for (var i in data){
                    oriData = data[i];
                    for (var j = 0, k = oriData.length; j < k; j++) {
                        if (!isNaN(oriData[j])){
                            this._min = Math.min(this._min, oriData[j]);
                            this._max = Math.max(this._max, oriData[j]);
                        }
                    }
                }
                
                //console.log(this._min,this._max,'vvvvv111111')
                this._min = isNaN(this.option.min - 0)
                       ? (this._min - Math.abs(this._min * this.option.boundaryGap[0]))
                       : (this.option.min - 0);    // 指定min忽略boundaryGay[0]
    
                this._max = isNaN(this.option.max - 0)
                       ? (this._max + Math.abs(this._max * this.option.boundaryGap[1]))
                       : (this.option.max - 0);    // 指定max忽略boundaryGay[1]
                if (this._min == this._max) {
                    if (this._max === 0) {
                        // 修复全0数据
                        this._max = this.option.power > 0 ? this.option.power : 1;
                    }
                    // 修复最大值==最小值时数据整形
                    else if (this._max > 0) {
                        this._min = this._max / this.option.splitNumber;
                    }
                    else { // this._max < 0
                        this._max = this._max / this.option.splitNumber;
                    }
                }
                this._reformValue(this.option.scale);
            }
            else {
                this._hasData = true;
                // 用户指定min max就不多管闲事了
                this._min = this.option.min - 0;    // 指定min忽略boundaryGay[0]
                this._max = this.option.max - 0;    // 指定max忽略boundaryGay[1]
                this._customerValue();
            }
        },

        /**
         * 找到原始数据的极值后根据选项整形最终 this._min / this._max / this._valueList
         * 如果你不知道这个“整形”的用义，请不要试图去理解和修改这个方法！找我也没用，我相信我已经记不起来！
         * 如果你有更简洁的数学推导欢迎重写，后果自负~
         * 一旦你不得不遇到了需要修改或重写的厄运，希望下面的脚手架能帮助你
         * ps:其实我是想说别搞砸了！升级后至少得保证这些case通过！！
         *
         * by linzhifeng@baidu.com 2013-1-8
         * --------
         this._valueList = [];
         this.option = {splitNumber:5,power:100,precision:0};
         this._min = 1; this._max = 123; console.log(this._min, this._max); this._reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : 0 150 [0, 30, 60, 90, 120, 150]',
                    (this._min == 0 && this._max == 150) ? 'success' : 'failed');

         this._min = 10; this._max = 1923; console.log(this._min, this._max); this._reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : 0 2000 [0, 400, 800, 1200, 1600, 2000]',
                    (this._min == 0 && this._max == 2000) ? 'success' : 'failed');

         this._min = 10; this._max = 78; console.log(this._min, this._max); this._reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : 0 100 [0, 20, 40, 60, 80, 100]',
                    (this._min == 0 && this._max == 100) ? 'success' : 'failed');

         this._min = -31; this._max = -3; console.log(this._min, this._max); this._reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : -35 0 [-35, -28, -21, -14, -7, 0]',
                    (this._min == -35 && this._max == 0) ? 'success' : 'failed');

         this._min = -51; this._max = 203; console.log(this._min, this._max); this._reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : -60 240 [-60, 0, 60, 120, 180, 240]',
                    (this._min == -60 && this._max == 240) ? 'success' : 'failed');

         this._min = -251; this._max = 23; console.log(this._min, this._max); this._reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : -280 70 [-280, -210, -140, -70, 0, 70]',
                    (this._min == -280 && this._max == 70) ? 'success' : 'failed');

         this.option.precision = 2;
         this._min = 0.23; this._max = 0.78; console.log(this._min, this._max); this._reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : 0.00 1.00'
             + '["0.00", "0.20", "0.40", "0.60", "0.80", "1.00"]',
            (this._min == 0.00 && this._max == 1.00) ? 'success' : 'failed');

         this._min = -12.23; this._max = -0.78; console.log(this._min, this._max);
         this._reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : -15.00 0.00'
             + '["-15.00", "-12.00", "-9.00", "-6.00", "-3.00", "0.00"]',
            (this._min == -15.00 && this._max == 0.00) ? 'success' : 'failed');

         this._min = -0.23; this._max = 0.78; console.log(this._min, this._max); this._reformValue()
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : -0.30 1.20'
             + '["-0.30", "0.00", "0.30", "0.60", "0.90", "1.20"]',
            (this._min == -0.30 && this._max == 1.20) ? 'success' : 'failed');

         this._min = -1.23; this._max = 0.78; console.log(this._min, this._max); _reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : -1.50 1.00'
             + '["-1.50", "-1.00", "-0.50", "0.00", "0.50", "1.00"]',
            (this._min == -1.50 && this._max == 1.00) ? 'success' : 'failed');

         this.option.precision = 1;
         this._min = -2.3; this._max = 0.5; console.log(this._min, this._max); _reformValue();
         console.log('result is :', this._min, this._max, this._valueList);
         console.log('should be : -2.4 0.6'
             + '["-2.4", "-1.8", "-1.2", "-0.6", "0.0", "0.6"]',
            (this._min == -2.4 && this._max == 0.6) ? 'success' : 'failed');
         * --------
         */
        _reformValue : function (scale) {
            var splitNumber = this.option.splitNumber;
            var precision = this.option.precision;
            var splitGap;
            var power;
            if (precision === 0) {    // 整数
                 power = this.option.power > 1 ? this.option.power : 1;
            }
            else {                          // 小数
                // 放大倍数后复用整数逻辑，最后再缩小回去
                power = Math.pow(10, precision);
                this._min *= power;
                this._max *= power;
                power = this.option.power;
            }
            // console.log(this._min,this._max)
            var total;
            if (this._min >= 0 && this._max >= 0) {
                // 双正
                if (!scale) {
                    // power自动降级
                    while ((this._max / power < splitNumber) && power != 1) {
                        power = power / 10;
                    }
                    this._min = 0;
                }
                else {
                    // power自动降级
                    while (this._min < power && power != 1) {
                        power = power / 10;
                    }
                    if (precision === 0) {    // 整数
                        // 满足power
                        this._min = Math.floor(this._min / power) * power;
                        this._max = Math.ceil(this._max / power) * power;
                    }
                }
                power = power > 1 ? power / 10 : 1;
                total = this._max - this._min;
                splitGap = Math.ceil((total / splitNumber) / power) * power;
                this._max = this._min + splitGap * splitNumber;
            }
            else if (this._min <= 0 && this._max <= 0) {
                // 双负
                power = -power;
                if (!scale) {
                    // power自动降级
                    while ((this._min / power < splitNumber) && power != -1) {
                        power = power / 10;
                    }
                    this._max = 0;
                }
                else {
                    // power自动降级
                    while (this._max > power && power != -1) {
                        power = power / 10;
                    }
                    if (precision === 0) {    // 整数
                        // 满足power
                        this._min = Math.ceil(this._min / power) * power;
                        this._max = Math.floor(this._max / power) * power;
                    }
                }
                power = power < -1 ? power / 10 : -1;
                total = this._min - this._max;
                splitGap = -Math.ceil((total / splitNumber) / power) * power;
                this._min = -splitGap * splitNumber + this._max;
            }
            else {
                // 一正一负，确保0被选中
                total = this._max - this._min;
                // power自动降级
                while ((total / power < splitNumber) && power != 1) {
                    power = power/10;
                }
                // 正数部分的分隔数
                var partSplitNumber = Math.round(this._max / total * splitNumber);
                // 修正数据范围极度偏正向，留给负数一个
                partSplitNumber -= (partSplitNumber == splitNumber ? 1 : 0);
                // 修正数据范围极度偏负向，留给正数一个
                partSplitNumber += partSplitNumber === 0 ? 1 : 0;
                splitGap = (Math.ceil(Math.max(
                                          this._max / partSplitNumber,
                                          this._min / (partSplitNumber - splitNumber)
                                      )
                           / power))
                           * power;

                this._max = splitGap * partSplitNumber;
                this._min = splitGap * (partSplitNumber - splitNumber);
            }
            //console.log(this._min,this._max,'vvvvvrrrrrr')
            this._valueList = [];
            for (var i = 0; i <= splitNumber; i++) {
                this._valueList.push(this._min + splitGap * i);
            }

            if (precision !== 0) {    // 小数
                 // 放大倍数后复用整数逻辑，最后再缩小回去
                power = Math.pow(10, precision);
                this._min = (this._min / power).toFixed(precision) - 0;
                this._max = (this._max / power).toFixed(precision) - 0;
                for (var i = 0; i <= splitNumber; i++) {
                    this._valueList[i] = 
                        (this._valueList[i] / power).toFixed(precision) - 0;
                }
            }
            this._reformLabelData();
        },
        
        _customerValue : function () {
            var splitNumber = this.option.splitNumber;
            var precision = this.option.precision;
            var splitGap = (this._max - this._min) / splitNumber;
            
            this._valueList = [];
            for (var i = 0; i <= splitNumber; i++) {
                this._valueList.push((this._min + splitGap * i).toFixed(precision) - 0);
            }
            this._reformLabelData();
        },

        _reformLabelData : function () {
            this._valueLabel = [];
            var formatter = this.option.axisLabel.formatter;
            if (formatter) {
                for (var i = 0, l = this._valueList.length; i < l; i++) {
                    if (typeof formatter == 'function') {
                        this._valueLabel.push(formatter.call(this.myChart, this._valueList[i]));
                    }
                    else if (typeof formatter == 'string') {
                        this._valueLabel.push(
                            formatter.replace('{value}',this._valueList[i])
                        );
                    }
                }
            }
            else {
                // 每三位默认加,格式化
                for (var i = 0, l = this._valueList.length; i < l; i++) {
                    this._valueLabel.push(this.numAddCommas(this._valueList[i]));
                }
            }

        },
        
        getExtremum : function () {
            this._calculateValue();
            return {
                min: this._min,
                max: this._max
            };
        },

        /**
         * 刷新
         */
        refresh : function (newOption, newSeries) {
            if (newOption) {
                this.option = this.reformOption(newOption);
                // 通用字体设置
                this.option.axisLabel.textStyle = zrUtil.merge(
                    this.option.axisLabel.textStyle || {},
                    this.ecTheme.textStyle
                );
                this.series = newSeries;
            }
            if (this.zr) {   // 数值轴的另外一个功能只是用来计算极值
                this.clear();
                this._buildShape();
            }
        },

        // 根据值换算位置
        getCoord : function (value) {
            value = value < this._min ? this._min : value;
            value = value > this._max ? this._max : value;

            var result;
            if (!this.isHorizontal()) {
                // 纵向
                result = this.grid.getYend() 
                         - (value - this._min) 
                           / (this._max - this._min) 
                           * this.grid.getHeight();
            }
            else {
                // 横向
                result = this.grid.getX() 
                         + (value - this._min) 
                           / (this._max - this._min) 
                           * this.grid.getWidth();
            }

            return result;
            // Math.floor可能引起一些偏差，但性能会更好
            /* 准确更重要
            return (value == this._min || value == this._max)
                   ? result
                   : Math.floor(result);
            */
        },
        
        // 根据值换算绝对大小
        getCoordSize : function (value) {
            if (!this.isHorizontal()) {
                // 纵向
                return Math.abs(value / (this._max - this._min) * this.grid.getHeight());
            }
            else {
                // 横向
                return Math.abs(value / (this._max - this._min) * this.grid.getWidth());
            }
        },
        
        // 根据位置换算值
        getValueFromCoord : function(coord) {
            var result;
            if (!this.isHorizontal()) {
                // 纵向
                coord = coord < this.grid.getY() ? this.grid.getY() : coord;
                coord = coord > this.grid.getYend() ? this.grid.getYend() : coord;
                result = this._max 
                         - (coord - this.grid.getY()) 
                           / this.grid.getHeight() 
                           * (this._max - this._min);
            }
            else {
                // 横向
                coord = coord < this.grid.getX() ? this.grid.getX() : coord;
                coord = coord > this.grid.getXend() ? this.grid.getXend() : coord;
                result = this._min 
                         + (coord - this.grid.getX()) 
                           / this.grid.getWidth() 
                           * (this._max - this._min);
            }
            
            return result.toFixed(2) - 0;
        }
    };

    zrUtil.inherits(ValueAxis, Base);
    
    require('../component').define('valueAxis', ValueAxis);
    
    return ValueAxis;
});


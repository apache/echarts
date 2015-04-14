/**
 * echarts组件： 数值轴, Echarts, Zoomdata 2012-2015
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, kener.linfeng@gmail.com)
 * @author Ievgenii (@Ievgeny, ievgeny@zoomdata.com)
 */
define(function (require) {
    var Base = require('./base');

    // 图形依赖
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var RectangleShape = require('zrender/shape/Rectangle');

    var ecConfig = require('../config');
    // 数值型坐标轴默认参数
    ecConfig.logAxis = {
        zlevel: 0,                  // 一级层叠
        z: 0,                       // 二级层叠
        show: true,
        position: 'left',      // 位置
        name: '',              // 坐标轴名字，默认为空
        nameLocation: 'end',   // 坐标轴名字位置，支持'start' | 'end'
        nameTextStyle: {},     // 坐标轴文字样式，默认取全局样式
        boundaryGap: [0, 0],   // 数值起始和结束两端空白策略
        // min: null,          // 最小值
        // max: null,          // 最大值
        // scale: false,       // 脱离0值比例，放大聚焦到最终_min，_max区间
        // splitNumber: 5,        // 分割段数，默认为5
        axisLine: {            // 坐标轴线
            show: true,        // 默认显示，属性show控制显示与否
            onZero: true,
            lineStyle: {       // 属性lineStyle控制线条样式
                color: '#48b',
                width: 2,
                type: 'solid'
            }
        },
        axisTick: {            // 坐标轴小标记
            show: false,       // 属性show控制显示与否，默认不显示
            inside: false,     // 控制小标记是否在grid里
            length :5,         // 属性length控制线长
            lineStyle: {       // 属性lineStyle控制线条样式
                color: '#333',
                width: 1
            }
        },
        axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
            show: true,
            rotate: 0,
            margin: 8,
            // clickable: false,
            // formatter: null,
            textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                color: '#333'
            }
        },
        splitLine: {           // 分隔线
            show: true,        // 默认显示，属性show控制显示与否
            lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                color: ['#ccc'],
                width: 1,
                type: 'solid'
            }
        },
        splitArea: {           // 分隔区域
            show: false,       // 默认不显示，属性show控制显示与否
            areaStyle: {       // 属性areaStyle（详见areaStyle）控制区域样式
                color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)']
            }
        },
        /* Zoomdata, Ievgenii */
        logOptions: {         // Options determine behaviour of logarithmic axis
            base: 10,         // Logarithm base
            minLocked: true,  // Options specify should scale begin directly from range value or from
            maxLocked: false, // value from corresponding group (ex. 1,10,100 for base 10)
            type: 'detailed'  // main/detailed Determine whether show or not 'small' values between
        }                     // main groups (ex. 2,3,4...9 between 1..10 for base 10)
    };

    var ecDate = require('../util/date');
    var zrUtil = require('zrender/tool/util');

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 类目轴参数
     * @param {Object} component 组件
     * @param {Array} series 数据对象
     */
    function LogAxis(ecTheme, messageCenter, zr, option, myChart, axisBase, series) {
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

    LogAxis.prototype = {
        type: ecConfig.COMPONENT_TYPE_AXIS_LOG,

        _buildShape: function () {
            this._hasData = false;
            this._calculateValue();
            if (!this._hasData || !this.option.show) {
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
        _buildAxisTick: function () {
            var axShape;
            var data       = this._valueList;
            var dataLength = this._valueList.length;
            var tickOption = this.option.axisTick;
            var length     = tickOption.length;
            var color      = tickOption.lineStyle.color;
            var lineWidth  = tickOption.lineStyle.width;

            if (this.isHorizontal()) {
                // 横向
                var yPosition = this.option.position === 'bottom'
                    ? (tickOption.inside
                    ? (this.grid.getYend() - length - 1) : (this.grid.getYend()) + 1)
                    : (tickOption.inside
                    ? (this.grid.getY() + 1) : (this.grid.getY() - length - 1));
                var x;
                for (var i = 0; i < dataLength; i++) {
                    // 亚像素优化
                    x = this.subPixelOptimize(this.getCoord(data[i]), lineWidth);
                    axShape = {
                        _axisShape: 'axisTick',
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        hoverable: false,
                        style: {
                            xStart: x,
                            yStart: yPosition,
                            xEnd: x,
                            yEnd: yPosition + length,
                            strokeColor: color,
                            lineWidth: lineWidth
                        }
                    };
                    this.shapeList.push(new LineShape(axShape));
                }
            }
            else {
                // 纵向
                var xPosition = this.option.position === 'left'
                    ? (tickOption.inside
                    ? (this.grid.getX() + 1) : (this.grid.getX() - length - 1))
                    : (tickOption.inside
                    ? (this.grid.getXend() - length - 1) : (this.grid.getXend() + 1));

                var y;
                for (var i = 0; i < dataLength; i++) {
                    // 亚像素优化
                    y = this.subPixelOptimize(this.getCoord(data[i]), lineWidth);
                    axShape = {
                        _axisShape: 'axisTick',
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        hoverable: false,
                        style: {
                            xStart: xPosition,
                            yStart: y,
                            xEnd: xPosition + length,
                            yEnd: y,
                            strokeColor: color,
                            lineWidth: lineWidth
                        }
                    };
                    this.shapeList.push(new LineShape(axShape));
                }
            }
        },

        // 坐标轴文本
        _buildAxisLabel: function () {
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
                if (this.option.position === 'bottom') {
                    yPosition = this.grid.getYend() + margin;
                    baseLine = 'top';
                }
                else {
                    yPosition = this.grid.getY() - margin;
                    baseLine = 'bottom';
                }

                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase() +3,
                        hoverable: false,
                        style: {
                            x: this.getCoord(data[i]),
                            y: yPosition,
                            color: typeof textStyle.color === 'function'
                                ? textStyle.color(data[i]) : textStyle.color,
                            text: this._valueLabel[i],
                            textFont: this.getFont(textStyle),
                            textAlign: textStyle.align || 'center',
                            textBaseline: textStyle.baseline || baseLine
                        }
                    };
                    if (rotate) {
                        axShape.style.textAlign = rotate > 0
                            ? (this.option.position === 'bottom'
                            ? 'right' : 'left')
                            : (this.option.position === 'bottom'
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
                if (this.option.position === 'left') {
                    xPosition = this.grid.getX() - margin;
                    align = 'right';
                }
                else {
                    xPosition = this.grid.getXend() + margin;
                    align = 'left';
                }

                for (var i = 0; i < dataLength; i++) {
                    axShape = {
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase() + 3,
                        hoverable: false,
                        style: {
                            x: xPosition,
                            y: this.getCoord(data[i]),
                            color: typeof textStyle.color === 'function'
                                ? textStyle.color(data[i]) : textStyle.color,
                            text: this._valueLabel[i],
                            textFont: this.getFont(textStyle),
                            textAlign: textStyle.align || align,
                            textBaseline: textStyle.baseline
                            || (
                                (i === 0 && this.option.name !== '')
                                    ? 'bottom'
                                    : (i === dataLength - 1 && this.option.name !== '') ? 'top' : 'middle'
                            )
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

        _buildSplitLine: function () {
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
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        hoverable: false,
                        style: {
                            xStart: x,
                            yStart: sy,
                            xEnd: x,
                            yEnd: ey,
                            strokeColor: color[i % colorLength],
                            lineType: lineType,
                            lineWidth: lineWidth
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
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        hoverable: false,
                        style: {
                            xStart: sx,
                            yStart: y,
                            xEnd: ex,
                            yEnd: y,
                            strokeColor: color[i % colorLength],
                            lineType: lineType,
                            lineWidth: lineWidth
                        }
                    };
                    this.shapeList.push(new LineShape(axShape));
                }
            }
        },

        _buildSplitArea: function () {
            var axShape;
            var color = this.option.splitArea.areaStyle.color;

            if (!(color instanceof Array)) {
                // 非数组一律认为是单一颜色的字符串，单一颜色则用一个背景，颜色错误不负责啊！！！
                axShape = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    hoverable: false,
                    style: {
                        x: this.grid.getX(),
                        y: this.grid.getY(),
                        width: this.grid.getWidth(),
                        height: this.grid.getHeight(),
                        color: color
                        // type: this.option.splitArea.areaStyle.type,
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
                            zlevel: this.getZlevelBase(),
                            z: this.getZBase(),
                            hoverable: false,
                            style: {
                                x: lastX,
                                y: y,
                                width: curX - lastX,
                                height: height,
                                color: color[i % colorLength]
                                // type: this.option.splitArea.areaStyle.type,
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
                            zlevel: this.getZlevelBase(),
                            z: this.getZBase(),
                            hoverable: false,
                            style: {
                                x: x,
                                y: curY,
                                width: width,
                                height: lastYend - curY,
                                color: color[i % colorLength]
                                // type: this.option.splitArea.areaStyle.type
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
        _calculateValue: function () {
            if (isNaN(this.option.min - 0) || isNaN(this.option.max - 0)) {
                // 有一个没指定都得算
                // 数据整形
                var data = {};          // 整形后数据抽取
                var xIdx;
                var yIdx;
                var legend = this.component.legend;
                for (var i = 0, l = this.series.length; i < l; i++) {
                    if (this.series[i].type != ecConfig.CHART_TYPE_LINE
                        && this.series[i].type != ecConfig.CHART_TYPE_BAR
                        && this.series[i].type != ecConfig.CHART_TYPE_SCATTER
                        && this.series[i].type != ecConfig.CHART_TYPE_K
                        && this.series[i].type != ecConfig.CHART_TYPE_EVENTRIVER
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

                    this._calculSum(data, i);
                }

                // 找极值
                var oriData;            // 原始数据
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

                // console.log(this._min,this._max,'vvvvv111111',this.option.type)
                var gap = Math.abs(this._max - this._min);
                this._min = isNaN(this.option.min - 0)
                    ? (this._min - Math.abs(gap * this.option.boundaryGap[0]))
                    : (this.option.min - 0);    // 指定min忽略boundaryGay[0]

                this._max = isNaN(this.option.max - 0)
                    ? (this._max + Math.abs(gap * this.option.boundaryGap[1]))
                    : (this.option.max - 0);    // 指定max忽略boundaryGay[1]
                if (this._min === this._max) {
                    if (this._max === 0) {
                        // 修复全0数据
                        this._max = 1;
                    }
                    // 修复最大值==最小值时数据整形
                    else if (this._max > 0) {
                        this._min = this._max / this.option.splitNumber != null ? this.option.splitNumber : 5;
                    }
                    else { // this._max < 0
                        this._max = this._max / this.option.splitNumber != null ? this.option.splitNumber : 5;
                    }
                }
                this.option.type != 'time'
                    ? this._reformValue(this.option.scale)
                    : this._reformTimeValue();
            }
            else {
                this._hasData = true;
                // 用户指定min max就不多管闲事了
                this._min = this.option.min - 0;    // 指定min忽略boundaryGay[0]
                this._max = this.option.max - 0;    // 指定max忽略boundaryGay[1]
                this.option.type != 'time'
                    ? this._customerValue()
                    : this._reformTimeValue();
            }
        },

        /**
         * 内部使用，计算某系列下的堆叠和
         */
        _calculSum: function (data, i) {
            var key = this.series[i].name || 'kener';
            var value;
            var oriData;
            if (!this.series[i].stack) {
                data[key] = data[key] || [];
                if (this.series[i].type != ecConfig.CHART_TYPE_EVENTRIVER) {
                    oriData = this.series[i].data;
                    for (var j = 0, k = oriData.length; j < k; j++) {
                        value = this.getDataFromOption(oriData[j]);
                        if (this.series[i].type === ecConfig.CHART_TYPE_K) {
                            data[key].push(value[0]);
                            data[key].push(value[1]);
                            data[key].push(value[2]);
                            data[key].push(value[3]);
                        }
                        else if (value instanceof Array) {
                            // scatter 、 不等距 line bar
                            if (this.option.xAxisIndex != -1) {
                                data[key].push(
                                    this.option.type != 'time'
                                        ? value[0] : ecDate.getNewDate(value[0])
                                );
                            }
                            if (this.option.yAxisIndex != -1) {
                                data[key].push(
                                    this.option.type != 'time'
                                        ? value[1] : ecDate.getNewDate(value[1])
                                );
                            }
                        }
                        else {
                            data[key].push(value);
                        }
                    }
                }
                else {
                    // eventRiver
                    oriData = this.series[i].data;
                    for (var j = 0, k = oriData.length; j < k; j++) {
                        var evolution = oriData[j].evolution;
                        for (var m = 0, n = evolution.length; m < n; m++) {
                            data[key].push(ecDate.getNewDate(evolution[m].time));
                        }
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
                    value = this.getDataFromOption(oriData[j]);
                    if (value === '-') {
                        continue;
                    }
                    value = value - 0;
                    if (value >= 0) {
                        if (data[keyP][j] != null) {
                            data[keyP][j] += value;
                        }
                        else {
                            data[keyP][j] = value;
                        }
                    }
                    else {
                        if (data[keyN][j] != null) {
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
        },

        /* Zoomdata, Ievgenii */
        _reformValue: function (scale) {
            var smartLogSteps = require('../util/smartLogSteps');

            // 非scale下双正，修正最小值为0
            if (!scale && this._min >= 0 && this._max >= 0) {
                this._min = 0;
            }
            // 非scale下双负，修正最大值为0
            if (!scale && this._min <= 0 && this._max <= 0) {
                this._max = 0;
            }

            var logOptions = { // Options for logarithmic scales
                base: this.option.logOptions.base,
                positive:  true,
                minLocked: this.option.logOptions.minLocked,
                maxLocked: this.option.logOptions.maxLocked,
                type: this.option.logOptions.type
            };

            // Check cases when min is undefined
            if (typeof this._min === 'undefined') this._min = this._max;

            var stepOpt = smartLogSteps(this._min, this._max, logOptions);

            this._min = stepOpt.min;
            this._max = stepOpt.max;
            this._positive = stepOpt.positive;
            this._log = stepOpt.methods.log;
            this._valueList = stepOpt.pnts;
            this._labelsList = stepOpt.pnts;
            this._reformLabelData();
        },

        /**
         * 格式化时间值
         */
        _reformTimeValue : function() {
            var splitNumber = this.option.splitNumber != null ? this.option.splitNumber : 5;

            // 最优解
            var curValue = ecDate.getAutoFormatter(this._min, this._max, splitNumber);
            // 目标
            var formatter = curValue.formatter;
            var gapValue = curValue.gapValue;

            this._valueList = [ecDate.getNewDate(this._min)];
            var startGap;
            switch (formatter) {
                case 'week' :
                    startGap = ecDate.nextMonday(this._min);
                    break;
                case 'month' :
                    startGap = ecDate.nextNthOnMonth(this._min, 1);
                    break;
                case 'quarter' :
                    startGap = ecDate.nextNthOnQuarterYear(this._min, 1);
                    break;
                case 'half-year' :
                    startGap = ecDate.nextNthOnHalfYear(this._min, 1);
                    break;
                case 'year' :
                    startGap = ecDate.nextNthOnYear(this._min, 1);
                    break;
                default :
                    // 大于2小时需要考虑时区不能直接取整
                    if (gapValue <= 3600000 * 2) {
                        startGap = (Math.floor(this._min / gapValue) + 1) * gapValue;
                    }
                    else {
                        startGap = ecDate.getNewDate(this._min - (-gapValue));
                        startGap.setHours(Math.round(startGap.getHours() / 6) * 6);
                        startGap.setMinutes(0);
                        startGap.setSeconds(0);
                    }
                    break;
            }

            if (startGap - this._min < gapValue / 2) {
                startGap -= -gapValue;
            }

            // console.log(startGap,gapValue,this._min, this._max,formatter)
            curValue = ecDate.getNewDate(startGap);
            splitNumber *= 1.5;
            while (splitNumber-- >= 0) {
                if (formatter == 'month'
                    || formatter == 'quarter'
                    || formatter == 'half-year'
                    || formatter == 'year'
                ) {
                    curValue.setDate(1);
                }
                if (this._max - curValue < gapValue / 2) {
                    break;
                }
                this._valueList.push(curValue);
                curValue = ecDate.getNewDate(curValue - (-gapValue));
            }
            this._valueList.push(ecDate.getNewDate(this._max));

            this._reformLabelData(formatter);
        },

        _customerValue: function () {
            var accMath = require('../util/accMath');
            var splitNumber = this.option.splitNumber != null ? this.option.splitNumber : 5;
            var splitGap = (this._max - this._min) / splitNumber;

            this._valueList = [];
            for (var i = 0; i <= splitNumber; i++) {
                this._valueList.push(accMath.accAdd(this._min, accMath.accMul(splitGap, i)));
            }
            this._reformLabelData();
        },

        /* Zoomdata, Ievgenii */
        _reformLabelData: function (timeFormatter) {
            this._valueLabel = [];

            var formatter = this.option.axisLabel.formatter;
            if (formatter) {
                for (var i = 0, l = this._valueList.length; i < l; i++) {
                    if (typeof formatter === 'function') {
                        this._valueLabel.push(
                            timeFormatter
                                ? formatter.call(this.myChart, this._labelsList[i], timeFormatter)
                                : formatter.call(this.myChart, this._labelsList[i])
                        );
                    }
                    else if (typeof formatter === 'string') {
                        this._valueLabel.push(
                            timeFormatter
                                ? ecDate.format(formatter, this._labelsList[i])
                                : formatter.replace('{value}',this._labelsList[i])
                        );
                    }
                }
            }
            else if (timeFormatter) {
                for (var i = 0, l = this._valueList.length; i < l; i++) {
                    this._valueLabel.push(ecDate.format(timeFormatter, this._labelsList[i]));
                }
            }
            else {
                // 每三位默认加,格式化
                for (var i = 0, l = this._valueList.length; i < l; i++) {
                    this._valueLabel.push(this.numAddCommas(this._labelsList[i]));
                }
            }
        },

        getExtremum: function () {
            this._calculateValue();
            return {
                min: this._min,
                max: this._max
            };
        },

        /**
         * 刷新
         */
        refresh: function (newOption, newSeries) {
            if (newOption) {
                this.option = this.reformOption(newOption);
                // 通用字体设置
                this.option.axisLabel.textStyle = zrUtil.merge(
                    this.option.axisLabel.textStyle || {},
                    this.ecTheme.textStyle
                );
                this.series = newSeries;
            }
            if (this.zr) {
                this.clear();
                this._buildShape();
            }
        },

        // 根据值换算位置
        /* Zoomdata, Ievgenii */
        getCoord: function (value) {
            // To provide logarithmic scales all values first should be converted into
            // logarithm with corresponding base and than multiplied on precision
            // coefficient to convert logarithmic values to values in real [min, max] range
            value = this._log(value, this.option.logOptions.base, this._positive);

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
             return (value === this._min || value === this._max)
             ? result
             : Math.floor(result);
             */
        },

        // 根据值换算绝对大小
        getCoordSize: function (value) {
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
        /* Zoomdata, Ievgenii */
        getValueFromCoord: function(coord) {
            var base = this.option.logOptions.base;
            var result;
            var positive = this._positive;

            function pow(x) {
                return positive ? Math.pow(base, x) : -Math.pow(base, -x);
            }

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
            return pow(result).toFixed(2) - 0;
        },

        isMaindAxis : function (value) {
            for (var i = 0, l = this._valueList.length; i < l; i++) {
                if (this._valueList[i] === value) {
                    return true;
                }
            }
            return false;
        }
    };

    zrUtil.inherits(LogAxis, Base);

    require('../component').define('logAxis', LogAxis);

    return LogAxis;
});


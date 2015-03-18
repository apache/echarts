/**
 * echarts组件类：极坐标
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Neil (杨骥, 511415343@qq.com)
 *
 */
define(function (require) {
    var Base = require('./base');

    // 图形依赖
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var PolygonShape = require('zrender/shape/Polygon');
    var Circle = require('zrender/shape/Circle');
    var Ring = require('zrender/shape/Ring');

    var ecConfig = require('../config');
    ecConfig.polar = {
        zlevel: 0,                  // 一级层叠
        z: 0,                       // 二级层叠
        center: ['50%', '50%'],    // 默认全局居中
        radius: '75%',
        startAngle: 90,
        boundaryGap: [0, 0],   // 数值起始和结束两端空白策略
        splitNumber: 5,
        name: {
            show: true,
            // formatter: null,
            textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                color: '#333'
            }
        },
        axisLine: {            // 坐标轴线
            show: true,        // 默认显示，属性show控制显示与否
            lineStyle: {       // 属性lineStyle控制线条样式
                color: '#ccc',
                width: 1,
                type: 'solid'
            }
        },
        axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
            show: false,
            // formatter: null,
            textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                color: '#333'
            }
        },
        splitArea: {
            show: true,
            areaStyle: {
                color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)']
            }
        },
        splitLine: {
            show: true,
            lineStyle: {
                width: 1,
                color: '#ccc'
            }
        },
        type: 'polygon'
        // indicator: []
    };

    var zrUtil = require('zrender/tool/util');
    var ecCoordinates = require('../util/coordinates');

    function Polar(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);

        this.refresh(option);
    }

    Polar.prototype = {
        type : ecConfig.COMPONENT_TYPE_POLAR,

        /**
         * 绘制图形
         */
        _buildShape : function () {
            for (var i = 0; i < this.polar.length; i ++) {
                this._index = i;
                this.reformOption(this.polar[i]);

                this._queryTarget = [this.polar[i], this.option];
                this._createVector(i);
                this._buildSpiderWeb(i);

                this._buildText(i);

                this._adjustIndicatorValue(i);
                this._addAxisLabel(i);
            }

            for (var i = 0; i < this.shapeList.length; i ++) {
                this.zr.addShape(this.shapeList[i]);
            }
        },

        /**
         * 生成蜘蛛网顶点坐标
         * @param {number} polar的index
         */
        _createVector : function (index) {
            var item = this.polar[index];
            var indicator = this.deepQuery(this._queryTarget, 'indicator');
            var length = indicator.length;
            var startAngle = item.startAngle ;
            var dStep = 2 * Math.PI / length;
            var radius = this._getRadius();
            var __ecIndicator = item.__ecIndicator = [];
            var vector;

            for (var i = 0 ;i < length ; i ++) {
                vector = ecCoordinates.polar2cartesian(
                    radius, startAngle * Math.PI / 180 + dStep * i
                );
                __ecIndicator.push({
                    // 将图形翻转
                    vector : [vector[1], -vector[0]]
                });
            }
        },

        /**
         * 获取外圈的半径
         *
         * @return {number}
         */
        _getRadius : function () {
            var item = this.polar[this._index];
            return this.parsePercent(
                item.radius,
                Math.min(this.zr.getWidth(), this.zr.getHeight()) / 2
            );
        },

        /**
         * 构建蜘蛛网
         * @param {number} polar的index
         */
        _buildSpiderWeb : function (index) {
            var item = this.polar[index];
            var __ecIndicator = item.__ecIndicator;
            var splitArea = item.splitArea;
            var splitLine = item.splitLine;

            var center = this.getCenter(index);
            var splitNumber = item.splitNumber;

            var strokeColor = splitLine.lineStyle.color;
            var lineWidth = splitLine.lineStyle.width;
            var show = splitLine.show;

            var axisLine = this.deepQuery(this._queryTarget, 'axisLine');

            this._addArea(
                __ecIndicator, splitNumber, center,
                splitArea, strokeColor, lineWidth, show
            );

            axisLine.show && this._addLine(
                __ecIndicator, center, axisLine
            );
        },

        /**
         * 绘制axisLabel
         */
        _addAxisLabel : function (index) {
            var accMath = require('../util/accMath');
            var item = this.polar[index];
            var indicator = this.deepQuery(this._queryTarget, 'indicator');
            var __ecIndicator = item.__ecIndicator;
            var axisLabel;
            var vector;
            var style;
            var newStyle;
            var splitNumber = this.deepQuery(this._queryTarget, 'splitNumber');
            var center = this.getCenter(index);
            var vector;
            var value;
            var text;
            var theta;
            // var startAngle = this.deepQuery(this._queryTarget, 'startAngle');
            var offset;
            var interval;

            for (var i = 0; i < indicator.length; i ++) {
                axisLabel = this.deepQuery(
                    [indicator[i], item, this.option], 'axisLabel'
                );

                if (axisLabel.show) {
                    var textStyle = this.deepQuery([axisLabel, item, this.option], 'textStyle');
                    var formatter = this.deepQuery([axisLabel, item], 'formatter');
                    style = {};
                    style.textFont = this.getFont(textStyle);
                    style.color = textStyle.color;

                    style = zrUtil.merge(style, axisLabel);
                    style.lineWidth = style.width;

                    vector = __ecIndicator[i].vector;
                    value = __ecIndicator[i].value;
                    theta = i / indicator.length * 2 * Math.PI;
                    offset = axisLabel.offset || 10;
                    interval = axisLabel.interval || 0;

                    if (!value) {
                        return;
                    }

                    for (var j = 1 ; j <= splitNumber; j += interval + 1) {
                        newStyle = zrUtil.merge({}, style);
                        text = accMath.accAdd(value.min, accMath.accMul(value.step, j));

                        if (typeof formatter === 'function') {
                            text = formatter(text);
                        }
                        else if (typeof formatter === 'string') {
                            text = formatter.replace('{a}','{a0}')
                                         .replace('{a0}', text);
                        }
                        else {
                            text = this.numAddCommas(text);
                        }

                        newStyle.text = text;
                        newStyle.x = j * vector[0] / splitNumber
                                     + Math.cos(theta) * offset + center[0];
                        newStyle.y = j * vector[1] / splitNumber
                                     + Math.sin(theta) * offset + center[1];

                        this.shapeList.push(new TextShape({
                            zlevel: this.getZlevelBase(),
                            z: this.getZBase(),
                            style : newStyle,
                            draggable : false,
                            hoverable : false
                        }));
                    }
                }
            }
        },

        /**
         * 绘制坐标头的文字
         * @param {number} polar的index
         */
        _buildText  : function (index) {
            var item = this.polar[index];
            var __ecIndicator = item.__ecIndicator;
            var vector;
            var indicator = this.deepQuery(this._queryTarget, 'indicator');
            var center = this.getCenter(index);
            var style;
            var textAlign;
            var name;
            var rotation;
            var x = 0;
            var y = 0;
            var margin;
            var textStyle;

            for (var i = 0; i < indicator.length; i ++) {
                name = this.deepQuery(
                    [indicator[i], item, this.option], 'name'
                );

                if (!name.show) {
                    continue;
                }
                textStyle = this.deepQuery(
                    [name, item, this.option],
                    'textStyle'
                );

                style = {};

                style.textFont = this.getFont(textStyle);
                style.color = textStyle.color;

                if (typeof name.formatter == 'function') {
                    style.text = name.formatter.call(this.myChart, indicator[i].text, i);
                }
                else if (typeof name.formatter == 'string'){
                    style.text = name.formatter.replace(
                        '{value}', indicator[i].text
                    );
                }
                else {
                    style.text = indicator[i].text;
                }
                __ecIndicator[i].text = style.text;

                vector = __ecIndicator[i].vector;

                if (Math.round(vector[0]) > 0) {
                    textAlign = 'left';
                }
                else if (Math.round(vector[0]) < 0) {
                    textAlign = 'right';
                }
                else {
                    textAlign = 'center';
                }

                if (name.margin == null) {
                    vector = this._mapVector(vector, center, 1.1);
                }
                else {
                    margin = name.margin;
                    x = vector[0] > 0 ? margin : - margin;
                    y = vector[1] > 0 ? margin : - margin;

                    x = vector[0] === 0 ? 0 : x;
                    y = vector[1] === 0 ? 0 : y;
                    vector = this._mapVector(vector, center, 1);
                }


                style.textAlign = textAlign;
                style.x = vector[0] + x;
                style.y = vector[1] + y;

                if (name.rotate) {
                    rotation = [
                        name.rotate / 180 * Math.PI,
                        vector[0], vector[1]
                    ];
                }
                else {
                    rotation = [0, 0, 0];
                }

                this.shapeList.push(new TextShape({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style : style,
                    draggable : false,
                    hoverable : false,
                    rotation : rotation
                }));
            }
        },

        getIndicatorText : function(polarIndex, indicatorIndex) {
            return this.polar[polarIndex]
                   && this.polar[polarIndex].__ecIndicator[indicatorIndex]
                   && this.polar[polarIndex].__ecIndicator[indicatorIndex].text;
        },

        /**
         * 添加一个隐形的盒子 当做drop的容器 暴露给外部的图形类使用
         * @param {number} polar的index
         * @return {Object} 添加的盒子图形
         */
        getDropBox : function (index) {
            var index = index || 0;
            var item = this.polar[index];
            var center = this.getCenter(index);
            var __ecIndicator = item.__ecIndicator;
            var len = __ecIndicator.length;
            var pointList = [];
            var vector;
            var shape;
            var type = item.type;

            if (type == 'polygon') {
                for (var i = 0; i < len; i ++) {
                    vector = __ecIndicator[i].vector;
                    pointList.push(this._mapVector(vector, center, 1.2));
                }
                shape = this._getShape(
                    pointList, 'fill', 'rgba(0,0,0,0)', '', 1
                );
            } else if (type == 'circle') {
                shape = this._getCircle(
                    '', 1, 1.2, center, 'fill', 'rgba(0,0,0,0)'
                );
            }

            return shape;
        },

        /**
         * 绘制蜘蛛网的正n变形
         *
         * @param {Array<Object>} 指标数组
         * @param {number} 分割线数量
         * @param {Array<number>} 中点坐标
         * @param {Object} 分割区域对象
         * @param {string} 线条颜色
         * @param {number} 线条宽度
         */
        _addArea : function (
            __ecIndicator, splitNumber, center,
            splitArea, strokeColor, lineWidth, show
        ) {
            var shape;
            var scale;
            var scale1;
            var pointList;
            var type = this.deepQuery(this._queryTarget, 'type');

            for (var i = 0; i < splitNumber ; i ++ ) {
                scale = (splitNumber - i) / splitNumber;

                if (show) {
                    if (type == 'polygon') {
                        pointList = this._getPointList(
                            __ecIndicator, scale, center);
                        shape = this._getShape(
                            pointList, 'stroke', '', strokeColor, lineWidth
                        );
                    } else if (type == 'circle') {
                        shape = this._getCircle(
                            strokeColor, lineWidth, scale, center, 'stroke'
                        );
                    }

                    this.shapeList.push(shape);
                }

                if (splitArea.show) {
                    scale1 = (splitNumber - i - 1) / splitNumber;
                    this._addSplitArea(
                        __ecIndicator, splitArea, scale, scale1, center, i
                    );
                }
            }
        },

        /**
         * 绘制圆
         *
         * @param {string} strokeColor
         * @param {number} lineWidth
         * @param {number} scale
         * @param {Array.<number>} center
         * @param {string} brushType
         * @param {string} color
         * @return {Circle}
         */
        _getCircle : function (
            strokeColor, lineWidth, scale, center, brushType, color
        ) {
            var radius = this._getRadius();
            return new Circle({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    x: center[0],
                    y: center[1],
                    r: radius * scale,
                    brushType: brushType,
                    strokeColor: strokeColor,
                    lineWidth: lineWidth,
                    color: color
                },
                hoverable : false,
                draggable : false
            });
        },

        /**
         * 绘制圆环
         *
         * @param {string} color  间隔颜色
         * @param {number} scale0  小圆的scale
         * @param {number} scale1  大圆的scale
         * @param {Array.<number>} center  圆点
         * @return {Ring}
         */
        _getRing : function (color, scale0, scale1, center) {
            var radius = this._getRadius();
            return new Ring({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style : {
                    x : center[0],
                    y : center[1],
                    r : scale0 * radius,
                    r0 : scale1 * radius,
                    color : color,
                    brushType : 'fill'
                },
                hoverable : false,
                draggable : false
            });
        },

        /**
         * 获取需要绘制的多边形的点集
         * @param {Object} serie的指标参数
         * @param {number} 缩小的系数
         * @param {Array<number>} 中点坐标
         *
         * @return {Array<Array<number>>} 返回绘制的点集
         */
        _getPointList : function (__ecIndicator, scale, center) {
            var pointList = [];
            var len = __ecIndicator.length;
            var vector;

            for (var i = 0 ; i < len ; i ++ ) {
                vector = __ecIndicator[i].vector;

                pointList.push(this._mapVector(vector, center, scale));
            }
            return pointList;
        },

        /**
         * 获取绘制的图形
         * @param {Array<Array<number>>} 绘制的点集
         * @param {string} 绘制方式 stroke | fill | both 描边 | 填充 | 描边 + 填充
         * @param {string} 颜色
         * @param {string} 描边颜色
         * @param {number} 线条宽度
         * @return {Object} 绘制的图形对象
         */
        _getShape : function (
            pointList, brushType, color, strokeColor, lineWidth
        ) {
            return new PolygonShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style : {
                    pointList   : pointList,
                    brushType   : brushType,
                    color       : color,
                    strokeColor : strokeColor,
                    lineWidth   : lineWidth
                },
                hoverable : false,
                draggable : false
            });
        },

        /**
         * 绘制填充区域
         */
        _addSplitArea : function (
            __ecIndicator, splitArea, scale, scale1, center, colorInd
        ) {
            var indLen = __ecIndicator.length;
            var color;
            var colorArr = splitArea.areaStyle.color;
            var colorLen;

            var vector;
            var vector1;
            var pointList = [];
            var indLen = __ecIndicator.length;
            var shape;

            var type = this.deepQuery(this._queryTarget, 'type');

            if (typeof colorArr == 'string') {
                colorArr = [colorArr];
            }
            colorLen = colorArr.length;
            color = colorArr[ colorInd % colorLen];

            if (type == 'polygon') {
                for (var i = 0; i < indLen ; i ++) {
                    pointList = [];
                    vector = __ecIndicator[i].vector;
                    vector1 = __ecIndicator[(i + 1) % indLen].vector;

                    pointList.push(this._mapVector(vector, center, scale));
                    pointList.push(this._mapVector(vector, center, scale1));
                    pointList.push(this._mapVector(vector1, center, scale1));
                    pointList.push(this._mapVector(vector1, center, scale));

                    shape = this._getShape(
                        pointList, 'fill', color, '', 1
                    );
                    this.shapeList.push(shape);
                }
            } else if (type == 'circle') {
                shape = this._getRing(color, scale, scale1, center);
                this.shapeList.push(shape);
            }
        },

        /**
         * 转换坐标
         *
         * @param {Array<number>} 原始坐标
         * @param {Array<number>} 中点坐标
         * @param {number} 缩小的倍数
         *
         * @return {Array<number>} 转换后的坐标
         */
        _mapVector : function (vector, center, scale) {
            return [
                vector[0] * scale + center[0],
                vector[1] * scale + center[1]
            ];
        },

        /**
         * 获取中心点位置 暴露给外部图形类使用
         * @param {number} polar的index
         */
        getCenter : function (index) {
            var index = index || 0;
            return this.parseCenter(this.zr, this.polar[index].center);
        },

        /**
         * 绘制从中点出发的线
         *
         * @param {Array<Object>} 指标对象
         * @param {Array<number>} 中点坐标
         * @param {string} 线条颜色
         * @param {number} 线条宽度
         * @param {string} 线条绘制类型
         *              solid | dotted | dashed 实线 | 点线 | 虚线
         */
        _addLine : function (
            __ecIndicator, center, axisLine
        ) {
            var indLen = __ecIndicator.length;
            var line;
            var vector;
            var lineStyle = axisLine.lineStyle;
            var strokeColor = lineStyle.color;
            var lineWidth = lineStyle.width;
            var lineType = lineStyle.type;

            for (var i = 0; i < indLen ; i ++ ) {
                vector = __ecIndicator[i].vector;
                line = this._getLine(
                    center[0], center[1],
                    vector[0] + center[0],
                    vector[1] + center[1],
                    strokeColor, lineWidth, lineType
                );
                this.shapeList.push(line);
            }
        },

        /**
         * 获取线条对象
         * @param {number} 出发点横坐标
         * @param {number} 出发点纵坐标
         * @param {number} 终点横坐标
         * @param {number} 终点纵坐标
         * @param {string} 线条颜色
         * @param {number} 线条宽度
         * @param {string} 线条类型
         *
         * @return {Object} 线条对象
         */
        _getLine : function (
            xStart, yStart, xEnd, yEnd, strokeColor, lineWidth, lineType
        ) {
            return new LineShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style : {
                    xStart : xStart,
                    yStart : yStart,
                    xEnd   : xEnd,
                    yEnd   : yEnd,
                    strokeColor : strokeColor,
                    lineWidth   : lineWidth,
                    lineType    : lineType
                },
                hoverable : false
            });
        },

        /**
         * 调整指标的值，当indicator中存在max时设置为固定值
         * @param {number} polar的index
         */
        _adjustIndicatorValue : function (index) {
            var item = this.polar[index];
            var indicator = this.deepQuery(this._queryTarget, 'indicator');
            var len = indicator.length;
            var __ecIndicator = item.__ecIndicator;
            var max;
            var min;
            var data = this._getSeriesData(index);

            var boundaryGap = item.boundaryGap;
            var splitNumber = item.splitNumber;
            var scale = item.scale;
            var opts;

            var smartSteps = require('../util/smartSteps');
            for (var i = 0; i < len ; i ++ ) {
                if (typeof indicator[i].max == 'number') {
                    max = indicator[i].max;
                    min = indicator[i].min || 0;
                    opts = {
                        max: max,
                        min: min
                    };
                }
                else {
                    var value = this._findValue(
                        data, i, splitNumber, boundaryGap
                    );
                    min = value.min;
                    max = value.max;
                }
                 // 非scale下双正，修正最小值为0
                if (!scale && min >= 0 && max >= 0) {
                    min = 0;
                }
                // 非scale下双负，修正最大值为0
                if (!scale && min <= 0 && max <= 0) {
                    max = 0;
                }
                var stepOpt = smartSteps(min, max, splitNumber, opts);

                __ecIndicator[i].value = {
                    min: stepOpt.min,
                    max: stepOpt.max,
                    step: stepOpt.step
                };
            }
        },

        /**
         * 将series中的数据拿出来，如果没有polarIndex属性，默认为零
         * @param {number} polar 的index
         * @param {Array<Object>} 需要处理的数据
         */
        _getSeriesData : function (index) {
            var data = [];
            var serie;
            var serieData;
            var legend = this.component.legend;
            var polarIndex;

            for (var i = 0; i < this.series.length; i ++) {
                serie = this.series[i];
                if (serie.type != ecConfig.CHART_TYPE_RADAR) {
                    continue;
                }
                serieData = serie.data || [];
                for (var j = 0; j < serieData.length; j ++) {
                    polarIndex = this.deepQuery(
                        [serieData[j], serie, this.option], 'polarIndex'
                    ) || 0;
                    if (polarIndex == index
                        && (!legend || legend.isSelected(serieData[j].name))
                    ) {
                        data.push(serieData[j]);
                    }
                }
            }
            return data;
        },

        /**
         * 查找指标合适的值
         *
         * 如果只有一组数据以数据中的最大值作为最大值 0为最小值
         * 如果是多组，使用同一维度的进行比较 选出最大值最小值
         * 对它们进行处理
         * @param {Object} serie 的 data
         * @param {number} index 指标的序号
         * @param {number} splitNumber 分段格式
         * * @param {boolean} boundaryGap 两端留白
         */
        _findValue : function (data, index, splitNumber, boundaryGap) {
            var max;
            var min;
            var one;

            if (!data || data.length === 0) {
                return;
            }

            function _compare(item) {
                (item > max || max === undefined) && (max = item);
                (item < min || min === undefined) && (min = item);
            }

            if (data.length == 1) {
                min = 0;
            }
            if (data.length != 1) {
                for (var i = 0; i < data.length; i ++) {
                    _compare(this.getDataFromOption(data[i].value[index]));
                }
            }
            else {
                one = data[0];
                for (var i = 0; i < one.value.length; i ++) {
                    _compare(this.getDataFromOption(one.value[i]));
                }
            }

            var gap = Math.abs(max - min);
            min = min - Math.abs(gap * boundaryGap[0]);
            max = max + Math.abs(gap * boundaryGap[1]);
            if (min === max) {
                if (max === 0) {
                    // 修复全0数据
                    max = 1;
                }
                // 修复最大值==最小值时数据整形
                else if (max > 0) {
                    min = max / splitNumber;
                }
                else { // max < 0
                    max = max / splitNumber;
                }
            }

            return {
                max : max,
                min : min
            };
        },

        /**
         * 获取每个指标上某个value对应的坐标
         * @param {number} polarIndex
         * @param {number} indicatorIndex
         * @param {number} value
         * @return {Array<number>} 对应坐标
         */
        getVector : function (polarIndex, indicatorIndex, value) {
            polarIndex = polarIndex || 0;
            indicatorIndex = indicatorIndex || 0;
            var __ecIndicator = this.polar[polarIndex].__ecIndicator;

            if (indicatorIndex >= __ecIndicator.length) {
                return ;
            }

            var indicator = this.polar[polarIndex].__ecIndicator[indicatorIndex];
            var center = this.getCenter(polarIndex);
            var vector = indicator.vector;
            var max = indicator.value.max;
            var min = indicator.value.min;
            var alpha;

            if (typeof value == 'undefined') {
                return center;
            }

            switch (value) {
                case 'min' :
                    value = min;
                    break;
                case 'max' :
                    value = max;
                    break;
                case 'center' :
                    value = (max + min) / 2;
                    break;
            }

            if (max != min) {
                alpha = (value - min) / (max - min);
            }
            else {
                alpha = 0.5;
            }

            return this._mapVector(vector, center, alpha);
        },

        /**
         * 判断一个点是否在网内
         * @param {Array<number>} 坐标
         * @return {number} 返回polarindex  返回-1表示不在任何polar
         */
        isInside : function (vector) {
            var polar = this.getNearestIndex(vector);

            if (polar) {
                return polar.polarIndex;
            }
            return -1;
        },

        /**
         * 如果一个点在网内，返回离它最近的数据轴的index
         * @param {Array<number>} 坐标
         * @return {Object} | false
         *      polarIndex
         *      valueIndex
         */
        getNearestIndex : function (vector) {
            var item;
            var center;
            var radius;
            var polarVector;
            var startAngle;
            var indicator;
            var len;
            var angle;
            var finalAngle;
            for (var i = 0 ; i < this.polar.length; i ++) {
                item = this.polar[i];
                center = this.getCenter(i);
                if (vector[0] == center[0] && vector[1] == center[1]) {
                    return {
                        polarIndex : i,
                        valueIndex : 0
                    };
                }
                radius = this._getRadius();
                startAngle = item.startAngle;
                indicator = item.indicator;
                len = indicator.length;
                angle = 2 * Math.PI / len;
                // 注意y轴的翻转
                polarVector = ecCoordinates.cartesian2polar(
                    vector[0] - center[0], center[1] - vector[1]
                );
                if (vector[0] - center[0] < 0) {
                    polarVector[1] += Math.PI;
                }
                if (polarVector[1] < 0) {
                    polarVector[1] += 2 * Math.PI;
                }


                // 减去startAngle的偏移量 再加2PI变成正数
                finalAngle = polarVector[1] -
                    startAngle / 180 * Math.PI + Math.PI * 2;

                if (Math.abs(Math.cos(finalAngle % (angle / 2))) * radius
                    > polarVector[0])
                {
                    return {
                        polarIndex : i,
                        valueIndex : Math.floor(
                            (finalAngle + angle / 2 ) / angle
                            ) % len
                    };
                }
            }
        },

        /**
         * 获取指标信息
         * @param {number} polarIndex
         * @return {Array<Object>} indicator
         */
        getIndicator : function (index) {
            var index = index || 0;
            return this.polar[index].indicator;
        },

         /**
         * 刷新
         */
        refresh : function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.polar = this.option.polar;
                this.series = this.option.series;
            }
            this.clear();
            this._buildShape();
        }
    };

    zrUtil.inherits(Polar, Base);

    require('../component').define('polar', Polar);

    return Polar;
});
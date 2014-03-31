/**
 * echarts组件类：极坐标
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Neil (杨骥, yangji01@baidu.com)
 *
 */
define(

    function(require) {

        function Polar(ecConfig, messageCenter, zr, option, component) {
            var Base = require('./base');
            Base.call(this, ecConfig, zr);

            var ecCoordinates = require('../util/coordinates');
            var zrUtil = require('zrender/tool/util');

            var self = this;
            self.type = ecConfig.COMPONENT_TYPE_POLAR;

            var polar; 

            var series;
            var _queryTarget;

            function init(newOption, newComponent) {
                component = newComponent;
                refresh(newOption);
            }
            
            /**
             * 绘制图形
             */
            function _buildShape() {
                for (var i = 0; i < polar.length; i ++) {

                    self.reformOption(polar[i]);

                    _queryTarget = [polar[i], option];
                    _createVector(i);
                    _buildSpiderWeb(i);

                    _buildText(i);

                    _adjustIndicatorValue(i);
                    _addAxisLabel(i);
                }

                for (var i = 0; i < self.shapeList.length; i ++) {
                    self.shapeList[i].id = zr.newShapeId(self.type);
                    zr.addShape(self.shapeList[i]);
                }
            }

            /**
             * 生成蜘蛛网顶点坐标
             * @param {number} polar的index
             */
            function _createVector(index) {
                var item = polar[index];
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var length = indicator.length;
                var startAngle = item.startAngle ;
                var dStep = 2 * Math.PI / length;
                var radius = self.parsePercent(
                    item.radius,
                    Math.min(zr.getWidth(), zr.getHeight()) / 2
                );
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
            }

            /**
             * 构建蜘蛛网
             * @param {number} polar的index
             */
            function _buildSpiderWeb(index) {
                var item = polar[index];
                var __ecIndicator = item.__ecIndicator;
                var splitArea = item.splitArea;
                var splitLine = item.splitLine;

                var center = getCenter(index);
                var splitNumber = item.splitNumber;

                var strokeColor = splitLine.lineStyle.color;
                var lineWidth = splitLine.lineStyle.width;
                var show = splitLine.show;

                var axisLine = self.deepQuery(_queryTarget, 'axisLine');

                _addArea(
                    __ecIndicator, splitNumber, center, 
                    splitArea, strokeColor, lineWidth, show
                );
                
                _addLine(
                    __ecIndicator, center, axisLine
                );
            }

            /**
             * 绘制axisLabel
             */
            function _addAxisLabel(index) {
                var item = polar[index];
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var __ecIndicator = item.__ecIndicator;
                var axisLabel;
                var vector;
                var style;
                var newStyle;
                var splitNumber = self.deepQuery(_queryTarget, 'splitNumber');
                var center = getCenter(index);
                var vector;
                var value;
                var text;
                var theta;
                // var startAngle = self.deepQuery(_queryTarget, 'startAngle');
                var offset;
                var precision = self.deepQuery(_queryTarget, 'precision');

                for (var i = 0; i < indicator.length; i ++) {
                    axisLabel = self.deepQuery(
                        [indicator[i], item, option], 'axisLabel'
                    );

                    if (axisLabel.show) {
                        style = {};
                        style.textFont = self.getFont();
                        //Todo: bug fix
                        style = zrUtil.merge(style, axisLabel);
                        style.lineWidth = style.width;

                        vector = __ecIndicator[i].vector;
                        value = __ecIndicator[i].value;
                        theta = i / indicator.length * 2 * Math.PI;
                        offset = axisLabel.offset || 10;

                        for (var j = 1 ; j <= splitNumber; j ++) {
                            newStyle = zrUtil.merge({}, style);
                            text = 
                                j * (value.max - value.min) / splitNumber
                                    + value.min;
                            if (precision) {
                                text  = text.toFixed(precision);
                            }
                            newStyle.text = self.numAddCommas(text);
                            newStyle.x = j * vector[0] / splitNumber 
                                         + Math.cos(theta) * offset + center[0];
                            newStyle.y = j * vector[1] / splitNumber
                                         + Math.sin(theta) * offset + center[1];

                            self.shapeList.push({
                                shape : 'text',
                                style : newStyle,
                                draggable : false,
                                hoverable : false
                            });
                        }
                    }
                }
            }

            /**
             * 绘制坐标头的文字
             * @param {number} polar的index
             */
            function _buildText (index) {
                var item = polar[index];
                var __ecIndicator = item.__ecIndicator;
                var vector;
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var center = getCenter(index);
                var style;
                var textAlign;
                var name;
                var rotation;
                var x = 0;
                var y = 0;
                var margin;
                var textStyle;

                for (var i = 0; i < indicator.length; i ++) {
                    name = self.deepQuery(
                        [indicator[i], item, option], 'name'
                    );

                    if (!name.show) {
                        continue;
                    } 
                    textStyle = self.deepQuery(
                        [name, item, option], 
                        'textStyle'
                    );

                    style = {};

                    style.textFont = self.getFont(textStyle);
                    style.color = textStyle.color;
                    
                    if (typeof name.formatter == 'function') {
                        style.text = name.formatter(indicator[i].text, i);
                    }
                    else if (typeof name.formatter == 'string'){
                        style.text = name.formatter.replace(
                            '{value}', indicator[i].text
                        );
                    }
                    else {
                        style.text = indicator[i].text;
                    }
                    
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

                    if (!name.margin) {
                        vector = _mapVector(vector, center, 1.2);
                    }
                    else {
                        margin = name.margin;
                        x = vector[0] > 0 ? margin : - margin;
                        y = vector[1] > 0 ? margin : - margin;

                        x = vector[0] === 0 ? 0 : x;
                        y = vector[1] === 0 ? 0 : y;
                        vector = _mapVector(vector, center, 1); 
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
                    
                    self.shapeList.push({
                        shape : 'text',
                        style : style,
                        draggable : false,
                        hoverable : false,
                        rotation : rotation
                    });
                }
            }

            /**
             * 添加一个隐形的盒子 当做drop的容器 暴露给外部的图形类使用
             * @param {number} polar的index
             * @return {Object} 添加的盒子图形 
             */
            function _addDropBox(index) {
                var index = index || 0;
                var item = polar[index];
                var center = getCenter(index);
                var __ecIndicator = item.__ecIndicator;
                var len = __ecIndicator.length;
                var pointList = [];
                var vector;
                var shape;

                for (var i = 0; i < len; i ++) {
                    vector = __ecIndicator[i].vector;
                    pointList.push(_mapVector(vector, center, 1.2));
                }
                
                shape = _getShape(
                    pointList, 'fill', 'rgba(0,0,0,0)', '', 1
                );
                return shape;
            }

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
            function _addArea(
                __ecIndicator, splitNumber, center,
                splitArea, strokeColor, lineWidth, show
            ) {
                var shape;
                var scale;
                var scale1;
                var pointList;

                for (var i = 0; i < splitNumber ; i ++ ) {
                    scale = (splitNumber - i) / splitNumber;
                    pointList = _getPointList(__ecIndicator, scale, center);
                    
                    if (show) {
                        shape = _getShape(
                            pointList, 'stroke', '', strokeColor, lineWidth
                        );
                        self.shapeList.push(shape);
                    }

                    if (splitArea.show) {
                        scale1 = (splitNumber - i - 1) / splitNumber;
                        _addSplitArea(
                            __ecIndicator, splitArea, scale, scale1, center, i
                        ); 
                    }  
                }
            }

            /**
             * 获取需要绘制的多边形的点集
             * @param {Object} serie的指标参数
             * @param {number} 缩小的系数
             * @param {Array<number>} 中点坐标
             *
             * @return {Array<Array<number>>} 返回绘制的点集
             */
            function _getPointList(__ecIndicator, scale, center) {
                var pointList = [];
                var len = __ecIndicator.length;
                var vector;

                for (var i = 0 ; i < len ; i ++ ) {
                    vector = __ecIndicator[i].vector;
                    
                    pointList.push(_mapVector(vector, center, scale));
                }
                return pointList;
            }

            /**
             * 获取绘制的图形
             * @param {Array<Array<number>>} 绘制的点集
             * @param {string} 绘制方式 stroke | fill | both 描边 | 填充 | 描边 + 填充
             * @param {string} 颜色
             * @param {string} 描边颜色
             * @param {number} 线条宽度
             * @param {boolean=} hoverable
             * @param {boolean=} draggable
             * @return {Object} 绘制的图形对象
             */ 
            function _getShape(
                pointList, brushType, color, strokeColor, lineWidth, 
                hoverable, draggable
            ) {
                return {
                    shape : 'polygon',
                    style : {
                        pointList   : pointList,
                        brushType   : brushType,
                        color       : color,
                        strokeColor : strokeColor,
                        lineWidth   : lineWidth
                    },
                    hoverable : hoverable || false,
                    draggable : draggable || false
                };
            }

            /**
             * 绘制填充区域
             */
            function _addSplitArea(
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
                
                if (typeof colorArr == 'string') {
                    colorArr = [colorArr];
                }
                colorLen = colorArr.length;
                color = colorArr[ colorInd % colorLen];

                for (var i = 0; i < indLen ; i ++) {
                    pointList = [];
                    vector = __ecIndicator[i].vector;
                    vector1 = __ecIndicator[(i + 1) % indLen].vector;

                    pointList.push(_mapVector(vector, center, scale));
                    pointList.push(_mapVector(vector, center, scale1));
                    pointList.push(_mapVector(vector1, center, scale1));
                    pointList.push(_mapVector(vector1, center, scale));

                    shape = _getShape(
                        pointList, 'fill', color, '', 1
                    );
                    self.shapeList.push(shape);
                }
                
            }

            /**
             * 转换坐标
             *
             * @param {Array<number>} 原始坐标
             * @param {Array<number>} 中点坐标
             * @param {number} 缩小的倍数
             *
             * @return {Array<number>} 转换后的坐标
             */
            function _mapVector(vector, center, scale) {
                return [
                    vector[0] * scale + center[0],
                    vector[1] * scale + center[1]
                ];
            }

            /**
             * 获取中心点位置 暴露给外部图形类使用
             * @param {number} polar的index
             */
            function getCenter(index) {
                var index = index || 0;
                return self.parseCenter(zr, polar[index].center);
            }

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
            function _addLine(
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
                    line = _getLine(
                        center[0], center[1],
                        vector[0] + center[0], 
                        vector[1] + center[1],
                        strokeColor, lineWidth, lineType
                    );
                    self.shapeList.push(line);
                }
            }

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
            function _getLine(
                xStart, yStart, xEnd, yEnd, strokeColor, lineWidth, lineType
            ) {
                return {
                    shape : 'line',
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
                };
            }

            /**
             * 调整指标的值，当indicator中存在max时设置为固定值
             * @param {number} polar的index
             */
            function _adjustIndicatorValue(index) {
                var item = polar[index];
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var len = indicator.length;
                var __ecIndicator = item.__ecIndicator;
                var value;
                var max;
                var min;
                var data = _getSeriesData(index);
                var splitNumber = item.splitNumber;

                var boundaryGap = self.deepQuery(_queryTarget, 'boundaryGap');
                var precision = self.deepQuery(_queryTarget, 'precision');
                var power = self.deepQuery(_queryTarget, 'power');
                var scale = self.deepQuery(_queryTarget, 'scale');

                for (var i = 0; i < len ; i ++ ) {
                    if (typeof indicator[i].max == 'number') {
                        max = indicator[i].max;
                        min = indicator[i].min || 0;
                        value = {
                            max : max,
                            min : min
                        };
                    }
                    else {
                        value = _findValue(
                            data, i, splitNumber,
                            boundaryGap, precision, power, scale
                        );
                    }

                    __ecIndicator[i].value = value;
                }
            }

            /**
             * 将series中的数据拿出来，如果没有polarIndex属性，默认为零
             * @param {number} polar 的index
             * @param {Array<Object>} 需要处理的数据
             */
            function _getSeriesData(index) {
                var data = [];
                var serie;
                var serieData;
                var legend = component.legend;

                for (var i = 0; i < series.length; i ++) {
                    serie = series[i];
                    if (serie.type != ecConfig.CHART_TYPE_RADAR) {
                        continue;
                    }
                    serieData = serie.data || [];
                    for (var j = 0; j < serieData.length; j ++) {
                        polarIndex = self.deepQuery(
                            [serieData[j], serie, option], 'polarIndex'
                        ) || 0;
                        if (polarIndex == index
                            && (!legend || legend.isSelected(serieData[j].name))
                        ) {
                            data.push(serieData[j]);
                        }
                    }
                }
                return data;
            }

            /**
             * 查找指标合适的值
             *
             * 如果只有一组数据以数据中的最大值作为最大值 0为最小值
             * 如果是多组，使用同一维度的进行比较 选出最大值最小值 
             * 对它们进行处理  
             * @param {Object} serie 的 data
             * @param {number} 指标的序号
             * @param {boolean} boundaryGap 两端留白
             * @param {number} precision 小数精度
             * @param {number} power 整数精度
             * @return {Object} 指标的最大值最小值
             */ 
            function _findValue(
                data, index, splitNumber, boundaryGap, precision, power, scale
            ) {
                var max;
                var min;
                var value;
                var delta;
                var str;
                var len = 0;
                var max0;
                var min0;
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
                        value = data[i].value[index];
                        _compare(value);
                    }
                }
                else {
                    one = data[0];
                    for (var i = 0; i < one.value.length; i ++) {
                        _compare(one.value[i]);
                    }
                }

                if (data.length != 1) {
                    if (scale) {
                        delta = _getDelta(
                            max, min, splitNumber, precision, power
                        );

                        if (delta >= 1) {
                            min = Math.floor(min / delta) * delta - delta;
                        }
                        else if (delta === 0) {
                            if (max > 0) {
                                min0 = 0;
                                max0 = 2 * max;
                            }
                            else if (max === 0) {
                                min0 = 0;
                                max0 = 100;
                            }
                            else {
                                max0 = 0;
                                min0 = 2 * min;
                            }

                            return {
                                max : max0,
                                min : min0
                            };
                        }
                        else {
                            str = (delta + '').split('.')[1];
                            len = str.length;
                            min = Math.floor(
                                    min * Math.pow(10, len)) / Math.pow(10, len
                                  ) - delta;
                        }

                        if (Math.abs(min) <= delta) {
                            min = 0;
                        }
                        
                        max = min + Math.floor(delta * Math.pow(10, len) 
                            * (splitNumber + 1)) / Math.pow(10, len) ;
                    }
                    else {
                        min = min > 0 ? 0 : min;
                    }
                }

                if (boundaryGap) {
                    max = max > 0 ? max * 1.2 : max * 0.8;
                    min = min > 0 ? min * 0.8 : min * 1.2;
                }

                return {
                    max : max,
                    min : min
                };
            }

            /**
             * 获取最大值与最小值中间比较合适的差值
             * @param {number} max;
             * @param {number} min
             * @param {number} precision 小数精度
             * @param {number} power 整数精度
             * @return {number} delta
             */
            function _getDelta(max , min, splitNumber, precision, power) {
                var delta = (max - min) / splitNumber;
                var str;
                var n;

                if (delta > 1) {
                    if (!power) {
                        str = (delta + '').split('.')[0];
                        n = str.length;
                        if (str.charAt(0) >= 5) {
                            return Math.pow(10, n);
                        }
                        else {
                            return (str.charAt(0) - 0 + 1 ) * Math.pow(10, n - 1);
                        }
                    }
                    else {
                        delta = Math.ceil(delta);
                        if (delta % power > 0) {
                            return (Math.ceil(delta / power) + 1) * power;
                        }
                        else {
                            return delta;
                        }
                    }
                }
                else if (delta == 1) {
                    return 1;
                }
                else if (delta === 0) {
                    return 0;
                } 
                else {
                    if (!precision) {
                        str = (delta + '').split('.')[1];
                        n = 0;
                        while (str[n] == '0') {
                            n ++ ;
                        }

                        if (str[n] >= 5) {
                            return '0.' + str.substring(0, n + 1) - 0 
                                + 1 / Math.pow(10, n);
                        }
                        else {
                            return '0.' + str.substring(0, n + 1) - 0 
                                + 1 / Math.pow(10, n + 1);
                        }
                    } 
                    else {
                        return Math.ceil(delta * Math.pow(10, precision)) 
                            / Math.pow(10, precision);
                    }
                }
            }

            /**
             * 获取每个指标上某个value对应的坐标
             * @param {number} polarIndex
             * @param {number} indicatorIndex 
             * @param {number} value
             * @return {Array<number>} 对应坐标
             */
            function getVector(polarIndex, indicatorIndex, value) {
                polarIndex = polarIndex || 0;
                indicatorIndex = indicatorIndex || 0;
                var __ecIndicator = polar[polarIndex].__ecIndicator;

                if (indicatorIndex >= __ecIndicator.length) {
                    return ;
                }

                var indicator = polar[polarIndex].__ecIndicator[indicatorIndex];
                var center = getCenter(polarIndex);
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
                
                return _mapVector(vector, center, alpha);
            }

            /**
             * 判断一个点是否在网内
             * @param {Array<number>} 坐标
             * @return {number} 返回polarindex  返回-1表示不在任何polar
             */ 
            function isInside(vector) {
                var polar = getNearestIndex(vector);

                if (polar) {
                    return polar.polarIndex;
                }
                return -1;
            }

            /**
             * 如果一个点在网内，返回离它最近的数据轴的index
             * @param {Array<number>} 坐标
             * @return {Object} | false
             *      polarIndex 
             *      valueIndex
             */
            function getNearestIndex(vector) {
                var item;
                var center;
                var radius;
                var polarVector;
                var startAngle;
                var indicator;
                var len;
                var angle;
                var finalAngle;
                var zrSize = Math.min(zr.getWidth(), zr.getHeight()) / 2;
                for (var i = 0 ; i < polar.length; i ++) {
                    item = polar[i];
                    center = getCenter(i);
                    if (vector[0] == center[0] && vector[1] == center[1]) {
                        return {
                            polarIndex : i,
                            valueIndex : 0
                        };
                    }
                    radius = self.parsePercent(item.radius, zrSize);
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
            }

            /**
             * 获取指标信息 
             * @param {number} polarIndex
             * @return {Array<Object>} indicator
             */
            function getIndicator(index) {
                var index = index || 0;
                return polar[index].indicator;
            } 

             /**
             * 刷新
             */
            function refresh(newOption) {
                if (newOption) {
                    option = newOption;
                    polar = option.polar;
                    series = option.series;
                }
                self.clear();
                _buildShape();
            }

            self.refresh = refresh;
            self.getVector = getVector;

            self.getDropBox = _addDropBox;
            self.getCenter = getCenter;
            self.getIndicator = getIndicator;

            self.isInside = isInside;
            self.getNearestIndex = getNearestIndex;

            init(option, component);
        }

        require('../component').define('polar', Polar);
     
        return Polar;
    }
);
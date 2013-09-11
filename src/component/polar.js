/**
 * echarts组件类：极坐标
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Neil (杨骥, yangji01@baidu.com)
 *
 */
define(

    function(require) {

        function Polar(messageCenter, zr, option, component) {
            var Base = require('./base');
            Base.call(this, zr);

            var ecConfig = require('../config');
            var ecCoordinates = require('../util/coordinates');
            var zrUtil = require('zrender/tool/util');
            var ecData = require('../util/ecData');

            var self = this;
            self.type = ecConfig.COMPONENT_TYPE_POLAR;

            var polar; 

            var _width = zr.getWidth();
            var _height = zr.getHeight();

            var series;
            var _queryTarget;

            function init(newOption, newComponent) {
                option = newOption;
                component = newComponent;

                self.clear();

                polar = option.polar;
                series = option.series;

                _buildShape();
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
                var startAngle = item.startAngle;
                var dStep = 2 * Math.PI / length;
                var radius = item.radius;
                var _ecIndicator_ = item._ecIndicator_ = [];
                var vector;

                if (typeof radius != 'number') {
                    radius = Math.floor(
                        Math.min(_width, _height) / 2 - 50
                    );
                }               

                for (var i = 0 ;i < length ; i ++) {
                    vector = ecCoordinates.polar2cartesian(
                        radius, startAngle * Math.PI / 180 + dStep * i
                    );
                    _ecIndicator_.push({
                        vector : vector
                    });
                }
            }

            /**
             * 构建蜘蛛网
             * @param {number} polar的index
             */
            function _buildSpiderWeb(index) {
                var item = polar[index];
                var _ecIndicator_ = item._ecIndicator_;
                var splitArea = item.splitArea;
                var splitLine = item.splitLine;
                var axisTick = item.axisTick;

                var center = item.center;
                var graduation = item.graduation;
                var calculable = option.calculable;

                var strokeColor = splitLine.lineStyle.color;
                var lineWidth = splitLine.lineStyle.width;
                var lineType = splitLine.lineStyle.type;

                _addArea(
                    _ecIndicator_, graduation, center, 
                    splitArea, strokeColor, lineWidth
                );
                
                _addLine(
                    _ecIndicator_, center, axisTick
                );
            }

            /**
             * 绘制坐标头的文字
             * @param {number} polar的index
             */
            function _buildText (index) {
                var item = polar[index];
                var _ecIndicator_ = item._ecIndicator_;
                var vector;
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var center = item.center;
                var style;
                var textAlign;

                for (var i = 0; i < indicator.length; i ++) {
                    style = {};

                    style.styleFont = self.getFont();
                    
                    style.text = indicator[i].name;
                    
                    vector = _ecIndicator_[i].vector;

                    if (Math.round(vector[0]) > 0) {
                        textAlign = 'left';
                    }
                    else if (Math.round(vector[0]) < 0) {
                        textAlign = 'right';
                    }
                    else {
                        textAlign = 'center'
                    }

                    vector = _mapVector(vector, center, 1.2);
                    
                    style.textAlign = textAlign;
                    style.x = vector[0];
                    style.y = vector[1];
                    
                    self.shapeList.push({
                        shape : 'text',
                        style : style,
                        draggable : false,
                        hoverable : false
                    })
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
                var center = item.center;
                var _ecIndicator_ = item._ecIndicator_;
                var len = _ecIndicator_.length;
                var pointList = [];
                var vector;
                var shape;

                for (var i = 0; i < len; i ++) {
                    vector = _ecIndicator_[i].vector;
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
                _ecIndicator_, graduation, center,
                splitArea, strokeColor, lineWidth
            ) {
                var shape;
                var scale;
                var scale1;
                var pointList;

                for (var i = 0; i < graduation ; i ++ ) {
                    scale = (graduation - i) / graduation;
                    pointList = _getPointList(_ecIndicator_, scale, center);
                    
                    shape = _getShape(
                        pointList, 'stroke', '', strokeColor, lineWidth
                    );
                    self.shapeList.push(shape);

                    if (splitArea.show) {
                        scale1 = (graduation - i - 1) / graduation;
                        _addSplitArea(
                            _ecIndicator_, splitArea, scale, scale1, center, i
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
            function _getPointList(_ecIndicator_, scale, center) {
                var pointList = [];
                var len = _ecIndicator_.length;
                var vector;

                for (var i = 0 ; i < len ; i ++ ) {
                    vector = _ecIndicator_[i].vector;
                    
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
                _ecIndicator_, splitArea, scale, scale1, center, colorInd
            ) {
                var indLen = _ecIndicator_.length;
                var color;
                var colorArr = splitArea.areaStyle.color;
                var colorLen;

                var vector;
                var vector1;
                var pointList = [];
                var indLen = _ecIndicator_.length;
                var shape;
                
                if (typeof colorArr == 'string') {
                    colorArr = [colorArr];
                }
                colorLen = colorArr.length;
                color = colorArr[ colorInd % colorLen];

                for (var i = 0; i < indLen ; i ++) {
                    pointList = [];
                    vector = _ecIndicator_[i].vector;
                    vector1 = _ecIndicator_[(i + 1) % indLen].vector;

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
                ]
            }

            /**
             * 获取中心点位置 暴露给外部图形类使用
             * @param {number} polar的index
             */
            function getCenter(index) {
                var index = index || 0;
                return polar[index].center;
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
                _ecIndicator_, center, axisTick
            ) {
                var indLen = _ecIndicator_.length;
                var line;
                var vector;
                var lineStyle = axisTick.lineStyle;
                var strokeColor = lineStyle.color;
                var lineWidth = lineStyle.width;
                var lineType = lineStyle.type;

                for (var i = 0; i < indLen ; i ++ ) {
                    vector = _ecIndicator_[i].vector;
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
                }
            }

            /**
             * 调整指标的值，当indicator中存在max时设置为固定值
             * @param {number} polar的index
             */
            function _adjustIndicatorValue(index) {
                var item = polar[index]
                var indicator = self.deepQuery(_queryTarget, 'indicator');
                var len = indicator.length;
                var _ecIndicator_ = item._ecIndicator_;
                var value;
                var max;
                var min;
                var data = _getSeriesData(index);
                var graduation = item.graduation;

                for (var i = 0; i < len ; i ++ ) {
                    if (typeof indicator[i].max == 'number') {
                        max = indicator[i].max;
                        min = indicator[i].min || 0;
                        value = {
                            max : max,
                            min : min
                        }
                    }
                    else {
                        value = _findValue(data, i, graduation);
                    }

                    _ecIndicator_[i].value = value;
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
                    serieData = serie.data || [];
                    for (var j = 0; j < serieData.length; j ++) {
                        polarIndex = self.deepQuery(
                            [serieData[j], serie, option], 'polarIndex'
                        ) || 0;
                        if (polarIndex == index
                            && (!legend || legend.isSelected(serieData[j].name))
                        ) {
                            data.push(serieData[j])
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
             * @return {Object} 指标的最大值最小值
             */ 
            function _findValue(data, index, graduation) {
                var max;
                var min;
                var value;
                var delta;
                var str;
                var len = 0;
                var max0;
                var min0;
                var one;

                if (!data || data.length == 0) {
                    return;
                }

                function _compare(item, name) {         
                    (item > max || max === undefined) && (max = item);
                    (item < min || min === undefined) && (min = item);
                }

                if (data.length == 1) {
                    min = 0;
                }
                if (data.length != 1) {
                    for (var i = 0; i < data.length; i ++) {
                        value = data[i].value[index];
                        _compare(value, data[i].name);
                    }
                }
                else {
                    one = data[0];
                    for (var i = 0; i < one.value.length; i ++) {
                        _compare(one.value[i], one.name);
                    }
                }

                if (data.length != 1) {
                    delta = _getDelta(max, min, graduation);

                    if (delta >= 1) {
                        min = Math.floor(min / delta) * delta - delta;
                    }
                    else if (delta == 0) {
                        if (max > 0) {
                            min0 = 0;
                            max0 = 2 * max;
                        }
                        else if (max == 0) {
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
                        }
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
                        * (graduation + 1)) / Math.pow(10, len) ;
                }

                return {
                    max : max,
                    min : min
                }
            }

            /**
             * 获取最大值与最小值中间比较合适的差值
             * @param {number} max;
             * @param {number} min
             * @return {number} delta
             */
            function _getDelta(max , min, graduation) {
                var delta = (max - min) / graduation;
                var str;
                var n;

                if (delta > 1) {
                    str = (delta + '').split('.')[0];
                    n = str.length;
                    if (str[0] >= 5) {
                        return Math.pow(10, n);
                    }
                    else {
                        return (str[0] - 0 + 1 ) * Math.pow(10, n - 1);
                    }
                }
                else if (delta == 1) {
                    return 1;
                }
                else if (delta == 0) {
                    return 0;
                } 
                else { 
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
            }

            function reformOption(opt) {
                // 常用方法快捷方式
                var _merge = zrUtil.merge;
                opt = _merge(
                          opt || {},
                          ecConfig.polar,
                          {
                              'overwrite' : false,
                              'recursive' : true
                          }
                      );

                // 圆心坐标，无则为自适应居中
                if (!opt.center 
                    || (opt.center && !(opt.center instanceof Array))) {
                    opt.center = [
                        Math.round(zr.getWidth() / 2),
                        Math.round(zr.getHeight() / 2)
                    ];
                }
                else {
                    if (typeof opt.center[0] == 'undefined') {
                        opt.center[0] = Math.round(zr.getWidth() / 2);
                    }
                    if (typeof opt.center[1] == 'undefined') {
                        opt.center[1] = Math.round(zr.getHeight() / 2);
                    }
                }

                if (!opt.radius) {
                    radius = Math.floor(
                        Math.min(_width, _height) / 2 - 50
                    );
                }

                return opt;
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
                var _ecIndicator_ = polar[polarIndex]._ecIndicator_;

                if (indicatorIndex >= _ecIndicator_.length) {
                    return ;
                }

                var indicator = polar[polarIndex]._ecIndicator_[indicatorIndex];
                var center = polar[polarIndex].center;
                var vector = indicator.vector;
                var max = indicator.value.max;
                var min = indicator.value.min;
                var alpha;

                if (typeof value != 'number') {
                    return center;
                }
                else {
                    alpha = (value - min) / (max - min);
                    return _mapVector(vector, center, alpha);
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
            function refresh() {
                self.clear();
                _buildShape();
            }

            self.refresh = refresh;
            self.reformOption = reformOption;
            self.getVector = getVector;

            self.getDropBox = _addDropBox;
            self.getCenter = getCenter;
            self.getIndicator = getIndicator;

            init(option, component);
        }

        require('../component').define('polar', Polar);
     
        return Polar;
    }
)
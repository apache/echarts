/**
 * echarts图表类：水球图
 *inspired by issue https://github.com/ecomfe/echarts/issues/1838
 *@author fiona23 (樊梦莹 fiona_fanmy@163.com fiona23.github.io)

 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * 
 */

define(function (require) {
	var ChartBase = require('./base');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');

    // 图形依赖
    var TextShape = require('zrender/shape/Text');
    var CircleShape = require('zrender/shape/Circle');

    var ecConfig = require('../config');
    
    var WaterbubbleShape = require('zrender/shape/waterbubble')
    //
    ecConfig.waterbubble = {
        center: [
            '50%',
            '50%'
        ],
        radius: 0.75,
        itemStyle: {
            normal: {
                fillColor: 'rgba(25, 139, 201, 1)',
                textColor: 'rgba(06, 85, 128, 0.8)',
                borderColor: 'rgba(25, 139, 201, 1)',
                borderWidth: 5,
                textFont: '',
                label: {
                    show: false
                }
            },
            emphasis: {
                fillColor: 'rgba(255, 255, 255, 0.3)'
            }
        }
    };

    var opt = ecConfig.waterbubble;
    
    //construct function
    function Waterbubble(ecTheme, messageCenter, zr, option, myChart){
    	ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
    	this.refresh(option);

    };

    Waterbubble.prototype = {

    	refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }

            this._bulidShape()
        },

        _bulidShape: function () {
        	var series = this.series;
            var legend = this.component.legend;
            var center;
            var radius;
            var data;
            var textFont;
            var waterColor;
            var textColor;
            

            var water;        //水球的水
            var circleBubble; // 水球壳体
            var waterText;     //描述文字

            this._selectedMode = false;
            var serieName;
            var _merge = zrUtil.merge;

            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_WATERBUBBLE) {
                    opt.itemStyle = _merge(series[i].itemStyle, opt.itemStyle);
                    //默认中间字大小为半径40%
                    opt.itemStyle.normal.textFont = 'bold ' + series[i].radius*0.4 +'px Microsoft YaHei';

                    series[i] = this.reformOption(series[i]);
                    
                    center = this.parseCenter(this.zr, series[i].center);
                    radius = this.parseRadius(this.zr, series[i].radius)[1];

                    seriesName = series[i].name || '';
                    data = series[i].data;

                    var normal = opt.itemStyle.normal;
                    var emphasis = opt.itemStyle.emphasis;

                    waterColor = series[i].waterColor || normal.fillColor;
                    textColor = series[i].textColor || normal.textColor;
                    textFont = series[i].textFont || normal.textFont;
                    lineWidth = series[i].borderWidth || normal.borderWidth;

                    emphasis.waterColor = emphasis.fillColor;

                    //水和壳的距离
                    gap = 2*lineWidth;

                    if (legend) {
                        legend.setColor(seriesName, waterColor);
                        legend.refresh();
                    };

                    if (this.deepQuery([series[i], this.option], 'calculable')) {
                        water = {
                            style: {
                                x: center[0],          // 圆心横坐标
                                y: center[1],          // 圆心纵坐标
                                lineWidth: lineWidth,
                                gap: gap,
                                //水球半径
                                r: radius - gap,
                                data: data,
                                waterColor: waterColor,
                                brushType: 'fill',
                                
                                text: data*100 + '%',
                                textPosition: 'inside',
                                textColor: textColor,
                                textFont: textFont
                            },
                            highlightStyle: {
                                waterColor: emphasis.waterColor,
                                strokeColor: 'transparent',
                            },
                        };

                        circleBubble = {
                            hoverable: false,
                            style: {
                                x: center[0],          // 圆心横坐标
                                y: center[1],          // 圆心纵坐标
                                // 半径
                                r: radius,
                                data: data,
                                brushType: 'stroke',
                                lineWidth: lineWidth,
                                strokeColor: normal.fillColor
                            }
                        };

                        ecData.pack(water, series[i], i, undefined, -1);
                        circleWrapper =  new CircleShape(circleBubble);
                        //水
                        water = new WaterbubbleShape(water);
                        this.shapeList = []
                        this.shapeList.push(circleWrapper, water);
                        
                    }
                    
                }
            }

            this.addShapeList();
        }
    };

    zrUtil.inherits(Waterbubble, ChartBase);

    require('../chart').define('waterbubble', Waterbubble);

    return Waterbubble;
});define('zrender/shape/waterbubble', ['require'],function (require) {
    'use strict';
    var Base = require('./Base');
    var Waterbubble = function (options) {
        Base.call(this, options);
    };
    Waterbubble.prototype = {
        type: 'waterbubble',
        buildPath: function (ctx, style) {
            var gap = style.gap;
            //水球壳的半径
            var radius = style.r + gap;
            var data = style.data;
            var waterColor = style.waterColor;

            
            //开始坐标
            var sy = style.r*2*(1 - data) + (style.y - style.r)
            var sx = style.x - Math.sqrt((style.r)*(style.r) - (style.y - sy)*(style.y - sy));
            //拐点坐标
            var mx = style.x;
            var my = sy;
            //结束坐标
            var ex = 2*mx - sx;
            var ey = sy;

            var extent; //幅度
            //百分比过高和过低时水平 无水波
            if (data > 0.9 || data < 0.1) {
                extent = sy
            } else{
                extent = sy - (mx -sx)/4
            }
            ctx.moveTo(sx, sy)

            ctx.quadraticCurveTo((sx + mx)/2, extent, mx, my);
            ctx.quadraticCurveTo((mx + ex)/2, 2*sy - extent, ex, ey);

            var startAngle = -Math.asin((style.x - sy)/style.r)
            var endAngle = Math.PI - startAngle
            ctx.arc(style.x, style.y, style.r, startAngle, endAngle, false)

            ctx.fillStyle = waterColor;

            return;
        },
        getRect: function (style) {
            if (style.__rect) {
                return style.__rect;
            }
            var lineWidth;
            if (style.brushType == 'stroke' || style.brushType == 'fill') {
                lineWidth = style.lineWidth || 1;
            } else {
                lineWidth = 0;
            }
            style.__rect = {
                x: Math.round(style.x - style.r - lineWidth / 2),
                y: Math.round(style.y - style.r - lineWidth / 2),
                width: style.r * 2 + lineWidth,
                height: style.r * 2 + lineWidth
            };
            
            return style.__rect;
        }
    };
   require('../tool/util').inherits(Waterbubble, Base);
   return Waterbubble;
})
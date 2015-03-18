/**
 * echarts图表类：事件河流图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author clmtulip  (车丽美, clmtulip@gmail.com)
 *
 */
define(function (require) {
    var ChartBase = require('./base');

    var eventRiverLayout = require('../layout/eventRiver');

    // 图形依赖
    var PolygonShape = require('zrender/shape/Polygon');

    // 组件依赖
    require('../component/axis');
    require('../component/grid');
    require('../component/dataZoom');

    var ecConfig = require('../config');
    // 事件河流图默认参数
    ecConfig.eventRiver = {
        zlevel: 0,                  // 一级层叠
        z: 2,                       // 二级层叠
        clickable: true,
        legendHoverLink: true,
        itemStyle: {
            normal: {
                // color: 各异,
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
                label: {
                    show: true,
                    position: 'inside',     // 可选为'left'|'right'|'top'|'bottom'
                    formatter: '{b}'
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                }
            },
            emphasis: {
                // color: 各异,
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
                label: {
                    show: true
                }
            }
        }
    };
    
    var ecData = require('../util/ecData');
    var ecDate = require('../util/date');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 数据
     * @param {Object} component 组件
     */
     function EventRiver(ecTheme, messageCenter, zr, option, myChart) {
        // 图表基类
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
         
         var self = this;
         self._ondragend = function () {
             self.isDragend = true;
         };
         this.refresh(option);
     }

     EventRiver.prototype = {
         type: ecConfig.CHART_TYPE_EVENTRIVER,
         
         _buildShape: function() {
             var series = this.series;
             this.selectedMap = {};
             
             // 数据预处理
             this._dataPreprocessing();
            
             var legend = this.component.legend;
             // 调用布局算法计算事件在Y轴上的位置
             var eventRiverSeries = [];
             for (var i = 0; i < series.length; i++) {
                 if (series[i].type === this.type) {
                     series[i] = this.reformOption(series[i]);
                     this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
                     var serieName = series[i].name || '';
                     // 系列图例开关
                     this.selectedMap[serieName] = legend ? legend.isSelected(serieName) : true;
                     if (!this.selectedMap[serieName]) {
                         continue;
                     }
                     this.buildMark(i);
                     eventRiverSeries.push(this.series[i]);
                 }
             }
             
             eventRiverLayout(
                 eventRiverSeries,
                 this._intervalX,
                 this.component.grid.getArea()
             );
             
             // 绘制事件河
             this._drawEventRiver();
             
             this.addShapeList();
         },

         /**
          * 处理数据
          */
         _dataPreprocessing: function() {
             // 将年月日的时间转化为平面坐标
             var series = this.series;
             var xAxis;
             var evolutionList;
             for (var i = 0, iLen = series.length; i < iLen; i++) {
                 if (series[i].type === this.type) {
                     xAxis = this.component.xAxis.getAxis(series[i].xAxisIndex || 0);
                     for (var j = 0, jLen = series[i].data.length; j < jLen; j++) {
                         evolutionList = series[i].data[j].evolution;
                         for (var k = 0, kLen = evolutionList.length; k < kLen; k++) {
                             evolutionList[k].timeScale = xAxis.getCoord(
                                 ecDate.getNewDate(evolutionList[k].time) - 0
                             );
                             // evolutionList[k].valueScale = evolutionList[k].value;
                             // modified by limei.che, to normalize the value range
                             evolutionList[k].valueScale = Math.pow(evolutionList[k].value, 0.8);
                         }
                     }
                 }
             }
             // 尾迹长度
             this._intervalX = Math.round(this.component.grid.getWidth() / 40);
         },

         /**
          * 绘制事件河流
          */
         _drawEventRiver: function(){
             var series = this.series;
             for (var i = 0; i < series.length; i++) {
                 var serieName = series[i].name || '';
                 if (series[i].type === this.type && this.selectedMap[serieName]) {
                     for (var j = 0; j < series[i].data.length; j++) {
                         this._drawEventBubble(series[i].data[j], i, j);
                     }
                 }
             }
         },

         /**
          * 绘制气泡图
          */
         _drawEventBubble: function(oneEvent, seriesIndex, dataIndex) {
             var series = this.series;
             var serie = series[seriesIndex];
             var serieName = serie.name || '';
             var data = serie.data[dataIndex];
             var queryTarget = [data, serie];

             var legend = this.component.legend;
             var defaultColor = legend ? legend.getColor(serieName) : this.zr.getColor(seriesIndex);
             
             // 多级控制
             var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
             var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis') || {};
             var normalColor = this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data)
                               || defaultColor;
             
             var emphasisColor = this.getItemStyleColor(
                                     emphasis.color, seriesIndex, dataIndex, data
                                 )
                                 || (typeof normalColor === 'string'
                                     ? zrColor.lift(normalColor, -0.2)
                                     : normalColor
                                 );
            
             var pts = this._calculateControlPoints(oneEvent);
             
             var eventBubbleShape = {
                 zlevel: this.getZlevelBase(),
                 z: this.getZBase(),
                 clickable: this.deepQuery(queryTarget, 'clickable'),
                 style: {
                     pointList: pts,
                     smooth: 'spline',
                     brushType: 'both',
                     lineJoin : 'round',
                     color: normalColor,
                     lineWidth: normal.borderWidth,
                     strokeColor: normal.borderColor
                 },
                 highlightStyle:{
                     color: emphasisColor,
                     lineWidth: emphasis.borderWidth,
                     strokeColor: emphasis.borderColor
                 },
                 draggable: 'vertical',
                 ondragend : this._ondragend
             };
             
             eventBubbleShape = new PolygonShape(eventBubbleShape);
             
             this.addLabel(eventBubbleShape, serie, data, oneEvent.name);
             ecData.pack(
                 eventBubbleShape,
                 series[seriesIndex], seriesIndex,
                 series[seriesIndex].data[dataIndex], dataIndex,
                 series[seriesIndex].data[dataIndex].name
             );
             this.shapeList.push(eventBubbleShape);
         },

         /**
         * 根据时间-热度，计算气泡形状的控制点
         */
         _calculateControlPoints: function(oneEvent) {
             var intervalX = this._intervalX;
             var posY = oneEvent.y;
             
             var evolution = oneEvent.evolution;
             var n = evolution.length;
             if (n < 1) {
                 return;
             }
             
             var time = [];
             var value = [];
             for (var i = 0; i < n; i++) {
                 time.push(evolution[i].timeScale);
                 value.push(evolution[i].valueScale);
             }
             
             var pts = [];
             
             // 从左向右绘制气泡的上半部分控制点
             // 第一个矩形的左端点
             pts.push([time[0], posY]);
             // 从一个矩形 到 倒数第二个矩形 上半部分的中点
             var i = 0;
             for (i = 0; i < n - 1; i++) {
                 pts.push([(time[i] + time[i + 1]) / 2.0, value[i] / -2.0 + posY]);
             }
             // 最后一个矩形上半部分的中点
             pts.push([(time[i] + (time[i] + intervalX)) / 2.0, value[i] / -2.0 + posY]);
             // 最后一个矩形的右端点
             pts.push([time[i] + intervalX, posY]);

             // 从右向左绘制气泡的下半部分控制点
             // 最后一个矩形下半部分的中点
             pts.push([(time[i] + (time[i] + intervalX)) / 2.0, value[i] / 2.0 + posY]);
             // 从倒数第二个矩形 到 一个矩形 下半部分的中点，由于polygon是闭合的，故不需要再加入左端点
             for (i = n - 1; i > 0; i--) {
                 pts.push([(time[i] + time[i - 1]) / 2.0, value[i - 1] / 2.0 + posY]);
             }
             
             return pts;
         },
         
        /**
         * 数据项被拖拽出去
         */
        ondragend : function (param, status) {
            if (!this.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }

            // 别status = {}赋值啊！！
            status.dragOut = true;
            status.dragIn = true;
            status.needRefresh = false; // 会有消息触发fresh，不用再刷一遍
            // 处理完拖拽事件后复位
            this.isDragend = false;
        },

         /**
         * 刷新
         */
         refresh: function(newOption) {
             if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }

            this.backupShapeList();
            this._buildShape();
         }
     };

     zrUtil.inherits(EventRiver, ChartBase);

     // 图表注册
     require('../chart').define('eventRiver', EventRiver);

     return EventRiver;
});
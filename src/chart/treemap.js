/**
 * echarts图表类：维恩图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Loutongbing (娄同兵, loutongbing@126.com)
 */

define(function (require) {
    var ChartBase = require('./base');
    // 图形依赖

    var TextShape = require('zrender/shape/Text');
    // 图形依赖
    var RectangleShape = require('zrender/shape/Rectangle');
    var PathShape = require('zrender/shape/Path');

    // 布局依赖
    var TreeMapLayout = require('../layout/TreeMap');

    var ecConfig = require('../config');
    // 维恩图默认参数
    ecConfig.treemap = {
        zlevel: 0,                  // 一级层叠
        z: 1,                       // 二级层叠
        calculable: false
    };

    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     * @constructor
     * @exports Treemap
     */
    function Treemap(ecTheme, messageCenter, zr, option, myChart) {
        // 图表基类
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    
    Treemap.prototype = {
        type : ecConfig.CHART_TYPE_TREEMAP,
        /**
         * 绘制图形
         */
        _buildShape : function () {
            var series = this.series;
            // this.data = series[0].data;
            this.data = series[0].data;
            this.x0 = 100;
            this.y0 = 50;
            this.width0 = 500;
            this.height0 = 300;
            
            this._buildTreemap(this.data);
            this.addShapeList();
        },
        /**
         * 构建单个
         *
         * @param {Object} data 数据
         */
        _buildTreemap : function (data) {
            var area0 = this.width0 * this.height0; // 计算总面积
            // 遍历数组，通过value与area0计算实际面积area
            var sum = 0;
            var areaArr = [];
            for (var i = 0; i < data.length; i++) {
                sum += data[i].value;
            }
            for (var j = 0; j < data.length; j++) {
                // data[j].area =  data[j].value * sum / area0;
                areaArr.push(data[j].value * area0 / sum);
            }
            var treeMapLayout = new TreeMapLayout(
                {
                    areas: areaArr,
                    x0: this.x0,
                    y0: this.y0,
                    width0: this.width0,
                    height0: this.height0           
                }
            );
            var locationArr = treeMapLayout.rectangleList;
            for (var k = 0; k < locationArr.length; k++) {
                var item = locationArr[k];
                var color = this.data[k].color || this.zr.getColor(k);
                this._buildItem(
                    item.x,
                    item.y,
                    item.width,
                    item.height,
                    color,
                    k
                )
            };
        },

        /**
         * 构建单个item
         */
        _buildItem : function (
            x,
            y,
            width,
            height,
            color,
            index
        ) {
            var series = this.series;
            var rectangle = this.getRectangle(
                x,
                y,
                width,
                height,
                color,
                this.data[index].name
            );
            // todo
            ecData.pack(
                rectangle,
                series[0], 0,
                series[0].data[index], 0,
                series[0].data[index].name
            );
            this.shapeList.push(rectangle);
        },

        /**
         * 构建矩形
         * @param {number} x 矩形横坐标
         * @param {number} y 矩形横坐标
         * @param {number} width 矩形宽
         * @param {number} height 矩形高
         * @param {String} color 颜色
         * @return {Object} 返回一个矩形
         */
        getRectangle : function (
            x,
            y,
            width,
            height,
            color,
            text
        ) {
            var serie = this.series[0];
            var data = this.data;
            var queryTarget = [data, serie];
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            ) || {};
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            ) || {};
            var textStyle = this.getLabel(
                x,
                y,
                width,
                height,
                text
            );
            var emphasisColor = this.getItemStyleColor(emphasis.color, 0, 0, data)
                || color;
            var borderWidth = normal.borderWidth || 0;
            var borderColor = normal.borderColor || color;
            var rectangleShape =
            {
                zlevel: this.getZlevelBase(),
                z: 1,
                hoverable: true,
                style: $.extend({
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    brushType: 'both',
                    color: color,
                    lineWidth: borderWidth,
                    strokeColor: borderColor
                }, textStyle),
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }
            };

            return new RectangleShape(rectangleShape);

        },
        getLabel: function (
            rectangleX,
            rectangleY,
            rectangleWidth,
            rectangleHeight,
            text
        ) {
            if (!this.series[0].itemStyle.normal.label.show) {
                return {};
            }
            var marginY = 12;
            var marginX = 5;
            var fontSize = 13;
            var lineWidth = text.length * 13;
            var lineHeight = 13;
            if (marginX + lineWidth > rectangleWidth
                || marginY + lineHeight > rectangleHeight) {
                return {};
            }
            var style = {
                textX: rectangleX + marginX,
                textY: rectangleY + marginY,
                text: text,
                textPosition: 'specific',
                textColor: '#777',
                textFont: fontSize + 'px Arial'
            };
            return style;
        },

        /**
         * 刷新
         */
        refresh : function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }

            this._buildShape();
        }
    };

    zrUtil.inherits(Treemap, ChartBase);

    // 图表注册
    require('../chart').define('treemap', Treemap);

    return Treemap;
});
/**
 * echarts图表类：维恩图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Loutongbing (娄同兵, loutongbing@126.com)
 */

define(function (require) {
    var ChartBase = require('./base');
    // 图形依赖
    var toolArea = require('zrender/tool/area');
    // 图形依赖
    var RectangleShape = require('zrender/shape/Rectangle');
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    // 布局依赖
    var TreeMapLayout = require('../layout/TreeMap');
    // 数据依赖
    var Tree = require('../data/Tree');

    var ecConfig = require('../config');
    // 维恩图默认参数
    ecConfig.treemap = {
        zlevel: 0,                  // 一级层叠
        z: 1,                       // 二级层叠
        calculable: false,
        clickable: true,
        center: ['50%', '50%'],
        size: ['80%', '80%'],
        itemStyle: {
            normal: {
                // color: 各异,
                label: {
                    show: true,
                    textStyle: '#000'      // 默认使用全局文本样式，详见TEXTSTYLE
                },
                borderWidth: 1,
                borderColor: '#ccc'
            },
            emphasis: {}
        }
    };

    var ecData = require('../util/ecData');
    var zrConfig = require('zrender/config');
    var zrEvent = require('zrender/tool/event');
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
        var self = this;
        self._onclick = function (params) {
            return self.__onclick(params);
        };
        self.zr.on(zrConfig.EVENT.CLICK, self._onclick);
    }
    Treemap.prototype = {
        type : ecConfig.CHART_TYPE_TREEMAP,
        /**
         * 构建单个
         *
         * @param {Object} data 数据
         */
        _buildTreemap : function (
            data
        ) {
            this.data = data;
            var serie = this.serie;
            var itemStyle = this.serie.itemStyle;
            var treemapWidth = this.parsePercent(serie.size[0], this.zr.getWidth()) || 400;
            var treemapHeight = this.parsePercent(serie.size[1], this.zr.getHeight()) || 500;
            var center = this.parseCenter(this.zr, serie.center);
            var treemapX = center[0] -  treemapWidth * 0.5;
            var treemapY = center[1] -  treemapHeight * 0.5;

            var treemapArea = treemapWidth * treemapHeight; // 计算总面积
            // 遍历数组，通过value与area0计算实际面积area
            var sum = 0;
            var areaArr = [];
            for (var i = 0; i < data.length; i++) {
                sum += data[i].value;
            }
            for (var j = 0; j < data.length; j++) {
                areaArr.push(data[j].value * treemapArea / sum);
            }
            var treeMapLayout = new TreeMapLayout(
                {
                    areas: areaArr,
                    x0: treemapX,
                    y0: treemapY,
                    width0: treemapWidth,
                    height0: treemapHeight
                }
            );
            var locationArr = treeMapLayout.rectangleList;
            for (var k = 0; k < locationArr.length; k++) {
                var item = locationArr[k];
                var queryTarget = [data[k].itemStyle, itemStyle];
                var itemStyleMerged = this.deepMerge(queryTarget) || {};
                if (!itemStyleMerged.normal.color) {
                    itemStyleMerged.normal.color = this.zr.getColor(k);
                }
                if (!itemStyleMerged.emphasis.color) {
                    itemStyleMerged.emphasis.color = itemStyleMerged.normal.color;
                }
                this._buildItem(
                    data,
                    itemStyleMerged,
                    item.x,
                    item.y,
                    item.width,
                    item.height,
                    k
                );
                // 绘制二级节点
                if (data[k].children) {
                    this._buildChildrenTreemap(
                        data[k].children,
                        itemStyleMerged,
                        item.width,
                        item.height,
                        item.x,
                        item.y
                    );
                }
            }
            this.addShapeList();
        },

        /**
         * 构建单个item
         */
        _buildItem : function (
            data,
            itemStyle,
            x,
            y,
            width,
            height,
            index
        ) {
            var series = this.series;
            var rectangle = this.getRectangle(
                data,
                itemStyle,
                x,
                y,
                width,
                height,
                index
            );
            // todo
            ecData.pack(
                rectangle,
                series[0], 0,
                data[index], 0,
                data[index].name
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
            data,
            itemStyle,
            x,
            y,
            width,
            height,
            index
        ) {
            var emphasis = itemStyle.emphasis;
            var normal = itemStyle.normal;
            var textShape = this.getLabel(
                data,
                x,
                y,
                width,
                height,
                data[index].name,
                index
            );
            var hoverable = this.option.hoverable;
            var rectangleShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable: hoverable,
                clickable: true,
                style: $.extend({
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    brushType: 'both',
                    color: normal.color,
                    lineWidth: normal.borderWidth,
                    strokeColor: normal.borderColor
                }, textShape.style), // ),
                highlightStyle: $.extend({
                    color: emphasis.color,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }, textShape.highlightStyle) // textShape.highlightStyle)
            };
            return new RectangleShape(rectangleShape);

        },
        getLabel: function (
            data,
            rectangleX,
            rectangleY,
            rectangleWidth,
            rectangleHeight,
            text,
            index
        ) {
            if (!this.series[0].itemStyle.normal.label.show) {
                return {};
            }
            var marginY = 12;
            var marginX = 5;
            var fontSize = 13;
            var textFont = fontSize + 'px Arial';
            var textWidth = toolArea.getTextWidth(text, textFont);
            var textHeight = toolArea.getTextHeight(text, textFont);
            if (marginX + textWidth > rectangleWidth
                || marginY + textHeight > rectangleHeight) {
                return {};
            }

            // 用label方法写title
            var textShape = {
                zlevel: this.getZlevelBase() + 1,
                z: this.getZBase() + 1,
                hoverable: false,
                style: {
                    x: rectangleX + marginX,
                    y: rectangleY + marginY,
                    text: text,
                    textColor: '#777'
                },
                highlightStyle: {
                    text: text
                }
            };
            textShape = {
                style: {
                    text: text
                },
                highlightStyle: {
                    text: text
                }
            };
            textShape = this.addLabel(
                textShape,
                this.series[0],
                data[index],
                text
            );
            textShape.style.textPosition = 'specific';
            textShape.style.textX = rectangleX + marginX;
            textShape.style.textY = rectangleY + marginY;
            textShape.style.textColor = textShape.style.textColor || '#000';

            textShape.highlightStyle.textPosition = 'specific';
            textShape.highlightStyle.textX = rectangleX + marginX;
            textShape.highlightStyle.textY = rectangleY + marginY;
            textShape.highlightStyle.textColor = textShape.highlightStyle.textColor || '#000';
            return textShape;
        },
        /*
         * 构建子级矩形图，这里用线表示不再画矩形
         *
         * @param {Object} data 数据
         * @param {number} treemapWidth treemap容器宽度
         * @param {number} treemapHeight treemap容器高度
         * @param {number} treemapX treemap容器起始坐标
         * @param {number} treemapY treemap容器起始坐标
         * @return
        */
        _buildChildrenTreemap : function (
            data,
            itemStyle,
            treemapWidth,
            treemapHeight,
            treemapX,
            treemapY
        ) {
            var treemapArea = treemapWidth * treemapHeight; // 计算总面积
            // 遍历数组，通过value与area0计算实际面积area
            var sum = 0;
            var areaArr = [];
            for (var i = 0; i < data.length; i++) {
                sum += data[i].value;
            }
            for (var j = 0; j < data.length; j++) {
                areaArr.push(data[j].value * treemapArea / sum);
            }
            var treeMapLayout = new TreeMapLayout(
                {
                    areas: areaArr,
                    x0: treemapX,
                    y0: treemapY,
                    width0: treemapWidth,
                    height0: treemapHeight
                }
            );
            var lineWidth = itemStyle.normal.childBorderWidth || 1;
            var lineColor = itemStyle.normal.childBorderColor || '#777';
            var locationArr = treeMapLayout.rectangleList;
            for (var k = 0; k < locationArr.length; k++) {
                var item = locationArr[k];
                var lines = [];
                // 容器边框不能重复画
                // 上边
                if (treemapY.toFixed(2) !== item.y.toFixed(2)) {
                    lines.push(this.getLine(
                        item.x,
                        item.y,
                        item.x + item.width,
                        item.y,
                        lineWidth,
                        lineColor
                    ));
                }
                // 左边
                if (treemapX.toFixed(2) !== item.x.toFixed(2)) {
                    lines.push(this.getLine(
                        item.x,
                        item.y,
                        item.x,
                        item.y + item.height,
                        lineWidth,
                        lineColor
                    ));
                }
                // 下边
                if ((treemapY + treemapHeight).toFixed(2) !== (item.y + item.height).toFixed(2)) {
                    lines.push(this.getLine(
                        item.x,
                        item.y + item.height,
                        item.x + item.width,
                        item.y + item.height,
                        lineWidth,
                        lineColor
                    ));
                }
                // 右边
                if ((treemapX + treemapWidth).toFixed(2) !== (item.x + item.width).toFixed(2)) {
                    lines.push(this.getLine(
                        item.x + item.width,
                        item.y,
                        item.x + item.width,
                        item.y + item.height,
                        lineWidth,
                        lineColor
                    ));
                }
                for (var l = 0; l < lines.length; l++) {
                    ecData.pack(
                        lines[l],
                        this.series[0], 0,
                        data[k], 0,
                        data[k].name
                    );
                    this.shapeList.push(lines[l]);
                }
            }
        },
        /*
         * 构建线段
         * @param {number} xStart 开始坐标
         * @param {number} yStart 开始坐标
         * @param {number} xEnd 结束坐标
         * @param {number} yEnd 结束坐标
         * @param {number} lineWidth 线宽
         * @param {number} lineColor 颜色
         * @return {Object} 返回一个线段
         */
        getLine : function (
            xStart,
            yStart,
            xEnd,
            yEnd,
            lineWidth,
            lineColor
        ) {
            var lineShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable: false,
                style: {
                    xStart: xStart,
                    yStart: yStart,
                    xEnd: xEnd,
                    yEnd: yEnd,
                    lineWidth: lineWidth,
                    strokeColor: lineColor
                }
            };
            return new LineShape(lineShape);

        },
        __onclick : function (params) {
            // 点击空白处，返回上一层
            if (!params.target) {
                var rootNode = this.tree.getNodeById(this.rootId);
                // 不是第一层才返回上层
                if (this.rootId !== 'root') {
                    this.rootId = rootNode.parent.id;
                    this._buildTreemap(rootNode.parent.data.children);
                }
            }
            else if (params.target.type === 'rectangle') {
                var subTree = this.tree.getSubTree(params.target._echartsData._name);
                this.rootId = subTree.root.id;
                // 有子节点才下钻
                if (subTree.root.children.length) {
                    this._buildTreemap(subTree.root.data.children);
                }
            }
            return;
        },
        /**
         * 刷新
         */
        refresh: function () {
            this.clear();
            var queryTarget = [this.series[0], ecConfig.treemap];
            this.serie = this.serie || this.deepMerge(queryTarget) || {};
            this.tree = this.tree || Tree.fromOptionData('root', this.serie.data);
            this.data = this.data || this.serie.data;
            this.rootId = this.rootId || 'root';
            this._buildTreemap(this.data);
        }
    };

    zrUtil.inherits(Treemap, ChartBase);

    // 图表注册
    require('../chart').define('treemap', Treemap);

    return Treemap;
});
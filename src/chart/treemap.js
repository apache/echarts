/**
 * echarts图表类：矩形树图
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
        root: '',
        itemStyle: {
            normal: {
                // color: 各异,
                label: {
                    show: true,
                    x: 5,
                    y: 12,
                    textStyle: {
                        align: 'left',
                        color: '#000',
                        fontFamily: 'Arial',
                        fontSize: 13,
                        fontStyle: 'normal',
                        fontWeight: 'normal'
                    }
                },
                breadcrumb: {
                    show: true,
                    textStyle: {}
                },
                borderWidth: 1,
                borderColor: '#ccc',
                childBorderWidth: 1,
                childBorderColor: '#ccc'
            },
            emphasis: {}
        }
    };

    var ecData = require('../util/ecData');
    var zrConfig = require('zrender/config');
    var zrEvent = require('zrender/tool/event');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');

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
         * 刷新
         */
        refresh: function (newOption) {
            this.clear();

            if (newOption) {
                this.option = newOption;
                this.series = this.option.series;
            }

            // Map storing all trees of series
            this._treesMap = {};

            var series = this.series;
            var legend = this.component.legend;

            for (var i = 0; i < series.length; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_TREEMAP) {
                    series[i] = this.reformOption(series[i]);

                    var seriesName = series[i].name || '';
                    this.selectedMap[seriesName] = 
                        legend ? legend.isSelected(seriesName) : true;
                    if (!this.selectedMap[seriesName]) {
                        continue;
                    }

                    this._buildSeries(series[i], i);
                }
            }
        },

        _buildSeries: function(series, seriesIndex) {
            var tree = Tree.fromOptionData(series.name, series.data);

            this._treesMap[seriesIndex] = tree;

            var treeRoot = series.root && tree.getNodeById(series.root) || tree.root;
            this._buildTreemap(treeRoot, seriesIndex);
        },

        /**
         * 构建单个
         *
         * @param {Object} data 数据
         */
        _buildTreemap : function (treeRoot, seriesIndex) {

            // 清除之前的 shapes
            var shapeList = this.shapeList;
            for (var i = 0; i < shapeList.length;) {
                var shape = shapeList[i];
                if (ecData.get(shape, 'seriesIndex') === seriesIndex) {
                    this.zr.delShape(shapeList[i]);
                    shapeList.splice(i, 1);
                }
                else {
                    i++;
                }
            }

            var currentShapeLen = shapeList.length;
            var series = this.series[seriesIndex];

            var itemStyle = series.itemStyle;
            var treemapWidth = this.parsePercent(series.size[0], this.zr.getWidth()) || 400;
            var treemapHeight = this.parsePercent(series.size[1], this.zr.getHeight()) || 500;
            var center = this.parseCenter(this.zr, series.center);
            var treemapX = center[0] -  treemapWidth * 0.5;
            var treemapY = center[1] -  treemapHeight * 0.5;

            var treemapArea = treemapWidth * treemapHeight; // 计算总面积
            // 遍历数组，通过value与area0计算实际面积area
            var sum = 0;
            var areaArr = [];

            var children = treeRoot.children;
            for (var i = 0; i < children.length; i++) {
                sum += children[i].data.value;
            }
            for (var j = 0; j < children.length; j++) {
                areaArr.push(children[j].data.value * treemapArea / sum);
            }
            var treeMapLayout = new TreeMapLayout({
                x: treemapX,
                y: treemapY,
                width: treemapWidth,
                height: treemapHeight
            });
            var locationArr = treeMapLayout.run(areaArr);

            for (var k = 0; k < locationArr.length; k++) {
                var dataItem = children[k].data;
                var rect = locationArr[k];
                var queryTarget = [dataItem.itemStyle, itemStyle];
                var itemStyleMerged = this.deepMerge(queryTarget);
                if (!itemStyleMerged.normal.color) {
                    itemStyleMerged.normal.color = this.zr.getColor(k);
                }
                if (!itemStyleMerged.emphasis.color) {
                    itemStyleMerged.emphasis.color = itemStyleMerged.normal.color;
                }
                this._buildItem(
                    dataItem,
                    itemStyleMerged,
                    rect,
                    seriesIndex,
                    k
                );
                // 绘制二级节点
                if (dataItem.children) {
                    this._buildChildrenTreemap(
                        dataItem.children,
                        itemStyleMerged,
                        rect,
                        seriesIndex
                    );
                }
            }

            if (this.query(series, 'itemStyle.normal.breadcrumb.show')) {
                this._buildBreadcrumb(
                    treeRoot, seriesIndex, treemapX, treemapY + treemapHeight
                );   
            }

            for (var i = currentShapeLen; i < shapeList.length; i++) {
                this.zr.addShape(shapeList[i]);
            }
        },

        /**
         * 构建单个item
         */
        _buildItem : function (
            dataItem,
            itemStyle,
            rect,
            seriesIndex,
            dataIndex
        ) {
            var series = this.series;
            var rectangle = this.getRectangle(
                dataItem,
                itemStyle,
                rect
            );
            // todo
            ecData.pack(
                rectangle,
                series[seriesIndex], seriesIndex,
                dataItem, dataIndex,
                dataItem.name
            );
            this.shapeList.push(rectangle);
        },

        /**
         * 构建矩形
         * @param {Object} data 数据
         * @param {Object} itemStyle 合并后的样式
         * @param {number} x 矩形横坐标
         * @param {number} y 矩形纵坐标
         * @param {number} width 矩形宽
         * @param {number} height 矩形高
         * @return {Object} 返回一个矩形
         */
        getRectangle: function (
            dataItem,
            itemStyle,
            rect
        ) {
            var emphasis = itemStyle.emphasis;
            var normal = itemStyle.normal;
            var textShape = this.getLabel(
                itemStyle,
                rect,
                dataItem.name,
                dataItem.value
            );
            var hoverable = this.option.hoverable;
            var rectangleShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable: hoverable,
                clickable: true,
                style: zrUtil.merge(
                    {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                        brushType: 'both',
                        color: normal.color,
                        lineWidth: normal.borderWidth,
                        strokeColor: normal.borderColor
                    },
                    textShape.style,
                    true
                ),
                highlightStyle: zrUtil.merge(
                    {
                        color: emphasis.color,
                        lineWidth: emphasis.borderWidth,
                        strokeColor: emphasis.borderColor
                    },
                    textShape.highlightStyle,
                    true
                )
            };
            return new RectangleShape(rectangleShape);
        },
        /**
         * 获取label样式
         * @param {Object} itemStyle 合并后的样式
         * @param {Object} rect 矩形信息
         * @param {string} name 数据名称
         * @param {number} value 数据值
         * @return {Object} 返回label的样式
         */
        getLabel: function (
            itemStyle,
            rect,
            name,
            value
        ) {
            var normalTextStyle = itemStyle.normal.label.textStyle;
            var queryTarget = [itemStyle.emphasis.label.textStyle, normalTextStyle];
            var emphasisTextStyle = this.deepMerge(queryTarget);

            var formatter = itemStyle.normal.label.formatter;
            var text = this.getLabelText(name, value, formatter);
            var textFont = this.getFont(normalTextStyle);
            var textWidth = toolArea.getTextWidth(text, textFont);
            var textHeight = toolArea.getTextHeight(text, textFont);

            var emphasisFormatter = this.deepQuery(
                [itemStyle.emphasis, itemStyle.normal],
                'label.formatter'
            );
            var emphasisText = this.getLabelText(name, value, emphasisFormatter);
            var emphasisTextFont = this.getFont(emphasisTextStyle);
            var emphasisTextWidth = toolArea.getTextWidth(text, emphasisTextFont);
            var emphasisTextHeight = toolArea.getTextHeight(text, emphasisTextFont);
            if (!itemStyle.normal.label.show) {
                text = '';
            }
            else if (itemStyle.normal.label.x + textWidth > rect.width
                || itemStyle.normal.label.y + textHeight > rect.height) {
                text = '';
            }

            if (!itemStyle.emphasis.label.show) {
                emphasisText = '';
            }
            else if (emphasisTextStyle.x + emphasisTextWidth > rect.width
                || emphasisTextStyle.y + emphasisTextHeight > rect.height) {
                emphasisText = '';
            }

            // 用label方法写title
            var textShape = {
                style: {
                    textX: rect.x + itemStyle.normal.label.x,
                    textY: rect.y + itemStyle.normal.label.y,
                    text: text,
                    textPosition: 'specific',
                    textColor: normalTextStyle.color,
                    textFont: textFont
                },
                highlightStyle: {
                    textX: rect.x + itemStyle.emphasis.label.x,
                    textY: rect.y + itemStyle.emphasis.label.y,
                    text: emphasisText,
                    textColor: emphasisTextStyle.color,
                    textPosition: 'specific'
                }
            };
            return textShape;
        },
        /**
         * 支持formatter
         * @param {string} name 数据名称
         * @param {number} value 数据值
         * @param {string|Object} formatter 构造器
         * @return {Object} 返回label的样式
         */
        getLabelText: function (name, value, formatter) {
            if (formatter) {
                if (typeof formatter === 'function') {
                    return formatter.call(
                        this.myChart,
                        name,
                        value
                    );
                }
                else if (typeof formatter === 'string') {
                    formatter = formatter.replace('{b}', '{b0}')
                                         .replace('{c}', '{c0}');
                    formatter = formatter.replace('{b0}', name)
                                         .replace('{c0}', value);
                    return formatter;
                }
            }
            else {
                return name;
            }
        },
        /*
         * 构建子级矩形图，这里用线表示不再画矩形
         *
         * @param {Object} data 数据
         * @param {Object} rect
         * @return
        */
        _buildChildrenTreemap: function (
            data,
            itemStyle,
            rect,
            seriesIndex
        ) {
            var treemapArea = rect.width * rect.height; // 计算总面积
            // 遍历数组，通过value与area0计算实际面积area
            var sum = 0;
            var areaArr = [];
            for (var i = 0; i < data.length; i++) {
                sum += data[i].value;
            }
            for (var j = 0; j < data.length; j++) {
                areaArr.push(data[j].value * treemapArea / sum);
            }
            var treeMapLayout = new TreeMapLayout({
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            });
            var locationArr = treeMapLayout.run(areaArr);

            var lineWidth = itemStyle.normal.childBorderWidth || 1;
            var lineColor = itemStyle.normal.childBorderColor || '#777';
            for (var k = 0; k < locationArr.length; k++) {
                var item = locationArr[k];
                var lines = [];
                // 容器边框不能重复画
                // 上边
                if (rect.y.toFixed(2) !== item.y.toFixed(2)) {
                    lines.push(this._getLine(
                        item.x,
                        item.y,
                        item.x + item.width,
                        item.y,
                        lineWidth,
                        lineColor
                    ));
                }
                // 左边
                if (rect.x.toFixed(2) !== item.x.toFixed(2)) {
                    lines.push(this._getLine(
                        item.x,
                        item.y,
                        item.x,
                        item.y + item.height,
                        lineWidth,
                        lineColor
                    ));
                }
                // 下边
                if ((rect.y + rect.height).toFixed(2) !== (item.y + item.height).toFixed(2)) {
                    lines.push(this._getLine(
                        item.x,
                        item.y + item.height,
                        item.x + item.width,
                        item.y + item.height,
                        lineWidth,
                        lineColor
                    ));
                }
                // 右边
                if ((rect.x + rect.width).toFixed(2) !== (item.x + item.width).toFixed(2)) {
                    lines.push(this._getLine(
                        item.x + item.width,
                        item.y,
                        item.x + item.width,
                        item.y + item.height,
                        lineWidth,
                        lineColor
                    ));
                }
                for (var l = 0; l < lines.length; l++) {
                    ecData.set(lines[l], 'seriesIndex', seriesIndex);
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
        _getLine : function (
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

        _buildBreadcrumb: function (treeRoot, seriesIndex, x, y) {
            var stack = [];

            var current = treeRoot;
            while (current) {
                stack.unshift(current.data.name);
                current = current.parent;
            }

            var series = this.series[seriesIndex];
            var textStyle = this.query(series, 'itemStyle.normal.breadcrumb.textStyle') || {};
            var textEmphasisStyle = 
                this.query(series, 'itemStyle.emphasis.breadcrumb.textStyle') || {};

            var commonStyle = {
                y: y + 10,
                textBaseline: 'top',
                textAlign: 'left',
                color: textStyle.color,
                textFont: this.getFont(textStyle)
            };
            var commonHighlightStyle = {
                brushType: 'fill',
                color: textEmphasisStyle.color || zrColor.lift(textStyle.color, -0.3),
                textFont: this.getFont(textEmphasisStyle)
            };

            for (var i = 0; i < stack.length; i++) {
                var textShape = new TextShape({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: zrUtil.merge({
                        x: x,
                        text: stack[i] + (stack.length - 1 - i ? ' > ' : '')
                    }, commonStyle),
                    clickable: true,
                    highlightStyle: commonHighlightStyle
                });

                ecData.set(textShape, 'seriesIndex', seriesIndex);
                ecData.set(textShape, 'name', stack[i]);

                x += textShape.getRect(textShape.style).width;

                this.shapeList.push(textShape);
            }
        },

        __onclick : function (params) {
            var target = params.target;
            if (target) {
                var seriesIndex = ecData.get(target, 'seriesIndex');
                var name = ecData.get(target, 'name');
                var tree = this._treesMap[seriesIndex];
                var root = tree.getNodeById(name);

                if (root && root.children.length) {
                    this._buildTreemap(root, seriesIndex);
                }
            }
        }
    };

    zrUtil.inherits(Treemap, ChartBase);

    // 图表注册
    require('../chart').define('treemap', Treemap);

    return Treemap;
});
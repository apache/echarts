/**
 * echarts图表类：树图
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Loutongbing (娄同兵, loutongbing@126.com)
 */

define(function (require) {
    var ChartBase = require('./base');
    var GOLDEN_SECTION = 0.618;
    // 图形依赖
    var IconShape = require('../util/shape/Icon');
    var ImageShape = require('zrender/shape/Image');
    var LineShape = require('zrender/shape/Line');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    // 布局依赖
    var TreeLayout = require('../layout/Tree');
    // 数据依赖
    var TreeData = require('../data/Tree');

    var ecConfig = require('../config');
    // 默认参数
    ecConfig.tree = {
        zlevel: 1,                  // 一级层叠
        z: 2,                       // 二级层叠
        calculable: false,
        clickable: true,
        rootLocation: {},
        orient: 'vertical',
        symbol: 'circle',
        symbolSize: 20,
        nodePadding: 30,
        layerPadding: 100,
        /*rootLocation: {
            x: 'center' | 'left' | 'right' | 'x%' | {number},
            y: 'center' | 'top' | 'bottom' | 'y%' | {number}
        },*/
        itemStyle: {
            normal: {
                // color: 各异,
                label: {
                    show: true
                },
                lineStyle: {
                    width: 1,
                    color: '#777',
                    type: 'curve' // curve
                }
            },
            emphasis: {

            }
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
     * @exports Tree
     */
    function Tree(ecTheme, messageCenter, zr, option, myChart) {
        // 图表基类
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Tree.prototype = {
        type : ecConfig.CHART_TYPE_TREE,
        /**
         * 构建单个
         *
         * @param {Object} data 数据
         */
        _buildShape : function (series, seriesIndex) {
            var data = series.data[0];
            this.tree = TreeData.fromOptionData(data.name, data.children);
            // 添加root的data
            this.tree.root.data = data;
            // 根据root坐标 方向 对每个节点的坐标进行映射
            this._setTreeShape(series);
            // 递归画出树节点与连接线
            this.tree.traverse(
                function (treeNode) {
                    this._buildItem(
                        treeNode,
                        series,
                        seriesIndex
                    );
                    // 画连接线
                    if (treeNode.children.length > 0) {
                        this._buildLink(
                            treeNode,
                            series
                        );
                    }
                },
                this
            );
            var panable = series.roam === true || series.roam === 'move';
            var zoomable = series.roam === true || series.roam === 'scale';
            // Enable pan and zooom
            this.zr.modLayer(this.getZlevelBase(), {
                panable: panable,
                zoomable: zoomable
            });
            if (
                this.query('markPoint.effect.show')
                || this.query('markLine.effect.show')
            ) {
                this.zr.modLayer(ecConfig.EFFECT_ZLEVEL, {
                    panable: panable,
                    zoomable: zoomable
                });
            }
            this.addShapeList();
        },

        /**
         * 构建单个item
         */
        _buildItem : function (
            treeNode,
            serie,
            seriesIndex
        ) {
            var queryTarget = [treeNode.data, serie];
            var symbol = this.deepQuery(queryTarget, 'symbol');
            // 多级控制
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            ) || {};
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            ) || {};
            var normalColor = normal.color || this.zr.getColor();
            var emphasisColor = emphasis.color || this.zr.getColor();
            var angle = -treeNode.layout.angle || 0;
            // 根节点不旋转
            if (treeNode.id === this.tree.root.id) {
                angle = 0;
            }
            var textPosition = 'right';
            if (Math.abs(angle) >= Math.PI / 2 && Math.abs(angle) < Math.PI * 3 / 2) {
                angle += Math.PI;
                textPosition = 'left';
            }
            var rotation = [
                angle,
                treeNode.layout.position[0],
                treeNode.layout.position[1]
            ];
            var shape = new IconShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                rotation: rotation,
                style: {
                    x: treeNode.layout.position[0] - treeNode.layout.width * 0.5,
                    y: treeNode.layout.position[1] - treeNode.layout.height * 0.5,
                    width: treeNode.layout.width,
                    height: treeNode.layout.height,
                    iconType: symbol,
                    color: normalColor,
                    brushType: 'both',
                    lineWidth: normal.borderWidth,
                    strokeColor: normal.borderColor
                },
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }
            });
            if (shape.style.iconType.match('image')) {
                shape.style.image = shape.style.iconType.replace(
                    new RegExp('^image:\\/\\/'), ''
                );
                shape = new ImageShape({

                    rotation: rotation,
                    style: shape.style,
                    highlightStyle: shape.highlightStyle,
                    clickable: shape.clickable,
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase()
                });
            }
            // 节点标签样式
            if (this.deepQuery(queryTarget, 'itemStyle.normal.label.show')) {
                shape.style.text = treeNode.data.label == null ? treeNode.id : treeNode.data.label;
                shape.style.textPosition = this.deepQuery(
                    queryTarget, 'itemStyle.normal.label.position'
                );
                // 极坐标另外计算 时钟哪个侧面
                if (serie.orient === 'radial' && shape.style.textPosition !== 'inside') {
                    shape.style.textPosition = textPosition;
                }
                shape.style.textColor = this.deepQuery(
                    queryTarget, 'itemStyle.normal.label.textStyle.color'
                );
                shape.style.textFont = this.getFont(this.deepQuery(
                    queryTarget, 'itemStyle.normal.label.textStyle'
                ) || {});
            }

            if (this.deepQuery(queryTarget, 'itemStyle.emphasis.label.show')) {
                shape.highlightStyle.textPosition = this.deepQuery(
                    queryTarget, 'itemStyle.emphasis.label.position'
                );
                shape.highlightStyle.textColor = this.deepQuery(
                    queryTarget, 'itemStyle.emphasis.label.textStyle.color'
                );
                shape.highlightStyle.textFont = this.getFont(this.deepQuery(
                    queryTarget, 'itemStyle.emphasis.label.textStyle'
                ) || {});
            }
            // todo
            ecData.pack(
                shape,
                serie, seriesIndex,
                treeNode.data, 0,
                treeNode.id
            );
            this.shapeList.push(shape);
        },

        _buildLink : function (
            parentNode,
            serie
        ) {
            var lineStyle = serie.itemStyle.normal.lineStyle;
            // 折线另外计算
            if (lineStyle.type === 'broken') {
                this._buildBrokenLine(
                    parentNode,
                    lineStyle,
                    serie
                );
                return;
            }
            for (var i = 0; i < parentNode.children.length; i++) {
                var xStart = parentNode.layout.position[0];
                var yStart = parentNode.layout.position[1];
                var xEnd = parentNode.children[i].layout.position[0];
                var yEnd = parentNode.children[i].layout.position[1];
                switch (lineStyle.type) {
                    case 'curve':
                        this._buildBezierCurve(
                            parentNode,
                            parentNode.children[i],
                            lineStyle,
                            serie
                        );
                        break;
                    // 折线
                    case 'broken':
                        break;
                    // default画直线
                    default:
                        var shape = this._getLine(
                            xStart,
                            yStart,
                            xEnd,
                            yEnd,
                            lineStyle
                        );
                        this.shapeList.push(shape);
                }
            }
        },
        _buildBrokenLine: function (
            parentNode,
            lineStyle,
            serie
        ) {
            // 引用_getLine需要把type改为solid
            var solidLineStyle = zrUtil.clone(lineStyle);
            solidLineStyle.type = 'solid';
            var shapes = [];
            var xStart = parentNode.layout.position[0];
            var yStart = parentNode.layout.position[1];
            var orient = serie.orient;

            // 子节点的y
            var yEnd = parentNode.children[0].layout.position[1];
            // 中点x y
            var xMiddle = xStart;
            var yMiddle = yStart + (yEnd - yStart) * (1 - GOLDEN_SECTION);
            // 中线的起始
            var xMiddleStart = parentNode.children[0].layout.position[0];
            var yMiddleStart = yMiddle;
            var xMiddleEnd = parentNode.children[parentNode.children.length - 1].layout.position[0];
            var yMiddleEnd = yMiddle;
            // 水平状态
            if (orient === 'horizontal') {
                var xEnd = parentNode.children[0].layout.position[0];
                xMiddle = xStart + (xEnd - xStart) * (1 - GOLDEN_SECTION);
                yMiddle = yStart;
                xMiddleStart = xMiddle;
                yMiddleStart = parentNode.children[0].layout.position[1];
                xMiddleEnd = xMiddle;
                yMiddleEnd = parentNode.children[parentNode.children.length - 1].layout.position[1];
            }
            // 第一条 从根节点垂直向下
            shapes.push(
                this._getLine(
                    xStart,
                    yStart,
                    xMiddle,
                    yMiddle,
                    solidLineStyle
                )
            );
            // 第二条 横向
            shapes.push(
                this._getLine(
                    xMiddleStart,
                    yMiddleStart,
                    xMiddleEnd,
                    yMiddleEnd,
                    solidLineStyle
                )
            );
            // 第三条 垂直向下到子节点
            for (var i = 0; i < parentNode.children.length; i++) {
                xEnd = parentNode.children[i].layout.position[0];
                yEnd = parentNode.children[i].layout.position[1];
                // 水平状态
                if (orient === 'horizontal') {
                    yMiddleStart = yEnd;
                }
                else {
                    xMiddleStart = xEnd;
                }
                shapes.push(
                    this._getLine(
                        xMiddleStart,
                        yMiddleStart,
                        xEnd,
                        yEnd,
                        solidLineStyle
                    )
                );
            }
            this.shapeList = this.shapeList.concat(shapes);
        },
        _getLine: function (
            xStart,
            yStart,
            xEnd,
            yEnd,
            lineStyle
        ) {
            if (xStart === xEnd) {
                xStart = xEnd = this.subPixelOptimize(xStart, lineStyle.width);
            }
            if (yStart === yEnd) {
                yStart = yEnd = this.subPixelOptimize(yStart, lineStyle.width);
            }
            return new LineShape({
                zlevel: this.getZlevelBase(),
                hoverable: false,
                style: zrUtil.merge(
                    {
                        xStart: xStart,
                        yStart: yStart,
                        xEnd: xEnd,
                        yEnd: yEnd,
                        lineType: lineStyle.type,
                        strokeColor: lineStyle.color,
                        lineWidth: lineStyle.width
                    },
                    lineStyle,
                    true
                )
            });
        },
        _buildBezierCurve: function (
            parentNode,
            treeNode,
            lineStyle,
            serie
        ) {
            var offsetRatio = GOLDEN_SECTION;
            var orient = serie.orient;
            var xStart = parentNode.layout.position[0];
            var yStart = parentNode.layout.position[1];
            var xEnd = treeNode.layout.position[0];
            var yEnd = treeNode.layout.position[1];
            var cpX1 = xStart;
            var cpY1 = (yEnd - yStart) * offsetRatio + yStart;
            var cpX2 = xEnd;
            var cpY2 = (yEnd - yStart) * (1 - offsetRatio) + yStart;
            if (orient === 'horizontal') {
                cpX1 = (xEnd - xStart) * offsetRatio + xStart;
                cpY1 = yStart;
                cpX2 = (xEnd - xStart) * (1 - offsetRatio) + xStart;
                cpY2 = yEnd;
            }
            else if (orient === 'radial') {
                // 根节点 画直线
                if (parentNode.id === this.tree.root.id) {
                    cpX1 = (xEnd - xStart) * offsetRatio + xStart;
                    cpY1 = (yEnd - yStart) * offsetRatio + yStart;
                    cpX2 = (xEnd - xStart) * (1 - offsetRatio) + xStart;
                    cpY2 = (yEnd - yStart) * (1 - offsetRatio) + yStart;
                }
                else {
                    var xStartOrigin = parentNode.layout.originPosition[0];
                    var yStartOrigin = parentNode.layout.originPosition[1];
                    var xEndOrigin = treeNode.layout.originPosition[0];
                    var yEndOrigin = treeNode.layout.originPosition[1];
                    var rootX = this.tree.root.layout.position[0];
                    var rootY = this.tree.root.layout.position[1];

                    cpX1 = xStartOrigin;
                    cpY1 = (yEndOrigin - yStartOrigin) * offsetRatio + yStartOrigin;
                    cpX2 = xEndOrigin;
                    cpY2 = (yEndOrigin - yStartOrigin) * (1 - offsetRatio) + yStartOrigin;
                    var rad = (cpX1 - this.minX) / this.width * Math.PI * 2;
                    cpX1 = cpY1 * Math.cos(rad) + rootX;
                    cpY1 = cpY1 * Math.sin(rad) + rootY;

                    rad = (cpX2 - this.minX) / this.width * Math.PI * 2;
                    cpX2 = cpY2 * Math.cos(rad) + rootX;
                    cpY2 = cpY2 * Math.sin(rad) + rootY;
                }
            }
            var shape = new BezierCurveShape({
                zlevel: this.getZlevelBase(),
                hoverable: false,
                style: zrUtil.merge(
                    {
                        xStart: xStart,
                        yStart: yStart,
                        cpX1: cpX1,
                        cpY1: cpY1,
                        cpX2: cpX2,
                        cpY2: cpY2,
                        xEnd: xEnd,
                        yEnd: yEnd,
                        strokeColor: lineStyle.color,
                        lineWidth: lineStyle.width
                    },
                    lineStyle,
                    true
                )
            });
            this.shapeList.push(shape);
        },
        _setTreeShape : function (serie) {
            // 跑出来树的layout
            var treeLayout = new TreeLayout(
                {
                    nodePadding: serie.nodePadding,
                    layerPadding: serie.layerPadding
                }
            );
            this.tree.traverse(
                function (treeNode) {
                    var queryTarget = [treeNode.data, serie];
                    var symbolSize = this.deepQuery(queryTarget, 'symbolSize');
                    if (typeof symbolSize === 'number') {
                        symbolSize = [symbolSize, symbolSize];
                    }
                    treeNode.layout = {
                        width: symbolSize[0], // 节点大小
                        height: symbolSize[1]
                    };
                },
                this
            );
            treeLayout.run(this.tree);
            // 树的方向
            var orient = serie.orient;
            var rootX = serie.rootLocation.x;
            var rootY = serie.rootLocation.y;
            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            if (rootX === 'center') {
                rootX = zrWidth * 0.5;
            }
            else {
                rootX = this.parsePercent(rootX, zrWidth);
            }
            if (rootY === 'center') {
                rootY = zrHeight * 0.5;
            }
            else {
                rootY = this.parsePercent(rootY, zrHeight);
            }
            rootY = this.parsePercent(rootY, zrHeight);
            // 水平树
            if (orient === 'horizontal') {
                rootX = isNaN(rootX) ? 10 : rootX;
                rootY = isNaN(rootY) ? zrHeight * 0.5 : rootY;
            }
            // 极坐标
            if (orient === 'radial') {
                rootX = isNaN(rootX) ? zrWidth * 0.5 : rootX;
                rootY = isNaN(rootY) ? zrHeight * 0.5 : rootY;
            }
            // 纵向树
            else {
                rootX = isNaN(rootX) ? zrWidth * 0.5 : rootX;
                rootY = isNaN(rootY) ? 10 : rootY;
            }
            // tree layout自动算出来的root的坐标
            var originRootX = this.tree.root.layout.position[0];
            // 若是极坐标,则求最大最小值
            if (orient === 'radial') {
                var minX = Infinity;
                var maxX = 0;
                var maxWidth = 0;
                this.tree.traverse(
                    function (treeNode) {
                        maxX = Math.max(maxX, treeNode.layout.position[0]);
                        minX = Math.min(minX, treeNode.layout.position[0]);
                        maxWidth = Math.max(maxWidth, treeNode.layout.width);
                    }
                );
                //  2 * maxWidth 还不大好但至少保证绝不会重叠 todo
                this.width = maxX - minX + 2 * maxWidth;
                this.minX = minX;
            }
            this.tree.traverse(
                function (treeNode) {

                    var x = treeNode.layout.position[0] - originRootX + rootX;
                    var y = treeNode.layout.position[1] + rootY;
                    if (orient === 'horizontal') {
                        y = treeNode.layout.position[0] - originRootX + rootY;
                        x = treeNode.layout.position[1] + rootX;
                    }
                    if (orient === 'radial') {
                        x = treeNode.layout.position[0];
                        y = treeNode.layout.position[1];
                        // 记录原始坐标，以后计算贝塞尔曲线的控制点
                        treeNode.layout.originPosition = [x, y];
                        var r = y;
                        var angle = (x - minX) / this.width * Math.PI * 2;
                        x = r * Math.cos(angle) + rootX;
                        y = r * Math.sin(angle) + rootY;
                        treeNode.layout.angle = angle;
                    }
                    treeNode.layout.position[0] = x;
                    treeNode.layout.position[1] = y;
                },
                this
            );
        },
        /*
         * 刷新
         */
/*        refresh: function (newOption) {
            this.clear();
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }

            this._buildShape();
        }*/
        refresh: function (newOption) {
            this.clear();

            if (newOption) {
                this.option = newOption;
                this.series = this.option.series;
            }

            // Map storing all trees of series

            var series = this.series;
            var legend = this.component.legend;

            for (var i = 0; i < series.length; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_TREE) {
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

        _buildSeries: function (series, seriesIndex) {
            /*var tree = Tree.fromOptionData('root', series.data);

            this._treesMap[seriesIndex] = tree;*/

            // this._buildTreemap(tree.root, seriesIndex);
            this._buildShape(series, seriesIndex);
        }
    };

    zrUtil.inherits(Tree, ChartBase);

    // 图表注册
    require('../chart').define('tree', Tree);

    return Tree;
});

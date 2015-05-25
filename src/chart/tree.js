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
    var toolArea = require('zrender/tool/area');
    // 图形依赖
    var IconShape = require('../util/shape/Icon');
    var ImageShape = require('zrender/shape/Image');
    var LineShape = require('zrender/shape/Line');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    // 布局依赖
    var TreeMapLayout = require('../layout/TreeMap');
    // 布局依赖
    var TreeLayout = require('../layout/Tree');
    // 数据依赖
    var TreeData = require('../data/Tree');

    var ecConfig = require('../config');
    // 维恩图默认参数
    ecConfig.tree = {
        zlevel: 0,                  // 一级层叠
        z: 1,                       // 二级层叠
        calculable: false,
        clickable: true,
        rootLocation: {},
        symbol: 'circle',
        symbolSize: 20,
        nodePadding: 30,
        layerPadding: 100,
        /*rootLocation: {
            x: 'center' | 'left' | 'right' | 'x%' | {number},
            y: 'center' | 'top' | 'bottom' | 'x%' | {number}
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
        type : ecConfig.CHART_TYPE_TREEMAP,
        /**
         * 构建单个
         *
         * @param {Object} data 数据
         */
        _buildShape : function () {
            var queryTarget = [this.series[0], ecConfig.tree];
            this.serie = this.deepMerge(queryTarget);
            var serie = this.serie;
            var data = serie.data[0];
            this.tree = TreeData.fromOptionData(data.name, data.children);
            // 添加root的data
            this.tree.root.data = data;
            // 根据root坐标 方向 对每个节点的坐标进行映射
            this._setTreeShape();
            // 递归画出树节点与连接线
            this.tree.traverse(
                function (treeNode) {
                    this._buildItem(
                        treeNode,
                        serie.itemStyle
                    );
                    // 画连接线
                    if (treeNode.children.length > 0) {
                        this._buildLink(
                            treeNode
                        );
                    }
                },
                this
            );

            this.addShapeList();
        },

        /**
         * 构建单个item
         */
        _buildItem : function (
            treeNode,
            itemStyle
        ) {
            var serie = this.serie;
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
            var shape = new IconShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
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
                serie, 0,
                treeNode.data, 0,
                treeNode.id
            );
            this.shapeList.push(shape);
        },

        _buildLink : function (
            parentNode
        ) {
            var lineStyle = this.serie.itemStyle.normal.lineStyle;
            // 折线另外计算
            if (lineStyle.type === 'broken') {
                this._buildBrokenLine(
                    parentNode,
                    lineStyle
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
                            xStart,
                            yStart,
                            xEnd,
                            yEnd,
                            lineStyle
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
            lineStyle
        ) {
            // 引用_getLine需要把type改为solid
            var solidLineStyle = zrUtil.clone(lineStyle);
            solidLineStyle.type = 'solid';
            var shapes = [];
            var xStart = parentNode.layout.position[0];
            var yStart = parentNode.layout.position[1];
            var orient = this.serie.orient;

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
            return new LineShape({
                zlevel: this.getZlevelBase() - 1,
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
            xStart,
            yStart,
            xEnd,
            yEnd,
            lineStyle
        ) {
            var offsetRatio = GOLDEN_SECTION;
            var orient = this.serie.orient;
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
            var shape = new BezierCurveShape({
                zlevel: this.getZlevelBase() - 1,
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
        _setTreeShape : function () {
            // 跑出来树的layout
            var treeLayout = new TreeLayout(
                {
                    nodePadding: this.serie.nodePadding,
                    layerPadding: this.serie.layerPadding
                }
            );
            this.tree.traverse(
                function (treeNode) {
                    var queryTarget = [treeNode.data, this.serie];
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
            var serie = this.serie;
            // 树的方向
            var orient = serie.orient;
            var rootX = serie.rootLocation.x;
            var rootY = serie.rootLocation.y;
            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            rootX = this.parsePercent(rootX, zrWidth);
            rootY = this.parsePercent(rootY, zrHeight);
            // 水平树
            if (orient === 'horizontal') {
                rootX = isNaN(rootX) ? 10 : rootX;
                rootY = isNaN(rootY) ? zrHeight * 0.5 : rootY;
            }
            // 纵向树
            else {
                rootX = isNaN(rootX) ? zrWidth * 0.5 : rootX;
                rootY = isNaN(rootY) ? 10 : rootY;
            }
            // tree layout自动算出来的root的坐标
            var originRootX = this.tree.root.layout.position[0];
            var originRootY = this.tree.root.layout.position[1];
            this.tree.traverse(
                function (treeNode) {

                    var x = treeNode.layout.position[0] - originRootX + rootX;
                    var y = treeNode.layout.position[1] - originRootY + rootY;
                    if (orient === 'horizontal') {
                        y = treeNode.layout.position[0] - originRootX + rootY;
                        x = treeNode.layout.position[1] - originRootY + rootX;
                    }
                    treeNode.layout.position[0] = x;
                    treeNode.layout.position[1] = y;
                },
                this.tree
            );
        },
        /*
         * 刷新
         */
        refresh: function (newOption) {
            this.clear();
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }

            this._buildShape();
        }
    };

    zrUtil.inherits(Tree, ChartBase);

    // 图表注册
    require('../chart').define('tree', Tree);

    return Tree;
});

define('echarts/chart/tree', [
    'require',
    './base',
    '../util/shape/Icon',
    'zrender/shape/Image',
    'zrender/shape/Line',
    'zrender/shape/BezierCurve',
    '../layout/Tree',
    '../data/Tree',
    '../config',
    '../util/ecData',
    'zrender/config',
    'zrender/tool/event',
    'zrender/tool/util',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var GOLDEN_SECTION = 0.618;
    var IconShape = require('../util/shape/Icon');
    var ImageShape = require('zrender/shape/Image');
    var LineShape = require('zrender/shape/Line');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    var TreeLayout = require('../layout/Tree');
    var TreeData = require('../data/Tree');
    var ecConfig = require('../config');
    ecConfig.tree = {
        zlevel: 1,
        z: 2,
        calculable: false,
        clickable: true,
        rootLocation: {},
        orient: 'vertical',
        symbol: 'circle',
        symbolSize: 20,
        nodePadding: 30,
        layerPadding: 100,
        itemStyle: {
            normal: {
                label: { show: true },
                lineStyle: {
                    width: 1,
                    color: '#777',
                    type: 'curve'
                }
            },
            emphasis: {}
        }
    };
    var ecData = require('../util/ecData');
    var zrConfig = require('zrender/config');
    var zrEvent = require('zrender/tool/event');
    var zrUtil = require('zrender/tool/util');
    function Tree(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Tree.prototype = {
        type: ecConfig.CHART_TYPE_TREE,
        _buildShape: function (series, seriesIndex) {
            var data = series.data[0];
            this.tree = TreeData.fromOptionData(data.name, data.children);
            this.tree.root.data = data;
            this._setTreeShape(series);
            this.tree.traverse(function (treeNode) {
                this._buildItem(treeNode, series, seriesIndex);
                if (treeNode.children.length > 0) {
                    this._buildLink(treeNode, series);
                }
            }, this);
            var panable = series.roam === true || series.roam === 'move';
            var zoomable = series.roam === true || series.roam === 'scale';
            this.zr.modLayer(this.getZlevelBase(), {
                panable: panable,
                zoomable: zoomable
            });
            if (this.query('markPoint.effect.show') || this.query('markLine.effect.show')) {
                this.zr.modLayer(ecConfig.EFFECT_ZLEVEL, {
                    panable: panable,
                    zoomable: zoomable
                });
            }
            this.addShapeList();
        },
        _buildItem: function (treeNode, serie, seriesIndex) {
            var queryTarget = [
                treeNode.data,
                serie
            ];
            var symbol = this.deepQuery(queryTarget, 'symbol');
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
            var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis') || {};
            var normalColor = normal.color || this.zr.getColor();
            var emphasisColor = emphasis.color || this.zr.getColor();
            var angle = -treeNode.layout.angle || 0;
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
                clickable: this.deepQuery(queryTarget, 'clickable'),
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
                shape.style.image = shape.style.iconType.replace(new RegExp('^image:\\/\\/'), '');
                shape = new ImageShape({
                    rotation: rotation,
                    style: shape.style,
                    highlightStyle: shape.highlightStyle,
                    clickable: shape.clickable,
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase()
                });
            }
            if (this.deepQuery(queryTarget, 'itemStyle.normal.label.show')) {
                shape.style.text = treeNode.data.label == null ? treeNode.id : treeNode.data.label;
                shape.style.textPosition = this.deepQuery(queryTarget, 'itemStyle.normal.label.position');
                if (serie.orient === 'radial' && shape.style.textPosition !== 'inside') {
                    shape.style.textPosition = textPosition;
                }
                shape.style.textColor = this.deepQuery(queryTarget, 'itemStyle.normal.label.textStyle.color');
                shape.style.textFont = this.getFont(this.deepQuery(queryTarget, 'itemStyle.normal.label.textStyle') || {});
            }
            if (this.deepQuery(queryTarget, 'itemStyle.emphasis.label.show')) {
                shape.highlightStyle.textPosition = this.deepQuery(queryTarget, 'itemStyle.emphasis.label.position');
                shape.highlightStyle.textColor = this.deepQuery(queryTarget, 'itemStyle.emphasis.label.textStyle.color');
                shape.highlightStyle.textFont = this.getFont(this.deepQuery(queryTarget, 'itemStyle.emphasis.label.textStyle') || {});
            }
            ecData.pack(shape, serie, seriesIndex, treeNode.data, 0, treeNode.id);
            this.shapeList.push(shape);
        },
        _buildLink: function (parentNode, serie) {
            var lineStyle = serie.itemStyle.normal.lineStyle;
            if (lineStyle.type === 'broken') {
                this._buildBrokenLine(parentNode, lineStyle, serie);
                return;
            }
            for (var i = 0; i < parentNode.children.length; i++) {
                var xStart = parentNode.layout.position[0];
                var yStart = parentNode.layout.position[1];
                var xEnd = parentNode.children[i].layout.position[0];
                var yEnd = parentNode.children[i].layout.position[1];
                switch (lineStyle.type) {
                case 'curve':
                    this._buildBezierCurve(parentNode, parentNode.children[i], lineStyle, serie);
                    break;
                case 'broken':
                    break;
                default:
                    var shape = this._getLine(xStart, yStart, xEnd, yEnd, lineStyle);
                    this.shapeList.push(shape);
                }
            }
        },
        _buildBrokenLine: function (parentNode, lineStyle, serie) {
            var solidLineStyle = zrUtil.clone(lineStyle);
            solidLineStyle.type = 'solid';
            var shapes = [];
            var xStart = parentNode.layout.position[0];
            var yStart = parentNode.layout.position[1];
            var orient = serie.orient;
            var yEnd = parentNode.children[0].layout.position[1];
            var xMiddle = xStart;
            var yMiddle = yStart + (yEnd - yStart) * (1 - GOLDEN_SECTION);
            var xMiddleStart = parentNode.children[0].layout.position[0];
            var yMiddleStart = yMiddle;
            var xMiddleEnd = parentNode.children[parentNode.children.length - 1].layout.position[0];
            var yMiddleEnd = yMiddle;
            if (orient === 'horizontal') {
                var xEnd = parentNode.children[0].layout.position[0];
                xMiddle = xStart + (xEnd - xStart) * (1 - GOLDEN_SECTION);
                yMiddle = yStart;
                xMiddleStart = xMiddle;
                yMiddleStart = parentNode.children[0].layout.position[1];
                xMiddleEnd = xMiddle;
                yMiddleEnd = parentNode.children[parentNode.children.length - 1].layout.position[1];
            }
            shapes.push(this._getLine(xStart, yStart, xMiddle, yMiddle, solidLineStyle));
            shapes.push(this._getLine(xMiddleStart, yMiddleStart, xMiddleEnd, yMiddleEnd, solidLineStyle));
            for (var i = 0; i < parentNode.children.length; i++) {
                xEnd = parentNode.children[i].layout.position[0];
                yEnd = parentNode.children[i].layout.position[1];
                if (orient === 'horizontal') {
                    yMiddleStart = yEnd;
                } else {
                    xMiddleStart = xEnd;
                }
                shapes.push(this._getLine(xMiddleStart, yMiddleStart, xEnd, yEnd, solidLineStyle));
            }
            this.shapeList = this.shapeList.concat(shapes);
        },
        _getLine: function (xStart, yStart, xEnd, yEnd, lineStyle) {
            if (xStart === xEnd) {
                xStart = xEnd = this.subPixelOptimize(xStart, lineStyle.width);
            }
            if (yStart === yEnd) {
                yStart = yEnd = this.subPixelOptimize(yStart, lineStyle.width);
            }
            return new LineShape({
                zlevel: this.getZlevelBase(),
                hoverable: false,
                style: zrUtil.merge({
                    xStart: xStart,
                    yStart: yStart,
                    xEnd: xEnd,
                    yEnd: yEnd,
                    lineType: lineStyle.type,
                    strokeColor: lineStyle.color,
                    lineWidth: lineStyle.width
                }, lineStyle, true)
            });
        },
        _buildBezierCurve: function (parentNode, treeNode, lineStyle, serie) {
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
            } else if (orient === 'radial') {
                if (parentNode.id === this.tree.root.id) {
                    cpX1 = (xEnd - xStart) * offsetRatio + xStart;
                    cpY1 = (yEnd - yStart) * offsetRatio + yStart;
                    cpX2 = (xEnd - xStart) * (1 - offsetRatio) + xStart;
                    cpY2 = (yEnd - yStart) * (1 - offsetRatio) + yStart;
                } else {
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
                style: zrUtil.merge({
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
                }, lineStyle, true)
            });
            this.shapeList.push(shape);
        },
        _setTreeShape: function (serie) {
            var treeLayout = new TreeLayout({
                nodePadding: serie.nodePadding,
                layerPadding: serie.layerPadding
            });
            this.tree.traverse(function (treeNode) {
                var queryTarget = [
                    treeNode.data,
                    serie
                ];
                var symbolSize = this.deepQuery(queryTarget, 'symbolSize');
                if (typeof symbolSize === 'number') {
                    symbolSize = [
                        symbolSize,
                        symbolSize
                    ];
                }
                treeNode.layout = {
                    width: symbolSize[0],
                    height: symbolSize[1]
                };
            }, this);
            treeLayout.run(this.tree);
            var orient = serie.orient;
            var rootX = serie.rootLocation.x;
            var rootY = serie.rootLocation.y;
            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            if (rootX === 'center') {
                rootX = zrWidth * 0.5;
            } else {
                rootX = this.parsePercent(rootX, zrWidth);
            }
            if (rootY === 'center') {
                rootY = zrHeight * 0.5;
            } else {
                rootY = this.parsePercent(rootY, zrHeight);
            }
            rootY = this.parsePercent(rootY, zrHeight);
            if (orient === 'horizontal') {
                rootX = isNaN(rootX) ? 10 : rootX;
                rootY = isNaN(rootY) ? zrHeight * 0.5 : rootY;
            }
            if (orient === 'radial') {
                rootX = isNaN(rootX) ? zrWidth * 0.5 : rootX;
                rootY = isNaN(rootY) ? zrHeight * 0.5 : rootY;
            } else {
                rootX = isNaN(rootX) ? zrWidth * 0.5 : rootX;
                rootY = isNaN(rootY) ? 10 : rootY;
            }
            var originRootX = this.tree.root.layout.position[0];
            if (orient === 'radial') {
                var minX = Infinity;
                var maxX = 0;
                var maxWidth = 0;
                this.tree.traverse(function (treeNode) {
                    maxX = Math.max(maxX, treeNode.layout.position[0]);
                    minX = Math.min(minX, treeNode.layout.position[0]);
                    maxWidth = Math.max(maxWidth, treeNode.layout.width);
                });
                this.width = maxX - minX + 2 * maxWidth;
                this.minX = minX;
            }
            this.tree.traverse(function (treeNode) {
                var x;
                var y;
                if (orient === 'vertical' && serie.direction === 'inverse') {
                    x = treeNode.layout.position[0] - originRootX + rootX;
                    y = rootY - treeNode.layout.position[1];
                } else if (orient === 'vertical') {
                    x = treeNode.layout.position[0] - originRootX + rootX;
                    y = treeNode.layout.position[1] + rootY;
                } else if (orient === 'horizontal' && serie.direction === 'inverse') {
                    y = treeNode.layout.position[0] - originRootX + rootY;
                    x = rootX - treeNode.layout.position[1];
                } else if (orient === 'horizontal') {
                    y = treeNode.layout.position[0] - originRootX + rootY;
                    x = treeNode.layout.position[1] + rootX;
                } else {
                    x = treeNode.layout.position[0];
                    y = treeNode.layout.position[1];
                    treeNode.layout.originPosition = [
                        x,
                        y
                    ];
                    var r = y;
                    var angle = (x - minX) / this.width * Math.PI * 2;
                    x = r * Math.cos(angle) + rootX;
                    y = r * Math.sin(angle) + rootY;
                    treeNode.layout.angle = angle;
                }
                treeNode.layout.position[0] = x;
                treeNode.layout.position[1] = y;
            }, this);
        },
        refresh: function (newOption) {
            this.clear();
            if (newOption) {
                this.option = newOption;
                this.series = this.option.series;
            }
            var series = this.series;
            var legend = this.component.legend;
            for (var i = 0; i < series.length; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_TREE) {
                    series[i] = this.reformOption(series[i]);
                    var seriesName = series[i].name || '';
                    this.selectedMap[seriesName] = legend ? legend.isSelected(seriesName) : true;
                    if (!this.selectedMap[seriesName]) {
                        continue;
                    }
                    this._buildSeries(series[i], i);
                }
            }
        },
        _buildSeries: function (series, seriesIndex) {
            this._buildShape(series, seriesIndex);
        }
    };
    zrUtil.inherits(Tree, ChartBase);
    require('../chart').define('tree', Tree);
    return Tree;
});define('echarts/layout/Tree', [
    'require',
    'zrender/tool/vector'
], function (require) {
    var vec2 = require('zrender/tool/vector');
    function TreeLayout(opts) {
        opts = opts || {};
        this.nodePadding = opts.nodePadding || 30;
        this.layerPadding = opts.layerPadding || 100;
        this._layerOffsets = [];
        this._layers = [];
    }
    TreeLayout.prototype.run = function (tree) {
        this._layerOffsets.length = 0;
        for (var i = 0; i < tree.root.height + 1; i++) {
            this._layerOffsets[i] = 0;
            this._layers[i] = [];
        }
        this._updateNodeXPosition(tree.root);
        var root = tree.root;
        this._updateNodeYPosition(root, 0, root.layout.height);
    };
    TreeLayout.prototype._updateNodeXPosition = function (node) {
        var minX = Infinity;
        var maxX = -Infinity;
        node.layout.position = node.layout.position || vec2.create();
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            this._updateNodeXPosition(child);
            var x = child.layout.position[0];
            if (x < minX) {
                minX = x;
            }
            if (x > maxX) {
                maxX = x;
            }
        }
        if (node.children.length > 0) {
            node.layout.position[0] = (minX + maxX) / 2;
        } else {
            node.layout.position[0] = 0;
        }
        var off = this._layerOffsets[node.depth] || 0;
        if (off > node.layout.position[0]) {
            var shift = off - node.layout.position[0];
            this._shiftSubtree(node, shift);
            for (var i = node.depth + 1; i < node.height + node.depth; i++) {
                this._layerOffsets[i] += shift;
            }
        }
        this._layerOffsets[node.depth] = node.layout.position[0] + node.layout.width + this.nodePadding;
        this._layers[node.depth].push(node);
    };
    TreeLayout.prototype._shiftSubtree = function (root, offset) {
        root.layout.position[0] += offset;
        for (var i = 0; i < root.children.length; i++) {
            this._shiftSubtree(root.children[i], offset);
        }
    };
    TreeLayout.prototype._updateNodeYPosition = function (node, y, prevLayerHeight) {
        node.layout.position[1] = y;
        var layerHeight = 0;
        for (var i = 0; i < node.children.length; i++) {
            layerHeight = Math.max(node.children[i].layout.height, layerHeight);
        }
        var layerPadding = this.layerPadding;
        if (typeof layerPadding === 'function') {
            layerPadding = layerPadding(node.depth);
        }
        for (var i = 0; i < node.children.length; i++) {
            this._updateNodeYPosition(node.children[i], y + layerPadding + prevLayerHeight, layerHeight);
        }
    };
    return TreeLayout;
});define('echarts/data/Tree', [
    'require',
    'zrender/tool/util'
], function (require) {
    var zrUtil = require('zrender/tool/util');
    function TreeNode(id, data) {
        this.id = id;
        this.depth = 0;
        this.height = 0;
        this.children = [];
        this.parent = null;
        this.data = data || null;
    }
    TreeNode.prototype.add = function (child) {
        var children = this.children;
        if (child.parent === this) {
            return;
        }
        children.push(child);
        child.parent = this;
    };
    TreeNode.prototype.remove = function (child) {
        var children = this.children;
        var idx = zrUtil.indexOf(children, child);
        if (idx >= 0) {
            children.splice(idx, 1);
            child.parent = null;
        }
    };
    TreeNode.prototype.traverse = function (cb, context) {
        cb.call(context, this);
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].traverse(cb, context);
        }
    };
    TreeNode.prototype.updateDepthAndHeight = function (depth) {
        var height = 0;
        this.depth = depth;
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            child.updateDepthAndHeight(depth + 1);
            if (child.height > height) {
                height = child.height;
            }
        }
        this.height = height + 1;
    };
    TreeNode.prototype.getNodeById = function (id) {
        if (this.id === id) {
            return this;
        }
        for (var i = 0; i < this.children.length; i++) {
            var res = this.children[i].getNodeById(id);
            if (res) {
                return res;
            }
        }
    };
    function Tree(id) {
        this.root = new TreeNode(id);
    }
    Tree.prototype.traverse = function (cb, context) {
        this.root.traverse(cb, context);
    };
    Tree.prototype.getSubTree = function (id) {
        var root = this.getNodeById(id);
        if (root) {
            var tree = new Tree(root.id);
            tree.root = root;
            return tree;
        }
    };
    Tree.prototype.getNodeById = function (id) {
        return this.root.getNodeById(id);
    };
    Tree.fromOptionData = function (id, data) {
        var tree = new Tree(id);
        var rootNode = tree.root;
        rootNode.data = {
            name: id,
            children: data
        };
        function buildHierarchy(dataNode, parentNode) {
            var node = new TreeNode(dataNode.name, dataNode);
            parentNode.add(node);
            var children = dataNode.children;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    buildHierarchy(children[i], node);
                }
            }
        }
        for (var i = 0; i < data.length; i++) {
            buildHierarchy(data[i], rootNode);
        }
        tree.root.updateDepthAndHeight(0);
        return tree;
    };
    Tree.fromGraph = function (graph) {
        function buildHierarchy(root) {
            var graphNode = graph.getNodeById(root.id);
            for (var i = 0; i < graphNode.outEdges.length; i++) {
                var edge = graphNode.outEdges[i];
                var childTreeNode = treeNodesMap[edge.node2.id];
                root.children.push(childTreeNode);
                buildHierarchy(childTreeNode);
            }
        }
        var treeMap = {};
        var treeNodesMap = {};
        for (var i = 0; i < graph.nodes.length; i++) {
            var node = graph.nodes[i];
            var treeNode;
            if (node.inDegree() === 0) {
                treeMap[node.id] = new Tree(node.id);
                treeNode = treeMap[node.id].root;
            } else {
                treeNode = new TreeNode(node.id);
            }
            treeNode.data = node.data;
            treeNodesMap[node.id] = treeNode;
        }
        var treeList = [];
        for (var id in treeMap) {
            buildHierarchy(treeMap[id].root);
            treeMap[id].root.updateDepthAndHeight(0);
            treeList.push(treeMap[id]);
        }
        return treeList;
    };
    return Tree;
});
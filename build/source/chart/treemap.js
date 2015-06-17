define('echarts/chart/treemap', [
    'require',
    './base',
    'zrender/tool/area',
    'zrender/shape/Rectangle',
    'zrender/shape/Text',
    'zrender/shape/Line',
    '../layout/TreeMap',
    '../data/Tree',
    '../config',
    '../util/ecData',
    'zrender/config',
    'zrender/tool/event',
    'zrender/tool/util',
    'zrender/tool/color',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var toolArea = require('zrender/tool/area');
    var RectangleShape = require('zrender/shape/Rectangle');
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var TreeMapLayout = require('../layout/TreeMap');
    var Tree = require('../data/Tree');
    var ecConfig = require('../config');
    ecConfig.treemap = {
        zlevel: 0,
        z: 1,
        calculable: false,
        clickable: true,
        center: [
            '50%',
            '50%'
        ],
        size: [
            '80%',
            '80%'
        ],
        root: '',
        itemStyle: {
            normal: {
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
    function Treemap(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
        var self = this;
        self._onclick = function (params) {
            return self.__onclick(params);
        };
        self.zr.on(zrConfig.EVENT.CLICK, self._onclick);
    }
    Treemap.prototype = {
        type: ecConfig.CHART_TYPE_TREEMAP,
        refresh: function (newOption) {
            this.clear();
            if (newOption) {
                this.option = newOption;
                this.series = this.option.series;
            }
            this._treesMap = {};
            var series = this.series;
            var legend = this.component.legend;
            for (var i = 0; i < series.length; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_TREEMAP) {
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
            var tree = Tree.fromOptionData(series.name, series.data);
            this._treesMap[seriesIndex] = tree;
            var treeRoot = series.root && tree.getNodeById(series.root) || tree.root;
            this._buildTreemap(treeRoot, seriesIndex);
        },
        _buildTreemap: function (treeRoot, seriesIndex) {
            var shapeList = this.shapeList;
            for (var i = 0; i < shapeList.length;) {
                var shape = shapeList[i];
                if (ecData.get(shape, 'seriesIndex') === seriesIndex) {
                    this.zr.delShape(shapeList[i]);
                    shapeList.splice(i, 1);
                } else {
                    i++;
                }
            }
            var currentShapeLen = shapeList.length;
            var series = this.series[seriesIndex];
            var itemStyle = series.itemStyle;
            var treemapWidth = this.parsePercent(series.size[0], this.zr.getWidth()) || 400;
            var treemapHeight = this.parsePercent(series.size[1], this.zr.getHeight()) || 500;
            var center = this.parseCenter(this.zr, series.center);
            var treemapX = center[0] - treemapWidth * 0.5;
            var treemapY = center[1] - treemapHeight * 0.5;
            var treemapArea = treemapWidth * treemapHeight;
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
                var queryTarget = [
                    dataItem.itemStyle,
                    itemStyle
                ];
                var itemStyleMerged = this.deepMerge(queryTarget);
                if (!itemStyleMerged.normal.color) {
                    itemStyleMerged.normal.color = this.zr.getColor(k);
                }
                if (!itemStyleMerged.emphasis.color) {
                    itemStyleMerged.emphasis.color = itemStyleMerged.normal.color;
                }
                this._buildItem(dataItem, itemStyleMerged, rect, seriesIndex, k);
                if (dataItem.children) {
                    this._buildChildrenTreemap(dataItem.children, itemStyleMerged, rect, seriesIndex);
                }
            }
            if (this.query(series, 'itemStyle.normal.breadcrumb.show')) {
                this._buildBreadcrumb(treeRoot, seriesIndex, treemapX, treemapY + treemapHeight);
            }
            for (var i = currentShapeLen; i < shapeList.length; i++) {
                this.zr.addShape(shapeList[i]);
            }
        },
        _buildItem: function (dataItem, itemStyle, rect, seriesIndex, dataIndex) {
            var series = this.series;
            var rectangle = this.getRectangle(dataItem, itemStyle, rect);
            ecData.pack(rectangle, series[seriesIndex], seriesIndex, dataItem, dataIndex, dataItem.name);
            this.shapeList.push(rectangle);
        },
        getRectangle: function (dataItem, itemStyle, rect) {
            var emphasis = itemStyle.emphasis;
            var normal = itemStyle.normal;
            var textShape = this.getLabel(itemStyle, rect, dataItem.name, dataItem.value);
            var hoverable = this.option.hoverable;
            var rectangleShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable: hoverable,
                clickable: true,
                style: zrUtil.merge({
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    brushType: 'both',
                    color: normal.color,
                    lineWidth: normal.borderWidth,
                    strokeColor: normal.borderColor
                }, textShape.style, true),
                highlightStyle: zrUtil.merge({
                    color: emphasis.color,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }, textShape.highlightStyle, true)
            };
            return new RectangleShape(rectangleShape);
        },
        getLabel: function (itemStyle, rect, name, value) {
            var normalTextStyle = itemStyle.normal.label.textStyle;
            var queryTarget = [
                itemStyle.emphasis.label.textStyle,
                normalTextStyle
            ];
            var emphasisTextStyle = this.deepMerge(queryTarget);
            var formatter = itemStyle.normal.label.formatter;
            var text = this.getLabelText(name, value, formatter);
            var textFont = this.getFont(normalTextStyle);
            var textWidth = toolArea.getTextWidth(text, textFont);
            var textHeight = toolArea.getTextHeight(text, textFont);
            var emphasisFormatter = this.deepQuery([
                itemStyle.emphasis,
                itemStyle.normal
            ], 'label.formatter');
            var emphasisText = this.getLabelText(name, value, emphasisFormatter);
            var emphasisTextFont = this.getFont(emphasisTextStyle);
            var emphasisTextWidth = toolArea.getTextWidth(text, emphasisTextFont);
            var emphasisTextHeight = toolArea.getTextHeight(text, emphasisTextFont);
            if (!itemStyle.normal.label.show) {
                text = '';
            } else if (itemStyle.normal.label.x + textWidth > rect.width || itemStyle.normal.label.y + textHeight > rect.height) {
                text = '';
            }
            if (!itemStyle.emphasis.label.show) {
                emphasisText = '';
            } else if (emphasisTextStyle.x + emphasisTextWidth > rect.width || emphasisTextStyle.y + emphasisTextHeight > rect.height) {
                emphasisText = '';
            }
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
        getLabelText: function (name, value, formatter) {
            if (formatter) {
                if (typeof formatter === 'function') {
                    return formatter.call(this.myChart, name, value);
                } else if (typeof formatter === 'string') {
                    formatter = formatter.replace('{b}', '{b0}').replace('{c}', '{c0}');
                    formatter = formatter.replace('{b0}', name).replace('{c0}', value);
                    return formatter;
                }
            } else {
                return name;
            }
        },
        _buildChildrenTreemap: function (data, itemStyle, rect, seriesIndex) {
            var treemapArea = rect.width * rect.height;
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
                if (rect.y.toFixed(2) !== item.y.toFixed(2)) {
                    lines.push(this._getLine(item.x, item.y, item.x + item.width, item.y, lineWidth, lineColor));
                }
                if (rect.x.toFixed(2) !== item.x.toFixed(2)) {
                    lines.push(this._getLine(item.x, item.y, item.x, item.y + item.height, lineWidth, lineColor));
                }
                if ((rect.y + rect.height).toFixed(2) !== (item.y + item.height).toFixed(2)) {
                    lines.push(this._getLine(item.x, item.y + item.height, item.x + item.width, item.y + item.height, lineWidth, lineColor));
                }
                if ((rect.x + rect.width).toFixed(2) !== (item.x + item.width).toFixed(2)) {
                    lines.push(this._getLine(item.x + item.width, item.y, item.x + item.width, item.y + item.height, lineWidth, lineColor));
                }
                for (var l = 0; l < lines.length; l++) {
                    ecData.set(lines[l], 'seriesIndex', seriesIndex);
                    this.shapeList.push(lines[l]);
                }
            }
        },
        _getLine: function (xStart, yStart, xEnd, yEnd, lineWidth, lineColor) {
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
            var textEmphasisStyle = this.query(series, 'itemStyle.emphasis.breadcrumb.textStyle') || {};
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
        __onclick: function (params) {
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
    require('../chart').define('treemap', Treemap);
    return Treemap;
});define('echarts/layout/TreeMap', ['require'], function (require) {
    function TreeMapLayout(opts) {
        var row = {
            x: opts.x,
            y: opts.y,
            width: opts.width,
            height: opts.height
        };
        this.x = opts.x;
        this.y = opts.y;
        this.width = opts.width;
        this.height = opts.height;
    }
    TreeMapLayout.prototype.run = function (areas) {
        var out = [];
        this._squarify(areas, {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }, out);
        return out;
    };
    TreeMapLayout.prototype._squarify = function (areas, row, out) {
        var layoutDirection = 'VERTICAL';
        var width = row.width;
        var height = row.height;
        if (row.width < row.height) {
            layoutDirection = 'HORIZONTAL';
            width = row.height;
            height = row.width;
        }
        var shapeArr = this._getShapeListInAbstractRow(areas, width, height);
        for (var i = 0; i < shapeArr.length; i++) {
            shapeArr[i].x = 0;
            shapeArr[i].y = 0;
            for (var j = 0; j < i; j++) {
                shapeArr[i].y += shapeArr[j].height;
            }
        }
        var nextRow = {};
        if (layoutDirection == 'VERTICAL') {
            for (var k = 0; k < shapeArr.length; k++) {
                out.push({
                    x: shapeArr[k].x + row.x,
                    y: shapeArr[k].y + row.y,
                    width: shapeArr[k].width,
                    height: shapeArr[k].height
                });
            }
            nextRow = {
                x: shapeArr[0].width + row.x,
                y: row.y,
                width: row.width - shapeArr[0].width,
                height: row.height
            };
        } else {
            for (var l = 0; l < shapeArr.length; l++) {
                out.push({
                    x: shapeArr[l].y + row.x,
                    y: shapeArr[l].x + row.y,
                    width: shapeArr[l].height,
                    height: shapeArr[l].width
                });
            }
            nextRow = {
                x: row.x,
                y: row.y + shapeArr[0].width,
                width: row.width,
                height: row.height - shapeArr[0].width
            };
        }
        var nextAreaArr = areas.slice(shapeArr.length);
        if (nextAreaArr.length === 0) {
            return;
        } else {
            this._squarify(nextAreaArr, nextRow, out);
        }
    };
    TreeMapLayout.prototype._getShapeListInAbstractRow = function (areas, width, height) {
        if (areas.length === 1) {
            return [{
                    width: width,
                    height: height
                }];
        }
        for (var count = 1; count < areas.length; count++) {
            var shapeArr0 = this._placeFixedNumberRectangles(areas.slice(0, count), width, height);
            var shapeArr1 = this._placeFixedNumberRectangles(areas.slice(0, count + 1), width, height);
            if (this._isFirstBetter(shapeArr0, shapeArr1)) {
                return shapeArr0;
            }
        }
    };
    TreeMapLayout.prototype._placeFixedNumberRectangles = function (areaSubArr, width, height) {
        var count = areaSubArr.length;
        var shapeArr = [];
        var sum = 0;
        for (var i = 0; i < areaSubArr.length; i++) {
            sum += areaSubArr[i];
        }
        var cellWidth = sum / height;
        for (var j = 0; j < count; j++) {
            var cellHeight = height * areaSubArr[j] / sum;
            shapeArr.push({
                width: cellWidth,
                height: cellHeight
            });
        }
        return shapeArr;
    };
    TreeMapLayout.prototype._isFirstBetter = function (shapeArr0, shapeArr1) {
        var ratio0 = shapeArr0[0].height / shapeArr0[0].width;
        ratio0 = ratio0 > 1 ? 1 / ratio0 : ratio0;
        var ratio1 = shapeArr1[0].height / shapeArr1[0].width;
        ratio1 = ratio1 > 1 ? 1 / ratio1 : ratio1;
        if (Math.abs(ratio0 - 1) <= Math.abs(ratio1 - 1)) {
            return true;
        }
        return false;
    };
    return TreeMapLayout;
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
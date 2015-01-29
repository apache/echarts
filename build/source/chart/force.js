define('echarts/chart/force', [
    'require',
    './base',
    '../data/Graph',
    '../layout/Force',
    'zrender/shape/Line',
    'zrender/shape/BezierCurve',
    'zrender/shape/Image',
    '../util/shape/Icon',
    '../config',
    '../util/ecData',
    'zrender/tool/util',
    'zrender/config',
    'zrender/tool/vector',
    '../chart'
], function (require) {
    'use strict';
    var ChartBase = require('./base');
    var Graph = require('../data/Graph');
    var ForceLayout = require('../layout/Force');
    var LineShape = require('zrender/shape/Line');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    var ImageShape = require('zrender/shape/Image');
    var IconShape = require('../util/shape/Icon');
    var ecConfig = require('../config');
    ecConfig.force = {
        zlevel: 1,
        z: 2,
        center: [
            '50%',
            '50%'
        ],
        size: '100%',
        preventOverlap: false,
        coolDown: 0.99,
        minRadius: 10,
        maxRadius: 20,
        ratioScaling: false,
        large: false,
        useWorker: false,
        steps: 1,
        scaling: 1,
        gravity: 1,
        symbol: 'circle',
        symbolSize: 0,
        linkSymbol: null,
        linkSymbolSize: [
            10,
            15
        ],
        draggable: true,
        clickable: true,
        roam: false,
        itemStyle: {
            normal: {
                label: {
                    show: false,
                    position: 'inside'
                },
                nodeStyle: {
                    brushType: 'both',
                    borderColor: '#5182ab',
                    borderWidth: 1
                },
                linkStyle: {
                    color: '#5182ab',
                    width: 1,
                    type: 'line'
                }
            },
            emphasis: {
                label: { show: false },
                nodeStyle: {},
                linkStyle: { opacity: 0 }
            }
        }
    };
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrConfig = require('zrender/config');
    var vec2 = require('zrender/tool/vector');
    function Force(ecTheme, messageCenter, zr, option, myChart) {
        var self = this;
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.__nodePositionMap = {};
        this._graph = new Graph(true);
        this._layout = new ForceLayout();
        this._layout.onupdate = function () {
            self._step();
        };
        this._steps = 1;
        this.ondragstart = function () {
            ondragstart.apply(self, arguments);
        };
        this.ondragend = function () {
            ondragend.apply(self, arguments);
        };
        this.ondrop = function () {
        };
        this.shapeHandler.ondragstart = function () {
            self.isDragstart = true;
        };
        this.onmousemove = function () {
            onmousemove.apply(self, arguments);
        };
        this.refresh(option);
    }
    Force.prototype = {
        constructor: Force,
        type: ecConfig.CHART_TYPE_FORCE,
        _init: function () {
            var legend = this.component.legend;
            var series = this.series;
            var serieName;
            this.clear();
            for (var i = 0, l = series.length; i < l; i++) {
                var serie = series[i];
                if (serie.type === ecConfig.CHART_TYPE_FORCE) {
                    series[i] = this.reformOption(series[i]);
                    serieName = series[i].name || '';
                    this.selectedMap[serieName] = legend ? legend.isSelected(serieName) : true;
                    if (!this.selectedMap[serieName]) {
                        continue;
                    }
                    this.buildMark(i);
                    this._initSerie(serie, i);
                    break;
                }
            }
            this.animationEffect();
        },
        _getNodeCategory: function (serie, node) {
            return serie.categories && serie.categories[node.category || 0];
        },
        _getNodeQueryTarget: function (serie, node, type) {
            type = type || 'normal';
            var category = this._getNodeCategory(serie, node) || {};
            return [
                node.itemStyle && node.itemStyle[type],
                category && category.itemStyle && category.itemStyle[type],
                serie.itemStyle[type].nodeStyle
            ];
        },
        _getEdgeQueryTarget: function (serie, edge, type) {
            type = type || 'normal';
            return [
                edge.itemStyle && edge.itemStyle[type],
                serie.itemStyle[type].linkStyle
            ];
        },
        _initSerie: function (serie, serieIdx) {
            this._temperature = 1;
            if (serie.data) {
                this._graph = this._getSerieGraphFromDataMatrix(serie);
            } else {
                this._graph = this._getSerieGraphFromNodeLinks(serie);
            }
            this._buildLinkShapes(serie, serieIdx);
            this._buildNodeShapes(serie, serieIdx);
            var panable = serie.roam === true || serie.roam === 'move';
            var zoomable = serie.roam === true || serie.roam === 'scale';
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
            this._initLayout(serie);
            this._step();
        },
        _getSerieGraphFromDataMatrix: function (serie) {
            var nodesData = [];
            var count = 0;
            var matrix = [];
            for (var i = 0; i < serie.matrix.length; i++) {
                matrix[i] = serie.matrix[i].slice();
            }
            var data = serie.data || serie.nodes;
            for (var i = 0; i < data.length; i++) {
                var node = {};
                var group = data[i];
                for (var key in group) {
                    if (key === 'name') {
                        node['id'] = group['name'];
                    } else {
                        node[key] = group[key];
                    }
                }
                var category = this._getNodeCategory(serie, group);
                var name = category ? category.name : group.name;
                this.selectedMap[name] = this.isSelected(name);
                if (this.selectedMap[name]) {
                    nodesData.push(node);
                    count++;
                } else {
                    matrix.splice(count, 1);
                    for (var j = 0; j < matrix.length; j++) {
                        matrix[j].splice(count, 1);
                    }
                }
            }
            var graph = Graph.fromMatrix(nodesData, matrix, true);
            graph.eachNode(function (n, idx) {
                n.layout = {
                    size: n.data.value,
                    mass: 0
                };
                n.rawIndex = idx;
            });
            graph.eachEdge(function (e) {
                e.layout = { weight: e.data.weight };
            });
            return graph;
        },
        _getSerieGraphFromNodeLinks: function (serie) {
            var graph = new Graph(true);
            var nodes = serie.data || serie.nodes;
            for (var i = 0, len = nodes.length; i < len; i++) {
                var n = nodes[i];
                if (!n || n.ignore) {
                    continue;
                }
                var category = this._getNodeCategory(serie, n);
                var name = category ? category.name : n.name;
                this.selectedMap[name] = this.isSelected(name);
                if (this.selectedMap[name]) {
                    var node = graph.addNode(n.name, n);
                    node.rawIndex = i;
                }
            }
            for (var i = 0, len = serie.links.length; i < len; i++) {
                var e = serie.links[i];
                var n1 = e.source;
                var n2 = e.target;
                if (typeof n1 === 'number') {
                    n1 = nodes[n1];
                    if (n1) {
                        n1 = n1.name;
                    }
                }
                if (typeof n2 === 'number') {
                    n2 = nodes[n2];
                    if (n2) {
                        n2 = n2.name;
                    }
                }
                var edge = graph.addEdge(n1, n2, e);
                if (edge) {
                    edge.rawIndex = i;
                }
            }
            graph.eachNode(function (n) {
                var value = n.data.value;
                if (value == null) {
                    value = 0;
                    for (var i = 0; i < n.edges.length; i++) {
                        value += n.edges[i].data.weight || 0;
                    }
                }
                n.layout = {
                    size: value,
                    mass: 0
                };
            });
            graph.eachEdge(function (e) {
                e.layout = { weight: e.data.weight == null ? 1 : e.data.weight };
            });
            return graph;
        },
        _initLayout: function (serie) {
            var graph = this._graph;
            var len = graph.nodes.length;
            var minRadius = this.query(serie, 'minRadius');
            var maxRadius = this.query(serie, 'maxRadius');
            this._steps = serie.steps || 1;
            this._layout.center = this.parseCenter(this.zr, serie.center);
            this._layout.width = this.parsePercent(serie.size, this.zr.getWidth());
            this._layout.height = this.parsePercent(serie.size, this.zr.getHeight());
            this._layout.large = serie.large;
            this._layout.scaling = serie.scaling;
            this._layout.ratioScaling = serie.ratioScaling;
            this._layout.gravity = serie.gravity;
            this._layout.temperature = 1;
            this._layout.coolDown = serie.coolDown;
            this._layout.preventNodeEdgeOverlap = serie.preventOverlap;
            this._layout.preventNodeOverlap = serie.preventOverlap;
            var min = Infinity;
            var max = -Infinity;
            for (var i = 0; i < len; i++) {
                var gNode = graph.nodes[i];
                max = Math.max(gNode.layout.size, max);
                min = Math.min(gNode.layout.size, min);
            }
            var divider = max - min;
            for (var i = 0; i < len; i++) {
                var gNode = graph.nodes[i];
                if (divider > 0) {
                    gNode.layout.size = (gNode.layout.size - min) * (maxRadius - minRadius) / divider + minRadius;
                    gNode.layout.mass = gNode.layout.size / maxRadius;
                } else {
                    gNode.layout.size = (maxRadius - minRadius) / 2;
                    gNode.layout.mass = 0.5;
                }
            }
            for (var i = 0; i < len; i++) {
                var gNode = graph.nodes[i];
                if (typeof this.__nodePositionMap[gNode.id] !== 'undefined') {
                    gNode.layout.position = vec2.create();
                    vec2.copy(gNode.layout.position, this.__nodePositionMap[gNode.id]);
                } else if (typeof gNode.data.initial !== 'undefined') {
                    gNode.layout.position = vec2.create();
                    vec2.copy(gNode.layout.position, gNode.data.initial);
                } else {
                    var center = this._layout.center;
                    var size = Math.min(this._layout.width, this._layout.height);
                    gNode.layout.position = _randomInSquare(center[0], center[1], size * 0.8);
                }
                var style = gNode.shape.style;
                var radius = gNode.layout.size;
                style.width = style.width || radius * 2;
                style.height = style.height || radius * 2;
                style.x = -style.width / 2;
                style.y = -style.height / 2;
                vec2.copy(gNode.shape.position, gNode.layout.position);
            }
            len = graph.edges.length;
            max = -Infinity;
            for (var i = 0; i < len; i++) {
                var e = graph.edges[i];
                if (e.layout.weight > max) {
                    max = e.layout.weight;
                }
            }
            for (var i = 0; i < len; i++) {
                var e = graph.edges[i];
                e.layout.weight /= max;
            }
            this._layout.init(graph, serie.useWorker);
        },
        _buildNodeShapes: function (serie, serieIdx) {
            var graph = this._graph;
            var categories = this.query(serie, 'categories');
            graph.eachNode(function (node) {
                var category = this._getNodeCategory(serie, node.data);
                var queryTarget = [
                    node.data,
                    category,
                    serie
                ];
                var styleQueryTarget = this._getNodeQueryTarget(serie, node.data);
                var emphasisStyleQueryTarget = this._getNodeQueryTarget(serie, node.data, 'emphasis');
                var shape = new IconShape({
                    style: {
                        x: 0,
                        y: 0,
                        color: this.deepQuery(styleQueryTarget, 'color'),
                        brushType: 'both',
                        strokeColor: this.deepQuery(styleQueryTarget, 'strokeColor') || this.deepQuery(styleQueryTarget, 'borderColor'),
                        lineWidth: this.deepQuery(styleQueryTarget, 'lineWidth') || this.deepQuery(styleQueryTarget, 'borderWidth')
                    },
                    highlightStyle: {
                        color: this.deepQuery(emphasisStyleQueryTarget, 'color'),
                        strokeColor: this.deepQuery(emphasisStyleQueryTarget, 'strokeColor') || this.deepQuery(emphasisStyleQueryTarget, 'borderColor'),
                        lineWidth: this.deepQuery(emphasisStyleQueryTarget, 'lineWidth') || this.deepQuery(emphasisStyleQueryTarget, 'borderWidth')
                    },
                    clickable: serie.clickable,
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase()
                });
                if (!shape.style.color) {
                    shape.style.color = category ? this.getColor(category.name) : this.getColor(node.id);
                }
                shape.style.iconType = this.deepQuery(queryTarget, 'symbol');
                shape.style.width = shape.style.height = (this.deepQuery(queryTarget, 'symbolSize') || 0) * 2;
                if (shape.style.iconType.match('image')) {
                    shape.style.image = shape.style.iconType.replace(new RegExp('^image:\\/\\/'), '');
                    shape = new ImageShape({
                        style: shape.style,
                        highlightStyle: shape.highlightStyle,
                        clickable: shape.clickable,
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase()
                    });
                }
                if (this.deepQuery(queryTarget, 'itemStyle.normal.label.show')) {
                    shape.style.text = node.data.label == null ? node.id : node.data.label;
                    shape.style.textPosition = this.deepQuery(queryTarget, 'itemStyle.normal.label.position');
                    shape.style.textColor = this.deepQuery(queryTarget, 'itemStyle.normal.label.textStyle.color');
                    shape.style.textFont = this.getFont(this.deepQuery(queryTarget, 'itemStyle.normal.label.textStyle') || {});
                }
                if (this.deepQuery(queryTarget, 'itemStyle.emphasis.label.show')) {
                    shape.highlightStyle.textPosition = this.deepQuery(queryTarget, 'itemStyle.emphasis.label.position');
                    shape.highlightStyle.textColor = this.deepQuery(queryTarget, 'itemStyle.emphasis.label.textStyle.color');
                    shape.highlightStyle.textFont = this.getFont(this.deepQuery(queryTarget, 'itemStyle.emphasis.label.textStyle') || {});
                }
                if (this.deepQuery(queryTarget, 'draggable')) {
                    this.setCalculable(shape);
                    shape.dragEnableTime = 0;
                    shape.draggable = true;
                    shape.ondragstart = this.shapeHandler.ondragstart;
                    shape.ondragover = null;
                }
                var categoryName = '';
                if (typeof node.category !== 'undefined') {
                    var category = categories[node.category];
                    categoryName = category && category.name || '';
                }
                ecData.pack(shape, serie, serieIdx, node.data, node.rawIndex, node.data.name || '', node.category);
                this.shapeList.push(shape);
                this.zr.addShape(shape);
                node.shape = shape;
            }, this);
        },
        _buildLinkShapes: function (serie, serieIdx) {
            var graph = this._graph;
            var len = graph.edges.length;
            for (var i = 0; i < len; i++) {
                var gEdge = graph.edges[i];
                var link = gEdge.data;
                var source = gEdge.node1;
                var target = gEdge.node2;
                var queryTarget = this._getEdgeQueryTarget(serie, link);
                var linkType = this.deepQuery(queryTarget, 'type');
                if (serie.linkSymbol && serie.linkSymbol !== 'none') {
                    linkType = 'line';
                }
                var LinkShapeCtor = linkType === 'line' ? LineShape : BezierCurveShape;
                var linkShape = new LinkShapeCtor({
                    style: {
                        xStart: 0,
                        yStart: 0,
                        xEnd: 0,
                        yEnd: 0
                    },
                    clickable: this.query(serie, 'clickable'),
                    highlightStyle: {},
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase()
                });
                zrUtil.merge(linkShape.style, this.query(serie, 'itemStyle.normal.linkStyle'), true);
                zrUtil.merge(linkShape.highlightStyle, this.query(serie, 'itemStyle.emphasis.linkStyle'), true);
                if (typeof link.itemStyle !== 'undefined') {
                    if (link.itemStyle.normal) {
                        zrUtil.merge(linkShape.style, link.itemStyle.normal, true);
                    }
                    if (link.itemStyle.emphasis) {
                        zrUtil.merge(linkShape.highlightStyle, link.itemStyle.emphasis, true);
                    }
                }
                linkShape.style.lineWidth = linkShape.style.lineWidth || linkShape.style.width;
                linkShape.style.strokeColor = linkShape.style.strokeColor || linkShape.style.color;
                linkShape.highlightStyle.lineWidth = linkShape.highlightStyle.lineWidth || linkShape.highlightStyle.width;
                linkShape.highlightStyle.strokeColor = linkShape.highlightStyle.strokeColor || linkShape.highlightStyle.color;
                ecData.pack(linkShape, serie, serieIdx, gEdge.data, gEdge.rawIndex == null ? i : gEdge.rawIndex, gEdge.data.name || source.id + ' - ' + target.id, source.id, target.id);
                this.shapeList.push(linkShape);
                this.zr.addShape(linkShape);
                gEdge.shape = linkShape;
                if (serie.linkSymbol && serie.linkSymbol !== 'none') {
                    var symbolShape = new IconShape({
                        style: {
                            x: -5,
                            y: 0,
                            width: serie.linkSymbolSize[0],
                            height: serie.linkSymbolSize[1],
                            iconType: serie.linkSymbol,
                            brushType: 'fill',
                            color: linkShape.style.strokeColor
                        },
                        highlightStyle: { brushType: 'fill' },
                        position: [
                            0,
                            0
                        ],
                        rotation: 0
                    });
                    linkShape._symbolShape = symbolShape;
                    this.shapeList.push(symbolShape);
                    this.zr.addShape(symbolShape);
                }
            }
        },
        _updateLinkShapes: function () {
            var v = vec2.create();
            var edges = this._graph.edges;
            for (var i = 0, len = edges.length; i < len; i++) {
                var edge = edges[i];
                var sourceShape = edge.node1.shape;
                var targetShape = edge.node2.shape;
                var p1 = sourceShape.position;
                var p2 = targetShape.position;
                edge.shape.style.xStart = p1[0];
                edge.shape.style.yStart = p1[1];
                edge.shape.style.xEnd = p2[0];
                edge.shape.style.yEnd = p2[1];
                if (edge.shape.type === 'bezier-curve') {
                    edge.shape.style.cpX1 = (p1[0] + p2[0]) / 2 - (p2[1] - p1[1]) / 4;
                    edge.shape.style.cpY1 = (p1[1] + p2[1]) / 2 - (p1[0] - p2[0]) / 4;
                }
                edge.shape.modSelf();
                if (edge.shape._symbolShape) {
                    var symbolShape = edge.shape._symbolShape;
                    vec2.copy(symbolShape.position, targetShape.position);
                    vec2.sub(v, sourceShape.position, targetShape.position);
                    vec2.normalize(v, v);
                    vec2.scaleAndAdd(symbolShape.position, symbolShape.position, v, targetShape.style.width / 2 + 2);
                    var angle = Math.atan2(v[1], v[0]);
                    symbolShape.rotation = Math.PI / 2 - angle;
                    symbolShape.modSelf();
                }
            }
        },
        _syncNodePositions: function () {
            var graph = this._graph;
            for (var i = 0; i < graph.nodes.length; i++) {
                var gNode = graph.nodes[i];
                var position = gNode.layout.position;
                var node = gNode.data;
                var shape = gNode.shape;
                var fixX = shape.fixed || node.fixX;
                var fixY = shape.fixed || node.fixY;
                if (fixX === true) {
                    fixX = 1;
                } else if (isNaN(fixX)) {
                    fixX = 0;
                }
                if (fixY === true) {
                    fixY = 1;
                } else if (isNaN(fixY)) {
                    fixY = 0;
                }
                shape.position[0] += (position[0] - shape.position[0]) * (1 - fixX);
                shape.position[1] += (position[1] - shape.position[1]) * (1 - fixY);
                vec2.copy(position, shape.position);
                var nodeName = node.name;
                if (nodeName) {
                    var gPos = this.__nodePositionMap[nodeName];
                    if (!gPos) {
                        gPos = this.__nodePositionMap[nodeName] = vec2.create();
                    }
                    vec2.copy(gPos, position);
                }
                shape.modSelf();
            }
        },
        _step: function (e) {
            this._syncNodePositions();
            this._updateLinkShapes();
            this.zr.refreshNextFrame();
            if (this._layout.temperature > 0.01) {
                this._layout.step(this._steps);
            } else {
                this.messageCenter.dispatch(ecConfig.EVENT.FORCE_LAYOUT_END, {}, {}, this.myChart);
            }
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = this.option.series;
            }
            this.legend = this.component.legend;
            if (this.legend) {
                this.getColor = function (param) {
                    return this.legend.getColor(param);
                };
                this.isSelected = function (param) {
                    return this.legend.isSelected(param);
                };
            } else {
                var colorMap = {};
                var count = 0;
                this.getColor = function (key) {
                    if (colorMap[key]) {
                        return colorMap[key];
                    }
                    if (!colorMap[key]) {
                        colorMap[key] = this.zr.getColor(count++);
                    }
                    return colorMap[key];
                };
                this.isSelected = function () {
                    return true;
                };
            }
            this._init();
        },
        dispose: function () {
            this.clear();
            this.shapeList = null;
            this.effectList = null;
            this._layout.dispose();
            this._layout = null;
            this.__nodePositionMap = {};
        },
        getPosition: function () {
            var position = [];
            this._graph.eachNode(function (n) {
                if (n.layout) {
                    position.push({
                        name: n.data.name,
                        position: Array.prototype.slice.call(n.layout.position)
                    });
                }
            });
            return position;
        }
    };
    function ondragstart(param) {
        if (!this.isDragstart || !param.target) {
            return;
        }
        var shape = param.target;
        shape.fixed = true;
        this.isDragstart = false;
        this.zr.on(zrConfig.EVENT.MOUSEMOVE, this.onmousemove);
    }
    function onmousemove() {
        this._layout.temperature = 0.8;
        this._step();
    }
    function ondragend(param, status) {
        if (!this.isDragend || !param.target) {
            return;
        }
        var shape = param.target;
        shape.fixed = false;
        status.dragIn = true;
        status.needRefresh = false;
        this.isDragend = false;
        this.zr.un(zrConfig.EVENT.MOUSEMOVE, this.onmousemove);
    }
    function _randomInSquare(x, y, size) {
        var v = vec2.create();
        v[0] = (Math.random() - 0.5) * size + x;
        v[1] = (Math.random() - 0.5) * size + y;
        return v;
    }
    zrUtil.inherits(Force, ChartBase);
    require('../chart').define('force', Force);
    return Force;
});define('echarts/data/Graph', [
    'require',
    'zrender/tool/util'
], function (require) {
    var util = require('zrender/tool/util');
    'use strict';
    var Graph = function (directed) {
        this._directed = directed || false;
        this.nodes = [];
        this.edges = [];
        this._nodesMap = {};
        this._edgesMap = {};
    };
    Graph.prototype.isDirected = function () {
        return this._directed;
    };
    Graph.prototype.addNode = function (id, data) {
        if (this._nodesMap[id]) {
            return this._nodesMap[id];
        }
        var node = new Graph.Node(id, data);
        this.nodes.push(node);
        this._nodesMap[id] = node;
        return node;
    };
    Graph.prototype.getNodeById = function (id) {
        return this._nodesMap[id];
    };
    Graph.prototype.addEdge = function (n1, n2, data) {
        if (typeof n1 == 'string') {
            n1 = this._nodesMap[n1];
        }
        if (typeof n2 == 'string') {
            n2 = this._nodesMap[n2];
        }
        if (!n1 || !n2) {
            return;
        }
        var key = n1.id + '-' + n2.id;
        if (this._edgesMap[key]) {
            return this._edgesMap[key];
        }
        var edge = new Graph.Edge(n1, n2, data);
        if (this._directed) {
            n1.outEdges.push(edge);
            n2.inEdges.push(edge);
        }
        n1.edges.push(edge);
        if (n1 !== n2) {
            n2.edges.push(edge);
        }
        this.edges.push(edge);
        this._edgesMap[key] = edge;
        return edge;
    };
    Graph.prototype.removeEdge = function (edge) {
        var n1 = edge.node1;
        var n2 = edge.node2;
        var key = n1.id + '-' + n2.id;
        if (this._directed) {
            n1.outEdges.splice(util.indexOf(n1.outEdges, edge), 1);
            n2.inEdges.splice(util.indexOf(n2.inEdges, edge), 1);
        }
        n1.edges.splice(util.indexOf(n1.edges, edge), 1);
        if (n1 !== n2) {
            n2.edges.splice(util.indexOf(n2.edges, edge), 1);
        }
        delete this._edgesMap[key];
        this.edges.splice(util.indexOf(this.edges, edge), 1);
    };
    Graph.prototype.getEdge = function (n1, n2) {
        if (typeof n1 !== 'string') {
            n1 = n1.id;
        }
        if (typeof n2 !== 'string') {
            n2 = n2.id;
        }
        if (this._directed) {
            return this._edgesMap[n1 + '-' + n2];
        } else {
            return this._edgesMap[n1 + '-' + n2] || this._edgesMap[n2 + '-' + n1];
        }
    };
    Graph.prototype.removeNode = function (node) {
        if (typeof node === 'string') {
            node = this._nodesMap[node];
            if (!node) {
                return;
            }
        }
        delete this._nodesMap[node.id];
        this.nodes.splice(util.indexOf(this.nodes, node), 1);
        for (var i = 0; i < this.edges.length;) {
            var edge = this.edges[i];
            if (edge.node1 === node || edge.node2 === node) {
                this.removeEdge(edge);
            } else {
                i++;
            }
        }
    };
    Graph.prototype.filterNode = function (cb, context) {
        var len = this.nodes.length;
        for (var i = 0; i < len;) {
            if (cb.call(context, this.nodes[i], i)) {
                i++;
            } else {
                this.removeNode(this.nodes[i]);
                len--;
            }
        }
    };
    Graph.prototype.filterEdge = function (cb, context) {
        var len = this.edges.length;
        for (var i = 0; i < len;) {
            if (cb.call(context, this.edges[i], i)) {
                i++;
            } else {
                this.removeEdge(this.edges[i]);
                len--;
            }
        }
    };
    Graph.prototype.eachNode = function (cb, context) {
        var len = this.nodes.length;
        for (var i = 0; i < len; i++) {
            if (this.nodes[i]) {
                cb.call(context, this.nodes[i], i);
            }
        }
    };
    Graph.prototype.eachEdge = function (cb, context) {
        var len = this.edges.length;
        for (var i = 0; i < len; i++) {
            if (this.edges[i]) {
                cb.call(context, this.edges[i], i);
            }
        }
    };
    Graph.prototype.clear = function () {
        this.nodes.length = 0;
        this.edges.length = 0;
        this._nodesMap = {};
        this._edgesMap = {};
    };
    Graph.prototype.breadthFirstTraverse = function (cb, startNode, direction, context) {
        if (typeof startNode === 'string') {
            startNode = this._nodesMap[startNode];
        }
        if (!startNode) {
            return;
        }
        var edgeType = 'edges';
        if (direction === 'out') {
            edgeType = 'outEdges';
        } else if (direction === 'in') {
            edgeType = 'inEdges';
        }
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].__visited = false;
        }
        if (cb.call(context, startNode, null)) {
            return;
        }
        var queue = [startNode];
        while (queue.length) {
            var currentNode = queue.shift();
            var edges = currentNode[edgeType];
            for (var i = 0; i < edges.length; i++) {
                var e = edges[i];
                var otherNode = e.node1 === currentNode ? e.node2 : e.node1;
                if (!otherNode.__visited) {
                    if (cb.call(otherNode, otherNode, currentNode)) {
                        return;
                    }
                    queue.push(otherNode);
                    otherNode.__visited = true;
                }
            }
        }
    };
    Graph.prototype.clone = function () {
        var graph = new Graph(this._directed);
        for (var i = 0; i < this.nodes.length; i++) {
            graph.addNode(this.nodes[i].id, this.nodes[i].data);
        }
        for (var i = 0; i < this.edges.length; i++) {
            var e = this.edges[i];
            graph.addEdge(e.node1.id, e.node2.id, e.data);
        }
        return graph;
    };
    var Node = function (id, data) {
        this.id = id;
        this.data = data || null;
        this.inEdges = [];
        this.outEdges = [];
        this.edges = [];
    };
    Node.prototype.degree = function () {
        return this.edges.length;
    };
    Node.prototype.inDegree = function () {
        return this.inEdges.length;
    };
    Node.prototype.outDegree = function () {
        return this.outEdges.length;
    };
    var Edge = function (node1, node2, data) {
        this.node1 = node1;
        this.node2 = node2;
        this.data = data || null;
    };
    Graph.Node = Node;
    Graph.Edge = Edge;
    Graph.fromMatrix = function (nodesData, matrix, directed) {
        if (!matrix || !matrix.length || matrix[0].length !== matrix.length || nodesData.length !== matrix.length) {
            return;
        }
        var size = matrix.length;
        var graph = new Graph(directed);
        for (var i = 0; i < size; i++) {
            var node = graph.addNode(nodesData[i].id, nodesData[i]);
            node.data.value = 0;
            if (directed) {
                node.data.outValue = node.data.inValue = 0;
            }
        }
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                var item = matrix[i][j];
                if (directed) {
                    graph.nodes[i].data.outValue += item;
                    graph.nodes[j].data.inValue += item;
                }
                graph.nodes[i].data.value += item;
                graph.nodes[j].data.value += item;
            }
        }
        for (var i = 0; i < size; i++) {
            for (var j = i; j < size; j++) {
                var item = matrix[i][j];
                if (item === 0) {
                    continue;
                }
                var n1 = graph.nodes[i];
                var n2 = graph.nodes[j];
                var edge = graph.addEdge(n1, n2, {});
                edge.data.weight = item;
                if (i !== j) {
                    if (directed && matrix[j][i]) {
                        var inEdge = graph.addEdge(n2, n1, {});
                        inEdge.data.weight = matrix[j][i];
                    }
                }
            }
        }
        return graph;
    };
    return Graph;
});define('echarts/layout/Force', [
    'require',
    './forceLayoutWorker',
    'zrender/tool/vector'
], function (require) {
    var ForceLayoutWorker = require('./forceLayoutWorker');
    var vec2 = require('zrender/tool/vector');
    var requestAnimationFrame = window.requestAnimationFrame || window.msRequestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || function (func) {
        setTimeout(func, 16);
    };
    var ArrayCtor = typeof Float32Array == 'undefined' ? Array : Float32Array;
    var workerUrl;
    function createWorkerUrl() {
        if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
            try {
                var blob = new Blob([ForceLayoutWorker.getWorkerCode()]);
                workerUrl = window.URL.createObjectURL(blob);
            } catch (e) {
                workerUrl = '';
            }
        }
        return workerUrl;
    }
    var ForceLayout = function (opts) {
        if (typeof workerUrl === 'undefined') {
            createWorkerUrl();
        }
        opts = opts || {};
        this.width = opts.width || 500;
        this.height = opts.height || 500;
        this.center = opts.center || [
            this.width / 2,
            this.height / 2
        ];
        this.ratioScaling = opts.ratioScaling || false;
        this.scaling = opts.scaling || 1;
        this.gravity = typeof opts.gravity !== 'undefined' ? opts.gravity : 1;
        this.large = opts.large || false;
        this.preventNodeOverlap = opts.preventNodeOverlap || false;
        this.preventNodeEdgeOverlap = opts.preventNodeEdgeOverlap || false;
        this.maxSpeedIncrease = opts.maxSpeedIncrease || 1;
        this.onupdate = opts.onupdate || function () {
        };
        this.temperature = opts.temperature || 1;
        this.coolDown = opts.coolDown || 0.99;
        this._layout = null;
        this._layoutWorker = null;
        var self = this;
        var _$onupdate = this._$onupdate;
        this._$onupdate = function (e) {
            _$onupdate.call(self, e);
        };
    };
    ForceLayout.prototype.updateConfig = function () {
        var width = this.width;
        var height = this.height;
        var size = Math.min(width, height);
        var config = {
            center: this.center,
            width: this.ratioScaling ? width : size,
            height: this.ratioScaling ? height : size,
            scaling: this.scaling || 1,
            gravity: this.gravity || 1,
            barnesHutOptimize: this.large,
            preventNodeOverlap: this.preventNodeOverlap,
            preventNodeEdgeOverlap: this.preventNodeEdgeOverlap,
            maxSpeedIncrease: this.maxSpeedIncrease
        };
        if (this._layoutWorker) {
            this._layoutWorker.postMessage({
                cmd: 'updateConfig',
                config: config
            });
        } else {
            for (var name in config) {
                this._layout[name] = config[name];
            }
        }
    };
    ForceLayout.prototype.init = function (graph, useWorker) {
        if (workerUrl && useWorker) {
            try {
                if (!this._layoutWorker) {
                    this._layoutWorker = new Worker(workerUrl);
                    this._layoutWorker.onmessage = this._$onupdate;
                }
                this._layout = null;
            } catch (e) {
                this._layoutWorker = null;
                if (!this._layout) {
                    this._layout = new ForceLayoutWorker();
                }
            }
        } else {
            if (!this._layout) {
                this._layout = new ForceLayoutWorker();
            }
            if (this._layoutWorker) {
                this._layoutWorker.terminate();
                this._layoutWorker = null;
            }
        }
        this.temperature = 1;
        this.graph = graph;
        var len = graph.nodes.length;
        var positionArr = new ArrayCtor(len * 2);
        var massArr = new ArrayCtor(len);
        var sizeArr = new ArrayCtor(len);
        for (var i = 0; i < len; i++) {
            var n = graph.nodes[i];
            positionArr[i * 2] = n.layout.position[0];
            positionArr[i * 2 + 1] = n.layout.position[1];
            massArr[i] = typeof n.layout.mass === 'undefined' ? 1 : n.layout.mass;
            sizeArr[i] = typeof n.layout.size === 'undefined' ? 1 : n.layout.size;
            n.layout.__index = i;
        }
        len = graph.edges.length;
        var edgeArr = new ArrayCtor(len * 2);
        var edgeWeightArr = new ArrayCtor(len);
        for (var i = 0; i < len; i++) {
            var edge = graph.edges[i];
            edgeArr[i * 2] = edge.node1.layout.__index;
            edgeArr[i * 2 + 1] = edge.node2.layout.__index;
            edgeWeightArr[i] = edge.layout.weight || 1;
        }
        if (this._layoutWorker) {
            this._layoutWorker.postMessage({
                cmd: 'init',
                nodesPosition: positionArr,
                nodesMass: massArr,
                nodesSize: sizeArr,
                edges: edgeArr,
                edgesWeight: edgeWeightArr
            });
        } else {
            this._layout.initNodes(positionArr, massArr, sizeArr);
            this._layout.initEdges(edgeArr, edgeWeightArr);
        }
        this.updateConfig();
    };
    ForceLayout.prototype.step = function (steps) {
        var nodes = this.graph.nodes;
        if (this._layoutWorker) {
            var positionArr = new ArrayCtor(nodes.length * 2);
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                positionArr[i * 2] = n.layout.position[0];
                positionArr[i * 2 + 1] = n.layout.position[1];
            }
            this._layoutWorker.postMessage(positionArr.buffer, [positionArr.buffer]);
            this._layoutWorker.postMessage({
                cmd: 'update',
                steps: steps,
                temperature: this.temperature,
                coolDown: this.coolDown
            });
            for (var i = 0; i < steps; i++) {
                this.temperature *= this.coolDown;
            }
        } else {
            requestAnimationFrame(this._$onupdate);
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                vec2.copy(this._layout.nodes[i].position, n.layout.position);
            }
            for (var i = 0; i < steps; i++) {
                this._layout.temperature = this.temperature;
                this._layout.update();
                this.temperature *= this.coolDown;
            }
        }
    };
    ForceLayout.prototype._$onupdate = function (e) {
        if (this._layoutWorker) {
            var positionArr = new Float32Array(e.data);
            for (var i = 0; i < this.graph.nodes.length; i++) {
                var n = this.graph.nodes[i];
                n.layout.position[0] = positionArr[i * 2];
                n.layout.position[1] = positionArr[i * 2 + 1];
            }
            this.onupdate && this.onupdate();
        } else if (this._layout) {
            for (var i = 0; i < this.graph.nodes.length; i++) {
                var n = this.graph.nodes[i];
                vec2.copy(n.layout.position, this._layout.nodes[i].position);
            }
            this.onupdate && this.onupdate();
        }
    };
    ForceLayout.prototype.dispose = function () {
        if (this._layoutWorker) {
            this._layoutWorker.terminate();
        }
        this._layoutWorker = null;
        this._layout = null;
    };
    return ForceLayout;
});define('zrender/shape/BezierCurve', [
    'require',
    './Base',
    '../tool/util'
], function (require) {
    'use strict';
    var Base = require('./Base');
    var BezierCurve = function (options) {
        this.brushTypeOnly = 'stroke';
        this.textPosition = 'end';
        Base.call(this, options);
    };
    BezierCurve.prototype = {
        type: 'bezier-curve',
        buildPath: function (ctx, style) {
            ctx.moveTo(style.xStart, style.yStart);
            if (typeof style.cpX2 != 'undefined' && typeof style.cpY2 != 'undefined') {
                ctx.bezierCurveTo(style.cpX1, style.cpY1, style.cpX2, style.cpY2, style.xEnd, style.yEnd);
            } else {
                ctx.quadraticCurveTo(style.cpX1, style.cpY1, style.xEnd, style.yEnd);
            }
        },
        getRect: function (style) {
            if (style.__rect) {
                return style.__rect;
            }
            var _minX = Math.min(style.xStart, style.xEnd, style.cpX1);
            var _minY = Math.min(style.yStart, style.yEnd, style.cpY1);
            var _maxX = Math.max(style.xStart, style.xEnd, style.cpX1);
            var _maxY = Math.max(style.yStart, style.yEnd, style.cpY1);
            var _x2 = style.cpX2;
            var _y2 = style.cpY2;
            if (typeof _x2 != 'undefined' && typeof _y2 != 'undefined') {
                _minX = Math.min(_minX, _x2);
                _minY = Math.min(_minY, _y2);
                _maxX = Math.max(_maxX, _x2);
                _maxY = Math.max(_maxY, _y2);
            }
            var lineWidth = style.lineWidth || 1;
            style.__rect = {
                x: _minX - lineWidth,
                y: _minY - lineWidth,
                width: _maxX - _minX + lineWidth,
                height: _maxY - _minY + lineWidth
            };
            return style.__rect;
        }
    };
    require('../tool/util').inherits(BezierCurve, Base);
    return BezierCurve;
});define('echarts/layout/forceLayoutWorker', [
    'require',
    'zrender/tool/vector'
], function __echartsForceLayoutWorker(require) {
    'use strict';
    var vec2;
    var inWorker = typeof window === 'undefined' && typeof require === 'undefined';
    if (inWorker) {
        vec2 = {
            create: function (x, y) {
                var out = new Float32Array(2);
                out[0] = x || 0;
                out[1] = y || 0;
                return out;
            },
            dist: function (a, b) {
                var x = b[0] - a[0];
                var y = b[1] - a[1];
                return Math.sqrt(x * x + y * y);
            },
            len: function (a) {
                var x = a[0];
                var y = a[1];
                return Math.sqrt(x * x + y * y);
            },
            scaleAndAdd: function (out, a, b, scale) {
                out[0] = a[0] + b[0] * scale;
                out[1] = a[1] + b[1] * scale;
                return out;
            },
            scale: function (out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                return out;
            },
            add: function (out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                return out;
            },
            sub: function (out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                return out;
            },
            dot: function (v1, v2) {
                return v1[0] * v2[0] + v1[1] * v2[1];
            },
            normalize: function (out, a) {
                var x = a[0];
                var y = a[1];
                var len = x * x + y * y;
                if (len > 0) {
                    len = 1 / Math.sqrt(len);
                    out[0] = a[0] * len;
                    out[1] = a[1] * len;
                }
                return out;
            },
            negate: function (out, a) {
                out[0] = -a[0];
                out[1] = -a[1];
                return out;
            },
            copy: function (out, a) {
                out[0] = a[0];
                out[1] = a[1];
                return out;
            },
            set: function (out, x, y) {
                out[0] = x;
                out[1] = y;
                return out;
            }
        };
    } else {
        vec2 = require('zrender/tool/vector');
    }
    var ArrayCtor = typeof Float32Array == 'undefined' ? Array : Float32Array;
    function Region() {
        this.subRegions = [];
        this.nSubRegions = 0;
        this.node = null;
        this.mass = 0;
        this.centerOfMass = null;
        this.bbox = new ArrayCtor(4);
        this.size = 0;
    }
    Region.prototype.beforeUpdate = function () {
        for (var i = 0; i < this.nSubRegions; i++) {
            this.subRegions[i].beforeUpdate();
        }
        this.mass = 0;
        if (this.centerOfMass) {
            this.centerOfMass[0] = 0;
            this.centerOfMass[1] = 0;
        }
        this.nSubRegions = 0;
        this.node = null;
    };
    Region.prototype.afterUpdate = function () {
        this.subRegions.length = this.nSubRegions;
        for (var i = 0; i < this.nSubRegions; i++) {
            this.subRegions[i].afterUpdate();
        }
    };
    Region.prototype.addNode = function (node) {
        if (this.nSubRegions === 0) {
            if (this.node == null) {
                this.node = node;
                return;
            } else {
                this._addNodeToSubRegion(this.node);
                this.node = null;
            }
        }
        this._addNodeToSubRegion(node);
        this._updateCenterOfMass(node);
    };
    Region.prototype.findSubRegion = function (x, y) {
        for (var i = 0; i < this.nSubRegions; i++) {
            var region = this.subRegions[i];
            if (region.contain(x, y)) {
                return region;
            }
        }
    };
    Region.prototype.contain = function (x, y) {
        return this.bbox[0] <= x && this.bbox[2] >= x && this.bbox[1] <= y && this.bbox[3] >= y;
    };
    Region.prototype.setBBox = function (minX, minY, maxX, maxY) {
        this.bbox[0] = minX;
        this.bbox[1] = minY;
        this.bbox[2] = maxX;
        this.bbox[3] = maxY;
        this.size = (maxX - minX + maxY - minY) / 2;
    };
    Region.prototype._newSubRegion = function () {
        var subRegion = this.subRegions[this.nSubRegions];
        if (!subRegion) {
            subRegion = new Region();
            this.subRegions[this.nSubRegions] = subRegion;
        }
        this.nSubRegions++;
        return subRegion;
    };
    Region.prototype._addNodeToSubRegion = function (node) {
        var subRegion = this.findSubRegion(node.position[0], node.position[1]);
        var bbox = this.bbox;
        if (!subRegion) {
            var cx = (bbox[0] + bbox[2]) / 2;
            var cy = (bbox[1] + bbox[3]) / 2;
            var w = (bbox[2] - bbox[0]) / 2;
            var h = (bbox[3] - bbox[1]) / 2;
            var xi = node.position[0] >= cx ? 1 : 0;
            var yi = node.position[1] >= cy ? 1 : 0;
            var subRegion = this._newSubRegion();
            subRegion.setBBox(xi * w + bbox[0], yi * h + bbox[1], (xi + 1) * w + bbox[0], (yi + 1) * h + bbox[1]);
        }
        subRegion.addNode(node);
    };
    Region.prototype._updateCenterOfMass = function (node) {
        if (this.centerOfMass == null) {
            this.centerOfMass = vec2.create();
        }
        var x = this.centerOfMass[0] * this.mass;
        var y = this.centerOfMass[1] * this.mass;
        x += node.position[0] * node.mass;
        y += node.position[1] * node.mass;
        this.mass += node.mass;
        this.centerOfMass[0] = x / this.mass;
        this.centerOfMass[1] = y / this.mass;
    };
    function GraphNode() {
        this.position = vec2.create();
        this.force = vec2.create();
        this.forcePrev = vec2.create();
        this.speed = vec2.create();
        this.speedPrev = vec2.create();
        this.mass = 1;
        this.inDegree = 0;
        this.outDegree = 0;
    }
    function GraphEdge(node1, node2) {
        this.node1 = node1;
        this.node2 = node2;
        this.weight = 1;
    }
    function ForceLayout() {
        this.barnesHutOptimize = false;
        this.barnesHutTheta = 1.5;
        this.repulsionByDegree = false;
        this.preventNodeOverlap = false;
        this.preventNodeEdgeOverlap = false;
        this.strongGravity = true;
        this.gravity = 1;
        this.scaling = 1;
        this.edgeWeightInfluence = 1;
        this.center = [
            0,
            0
        ];
        this.width = 500;
        this.height = 500;
        this.maxSpeedIncrease = 1;
        this.nodes = [];
        this.edges = [];
        this.bbox = new ArrayCtor(4);
        this._rootRegion = new Region();
        this._rootRegion.centerOfMass = vec2.create();
        this._massArr = null;
        this._k = 0;
    }
    ForceLayout.prototype.nodeToNodeRepulsionFactor = function (mass, d, k) {
        return k * k * mass / d;
    };
    ForceLayout.prototype.edgeToNodeRepulsionFactor = function (mass, d, k) {
        return k * mass / d;
    };
    ForceLayout.prototype.attractionFactor = function (w, d, k) {
        return w * d / k;
    };
    ForceLayout.prototype.initNodes = function (positionArr, massArr, sizeArr) {
        this.temperature = 1;
        var nNodes = positionArr.length / 2;
        this.nodes.length = 0;
        var haveSize = typeof sizeArr !== 'undefined';
        for (var i = 0; i < nNodes; i++) {
            var node = new GraphNode();
            node.position[0] = positionArr[i * 2];
            node.position[1] = positionArr[i * 2 + 1];
            node.mass = massArr[i];
            if (haveSize) {
                node.size = sizeArr[i];
            }
            this.nodes.push(node);
        }
        this._massArr = massArr;
        if (haveSize) {
            this._sizeArr = sizeArr;
        }
    };
    ForceLayout.prototype.initEdges = function (edgeArr, edgeWeightArr) {
        var nEdges = edgeArr.length / 2;
        this.edges.length = 0;
        var edgeHaveWeight = typeof edgeWeightArr !== 'undefined';
        for (var i = 0; i < nEdges; i++) {
            var sIdx = edgeArr[i * 2];
            var tIdx = edgeArr[i * 2 + 1];
            var sNode = this.nodes[sIdx];
            var tNode = this.nodes[tIdx];
            if (!sNode || !tNode) {
                continue;
            }
            sNode.outDegree++;
            tNode.inDegree++;
            var edge = new GraphEdge(sNode, tNode);
            if (edgeHaveWeight) {
                edge.weight = edgeWeightArr[i];
            }
            this.edges.push(edge);
        }
    };
    ForceLayout.prototype.update = function () {
        var nNodes = this.nodes.length;
        this.updateBBox();
        this._k = 0.4 * this.scaling * Math.sqrt(this.width * this.height / nNodes);
        if (this.barnesHutOptimize) {
            this._rootRegion.setBBox(this.bbox[0], this.bbox[1], this.bbox[2], this.bbox[3]);
            this._rootRegion.beforeUpdate();
            for (var i = 0; i < nNodes; i++) {
                this._rootRegion.addNode(this.nodes[i]);
            }
            this._rootRegion.afterUpdate();
        } else {
            var mass = 0;
            var centerOfMass = this._rootRegion.centerOfMass;
            vec2.set(centerOfMass, 0, 0);
            for (var i = 0; i < nNodes; i++) {
                var node = this.nodes[i];
                mass += node.mass;
                vec2.scaleAndAdd(centerOfMass, centerOfMass, node.position, node.mass);
            }
            if (mass > 0) {
                vec2.scale(centerOfMass, centerOfMass, 1 / mass);
            }
        }
        this.updateForce();
        this.updatePosition();
    };
    ForceLayout.prototype.updateForce = function () {
        var nNodes = this.nodes.length;
        for (var i = 0; i < nNodes; i++) {
            var node = this.nodes[i];
            vec2.copy(node.forcePrev, node.force);
            vec2.copy(node.speedPrev, node.speed);
            vec2.set(node.force, 0, 0);
        }
        this.updateNodeNodeForce();
        if (this.gravity > 0) {
            this.updateGravityForce();
        }
        this.updateEdgeForce();
        if (this.preventNodeEdgeOverlap) {
            this.updateNodeEdgeForce();
        }
    };
    ForceLayout.prototype.updatePosition = function () {
        var nNodes = this.nodes.length;
        var v = vec2.create();
        for (var i = 0; i < nNodes; i++) {
            var node = this.nodes[i];
            var speed = node.speed;
            vec2.scale(node.force, node.force, 1 / 30);
            var df = vec2.len(node.force) + 0.1;
            var scale = Math.min(df, 500) / df;
            vec2.scale(node.force, node.force, scale);
            vec2.add(speed, speed, node.force);
            vec2.scale(speed, speed, this.temperature);
            vec2.sub(v, speed, node.speedPrev);
            var swing = vec2.len(v);
            if (swing > 0) {
                vec2.scale(v, v, 1 / swing);
                var base = vec2.len(node.speedPrev);
                if (base > 0) {
                    swing = Math.min(swing / base, this.maxSpeedIncrease) * base;
                    vec2.scaleAndAdd(speed, node.speedPrev, v, swing);
                }
            }
            var ds = vec2.len(speed);
            var scale = Math.min(ds, 100) / (ds + 0.1);
            vec2.scale(speed, speed, scale);
            vec2.add(node.position, node.position, speed);
        }
    };
    ForceLayout.prototype.updateNodeNodeForce = function () {
        var nNodes = this.nodes.length;
        for (var i = 0; i < nNodes; i++) {
            var na = this.nodes[i];
            if (this.barnesHutOptimize) {
                this.applyRegionToNodeRepulsion(this._rootRegion, na);
            } else {
                for (var j = i + 1; j < nNodes; j++) {
                    var nb = this.nodes[j];
                    this.applyNodeToNodeRepulsion(na, nb, false);
                }
            }
        }
    };
    ForceLayout.prototype.updateGravityForce = function () {
        for (var i = 0; i < this.nodes.length; i++) {
            this.applyNodeGravity(this.nodes[i]);
        }
    };
    ForceLayout.prototype.updateEdgeForce = function () {
        for (var i = 0; i < this.edges.length; i++) {
            this.applyEdgeAttraction(this.edges[i]);
        }
    };
    ForceLayout.prototype.updateNodeEdgeForce = function () {
        for (var i = 0; i < this.nodes.length; i++) {
            for (var j = 0; j < this.edges.length; j++) {
                this.applyEdgeToNodeRepulsion(this.edges[j], this.nodes[i]);
            }
        }
    };
    ForceLayout.prototype.applyRegionToNodeRepulsion = function () {
        var v = vec2.create();
        return function applyRegionToNodeRepulsion(region, node) {
            if (region.node) {
                this.applyNodeToNodeRepulsion(region.node, node, true);
            } else {
                if (region.mass === 0 && node.mass === 0) {
                    return;
                }
                vec2.sub(v, node.position, region.centerOfMass);
                var d2 = v[0] * v[0] + v[1] * v[1];
                if (d2 > this.barnesHutTheta * region.size * region.size) {
                    var factor = this._k * this._k * (node.mass + region.mass) / (d2 + 1);
                    vec2.scaleAndAdd(node.force, node.force, v, factor * 2);
                } else {
                    for (var i = 0; i < region.nSubRegions; i++) {
                        this.applyRegionToNodeRepulsion(region.subRegions[i], node);
                    }
                }
            }
        };
    }();
    ForceLayout.prototype.applyNodeToNodeRepulsion = function () {
        var v = vec2.create();
        return function applyNodeToNodeRepulsion(na, nb, oneWay) {
            if (na === nb) {
                return;
            }
            if (na.mass === 0 && nb.mass === 0) {
                return;
            }
            vec2.sub(v, na.position, nb.position);
            var d2 = v[0] * v[0] + v[1] * v[1];
            if (d2 === 0) {
                return;
            }
            var factor;
            var mass = na.mass + nb.mass;
            var d = Math.sqrt(d2);
            vec2.scale(v, v, 1 / d);
            if (this.preventNodeOverlap) {
                d = d - na.size - nb.size;
                if (d > 0) {
                    factor = this.nodeToNodeRepulsionFactor(mass, d, this._k);
                } else if (d <= 0) {
                    factor = this._k * this._k * 10 * mass;
                }
            } else {
                factor = this.nodeToNodeRepulsionFactor(mass, d, this._k);
            }
            if (!oneWay) {
                vec2.scaleAndAdd(na.force, na.force, v, factor * 2);
            }
            vec2.scaleAndAdd(nb.force, nb.force, v, -factor * 2);
        };
    }();
    ForceLayout.prototype.applyEdgeAttraction = function () {
        var v = vec2.create();
        return function applyEdgeAttraction(edge) {
            var na = edge.node1;
            var nb = edge.node2;
            vec2.sub(v, na.position, nb.position);
            var d = vec2.len(v);
            var w;
            if (this.edgeWeightInfluence === 0) {
                w = 1;
            } else if (this.edgeWeightInfluence == 1) {
                w = edge.weight;
            } else {
                w = Math.pow(edge.weight, this.edgeWeightInfluence);
            }
            var factor;
            if (this.preventOverlap) {
                d = d - na.size - nb.size;
                if (d <= 0) {
                    return;
                }
            }
            var factor = this.attractionFactor(w, d, this._k);
            vec2.scaleAndAdd(na.force, na.force, v, -factor);
            vec2.scaleAndAdd(nb.force, nb.force, v, factor);
        };
    }();
    ForceLayout.prototype.applyNodeGravity = function () {
        var v = vec2.create();
        return function (node) {
            vec2.sub(v, this.center, node.position);
            if (this.width > this.height) {
                v[1] *= this.width / this.height;
            } else {
                v[0] *= this.height / this.width;
            }
            var d = vec2.len(v) / 100;
            if (this.strongGravity) {
                vec2.scaleAndAdd(node.force, node.force, v, d * this.gravity * node.mass);
            } else {
                vec2.scaleAndAdd(node.force, node.force, v, this.gravity * node.mass / (d + 1));
            }
        };
    }();
    ForceLayout.prototype.applyEdgeToNodeRepulsion = function () {
        var v12 = vec2.create();
        var v13 = vec2.create();
        var p = vec2.create();
        return function (e, n3) {
            var n1 = e.node1;
            var n2 = e.node2;
            if (n1 === n3 || n2 === n3) {
                return;
            }
            vec2.sub(v12, n2.position, n1.position);
            vec2.sub(v13, n3.position, n1.position);
            var len12 = vec2.len(v12);
            vec2.scale(v12, v12, 1 / len12);
            var len = vec2.dot(v12, v13);
            if (len < 0 || len > len12) {
                return;
            }
            vec2.scaleAndAdd(p, n1.position, v12, len);
            var dist = vec2.dist(p, n3.position) - n3.size;
            var factor = this.edgeToNodeRepulsionFactor(n3.mass, Math.max(dist, 0.1), 100);
            vec2.sub(v12, n3.position, p);
            vec2.normalize(v12, v12);
            vec2.scaleAndAdd(n3.force, n3.force, v12, factor);
            vec2.scaleAndAdd(n1.force, n1.force, v12, -factor);
            vec2.scaleAndAdd(n2.force, n2.force, v12, -factor);
        };
    }();
    ForceLayout.prototype.updateBBox = function () {
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        for (var i = 0; i < this.nodes.length; i++) {
            var pos = this.nodes[i].position;
            minX = Math.min(minX, pos[0]);
            minY = Math.min(minY, pos[1]);
            maxX = Math.max(maxX, pos[0]);
            maxY = Math.max(maxY, pos[1]);
        }
        this.bbox[0] = minX;
        this.bbox[1] = minY;
        this.bbox[2] = maxX;
        this.bbox[3] = maxY;
    };
    ForceLayout.getWorkerCode = function () {
        var str = __echartsForceLayoutWorker.toString();
        return str.slice(str.indexOf('{') + 1, str.lastIndexOf('return'));
    };
    if (inWorker) {
        var forceLayout = null;
        self.onmessage = function (e) {
            if (e.data instanceof ArrayBuffer) {
                if (!forceLayout)
                    return;
                var positionArr = new Float32Array(e.data);
                var nNodes = positionArr.length / 2;
                for (var i = 0; i < nNodes; i++) {
                    var node = forceLayout.nodes[i];
                    node.position[0] = positionArr[i * 2];
                    node.position[1] = positionArr[i * 2 + 1];
                }
                return;
            }
            switch (e.data.cmd) {
            case 'init':
                if (!forceLayout) {
                    forceLayout = new ForceLayout();
                }
                forceLayout.initNodes(e.data.nodesPosition, e.data.nodesMass, e.data.nodesSize);
                forceLayout.initEdges(e.data.edges, e.data.edgesWeight);
                break;
            case 'updateConfig':
                if (forceLayout) {
                    for (var name in e.data.config) {
                        forceLayout[name] = e.data.config[name];
                    }
                }
                break;
            case 'update':
                var steps = e.data.steps;
                if (forceLayout) {
                    var nNodes = forceLayout.nodes.length;
                    var positionArr = new Float32Array(nNodes * 2);
                    forceLayout.temperature = e.data.temperature;
                    for (var i = 0; i < steps; i++) {
                        forceLayout.update();
                        forceLayout.temperature *= e.data.coolDown;
                    }
                    for (var i = 0; i < nNodes; i++) {
                        var node = forceLayout.nodes[i];
                        positionArr[i * 2] = node.position[0];
                        positionArr[i * 2 + 1] = node.position[1];
                    }
                    self.postMessage(positionArr.buffer, [positionArr.buffer]);
                } else {
                    var emptyArr = new Float32Array();
                    self.postMessage(emptyArr.buffer, [emptyArr.buffer]);
                }
                break;
            }
        };
    }
    return ForceLayout;
});
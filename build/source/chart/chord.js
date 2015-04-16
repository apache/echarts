define('echarts/chart/chord', [
    'require',
    './base',
    'zrender/shape/Text',
    'zrender/shape/Line',
    'zrender/shape/Sector',
    '../util/shape/Ribbon',
    '../util/shape/Icon',
    'zrender/shape/BezierCurve',
    '../config',
    '../util/ecData',
    'zrender/tool/util',
    'zrender/tool/vector',
    '../data/Graph',
    '../layout/Chord',
    '../chart'
], function (require) {
    'use strict';
    var ChartBase = require('./base');
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var SectorShape = require('zrender/shape/Sector');
    var RibbonShape = require('../util/shape/Ribbon');
    var IconShape = require('../util/shape/Icon');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    var ecConfig = require('../config');
    ecConfig.chord = {
        zlevel: 0,
        z: 2,
        clickable: true,
        radius: [
            '65%',
            '75%'
        ],
        center: [
            '50%',
            '50%'
        ],
        padding: 2,
        sort: 'none',
        sortSub: 'none',
        startAngle: 90,
        clockWise: true,
        ribbonType: true,
        minRadius: 10,
        maxRadius: 20,
        symbol: 'circle',
        showScale: false,
        showScaleText: false,
        itemStyle: {
            normal: {
                borderWidth: 0,
                borderColor: '#000',
                label: {
                    show: true,
                    rotate: false,
                    distance: 5
                },
                chordStyle: {
                    width: 1,
                    color: 'black',
                    borderWidth: 1,
                    borderColor: '#999',
                    opacity: 0.5
                }
            },
            emphasis: {
                borderWidth: 0,
                borderColor: '#000',
                chordStyle: {
                    width: 1,
                    color: 'black',
                    borderWidth: 1,
                    borderColor: '#999'
                }
            }
        }
    };
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var vec2 = require('zrender/tool/vector');
    var Graph = require('../data/Graph');
    var ChordLayout = require('../layout/Chord');
    function Chord(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.scaleLineLength = 4;
        this.scaleUnitAngle = 4;
        this.refresh(option);
    }
    Chord.prototype = {
        type: ecConfig.CHART_TYPE_CHORD,
        _init: function () {
            var series = this.series;
            this.selectedMap = {};
            var chordSeriesMap = {};
            var chordSeriesGroups = {};
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === this.type) {
                    var _isSelected = this.isSelected(series[i].name);
                    this.selectedMap[series[i].name] = _isSelected;
                    if (_isSelected) {
                        this.buildMark(i);
                    }
                    this.reformOption(series[i]);
                    chordSeriesMap[series[i].name] = series[i];
                }
            }
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === this.type) {
                    if (series[i].insertToSerie) {
                        var referenceSerie = chordSeriesMap[series[i].insertToSerie];
                        series[i]._referenceSerie = referenceSerie;
                    } else {
                        chordSeriesGroups[series[i].name] = [series[i]];
                    }
                }
            }
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === this.type) {
                    if (series[i].insertToSerie) {
                        var mainSerie = series[i]._referenceSerie;
                        while (mainSerie && mainSerie._referenceSerie) {
                            mainSerie = mainSerie._referenceSerie;
                        }
                        if (chordSeriesGroups[mainSerie.name] && this.selectedMap[series[i].name]) {
                            chordSeriesGroups[mainSerie.name].push(series[i]);
                        }
                    }
                }
            }
            for (var name in chordSeriesGroups) {
                this._buildChords(chordSeriesGroups[name]);
            }
            this.addShapeList();
        },
        _getNodeCategory: function (serie, group) {
            return serie.categories && serie.categories[group.category || 0];
        },
        _getNodeQueryTarget: function (serie, group) {
            var category = this._getNodeCategory(serie, group);
            return [
                group,
                category,
                serie
            ];
        },
        _getEdgeQueryTarget: function (serie, edge, type) {
            type = type || 'normal';
            return [
                edge.itemStyle && edge.itemStyle[type],
                serie.itemStyle[type].chordStyle
            ];
        },
        _buildChords: function (series) {
            var graphs = [];
            var mainSerie = series[0];
            var nodeFilter = function (n) {
                return n.layout.size > 0;
            };
            var createEdgeFilter = function (graph) {
                return function (e) {
                    return graph.getEdge(e.node2, e.node1);
                };
            };
            for (var i = 0; i < series.length; i++) {
                var serie = series[i];
                if (this.selectedMap[serie.name]) {
                    var graph;
                    if (serie.data && serie.matrix) {
                        graph = this._getSerieGraphFromDataMatrix(serie, mainSerie);
                    } else if (serie.nodes && serie.links) {
                        graph = this._getSerieGraphFromNodeLinks(serie, mainSerie);
                    }
                    graph.filterNode(nodeFilter, this);
                    if (serie.ribbonType) {
                        graph.filterEdge(createEdgeFilter(graph));
                    }
                    graphs.push(graph);
                    graph.__serie = serie;
                }
            }
            if (!graphs.length) {
                return;
            }
            var mainGraph = graphs[0];
            if (!mainSerie.ribbonType) {
                var minRadius = mainSerie.minRadius;
                var maxRadius = mainSerie.maxRadius;
                var min = Infinity, max = -Infinity;
                mainGraph.eachNode(function (node) {
                    max = Math.max(node.layout.size, max);
                    min = Math.min(node.layout.size, min);
                });
                var multiplier = (maxRadius - minRadius) / (max - min);
                mainGraph.eachNode(function (node) {
                    var queryTarget = this._getNodeQueryTarget(mainSerie, node);
                    var symbolSize = this.query(queryTarget, 'symbolSize');
                    if (max === min) {
                        node.layout.size = symbolSize || min;
                    } else {
                        node.layout.size = symbolSize || (node.layout.size - min) * multiplier + minRadius;
                    }
                }, this);
            }
            var layout = new ChordLayout();
            layout.clockWise = mainSerie.clockWise;
            layout.startAngle = mainSerie.startAngle * Math.PI / 180;
            if (!layout.clockWise) {
                layout.startAngle = -layout.startAngle;
            }
            layout.padding = mainSerie.padding * Math.PI / 180;
            layout.sort = mainSerie.sort;
            layout.sortSub = mainSerie.sortSub;
            layout.directed = mainSerie.ribbonType;
            layout.run(graphs);
            var showLabel = this.query(mainSerie, 'itemStyle.normal.label.show');
            if (mainSerie.ribbonType) {
                this._buildSectors(mainSerie, 0, mainGraph, mainSerie, graphs);
                if (showLabel) {
                    this._buildLabels(mainSerie, 0, mainGraph, mainSerie, graphs);
                }
                for (var i = 0, j = 0; i < series.length; i++) {
                    if (this.selectedMap[series[i].name]) {
                        this._buildRibbons(series, i, graphs[j++], mainSerie);
                    }
                }
                if (mainSerie.showScale) {
                    this._buildScales(mainSerie, 0, mainGraph);
                }
            } else {
                this._buildNodeIcons(mainSerie, 0, mainGraph, mainSerie, graphs);
                if (showLabel) {
                    this._buildLabels(mainSerie, 0, mainGraph, mainSerie, graphs);
                }
                for (var i = 0, j = 0; i < series.length; i++) {
                    if (this.selectedMap[series[i].name]) {
                        this._buildEdgeCurves(series, i, graphs[j++], mainSerie, mainGraph);
                    }
                }
            }
            this._initHoverHandler(series, graphs);
        },
        _getSerieGraphFromDataMatrix: function (serie, mainSerie) {
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
                group.rawIndex = i;
                for (var key in group) {
                    if (key === 'name') {
                        node['id'] = group['name'];
                    } else {
                        node[key] = group[key];
                    }
                }
                var category = this._getNodeCategory(mainSerie, group);
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
                n.layout = { size: n.data.outValue };
                n.rawIndex = n.data.rawIndex;
            });
            graph.eachEdge(function (e) {
                e.layout = { weight: e.data.weight };
            });
            return graph;
        },
        _getSerieGraphFromNodeLinks: function (serie, mainSerie) {
            var graph = new Graph(true);
            var nodes = serie.data || serie.nodes;
            for (var i = 0, len = nodes.length; i < len; i++) {
                var n = nodes[i];
                if (!n || n.ignore) {
                    continue;
                }
                var category = this._getNodeCategory(mainSerie, n);
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
                    if (mainSerie.ribbonType) {
                        for (var i = 0; i < n.outEdges.length; i++) {
                            value += n.outEdges[i].data.weight || 0;
                        }
                    } else {
                        for (var i = 0; i < n.edges.length; i++) {
                            value += n.edges[i].data.weight || 0;
                        }
                    }
                }
                n.layout = { size: value };
            });
            graph.eachEdge(function (e) {
                e.layout = { weight: e.data.weight == null ? 1 : e.data.weight };
            });
            return graph;
        },
        _initHoverHandler: function (series, graphs) {
            var mainSerie = series[0];
            var mainGraph = graphs[0];
            var self = this;
            mainGraph.eachNode(function (node) {
                node.shape.onmouseover = function () {
                    mainGraph.eachNode(function (n) {
                        n.shape.style.opacity = 0.1;
                        if (n.labelShape) {
                            n.labelShape.style.opacity = 0.1;
                            n.labelShape.modSelf();
                        }
                        n.shape.modSelf();
                    });
                    for (var i = 0; i < graphs.length; i++) {
                        for (var j = 0; j < graphs[i].edges.length; j++) {
                            var e = graphs[i].edges[j];
                            var queryTarget = self._getEdgeQueryTarget(graphs[i].__serie, e.data);
                            e.shape.style.opacity = self.deepQuery(queryTarget, 'opacity') * 0.1;
                            e.shape.modSelf();
                        }
                    }
                    node.shape.style.opacity = 1;
                    if (node.labelShape) {
                        node.labelShape.style.opacity = 1;
                    }
                    for (var i = 0; i < graphs.length; i++) {
                        var n = graphs[i].getNodeById(node.id);
                        if (n) {
                            for (var j = 0; j < n.outEdges.length; j++) {
                                var e = n.outEdges[j];
                                var queryTarget = self._getEdgeQueryTarget(graphs[i].__serie, e.data);
                                e.shape.style.opacity = self.deepQuery(queryTarget, 'opacity');
                                var other = graphs[0].getNodeById(e.node2.id);
                                if (other) {
                                    if (other.shape) {
                                        other.shape.style.opacity = 1;
                                    }
                                    if (other.labelShape) {
                                        other.labelShape.style.opacity = 1;
                                    }
                                }
                            }
                        }
                    }
                    self.zr.refreshNextFrame();
                };
                node.shape.onmouseout = function () {
                    mainGraph.eachNode(function (n) {
                        n.shape.style.opacity = 1;
                        if (n.labelShape) {
                            n.labelShape.style.opacity = 1;
                            n.labelShape.modSelf();
                        }
                        n.shape.modSelf();
                    });
                    for (var i = 0; i < graphs.length; i++) {
                        for (var j = 0; j < graphs[i].edges.length; j++) {
                            var e = graphs[i].edges[j];
                            var queryTarget = [
                                e.data,
                                mainSerie
                            ];
                            e.shape.style.opacity = self.deepQuery(queryTarget, 'itemStyle.normal.chordStyle.opacity');
                            e.shape.modSelf();
                        }
                    }
                    self.zr.refreshNextFrame();
                };
            });
        },
        _buildSectors: function (serie, serieIdx, graph, mainSerie) {
            var center = this.parseCenter(this.zr, mainSerie.center);
            var radius = this.parseRadius(this.zr, mainSerie.radius);
            var clockWise = mainSerie.clockWise;
            var sign = clockWise ? 1 : -1;
            graph.eachNode(function (node) {
                var category = this._getNodeCategory(mainSerie, node.data);
                var color = category ? this.getColor(category.name) : this.getColor(node.id);
                var startAngle = node.layout.startAngle / Math.PI * 180 * sign;
                var endAngle = node.layout.endAngle / Math.PI * 180 * sign;
                var sector = new SectorShape({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: center[0],
                        y: center[1],
                        r0: radius[0],
                        r: radius[1],
                        startAngle: startAngle,
                        endAngle: endAngle,
                        brushType: 'fill',
                        opacity: 1,
                        color: color,
                        clockWise: clockWise
                    },
                    clickable: mainSerie.clickable,
                    highlightStyle: { brushType: 'fill' }
                });
                sector.style.lineWidth = this.deepQuery([
                    node.data,
                    mainSerie
                ], 'itemStyle.normal.borderWidth');
                sector.highlightStyle.lineWidth = this.deepQuery([
                    node.data,
                    mainSerie
                ], 'itemStyle.emphasis.borderWidth');
                sector.style.strokeColor = this.deepQuery([
                    node.data,
                    mainSerie
                ], 'itemStyle.normal.borderColor');
                sector.highlightStyle.strokeColor = this.deepQuery([
                    node.data,
                    mainSerie
                ], 'itemStyle.emphasis.borderColor');
                if (sector.style.lineWidth > 0) {
                    sector.style.brushType = 'both';
                }
                if (sector.highlightStyle.lineWidth > 0) {
                    sector.highlightStyle.brushType = 'both';
                }
                ecData.pack(sector, serie, serieIdx, node.data, node.rawIndex, node.id, node.category);
                this.shapeList.push(sector);
                node.shape = sector;
            }, this);
        },
        _buildNodeIcons: function (serie, serieIdx, graph, mainSerie) {
            var center = this.parseCenter(this.zr, mainSerie.center);
            var radius = this.parseRadius(this.zr, mainSerie.radius);
            var r = radius[1];
            graph.eachNode(function (node) {
                var startAngle = node.layout.startAngle;
                var endAngle = node.layout.endAngle;
                var angle = (startAngle + endAngle) / 2;
                var x = r * Math.cos(angle);
                var y = r * Math.sin(angle);
                var queryTarget = this._getNodeQueryTarget(mainSerie, node.data);
                var category = this._getNodeCategory(mainSerie, node.data);
                var color = this.deepQuery(queryTarget, 'itemStyle.normal.color');
                if (!color) {
                    color = category ? this.getColor(category.name) : this.getColor(node.id);
                }
                var iconShape = new IconShape({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase() + 1,
                    style: {
                        x: -node.layout.size,
                        y: -node.layout.size,
                        width: node.layout.size * 2,
                        height: node.layout.size * 2,
                        iconType: this.deepQuery(queryTarget, 'symbol'),
                        color: color,
                        brushType: 'both',
                        lineWidth: this.deepQuery(queryTarget, 'itemStyle.normal.borderWidth'),
                        strokeColor: this.deepQuery(queryTarget, 'itemStyle.normal.borderColor')
                    },
                    highlightStyle: {
                        color: this.deepQuery(queryTarget, 'itemStyle.emphasis.color'),
                        lineWidth: this.deepQuery(queryTarget, 'itemStyle.emphasis.borderWidth'),
                        strokeColor: this.deepQuery(queryTarget, 'itemStyle.emphasis.borderColor')
                    },
                    clickable: mainSerie.clickable,
                    position: [
                        x + center[0],
                        y + center[1]
                    ]
                });
                ecData.pack(iconShape, serie, serieIdx, node.data, node.rawIndex, node.id, node.category);
                this.shapeList.push(iconShape);
                node.shape = iconShape;
            }, this);
        },
        _buildLabels: function (serie, serieIdx, graph, mainSerie) {
            var labelColor = this.query(mainSerie, 'itemStyle.normal.label.color');
            var rotateLabel = this.query(mainSerie, 'itemStyle.normal.label.rotate');
            var labelDistance = this.query(mainSerie, 'itemStyle.normal.label.distance');
            var center = this.parseCenter(this.zr, mainSerie.center);
            var radius = this.parseRadius(this.zr, mainSerie.radius);
            var clockWise = mainSerie.clockWise;
            var sign = clockWise ? 1 : -1;
            graph.eachNode(function (node) {
                var startAngle = node.layout.startAngle / Math.PI * 180 * sign;
                var endAngle = node.layout.endAngle / Math.PI * 180 * sign;
                var angle = (startAngle * -sign + endAngle * -sign) / 2;
                angle %= 360;
                if (angle < 0) {
                    angle += 360;
                }
                var isRightSide = angle <= 90 || angle >= 270;
                angle = angle * Math.PI / 180;
                var v = [
                    Math.cos(angle),
                    -Math.sin(angle)
                ];
                var distance = 0;
                if (mainSerie.ribbonType) {
                    distance = mainSerie.showScaleText ? 35 + labelDistance : labelDistance;
                } else {
                    distance = labelDistance + node.layout.size;
                }
                var start = vec2.scale([], v, radius[1] + distance);
                vec2.add(start, start, center);
                var labelShape = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase() + 1,
                    hoverable: false,
                    style: {
                        text: node.data.label == null ? node.id : node.data.label,
                        textAlign: isRightSide ? 'left' : 'right',
                        color: labelColor || '#000000'
                    }
                };
                if (rotateLabel) {
                    labelShape.rotation = isRightSide ? angle : Math.PI + angle;
                    if (isRightSide) {
                        labelShape.style.x = radius[1] + distance;
                    } else {
                        labelShape.style.x = -radius[1] - distance;
                    }
                    labelShape.style.y = 0;
                    labelShape.position = center.slice();
                } else {
                    labelShape.style.x = start[0];
                    labelShape.style.y = start[1];
                }
                labelShape.style.textColor = this.deepQuery([
                    node.data,
                    mainSerie
                ], 'itemStyle.normal.label.textStyle.color') || '#fff';
                labelShape.style.textFont = this.getFont(this.deepQuery([
                    node.data,
                    mainSerie
                ], 'itemStyle.normal.label.textStyle'));
                labelShape = new TextShape(labelShape);
                this.shapeList.push(labelShape);
                node.labelShape = labelShape;
            }, this);
        },
        _buildRibbons: function (series, serieIdx, graph, mainSerie) {
            var serie = series[serieIdx];
            var center = this.parseCenter(this.zr, mainSerie.center);
            var radius = this.parseRadius(this.zr, mainSerie.radius);
            graph.eachEdge(function (edge, idx) {
                var color;
                var other = graph.getEdge(edge.node2, edge.node1);
                if (!other || edge.shape) {
                    return;
                }
                if (other.shape) {
                    edge.shape = other.shape;
                    return;
                }
                var s0 = edge.layout.startAngle / Math.PI * 180;
                var s1 = edge.layout.endAngle / Math.PI * 180;
                var t0 = other.layout.startAngle / Math.PI * 180;
                var t1 = other.layout.endAngle / Math.PI * 180;
                if (series.length === 1) {
                    if (edge.layout.weight <= other.layout.weight) {
                        color = this.getColor(edge.node1.id);
                    } else {
                        color = this.getColor(edge.node2.id);
                    }
                } else {
                    color = this.getColor(serie.name);
                }
                var queryTarget = this._getEdgeQueryTarget(serie, edge.data);
                var queryTargetEmphasis = this._getEdgeQueryTarget(serie, edge.data, 'emphasis');
                var ribbon = new RibbonShape({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: center[0],
                        y: center[1],
                        r: radius[0],
                        source0: s0,
                        source1: s1,
                        target0: t0,
                        target1: t1,
                        brushType: 'both',
                        opacity: this.deepQuery(queryTarget, 'opacity'),
                        color: color,
                        lineWidth: this.deepQuery(queryTarget, 'borderWidth'),
                        strokeColor: this.deepQuery(queryTarget, 'borderColor'),
                        clockWise: mainSerie.clockWise
                    },
                    clickable: mainSerie.clickable,
                    highlightStyle: {
                        brushType: 'both',
                        opacity: this.deepQuery(queryTargetEmphasis, 'opacity'),
                        lineWidth: this.deepQuery(queryTargetEmphasis, 'borderWidth'),
                        strokeColor: this.deepQuery(queryTargetEmphasis, 'borderColor')
                    }
                });
                var node1, node2;
                if (edge.layout.weight <= other.layout.weight) {
                    node1 = other.node1;
                    node2 = other.node2;
                } else {
                    node1 = edge.node1;
                    node2 = edge.node2;
                }
                ecData.pack(ribbon, serie, serieIdx, edge.data, edge.rawIndex == null ? idx : edge.rawIndex, edge.data.name || node1.id + '-' + node2.id, node1.id, node2.id);
                this.shapeList.push(ribbon);
                edge.shape = ribbon;
            }, this);
        },
        _buildEdgeCurves: function (series, serieIdx, graph, mainSerie, mainGraph) {
            var serie = series[serieIdx];
            var center = this.parseCenter(this.zr, mainSerie.center);
            graph.eachEdge(function (e, idx) {
                var node1 = mainGraph.getNodeById(e.node1.id);
                var node2 = mainGraph.getNodeById(e.node2.id);
                var shape1 = node1.shape;
                var shape2 = node2.shape;
                var queryTarget = this._getEdgeQueryTarget(serie, e.data);
                var queryTargetEmphasis = this._getEdgeQueryTarget(serie, e.data, 'emphasis');
                var curveShape = new BezierCurveShape({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        xStart: shape1.position[0],
                        yStart: shape1.position[1],
                        xEnd: shape2.position[0],
                        yEnd: shape2.position[1],
                        cpX1: center[0],
                        cpY1: center[1],
                        lineWidth: this.deepQuery(queryTarget, 'width'),
                        strokeColor: this.deepQuery(queryTarget, 'color'),
                        opacity: this.deepQuery(queryTarget, 'opacity')
                    },
                    highlightStyle: {
                        lineWidth: this.deepQuery(queryTargetEmphasis, 'width'),
                        strokeColor: this.deepQuery(queryTargetEmphasis, 'color'),
                        opacity: this.deepQuery(queryTargetEmphasis, 'opacity')
                    }
                });
                ecData.pack(curveShape, serie, serieIdx, e.data, e.rawIndex == null ? idx : e.rawIndex, e.data.name || e.node1.id + '-' + e.node2.id, e.node1.id, e.node2.id);
                this.shapeList.push(curveShape);
                e.shape = curveShape;
            }, this);
        },
        _buildScales: function (serie, serieIdx, graph) {
            var clockWise = serie.clockWise;
            var center = this.parseCenter(this.zr, serie.center);
            var radius = this.parseRadius(this.zr, serie.radius);
            var sign = clockWise ? 1 : -1;
            var sumValue = 0;
            var maxValue = -Infinity;
            var unitPostfix;
            var unitScale;
            if (serie.showScaleText) {
                graph.eachNode(function (node) {
                    var val = node.data.value;
                    if (val > maxValue) {
                        maxValue = val;
                    }
                    sumValue += val;
                });
                if (maxValue > 10000000000) {
                    unitPostfix = 'b';
                    unitScale = 1e-9;
                } else if (maxValue > 10000000) {
                    unitPostfix = 'm';
                    unitScale = 0.000001;
                } else if (maxValue > 10000) {
                    unitPostfix = 'k';
                    unitScale = 0.001;
                } else {
                    unitPostfix = '';
                    unitScale = 1;
                }
            }
            var unitValue = sumValue / (360 - serie.padding);
            graph.eachNode(function (node) {
                var startAngle = node.layout.startAngle / Math.PI * 180;
                var endAngle = node.layout.endAngle / Math.PI * 180;
                var scaleAngle = startAngle;
                while (true) {
                    if (clockWise && scaleAngle > endAngle || !clockWise && scaleAngle < endAngle) {
                        break;
                    }
                    var theta = scaleAngle / 180 * Math.PI;
                    var v = [
                        Math.cos(theta),
                        Math.sin(theta)
                    ];
                    var start = vec2.scale([], v, radius[1] + 1);
                    vec2.add(start, start, center);
                    var end = vec2.scale([], v, radius[1] + this.scaleLineLength);
                    vec2.add(end, end, center);
                    var scaleShape = new LineShape({
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase() - 1,
                        hoverable: false,
                        style: {
                            xStart: start[0],
                            yStart: start[1],
                            xEnd: end[0],
                            yEnd: end[1],
                            lineCap: 'round',
                            brushType: 'stroke',
                            strokeColor: '#666',
                            lineWidth: 1
                        }
                    });
                    this.shapeList.push(scaleShape);
                    scaleAngle += sign * this.scaleUnitAngle;
                }
                if (!serie.showScaleText) {
                    return;
                }
                var scaleTextAngle = startAngle;
                var step = unitValue * 5 * this.scaleUnitAngle;
                var scaleValue = 0;
                while (true) {
                    if (clockWise && scaleTextAngle > endAngle || !clockWise && scaleTextAngle < endAngle) {
                        break;
                    }
                    var theta = scaleTextAngle;
                    theta = theta % 360;
                    if (theta < 0) {
                        theta += 360;
                    }
                    var isRightSide = theta <= 90 || theta >= 270;
                    var textShape = new TextShape({
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase() - 1,
                        hoverable: false,
                        style: {
                            x: isRightSide ? radius[1] + this.scaleLineLength + 4 : -radius[1] - this.scaleLineLength - 4,
                            y: 0,
                            text: Math.round(scaleValue * 10) / 10 + unitPostfix,
                            textAlign: isRightSide ? 'left' : 'right'
                        },
                        position: center.slice(),
                        rotation: isRightSide ? [
                            -theta / 180 * Math.PI,
                            0,
                            0
                        ] : [
                            -(theta + 180) / 180 * Math.PI,
                            0,
                            0
                        ]
                    });
                    this.shapeList.push(textShape);
                    scaleValue += step * unitScale;
                    scaleTextAngle += sign * this.scaleUnitAngle * 5;
                }
            }, this);
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
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
            this.backupShapeList();
            this._init();
        },
        reformOption: function (opt) {
            var _merge = zrUtil.merge;
            opt = _merge(_merge(opt || {}, this.ecTheme.chord), ecConfig.chord);
            opt.itemStyle.normal.label.textStyle = this.getTextStyle(opt.itemStyle.normal.label.textStyle);
            this.z = opt.z;
            this.zlevel = opt.zlevel;
        }
    };
    zrUtil.inherits(Chord, ChartBase);
    require('../chart').define('chord', Chord);
    return Chord;
});define('echarts/util/shape/Ribbon', [
    'require',
    'zrender/shape/Base',
    'zrender/shape/util/PathProxy',
    'zrender/tool/util',
    'zrender/tool/area'
], function (require) {
    var Base = require('zrender/shape/Base');
    var PathProxy = require('zrender/shape/util/PathProxy');
    var zrUtil = require('zrender/tool/util');
    var area = require('zrender/tool/area');
    function RibbonShape(options) {
        Base.call(this, options);
        this._pathProxy = new PathProxy();
    }
    RibbonShape.prototype = {
        type: 'ribbon',
        buildPath: function (ctx, style) {
            var clockWise = style.clockWise || false;
            var path = this._pathProxy;
            path.begin(ctx);
            var cx = style.x;
            var cy = style.y;
            var r = style.r;
            var s0 = style.source0 / 180 * Math.PI;
            var s1 = style.source1 / 180 * Math.PI;
            var t0 = style.target0 / 180 * Math.PI;
            var t1 = style.target1 / 180 * Math.PI;
            var sx0 = cx + Math.cos(s0) * r;
            var sy0 = cy + Math.sin(s0) * r;
            var sx1 = cx + Math.cos(s1) * r;
            var sy1 = cy + Math.sin(s1) * r;
            var tx0 = cx + Math.cos(t0) * r;
            var ty0 = cy + Math.sin(t0) * r;
            var tx1 = cx + Math.cos(t1) * r;
            var ty1 = cy + Math.sin(t1) * r;
            path.moveTo(sx0, sy0);
            path.arc(cx, cy, style.r, s0, s1, !clockWise);
            path.bezierCurveTo((cx - sx1) * 0.7 + sx1, (cy - sy1) * 0.7 + sy1, (cx - tx0) * 0.7 + tx0, (cy - ty0) * 0.7 + ty0, tx0, ty0);
            if (style.source0 === style.target0 && style.source1 === style.target1) {
                return;
            }
            path.arc(cx, cy, style.r, t0, t1, !clockWise);
            path.bezierCurveTo((cx - tx1) * 0.7 + tx1, (cy - ty1) * 0.7 + ty1, (cx - sx0) * 0.7 + sx0, (cy - sy0) * 0.7 + sy0, sx0, sy0);
        },
        getRect: function (style) {
            if (style.__rect) {
                return style.__rect;
            }
            if (!this._pathProxy.isEmpty()) {
                this.buildPath(null, style);
            }
            return this._pathProxy.fastBoundingRect();
        },
        isCover: function (x, y) {
            var rect = this.getRect(this.style);
            if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
                return area.isInsidePath(this._pathProxy.pathCommands, 0, 'fill', x, y);
            }
        }
    };
    zrUtil.inherits(RibbonShape, Base);
    return RibbonShape;
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
});define('echarts/layout/Chord', ['require'], function (require) {
    var ChordLayout = function (opts) {
        opts = opts || {};
        this.sort = opts.sort || null;
        this.sortSub = opts.sortSub || null;
        this.padding = 0.05;
        this.startAngle = opts.startAngle || 0;
        this.clockWise = opts.clockWise == null ? false : opts.clockWise;
        this.center = opts.center || [
            0,
            0
        ];
        this.directed = true;
    };
    ChordLayout.prototype.run = function (graphs) {
        if (!(graphs instanceof Array)) {
            graphs = [graphs];
        }
        var gl = graphs.length;
        if (!gl) {
            return;
        }
        var graph0 = graphs[0];
        var nl = graph0.nodes.length;
        var groups = [];
        var sumSize = 0;
        for (var i = 0; i < nl; i++) {
            var g0node = graph0.nodes[i];
            var group = {
                size: 0,
                subGroups: [],
                node: g0node
            };
            groups.push(group);
            var sumWeight = 0;
            for (var k = 0; k < graphs.length; k++) {
                var graph = graphs[k];
                var node = graph.getNodeById(g0node.id);
                if (!node) {
                    continue;
                }
                group.size += node.layout.size;
                var edges = this.directed ? node.outEdges : node.edges;
                for (var j = 0; j < edges.length; j++) {
                    var e = edges[j];
                    var w = e.layout.weight;
                    group.subGroups.push({
                        weight: w,
                        edge: e,
                        graph: graph
                    });
                    sumWeight += w;
                }
            }
            sumSize += group.size;
            var multiplier = group.size / sumWeight;
            for (var j = 0; j < group.subGroups.length; j++) {
                group.subGroups[j].weight *= multiplier;
            }
            if (this.sortSub === 'ascending') {
                group.subGroups.sort(compareSubGroups);
            } else if (this.sort === 'descending') {
                group.subGroups.sort(compareSubGroups);
                group.subGroups.reverse();
            }
        }
        if (this.sort === 'ascending') {
            groups.sort(compareGroups);
        } else if (this.sort === 'descending') {
            groups.sort(compareGroups);
            groups.reverse();
        }
        var multiplier = (Math.PI * 2 - this.padding * nl) / sumSize;
        var angle = this.startAngle;
        var sign = this.clockWise ? 1 : -1;
        for (var i = 0; i < nl; i++) {
            var group = groups[i];
            group.node.layout.startAngle = angle;
            group.node.layout.endAngle = angle + sign * group.size * multiplier;
            group.node.layout.subGroups = [];
            for (var j = 0; j < group.subGroups.length; j++) {
                var subGroup = group.subGroups[j];
                subGroup.edge.layout.startAngle = angle;
                angle += sign * subGroup.weight * multiplier;
                subGroup.edge.layout.endAngle = angle;
            }
            angle = group.node.layout.endAngle + sign * this.padding;
        }
    };
    var compareSubGroups = function (a, b) {
        return a.weight - b.weight;
    };
    var compareGroups = function (a, b) {
        return a.size - b.size;
    };
    return ChordLayout;
});
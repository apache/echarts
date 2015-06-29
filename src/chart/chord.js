/**
 * echarts图表类：chord diagram
 *
 * @author pissang (https://github.com/pissang/)
 * 
 * TODO 非Ribbon Type 支持 undirected graph ?
 */

define(function (require) {
    'use strict';
    
    var ChartBase = require('./base');
    
    // 图形依赖
    var TextShape = require('zrender/shape/Text');
    var LineShape = require('zrender/shape/Line');
    var SectorShape = require('zrender/shape/Sector');
    var RibbonShape = require('../util/shape/Ribbon');
    var IconShape = require('../util/shape/Icon');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    
    var ecConfig = require('../config');
    // 和弦图默认参数
    ecConfig.chord = {
        zlevel: 0,                  // 一级层叠
        z: 2,                       // 二级层叠
        clickable: true,
        radius: ['65%', '75%'],
        center: ['50%', '50%'],
        padding: 2,
        sort: 'none',       // can be 'none', 'ascending', 'descending'
        sortSub: 'none',    // can be 'none', 'ascending', 'descending'
        startAngle: 90,
        clockWise: true,
        ribbonType: true,
        
        /***************** 下面的配置项在 ribbonType 为 false 时有效 */
        // 同force类似
        minRadius: 10,
        maxRadius: 20,
        symbol: 'circle',
        /***************** 上面的配置项在 ribbonType 为 false 时有效 */

        /***************** 下面的配置项在 ribbonType 为 true 时有效 */
        showScale: false,
        showScaleText: false,
        /***************** 上面的配置项在 ribbonType 为 true 时有效 */

        // 分类里如果有样式会覆盖节点默认样式
        // categories: [{
            // itemStyle
            // symbol
            // symbolSize
            // name
        // }],

        itemStyle: {
            normal: {
                borderWidth: 0,
                borderColor: '#000',
                label: {
                    show: true,
                    rotate: false,
                    distance: 5
                    // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
                },
                chordStyle: {
                    /** ribbonType = false 时有效 */
                    width: 1,
                    color: 'black',
                    /** ribbonType = true 时有效 */
                    borderWidth: 1,
                    borderColor: '#999',
                    opacity: 0.5
                }
            },
            emphasis: {
                borderWidth: 0,
                borderColor: '#000',
                chordStyle: {
                    /** ribbonType = false 时有效 */
                    width: 1,
                    color: 'black',
                    /** ribbonType = true 时有效 */
                    borderWidth: 1,
                    borderColor: '#999'
                }
            }
        }
        /****** 使用 Data-matrix 表示数据 */
        // data: [],
        // Source data matrix
        /**
         *         target
         *    -1--2--3--4--5-
         *  1| x  x  x  x  x
         *  2| x  x  x  x  x
         *  3| x  x  x  x  x  source
         *  4| x  x  x  x  x
         *  5| x  x  x  x  x
         *
         *  Relation ship from source to target
         *  https://github.com/mbostock/d3/wiki/Chord-Layout#wiki-chord
         *  
         *  Row based
         */
        // matrix: [],

        /****** 使用 node-links 表示数据 */
        // 参考 force
        // nodes: [],
        // links: []
    };

    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var vec2 = require('zrender/tool/vector');
    var Graph = require('../data/Graph');
    var ChordLayout = require('../layout/Chord');
    
    function Chord(ecTheme, messageCenter, zr, option, myChart) {
        // 图表基类
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);

        this.scaleLineLength = 4;

        this.scaleUnitAngle = 4;

        this.refresh(option);
    }
    
    Chord.prototype = {
        type: ecConfig.CHART_TYPE_CHORD,
        /**
         * 绘制图形
         */
        _init: function () {
            var series = this.series;
            this.selectedMap = {};

            var chordSeriesMap = {};

            var chordSeriesGroups = {};

            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === this.type) {
                    var _isSelected = this.isSelected(series[i].name);
                    // Filter by selected serie
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
                    }
                    else {
                        chordSeriesGroups[series[i].name] = [series[i]];
                    }
                }
            }
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === this.type) {
                    if (series[i].insertToSerie) {
                        // insertToSerie 可能会存在链式的使用，找到最原始的系列，分到一个 Group 里
                        var mainSerie = series[i]._referenceSerie;
                        while (mainSerie && mainSerie._referenceSerie) {
                            mainSerie = mainSerie._referenceSerie;
                        }
                        if (
                            chordSeriesGroups[mainSerie.name]
                            && this.selectedMap[series[i].name]
                        ) {
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
            return [group, category, serie];
        },

        _getEdgeQueryTarget: function (serie, edge, type) {
            type = type || 'normal';
            return [
                (edge.itemStyle && edge.itemStyle[type]),
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
                    // matrix 表示边
                    if (serie.matrix) {
                        graph = this._getSerieGraphFromDataMatrix(
                            serie, mainSerie
                        );
                    }
                    // links 表示边
                    else if (serie.links) {
                        graph = this._getSerieGraphFromNodeLinks(
                            serie, mainSerie
                        );
                    }
                    // 过滤输出为0的节点
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
                // Map size to [minRadius, maxRadius]
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
                    }
                    else {
                        node.layout.size = symbolSize
                            || (node.layout.size - min) * multiplier + minRadius;
                    }
                }, this);
            }

            // Do layout
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

            var showLabel = this.query(
                mainSerie, 'itemStyle.normal.label.show'
            );

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
            }
            else {
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
            // 复制一份新的matrix
            for (var i = 0; i < serie.matrix.length; i++) {
                matrix[i] = serie.matrix[i].slice();
            }
            var data = serie.data || serie.nodes;
            for (var i = 0; i < data.length; i++) {
                var node = {};
                var group = data[i];
                group.rawIndex = i;
                for (var key in group) {
                    // name改为id
                    if (key === 'name') {
                        node['id'] = group['name'];
                    }
                    else {
                        node[key] = group[key];
                    }
                }
                // legends 选择优先级 category -> group
                var category = this._getNodeCategory(mainSerie, group);
                var name = category ? category.name : group.name;

                this.selectedMap[name] = this.isSelected(name);
                if (this.selectedMap[name]) {
                    nodesData.push(node);
                    count++;
                }
                else {
                    // 过滤legend未选中的数据
                    matrix.splice(count, 1);
                    for (var j = 0; j < matrix.length; j++) {
                        matrix[j].splice(count, 1);
                    }
                }
            }

            var graph = Graph.fromMatrix(nodesData, matrix, true);

            // Prepare layout parameters
            graph.eachNode(function (n, idx) {
                n.layout = {
                    size: n.data.outValue
                };
                n.rawIndex = n.data.rawIndex;
            });
            graph.eachEdge(function (e) {
                e.layout = {
                    weight: e.data.weight
                };
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
                // legends 选择优先级 category -> group
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
                if (typeof(n1) === 'number') {
                    n1 = nodes[n1];
                    if (n1) {
                        n1 = n1.name;
                    }
                }
                if (typeof(n2) === 'number') {
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
                if (value == null) {    // value 是 null 或者 undefined
                    value = 0;
                    if (mainSerie.ribbonType) {
                        // 默认使用所有出边值的和作为节点的大小, 不修改 data 里的数值
                        for (var i = 0; i < n.outEdges.length; i++) {
                            value += n.outEdges[i].data.weight || 0;
                        }
                    }
                    else {
                        // 默认使用所有边值的和作为节点的大小, 不修改 data 里的数值
                        for (var i = 0; i < n.edges.length; i++) {
                            value += n.edges[i].data.weight || 0;
                        }
                    }
                }
                n.layout = {
                    size: value
                };
            });
            graph.eachEdge(function (e) {
                e.layout = {
                    // 默认 weight 为1
                    weight: e.data.weight == null ? 1 : e.data.weight
                };
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
                            var queryTarget = self._getEdgeQueryTarget(
                                graphs[i].__serie, e.data
                            );
                            e.shape.style.opacity = self.deepQuery(
                                queryTarget, 'opacity'
                            ) * 0.1;
                            e.shape.modSelf();
                        }
                    }
                    node.shape.style.opacity = 1;
                    if (node.labelShape) {
                        node.labelShape.style.opacity = 1;
                    }
                    for (var i = 0; i < graphs.length; i++) {
                        var n = graphs[i].getNodeById(node.id);
                        if (n) {    //  节点有可能没数据被过滤掉了
                            for (var j = 0; j < n.outEdges.length; j++) {
                                var e = n.outEdges[j];
                                var queryTarget = self._getEdgeQueryTarget(
                                    graphs[i].__serie, e.data
                                );
                                e.shape.style.opacity = self.deepQuery(
                                    queryTarget, 'opacity'
                                );
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
                            var queryTarget = [e.data, mainSerie];
                            e.shape.style.opacity = self.deepQuery(
                                queryTarget, 'itemStyle.normal.chordStyle.opacity'
                            );
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
                // 默认使用 category 分类颜色
                var color = category ? this.getColor(category.name) : this.getColor(node.id);

                var startAngle = node.layout.startAngle / Math.PI * 180 * sign;
                var endAngle = node.layout.endAngle / Math.PI * 180 * sign;
                var sector = new SectorShape({
                    zlevel: serie.zlevel,
                    z : serie.z,
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
                    highlightStyle: {
                        brushType: 'fill'
                    }
                });
                sector.style.lineWidth = this.deepQuery(
                    [node.data, mainSerie],
                    'itemStyle.normal.borderWidth'
                );
                sector.highlightStyle.lineWidth = this.deepQuery(
                    [node.data, mainSerie],
                    'itemStyle.emphasis.borderWidth'
                );
                sector.style.strokeColor = this.deepQuery(
                    [node.data, mainSerie],
                    'itemStyle.normal.borderColor'
                );
                sector.highlightStyle.strokeColor = this.deepQuery(
                    [node.data, mainSerie],
                    'itemStyle.emphasis.borderColor'
                );
                if (sector.style.lineWidth > 0) {
                    sector.style.brushType = 'both';
                }
                if (sector.highlightStyle.lineWidth > 0) {
                    sector.highlightStyle.brushType = 'both';
                }
                ecData.pack(
                    sector,
                    serie,
                    serieIdx,
                    node.data,
                    node.rawIndex,
                    node.id,
                    // special
                    node.category
                );

                this.shapeList.push(sector);

                node.shape = sector;

            }, this);
        },

        _buildNodeIcons: function (serie, serieIdx, graph, mainSerie) {
            var center = this.parseCenter(this.zr, mainSerie.center);
            var radius = this.parseRadius(this.zr, mainSerie.radius);
            // PENDING
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
                    zlevel: serie.zlevel,
                    z: serie.z + 1,
                    style: {
                        x: - node.layout.size,
                        y: - node.layout.size,
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
                    position: [x + center[0], y + center[1]]
                });

                ecData.pack(
                    iconShape,
                    serie,
                    serieIdx,
                    node.data,
                    node.rawIndex,
                    node.id,
                    // special
                    node.category
                );

                this.shapeList.push(iconShape);
                node.shape = iconShape;
            }, this);
        },

        _buildLabels: function (serie, serieIdx, graph, mainSerie) {
            // var labelColor = this.query(
                // mainSerie, 'itemStyle.normal.label.color'
            // );
            var rotateLabel = this.query(
                mainSerie, 'itemStyle.normal.label.rotate'
            );
            var labelDistance = this.query(
                mainSerie, 'itemStyle.normal.label.distance'
            );
            var center = this.parseCenter(this.zr, mainSerie.center);
            var radius = this.parseRadius(this.zr, mainSerie.radius);
            var clockWise = mainSerie.clockWise;
            var sign = clockWise ? 1 : -1;

            graph.eachNode(function (node) {
                var startAngle = node.layout.startAngle / Math.PI * 180 * sign;
                var endAngle = node.layout.endAngle / Math.PI * 180 * sign;
                var angle = (startAngle * -sign + endAngle * -sign) / 2;
                angle %= 360;
                if (angle < 0) { // Constrain to [0,360]
                    angle += 360;
                }
                var isRightSide = angle <= 90
                                 || angle >= 270;
                angle = angle * Math.PI / 180;
                var v = [Math.cos(angle), -Math.sin(angle)];

                var distance = 0;
                if (mainSerie.ribbonType) {
                    distance = mainSerie.showScaleText ? 35 + labelDistance : labelDistance;
                }
                else {
                    distance = labelDistance + node.layout.size;
                }
                var start = vec2.scale([], v, radius[1] + distance);
                vec2.add(start, start, center);

                var labelShape = {
                    zlevel: serie.zlevel,
                    z: serie.z + 1,
                    hoverable: false,
                    style: {
                        text: node.data.label == null ? node.id : node.data.label,
                        textAlign: isRightSide ? 'left' : 'right'
                    }
                };
                if (rotateLabel) {
                    labelShape.rotation = isRightSide ? angle : Math.PI + angle;
                    if (isRightSide) {
                        labelShape.style.x = radius[1] + distance;
                    }
                    else {
                        labelShape.style.x = -radius[1] - distance;
                    }
                    labelShape.style.y = 0;
                    labelShape.position = center.slice();
                }
                else {
                    labelShape.style.x = start[0];
                    labelShape.style.y = start[1];
                }

                // zrender/Text并没有textColor属性，ctx fillStyle使用的是color
                labelShape.style.color = this.deepQuery(
                    [node.data, mainSerie],
                    'itemStyle.normal.label.textStyle.color'
                ) || '#000000';
                labelShape.style.textFont = this.getFont(this.deepQuery(
                    [node.data, mainSerie],
                    'itemStyle.normal.label.textStyle'
                ));
                labelShape = new TextShape(labelShape);

                this.shapeList.push(labelShape);
                node.labelShape = labelShape;
            }, this);
        },

        _buildRibbons : function (series, serieIdx, graph, mainSerie) {
            var serie = series[serieIdx];

            var center = this.parseCenter(this.zr, mainSerie.center);
            var radius = this.parseRadius(this.zr, mainSerie.radius);

            // graph.edges.length = 1;
            graph.eachEdge(function (edge, idx) {
                var color;
                // 反向边
                var other = graph.getEdge(edge.node2, edge.node1);
                if (!other  // 只有单边
                    || edge.shape // 已经创建过Ribbon
                ) {
                    return;
                }
                if (other.shape) { // 已经创建过Ribbon
                    edge.shape = other.shape;
                    return;
                }
                var s0 = edge.layout.startAngle / Math.PI * 180;
                var s1 = edge.layout.endAngle / Math.PI * 180;

                var t0 = other.layout.startAngle / Math.PI * 180;
                var t1 = other.layout.endAngle / Math.PI * 180;

                if (series.length === 1) {
                    // 取小端的颜色
                    if (edge.layout.weight <= other.layout.weight) {
                        color = this.getColor(edge.node1.id);
                    }
                    else {
                        color = this.getColor(edge.node2.id);
                    }
                } else {
                    //  使用系列颜色
                    color = this.getColor(serie.name);
                }
                var queryTarget = this._getEdgeQueryTarget(serie, edge.data);
                var queryTargetEmphasis = this._getEdgeQueryTarget(
                    serie, edge.data, 'emphasis'
                );
                var ribbon = new RibbonShape({
                    zlevel: serie.zlevel,
                    z: serie.z,
                    style: {
                        x: center[0],
                        y: center[1],
                        r: radius[0],
                        source0: s0,
                        source1: s1,
                        target0: t0,
                        target1: t1,
                        brushType: 'both',
                        opacity: this.deepQuery(
                            queryTarget, 'opacity'
                        ),
                        color: color,
                        lineWidth: this.deepQuery(queryTarget, 'borderWidth'),
                        strokeColor: this.deepQuery(queryTarget, 'borderColor'),
                        clockWise: mainSerie.clockWise
                    },
                    clickable: mainSerie.clickable,
                    highlightStyle: {
                        brushType: 'both',
                        opacity: this.deepQuery(
                            queryTargetEmphasis, 'opacity'
                        ),
                        lineWidth: this.deepQuery(queryTargetEmphasis, 'borderWidth'),
                        strokeColor: this.deepQuery(queryTargetEmphasis, 'borderColor')
                    }
                });
                var node1, node2;
                // 从大端到小端
                if (edge.layout.weight <= other.layout.weight) {
                    node1 = other.node1;
                    node2 = other.node2;
                } else {
                    node1 = edge.node1;
                    node2 = edge.node2;
                }
                ecData.pack(
                    ribbon,
                    serie,
                    serieIdx,
                    edge.data,
                    edge.rawIndex == null ? idx : edge.rawIndex,
                    edge.data.name || (node1.id + '-' + node2.id),
                    // special
                    node1.id,
                    // special2
                    node2.id
                );

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
                var queryTargetEmphasis = this._getEdgeQueryTarget(
                    serie, e.data, 'emphasis'
                );

                var curveShape = new BezierCurveShape({
                    zlevel: serie.zlevel,
                    z: serie.z,
                    style: {
                        xStart: shape1.position[0],
                        yStart: shape1.position[1],
                        xEnd: shape2.position[0],
                        yEnd: shape2.position[1],
                        cpX1: center[0],
                        cpY1: center[1],
                        lineWidth: this.deepQuery(
                            queryTarget, 'width'
                        ),
                        strokeColor: this.deepQuery(
                            queryTarget, 'color'
                        ),
                        opacity: this.deepQuery(
                            queryTarget, 'opacity'
                        )
                    },
                    highlightStyle: {
                        lineWidth: this.deepQuery(
                            queryTargetEmphasis, 'width'
                        ),
                        strokeColor: this.deepQuery(
                            queryTargetEmphasis, 'color'
                        ),
                        opacity: this.deepQuery(
                            queryTargetEmphasis, 'opacity'
                        )
                    }
                });

                ecData.pack(
                    curveShape,
                    serie,
                    serieIdx,
                    e.data,
                    e.rawIndex == null ? idx : e.rawIndex,
                    e.data.name || (e.node1.id + '-' + e.node2.id),
                    // special
                    e.node1.id,
                    // special2
                    e.node2.id
                );

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
                if (maxValue > 1e10) {
                    unitPostfix  = 'b';
                    unitScale = 1e-9;
                }
                else if (maxValue > 1e7) {
                    unitPostfix = 'm';
                    unitScale = 1e-6;
                }
                else if (maxValue > 1e4) {
                    unitPostfix = 'k';
                    unitScale = 1e-3;
                }
                else {
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
                    if ((clockWise && scaleAngle > endAngle)
                        || (!clockWise && scaleAngle < endAngle)
                    ) {
                        break;
                    }
                    var theta = scaleAngle / 180 * Math.PI;
                    var v = [Math.cos(theta), Math.sin(theta)];
                    var start = vec2.scale([], v, radius[1] + 1);
                    vec2.add(start, start, center);
                    var end = vec2.scale([], v, radius[1] + this.scaleLineLength);
                    vec2.add(end, end, center);
                    var scaleShape = new LineShape({
                        zlevel: serie.zlevel,
                        z: serie.z - 1,
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
                    if ((clockWise && scaleTextAngle > endAngle)
                        || (!clockWise && scaleTextAngle < endAngle)
                    ) {
                        break;
                    }
                    var theta = scaleTextAngle;
                    theta = theta % 360;
                    if (theta < 0) {
                        theta += 360;
                    }
                    var isRightSide = theta <= 90
                                     || theta >= 270;

                    var textShape = new TextShape({
                        zlevel: serie.zlevel,
                        z: serie.z - 1,
                        hoverable: false,
                        style: {
                            x: isRightSide 
                                    ? radius[1] + this.scaleLineLength + 4 
                                    : -radius[1] - this.scaleLineLength - 4,
                            y: 0,
                            text: Math.round(scaleValue * 10) / 10 
                                    + unitPostfix,
                            textAlign: isRightSide ? 'left' : 'right'
                        },
                        position: center.slice(),
                        rotation: isRightSide
                            ? [-theta / 180 * Math.PI, 0, 0]
                            : [
                                -(theta + 180) / 180 * Math.PI,
                                0, 0
                              ]
                    });

                    this.shapeList.push(textShape);

                    scaleValue += step * unitScale;
                    scaleTextAngle += sign * this.scaleUnitAngle * 5;
                }
            }, this);
        },

        refresh : function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            
            this.legend = this.component.legend;
            if (this.legend) {
                this.getColor = function(param) {
                    return this.legend.getColor(param);
                };
                this.isSelected = function(param) {
                    return this.legend.isSelected(param);
                };
            }
            else {
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

        reformOption : function (opt) {
            var _merge = zrUtil.merge;
            opt = _merge(
                      _merge(
                          opt || {},
                          this.ecTheme.chord
                      ),
                      ecConfig.chord
                  );
            opt.itemStyle.normal.label.textStyle = this.getTextStyle(
                opt.itemStyle.normal.label.textStyle
            );
            this.z = opt.z;
            this.zlevel = opt.zlevel;
        }
    };
    
    zrUtil.inherits(Chord, ChartBase);
    
    // 图表注册
    require('../chart').define('chord', Chord);

    return Chord;
});

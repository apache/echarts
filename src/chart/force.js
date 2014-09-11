/**
 * echarts图表类：力导向图
 *
 * @author pissang (https://github.com/pissang/)
 *
 */

define(function (require) {
    'use strict';
    
    var ComponentBase = require('../component/base');
    var ChartBase = require('./base');

    var Graph = require('../data/Graph');
    var ForceLayout = require('../layout/Force');
    
    // 图形依赖
    var LineShape = require('zrender/shape/Line');
    var ImageShape = require('zrender/shape/Image');
    var IconShape = require('../util/shape/Icon');

    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrConfig = require('zrender/config');
    var vec2 = require('zrender/tool/vector');

    var requestAnimationFrame = window.requestAnimationFrame
                                || window.msRequestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame
                                || function (func){setTimeout(func, 16);};

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Force(ecTheme, messageCenter, zr, option, myChart) {
        var self = this;
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);

        // 保存节点的位置，改变数据时能够有更好的动画效果
        this.__nodePositionMap = {};

        this._graph = new Graph(true);
        this._layout = new ForceLayout();

        this._layout.onupdate = function() {
            self._step();
        }

        this._steps = 1;

        // 关闭可拖拽属性
        this.ondragstart = function() {
            ondragstart.apply(self, arguments);
        };
        this.ondragend = function() {
            ondragend.apply(self, arguments);
        };
        this.ondrop = function() {};
        this.shapeHandler.ondragstart = function() {
            self.isDragstart = true;
        };
        this.onmousemove = function() {
            onmousemove.apply(self, arguments);
        };
        this._init();
    }

    /**
     * 绘制图形
     */
    Force.prototype = {

        constructor: Force,

        type : ecConfig.CHART_TYPE_FORCE,

        _init: function() {
            var self = this;
            var legend = this.component.legend;
            var series = this.series;
            var serieName;

            this.clear();

            for (var i = 0, l = series.length; i < l; i++) {
                var serie = series[i];
                if (serie.type === ecConfig.CHART_TYPE_FORCE) {
                    series[i] = this.reformOption(series[i]);
                    serieName = series[i].name || '';
                    
                    // 系列图例开关
                    this.selectedMap[serieName] = 
                        legend ? legend.isSelected(serieName) : true;
                    if (!this.selectedMap[serieName]) {
                        continue;
                    }

                    this.buildMark(i);
                    
                    // 同步selected状态
                    var categories = serie.categories;
                    for (var j = 0, len = categories.length; j < len; j++) {
                        if (categories[j].name) {
                            if (legend){
                                this.selectedMap[j] = 
                                    legend.isSelected(categories[j].name);
                            } else {
                                this.selectedMap[j] = true;
                            }
                        }
                    }

                    // TODO 多个 force 
                    this._forceSerie = serie;

                    this._initSerie(serie);
                    break;
                }
            }
        },

        _initSerie: function(serie) {
            this._temperature = 1;

            var graph = this._graph;
            graph.clear();

            for (var i = 0, len = serie.nodes.length; i < len; i++) {
                var n = serie.nodes[i];
                if (
                    !n || n.ignore
                    || (n.category && !this.selectedMap[n.category])
                ) {
                    continue;
                }
                var node = graph.addNode(n.name, n);
                node.rawIndex = i;
            }
            for (var i = 0, len = serie.links.length; i < len; i++) {
                var e = serie.links[i];
                var n1 = e.source;
                var n2 = e.target;
                if (typeof(n1) === 'number') {
                    n1 = serie.nodes[n1];
                    if (n1) {
                        n1 = n1.name;
                    }
                }
                if (typeof(n2) === 'number') {
                    n2 = serie.nodes[n2];
                    if (n2) {
                        n2 = n2.name;
                    }
                }
                var edge = graph.addEdge(n1, n2, e);
                if (edge) {
                    edge.rawIndex = i;
                }
            }

            this._buildLinkShapes(serie);
            this._buildNodeShapes(serie);

            this._initLayout(serie);

            this._step();
        },

        _initLayout: function(serie) {
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

            // 将值映射到minRadius-maxRadius的范围上
            var min = Infinity; var max = -Infinity;
            for (var i = 0; i < len; i++) {
                var gNode = graph.nodes[i];
                gNode.layout = {
                    radius: gNode.data.value || 1,
                    mass: 0
                };
                max = Math.max(gNode.data.value, max);
                min = Math.min(gNode.data.value, min);
            }
            var divider = max - min;
            for (var i = 0; i < len; i++) {
                var gNode = graph.nodes[i];
                if (divider > 0) {
                    gNode.layout.radius = 
                        (gNode.layout.radius - min) * (maxRadius - minRadius) / divider
                        + minRadius;
                    // 节点质量是归一的
                    gNode.layout.mass = gNode.layout.radius / maxRadius;
                } else {
                    gNode.layout.radius = (maxRadius - minRadius) / 2;
                    gNode.layout.mass = 0.5;
                }
            }

            for (var i = 0; i < len; i++) {
                var initPos;
                var gNode = graph.nodes[i];
                if (typeof(this.__nodePositionMap[gNode.name]) !== 'undefined') {
                    gNode.layout.position = vec2.create();
                    vec2.copy(gNode.layout.position, this.__nodePositionMap[gNode.name]);
                }
                else if (typeof(gNode.data.initial) !== 'undefined') {
                    gNode.layout.position = vec2.create();
                    vec2.copy(gNode.layout.position, gNode.data.initial)
                }
                else {
                    var center = this._layout.center;
                    var size = Math.min(this._layout.width, this._layout.height);
                    gNode.layout.position = _randomInSquare(
                        center[0], center[1], size * 0.8
                    );
                }
                var style = gNode.shape.style;
                var radius = gNode.layout.radius;
                style.width = style.width || (radius * 2);
                style.height = style.height || (radius * 2);
                style.x = -style.width / 2;
                style.y = -style.height / 2;
                vec2.copy(gNode.shape.position, gNode.layout.position);
            }

            // 边
            len = graph.edges.length;
            max = -Infinity;
            for (var i = 0; i < len; i++) {
                var e = graph.edges[i];
                e.layout = {
                    weight: e.data.weight || 1
                }
                if (e.layout.weight > max) {
                    max = e.layout.weight;
                }
            }
            // 权重归一
            for (var i = 0; i < len; i++) {
                var e = graph.edges[i];
                e.layout.weight /= max;
            }

            this._layout.init(graph, serie.useWorker);
        },

        _buildNodeShapes: function(serie) {
            var graph = this._graph;

            var categories = this.query(serie, 'categories');
            var len = graph.nodes.length;
            var legend = this.component.legend;

            for (var i = 0; i < len; i++) {
                var gNode = graph.nodes[i];
                var node = gNode.data;

                var shape = new IconShape({
                    style : {
                        x : 0,
                        y : 0
                    },
                    clickable: this.query(serie, 'clickable'),
                    highlightStyle : {}
                });

                var queryTarget = [];
                var shapeNormalStyle = [];
                var shapeEmphasisStyle = [];

                queryTarget.push(node);
                if (node.itemStyle) {
                    shapeNormalStyle.push(node.itemStyle.normal);
                    shapeEmphasisStyle.push(node.itemStyle.emphasis);
                }
                if (typeof(node.category) !== 'undefined') {
                    var category = categories[node.category];
                    if (category) {
                        // 使用 Legend.getColor 配置默认 category 的默认颜色
                        category.itemStyle = category.itemStyle || {};
                        category.itemStyle.normal = category.itemStyle.normal || {};
                        category.itemStyle.normal.color = category.itemStyle.normal.color
                            || legend.getColor(category.name);

                        queryTarget.push(category);
                        shapeNormalStyle.unshift(category.itemStyle.normal);
                        shapeEmphasisStyle.unshift(category.itemStyle.emphasis);
                    }
                }
                queryTarget.push(serie);
                shapeNormalStyle.unshift(serie.itemStyle.normal.nodeStyle);
                shapeEmphasisStyle.unshift(serie.itemStyle.emphasis.nodeStyle);

                shape.style.iconType = this.deepQuery(queryTarget, 'symbol');
                // 强制设定节点大小，否则默认映射到 minRadius 到 maxRadius 后的值
                shape.style.width = shape.style.height
                    = (this.deepQuery(queryTarget, 'symbolSize') || 0) * 2;

                if (shape.style.iconType.match('image')) {
                    shape.style.image = shape.style.iconType.replace(
                        new RegExp('^image:\\/\\/'), ''
                    );
                    shape = new ImageShape({
                        style: shape.style,
                        highlightStyle: shape.highlightStyle,
                        clickable: shape.clickable
                    });
                }

                // 节点样式
                for (var k = 0; k < shapeNormalStyle.length; k++) {
                    if (shapeNormalStyle[k]) {
                        zrUtil.merge(shape.style, shapeNormalStyle[k], true);
                    }
                } 
                // 节点高亮样式
                for (var k = 0; k < shapeEmphasisStyle.length; k++) {
                    if (shapeEmphasisStyle[k]) {
                        zrUtil.merge(shape.highlightStyle, shapeEmphasisStyle[k], true);
                    }
                }
                
                // 节点标签样式
                if (this.deepQuery(queryTarget, 'itemStyle.normal.label.show')) {
                    shape.style.text = node.name;
                    shape.style.textPosition = 'inside';
                    var labelStyle = this.deepQuery(
                        queryTarget, 'itemStyle.normal.label.textStyle'
                    ) || {};
                    shape.style.textColor = labelStyle.color || '#fff';
                    shape.style.textAlign = labelStyle.align || 'center';
                    shape.style.textBaseline = labelStyle.baseline || 'middle';
                    shape.style.textFont = this.getFont(labelStyle);
                }

                if (this.deepQuery(queryTarget, 'itemStyle.emphasis.label.show')) {
                    shape.highlightStyle.text = node.name;
                    shape.highlightStyle.textPosition = 'inside';
                    var labelStyle = this.deepQuery(
                        queryTarget, 'itemStyle.emphasis.label.textStyle'
                    ) || {};
                    shape.highlightStyle.textColor = labelStyle.color || '#fff';
                    shape.highlightStyle.textAlign = labelStyle.align  || 'center';
                    shape.highlightStyle.textBaseline = labelStyle.baseline || 'middle';
                    shape.highlightStyle.textFont = this.getFont(labelStyle);
                }

                // 拖拽特性
                if (this.deepQuery(queryTarget, 'draggable')) {
                    this.setCalculable(shape);
                    shape.dragEnableTime = 0;
                    shape.draggable = true;
                    shape.ondragstart = this.shapeHandler.ondragstart;
                    shape.ondragover = null;
                }
                
                var categoryName = '';
                if (typeof(node.category) !== 'undefined') {
                    var category = categories[node.category];
                    categoryName = (category && category.name) || '';
                }
                // !!Pack data before addShape
                ecData.pack(
                    shape,
                    // category
                    {
                        name : categoryName
                    },
                    // series index
                    0,
                    // data
                    node,
                    // data index
                    gNode.rawIndex,
                    // name
                    node.name || '',
                    // value
                    node.value
                );
                
                this.shapeList.push(shape);
                this.zr.addShape(shape);

                gNode.shape = shape;
            }
        },

        _buildLinkShapes: function(serie) {
            var graph = this._graph;
            var len = graph.edges.length;

            for (var i = 0; i < len; i++) {
                var gEdge = graph.edges[i];
                var link = gEdge.data;
                var source = gEdge.node1;
                var target = gEdge.node2;

                var linkShape = new LineShape({
                    style : {
                        xStart : 0,
                        yStart : 0,
                        xEnd : 0,
                        yEnd : 0,
                        lineWidth : 1
                    },
                    clickable: this.query(serie, 'clickable'),
                    highlightStyle : {}
                });

                zrUtil.merge(
                    linkShape.style,
                    this.query(serie, 'itemStyle.normal.linkStyle'),
                    true
                );
                zrUtil.merge(
                    linkShape.highlightStyle,
                    this.query(serie, 'itemStyle.emphasis.linkStyle'),
                    true
                );
                if (typeof(link.itemStyle) !== 'undefined') {
                    if(link.itemStyle.normal){
                        zrUtil.merge(linkShape.style, link.itemStyle.normal, true);
                    }
                    if(link.itemStyle.emphasis){
                        zrUtil.merge(
                            linkShape.highlightStyle,
                            link.itemStyle.emphasis,
                            true
                        );
                    }
                }

                ecData.pack(
                    linkShape,
                    // serie
                    serie,
                    // serie index
                    0,
                    // link data
                    {
                        source : source.data,
                        target : target.data,
                        weight : gEdge.data.weight || 0
                    },
                    // link data index
                    gEdge.rawIndex,
                    // source name - target name
                    source.name + ' - ' + target.name,
                    // link weight
                    gEdge.data.weight || 0,
                    // special
                    // 这一项只是为了表明这是条边
                    true
                );

                this.shapeList.push(linkShape);
                this.zr.addShape(linkShape);
                gEdge.shape = linkShape;

                // Arrow shape
                if (serie.linkSymbol && serie.linkSymbol !== 'none') {
                    var symbolShape = new IconShape({
                        style: {
                            x: -5,
                            y: 0,
                            width: serie.linkSymbolSize[0],
                            height: serie.linkSymbolSize[1],
                            iconType: serie.linkSymbol,
                            brushType: 'fill',
                            // Use same style with link shape
                            color: linkShape.style.strokeColor,
                            opacity: linkShape.style.opacity,
                            shadowBlur: linkShape.style.shadowBlur,
                            shadowColor: linkShape.style.shadowColor,
                            shadowOffsetX: linkShape.style.shadowOffsetX,
                            shadowOffsetY: linkShape.style.shadowOffsetY
                        },
                        highlightStyle: {
                            brushType: 'fill'
                        },
                        position: [0, 0],
                        rotation: 0
                    });
                    linkShape._symbolShape = symbolShape;
                    this.shapeList.push(symbolShape);
                    this.zr.addShape(symbolShape);
                }
            }
        },

        _updateLinkShapes: function() {
            var v = vec2.create();
            var edges = this._graph.edges;
            for (var i = 0, len = edges.length; i < len; i++) {
                var edge = edges[i];
                var sourceShape = edge.node1.shape;
                var targetShape = edge.node2.shape;

                edge.shape.style.xStart = sourceShape.position[0];
                edge.shape.style.yStart = sourceShape.position[1];
                edge.shape.style.xEnd = targetShape.position[0];
                edge.shape.style.yEnd = targetShape.position[1];

                this.zr.modShape(edge.shape.id);

                if (edge.shape._symbolShape) {
                    var symbolShape = edge.shape._symbolShape;
                    vec2.copy(symbolShape.position, targetShape.position);

                    vec2.sub(v, sourceShape.position, targetShape.position);
                    vec2.normalize(v, v);

                    vec2.scaleAndAdd(
                        symbolShape.position, symbolShape.position,
                        v, targetShape.style.width / 2 + 2
                    );

                    var angle;
                    if (v[1] < 0) {
                        angle = 2 * Math.PI - Math.acos(-v[0]);
                    }
                    else {
                        angle = Math.acos(-v[0]);
                    }
                    symbolShape.rotation = angle - Math.PI / 2;

                    this.zr.modShape(symbolShape.id);
                }
            }
        },

        _syncNodePositions: function() {
            var graph = this._graph;
            for (var i = 0; i < graph.nodes.length; i++) {
                var gNode = graph.nodes[i];
                var position = gNode.layout.position;
                var node = gNode.data;
                var shape = gNode.shape;
                if (shape.fixed || (node.fixX && node.fixY)) {
                    vec2.copy(position, shape.position);
                }
                else if (node.fixX) {
                    position[0] = shape.position[0];
                    shape.position[1] = position[1];
                }
                else if (node.fixY) {
                    position[1] = shape.position[1];
                    shape.position[0] = position[0];
                }
                else  {
                    vec2.copy(shape.position, position);
                }

                var nodeName = node.name;
                if (nodeName) {
                    var gPos = this.__nodePositionMap[nodeName];
                    if (!gPos) {
                        gPos = this.__nodePositionMap[nodeName] = vec2.create();
                    }
                    vec2.copy(gPos, position);
                }

                this.zr.modShape(shape.id);
            }
        },

        _step: function(e) {
            this._syncNodePositions();

            this._updateLinkShapes();

            this.zr.refreshNextFrame();

            if (this._layout.temperature > 0.01) {
                this._layout.step(this._steps);
            }
        },

        refresh: function(newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = this.option.series;
            }
            this._init();
        },

        dispose: function(){
            this.clear();
            this.shapeList = null;
            this.effectList = null;

            this._layout.dispose();
            this._layout = null;

            this.__nodePositionMap = {};
        }
    };

    /**
     * 拖拽开始
     */
    function ondragstart(param) {
        if (!this.isDragstart || !param.target) {
            // 没有在当前实例上发生拖拽行为则直接返回
            return;
        }

        var shape = param.target;
        shape.fixed = true;

        // 处理完拖拽事件后复位
        this.isDragstart = false;

        this.zr.on(zrConfig.EVENT.MOUSEMOVE, this.onmousemove);
    }

    function onmousemove() {
        this._layout.temperature = 0.8;
        this._step();
    }
    
    /**
     * 数据项被拖拽出去，重载基类方法
     */
    function ondragend(param, status) {
        if (!this.isDragend || !param.target) {
            // 没有在当前实例上发生拖拽行为则直接返回
            return;
        }
        var shape = param.target;
        shape.fixed = false;

        // 别status = {}赋值啊！！
        status.dragIn = true;
        //你自己refresh的话把他设为false，设true就会重新调refresh接口
        status.needRefresh = false;

        // 处理完拖拽事件后复位
        this.isDragend = false;

        this.zr.un(zrConfig.EVENT.MOUSEMOVE, this.onmousemove);
    }
   
    function _randomInSquare(x, y, size) {
        var v = vec2.create();
        v[0] = (Math.random() - 0.5) * size + x;
        v[1] = (Math.random() - 0.5) * size + y;
        return v;
    }

    function _filter(array, callback){
        var len = array.length;
        var result = [];
        for(var i = 0; i < len; i++){
            if(callback(array[i], i)){
                result.push(array[i]);
            }
        }
        return result;
    }
    
    zrUtil.inherits(Force, ChartBase);
    zrUtil.inherits(Force, ComponentBase);
    
    // 图表注册
    require('../chart').define('force', Force);

    return Force;
});

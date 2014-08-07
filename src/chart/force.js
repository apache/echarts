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

    var ForceLayout = require('./forceLayoutWorker');
    
    // 图形依赖
    var LineShape = require('zrender/shape/Line');
    var IconShape = require('../util/shape/Icon');

    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrConfig = require('zrender/config');
    var vec2 = require('zrender/tool/vector');

    var NDArray = require('../util/ndarray');
    var ArrayCtor = typeof(Float32Array) == 'undefined' ? Array : Float32Array;

    var requestAnimationFrame = window.requestAnimationFrame
                                || window.msRequestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame
                                || function (func){setTimeout(func, 16);};

    // Use inline web worker
    var workerUrl;
    if (
        typeof(Worker) !== 'undefined' &&
        typeof(Blob) !== 'undefined'
    ) {
        try {
            var blob = new Blob([ForceLayout.getWorkerCode()]);
            workerUrl = window.URL.createObjectURL(blob);   
        } catch(e) {
            workerUrl = '';
        }
    }

    function getToken() {
        return Math.round(new Date().getTime() / 100) % 10000000;
    }

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
        // TODO
        this.__nodePositionMap = {};

        this._nodeShapes = [];
        this._linkShapes = [];

        this._updating = true;

        this._filteredNodes = null;
        this._filteredLinks = null;
        this._rawNodes = null;
        this._rawLinks = null;

        this._steps = 1;
        this._coolDown = 0.99;

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

            this.clear();

            this._updating = true;
        
            this._buildShape();

            if (this._layoutWorker) {
                this._layoutWorker.onmessage = function(e) {
                    if (self._temperature < 0.01) {
                        requestAnimationFrame(function() {
                            self._step.call(self, e);
                        });   
                    } else {
                        self._step.call(self, e);
                    }
                };

                this._layoutWorker.postMessage({
                    cmd: 'update',
                    steps: this._steps,
                    temperature: this._temperature,
                    coolDown: this._coolDown
                });
            }
            else {
                var cb = function() {
                    if (self._updating) {
                        self._step();
                        requestAnimationFrame(cb);
                    }
                };

                requestAnimationFrame(cb);
            }
        },

        _buildShape: function() {
            var legend = this.component.legend;
            var series = this.series;
            var serieName;

            this._temperature = 1;

            this.shapeList.length = 0;

            for (var i = 0, l = series.length; i < l; i++) {
                var serie = series[i];
                if (serie.type === ecConfig.CHART_TYPE_FORCE) {
                    series[i] = this.reformOption(series[i]);
                    serieName = series[i].name || '';
                    
                    if (workerUrl && serie.useWorker) {
                        try {
                            if (!this._layoutWorker) {
                                this._layoutWorker = new Worker(workerUrl);
                            }
                            this._layout = null;   
                        } catch(e) {    // IE10-11 will throw security error when using blog url
                            this._layoutWorker = null;
                            if (!this._layout) {
                                this._layout = new ForceLayout();
                            }
                        }
                    } else {
                        if (!this._layout) {
                            this._layout = new ForceLayout();
                        }
                        if (this._layoutWorker) {
                            this._layoutWorker.terminate();
                            this._layoutWorker = null;
                        }
                    }

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

                    this._preProcessData(serie);

                    this._nodeShapes.length = 0;
                    this._linkShapes.length = 0;

                    this._buildLinkShapes(serie);
                    this._buildNodeShapes(serie);

                    this._initLayout(serie);

                    this._updateLinkShapes();

                    // TODO 多个 force 
                    this._forceSerie = serie;
                    break;
                }
            }
        },

        _preProcessData: function(serie) {
            this._rawNodes = this.query(serie, 'nodes');
            this._rawLinks = zrUtil.clone(this.query(serie, 'links'));

            var filteredNodeList = [];
            var filteredNodeMap = {};
            var cursor = 0;
            var self = this;
            this._filteredNodes = _filter(this._rawNodes, function (node, i) {
                if (!node) {
                    return;
                }
                if (node.ignore) {
                    return;
                }
                var idx = -1;
                if (
                    typeof(node.category) == 'undefined'
                    || self.selectedMap[node.category]
                ) {
                    idx = cursor++;
                }
                if (node.name) {
                    filteredNodeMap[node.name] = idx;
                }
                filteredNodeList[i] = idx;

                return idx >= 0;
            });
            var source;
            var target;
            this._filteredLinks = _filter(this._rawLinks, function (link, i){
                source = link.source;
                target = link.target;
                var ret = true;
                var idx = typeof(source) === 'string'
                    ? filteredNodeMap[source]    // source 用 node id 表示
                    : filteredNodeList[source];  // source 用 node index 表示
                if (typeof(idx) == 'undefined') {
                    idx = -1;
                }

                if (idx >= 0) {
                    link.source = idx;
                } else {
                    ret = false;
                }

                var idx = typeof(target) === 'string'
                    ? filteredNodeMap[target]    // target 用 node id 表示
                    : filteredNodeList[target];  // target 用 node index 表示
                if (typeof(idx) == 'undefined') {
                    idx = -1;
                }

                if (idx >= 0) {
                    link.target = idx;
                } else {
                    ret = false;
                }
                // 保存原始链接中的index
                link.rawIndex = i;

                return ret;
            });
        },

        _initLayout: function(serie) {

            var nodes = this._filteredNodes;
            var links = this._filteredLinks;
            var shapes = this._nodeShapes;
            var len = nodes.length;

            var minRadius = this.query(serie, 'minRadius');
            var maxRadius = this.query(serie, 'maxRadius');
            this._steps = serie.steps || 1;
            this._coolDown = serie.coolDown || 0.99;

            var center = this.parseCenter(this.zr, serie.center);
            var width = this.parsePercent(serie.size, this.zr.getWidth());
            var height = this.parsePercent(serie.size, this.zr.getHeight());
            var size = Math.min(width, height);

            // 将值映射到minRadius-maxRadius的范围上
            var radius = [];
            for (var i = 0; i < len; i++) {
                var node = nodes[i];
                radius.push(node.value || 1);
            }

            var arr = new NDArray(radius);
            radius = arr.map(minRadius, maxRadius).toArray();
            var max = arr.max();
            if (max === 0) {
                return;
            }
            var massArr = arr.mul(1/max, arr).toArray();
            var positionArr = new ArrayCtor(len * 2);

            for (var i = 0; i < len; i++) {
                var initPos;
                var node = nodes[i];
                if (typeof(this.__nodePositionMap[node.name]) !== 'undefined') {
                    initPos = vec2.create();
                    vec2.copy(initPos, this.__nodePositionMap[node.name]);
                } else if (typeof(node.initial) !== 'undefined') {
                    initPos = Array.prototype.slice.call(node.initial);
                } else {
                    initPos = _randomInSquare(
                        center[0], center[1], size * 0.8
                    );
                }
                var style = shapes[i].style;
                style.width = style.width || (radius[i] * 2);
                style.height = style.height || (radius[i] * 2);
                style.x = -style.width / 2;
                style.y = -style.height / 2;
                shapes[i].position = initPos;

                positionArr[i * 2] = initPos[0];
                positionArr[i * 2 + 1] = initPos[1];
            }

            len = links.length;
            var edgeArr = new ArrayCtor(len * 2);
            var edgeWeightArr = new ArrayCtor(len);
            for (var i = 0; i < len; i++) {
                var link = links[i];
                edgeArr[i * 2] = link.source;
                edgeArr[i * 2 + 1] = link.target;
                edgeWeightArr[i] = link.weight || 1;
            }

            arr = new NDArray(edgeWeightArr);
            var max = arr.max();
            if (max === 0) {
                return;
            }
            var edgeWeightArr = arr.mul(1 / max, arr)._array;

            var config = {
                center: center,
                width: serie.ratioScaling ? width : size,
                height: serie.ratioScaling ? height : size,
                scaling: serie.scaling || 1.0,
                gravity: serie.gravity || 1.0,
                barnesHutOptimize: serie.large
            };

            if (this._layoutWorker) {

                this._token = getToken();

                this._layoutWorker.postMessage({
                    cmd: 'init',
                    nodesPosition: positionArr,
                    nodesMass: massArr,
                    nodesSize: radius,
                    edges: edgeArr,
                    edgesWeight: edgeWeightArr,
                    token: this._token
                });

                this._layoutWorker.postMessage({
                    cmd: 'updateConfig',
                    config: config
                });

            } else {

                zrUtil.merge(this._layout, config, true);
                this._layout.initNodes(positionArr, massArr, radius);
                this._layout.initEdges(edgeArr, edgeWeightArr);   
            }
        },

        _buildNodeShapes: function(serie) {
            var categories = this.query(serie, 'categories');
            var nodes = this._filteredNodes;
            var len = nodes.length;
            var legend = this.component.legend;

            for (var i = 0; i < len; i++) {
                var node = nodes[i];

                var shape = new IconShape({
                    style : {
                        x : 0,
                        y : 0
                    },
                    clickable : true,
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
                    zrUtil.indexOf(this._rawNodes, node),
                    // name
                    node.name || '',
                    // value
                    node.value
                );
                
                this._nodeShapes.push(shape);
                this.shapeList.push(shape);
                this.zr.addShape(shape);
            }
        },

        _buildLinkShapes: function(serie) {

            var nodes = this._filteredNodes;
            var links = this._filteredLinks;
            var len = links.length;

            for (var i = 0; i < len; i++) {
                var link = links[i];
                var source = nodes[link.source];
                var target = nodes[link.target];

                var linkShape = new LineShape({
                    style : {
                        xStart : 0,
                        yStart : 0,
                        xEnd : 0,
                        yEnd : 0,
                        lineWidth : 1
                    },
                    clickable : true,
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

                var link = this._rawLinks[link.rawIndex];
                ecData.pack(
                    linkShape,
                    // serie
                    serie,
                    // serie index
                    0,
                    // link data
                    {
                        source : link.source,
                        target : link.target,
                        weight : link.weight || 0
                    },
                    // link data index
                    link.rawIndex,
                    // source name - target name
                    source.name + ' - ' + target.name,
                    // link weight
                    link.weight || 0,
                    // special
                    // 这一项只是为了表明这是条边
                    true
                );

                this._linkShapes.push(linkShape);
                this.shapeList.push(linkShape);
                this.zr.addShape(linkShape);

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
            var links = this._filteredLinks;
            for (var i = 0, len = links.length; i < len; i++) {
                var link = links[i];
                var linkShape = this._linkShapes[i];
                var sourceShape = this._nodeShapes[link.source];
                var targetShape = this._nodeShapes[link.target];

                linkShape.style.xStart = sourceShape.position[0];
                linkShape.style.yStart = sourceShape.position[1];
                linkShape.style.xEnd = targetShape.position[0];
                linkShape.style.yEnd = targetShape.position[1];

                this.zr.modShape(linkShape.id);

                if (linkShape._symbolShape) {
                    var symbolShape = linkShape._symbolShape;
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
                    } else {
                        angle = Math.acos(-v[0]);
                    }
                    symbolShape.rotation = angle  - Math.PI / 2;

                    this.zr.modShape(symbolShape.id);
                }
            }
        },

        _update: function(e) {

            this._layout.temperature = this._temperature;
            this._layout.update();

            for (var i = 0; i < this._layout.nodes.length; i++) {
                var position = this._layout.nodes[i].position;
                var shape = this._nodeShapes[i];
                var node = this._filteredNodes[i];
                if (shape.fixed || (node.fixX && node.fixY)) {
                    vec2.copy(position, shape.position);
                } else if (node.fixX) {
                    position[0] = shape.position[0];
                    shape.position[1] = position[1];
                } else if (node.fixY) {
                    position[1] = shape.position[1];
                    shape.position[0] = position[0];
                } else  {
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
            }

            this._temperature *= this._coolDown;
        },

        _updateWorker: function(e) {
            if (!this._updating) {
                return;
            }

            var positionArr = new Float32Array(e.data);
            var token = positionArr[0];
            var ret = token === this._token;
            // If token is from current layout instance
            if (ret) {
                var nNodes = (positionArr.length - 1) / 2;

                for (var i = 0; i < nNodes; i++) {
                    var shape = this._nodeShapes[i];
                    var node = this._filteredNodes[i];
                    
                    var x = positionArr[i * 2 + 1];
                    var y = positionArr[i * 2 + 2];

                    if (shape.fixed || (node.fixX && node.fixY)) {
                        positionArr[i * 2 + 1] = shape.position[0];
                        positionArr[i * 2 + 2] = shape.position[1];
                    } else if (node.fixX) {
                        positionArr[i * 2 + 1] = shape.position[0];
                        shape.position[1] = y;
                    } else if (node.fixY) {
                        positionArr[i * 2 + 2] = shape.position[1];
                        shape.position[0] = x;
                    } else  {
                        shape.position[0] = x;
                        shape.position[1] = y;
                    }

                    var nodeName = node.name;
                    if (nodeName) {
                        var gPos = this.__nodePositionMap[nodeName];
                        if (!gPos) {
                            gPos = this.__nodePositionMap[nodeName] = vec2.create();
                        }
                        vec2.copy(gPos, shape.position);
                    }
                }

                this._layoutWorker.postMessage(positionArr.buffer, [positionArr.buffer]);
            }

            var self = this;
            self._layoutWorker.postMessage({
                cmd: 'update',
                steps: this._steps,
                temperature: this._temperature,
                coolDown: this._coolDown
            });  

            for (var i = 0; i < this._steps; i++) {
                this._temperature *= this._coolDown;
            }

            return ret;
        },

        _step: function(e){
            if (this._layoutWorker) {
                var res = this._updateWorker(e);
                if (!res) {
                    return;
                }
            } else {
                if (this._temperature < 0.01) {
                    return;
                }
                this._update();
            }

            this._updateLinkShapes();

            for (var i = 0; i < this._nodeShapes.length; i++) {
                this.zr.modShape(this._nodeShapes[i].id);
            }

            this.zr.refresh();
        },

        refresh: function(newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = this.option.series;
            }
            this.clear();
            this._buildShape();
        },

        dispose: function(){
            this._updating = false;
            this.clear();
            this.shapeList = null;
            this.effectList = null;

            if (this._layoutWorker) {
                this._layoutWorker.terminate();
            }
            this._layoutWorker = null;

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
        this._temperature = 0.8;
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
        return [
            (Math.random() - 0.5) * size + x,
            (Math.random() - 0.5) * size + y
        ];
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

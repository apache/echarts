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
    
    // 图形依赖
    var CircleShape = require('zrender/shape/Circle');
    var LineShape = require('zrender/shape/Line');
    var IconShape = require('../util/shape/Icon');

    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrConfig = require('zrender/config');
    var zrEvent = require('zrender/tool/event');
    var vec2 = require('zrender/tool/vector');

    var NDArray = require('../util/ndarray');
        
    var requestAnimationFrame = window.requestAnimationFrame
                                || window.msRequestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame
                                || function (func){setTimeout(func, 16);};

    // 保存节点的位置，改变数据时能够有更好的动画效果
    var nodeInitialPos = {};

    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Force(ecTheme, messageCenter, zr, option, myChart) {
        // 基类
        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        // 图表基类
        ChartBase.call(this);

        var component = myChart.component;
        var legend;
        var self = this;
        self.type = ecConfig.CHART_TYPE_FORCE;

        var series;

        var forceSerie;

        var nodeShapes = [];
        var linkShapes = [];
        var arrowShapes = [];

        // 节点分类
        var categories = [];
        // 默认节点样式
        var nodeStyle;
        var nodeEmphasisStyle;
        // 默认边样式
        var linkStyle;
        var linkEmphasisStyle;

        var rawNodes;
        var rawLinks;

        // nodes和links过滤后的原始数据
        var filteredNodes = [];
        var filteredLinks = [];

        // nodes和links的权重, 用来计算引力和斥力
        var nodeWeights = [];
        var linkWeights = [];

        // 节点的受力
        var nodeForces = [];
        // 节点的位置
        var nodePositions = [];
        var nodePrePositions = [];
        // 节点的质量
        var nodeMasses = [];

        var temperature;
        var k;
        
        //- ----------外部参数
        var density;
        var initSize;
        var coolDown;
        var centripetal;
        // var initializeSize; // defined but never used
        var attractiveness;
        //- ----------

        var stepTime = 1/60;
        
        var viewportWidth;
        var viewportHeight;
        var centroid = [];

        var mouseX, mouseY;
        
        /**
         * 绘制图形
         */
        function _buildShape() {
            legend = component.legend;
            temperature = 1.0;
            viewportWidth = zr.getWidth();
            viewportHeight = zr.getHeight();
            centroid = [viewportWidth/2, viewportHeight/2];
            
            var serieName;
            for (var i = 0, l = series.length; i < l; i++) {
                var serie = series[i];
                if (serie.type === ecConfig.CHART_TYPE_FORCE) {
                    series[i] = self.reformOption(series[i]);
                    serieName = series[i].name || '';
                    // 系列图例开关
                    self.selectedMap[serieName] = 
                        legend ? legend.isSelected(serieName) : true;
                    if (!self.selectedMap[serieName]) {
                        continue;
                    }
                    self.buildMark(i);
                    
                    forceSerie = serie;

                    var minRadius = self.query(serie, 'minRadius');
                    var maxRadius = self.query(serie, 'maxRadius');

                    // ----------获取外部参数
                    attractiveness = self.query(
                        serie, 'attractiveness'
                    );
                    density = self.query(serie, 'density');
                    initSize = self.query(serie, 'initSize');
                    centripetal = self.query(serie, 'centripetal');
                    coolDown = self.query(serie, 'coolDown');
                    // ----------

                    categories = self.query(serie, 'categories');
                    
                    // 同步selected状态
                    for (var j = 0, len = categories.length; j < len; j++) {
                        if (categories[j].name) {
                            if (legend){
                                self.selectedMap[j] = 
                                    legend.isSelected(categories[j].name);
                            } else {
                                self.selectedMap[j] = true;
                            }
                        }
                    }

                    linkStyle = self.query(
                        serie, 'itemStyle.normal.linkStyle'
                    );
                    linkEmphasisStyle = self.query(
                        serie, 'itemStyle.emphasis.linkStyle'
                    );
                    nodeStyle = self.query(
                        serie, 'itemStyle.normal.nodeStyle'
                    );
                    nodeEmphasisStyle = self.query(
                        serie, 'itemStyle.emphasis.nodeStyle'
                    );
                    
                    rawNodes = self.query(serie, 'nodes');
                    rawLinks = zrUtil.clone(self.query(serie, 'links'));
                    _preProcessData(rawNodes, rawLinks);
                    // Reset data
                    nodePositions.length = 0;
                    nodePrePositions.length = 0;
                    nodeMasses.length = 0;
                    nodeWeights.length = 0;
                    linkWeights.length = 0;
                    nodeMasses.length = 0;
                    nodeShapes.length = 0;
                    linkShapes.length = 0;
                    arrowShapes.length = 0;

                    var area = viewportWidth * viewportHeight;

                    // Formula in 'Graph Drawing by Force-directed Placement'
                    k = 0.5 / attractiveness 
                        * Math.sqrt(area / filteredNodes.length);
                    
                    // 这两方法里需要加上读取self.selectedMap判断当前系列是否显示的逻辑
                    _buildLinkShapes(filteredNodes, filteredLinks);
                    _buildNodeShapes(filteredNodes, minRadius, maxRadius);
                }
            }
        }

        function _preProcessData(nodes, links) {
            var filteredNodeMap = [];
            var cursor = 0;
            filteredNodes = _filter(nodes, function (node, idx) {
                if (!node) {
                    return;
                }
                if (node.ignore) {
                    return;
                }
                if (self.selectedMap[node.category]) {
                    filteredNodeMap[idx] = cursor++;
                    return true;
                } else {
                    filteredNodeMap[idx] = -1;
                }
            });
            var source;
            var target;
            var ret;
            filteredLinks = _filter(links, function (link, idx){
                source = link.source;
                target = link.target;
                ret = true;
                if (filteredNodeMap[source] >= 0) {
                    link.source = filteredNodeMap[source];
                } else {
                    ret = false;
                }
                if (filteredNodeMap[target] >= 0) {
                    link.target = filteredNodeMap[target];
                } else {
                    ret = false;
                }
                // 保存原始链接中的index
                link.rawIndex = idx;

                return ret;
            });
        }

        function _buildNodeShapes(nodes, minRadius, maxRadius) {
            // 将值映射到minRadius-maxRadius的范围上
            var radius = [];
            var l = nodes.length;
            for (var i = 0; i < l; i++) {
                var node = nodes[i];
                if (node.value !== undefined) {
                    radius.push(node.value);
                } else {
                    radius.push(1);
                }
            }

            var narr = new NDArray(radius);
            radius = narr.map(minRadius, maxRadius)
                        .toArray();
            var max = narr.max();
            if (max !== 0) {
                nodeWeights = narr.mul(1/max, narr).toArray();
            }

            for (var i = 0; i < l; i++) {
                var node = nodes[i];
                var x, y;
                var r = radius[i];

                var initPos;
                if (nodeInitialPos[node.name] !== undefined) {
                    initPos = nodeInitialPos[node.name];
                } else if (node.initial !== undefined) {
                    initPos = node.initial;
                } else {
                    initPos = _randomInSquare(
                        viewportWidth/2, viewportHeight/2, initSize
                    );
                }
                var x = initPos[0];
                var y = initPos[1];
                // 初始化位置
                nodePositions[i] = vec2.create(x, y);
                nodePrePositions[i] = vec2.create(x, y);
                // 初始化受力
                nodeForces[i] = vec2.create(0, 0);
                // 初始化质量
                nodeMasses[i] = r * r * density * 0.035;

                var shape = {
                    style : {
                        r : r,
                        x : 0,
                        y : 0
                    },
                    clickable : true,
                    highlightStyle : {},
                    position : [x, y],
                    __forceIndex : i
                };

                // Label 
                var labelStyle;
                if (self.query(forceSerie, 'itemStyle.normal.label.show')) {
                    shape.style.text = node.name;
                    shape.style.textPosition = 'inside';
                    labelStyle = self.query(
                        forceSerie, 'itemStyle.normal.label.textStyle'
                    ) || {};
                    shape.style.textColor = labelStyle.color || '#fff';
                    shape.style.textAlign = labelStyle.align || 'center';
                    shape.style.textBaseline = labelStyle.baseline || 'middle';
                    shape.style.textFont = self.getFont(labelStyle);
                }

                if (self.query(forceSerie, 'itemStyle.emphasis.label.show')) {
                    shape.highlightStyle.text = node.name;
                    shape.highlightStyle.textPosition = 'inside';
                    labelStyle = self.query(
                        forceSerie, 'itemStyle.emphasis.label.textStyle'
                    ) || {};
                    shape.highlightStyle.textColor = labelStyle.color || '#fff';
                    shape.highlightStyle.textAlign = labelStyle.align 
                                                     || 'center';
                    shape.highlightStyle.textBaseline = labelStyle.baseline 
                                                        || 'middle';
                    shape.highlightStyle.textFont = self.getFont(labelStyle);
                }

                // 优先级 node.style > category.style > defaultStyle
                zrUtil.merge(shape.style, nodeStyle);
                zrUtil.merge(shape.highlightStyle, nodeEmphasisStyle);

                if (typeof(node.category) !== 'undefined') {
                    var category = categories[node.category];
                    if (category) {
                        if (legend) {
                            shape.style.color = legend.getColor(category.name);
                        }
                        var style = category.itemStyle;
                        if (style) {
                            if (style.normal) {
                                zrUtil.merge(shape.style, style.normal, true);
                            }
                            if (style.emphasis) {
                                zrUtil.merge(
                                    shape.highlightStyle, 
                                    style.emphasis, 
                                    true
                                );
                            }
                        }
                    }
                }
                if (typeof(node.itemStyle) !== 'undefined') {
                    var style = node.itemStyle;
                    if(style.normal ){ 
                        zrUtil.merge(shape.style, style.normal, true);
                    }
                    if(style.normal ){ 
                        zrUtil.merge(shape.highlightStyle, style.emphasis, true);
                    }
                }
                
                // 拖拽特性
                if (forceSerie.draggable) {
                    self.setCalculable(shape);
                    shape.dragEnableTime = 0;
                    shape.ondragstart = self.shapeHandler.ondragstart;
                    shape.draggable = forceSerie.draggable;
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
                    zrUtil.indexOf(rawNodes, node),
                    // name
                    node.name || '',
                    // value
                    node.value
                );
                
                shape = new CircleShape(shape);
                nodeShapes.push(shape);
                self.shapeList.push(shape);
                zr.addShape(shape);
            }

            // _normalize(nodeMasses, nodeMasses);
        }

        function _buildLinkShapes(nodes, links) {
            var l = links.length;

            for (var i = 0; i < l; i++) {
                var link = links[i];
                // var source = nodes[link.source];
                // var target = nodes[link.target];
                if (link.weight !== undefined) {
                    linkWeights.push(link.weight);
                } else {
                    linkWeights.push(1);
                }

                var linkShape = {
                    style : {
                        xStart : 0,
                        yStart : 0,
                        xEnd : 0,
                        yEnd : 0,
                        lineWidth : 1
                    },
                    clickable : true,
                    highlightStyle : {}
                };

                zrUtil.merge(linkShape.style, linkStyle);
                zrUtil.merge(linkShape.highlightStyle, linkEmphasisStyle);
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

                var source = filteredNodes[link.source];
                var target = filteredNodes[link.target];

                var link = rawLinks[link.rawIndex];
                ecData.pack(
                    linkShape,
                    // serie
                    forceSerie,
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

                linkShape = new LineShape(linkShape);
                linkShapes.push(linkShape);
                self.shapeList.push(linkShape);
                zr.addShape(linkShape);

                // Arrow shape
                if (forceSerie.linkSymbol && forceSerie.linkSymbol !== 'none') {
                    var arrowShape = {
                        style: {
                            x: -5,
                            y: 0,
                            width: forceSerie.linkSymbolSize[0],
                            height: forceSerie.linkSymbolSize[1],
                            iconType: forceSerie.linkSymbol,
                            brushType: 'fill',
                            // Use same style with link shape
                            color: linkShape.style.strokeColor,
                            opacity: linkShape.style.opacity,
                            shadowBlur: linkShape.style.shadowBlur,
                            shadowColor: linkShape.style.shadowColor,
                            shadowOffsetX: linkShape.style.shadowOffsetX,
                            shadowOffsetY: linkShape.style.shadowOffsetY,
                        },
                        highlightStyle: {
                            brushType: 'fill'
                        },
                        position: [0, 0],
                        rotation: 0
                    };
                    arrowShape = new IconShape(arrowShape);
                    self.shapeList.push(arrowShape);
                    arrowShapes.push(arrowShape);
                    zr.addShape(arrowShape);
                }
            }

            var narr = new NDArray(linkWeights);
            var max = narr.max();
            if (max !== 0) {
                linkWeights = narr.mul(1/max, narr).toArray();
            }
        }

        function _updateLinkShapes() {
            var v = vec2.create();
            //var right = vec2.create(1, 0);
            for (var i = 0, len = filteredLinks.length; i < len; i++) {
                var link = filteredLinks[i];
                var linkShape = linkShapes[i];
                var sourceShape = nodeShapes[link.source];
                var targetShape = nodeShapes[link.target];

                linkShape.style.xStart = sourceShape.position[0];
                linkShape.style.yStart = sourceShape.position[1];
                linkShape.style.xEnd = targetShape.position[0];
                linkShape.style.yEnd = targetShape.position[1];

                if (forceSerie.linkSymbol) {
                    var arrowShape = arrowShapes[i];
                    vec2.copy(arrowShape.position, targetShape.position);

                    vec2.sub(v, sourceShape.position, targetShape.position);
                    vec2.normalize(v, v);

                    vec2.scaleAndAdd(
                        arrowShape.position, arrowShape.position, v, targetShape.style.r + 2
                    );
                    var angle;
                    if (v[1] < 0) {
                        angle = 2 * Math.PI - Math.acos(-v[0]);
                    } else {
                        angle = Math.acos(-v[0]);
                    }
                    arrowShape.rotation = angle  - Math.PI / 2;
                }
            }
        }

        function _update(stepTime) {
            var len = nodePositions.length;
            var v12 = [];
            // 计算节点之间斥力
            var k2 = k*k;
            // Reset force
            for (var i = 0; i < len; i++) {
                nodeForces[i][0] = 0;
                nodeForces[i][1] = 0;
            }
            for (var i = 0; i < len; i++) {
                for (var j = i+1; j < len; j++){
                    var w1 = nodeWeights[i];
                    var w2 = nodeWeights[j];
                    var p1 = nodePositions[i];
                    var p2 = nodePositions[j];

                    // 节点1到2的向量
                    vec2.sub(v12, p2, p1);
                    var d = vec2.length(v12);
                    // 距离大于500忽略斥力
                    if(d > 500){
                        continue;
                    }
                    if(d < 5){
                        d = 5;
                    }

                    vec2.scale(v12, v12, 1 / d);
                    var forceFactor = 1 * (w1 + w2) * k2 / d;

                    //节点1受到的力
                    vec2.scaleAndAdd(
                        nodeForces[i], nodeForces[i], v12, -forceFactor
                    );
                    //节点2受到的力
                    vec2.scaleAndAdd(
                        nodeForces[j], nodeForces[j], v12, forceFactor
                    );
                }
            }
            // 计算节点之间引力
            for (var i = 0, l = filteredLinks.length; i < l; i++) {
                var link = filteredLinks[i];
                var w = linkWeights[i];
                var s = link.source;
                var t = link.target;
                var p1 = nodePositions[s];
                var p2 = nodePositions[t];

                vec2.sub(v12, p2, p1);
                var d2 = vec2.lengthSquare(v12);
                if (d2 === 0) {
                    continue;
                }

                var forceFactor = w * d2 / k / Math.sqrt(d2);
                // 节点1受到的力
                vec2.scaleAndAdd(
                    nodeForces[s], nodeForces[s], v12, forceFactor
                );
                // 节点2受到的力
                vec2.scaleAndAdd(
                    nodeForces[t], nodeForces[t], v12, -forceFactor
                );
            }
            // 到质心的向心力
            for (var i = 0, l = filteredNodes.length; i < l; i++){
                var p = nodePositions[i];
                vec2.sub(v12, centroid, p);
                var d2 = vec2.lengthSquare(v12);
                var forceFactor = d2 * centripetal / (100 * Math.sqrt(d2));
                vec2.scaleAndAdd(
                    nodeForces[i], nodeForces[i], v12, forceFactor
                );
            }
            var velocity = [];
            // 计算位置(verlet积分)
            for (var i = 0, l = nodePositions.length; i < l; i++) {
                var node = filteredNodes[i];
                var name = filteredNodes[i].name;
                if (filteredNodes[i].fixed) {
                    // 拖拽同步
                    vec2.set(nodePositions[i], mouseX, mouseY);
                    vec2.set(nodePrePositions[i], mouseX, mouseY);
                    vec2.set(nodeShapes[i].position, mouseX, mouseY);
                    if (nodeInitialPos[name] !== undefined) {
                        vec2.set(nodeInitialPos[name], mouseX, mouseY);
                    }
                    continue;
                }
                var p = nodePositions[i];
                var __P = nodePrePositions[i];
                vec2.sub(velocity, p, __P);
                __P[0] = p[0];
                __P[1] = p[1];
                vec2.scaleAndAdd(
                    velocity, velocity,
                    nodeForces[i],
                    stepTime / nodeMasses[i]
                );
                // Damping
                vec2.scale(velocity, velocity, temperature);
                // 防止速度太大
                velocity[0] = Math.max(Math.min(velocity[0], 100), -100);
                velocity[1] = Math.max(Math.min(velocity[1], 100), -100);

                vec2.add(p, p, velocity);

                if (node.fixY && node.initial) {
                    p[1] = node.initial[1];
                }
                if (node.fixX && node.initial) {
                    p[0] = node.initial[0];
                }

                vec2.copy(nodeShapes[i].position, p);

                if (name) {
                    if (!nodeInitialPos[name]) {
                        nodeInitialPos[name] = vec2.create();
                    }
                    vec2.copy(nodeInitialPos[name], p);
                }

                // if(isNaN(p[0]) || isNaN(p[1])){
                //     throw new Error('NaN');
                // }
            }
        }

        function _step(){
            if (temperature < 0.01) {
                return;
            }

            _update(stepTime);
            _updateLinkShapes();

            //var tmp = {};
            for (var i = 0; i < nodeShapes.length; i++) {
                //var shape = nodeShapes[i];
                //tmp.position = shape.position;
                zr.modShape(nodeShapes[i].id);
            }
            //tmp = {};
            for (var i = 0; i < linkShapes.length; i++) {
                //var shape = linkShapes[i];
                //tmp.style = shape.style;
                zr.modShape(linkShapes[i].id);
            }

            //tmp = {};
            for (var i = 0; i < arrowShapes.length; i++) {
                //var shape = arrowShapes[i];
                //tmp.position = shape.position;
                //tmp.rotation = shape.rotation;
                zr.modShape(arrowShapes[i].id);
            }

            zr.refresh();

            // Cool Down
            temperature *= coolDown;
        }

        var _updating;
        function init(newOption, newComponent) {
            option = newOption;
            component = newComponent;

            series = option.series;

            self.clear();
            _buildShape();

            _updating = true;
            function cb() {
                if (_updating) {
                    _step();
                    requestAnimationFrame(cb);
                }
            }
            requestAnimationFrame(cb);
        }

        function refresh(newOption) {
            if (newOption) {
                option = newOption;
                series = option.series;
            }
            self.clear();
            _buildShape();
            temperature = 1.0;
        }

        function dispose(){
            _updating = false;
            self.clear();
            self.shapeList = null;
            self.effectList = null;
        }

        /**
         * 输出动态视觉引导线
         */
        self.shapeHandler.ondragstart = function () {
            self.isDragstart = true;
        };
        
        function onclick() { }

        /**
         * 拖拽开始
         */
        function ondragstart(param) {
            if (!self.isDragstart || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            if (!(forceSerie && forceSerie.draggable)) {
                return;
            }
            var shape = param.target;
            var idx = shape.__forceIndex;
            var node = filteredNodes[idx];
            node.fixed = true;

            // 处理完拖拽事件后复位
            self.isDragstart = false;
            
            zr.on(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
        }
        
        /**
         * 数据项被拖拽出去，重载基类方法
         */
        function ondragend(param, status) {
            if (!self.isDragend || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            var shape = param.target;
            var idx = shape.__forceIndex;
            var node = filteredNodes[idx];
            node.fixed = false;

            // 别status = {}赋值啊！！
            status.dragIn = true;
            //你自己refresh的话把他设为false，设true就会重新调refresh接口
            status.needRefresh = false;

            // 处理完拖拽事件后复位
            self.isDragend = false;
            
            zr.un(zrConfig.EVENT.MOUSEMOVE, _onmousemove);
        }

        // 拖拽中位移信息
        function _onmousemove(param) {
            temperature = 0.8;
            mouseX = zrEvent.getX(param.event);
            mouseY = zrEvent.getY(param.event);
        }
        
        self.init = init;
        self.refresh = refresh;
        self.ondragstart = ondragstart;
        self.ondragend = ondragend;
        self.dispose = dispose;
        self.onclick = onclick;

        init(option, component);
    }
    
    /*
    function _randomInCircle(x, y, radius) {
        var theta = Math.random() * Math.PI * 2;
        var r = radius * Math.random();
        return [
            Math.cos(theta) * r + x,
            Math.sin(theta) * r + y
        ];
    }
    */
   
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
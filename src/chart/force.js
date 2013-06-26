/**
 * echarts图表类：力导向图
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @author pissang (shenyi01@baidu.com)
 *
 */

define(function(require) {
    
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} series 数据
     * @param {Object} component 组件
     */
    function Force(messageCenter, zr, option, component) {
        // 基类装饰
        var ComponentBase = require('../component/base');
        ComponentBase.call(this, zr);
        // 可计算特性装饰
        var CalculableBase = require('./calculableBase');
        CalculableBase.call(this, zr, option);

        var ecConfig = require('../config');
        var ecData = require('../util/ecData');

        var zrConfig = require('zrender/config');
        var zrEvent = require('zrender/tool/event');
        var zrColor = require('zrender/tool/color');
        var zrUtil = require('zrender/tool/util');
        var vec2 = require('zrender/tool/vector');

        var self = this;
        self.type = ecConfig.CHART_TYPE_FORCE;

        var series;

        var forceSerie;
        var forceSerieIndex;

        var nodeShapes = [];
        var linkShapes = [];

        // 节点分类
        var categories = [];
        // 默认节点样式
        var nodeStyle;
        var nodeEmphasisStyle;
        // 默认边样式
        var linkStyle;
        var linkEmphasisStyle;
        // nodes和links的原始数据
        var nodesRawData = [];
        var linksRawData = [];

        // nodes和links的权重, 用来计算引力和斥力
        var nodeWeights = [];
        var linkWeights = [];

        // 节点的受力
        var nodeForces = [];
        // 节点的加速度
        var nodeAccelerations = [];
        // 节点的位置
        var nodePositions = [];
        var nodePrePositions = [];
        // 节点的质量
        var nodeMasses = [];

        var temperature;
        var k;
        var density;

        var stepTime = 1/20;
        
        var viewportWidth;
        var viewportHeight;
        var centroid = [];

        var mouseX, mouseY;

        function _buildShape() {
            var legend = component.legend;
            temperature = 1.0;
            viewportWidth = zr.getWidth();
            viewportHeight = zr.getHeight();
            centroid = [viewportWidth/2, viewportHeight/2]

            for (var i = 0, l = series.length; i < l; i++) {
                var serie = series[i];
                if (serie.type === ecConfig.CHART_TYPE_FORCE) {
                    series[i] = self.reformOption(series[i]);
                    forceSerie = serie;

                    var minRadius = self.deepQuery([serie], 'minRadius');
                    var maxRadius = self.deepQuery([serie], 'maxRadius');

                    density = self.deepQuery([serie], 'density');

                    categories = self.deepQuery([serie], 'categories');
                    
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

                    linkStyle = self.deepQuery([serie], 'itemStyle.normal.linkStyle');
                    linkEmphasisStyle = self.deepQuery([serie], 'itemStyle.emphasis.linkStyle');
                    nodeStyle = self.deepQuery([serie], 'itemStyle.normal.nodeStyle');
                    nodeEmphasisStyle = self.deepQuery([serie], 'itemStyle.emphasis.nodeStyle');
                    
                    _filterData(
                                zrUtil.clone(self.deepQuery([serie], 'nodes')),
                                zrUtil.clone(self.deepQuery([serie], 'links'))
                                );
                    // Reset data
                    nodePositions = [];
                    nodePrePositions = [];
                    nodeMasses = [];
                    nodeWeights = [];
                    linkWeights = [];
                    nodeMasses = [];
                    nodeShapes = [];
                    linkShapes = [];

                    var area = viewportWidth * viewportHeight;
                    // Formula in 'Graph Drawing by Force-directed Placement'
                    k = 0.5 * Math.sqrt( area / nodesRawData.length );
                    
                    // 这两方法里需要加上读取self.selectedMap判断当前系列是否显示的逻辑
                    _buildLinkShapes(nodesRawData, linksRawData);
                    _buildNodeShapes(nodesRawData, minRadius, maxRadius);
                }
            }
        }

        function _filterData(nodes, links) {


            var filteredNodeMap = [];
            var cursor = 0;
            nodesRawData = _filter(nodes, function(node, idx) {
                if (self.selectedMap[node.category]) {
                    filteredNodeMap[idx] = cursor++;
                    return true;
                }else{
                    filteredNodeMap[idx] = -1;
                }
            });
            var source;
            var target;
            var ret;
            linksRawData = _filter(links, function(link, idx){
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

                return ret;
            });
        }

        function _buildNodeShapes(nodes, minRadius, maxRadius) {
            // 将值映射到minRadius-maxRadius的范围上
            var radius = [];
            var l = nodes.length;
            for (var i = 0; i < l; i++) {
                var node = nodes[i];
                radius.push(node.value);
            }
            _map(radius, radius, minRadius, maxRadius);
            _normalize(nodeWeights, radius);

            for (var i = 0; i < l; i++) {
                var node = nodes[i];
                var x, y;
                var r = radius[i];

                var random = _randomInSquare(viewportWidth/2, 
                                            viewportHeight/2, 
                                            300);
                x = typeof(node.initial) === "undefined" 
                    ? random.x
                    : node.initial.x;
                y = typeof(node.initial) === "undefined"
                    ? random.y
                    : node.initial.y;
                // 初始化位置
                nodePositions[i] = [x, y];
                nodePrePositions[i] = [x, y];
                // 初始化受力
                nodeForces[i] = [0, 0];
                // 初始化加速度
                nodeAccelerations[i] = [0, 0];
                // 初始化质量
                nodeMasses[i] = r * r * density;

                var shape = {
                    id : zr.newShapeId(self.type),
                    shape : 'circle',
                    style : {
                        r : r,
                        x : 0,
                        y : 0
                    },
                    highlightStyle : {},
                    position : [x, y],

                    __force_index__ : i
                };

                // 优先级 node.style > category.style > defaultStyle
                zrUtil.merge(shape.style, nodeStyle);
                zrUtil.merge(shape.highlightStyle, nodeEmphasisStyle);

                if (typeof(node.category) !== 'undefined') {
                    var category = categories[node.category];
                    if (category) {
                        var style = category.itemStyle;
                        if (style) {
                            if (style.normal) {
                                zrUtil.merge(shape.style, style.normal, {
                                    overwrite : true
                                });
                            }
                            if (style.emphasis) {
                                zrUtil.merge(shape.highlightStyle, style.emphasis, {
                                    overwrite : true
                                });
                            }
                        }
                    }
                }
                if (typeof(node.itemStyle) !== 'undefined') {
                    var style = node.itemStyle;
                    if( style.normal ){ 
                        zrUtil.merge(shape.style, style.normal, {
                            overwrite : true
                        });
                    }
                    if( style.normal ){ 
                        zrUtil.merge(shape.highlightStyle, style.emphasis, {
                            overwrite : true
                        });
                    }
                }
                
                // 拖拽特性
                self.setCalculable(shape);
                shape.ondragstart = self.shapeHandler.ondragstart;
                shape.draggable = true;
                
                nodeShapes.push(shape);
                self.shapeList.push(shape);

                zr.addShape(shape);


                var categoryName = ""
                if (typeof(node.category) !== 'undefined') {
                    var category = categories[node.category];
                    categoryName = (category && category.name) || ""
                }
                ecData.pack(
                    shape,
                    {
                        name : categoryName
                    },
                    0,
                    node, 0,
                    node.name || ""
                )
            }

            // _normalize(nodeMasses, nodeMasses);
        }

        function _buildLinkShapes(nodes, links) {
            var l = links.length;

            for (var i = 0; i < l; i++) {
                var link = links[i];
                var source = nodes[link.source];
                var target = nodes[link.target];
                var weight = link.weight || 1;
                linkWeights.push(weight);

                var shape = {
                    id : zr.newShapeId(self.type),
                    shape : 'line',
                    style : {
                        xStart : 0,
                        yStart : 0,
                        xEnd : 0,
                        yEnd : 0
                    },
                    highlightStyle : {}
                };

                zrUtil.merge(shape.style, linkStyle);
                zrUtil.merge(shape.highlightStyle, linkEmphasisStyle);
                if (typeof(link.itemStyle) !== 'undefined') {
                    if(link.itemStyle.normal){
                        zrUtil.merge(shape.style, link.itemStyle.normal, {
                            overwrite : true
                        });
                    }
                    if(link.itemStyle.emphasis){
                        zrUtil.merge(shape.highlightStyle, link.itemStyle.emphasis, {
                            overwrite : true
                        })
                    }
                }

                linkShapes.push(shape);
                self.shapeList.push(shape);

                zr.addShape(shape);
            }
            _normalize(linkWeights, linkWeights);
        }

        function _updateLinkShapes(){
            for (var i = 0, l = linksRawData.length; i < l; i++) {
                var link = linksRawData[i];
                var linkShape = linkShapes[i];
                var sourceShape = nodeShapes[link.source];
                var targetShape = nodeShapes[link.target];

                linkShape.style.xStart = sourceShape.position[0];
                linkShape.style.yStart = sourceShape.position[1];
                linkShape.style.xEnd = targetShape.position[0];
                linkShape.style.yEnd = targetShape.position[1];
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

                    vec2.scale(v12, v12, 1/d);
                    var forceFactor = 1 * (w1 + w2) * k2 / d;

                    vec2.scale(v12, v12, forceFactor);
                    //节点1受到的力
                    vec2.sub(nodeForces[i], nodeForces[i], v12);
                    //节点2受到的力
                    vec2.add(nodeForces[j], nodeForces[j], v12);
                }
            }
            // 计算节点之间引力
            for (var i = 0, l = linksRawData.length; i < l; i++) {
                var link = linksRawData[i];
                var w = linkWeights[i];
                var s = link.source;
                var t = link.target;
                var p1 = nodePositions[s];
                var p2 = nodePositions[t];

                vec2.sub(v12, p2, p1);
                var d2 = vec2.lengthSquare(v12);
                vec2.normalize(v12, v12);

                var forceFactor = w * d2 / k;
                // 节点1受到的力
                vec2.scale(v12, v12, forceFactor);
                vec2.add(nodeForces[s], nodeForces[s], v12);
                //节点2受到的力
                vec2.sub(nodeForces[t], nodeForces[t], v12);
            }
            // 到质心的向心力
            for (var i = 0, l = nodesRawData.length; i < l; i++){
                var p = nodePositions[i];
                vec2.sub(v12, centroid, p);
                var d2 = vec2.lengthSquare(v12);
                vec2.normalize(v12, v12);
                // 100是可调参数
                var forceFactor = d2 / 100;
                vec2.scale(v12, v12, forceFactor);
                vec2.add(nodeForces[i], nodeForces[i], v12);

            }
            // 计算加速度
            for (var i = 0, l = nodeAccelerations.length; i < l; i++) {
                vec2.scale(nodeAccelerations[i], nodeForces[i], 1 / nodeMasses[i]);
            }
            var velocity = [];
            var tmp = [];
            // 计算位置(verlet积分)
            for (var i = 0, l = nodePositions.length; i < l; i++) {
                if (nodesRawData[i].fixed) {
                    // 拖拽同步
                    nodePositions[i][0] = mouseX;
                    nodePositions[i][1] = mouseY;
                    nodePrePositions[i][0] = mouseX;
                    nodePrePositions[i][1] = mouseY;
                    nodeShapes[i].position[0] = mouseX;
                    nodeShapes[i].position[1] = mouseY;
                    continue;
                }
                var p = nodePositions[i];
                var p_ = nodePrePositions[i];
                vec2.sub(velocity, p, p_);
                p_[0] = p[0];
                p_[1] = p[1];
                vec2.add(velocity, velocity, vec2.scale(tmp, nodeAccelerations[i], stepTime));
                // Damping
                vec2.scale(velocity, velocity, temperature);
                // 防止速度太大
                velocity[0] = Math.min(velocity[0], 100);
                velocity[1] = Math.min(velocity[1], 100);

                vec2.add(p, p, velocity);
                nodeShapes[i].position[0] = p[0];
                nodeShapes[i].position[1] = p[1];

                if(p[0] === NaN || p[1] === NaN){
                    throw new Error("NaN");
                }
            }
        }

        function _step(){
            if (temperature < 0.01) {
                return;
            }

            _update(stepTime);
            _updateLinkShapes();

            for (var i = 0; i < nodeShapes.length; i++) {
                var shape = nodeShapes[i];
                zr.modShape(shape.id, shape);
            }
            for (var i = 0; i < linkShapes.length; i++) {
                var shape = linkShapes[i];
                zr.modShape(shape.id, shape);
            }

            zr.refresh();

            // Cool Down
            temperature *= 0.999;
        }

        function init(newOption, newComponent) {
            option = newOption;
            component = newComponent;

            series = option.series;

            self.clear();
            _buildShape();

            setInterval(function(){
                _step();
            }, stepTime);
        }

        function refresh() {
            self.clear();
            _buildShape();
            temperature = 1.0;
        }
        
        /**
         * 输出动态视觉引导线
         */
        self.shapeHandler.ondragstart = function() {
            self.isDragstart = true;
        }
        
        /**
         * 拖拽开始
         */
        function ondragstart(param, status) {
            if (!self.isDragstart || !param.target) {
                // 没有在当前实例上发生拖拽行为则直接返回
                return;
            }
            var shape = param.target;
            var idx = shape.__force_index__;
            var node = nodesRawData[idx];
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
            var idx = shape.__force_index__;
            var node = nodesRawData[idx];
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
            mouseY = zrEvent.getY(param.event)
        }
        
        self.init = init;
        self.refresh = refresh;
        self.ondragstart = ondragstart;
        self.ondragend = ondragend;

        init(option, component);
    }


    function _map(output, input, mappedMin, mappedMax) {
        var min = input[0];
        var max = input[0];
        var l = input.length;
        for (var i = 1; i < l; i++) {
            var val = input[i];
            if (val < min) {
                min = val;
            }
            if (val > max) {
                max = val;
            }
        }
        var range = max - min;
        var mappedRange = mappedMax - mappedMin;
        for (var i = 0; i < l; i++) {
            if (range === 0) {
                output[i] = mappedMin;
            } else {
                var val = input[i];
                var percent = (val - min) / range;
                output[i] = mappedRange * percent + mappedMin;
            }
        }
    }

    function _normalize(output, input) {
        var l = input.length;
        var max = input[0];
        for (var i = 1; i < l; i++) {
            if (input[i] > max) {
                max = input[i];
            }
        }
        for (var i = 0; i < l; i++) {
            output[i] = input[i] / max;
        }
    }

    function _randomInCircle(x, y, radius) {
        var theta = Math.random() * Math.PI * 2;
        var r = radius * Math.random();
        return {
            x : Math.cos(theta) * r + x,
            y : Math.sin(theta) * r + y
        }
    }

    function _randomInSquare(x, y, size) {
        return {
            x : (Math.random() - 0.5) * size + x,
            y : (Math.random() - 0.5) * size + y
        }
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

    // 图表注册
    require('../chart').define('force', Force);

    return Force;
})
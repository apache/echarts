/**
 * 力导向布局
 * @module echarts/layout/Force
 * @author pissang(http://github.com/pissang)
 */
define(function(require) {

    var ForceLayoutWorker = require('./forceLayoutWorker');
    var vec2 = require('zrender/tool/vector');

    var requestAnimationFrame = window.requestAnimationFrame
                                || window.msRequestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame
                                || function (func) {setTimeout(func, 16);};
    var ArrayCtor = typeof(Float32Array) == 'undefined' ? Array : Float32Array;

    var workerUrl;

    // function getToken() {
    //     return Math.round((new Date()).getTime() / 100) % 10000000;
    // }

    function createWorkerUrl() {
        if (
            typeof(Worker) !== 'undefined' &&
            typeof(Blob) !== 'undefined'
        ) {
            try {
                var blob = new Blob([ForceLayoutWorker.getWorkerCode()]);
                workerUrl = window.URL.createObjectURL(blob);   
            }
            catch (e) {
                workerUrl = '';
            }
        }

        return workerUrl;
    }

    var ForceLayout = function(opts) {

        if (typeof(workerUrl) === 'undefined') {
            createWorkerUrl();
        }
        opts = opts || {};
        // 配置项
        this.width = opts.width || 500;
        this.height = opts.height || 500;
        this.center = opts.center || [this.width / 2, this.height / 2];
        this.ratioScaling = opts.ratioScaling || false;
        this.scaling = opts.scaling || 1;
        this.gravity = typeof(opts.gravity) !== 'undefined'
                        ? opts.gravity : 1;
        this.large = opts.large || false;
        this.preventNodeOverlap = opts.preventNodeOverlap || false;
        this.preventNodeEdgeOverlap = opts.preventNodeEdgeOverlap || false;
        this.maxSpeedIncrease = opts.maxSpeedIncrease || 1;

        this.onupdate = opts.onupdate || function () {};
        this.temperature = opts.temperature || 1;
        this.coolDown = opts.coolDown || 0.99;

        this._layout = null;
        this._layoutWorker = null;

        var self = this;
        var _$onupdate = this._$onupdate;
        this._$onupdate = function(e) {
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
            scaling: this.scaling || 1.0,
            gravity: this.gravity || 1.0,
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
        }
        else {
            for (var name in config) {
                this._layout[name] = config[name];
            }
        }
    };

    ForceLayout.prototype.init = function (graph, useWorker) {
        if (this._layoutWorker) {
            this._layoutWorker.terminate();
            this._layoutWorker = null;
        }
        if (workerUrl && useWorker) {
            try {
                if (!this._layoutWorker) {
                    this._layoutWorker = new Worker(workerUrl);
                    this._layoutWorker.onmessage = this._$onupdate;
                }
                this._layout = null;
            }
            catch (e) {    // IE10-11 will throw security error when using blog url
                this._layoutWorker = null;
                if (!this._layout) {
                    this._layout = new ForceLayoutWorker();
                }
            }
        }
        else {
            if (!this._layout) {
                this._layout = new ForceLayoutWorker();
            }
        }

        this.temperature = 1;

        this.graph = graph;

        // 节点数据
        var len = graph.nodes.length;
        var positionArr = new ArrayCtor(len * 2);
        var massArr = new ArrayCtor(len);
        var sizeArr = new ArrayCtor(len);

        for (var i = 0; i < len; i++) {
            var n = graph.nodes[i];
            positionArr[i * 2] = n.layout.position[0];
            positionArr[i * 2 + 1] = n.layout.position[1];
            massArr[i] = typeof(n.layout.mass) === 'undefined'
                ? 1 : n.layout.mass;
            sizeArr[i] = typeof(n.layout.size) === 'undefined'
                ? 1 : n.layout.size;

            n.layout.__index = i;
        }
        // 边数据
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
        }
        else {
            this._layout.initNodes(positionArr, massArr, sizeArr);
            this._layout.initEdges(edgeArr, edgeWeightArr);   
        }

        this.updateConfig();
    };

    ForceLayout.prototype.step = function (steps) {
        var nodes = this.graph.nodes;
        if (this._layoutWorker) {
            // Sync back
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
        }
        else {
            
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
        }
        else if (this._layout) {
            for (var i = 0; i < this.graph.nodes.length; i++) {
                var n = this.graph.nodes[i];
                vec2.copy(n.layout.position, this._layout.nodes[i].position);
            }
            this.onupdate && this.onupdate();
        }
    };

    ForceLayout.prototype.dispose = function() {
        if (this._layoutWorker) {
            this._layoutWorker.terminate();
        }
        this._layoutWorker = null;
        this._layout = null;
    };

    return ForceLayout;
});
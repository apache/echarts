/**
 * 图数据结构
 * @module echarts/data/Graph
 * @author pissang(http://www.github.com/pissang)
 */
define(function(require) {

    var util = require('zrender/tool/util');

    'use strict';

    /**
     * @alias module:echarts/data/Graph
     * @constructor
     * @param {boolean} directed
     */
    var Graph = function(directed) {
        /**
         * 是否是有向图
         * @type {boolean}
         * @private
         */
        this._directed = directed || false;

        /**
         * [nodes description]
         * @type {Array}
         */
        this.nodes = [];
        this.edges = [];

        this._nodesMap = {};
        this._edgesMap = {};
    };

    /**
     * 添加一个新的节点
     * @param {string} name 节点名称
     * @param {*} [data] 存储的数据
     */
    Graph.prototype.addNode = function(name, data) {
        if (this._nodesMap[name]) {
            return this._nodesMap[name];
        }

        var node = new Graph.Node(name, data);

        this.nodes.push(node);

        this._nodesMap[name] = node;
        return node;
    };
    
    /**
     * 获取节点
     * @param  {string} name
     * @return {module:echarts/data/Graph~Node}
     */
    Graph.prototype.getNodeByName = function(name) {
        return this._nodesMap[name];
    };

    /**
     * 添加边
     * @param {string|module:echarts/data/Graph~Node} n1
     * @param {string|module:echarts/data/Graph~Node} n2
     * @param {*} data
     * @return {module:echarts/data/Graph~Edge}
     */
    Graph.prototype.addEdge = function(n1, n2, data) {
        if (typeof(n1) == 'string') {
            n1 = this._nodesMap[n1];
        }
        if (typeof(n2) == 'string') {
            n2 = this._nodesMap[n2];
        }
        if (!n1 || !n2) {
            return;
        }

        var key = n1.name + '-' + n2.name;
        if (this._edgesMap[key]) {
            return this._edgesMap[key];
        }

        var edge = new Graph.Edge(n1, n2, data);

        if (this._directed) {
            n1.outEdges.push(edge);
            n2.inEdges.push(edge);   
        }
        n1.edges.push(edge);
        n2.edges.push(edge);

        this.edges.push(edge);
        this._edgesMap[key] = edge;

        return edge;
    };

    /**
     * 移除边
     * @param  {module:echarts/data/Graph~Edge} edge
     */
    Graph.prototype.removeEdge = function(edge) {
        var n1 = edge.node1;
        var n2 = edge.node2;
        var key = n1.name + '-' + n2.name;
        if (this._directed) {
            n1.outEdges.splice(util.indexOf(n1.outEdges, edge), 1);
            n2.inEdges.splice(util.indexOf(n2.inEdges, edge), 1);   
        }
        n1.edges.splice(util.indexOf(n1.edges, edge), 1);
        n2.edges.splice(util.indexOf(n2.edges, edge), 1);

        delete this._edgesMap[key];
        this.edges.splice(util.indexOf(this.edges, edge), 1);
    };

    /**
     * 移除节点（及其邻接边）
     * @param  {module:echarts/data/Graph~Node|string} node
     */
    Graph.prototype.removeNode = function(node) {
        if (typeof(node) === 'string') {
            node = this._nodesMap[node];
            if (!node) {
                return;
            }
        }

        delete this._nodesMap[node.name];
        this.nodes.splice(util.indexOf(this.nodes, node), 1);

        for (var i = 0; i < this.edges.length;) {
            var edge = this.edges[i];
            if (edge.node1 == node || edge.node2 == node) {
                this.removeEdge(edge);
            } else {
                i++;
            }
        }
    };

    /**
     * 线性遍历所有节点
     * @param  {Function} cb
     * @param  {*}   context
     */
    Graph.prototype.eachNode = function(cb, context) {
        for (var i = 0; i < this.nodes.length; i++) {
            cb.call(context, this.nodes[i]);
        }
    };
    
    /**
     * 线性遍历所有边
     * @param  {Function} cb
     * @param  {*}   context
     */
    Graph.prototype.eachEdge = function(cb, context) {
        for (var i = 0; i < this.edges.length; i++) {
            cb.call(context, this.edges[i]);
        }
    };
    
    /**
     * 清空图
     */
    Graph.prototype.clear = function() {
        this.nodes.length = 0;
        this.edges.length = 0;

        this._nodesMap = {};
        this._edgesMap = {};
    };
    
    /**
     * 图节点
     * @alias module:echarts/data/Graph~Node
     * @param {string} name
     * @param {*} [data]
     */
    var Node = function(name, data) {
        /**
         * 节点名称
         * @type {string}
         */
        this.name = name;
        /**
         * 节点存储的数据
         * @type {*}
         */
        this.data = data || null;
        /**
         * 入边，只在有向图上有效
         * @type {Array.<module:echarts/data/Graph~Edge>}
         */
        this.inEdges = [];
        /**
         * 出边，只在有向图上有效
         * @type {Array.<module:echarts/data/Graph~Edge>}
         */
        this.outEdges = [];
        /**
         * 邻接边
         * @type {Array.<module:echarts/data/Graph~Edge>}
         */
        this.edges = [];
    };
    
    /**
     * 度
     * @return {number}
     */
    Node.prototype.degree = function() {
        return this.edges.length; 
    };
    
    /**
     * 入度，只在有向图上有效
     * @return {number}
     */
    Node.prototype.inDegree = function() {
        return this.inEdges.length;
    };
    
    /**
     * 出度，只在有向图上有效
     * @return {number}
     */
    Node.prototype.outDegree = function() {
        return this.outEdges.length;
    };

    /**
     * 图边
     * @alias module:echarts/data/Graph~Edge
     * @param {module:echarts/data/Graph~Node} node1
     * @param {module:echarts/data/Graph~Node} node2
     * @param {extra} data
     */
    var Edge = function(node1, node2, data) {
        /**
         * 节点1，如果是有向图则为源节点
         * @type {module:echarts/data/Graph~Node}
         */
        this.node1 = node1;
        /**
         * 节点2，如果是有向图则为目标节点
         * @type {module:echarts/data/Graph~Node}
         */
        this.node2 = node2;

        /**
         * 边存储的数据
         * @type {*}
         */
        this.data = data || null;
    };

    Graph.Node = Node;
    Graph.Edge = Edge;

    /**
     * 从邻接矩阵生成
     * ```
     *        TARGET
     *    -1--2--3--4--5-
     *  1| x  x  x  x  x
     *  2| x  x  x  x  x
     *  3| x  x  x  x  x  SOURCE
     *  4| x  x  x  x  x
     *  5| x  x  x  x  x
     * ```
     * 节点的行列总和会被写到`node.data.value`
     * 对于有向图会计算每一行的和写到`node.data.outValue`,
     * 计算每一列的和写到`node.data.inValue`。
     * 边的权重会被然后写到`edge.data.weight`。
     * 如果是有向图被写到`edge.data.sourceWeight`和`edge.data.targetWeight`
     * 
     * @method module:echarts/data/Graph.fromMatrix
     * @param {Array.<Object>} nodesData 节点信息，必须有`name`属性
     * @param {Array} matrix 邻接矩阵
     * @param {boolean} directed 是否是有向图
     * @return {module:echarts/data/Graph}
     */
    Graph.fromMatrix = function(nodesData, matrix, directed) {
        if (
            !matrix || !matrix.length
            || (matrix[0].length !== matrix.length)
            || (nodesData.length !== matrix.length)
        ) {
            // Not a valid data
            return;
        }

        var size = matrix.length;
        var graph = new Graph(directed);

        for (var i = 0; i < size; i++) {
            var node = graph.addNode(nodesData[i].name, {});
            node.data.value = 0;
            if (directed) {
                node.data.outValue = node.data.inValue = 0;
            }
        }
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                var item = matrix[i][j];
                if (directed) {
                    graph.nodes[i].outValue += item;
                    graph.nodes[j].inValue += item;
                }
                graph.nodes[i].value += item;
                graph.nodes[j].value += item;
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
                if (directed) {
                    edge.data.sourceWeight = item;
                    edge.data.targetWeight = matrix[j][i];
                }
                edge.data.weight = item;
                if (i !== j) {
                    if (directed) {
                        var inEdge = graph.addEdge(n2, n1, {});
                        inEdge.sourceWeight = matrix[j][i];
                        inEdge.targetWeight = item;
                    }
                    edge.data.weight += matrix[j][i];
                }
            }
        }
    };

    return Graph;
});
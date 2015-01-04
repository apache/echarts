/**
 * Chord layout
 * @module echarts/layout/Chord
 * @author pissang(http://github.com/pissang)
 */
define(function (require) {

    var ChordLayout = function (opts) {

        opts = opts || {};

        /**
         * 是否排序组(即图的节点), 可以是`ascending`, `descending`, 或者为空不排序
         * @type {string}
         */
        this.sort = opts.sort || null;
        /**
         * 是否排序子组(即图中每个节点的邻接边), 可以是`ascending`, `descending`, 或者为空不排序
         * @type {string}
         */
        this.sortSub = opts.sortSub || null;

        this.padding = 0.05;

        this.startAngle = opts.startAngle || 0;
        this.clockWise = opts.clockWise == null ? false : opts.clockWise;

        this.center = opts.center || [0, 0];

        this.directed = true;
    };

    /**
     * 对指定的一个或多个 Graph 运行 chord 布局
     * 可以有多个 Graph, 后面几个 Graph 的节点是第一个 Graph 的节点的子集(ID一一对应）
     *
     * 布局结果保存在第一个 Graph 的每个节点的 layout.startAngle 和 layout.endAngle.
     * 以及每个图的边的 layout.startAngle 和 layout.endAngle
     * 
     * @param {Array.<module:echarts/data/Graph>|module:echarts/data/Graph} graphs
     */
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

        // 使用第一个 graph 的节点
        for (var i = 0; i < nl; i++) {
            var g0node = graph0.nodes[i];
            var group = {
                size: 0,
                subGroups: [],
                node: g0node
            };
            groups.push(group);

            var sumWeight = 0;

            // 合并所有 Graph 的 边
            for (var k = 0; k < graphs.length; k++) {
                var graph = graphs[k];
                var node = graph.getNodeById(g0node.id);
                // 节点可能没有值被过滤掉了
                if (!node) {
                    continue;
                }
                group.size += node.layout.size;
                // PENDING
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

            // Sum sub group weights to group size
            var multiplier = group.size / sumWeight;
            for (var j = 0; j < group.subGroups.length; j++) {
                group.subGroups[j].weight *= multiplier;
            }

            if (this.sortSub === 'ascending') {
                group.subGroups.sort(compareSubGroups);
            }
            else if (this.sort === 'descending') {
                group.subGroups.sort(compareSubGroups);
                group.subGroups.reverse();
            }
        }

        if (this.sort === 'ascending') {
            groups.sort(compareGroups);
        }
        else if (this.sort === 'descending') {
            groups.sort(compareGroups);
            groups.reverse();
        }

        var multiplier = (Math.PI * 2 - this.padding * nl) / sumSize;
        var angle = this.startAngle;
        var sign = this.clockWise ? 1 : -1;
        // Calculate angles
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
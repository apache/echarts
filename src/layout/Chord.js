/**
 * Chord layout
 * @module echarts/layout/Chord
 * @author pissang(http://github.com/pissang)
 */
define(function (require) {

    var vector = require('zrender/tool/vector');

    var ArrayCtor = typeof(Float32Array) == 'undefined' ? Array : Float32Array;
    var PI2 = Math.PI * 2;

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
    }

    ChordLayout.prototype.run = function (graph) {
        var len = graph.nodes.length;

        var groups = [];
        var sumSize = 0;

        for (var i = 0; i < len; i++) {
            var node = graph.nodes[i];
            var group = {
                size: node.layout.size,
                subGroups: [],
                node: node
            };
            sumSize += node.layout.size;
            groups.push(group);

            var sumWeight = 0;
            // PENDGING outEdges还是edges
            for (var j = 0; j < node.outEdges.length; j++) {
                var e = node.outEdges[j];
                var w = e.layout.sourceWeight;
                group.subGroups.push({
                    weight: w,
                    edge: e
                });
                sumWeight += w;
            }
            // Sum sub group weights to group size
            var multiplier = node.layout.size / sumWeight;
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

        var multiplier = (Math.PI * 2 - this.padding * len) / sumSize;
        var angle = this.startAngle;
        var sign = this.clockWise ? 1 : -1;
        // Calculate angles
        for (var i = 0; i < len; i++) {
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
            angle += sign * this.padding;
        }
    }

    var compareSubGroups = function (a, b) {
        return a.weight - b.weight;
    };

    var compareGroups = function (a, b) {
        return a.size - b.size;
    };

    return ChordLayout;
});
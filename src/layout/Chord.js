/**
 * Chord layout
 * @module echarts/layout/Chord
 * @author pissang(http://github.com/pissang)
 */
define(function (require) {

    var vector = require('zrender/tool/vector');

    var ArrayCtor = typeof(Float32Array) == 'undefined' ? Array : Float32Array;

    var ChordLayout = function (opts) {

        opts = opts || {};

        this.sortGroups = opts.sortGroups || false;
        this.sortSubGroups = opts.sortSubGroups || false;

        this.groupPadding = 5;

        this.startAngle = opts.startAngle || 0;
        this.clockWise = opts.clockWise == null ? opts.clockWise : true;

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
                subGroups: []
            };
            sumSize += node.layout.size;
            groups.push(group);

            var sumWeight = 0;
            for (var j = 0; j < node.edges.length; j++) {
                var e = node.edges[i];
                var w;
                if (e.node1 === node) {
                    w = e.layout.sourceWeight;
                } else {
                    w = e.layout.targetWeight;
                }
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

            if (this.sortSubGroups) {
                group.subGroups.sort(sortSubGroups);
            }
        }

        if (this.sortGroups) {
            groups.sort(sortGroups);
        }


        var multiplier = (Math.PI * 2 - this.groupPadding) / sumSize;
        var angle = this.startAngle;
        // Calculate angles
        for (var i = 0; i < len; i++) {
            var group = groups[i];
            group.layout.startAngle = angle;
            group.layout.endAngle = angle + group.layout.size * multiplier;

            group.layout.subGroups = [];
            for (var j = 0; j < group.subGroups.length; j++) {
                var subGroup = group.subGroups[j];
                group.layout.subGroups.push({
                    startAngle: angle,
                    endAngle: angle + subGroup.weight * multiplier,
                    edge: subGroup.edge
                });
                angle += subGroup.weight * multiplier;
            }
            angle += this.groupPadding;
        }
    }

    var sortSubGroups = function (a, b) {
        return a.weight - b.weight;
    };
    var sortGroups = function (a, b) {
        return a.size - b.size;
    }

    return ChordLayout;
});
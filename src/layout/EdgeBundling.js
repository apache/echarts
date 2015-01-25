/**
 * Edge bundling laytout
 *
 * Use MINGLE algorithm
 * Multilevel agglomerative edge bundling for visualizing large graphs
 *
 * @module echarts/layout/EdgeBundling
 */
define(function (require) {

    var KDTree = require('../data/KDTree');
    var vec2 = require('zrender/tool/vector');
    var v2Create = vec2.create;

    function sqaredDistance(a, b) {
        a = a.array;
        b = b.array;

        var x = b[0] - a[0];
        var y = b[1] - a[1];
        var z = b[2] - a[2];
        var w = b[3] - a[3];

        return x * x + y * y + z * z + w * w;
    }

    function CoarsenedEdge(group) {
        this.points = [
            group.mp0, group.mp1
        ];

        this.group = group;
    };

    function Edge(edge, flip) {
        var points = edge.points;

        this.array = flip
            ? [points[1][0], points[1][1], points[0][0], points[0][1]]
            : [points[0][0], points[0][1], points[1][0], points[1][1]];

        this.edge = edge;

        this.flip = flip;

        this.group = null;

        this.mirrorEdge = null;
    }

    Edge.prototype.getStartPoint = function () {
        return this.flip ? this.edge.points[1] : this.edge.points[0];
    };

    Edge.prototype.getEndPoint = function () {
        return this.flip ? this.edge.points[0] : this.edge.points[1];
    };

    function BundledEdgeGroup() {

        this.edgeList = [];

        this.mp0 = v2Create();
        this.mp1 = v2Create();
    }

    BundledEdgeGroup.prototype.addEdge = function (edge) {
        edge.group = this;
        this.edgeList.push(edge);
    };

    BundledEdgeGroup.prototype.removeEdge = function (edge) {
        edge.group = null;
        this.edgeList.splice(this.edgeList.indexOf(edge), 1);
    };

    /**
     * @constructor
     * @alias module:echarts/layout/EdgeBundling
     */
    function EdgeBundling() {
        this.maxNearestEdge = 4;
        this.maxTurningAngle = Math.PI / 4;
    }

    EdgeBundling.prototype = {
        
        constructor: EdgeBundling,

        run: function (rawEdges) {
            var res = this._iterate(rawEdges);
            var nIterate = 0;
            while (nIterate++ < 10) {
                var coarsenedEdges = [];
                for (var i = 0; i < res.groups.length; i++) {
                    coarsenedEdges.push(new CoarsenedEdge(res.groups[i]));
                }
                var newRes = this._iterate(coarsenedEdges);
                if (newRes.savedInk <= 0) {
                    break;
                } else {
                    res = newRes;
                }
            }

            // Get new edges
            var newEdges = [];

            var buildNewEdges = function (groups, fromEdge) {
                for (var i = 0; i < groups.length; i++) {
                    var group = groups[i];
                    if (
                        group.edgeList[0]
                        && (group.edgeList[0].edge instanceof CoarsenedEdge)
                    ) {
                        var newGroups = [];
                        for (var j = 0; j < group.edgeList.length; j++) {
                            newGroups.push(group.edgeList[j].edge.group);
                        }
                        if (! fromEdge) {
                            newEdge = [];
                        } else {
                            newEdge = fromEdge.slice();
                        }
                        newEdge.unshift(group.mp0);
                        newEdge.push(group.mp1);
                        buildNewEdges(newGroups, newEdge);
                    } else {
                        // console.log(group.edgeList.length);
                        for (var j = 0; j < group.edgeList.length; j++) {
                            var edge = group.edgeList[j];
                            if (! fromEdge) {
                                newEdge = [];
                            } else {
                                newEdge = fromEdge.slice();
                            }
                            newEdge.unshift(group.mp0);
                            newEdge.push(group.mp1);
                            newEdge.unshift(edge.getStartPoint());
                            newEdge.push(edge.getEndPoint());
                            newEdges.push(newEdge);
                        }
                    }
                }
            };

            buildNewEdges(res.groups);

            return newEdges;
        },

        _iterate: function (rawEdges) {
            var edges = [];
            var groups = [];
            var totalSavedInk = 0;
            for (var i = 0; i < rawEdges.length; i++) {
                var edge = new Edge(rawEdges[i], true);
                var edge2 = new Edge(rawEdges[i], false);
                edge.mirrorEdge = edge2;
                edge2.mirrorEdge = edge;
                edges.push(edge);
                edges.push(edge2);
            }

            var tree = new KDTree(edges, 4);

            var nearests = [];
            for (var i = 0; i < edges.length; i++) {
                var edge = edges[i];
                if (edge.group || edge.mirrorEdge.group) {
                    // Edge have been groupped
                    // PENDING
                    continue;
                }
                tree.nearestN(
                    edge, this.maxNearestEdge,
                    sqaredDistance, nearests
                );
                var maxSavedInk = 0;
                var mostSavingInkEdge = null;
                for (var j = 0; j < nearests.length; j++) {
                    var nearest = nearests[j];
                    var ink = this._calculateSavedInk(
                        edge, nearest
                    );
                    if (
                        ink > maxSavedInk
                        // Not the mirror edge
                        && nearest.mirrorEdge !== edge
                    ) {
                        maxSavedInk = ink;
                        mostSavingInkEdge = nearest;
                    }
                }
                if (mostSavingInkEdge) {
                    totalSavedInk += maxSavedInk;
                    if (! mostSavingInkEdge.group) {
                        var group = new BundledEdgeGroup();
                        groups.push(group);
                        group.addEdge(mostSavingInkEdge);
                    }
                    var group = mostSavingInkEdge.group;
                    group.addEdge(edge);
                }
                else {
                    var group = new BundledEdgeGroup();
                    groups.push(group);
                    group.addEdge(edge);
                }
            }

            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                this._calculateGroupMeetPoints(group);
            }

            return {
                groups: groups,
                edges: edges,
                savedInk: totalSavedInk
            }
        },

        _calculateSavedInk: (function () {
            var mp0 = v2Create();
            var mp1 = v2Create();
            var startPointSet = [v2Create(), v2Create()];
            var endPointSet = [v2Create(), v2Create()];
            return function (e0, e1) {
                var e0arr = e0.array;
                var e1arr = e1.array;
                var v2Dist = vec2.dist;
                var v2Set = vec2.set;
                v2Set(startPointSet[0], e0arr[0], e0arr[1]);
                v2Set(startPointSet[1], e1arr[0], e1arr[1]);
                v2Set(endPointSet[0], e0arr[2], e0arr[3]);
                v2Set(endPointSet[1], e1arr[2], e1arr[3]);
                this._calculateMeetPoints(
                    startPointSet, endPointSet, mp0, mp1
                );
                var ink = v2Dist(startPointSet[0], endPointSet[0])
                    + v2Dist(startPointSet[1], endPointSet[1]);
                var newInk = v2Dist(startPointSet[0], mp0)
                    + v2Dist(mp0, mp1)
                    + v2Dist(mp1, endPointSet[0])
                    + v2Dist(startPointSet[1], mp0)
                    + v2Dist(mp1, endPointSet[1]);

                return ink - newInk;
            };
        })(),

        _calculateGroupMeetPoints: function (group) {
            var startPointSet = [];
            var endPointSet = [];

            for (var i = 0; i < group.edgeList.length; i++) {
                var edge = group.edgeList[i];
                var points = edge.edge.points;
                if (edge.flip) {
                    startPointSet.push(points[1]);
                    endPointSet.push(points[0]);
                } else {
                    startPointSet.push(points[0]);
                    endPointSet.push(points[1]);
                }
            }
            this._calculateMeetPoints(
                startPointSet, endPointSet, group.mp0, group.mp1
            );
        },

        /**
         * Calculating the meet points
         * @method
         * @param {Array} startPointSet Start points set of bundled edges
         * @param {Array} endPointSet End points set of bundled edges
         * @param {Array.<number>} mp0 Output meet point 0
         * @param {Array.<number>} mp1 Output meet point 1
         */
        _calculateMeetPoints: (function () {
            var cp0 = v2Create();
            var cp1 = v2Create();
            return function (startPointSet, endPointSet, mp0, mp1) {
                vec2.set(cp0, 0, 0);
                vec2.set(cp1, 0, 0);
                var len = startPointSet.length;
                // Calculate the centroid of start points set
                for (var i = 0; i < len; i++) {
                    vec2.add(cp0, cp0, startPointSet[i]);
                }
                vec2.scale(cp0, cp0, 1 / len);

                // Calculate the centroid of end points set
                len = endPointSet.length;
                for (var i = 0; i < len; i++) {
                    vec2.add(cp1, cp1, endPointSet[i]);
                }
                vec2.scale(cp1, cp1, 1 / len);

                this._limitTurningAngle(
                    startPointSet, cp0, cp1, mp0
                );
                this._limitTurningAngle(
                    endPointSet, cp1, cp0, mp1
                );
            }
        })(),

        _limitTurningAngle: (function () {
            var v10 = v2Create();
            var vTmp = v2Create();
            var project = v2Create();
            return function (pointSet, p0, p1, out) {
                // Limit the max turning angle
                var maxTurningAngleCos = Math.cos(this.maxTurningAngle);
                var maxTurningAngleTan = Math.tan(this.maxTurningAngle);

                vec2.sub(v10, p0, p1);
                vec2.normalize(v10, v10);

                // Simply copy the centroid point if no need to turn the angle
                vec2.copy(out, p0);

                var turningAngleCosMin = 1;
                for (var i = 0; i < pointSet.length; i++) {
                    var p = pointSet[i];
                    vec2.sub(vTmp, p, p0);
                    var len = vec2.len(vTmp);
                    vec2.scale(vTmp, vTmp, 1 / len);
                    var turningAngleCos = vec2.dot(vTmp, v10);
                    if (
                        // Turning angle is to large
                        turningAngleCos < maxTurningAngleCos
                        // Get a larger turning angle
                        && turningAngleCos < turningAngleCosMin
                    ) {
                        turningAngleCosMin = turningAngleCos;
                        // Calculat p0's project point on vector p1-p0 
                        // and distance to the vector
                        vec2.scaleAndAdd(project, p0, v10, turningAngleCos * len);
                        var turningAngleSin = Math.sqrt(
                            1 - turningAngleCos * turningAngleCos
                        );
                        var distance = len * turningAngleSin;

                        // Use the max turning angle to calculate the new meet point
                        var tmp = distance / maxTurningAngleTan;
                        vec2.scaleAndAdd(out, project, v10, -tmp);
                    }
                }
            };
        })()
    }

    return EdgeBundling;
});
define(function (require) {

    var vec2 = require('zrender/core/vector');
    var scaleAndAdd = vec2.scaleAndAdd;

    function adjacentNode(n, e) {
        return e.n1 === n ? e.n2 : e.n1;
    }

    return function (nodes, edges, opts) {
        var width = opts.width || 500;
        var height = opts.height || 500;
        var center = opts.center || [width / 2, height / 2];
        var scale = opts.scale || 1;
        var gravity = opts.gravity == null ? 1 : opts.gravity;

        for (var i = 0; i < edges.length; i++) {
            var e = edges[i];
            e.n1.edges = e.n1.edges || [];
            e.n2.edges = e.n2.edges || [];
            e.n1.edges.push(e);
            e.n2.edges.push(e);
        }
        // Init position
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (!n.p) {
                // Use the position from first adjecent node with defined position
                // Or use a random position
                // From d3
                var j = -1;
                while (++j < n.edges.length) {
                    var e = n.edges[j];
                    var other = adjacentNode(n, e);
                    if (other.p) {
                        n.p = vec2.clone(other.p);
                        break;
                    }
                }
                if (!n.p) {
                    n.p = vec2.create(
                        width * (Math.random() - 0.5) + center[0],
                        height * (Math.random() - 0.5) + center[1]
                    );
                }
            }
            n.pp = vec2.clone(n.p);
            n.f = [0, 0];
            n.edges = null;
        }

        // Formula in 'Graph Drawing by Force-directed Placement'
        var k = 0.5 * scale * Math.sqrt(width * height / nodes.length);

        var k2 = k * k;

        var friction = 1;

        return {
            warmUp: function () {
                friction = 0.7;
            },
            step: function (cb) {
                var v12 = [];
                var nLen = nodes.length;
                // Reset
                for (var i = 0; i < nLen; i++) {
                    vec2.set(nodes[i].f, 0, 0);
                }
                // Repulsive
                for (var i = 0; i < nLen; i++) {
                    var n1 = nodes[i];
                    for (var j = i + 1; j < nLen; j++) {
                        var n2 = nodes[j];
                        vec2.sub(v12, n2.p, n1.p);
                        var d = vec2.len(v12);
                        // Ignore repulse larger than 500
                        if(d > 500) {
                            continue;
                        }
                        if(d < 5) {
                            d = 5;
                        }
                        // k * k / d
                        var repFact = (n1.w + n2.w) * k2 / d / d;
                        scaleAndAdd(n1.f, n1.f, v12, -repFact);
                        scaleAndAdd(n2.f, n2.f, v12, repFact);
                    }
                }
                for (var i = 0; i < edges.length; i++) {
                    var e = edges[i];
                    var n1 = e.n1;
                    var n2 = e.n2;

                    vec2.sub(v12, n2.p, n1.p);
                    var d2 = vec2.lenSquare(v12);
                    if (d2 === 0) {
                        continue;
                    }
                    // d * d / k
                    var attrFact = e.w * Math.sqrt(d2) / k;
                    scaleAndAdd(n1.f, n1.f, v12, attrFact);
                    scaleAndAdd(n2.f, n2.f, v12, -attrFact);
                }
                // Gravity
                for (var i = 0; i < nLen; i++){
                    var n = nodes[i];
                    vec2.sub(v12, center, n.p);
                    var forceFactor = vec2.len(v12) * gravity / 1000;
                    vec2.scaleAndAdd(n.f, n.f, v12, forceFactor);
                }
                var v = [];
                for (var i = 0; i < nLen; i++) {
                    var n = nodes[i];
                    vec2.sub(v, n.p, n.pp);
                    vec2.add(v, v, vec2.scale(n.f, n.f, friction / 100));
                    vec2.add(n.p, n.p, v);

                    vec2.copy(n.pp, n.p);
                }

                friction = friction * 0.99;

                cb && cb(nodes, edges, friction < 0.012);
            }
        };
    };
});
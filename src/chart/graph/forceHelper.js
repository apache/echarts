/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

/*
* The layout implementation references to d3.js. The use of
* the source code of this file is also subject to the terms
* and consitions of its license (BSD-3Clause, see
* <echarts/src/licenses/LICENSE-d3>).
*/

import * as vec2 from 'zrender/src/core/vector';

var scaleAndAdd = vec2.scaleAndAdd;

// function adjacentNode(n, e) {
//     return e.n1 === n ? e.n2 : e.n1;
// }

export function forceLayout(nodes, edges, opts) {
    var rect = opts.rect;
    var width = rect.width;
    var height = rect.height;
    var center = [rect.x + width / 2, rect.y + height / 2];
    // var scale = opts.scale || 1;
    var gravity = opts.gravity == null ? 0.1 : opts.gravity;

    // for (var i = 0; i < edges.length; i++) {
    //     var e = edges[i];
    //     var n1 = e.n1;
    //     var n2 = e.n2;
    //     n1.edges = n1.edges || [];
    //     n2.edges = n2.edges || [];
    //     n1.edges.push(e);
    //     n2.edges.push(e);
    // }
    // Init position
    for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!n.p) {
            // Use the position from first adjecent node with defined position
            // Or use a random position
            // From d3
            // if (n.edges) {
            //     var j = -1;
            //     while (++j < n.edges.length) {
            //         var e = n.edges[j];
            //         var other = adjacentNode(n, e);
            //         if (other.p) {
            //             n.p = vec2.clone(other.p);
            //             break;
            //         }
            //     }
            // }
            // if (!n.p) {
                n.p = vec2.create(
                    width * (Math.random() - 0.5) + center[0],
                    height * (Math.random() - 0.5) + center[1]
                );
            // }
        }
        n.pp = vec2.clone(n.p);
        n.edges = null;
    }

    // Formula in 'Graph Drawing by Force-directed Placement'
    // var k = scale * Math.sqrt(width * height / nodes.length);
    // var k2 = k * k;

    var friction = 0.6;

    return {
        warmUp: function () {
            friction = 0.5;
        },

        setFixed: function (idx) {
            nodes[idx].fixed = true;
        },

        setUnfixed: function (idx) {
            nodes[idx].fixed = false;
        },

        step: function (cb) {
            var v12 = [];
            var nLen = nodes.length;
            for (var i = 0; i < edges.length; i++) {
                var e = edges[i];
                var n1 = e.n1;
                var n2 = e.n2;

                vec2.sub(v12, n2.p, n1.p);
                var d = vec2.len(v12) - e.d;
                var w = n2.w / (n1.w + n2.w);

                if (isNaN(w)) {
                    w = 0;
                }

                vec2.normalize(v12, v12);

                !n1.fixed && scaleAndAdd(n1.p, n1.p, v12, w * d * friction);
                !n2.fixed && scaleAndAdd(n2.p, n2.p, v12, -(1 - w) * d * friction);
            }
            // Gravity
            for (var i = 0; i < nLen; i++) {
                var n = nodes[i];
                if (!n.fixed) {
                    vec2.sub(v12, center, n.p);
                    // var d = vec2.len(v12);
                    // vec2.scale(v12, v12, 1 / d);
                    // var gravityFactor = gravity;
                    scaleAndAdd(n.p, n.p, v12, gravity * friction);
                }
            }

            // Repulsive
            // PENDING
            for (var i = 0; i < nLen; i++) {
                var n1 = nodes[i];
                for (var j = i + 1; j < nLen; j++) {
                    var n2 = nodes[j];
                    vec2.sub(v12, n2.p, n1.p);
                    var d = vec2.len(v12);
                    if (d === 0) {
                        // Random repulse
                        vec2.set(v12, Math.random() - 0.5, Math.random() - 0.5);
                        d = 1;
                    }
                    var repFact = (n1.rep + n2.rep) / d / d;
                    !n1.fixed && scaleAndAdd(n1.pp, n1.pp, v12, repFact);
                    !n2.fixed && scaleAndAdd(n2.pp, n2.pp, v12, -repFact);
                }
            }
            var v = [];
            for (var i = 0; i < nLen; i++) {
                var n = nodes[i];
                if (!n.fixed) {
                    vec2.sub(v, n.p, n.pp);
                    scaleAndAdd(n.p, n.p, v, friction);
                    vec2.copy(n.pp, n.p);
                }
            }

            friction = friction * 0.992;

            cb && cb(nodes, edges, friction < 0.01);
        }
    };
}
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
* A third-party license is embedded for some of the code in this file:
* Some formulas were originally copied from "d3.js" with some
* modifications made for this project.
* (See more details in the comment of the method "step" below.)
* The use of the source code of this file is also subject to the terms
* and consitions of the license of "d3.js" (BSD-3Clause, see
* </licenses/LICENSE-d3>).
*/

import * as vec2 from 'zrender/src/core/vector';
import { RectLike } from 'zrender/src/core/BoundingRect';

const scaleAndAdd = vec2.scaleAndAdd;

interface InputNode {
    p?: vec2.VectorArray
    fixed?: boolean
    /**
     * Weight
     */
    w: number
    /**
     * Repulsion
     */
    rep: number
}
interface LayoutNode extends InputNode {
    pp?: vec2.VectorArray
    edges?: LayoutEdge[]
}
interface InputEdge {
    ignoreForceLayout?: boolean
    n1: InputNode
    n2: InputNode

    /**
     * Distance
     */
    d: number
}
interface LayoutEdge extends InputEdge {
    n1: LayoutNode
    n2: LayoutNode
}
interface LayoutCfg {
    gravity?: number
    friction?: number
    rect?: RectLike
}
// function adjacentNode(n, e) {
//     return e.n1 === n ? e.n2 : e.n1;
// }

export function forceLayout<N extends InputNode, E extends InputEdge>(
    inNodes: N[],
    inEdges: E[],
    opts: LayoutCfg
) {
    const nodes = inNodes as LayoutNode[];
    const edges = inEdges as LayoutEdge[];
    const rect = opts.rect;
    const width = rect.width;
    const height = rect.height;
    const center = [rect.x + width / 2, rect.y + height / 2];
    // let scale = opts.scale || 1;
    const gravity = opts.gravity == null ? 0.1 : opts.gravity;

    // for (let i = 0; i < edges.length; i++) {
    //     let e = edges[i];
    //     let n1 = e.n1;
    //     let n2 = e.n2;
    //     n1.edges = n1.edges || [];
    //     n2.edges = n2.edges || [];
    //     n1.edges.push(e);
    //     n2.edges.push(e);
    // }
    // Init position
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i] as LayoutNode;
        if (!n.p) {
            n.p = vec2.create(
                width * (Math.random() - 0.5) + center[0],
                height * (Math.random() - 0.5) + center[1]
            );
        }
        n.pp = vec2.clone(n.p);
        n.edges = null;
    }

    // Formula in 'Graph Drawing by Force-directed Placement'
    // let k = scale * Math.sqrt(width * height / nodes.length);
    // let k2 = k * k;

    const initialFriction = opts.friction == null ? 0.6 : opts.friction;
    let friction = initialFriction;

    let beforeStepCallback: (nodes: N[], edges: E[]) => void;
    let afterStepCallback: (nodes: N[], edges: E[], finished: boolean) => void;

    return {
        warmUp: function () {
            friction = initialFriction * 0.8;
        },

        setFixed: function (idx: number) {
            nodes[idx].fixed = true;
        },

        setUnfixed: function (idx: number) {
            nodes[idx].fixed = false;
        },

        /**
         * Before step hook
         */
        beforeStep: function (cb: typeof beforeStepCallback) {
            beforeStepCallback = cb;
        },
        /**
         * After step hook
         */
        afterStep: function (cb: typeof afterStepCallback) {
            afterStepCallback = cb;
        },

        /**
         * Some formulas were originally copied from "d3.js"
         * https://github.com/d3/d3/blob/b516d77fb8566b576088e73410437494717ada26/src/layout/force.js
         * with some modifications made for this project.
         * See the license statement at the head of this file.
         */
        step: function (cb?: (finished: boolean) => void) {
            beforeStepCallback && beforeStepCallback(nodes as N[], edges as E[]);

            const v12: number[] = [];
            const nLen = nodes.length;
            for (let i = 0; i < edges.length; i++) {
                const e = edges[i];
                if (e.ignoreForceLayout) {
                    continue;
                }
                const n1 = e.n1;
                const n2 = e.n2;

                vec2.sub(v12, n2.p, n1.p);
                const d = vec2.len(v12) - e.d;
                let w = n2.w / (n1.w + n2.w);

                if (isNaN(w)) {
                    w = 0;
                }

                vec2.normalize(v12, v12);

                !n1.fixed && scaleAndAdd(n1.p, n1.p, v12, w * d * friction);
                !n2.fixed && scaleAndAdd(n2.p, n2.p, v12, -(1 - w) * d * friction);
            }
            // Gravity
            for (let i = 0; i < nLen; i++) {
                const n = nodes[i];
                if (!n.fixed) {
                    vec2.sub(v12, center, n.p);
                    // let d = vec2.len(v12);
                    // vec2.scale(v12, v12, 1 / d);
                    // let gravityFactor = gravity;
                    scaleAndAdd(n.p, n.p, v12, gravity * friction);
                }
            }

            // Repulsive
            // PENDING
            for (let i = 0; i < nLen; i++) {
                const n1 = nodes[i];
                for (let j = i + 1; j < nLen; j++) {
                    const n2 = nodes[j];
                    vec2.sub(v12, n2.p, n1.p);
                    let d = vec2.len(v12);
                    if (d === 0) {
                        // Random repulse
                        vec2.set(v12, Math.random() - 0.5, Math.random() - 0.5);
                        d = 1;
                    }
                    const repFact = (n1.rep + n2.rep) / d / d;
                    !n1.fixed && scaleAndAdd(n1.pp, n1.pp, v12, repFact);
                    !n2.fixed && scaleAndAdd(n2.pp, n2.pp, v12, -repFact);
                }
            }
            const v: number[] = [];
            for (let i = 0; i < nLen; i++) {
                const n = nodes[i];
                if (!n.fixed) {
                    vec2.sub(v, n.p, n.pp);
                    scaleAndAdd(n.p, n.p, v, friction);
                    vec2.copy(n.pp, n.p);
                }
            }

            friction = friction * 0.992;

            const finished = friction < 0.01;

            afterStepCallback && afterStepCallback(nodes as N[], edges as E[], finished);

            cb && cb(finished);
        }
    };
}

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

import { forceLayout } from '@/src/chart/graph/forceHelper';

function computeCOM(nodes: { p: number[], fixed?: boolean }[]) {
    let cx = 0, cy = 0, n = 0;
    for (const node of nodes) {
        if (!node.fixed) {
            cx += node.p[0];
            cy += node.p[1];
            n++;
        }
    }
    return { x: cx / n, y: cy / n, n };
}

describe('chart/graph/forceHelper', function () {

    describe('center of mass stability', function () {

        it('COM does not drift with equal node weights', function () {
            const nodes = [
                { w: 100, rep: 100, p: [100, 100] as number[] },
                { w: 100, rep: 100, p: [200, 100] as number[] },
                { w: 100, rep: 100, p: [150, 200] as number[] },
                { w: 100, rep: 100, p: [120, 160] as number[] }
            ];
            const edges = [
                { n1: nodes[0], n2: nodes[1], d: 50, ignoreForceLayout: false },
                { n1: nodes[1], n2: nodes[2], d: 50, ignoreForceLayout: false },
                { n1: nodes[2], n2: nodes[3], d: 50, ignoreForceLayout: false }
            ];

            const sim = forceLayout(nodes, edges, {
                rect: { x: 0, y: 0, width: 400, height: 400 },
                gravity: 0.5,
                friction: 0.3
            });

            const initial = computeCOM(nodes);

            for (let step = 0; step < 200; step++) {
                sim.step();
            }

            const final = computeCOM(nodes);
            expect(final.x).toBeCloseTo(initial.x, 5);
            expect(final.y).toBeCloseTo(initial.y, 5);
        });

        it('COM does not drift with unequal node weights', function () {
            const nodes = [
                { w: 1000, rep: 1000, p: [100, 100] as number[] },
                { w: 5000, rep: 5000, p: [200, 100] as number[] },
                { w: 200, rep: 200, p: [150, 250] as number[] },
                { w: 8000, rep: 8000, p: [300, 200] as number[] },
                { w: 500, rep: 500, p: [50, 300] as number[] }
            ];
            const edges = [
                { n1: nodes[0], n2: nodes[1], d: 30, ignoreForceLayout: false },
                { n1: nodes[1], n2: nodes[2], d: 30, ignoreForceLayout: false },
                { n1: nodes[2], n2: nodes[3], d: 30, ignoreForceLayout: false },
                { n1: nodes[3], n2: nodes[4], d: 30, ignoreForceLayout: false },
                { n1: nodes[0], n2: nodes[4], d: 30, ignoreForceLayout: false }
            ];

            const sim = forceLayout(nodes, edges, {
                rect: { x: 0, y: 0, width: 500, height: 500 },
                gravity: 1.0,
                friction: 0.1
            });

            const initial = computeCOM(nodes);

            for (let step = 0; step < 300; step++) {
                sim.step();
            }

            const final = computeCOM(nodes);
            expect(final.x).toBeCloseTo(initial.x, 5);
            expect(final.y).toBeCloseTo(initial.y, 5);
        });

        it('COM of free nodes does not drift when one node is fixed', function () {
            const nodes = [
                { w: 500, rep: 500, p: [50, 50] as number[], fixed: true },
                { w: 500, rep: 500, p: [200, 100] as number[] },
                { w: 500, rep: 500, p: [150, 250] as number[] },
                { w: 500, rep: 500, p: [300, 200] as number[] }
            ];
            const edges = [
                { n1: nodes[0], n2: nodes[1], d: 40, ignoreForceLayout: false },
                { n1: nodes[1], n2: nodes[2], d: 40, ignoreForceLayout: false },
                { n1: nodes[2], n2: nodes[3], d: 40, ignoreForceLayout: false }
            ];

            const sim = forceLayout(nodes, edges, {
                rect: { x: 0, y: 0, width: 400, height: 400 },
                gravity: 0.8,
                friction: 0.2
            });

            const initial = computeCOM(nodes);

            for (let step = 0; step < 200; step++) {
                sim.step();
            }

            const final = computeCOM(nodes);
            expect(final.x).toBeCloseTo(initial.x, 5);
            expect(final.y).toBeCloseTo(initial.y, 5);
        });
    });
});

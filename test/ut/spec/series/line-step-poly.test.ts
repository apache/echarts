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

import { ECPolyline } from '../../../../src/chart/line/poly';

type Cmd = ['M' | 'L', number, number] | ['C', number, number, number, number, number, number];

function recordCommands(polyline: ECPolyline): Cmd[] {
    const cmds: Cmd[] = [];
    const mockCtx = {
        moveTo(x: number, y: number) { cmds.push(['M', x, y]); },
        lineTo(x: number, y: number) { cmds.push(['L', x, y]); },
        bezierCurveTo(x: number, y: number, x2: number, y2: number, x3: number, y3: number) {
            cmds.push(['C', x, y, x2, y2, x3, y3]);
        },
        closePath() { /* noop */ }
    };
    polyline.buildPath(mockCtx as any, polyline.shape);
    return cmds;
}

describe('chart/line/poly', function () {

    // https://github.com/apache/echarts/issues/21614
    it('step mode keeps every corner even when points are visually close', function () {
        // Step-expanded points for data (0,1),(0.3,1),(0.3,0) with step:'end'.
        // Adjacent corners fall within the legacy `< 0.5` tiny-segment threshold,
        // which previously collapsed the L-shape into a slope.
        const points = [
            0, 1,
            0.3, 1,
            0.3, 1,
            0.3, 1,
            0.3, 0
        ];

        const polyline = new ECPolyline({
            shape: { points, smooth: 0, connectNulls: false, step: true }
        });

        const cmds = recordCommands(polyline);
        const lineTos = cmds.filter(c => c[0] === 'L');

        expect(cmds[0]).toEqual(['M', 0, 1]);

        const cornerIdx = lineTos.findIndex(c => c[1] === 0.3 && c[2] === 1);
        const tailIdx = lineTos.findIndex(c => c[1] === 0.3 && c[2] === 0);
        expect(cornerIdx).toBeGreaterThanOrEqual(0);
        expect(tailIdx).toBeGreaterThanOrEqual(0);
        expect(cornerIdx).toBeLessThan(tailIdx);
    });

    it('step mode still drops strictly duplicated points', function () {
        const points = [
            0, 0,
            0, 0,
            0, 0,
            5, 5
        ];

        const polyline = new ECPolyline({
            shape: { points, smooth: 0, connectNulls: false, step: true }
        });

        const cmds = recordCommands(polyline);
        const lineTos = cmds.filter(c => c[0] === 'L');

        expect(cmds[0]).toEqual(['M', 0, 0]);
        expect(lineTos).toEqual([['L', 5, 5]]);
    });

    it('non-step mode preserves the tiny-segment optimization', function () {
        const points = [
            0, 0,
            0.3, 0,
            10, 0
        ];

        const polyline = new ECPolyline({
            shape: { points, smooth: 0, connectNulls: false, step: false }
        });

        const lineTos = recordCommands(polyline).filter(c => c[0] === 'L');
        expect(lineTos).toEqual([['L', 10, 0]]);
    });

});

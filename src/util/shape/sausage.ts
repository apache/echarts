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

import {Path} from '../graphic';
import { PathProps } from 'zrender/src/graphic/Path';

/**
 * Sausage: similar to sector, but have half circle on both sides
 */

class SausageShape {
    cx = 0;
    cy = 0;
    r0 = 0;
    r = 0;
    startAngle = 0;
    endAngle = Math.PI * 2;
    clockwise = true;
}

interface SausagePathProps extends PathProps {
    shape?: SausageShape
}

class SausagePath extends Path<SausagePathProps> {

    type = 'sausage';

    constructor(opts?: SausagePathProps) {
        super(opts);
    }

    getDefaultShape() {
        return new SausageShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: SausageShape) {
        const x = shape.cx;
        const y = shape.cy;
        const r0 = Math.max(shape.r0 || 0, 0);
        const r = Math.max(shape.r, 0);
        const dr = (r - r0) * 0.5;
        const rCenter = r0 + dr;
        const startAngle = shape.startAngle;
        const endAngle = shape.endAngle;
        const clockwise = shape.clockwise;

        const unitStartX = Math.cos(startAngle);
        const unitStartY = Math.sin(startAngle);
        const unitEndX = Math.cos(endAngle);
        const unitEndY = Math.sin(endAngle);

        const lessThanCircle = clockwise
            ? endAngle - startAngle < Math.PI * 2
            : startAngle - endAngle < Math.PI * 2;

        if (lessThanCircle) {
            ctx.moveTo(unitStartX * r0 + x, unitStartY * r0 + y);

            ctx.arc(
                unitStartX * rCenter + x, unitStartY * rCenter + y, dr,
                -Math.PI + startAngle, startAngle, !clockwise
            );
        }

        ctx.arc(x, y, r, startAngle, endAngle, !clockwise);

        ctx.moveTo(unitEndX * r + x, unitEndY * r + y);

        ctx.arc(
            unitEndX * rCenter + x, unitEndY * rCenter + y, dr,
            endAngle - Math.PI * 2, endAngle - Math.PI, !clockwise
        );

        if (r0 !== 0) {
            ctx.arc(x, y, r0, endAngle, startAngle, clockwise);

            ctx.moveTo(unitStartX * r0 + x, unitEndY * r0 + y);
        }

        ctx.closePath();
    }
}

export default SausagePath;
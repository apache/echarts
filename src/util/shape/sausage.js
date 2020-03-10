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

import {extendShape} from '../graphic';

/**
 * Sausage: similar to sector, but have half circle on both sides
 * @public
 */
export default extendShape({

    type: 'sausage',

    shape: {

        cx: 0,

        cy: 0,

        r0: 0,

        r: 0,

        startAngle: 0,

        endAngle: Math.PI * 2,

        clockwise: true
    },

    buildPath: function (ctx, shape) {
        var x = shape.cx;
        var y = shape.cy;
        var r0 = Math.max(shape.r0 || 0, 0);
        var r = Math.max(shape.r, 0);
        var dr = (r - r0) * 0.5;
        var rCenter = r0 + dr;
        var startAngle = shape.startAngle;
        var endAngle = shape.endAngle;
        var clockwise = shape.clockwise;

        var unitStartX = Math.cos(startAngle);
        var unitStartY = Math.sin(startAngle);
        var unitEndX = Math.cos(endAngle);
        var unitEndY = Math.sin(endAngle);

        var lessThanCircle = clockwise
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
});

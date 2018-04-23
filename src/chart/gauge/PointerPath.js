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

import Path from 'zrender/src/graphic/Path';

export default Path.extend({

    type: 'echartsGaugePointer',

    shape: {
        angle: 0,

        width: 10,

        r: 10,

        x: 0,

        y: 0
    },

    buildPath: function (ctx, shape) {
        var mathCos = Math.cos;
        var mathSin = Math.sin;

        var r = shape.r;
        var width = shape.width;
        var angle = shape.angle;
        var x = shape.x - mathCos(angle) * width * (width >= r / 3 ? 1 : 2);
        var y = shape.y - mathSin(angle) * width * (width >= r / 3 ? 1 : 2);

        angle = shape.angle - Math.PI / 2;
        ctx.moveTo(x, y);
        ctx.lineTo(
            shape.x + mathCos(angle) * width,
            shape.y + mathSin(angle) * width
        );
        ctx.lineTo(
            shape.x + mathCos(shape.angle) * r,
            shape.y + mathSin(shape.angle) * r
        );
        ctx.lineTo(
            shape.x - mathCos(angle) * width,
            shape.y - mathSin(angle) * width
        );
        ctx.lineTo(x, y);
        return;
    }
});
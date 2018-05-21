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

/**
 * Line path for bezier and straight line draw
 */

import * as graphic from '../../util/graphic';
import * as vec2 from 'zrender/src/core/vector';

var straightLineProto = graphic.Line.prototype;
var bezierCurveProto = graphic.BezierCurve.prototype;

function isLine(shape) {
    return isNaN(+shape.cpx1) || isNaN(+shape.cpy1);
}

export default graphic.extendShape({

    type: 'ec-line',

    style: {
        stroke: '#000',
        fill: null
    },

    shape: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        percent: 1,
        cpx1: null,
        cpy1: null
    },

    buildPath: function (ctx, shape) {
        (isLine(shape) ? straightLineProto : bezierCurveProto).buildPath(ctx, shape);
    },

    pointAt: function (t) {
        return isLine(this.shape)
            ? straightLineProto.pointAt.call(this, t)
            : bezierCurveProto.pointAt.call(this, t);
    },

    tangentAt: function (t) {
        var shape = this.shape;
        var p = isLine(shape)
            ? [shape.x2 - shape.x1, shape.y2 - shape.y1]
            : bezierCurveProto.tangentAt.call(this, t);
        return vec2.normalize(p, p);
    }
});
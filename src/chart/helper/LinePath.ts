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
import { PathProps } from 'zrender/src/graphic/Path';
import { ColorString } from '../../util/types';

const straightLineProto = graphic.Line.prototype;
const bezierCurveProto = graphic.BezierCurve.prototype;

class StraightLineShape {
    // Start point
    x1 = 0;
    y1 = 0;
    // End point
    x2 = 0;
    y2 = 0;

    percent = 1;
}

class CurveShape extends StraightLineShape {
    cpx1: number;
    cpy1: number;
}

interface ECLineProps extends PathProps {
    shape?: Partial<StraightLineShape | CurveShape>
}
function isStraightLine(shape: StraightLineShape | CurveShape): shape is StraightLineShape {
    return isNaN(+(shape as CurveShape).cpx1) || isNaN(+(shape as CurveShape).cpy1);
}

class ECLinePath extends graphic.Path<ECLineProps> {

    type = 'ec-line';

    shape: StraightLineShape | CurveShape;

    constructor(opts?: ECLineProps) {
        super(opts);
    }

    getDefaultStyle() {
        return {
            stroke: '#000',
            fill: null as ColorString
        };
    }

    getDefaultShape() {
        return new StraightLineShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: StraightLineShape | CurveShape) {
        if (isStraightLine(shape)) {
            straightLineProto.buildPath.call(this, ctx, shape);
        }
        else {
            bezierCurveProto.buildPath.call(this, ctx, shape);
        }
    }

    pointAt(t: number) {
        if (isStraightLine(this.shape)) {
            return straightLineProto.pointAt.call(this, t);
        }
        else {
            return bezierCurveProto.pointAt.call(this, t);
        }
    }

    tangentAt(t: number) {
        const shape = this.shape;
        const p = isStraightLine(shape)
            ? [shape.x2 - shape.x1, shape.y2 - shape.y1]
            : bezierCurveProto.tangentAt.call(this, t);
        return vec2.normalize(p, p);
    }

}

export default ECLinePath;
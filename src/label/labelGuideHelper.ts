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

import {
    Point,
    Path,
    Polyline
} from '../util/graphic';
import PathProxy from 'zrender/src/core/PathProxy';
import { RectLike } from 'zrender/src/core/BoundingRect';
import { normalizeRadian } from 'zrender/src/contain/util';
import { cubicProjectPoint, quadraticProjectPoint } from 'zrender/src/core/curve';
import Element from 'zrender/src/Element';
import { defaults, retrieve2 } from 'zrender/src/core/util';
import { LabelLineOption, DisplayState, StatesOptionMixin } from '../util/types';
import Model from '../model/Model';
import { invert } from 'zrender/src/core/matrix';
import * as vector from 'zrender/src/core/vector';
import { DISPLAY_STATES, SPECIAL_STATES } from '../util/states';

const PI2 = Math.PI * 2;
const CMD = PathProxy.CMD;

const DEFAULT_SEARCH_SPACE = ['top', 'right', 'bottom', 'left'] as const;

type CandidatePosition = typeof DEFAULT_SEARCH_SPACE[number];

function getCandidateAnchor(
    pos: CandidatePosition,
    distance: number,
    rect: RectLike,
    outPt: Point,
    outDir: Point
) {
    const width = rect.width;
    const height = rect.height;
    switch (pos) {
        case 'top':
            outPt.set(
                rect.x + width / 2,
                rect.y - distance
            );
            outDir.set(0, -1);
            break;
        case 'bottom':
            outPt.set(
                rect.x + width / 2,
                rect.y + height + distance
            );
            outDir.set(0, 1);
            break;
        case 'left':
            outPt.set(
                rect.x - distance,
                rect.y + height / 2
            );
            outDir.set(-1, 0);
            break;
        case 'right':
            outPt.set(
                rect.x + width + distance,
                rect.y + height / 2
            );
            outDir.set(1, 0);
            break;
    }
}


function projectPointToArc(
    cx: number, cy: number, r: number, startAngle: number, endAngle: number, anticlockwise: boolean,
    x: number, y: number, out: number[]
): number {
    x -= cx;
    y -= cy;
    const d = Math.sqrt(x * x + y * y);
    x /= d;
    y /= d;

    // Intersect point.
    const ox = x * r + cx;
    const oy = y * r + cy;

    if (Math.abs(startAngle - endAngle) % PI2 < 1e-4) {
        // Is a circle
        out[0] = ox;
        out[1] = oy;
        return d - r;
    }

    if (anticlockwise) {
        const tmp = startAngle;
        startAngle = normalizeRadian(endAngle);
        endAngle = normalizeRadian(tmp);
    }
    else {
        startAngle = normalizeRadian(startAngle);
        endAngle = normalizeRadian(endAngle);
    }
    if (startAngle > endAngle) {
        endAngle += PI2;
    }

    let angle = Math.atan2(y, x);
    if (angle < 0) {
        angle += PI2;
    }
    if ((angle >= startAngle && angle <= endAngle)
        || (angle + PI2 >= startAngle && angle + PI2 <= endAngle)) {
        // Project point is on the arc.
        out[0] = ox;
        out[1] = oy;
        return d - r;
    }

    const x1 = r * Math.cos(startAngle) + cx;
    const y1 = r * Math.sin(startAngle) + cy;

    const x2 = r * Math.cos(endAngle) + cx;
    const y2 = r * Math.sin(endAngle) + cy;

    const d1 = (x1 - x) * (x1 - x) + (y1 - y) * (y1 - y);
    const d2 = (x2 - x) * (x2 - x) + (y2 - y) * (y2 - y);

    if (d1 < d2) {
        out[0] = x1;
        out[1] = y1;
        return Math.sqrt(d1);
    }
    else {
        out[0] = x2;
        out[1] = y2;
        return Math.sqrt(d2);
    }
}

function projectPointToLine(
    x1: number, y1: number, x2: number, y2: number, x: number, y: number, out: number[], limitToEnds: boolean
) {
    const dx = x - x1;
    const dy = y - y1;

    let dx1 = x2 - x1;
    let dy1 = y2 - y1;

    const lineLen = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    dx1 /= lineLen;
    dy1 /= lineLen;

    // dot product
    const projectedLen = dx * dx1 + dy * dy1;
    let t = projectedLen / lineLen;
    if (limitToEnds) {
        t = Math.min(Math.max(t, 0), 1);
    }
    t *= lineLen;
    const ox = out[0] = x1 + t * dx1;
    const oy = out[1] = y1 + t * dy1;

    return Math.sqrt((ox - x) * (ox - x) + (oy - y) * (oy - y));
}

function projectPointToRect(
    x1: number, y1: number, width: number, height: number, x: number, y: number, out: number[]
): number {
    if (width < 0) {
        x1 = x1 + width;
        width = -width;
    }
    if (height < 0) {
        y1 = y1 + height;
        height = -height;
    }
    const x2 = x1 + width;
    const y2 = y1 + height;

    const ox = out[0] = Math.min(Math.max(x, x1), x2);
    const oy = out[1] = Math.min(Math.max(y, y1), y2);

    return Math.sqrt((ox - x) * (ox - x) + (oy - y) * (oy - y));
}

const tmpPt: number[] = [];

function nearestPointOnRect(pt: Point, rect: RectLike, out: Point) {
    const dist = projectPointToRect(
        rect.x, rect.y, rect.width, rect.height,
        pt.x, pt.y, tmpPt
    );
    out.set(tmpPt[0], tmpPt[1]);
    return dist;
}
/**
 * Calculate min distance corresponding point.
 * This method won't evaluate if point is in the path.
 */
function nearestPointOnPath(pt: Point, path: PathProxy, out: Point) {
    let xi = 0;
    let yi = 0;
    let x0 = 0;
    let y0 = 0;
    let x1;
    let y1;

    let minDist = Infinity;

    const data = path.data;
    const x = pt.x;
    const y = pt.y;

    for (let i = 0; i < data.length;) {
        const cmd = data[i++];

        if (i === 1) {
            xi = data[i];
            yi = data[i + 1];
            x0 = xi;
            y0 = yi;
        }

        let d = minDist;

        switch (cmd) {
            case CMD.M:
                // moveTo 命令重新创建一个新的 subpath, 并且更新新的起点
                // 在 closePath 的时候使用
                x0 = data[i++];
                y0 = data[i++];
                xi = x0;
                yi = y0;
                break;
            case CMD.L:
                d = projectPointToLine(xi, yi, data[i], data[i + 1], x, y, tmpPt, true);
                xi = data[i++];
                yi = data[i++];
                break;
            case CMD.C:
                d = cubicProjectPoint(
                    xi, yi,
                    data[i++], data[i++], data[i++], data[i++], data[i], data[i + 1],
                    x, y, tmpPt
                );

                xi = data[i++];
                yi = data[i++];
                break;
            case CMD.Q:
                d = quadraticProjectPoint(
                    xi, yi,
                    data[i++], data[i++], data[i], data[i + 1],
                    x, y, tmpPt
                );
                xi = data[i++];
                yi = data[i++];
                break;
            case CMD.A:
                // TODO Arc 判断的开销比较大
                const cx = data[i++];
                const cy = data[i++];
                const rx = data[i++];
                const ry = data[i++];
                const theta = data[i++];
                const dTheta = data[i++];
                // TODO Arc 旋转
                i += 1;
                const anticlockwise = !!(1 - data[i++]);
                x1 = Math.cos(theta) * rx + cx;
                y1 = Math.sin(theta) * ry + cy;
                // 不是直接使用 arc 命令
                if (i <= 1) {
                    // 第一个命令起点还未定义
                    x0 = x1;
                    y0 = y1;
                }
                // zr 使用scale来模拟椭圆, 这里也对x做一定的缩放
                const _x = (x - cx) * ry / rx + cx;
                d = projectPointToArc(
                    cx, cy, ry, theta, theta + dTheta, anticlockwise,
                    _x, y, tmpPt
                );
                xi = Math.cos(theta + dTheta) * rx + cx;
                yi = Math.sin(theta + dTheta) * ry + cy;
                break;
            case CMD.R:
                x0 = xi = data[i++];
                y0 = yi = data[i++];
                const width = data[i++];
                const height = data[i++];
                d = projectPointToRect(x0, y0, width, height, x, y, tmpPt);
                break;
            case CMD.Z:
                d = projectPointToLine(xi, yi, x0, y0, x, y, tmpPt, true);

                xi = x0;
                yi = y0;
                break;
        }

        if (d < minDist) {
            minDist = d;
            out.set(tmpPt[0], tmpPt[1]);
        }
    }

    return minDist;
}

// Temporal varible for intermediate usage.
const pt0 = new Point();
const pt1 = new Point();
const pt2 = new Point();
const dir = new Point();
const dir2 = new Point();

/**
 * Calculate a proper guide line based on the label position and graphic element definition
 * @param label
 * @param labelRect
 * @param target
 * @param targetRect
 */
export function updateLabelLinePoints(
    target: Element,
    labelLineModel: Model<LabelLineOption>
) {
    if (!target) {
        return;
    }

    const labelLine = target.getTextGuideLine();
    const label = target.getTextContent();
    // Needs to create text guide in each charts.
    if (!(label && labelLine)) {
        return;
    }

    const labelGuideConfig = target.textGuideLineConfig || {};

    const points = [[0, 0], [0, 0], [0, 0]];

    const searchSpace = labelGuideConfig.candidates || DEFAULT_SEARCH_SPACE;
    const labelRect = label.getBoundingRect().clone();
    labelRect.applyTransform(label.getComputedTransform());

    let minDist = Infinity;
    const anchorPoint = labelGuideConfig.anchor;
    const targetTransform = target.getComputedTransform();
    const targetInversedTransform = targetTransform && invert([], targetTransform);
    const len = labelLineModel.get('length2') || 0;

    if (anchorPoint) {
        pt2.copy(anchorPoint);
    }
    for (let i = 0; i < searchSpace.length; i++) {
        const candidate = searchSpace[i];
        getCandidateAnchor(candidate, 0, labelRect, pt0, dir);
        Point.scaleAndAdd(pt1, pt0, dir, len);

        // Transform to target coord space.
        pt1.transform(targetInversedTransform);

        // Note: getBoundingRect will ensure the `path` being created.
        const boundingRect = target.getBoundingRect();
        const dist = anchorPoint ? anchorPoint.distance(pt1)
            : (target instanceof Path
                ? nearestPointOnPath(pt1, target.path, pt2)
                : nearestPointOnRect(pt1, boundingRect, pt2));

        // TODO pt2 is in the path
        if (dist < minDist) {
            minDist = dist;
            // Transform back to global space.
            pt1.transform(targetTransform);
            pt2.transform(targetTransform);

            pt2.toArray(points[0]);
            pt1.toArray(points[1]);
            pt0.toArray(points[2]);
        }
    }

    limitTurnAngle(points, labelLineModel.get('minTurnAngle'));

    labelLine.setShape({ points });
}

// Temporal variable for the limitTurnAngle function
const tmpArr: number[] = [];
const tmpProjPoint = new Point();
/**
 * Reduce the line segment attached to the label to limit the turn angle between two segments.
 * @param linePoints
 * @param minTurnAngle Radian of minimum turn angle. 0 - 180
 */
export function limitTurnAngle(linePoints: number[][], minTurnAngle: number) {
    if (!(minTurnAngle <= 180 && minTurnAngle > 0)) {
        return;
    }
    minTurnAngle = minTurnAngle / 180 * Math.PI;
    // The line points can be
    //      /pt1----pt2 (label)
    //     /
    // pt0/
    pt0.fromArray(linePoints[0]);
    pt1.fromArray(linePoints[1]);
    pt2.fromArray(linePoints[2]);

    Point.sub(dir, pt0, pt1);
    Point.sub(dir2, pt2, pt1);

    const len1 = dir.len();
    const len2 = dir2.len();
    if (len1 < 1e-3 || len2 < 1e-3) {
        return;
    }

    dir.scale(1 / len1);
    dir2.scale(1 / len2);

    const angleCos = dir.dot(dir2);
    const minTurnAngleCos = Math.cos(minTurnAngle);
    if (minTurnAngleCos < angleCos) {    // Smaller than minTurnAngle
        // Calculate project point of pt0 on pt1-pt2
        const d = projectPointToLine(pt1.x, pt1.y, pt2.x, pt2.y, pt0.x, pt0.y, tmpArr, false);
        tmpProjPoint.fromArray(tmpArr);
        // Calculate new projected length with limited minTurnAngle and get the new connect point
        tmpProjPoint.scaleAndAdd(dir2, d / Math.tan(Math.PI - minTurnAngle));
        // Limit the new calculated connect point between pt1 and pt2.
        const t = pt2.x !== pt1.x
            ? (tmpProjPoint.x - pt1.x) / (pt2.x - pt1.x)
            : (tmpProjPoint.y - pt1.y) / (pt2.y - pt1.y);
        if (isNaN(t)) {
            return;
        }

        if (t < 0) {
            Point.copy(tmpProjPoint, pt1);
        }
        else if (t > 1) {
            Point.copy(tmpProjPoint, pt2);
        }

        tmpProjPoint.toArray(linePoints[1]);
    }
}

/**
 * Limit the angle of line and the surface
 * @param maxSurfaceAngle Radian of minimum turn angle. 0 - 180. 0 is same direction to normal. 180 is opposite
 */
export function limitSurfaceAngle(linePoints: vector.VectorArray[], surfaceNormal: Point, maxSurfaceAngle: number) {
    if (!(maxSurfaceAngle <= 180 && maxSurfaceAngle > 0)) {
        return;
    }
    maxSurfaceAngle = maxSurfaceAngle / 180 * Math.PI;

    pt0.fromArray(linePoints[0]);
    pt1.fromArray(linePoints[1]);
    pt2.fromArray(linePoints[2]);

    Point.sub(dir, pt1, pt0);
    Point.sub(dir2, pt2, pt1);

    const len1 = dir.len();
    const len2 = dir2.len();

    if (len1 < 1e-3 || len2 < 1e-3) {
        return;
    }

    dir.scale(1 / len1);
    dir2.scale(1 / len2);

    const angleCos = dir.dot(surfaceNormal);
    const maxSurfaceAngleCos = Math.cos(maxSurfaceAngle);

    if (angleCos < maxSurfaceAngleCos) {
        // Calculate project point of pt0 on pt1-pt2
        const d = projectPointToLine(pt1.x, pt1.y, pt2.x, pt2.y, pt0.x, pt0.y, tmpArr, false);
        tmpProjPoint.fromArray(tmpArr);

        const HALF_PI = Math.PI / 2;
        const angle2 = Math.acos(dir2.dot(surfaceNormal));
        const newAngle = HALF_PI + angle2 - maxSurfaceAngle;
        if (newAngle >= HALF_PI) {
            // parallel
            Point.copy(tmpProjPoint, pt2);
        }
        else {
            // Calculate new projected length with limited minTurnAngle and get the new connect point
            tmpProjPoint.scaleAndAdd(dir2, d / Math.tan(Math.PI / 2 - newAngle));
            // Limit the new calculated connect point between pt1 and pt2.
            const t = pt2.x !== pt1.x
                ? (tmpProjPoint.x - pt1.x) / (pt2.x - pt1.x)
                : (tmpProjPoint.y - pt1.y) / (pt2.y - pt1.y);
            if (isNaN(t)) {
                return;
            }

            if (t < 0) {
                Point.copy(tmpProjPoint, pt1);
            }
            else if (t > 1) {
                Point.copy(tmpProjPoint, pt2);
            }
        }

        tmpProjPoint.toArray(linePoints[1]);
    }
}


type LabelLineModel = Model<LabelLineOption>;

function setLabelLineState(
    labelLine: Polyline,
    ignore: boolean,
    stateName: string,
    stateModel: Model
) {
    const isNormal = stateName === 'normal';
    const stateObj = isNormal ? labelLine : labelLine.ensureState(stateName);
    // Make sure display.
    stateObj.ignore = ignore;
    // Set smooth
    let smooth = stateModel.get('smooth');
    if (smooth && smooth === true) {
        smooth = 0.3;
    }
    stateObj.shape = stateObj.shape || {};
    if (smooth > 0) {
        (stateObj.shape as Polyline['shape']).smooth = smooth as number;
    }

    const styleObj = stateModel.getModel('lineStyle').getLineStyle();
    isNormal ? labelLine.useStyle(styleObj) : stateObj.style = styleObj;
}

function buildLabelLinePath(path: CanvasRenderingContext2D, shape: Polyline['shape']) {
    const smooth = shape.smooth as number;
    const points = shape.points;
    if (!points) {
        return;
    }
    path.moveTo(points[0][0], points[0][1]);
    if (smooth > 0 && points.length >= 3) {
        const len1 = vector.dist(points[0], points[1]);
        const len2 = vector.dist(points[1], points[2]);
        if (!len1 || !len2) {
            path.lineTo(points[1][0], points[1][1]);
            path.lineTo(points[2][0], points[2][1]);
            return;
        }

        const moveLen = Math.min(len1, len2) * smooth;

        const midPoint0 = vector.lerp([], points[1], points[0], moveLen / len1);
        const midPoint2 = vector.lerp([], points[1], points[2], moveLen / len2);

        const midPoint1 = vector.lerp([], midPoint0, midPoint2, 0.5);
        path.bezierCurveTo(midPoint0[0], midPoint0[1], midPoint0[0], midPoint0[1], midPoint1[0], midPoint1[1]);
        path.bezierCurveTo(midPoint2[0], midPoint2[1], midPoint2[0], midPoint2[1], points[2][0], points[2][1]);
    }
    else {
        for (let i = 1; i < points.length; i++) {
            path.lineTo(points[i][0], points[i][1]);
        }
    }
}

/**
 * Create a label line if necessary and set it's style.
 */
export function setLabelLineStyle(
    targetEl: Element,
    statesModels: Record<DisplayState, LabelLineModel>,
    defaultStyle?: Polyline['style']
) {
    let labelLine = targetEl.getTextGuideLine();
    const label = targetEl.getTextContent();
    if (!label) {
        // Not show label line if there is no label.
        if (labelLine) {
            targetEl.removeTextGuideLine();
        }
        return;
    }

    const normalModel = statesModels.normal;
    const showNormal = normalModel.get('show');
    const labelIgnoreNormal = label.ignore;

    for (let i = 0; i < DISPLAY_STATES.length; i++) {
        const stateName = DISPLAY_STATES[i];
        const stateModel = statesModels[stateName];
        const isNormal = stateName === 'normal';
        if (stateModel) {
            const stateShow = stateModel.get('show');
            const isLabelIgnored = isNormal
                ? labelIgnoreNormal
                : retrieve2(label.states[stateName] && label.states[stateName].ignore, labelIgnoreNormal);
            if (isLabelIgnored  // Not show when label is not shown in this state.
                || !retrieve2(stateShow, showNormal) // Use normal state by default if not set.
            ) {
                const stateObj = isNormal ? labelLine : (labelLine && labelLine.states.normal);
                if (stateObj) {
                    stateObj.ignore = true;
                }
                continue;
            }
            // Create labelLine if not exists
            if (!labelLine) {
                labelLine = new Polyline();
                targetEl.setTextGuideLine(labelLine);
                // Reset state of normal because it's new created.
                // NOTE: NORMAL should always been the first!
                if (!isNormal && (labelIgnoreNormal || !showNormal)) {
                    setLabelLineState(labelLine, true, 'normal', statesModels.normal);
                }

                // Use same state proxy.
                if (targetEl.stateProxy) {
                    labelLine.stateProxy = targetEl.stateProxy;
                }
            }

            setLabelLineState(labelLine, false, stateName, stateModel);
        }
    }

    if (labelLine) {
        defaults(labelLine.style, defaultStyle);
        // Not fill.
        labelLine.style.fill = null;

        const showAbove = normalModel.get('showAbove');

        const labelLineConfig = (targetEl.textGuideLineConfig = targetEl.textGuideLineConfig || {});
        labelLineConfig.showAbove = showAbove || false;

        // Custom the buildPath.
        labelLine.buildPath = buildLabelLinePath;
    }
}


export function getLabelLineStatesModels<LabelName extends string = 'labelLine'>(
    itemModel: Model<StatesOptionMixin<any> & Partial<Record<LabelName, any>>>,
    labelLineName?: LabelName
): Record<DisplayState, LabelLineModel> {
    labelLineName = (labelLineName || 'labelLine') as LabelName;
    const statesModels = {
        normal: itemModel.getModel(labelLineName) as LabelLineModel
    } as Record<DisplayState, LabelLineModel>;
    for (let i = 0; i < SPECIAL_STATES.length; i++) {
        const stateName = SPECIAL_STATES[i];
        statesModels[stateName] = itemModel.getModel([stateName, labelLineName]);
    }
    return statesModels;
}
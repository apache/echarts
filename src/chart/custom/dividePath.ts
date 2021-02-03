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

import { clonePath } from 'zrender/src/tool/path';
import { Circle, Path, Polygon, Rect, Sector } from '../../util/graphic';

// Default shape dividers

interface BinaryDivide {
    (shape: Path['shape'], out: Path['shape'][]): void
}

const SECTOR_COMMON_PROPS: (keyof Sector['shape'])[] = ['clockwise', 'cornerRadius', 'innerCornerRadius', 'cx', 'cy'];

function copyShapeProps(out: Path['shape'][], source: Path['shape'], keys: string[]) {
    // Copy common props
    for (let i = 0; i < SECTOR_COMMON_PROPS.length; i++) {
        const propName = SECTOR_COMMON_PROPS[i];
        if (source[propName] != null) {
            out[0][propName] = out[1][propName] = source[propName];
        }
    }
}

function binaryDivideSector(sectorShape: Sector['shape'], out: Sector['shape'][]) {
    // Divide into two
    const r0 = sectorShape.r0;
    const r = sectorShape.r;
    const startAngle = sectorShape.startAngle;
    const endAngle = sectorShape.endAngle;
    const angle = Math.abs(endAngle - startAngle);
    const arcLen = angle * r;
    if (arcLen < Math.abs(r - r0)) {
        const midR = (r0 + r) / 2;
        // Divide on radius
        out[0] = {
            startAngle,
            endAngle,
            r0,
            r: midR
        } as Sector['shape'];
        out[1] = {
            startAngle,
            endAngle,
            r0: midR,
            r
        } as Sector['shape'];
    }
    else {
        const midAngle = (startAngle + endAngle) / 2;
        // Divide on angle
        out[0] = {
            startAngle,
            endAngle: midAngle,
            r0,
            r
        } as Sector['shape'];
        out[1] = {
            startAngle: midAngle,
            endAngle,
            r0,
            r
        } as Sector['shape'];
    }

    copyShapeProps(out, sectorShape, SECTOR_COMMON_PROPS);
}


function binaryDivideRect(rectShape: Rect['shape'], out: Rect['shape'][]) {
    const width = rectShape.width;
    const height = rectShape.height;
    const x = rectShape.x;
    const y = rectShape.y;

    if (width < height) {
        const halfHeight = height / 2;
        out[0] = {
            x, width,
            y, height: halfHeight
        };
        out[1] = {
            x, width,
            y: y + halfHeight, height: halfHeight
        };
    }
    else {
        const halfWidth = width / 2;
        out[0] = {
            y, height,
            x, width: halfWidth
        };
        out[1] = {
            y, height,
            x: x + halfWidth, width: halfWidth
        };
    }

    if (rectShape.r != null) {
        out[0].r = out[1].r = rectShape.r;
    }
}

function binaryDividePolygon(poygonShape: Polygon['shape'], out: Polygon['shape'][]) {

}


function binaryDivideRecursive<T extends Path['shape']>(
    divider: BinaryDivide, shape: T, count: number, out: T[]
): T[] {
    if (count === 1) {
        out.push(shape);
    }
    else {
        const mid = Math.floor(count / 2);
        const tmpArr: Path['shape'][] = [];
        divider(shape, tmpArr);
        binaryDivideRecursive(divider, tmpArr[0], mid, out);
        binaryDivideRecursive(divider, tmpArr[1], count - mid, out);
    }

    return out;
}

export function clone(path: Path, count: number) {
    const paths = [];
    for (let i = 0; i < count; i++) {
        paths.push(clonePath(path));
    }
    return paths;
}

function copyPathProps(source: Path, target: Path) {
    target.setStyle(source.style);
    target.z = source.z;
    target.z2 = source.z2;
    target.zlevel = source.zlevel;
}

export function split(
    path: Path, count: number
) {
    const outShapes: Path['shape'][] = [];
    const shape = path.shape;
    let OutShapeCtor: new() => Path;
    switch (path.type) {
        case 'rect':
            binaryDivideRecursive(binaryDivideRect, shape, count, outShapes);
            OutShapeCtor = Rect;
            break;
        case 'sector':
            binaryDivideRecursive(binaryDivideSector, shape, count, outShapes);
            OutShapeCtor = Sector;
            break;
        case 'circle':
            binaryDivideRecursive(binaryDivideSector, {
                r0: 0, r: shape.r, startAngle: 0, endAngle: Math.PI * 2,
                cx: shape.cx, cy: shape.cy
            } as Sector['shape'], count, outShapes);
            OutShapeCtor = Sector;
            break;
    }

    if (!OutShapeCtor) {
        // Unkown split algorithm. Use clone instead
        return clone(path, count);
    }
    const out: Path[] = [];

    for (let i = 0; i < outShapes.length; i++) {
        const subPath = new OutShapeCtor();
        subPath.setShape(outShapes[i]);
        copyPathProps(path, subPath);
        out.push(subPath);
    }

    return out;
}
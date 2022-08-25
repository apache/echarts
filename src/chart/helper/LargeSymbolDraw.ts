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

/* global Float32Array */

// TODO Batch by color

import * as graphic from '../../util/graphic';
import {createSymbol} from '../../util/symbol';
import SeriesData from '../../data/SeriesData';
import { PathProps } from 'zrender/src/graphic/Path';
import PathProxy from 'zrender/src/core/PathProxy';
import SeriesModel from '../../model/Series';
import { StageHandlerProgressParams } from '../../util/types';
import { CoordinateSystemClipArea } from '../../coord/CoordinateSystem';
import { getECData } from '../../util/innerStore';
import Element from 'zrender/src/Element';

const BOOST_SIZE_THRESHOLD = 4;

class LargeSymbolPathShape {
    points: ArrayLike<number>;
    size: number[];
}

type LargeSymbolPathProps = PathProps & {
    shape?: Partial<LargeSymbolPathShape>
    startIndex?: number
    endIndex?: number
};

type ECSymbol = ReturnType<typeof createSymbol>;

class LargeSymbolPath extends graphic.Path<LargeSymbolPathProps> {

    shape: LargeSymbolPathShape;

    symbolProxy: ECSymbol;

    softClipShape: CoordinateSystemClipArea;

    startIndex: number;
    endIndex: number;

    private _ctx: CanvasRenderingContext2D;
    private _off: number = 0;

    hoverDataIdx: number = -1;

    notClear: boolean;

    constructor(opts?: LargeSymbolPathProps) {
        super(opts);
    }

    getDefaultShape() {
        return new LargeSymbolPathShape();
    }

    setColor: ECSymbol['setColor'];

    reset() {
        this.notClear = false;
        this._off = 0;
    }

    buildPath(path: PathProxy | CanvasRenderingContext2D, shape: LargeSymbolPathShape) {
        const points = shape.points;
        const size = shape.size;

        const symbolProxy = this.symbolProxy;
        const symbolProxyShape = symbolProxy.shape;
        const ctx = (path as PathProxy).getContext
            ? (path as PathProxy).getContext()
            : path as CanvasRenderingContext2D;
        const canBoost = ctx && size[0] < BOOST_SIZE_THRESHOLD;
        const softClipShape = this.softClipShape;
        let i;

        // Do draw in afterBrush.
        if (canBoost) {
            this._ctx = ctx;
            return;
        }

        this._ctx = null;

        for (i = this._off; i < points.length;) {
            const x = points[i++];
            const y = points[i++];

            if (isNaN(x) || isNaN(y)) {
                continue;
            }
            if (softClipShape && !softClipShape.contain(x, y)) {
                continue;
            }

            symbolProxyShape.x = x - size[0] / 2;
            symbolProxyShape.y = y - size[1] / 2;
            symbolProxyShape.width = size[0];
            symbolProxyShape.height = size[1];

            symbolProxy.buildPath(path, symbolProxyShape, true);
        }
        if (this.incremental) {
            this._off = i;
            this.notClear = true;
        }
    }

    afterBrush() {
        const shape = this.shape;
        const points = shape.points;
        const size = shape.size;
        const ctx = this._ctx;
        const softClipShape = this.softClipShape;
        let i;

        if (!ctx) {
            return;
        }

        // PENDING If style or other canvas status changed?
        for (i = this._off; i < points.length;) {
            const x = points[i++];
            const y = points[i++];
            if (isNaN(x) || isNaN(y)) {
                continue;
            }
            if (softClipShape && !softClipShape.contain(x, y)) {
                continue;
            }
            // fillRect is faster than building a rect path and draw.
            // And it support light globalCompositeOperation.
            ctx.fillRect(
                x - size[0] / 2, y - size[1] / 2,
                size[0], size[1]
            );
        }
        if (this.incremental) {
            this._off = i;
            this.notClear = true;
        }
    }

    findDataIndex(x: number, y: number) {
        // TODO ???
        // Consider transform

        const shape = this.shape;
        const points = shape.points;
        const size = shape.size;

        const w = Math.max(size[0], 4);
        const h = Math.max(size[1], 4);

        // Not consider transform
        // Treat each element as a rect
        // top down traverse
        for (let idx = points.length / 2 - 1; idx >= 0; idx--) {
            const i = idx * 2;
            const x0 = points[i] - w / 2;
            const y0 = points[i + 1] - h / 2;
            if (x >= x0 && y >= y0 && x <= x0 + w && y <= y0 + h) {
                return idx;
            }
        }

        return -1;
    }

    contain(x: number, y: number): boolean {
        const localPos = this.transformCoordToLocal(x, y);
        const rect = this.getBoundingRect();
        x = localPos[0];
        y = localPos[1];

        if (rect.contain(x, y)) {
            // Cache found data index.
            const dataIdx = this.hoverDataIdx = this.findDataIndex(x, y);
            return dataIdx >= 0;
        }
        this.hoverDataIdx = -1;
        return false;
    }

    getBoundingRect() {
        // Ignore stroke for large symbol draw.
        let rect = this._rect;
        if (!rect) {
            const shape = this.shape;
            const points = shape.points;
            const size = shape.size;
            const w = size[0];
            const h = size[1];
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (let i = 0; i < points.length;) {
                const x = points[i++];
                const y = points[i++];
                minX = Math.min(x, minX);
                maxX = Math.max(x, maxX);
                minY = Math.min(y, minY);
                maxY = Math.max(y, maxY);
            }

            rect = this._rect = new graphic.BoundingRect(
                minX - w / 2,
                minY - h / 2,
                maxX - minX + w,
                maxY - minY + h
            );
        }
        return rect;
    }
}

interface UpdateOpt {
    clipShape?: CoordinateSystemClipArea
}

class LargeSymbolDraw {

    group = new graphic.Group();

    // New add element in this frame of progressive render.
    private _newAdded: LargeSymbolPath[];

    /**
     * Update symbols draw by new data
     */
    updateData(data: SeriesData, opt?: UpdateOpt) {
        this._clear();

        const symbolEl = this._create();
        symbolEl.setShape({
            points: data.getLayout('points')
        });
        this._setCommon(symbolEl, data, opt);
    }

    updateLayout(data: SeriesData) {
        let points = data.getLayout('points');
        this.group.eachChild(function (child: LargeSymbolPath) {
            if (child.startIndex != null) {
                const len = (child.endIndex - child.startIndex) * 2;
                const byteOffset = child.startIndex * 4 * 2;
                points = new Float32Array(points.buffer, byteOffset, len);
            }
            child.setShape('points', points);
            // Reset draw cursor.
            child.reset();
        });
    }

    incrementalPrepareUpdate(data: SeriesData) {
        this._clear();
    }

    incrementalUpdate(taskParams: StageHandlerProgressParams, data: SeriesData, opt: UpdateOpt) {
        const lastAdded = this._newAdded[0];
        const points = data.getLayout('points');
        const oldPoints = lastAdded && lastAdded.shape.points;
        // Merging the exists. Each element has 1e4 points.
        // Consider the performance balance between too much elements and too much points in one shape(may affect hover optimization)
        if (oldPoints && oldPoints.length < 2e4) {
            const oldLen = oldPoints.length;
            const newPoints = new Float32Array(oldLen + points.length);
            // Concat two array
            newPoints.set(oldPoints);
            newPoints.set(points, oldLen);
            // Update endIndex
            lastAdded.endIndex = taskParams.end;
            lastAdded.setShape({ points: newPoints });
        }
        else {
            // Clear
            this._newAdded = [];

            const symbolEl = this._create();
            symbolEl.startIndex = taskParams.start;
            symbolEl.endIndex = taskParams.end;
            symbolEl.incremental = true;
            symbolEl.setShape({
                points
            });
            this._setCommon(symbolEl, data, opt);
        }
    }

    eachRendered(cb: (el: Element) => boolean | void) {
        this._newAdded[0] && cb(this._newAdded[0]);
    }

    private _create() {
        const symbolEl = new LargeSymbolPath({
            cursor: 'default'
        });
        symbolEl.ignoreCoarsePointer = true;
        this.group.add(symbolEl);
        this._newAdded.push(symbolEl);
        return symbolEl;
    }

    private _setCommon(
        symbolEl: LargeSymbolPath,
        data: SeriesData,
        opt: UpdateOpt
    ) {
        const hostModel = data.hostModel;

        opt = opt || {};

        const size = data.getVisual('symbolSize');
        symbolEl.setShape('size', (size instanceof Array) ? size : [size, size]);

        symbolEl.softClipShape = opt.clipShape || null;
        // Create symbolProxy to build path for each data
        symbolEl.symbolProxy = createSymbol(
            data.getVisual('symbol'), 0, 0, 0, 0
        );
        // Use symbolProxy setColor method
        symbolEl.setColor = symbolEl.symbolProxy.setColor;

        const extrudeShadow = symbolEl.shape.size[0] < BOOST_SIZE_THRESHOLD;
        symbolEl.useStyle(
            // Draw shadow when doing fillRect is extremely slow.
            hostModel.getModel('itemStyle').getItemStyle(
                extrudeShadow ? ['color', 'shadowBlur', 'shadowColor'] : ['color']
            )
        );

        const globalStyle = data.getVisual('style');
        const visualColor = globalStyle && globalStyle.fill;
        if (visualColor) {
            symbolEl.setColor(visualColor);
        }

        const ecData = getECData(symbolEl);
        // Enable tooltip
        // PENDING May have performance issue when path is extremely large
        ecData.seriesIndex = (hostModel as SeriesModel).seriesIndex;
        symbolEl.on('mousemove', function (e) {
            ecData.dataIndex = null;
            const dataIndex = symbolEl.hoverDataIdx;
            if (dataIndex >= 0) {
                // Provide dataIndex for tooltip
                ecData.dataIndex = dataIndex + (symbolEl.startIndex || 0);
            }
        });
    }

    remove() {
        this._clear();
    }

    private _clear() {
        this._newAdded = [];
        this.group.removeAll();
    }
}


export default LargeSymbolDraw;
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
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';
import List from '../../data/List';
import { PathProps } from 'zrender/src/graphic/Path';
import PathProxy from 'zrender/src/core/PathProxy';
import SeriesModel from '../../model/Series';
import { StageHandlerProgressParams } from '../../util/types';
import { CoordinateSystemClipArea } from '../../coord/CoordinateSystem';
import { getECData } from '../../util/innerStore';

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

    constructor(opts?: LargeSymbolPathProps) {
        super(opts);
    }

    getDefaultShape() {
        return new LargeSymbolPathShape();
    }

    setColor: ECSymbol['setColor'];

    buildPath(path: PathProxy | CanvasRenderingContext2D, shape: LargeSymbolPathShape) {
        const points = shape.points;
        const size = shape.size;

        const symbolProxy = this.symbolProxy;
        const symbolProxyShape = symbolProxy.shape;
        const ctx = (path as PathProxy).getContext
            ? (path as PathProxy).getContext()
            : path as CanvasRenderingContext2D;
        const canBoost = ctx && size[0] < BOOST_SIZE_THRESHOLD;

        // Do draw in afterBrush.
        if (canBoost) {
            this._ctx = ctx;
            return;
        }

        this._ctx = null;

        for (let i = 0; i < points.length;) {
            const x = points[i++];
            const y = points[i++];

            if (isNaN(x) || isNaN(y)) {
                continue;
            }
            if (this.softClipShape && !this.softClipShape.contain(x, y)) {
                continue;
            }

            symbolProxyShape.x = x - size[0] / 2;
            symbolProxyShape.y = y - size[1] / 2;
            symbolProxyShape.width = size[0];
            symbolProxyShape.height = size[1];

            symbolProxy.buildPath(path, symbolProxyShape, true);
        }
    }

    afterBrush() {
        const shape = this.shape;
        const points = shape.points;
        const size = shape.size;
        const ctx = this._ctx;

        if (!ctx) {
            return;
        }

        // PENDING If style or other canvas status changed?
        for (let i = 0; i < points.length;) {
            const x = points[i++];
            const y = points[i++];
            if (isNaN(x) || isNaN(y)) {
                continue;
            }
            if (this.softClipShape && !this.softClipShape.contain(x, y)) {
                continue;
            }
            // fillRect is faster than building a rect path and draw.
            // And it support light globalCompositeOperation.
            ctx.fillRect(
                x - size[0] / 2, y - size[1] / 2,
                size[0], size[1]
            );
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
}

interface UpdateOpt {
    clipShape?: CoordinateSystemClipArea
}

class LargeSymbolDraw {

    group = new graphic.Group();

    _incremental: IncrementalDisplayable;

    isPersistent() {
        return !this._incremental;
    };

    /**
     * Update symbols draw by new data
     */
    updateData(data: List, opt?: UpdateOpt) {
        this.group.removeAll();
        const symbolEl = new LargeSymbolPath({
            rectHover: true,
            cursor: 'default'
        });

        symbolEl.setShape({
            points: data.getLayout('points')
        });
        this._setCommon(symbolEl, data, false, opt);
        this.group.add(symbolEl);

        this._incremental = null;
    }

    updateLayout(data: List) {
        if (this._incremental) {
            return;
        }

        let points = data.getLayout('points');
        this.group.eachChild(function (child: LargeSymbolPath) {
            if (child.startIndex != null) {
                const len = (child.endIndex - child.startIndex) * 2;
                const byteOffset = child.startIndex * 4 * 2;
                points = new Float32Array(points.buffer, byteOffset, len);
            }
            child.setShape('points', points);
        });
    }

    incrementalPrepareUpdate(data: List) {
        this.group.removeAll();

        this._clearIncremental();
        // Only use incremental displayables when data amount is larger than 2 million.
        // PENDING Incremental data?
        if (data.count() > 2e6) {
            if (!this._incremental) {
                this._incremental = new IncrementalDisplayable({
                    silent: true
                });
            }
            this.group.add(this._incremental);
        }
        else {
            this._incremental = null;
        }
    }

    incrementalUpdate(taskParams: StageHandlerProgressParams, data: List, opt: UpdateOpt) {
        let symbolEl;
        if (this._incremental) {
            symbolEl = new LargeSymbolPath();
            this._incremental.addDisplayable(symbolEl, true);
        }
        else {
            symbolEl = new LargeSymbolPath({
                rectHover: true,
                cursor: 'default',
                startIndex: taskParams.start,
                endIndex: taskParams.end
            });
            symbolEl.incremental = true;
            this.group.add(symbolEl);
        }

        symbolEl.setShape({
            points: data.getLayout('points')
        });
        this._setCommon(symbolEl, data, !!this._incremental, opt);
    }

    _setCommon(
        symbolEl: LargeSymbolPath,
        data: List,
        isIncremental: boolean,
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

        if (!isIncremental) {
            const ecData = getECData(symbolEl);
            // Enable tooltip
            // PENDING May have performance issue when path is extremely large
            ecData.seriesIndex = (hostModel as SeriesModel).seriesIndex;
            symbolEl.on('mousemove', function (e) {
                ecData.dataIndex = null;
                const dataIndex = symbolEl.findDataIndex(e.offsetX, e.offsetY);
                if (dataIndex >= 0) {
                    // Provide dataIndex for tooltip
                    ecData.dataIndex = dataIndex + (symbolEl.startIndex || 0);
                }
            });
        }
    }

    remove() {
        this._clearIncremental();
        this._incremental = null;
        this.group.removeAll();
    }

    _clearIncremental() {
        const incremental = this._incremental;
        if (incremental) {
            incremental.clearDisplaybles();
        }
    }
}


export default LargeSymbolDraw;
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

// TODO Batch by color

import * as graphic from '../../util/graphic';
import IncrementalDisplayable from 'zrender/src/graphic/IncrementalDisplayable';
import * as lineContain from 'zrender/src/contain/line';
import * as quadraticContain from 'zrender/src/contain/quadratic';
import { PathProps } from 'zrender/src/graphic/Path';
import List from '../../data/List';
import { StageHandlerProgressParams, LineStyleOption, ColorString } from '../../util/types';
import Model from '../../model/Model';
import { getECData } from '../../util/innerStore';

class LargeLinesPathShape {
    polyline = false;
    curveness = 0;
    segs: ArrayLike<number> = [];
}

interface LargeLinesPathProps extends PathProps {
    shape?: Partial<LargeLinesPathShape>
}

interface LargeLinesCommonOption {
    polyline?: boolean
    lineStyle?: LineStyleOption & {
        curveness?: number
    }
}

/**
 * Data which can support large lines.
 */
type LargeLinesData = List<Model<LargeLinesCommonOption> & {
    seriesIndex?: number
}>;

class LargeLinesPath extends graphic.Path {
    shape: LargeLinesPathShape;

    __startIndex: number;

    constructor(opts?: LargeLinesPathProps) {
        super(opts);
    }

    getDefaultStyle() {
        return {
            stroke: '#000',
            fill: null as ColorString
        };
    }

    getDefaultShape() {
        return new LargeLinesPathShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: LargeLinesPathShape) {
        const segs = shape.segs;
        const curveness = shape.curveness;

        if (shape.polyline) {
            for (let i = 0; i < segs.length;) {
                const count = segs[i++];
                if (count > 0) {
                    ctx.moveTo(segs[i++], segs[i++]);
                    for (let k = 1; k < count; k++) {
                        ctx.lineTo(segs[i++], segs[i++]);
                    }
                }
            }
        }
        else {
            for (let i = 0; i < segs.length;) {
                const x0 = segs[i++];
                const y0 = segs[i++];
                const x1 = segs[i++];
                const y1 = segs[i++];
                ctx.moveTo(x0, y0);
                if (curveness > 0) {
                    const x2 = (x0 + x1) / 2 - (y0 - y1) * curveness;
                    const y2 = (y0 + y1) / 2 - (x1 - x0) * curveness;
                    ctx.quadraticCurveTo(x2, y2, x1, y1);
                }
                else {
                    ctx.lineTo(x1, y1);
                }
            }
        }
    }

    findDataIndex(x: number, y: number) {

        const shape = this.shape;
        const segs = shape.segs;
        const curveness = shape.curveness;
        const lineWidth = this.style.lineWidth;

        if (shape.polyline) {
            let dataIndex = 0;
            for (let i = 0; i < segs.length;) {
                const count = segs[i++];
                if (count > 0) {
                    const x0 = segs[i++];
                    const y0 = segs[i++];
                    for (let k = 1; k < count; k++) {
                        const x1 = segs[i++];
                        const y1 = segs[i++];
                        if (lineContain.containStroke(x0, y0, x1, y1, lineWidth, x, y)) {
                            return dataIndex;
                        }
                    }
                }

                dataIndex++;
            }
        }
        else {
            let dataIndex = 0;
            for (let i = 0; i < segs.length;) {
                const x0 = segs[i++];
                const y0 = segs[i++];
                const x1 = segs[i++];
                const y1 = segs[i++];
                if (curveness > 0) {
                    const x2 = (x0 + x1) / 2 - (y0 - y1) * curveness;
                    const y2 = (y0 + y1) / 2 - (x1 - x0) * curveness;

                    if (quadraticContain.containStroke(
                        x0, y0, x2, y2, x1, y1, lineWidth, x, y
                    )) {
                        return dataIndex;
                    }
                }
                else {
                    if (lineContain.containStroke(
                        x0, y0, x1, y1, lineWidth, x, y
                    )) {
                        return dataIndex;
                    }
                }

                dataIndex++;
            }
        }

        return -1;
    }
}

class LargeLineDraw {
    group = new graphic.Group();

    _incremental?: IncrementalDisplayable;

    isPersistent() {
        return !this._incremental;
    };

    /**
     * Update symbols draw by new data
     */
    updateData(data: LargeLinesData) {
        this.group.removeAll();

        const lineEl = new LargeLinesPath({
            rectHover: true,
            cursor: 'default'
        });
        lineEl.setShape({
            segs: data.getLayout('linesPoints')
        });

        this._setCommon(lineEl, data);

        // Add back
        this.group.add(lineEl);

        this._incremental = null;
    };

    /**
     * @override
     */
    incrementalPrepareUpdate(data: LargeLinesData) {
        this.group.removeAll();

        this._clearIncremental();

        if (data.count() > 5e5) {
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
    };

    /**
     * @override
     */
    incrementalUpdate(taskParams: StageHandlerProgressParams, data: LargeLinesData) {
        const lineEl = new LargeLinesPath();
        lineEl.setShape({
            segs: data.getLayout('linesPoints')
        });

        this._setCommon(lineEl, data, !!this._incremental);

        if (!this._incremental) {
            lineEl.rectHover = true;
            lineEl.cursor = 'default';
            lineEl.__startIndex = taskParams.start;
            this.group.add(lineEl);
        }
        else {
            this._incremental.addDisplayable(lineEl, true);
        }
    };

    /**
     * @override
     */
    remove() {
        this._clearIncremental();
        this._incremental = null;
        this.group.removeAll();
    };

    _setCommon(lineEl: LargeLinesPath, data: LargeLinesData, isIncremental?: boolean) {
        const hostModel = data.hostModel;

        lineEl.setShape({
            polyline: hostModel.get('polyline'),
            curveness: hostModel.get(['lineStyle', 'curveness'])
        });

        lineEl.useStyle(
            hostModel.getModel('lineStyle').getLineStyle()
        );
        lineEl.style.strokeNoScale = true;

        const style = data.getVisual('style');
        if (style && style.stroke) {
            lineEl.setStyle('stroke', style.stroke);
        }
        lineEl.setStyle('fill', null);

        if (!isIncremental) {
            const ecData = getECData(lineEl);
            // Enable tooltip
            // PENDING May have performance issue when path is extremely large
            ecData.seriesIndex = hostModel.seriesIndex;
            lineEl.on('mousemove', function (e) {
                ecData.dataIndex = null;
                const dataIndex = lineEl.findDataIndex(e.offsetX, e.offsetY);
                if (dataIndex > 0) {
                    // Provide dataIndex for tooltip
                    ecData.dataIndex = dataIndex + lineEl.__startIndex;
                }
            });
        }
    };

    _clearIncremental() {
        const incremental = this._incremental;
        if (incremental) {
            incremental.clearDisplaybles();
        }
    };


}

export default LargeLineDraw;
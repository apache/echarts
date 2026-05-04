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

import LineDraw from '../helper/LineDraw';
import EffectLine from '../helper/EffectLine';
import Line from '../helper/Line';
import Polyline from '../helper/Polyline';
import EffectPolyline from '../helper/EffectPolyline';
import LargeLineDraw from '../helper/LargeLineDraw';
import linesLayout from './linesLayout';
import {createClipPath} from '../helper/createClipPathFromCoordSys';
import ChartView from '../../view/Chart';
import LinesSeriesModel from './LinesSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import CanvasPainter from 'zrender/src/canvas/Painter';
import { StageHandlerProgressParams, StageHandlerProgressExecutor } from '../../util/types';
import SeriesData from '../../data/SeriesData';
import type Polar from '../../coord/polar/Polar';
import type Cartesian2D from '../../coord/cartesian/Cartesian2D';
import Element from 'zrender/src/Element';
import { getIncrementalId } from '../../util/model';
import { getCurrentCanvasPainter } from '../../util/graphic';
import { ILineDraw } from '../helper/baseDraw';

class LinesView extends ChartView {

    static readonly type = 'lines';
    readonly type = LinesView.type;

    private _lastZlevel: number;
    private _finished: boolean;

    private _lineDraw: ILineDraw;

    private _hasEffet: boolean;
    private _isPolyline: boolean;
    private _isLargeDraw: boolean;

    render(seriesModel: LinesSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();

        const lineDraw = this._updateLineDraw(data, seriesModel);

        const zlevel = seriesModel.get('zlevel');
        const trailLength = seriesModel.get(['effect', 'trailLength']);

        const zr = api.getZr();
        // Avoid the drag cause ghost shadow
        // FIXME Better way ?
        // SVG doesn't support
        const isCanvas = !!getCurrentCanvasPainter(api);
        if (isCanvas) {
            (zr.painter as CanvasPainter).getLayer(zlevel).clear(true);
        }
        // Config layer with motion blur
        if (this._lastZlevel != null && isCanvas) {
            zr.configLayer(this._lastZlevel, {
                motionBlur: false
            });
        }
        if (this._showEffect(seriesModel) && trailLength > 0) {
            if (isCanvas) {
                zr.configLayer(zlevel, {
                    motionBlur: true,
                    lastFrameAlpha: Math.max(Math.min(trailLength / 10 + 0.9, 1), 0)
                });
            }
            else if (__DEV__) {
                console.warn('SVG render mode doesn\'t support lines with trail effect');
            }
        }

        lineDraw.updateData(data as SeriesData);

        const clipPath = seriesModel.get('clip', true) && createClipPath(
            (seriesModel.coordinateSystem as Polar | Cartesian2D), false, seriesModel
        );
        if (clipPath) {
            this.group.setClipPath(clipPath);
        }
        else {
            this.group.removeClipPath();
        }

        this._lastZlevel = zlevel;

        this._finished = true;
    }

    incrementalPrepareRender(seriesModel: LinesSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();

        const lineDraw = this._updateLineDraw(data, seriesModel);

        lineDraw.incrementalPrepareUpdate(data as any);

        this._clearLayer(api);

        this._finished = false;
    }

    incrementalRender(
        taskParams: StageHandlerProgressParams,
        seriesModel: LinesSeriesModel,
        ecModel: GlobalModel
    ) {
        this._lineDraw.incrementalUpdate(taskParams, seriesModel.getData() as any, getIncrementalId(seriesModel));

        this._finished = taskParams.end === seriesModel.getData().count();
    }

    eachRendered(cb: (el: Element) => boolean | void) {
        this._lineDraw && this._lineDraw.eachRendered(cb);
    }

    updateTransform(seriesModel: LinesSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();
        const lineDraw = this._lineDraw;

        if (!this._finished
            || !lineDraw
            // TODO Don't have to do update in large mode. Only do it when there are millions of data.
            || !lineDraw.updateLayout
        ) {
            return {update: true} as const;
        }
        else {
            // TODO Use same logic with ScatterView.
            // Manually update layout
            const res = linesLayout.reset(seriesModel, ecModel, api) as StageHandlerProgressExecutor;
            if (res.progress) {
                res.progress({
                    start: 0,
                    end: data.count(),
                    count: data.count()
                }, data);
            }
            lineDraw.updateLayout();
            this._clearLayer(api);
        }
    }

    _updateLineDraw(data: SeriesData, seriesModel: LinesSeriesModel) {
        let lineDraw = this._lineDraw;
        const hasEffect = this._showEffect(seriesModel);
        const isPolyline = !!seriesModel.get('polyline');
        const pipelineContext = seriesModel.pipelineContext;
        const isLargeDraw = pipelineContext.large;

        if (__DEV__) {
            if (hasEffect && isLargeDraw) {
                console.warn('Large lines not support effect');
            }
        }
        if (!lineDraw
            || hasEffect !== this._hasEffet
            || isPolyline !== this._isPolyline
            || isLargeDraw !== this._isLargeDraw
        ) {
            if (lineDraw) {
                lineDraw.remove();
            }
            lineDraw = this._lineDraw = isLargeDraw
                ? new LargeLineDraw()
                : new LineDraw(
                    isPolyline
                        ? (hasEffect ? EffectPolyline : Polyline)
                        : (hasEffect ? EffectLine : Line)
                );
            this._hasEffet = hasEffect;
            this._isPolyline = isPolyline;
            this._isLargeDraw = isLargeDraw;
        }

        this.group.add(lineDraw.group);

        return lineDraw;
    }

    private _showEffect(seriesModel: LinesSeriesModel) {
        return !!seriesModel.get(['effect', 'show']);
    }

    _clearLayer(api: ExtensionAPI) {
        // Not use motion when dragging or zooming
        const painter = getCurrentCanvasPainter(api);
        if (painter && this._lastZlevel != null) {
            painter.getLayer(this._lastZlevel).clear(true);
        }
    }

    remove(ecModel: GlobalModel, api: ExtensionAPI) {
        this._lineDraw && this._lineDraw.remove();
        this._lineDraw = null;
        // Clear motion when lineDraw is removed
        this._clearLayer(api);
    }

    dispose(ecModel: GlobalModel, api: ExtensionAPI) {
        this.remove(ecModel, api);
    }

}

export default LinesView;

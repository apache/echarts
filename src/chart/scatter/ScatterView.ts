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

import SymbolDraw from '../helper/SymbolDraw';
import LargeSymbolDraw from '../helper/LargeSymbolDraw';

import pointsLayout from '../../layout/points';
import ChartView from '../../view/Chart';
import ScatterSeriesModel from './ScatterSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import List from '../../data/List';
import { TaskProgressParams } from '../../core/task';
import type { StageHandlerProgressExecutor } from '../../util/types';

class ScatterView extends ChartView {
    static readonly type = 'scatter';
    type = ScatterView.type;

    _finished: boolean;

    _isLargeDraw: boolean;

    _symbolDraw: SymbolDraw | LargeSymbolDraw;

    render(seriesModel: ScatterSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();

        const symbolDraw = this._updateSymbolDraw(data, seriesModel);

        symbolDraw.updateData(data, {
            // TODO
            // If this parameter should be a shape or a bounding volume
            // shape will be more general.
            // But bounding volume like bounding rect will be much faster in the contain calculation
            clipShape: this._getClipShape(seriesModel)
        });

        this._finished = true;
    }

    incrementalPrepareRender(seriesModel: ScatterSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();
        const symbolDraw = this._updateSymbolDraw(data, seriesModel);

        symbolDraw.incrementalPrepareUpdate(data);

        this._finished = false;
    }

    incrementalRender(taskParams: TaskProgressParams, seriesModel: ScatterSeriesModel, ecModel: GlobalModel) {
        this._symbolDraw.incrementalUpdate(taskParams, seriesModel.getData(), {
            clipShape: this._getClipShape(seriesModel)
        });

        this._finished = taskParams.end === seriesModel.getData().count();
    }

    updateTransform(seriesModel: ScatterSeriesModel, ecModel: GlobalModel, api: ExtensionAPI): void | { update: true } {
        const data = seriesModel.getData();
        // Must mark group dirty and make sure the incremental layer will be cleared
        // PENDING
        this.group.dirty();

        if (!this._finished || data.count() > 1e4 || !this._symbolDraw.isPersistent()) {
            return {
                update: true
            };
        }
        else {
            const res = pointsLayout('').reset(seriesModel, ecModel, api) as StageHandlerProgressExecutor;
            if (res.progress) {
                res.progress({ start: 0, end: data.count(), count: data.count() }, data);
            }

            this._symbolDraw.updateLayout(data);
        }
    }

    _getClipShape(seriesModel: ScatterSeriesModel) {
        const coordSys = seriesModel.coordinateSystem;
        const clipArea = coordSys && coordSys.getArea && coordSys.getArea();
        return seriesModel.get('clip', true) ? clipArea : null;
    }

    _updateSymbolDraw(data: List, seriesModel: ScatterSeriesModel) {
        let symbolDraw = this._symbolDraw;
        const pipelineContext = seriesModel.pipelineContext;
        const isLargeDraw = pipelineContext.large;

        if (!symbolDraw || isLargeDraw !== this._isLargeDraw) {
            symbolDraw && symbolDraw.remove();
            symbolDraw = this._symbolDraw = isLargeDraw
                ? new LargeSymbolDraw()
                : new SymbolDraw();
            this._isLargeDraw = isLargeDraw;
            this.group.removeAll();
        }

        this.group.add(symbolDraw.group);

        return symbolDraw;
    }

    remove(ecModel: GlobalModel, api: ExtensionAPI) {
        this._symbolDraw && this._symbolDraw.remove(true);
        this._symbolDraw = null;
    }

    dispose() {}
}

export default ScatterView;
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

import * as graphic from '../../util/graphic';
import * as zrUtil from 'zrender/src/core/util';
import type { LineDrawSeriesScope, LineDrawModelOption } from './LineDraw';
import type List from '../../data/List';

class Polyline extends graphic.Group {
    constructor(lineData: List, idx: number, seriesScope: LineDrawSeriesScope) {
        super();
        this._createPolyline(lineData, idx, seriesScope);
    }

    private _createPolyline(lineData: List, idx: number, seriesScope: LineDrawSeriesScope) {
        // let seriesModel = lineData.hostModel;
        let points = lineData.getItemLayout(idx);

        let line = new graphic.Polyline({
            shape: {
                points: points
            }
        });

        this.add(line);

        this._updateCommonStl(lineData, idx, seriesScope);
    };

    updateData(lineData: List, idx: number, seriesScope: LineDrawSeriesScope) {
        let seriesModel = lineData.hostModel;

        let line = this.childAt(0) as graphic.Polyline;
        let target = {
            shape: {
                points: lineData.getItemLayout(idx) as number[][]
            }
        };
        graphic.updateProps(line, target, seriesModel, idx);

        this._updateCommonStl(lineData, idx, seriesScope);
    };

    _updateCommonStl(lineData: List, idx: number, seriesScope: LineDrawSeriesScope) {
        let line = this.childAt(0) as graphic.Polyline;
        let itemModel = lineData.getItemModel<LineDrawModelOption>(idx);

        let visualColor = lineData.getItemVisual(idx, 'color');

        let lineStyle = seriesScope && seriesScope.lineStyle;
        let hoverLineStyle = seriesScope && seriesScope.hoverLineStyle;

        if (!seriesScope || lineData.hasItemOption) {
            lineStyle = itemModel.getModel('lineStyle').getLineStyle();
            hoverLineStyle = itemModel.getModel(['emphasis', 'lineStyle']).getLineStyle();
        }
        line.useStyle(zrUtil.defaults(
            {
                strokeNoScale: true,
                fill: 'none',
                stroke: visualColor
            },
            lineStyle
        ));
        line.hoverStyle = hoverLineStyle;

        graphic.setHoverStyle(this);
    };

    updateLayout(lineData: List, idx: number) {
        let polyline = this.childAt(0) as graphic.Polyline;
        polyline.setShape('points', lineData.getItemLayout(idx));
    };

}

export default Polyline;
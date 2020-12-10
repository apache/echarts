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

import GraphSeriesModel from './GraphSeries';
import View from '../../coord/View';
import { GraphNode } from '../../data/Graph';

export function getNodeGlobalScale(seriesModel: GraphSeriesModel) {
    const coordSys = seriesModel.coordinateSystem as View;
    if (coordSys.type !== 'view') {
        return 1;
    }

    const nodeScaleRatio = seriesModel.option.nodeScaleRatio;

    const groupZoom = coordSys.scaleX;
    // Scale node when zoom changes
    const roamZoom = coordSys.getZoom();
    const nodeScale = (roamZoom - 1) * nodeScaleRatio + 1;

    return nodeScale / groupZoom;
}

export function getSymbolSize(node: GraphNode) {
    let symbolSize = node.getVisual('symbolSize');
    if (symbolSize instanceof Array) {
        symbolSize = (symbolSize[0] + symbolSize[1]) / 2;
    }
    return +symbolSize;
}


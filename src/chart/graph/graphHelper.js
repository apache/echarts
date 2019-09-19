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

export function getNodeGlobalScale(seriesModel) {
    var coordSys = seriesModel.coordinateSystem;
    if (coordSys.type !== 'view') {
        return 1;
    }

    var nodeScaleRatio = seriesModel.option.nodeScaleRatio;

    var groupScale = coordSys.scale;
    var groupZoom = (groupScale && groupScale[0]) || 1;
    // Scale node when zoom changes
    var roamZoom = coordSys.getZoom();
    var nodeScale = (roamZoom - 1) * nodeScaleRatio + 1;

    return nodeScale / groupZoom;
}

export function getSymbolSize(node) {
    var symbolSize = node.getVisual('symbolSize');
    if (symbolSize instanceof Array) {
        symbolSize = (symbolSize[0] + symbolSize[1]) / 2;
    }
    return +symbolSize;
}


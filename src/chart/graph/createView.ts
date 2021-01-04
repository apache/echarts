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

// FIXME Where to create the simple view coordinate system
import View from '../../coord/View';
import {getLayoutRect} from '../../util/layout';
import * as bbox from 'zrender/src/core/bbox';
import GraphSeriesModel, { GraphNodeItemOption } from './GraphSeries';
import ExtensionAPI from '../../core/ExtensionAPI';
import GlobalModel from '../../model/Global';
import { extend } from 'zrender/src/core/util';

function getViewRect(seriesModel: GraphSeriesModel, api: ExtensionAPI, aspect: number) {
    const option = extend(seriesModel.getBoxLayoutParams(), {
        aspect: aspect
    });
    return getLayoutRect(option, {
        width: api.getWidth(),
        height: api.getHeight()
    });
}

export default function createViewCoordSys(ecModel: GlobalModel, api: ExtensionAPI) {
    const viewList: View[] = [];
    ecModel.eachSeriesByType('graph', function (seriesModel: GraphSeriesModel) {
        const coordSysType = seriesModel.get('coordinateSystem');
        if (!coordSysType || coordSysType === 'view') {

            const data = seriesModel.getData();
            const positions = data.mapArray(function (idx) {
                const itemModel = data.getItemModel<GraphNodeItemOption>(idx);
                return [+itemModel.get('x'), +itemModel.get('y')];
            });

            let min: number[] = [];
            let max: number[] = [];

            bbox.fromPoints(positions, min, max);

            // If width or height is 0
            if (max[0] - min[0] === 0) {
                max[0] += 1;
                min[0] -= 1;
            }
            if (max[1] - min[1] === 0) {
                max[1] += 1;
                min[1] -= 1;
            }
            const aspect = (max[0] - min[0]) / (max[1] - min[1]);
            // FIXME If get view rect after data processed?
            const viewRect = getViewRect(seriesModel, api, aspect);
            // Position may be NaN, use view rect instead
            if (isNaN(aspect)) {
                min = [viewRect.x, viewRect.y];
                max = [viewRect.x + viewRect.width, viewRect.y + viewRect.height];
            }

            const bbWidth = max[0] - min[0];
            const bbHeight = max[1] - min[1];

            const viewWidth = viewRect.width;
            const viewHeight = viewRect.height;

            const viewCoordSys = seriesModel.coordinateSystem = new View();
            viewCoordSys.zoomLimit = seriesModel.get('scaleLimit');

            viewCoordSys.setBoundingRect(
                min[0], min[1], bbWidth, bbHeight
            );
            viewCoordSys.setViewRect(
                viewRect.x, viewRect.y, viewWidth, viewHeight
            );

            // Update roam info
            viewCoordSys.setCenter(seriesModel.get('center'));
            viewCoordSys.setZoom(seriesModel.get('zoom'));

            viewList.push(viewCoordSys);
        }
    });

    return viewList;
}
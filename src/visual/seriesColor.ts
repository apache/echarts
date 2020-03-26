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

import Gradient from 'zrender/src/graphic/Gradient';
import {isFunction} from 'zrender/src/core/util';
import { StageHandler } from '../util/types';

const seriesColorTask: StageHandler = {
    createOnAllSeries: true,
    performRawSeries: true,
    reset: function (seriesModel, ecModel) {
        const data = seriesModel.getData();
        const colorAccessPath = seriesModel.visualColorAccessPath
            || ['itemStyle', 'color'];
        // Set in itemStyle
        let color = seriesModel.get(colorAccessPath as any);
        const colorCallback = (isFunction(color) && !(color instanceof Gradient))
            ? color : null;
        // Default color
        if (!color || colorCallback) {
            color = seriesModel.getColorFromPalette(
                // TODO series count changed.
                seriesModel.name, null, ecModel.getSeriesCount()
            );
        }

        data.setVisual('color', color);

        const borderColorAccessPath = seriesModel.visualBorderColorAccessPath || ['itemStyle', 'borderColor'];
        const borderColor = seriesModel.get(borderColorAccessPath as any);
        data.setVisual('borderColor', borderColor);

        // Only visible series has each data be visual encoded
        if (!ecModel.isSeriesFiltered(seriesModel)) {
            if (colorCallback) {
                data.each(function (idx) {
                    data.setItemVisual(
                        idx, 'color', colorCallback(seriesModel.getDataParams(idx))
                    );
                });
            }

            return {
                dataEach: data.hasItemOption ? function (data, idx) {
                    const itemModel = data.getItemModel(idx);
                    const color = itemModel.get(colorAccessPath as any, true);
                    const borderColor = itemModel.get(borderColorAccessPath as any, true);
                    if (color != null) {
                        data.setItemVisual(idx, 'color', color);
                    }
                    if (borderColor != null) {
                        data.setItemVisual(idx, 'borderColor', borderColor);
                    }
                } : null
            };
        }
    }
};
export default seriesColorTask;
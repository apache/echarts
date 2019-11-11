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

export default {
    createOnAllSeries: true,
    performRawSeries: true,
    reset: function (seriesModel, ecModel) {
        var data = seriesModel.getData();
        var colorAccessPath = (seriesModel.visualColorAccessPath || 'itemStyle.color').split('.');
        // Set in itemStyle
        var color = seriesModel.get(colorAccessPath);
        var colorCallback = (isFunction(color) && !(color instanceof Gradient))
            ? color : null;
        // Default color
        if (!color || colorCallback) {
            color = seriesModel.getColorFromPalette(
                // TODO series count changed.
                seriesModel.name, null, ecModel.getSeriesCount()
            );
        }

        data.setVisual('color', color);

        var borderColorAccessPath = (seriesModel.visualBorderColorAccessPath || 'itemStyle.borderColor').split('.');
        var borderColor = seriesModel.get(borderColorAccessPath);
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

            // itemStyle in each data item
            var dataEach = function (data, idx) {
                var itemModel = data.getItemModel(idx);
                var color = itemModel.get(colorAccessPath, true);
                var borderColor = itemModel.get(borderColorAccessPath, true);
                if (color != null) {
                    data.setItemVisual(idx, 'color', color);
                }
                if (borderColor != null) {
                    data.setItemVisual(idx, 'borderColor', borderColor);
                }
            };

            return { dataEach: data.hasItemOption ? dataEach : null };
        }
    }
};

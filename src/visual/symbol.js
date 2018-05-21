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


export default function (seriesType, defaultSymbolType, legendSymbol) {
    // Encoding visual for all series include which is filtered for legend drawing
    return {
        seriesType: seriesType,

        // For legend.
        performRawSeries: true,

        reset: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();

            var symbolType = seriesModel.get('symbol') || defaultSymbolType;
            var symbolSize = seriesModel.get('symbolSize');
            var keepAspect = seriesModel.get('symbolKeepAspect');

            data.setVisual({
                legendSymbol: legendSymbol || symbolType,
                symbol: symbolType,
                symbolSize: symbolSize,
                symbolKeepAspect: keepAspect
            });

            // Only visible series has each data be visual encoded
            if (ecModel.isSeriesFiltered(seriesModel)) {
                return;
            }

            var hasCallback = typeof symbolSize === 'function';

            function dataEach(data, idx) {
                if (typeof symbolSize === 'function') {
                    var rawValue = seriesModel.getRawValue(idx);
                    // FIXME
                    var params = seriesModel.getDataParams(idx);
                    data.setItemVisual(idx, 'symbolSize', symbolSize(rawValue, params));
                }

                if (data.hasItemOption) {
                    var itemModel = data.getItemModel(idx);
                    var itemSymbolType = itemModel.getShallow('symbol', true);
                    var itemSymbolSize = itemModel.getShallow('symbolSize',
                        true);
                    var itemSymbolKeepAspect =
                        itemModel.getShallow('symbolKeepAspect',true);

                    // If has item symbol
                    if (itemSymbolType != null) {
                        data.setItemVisual(idx, 'symbol', itemSymbolType);
                    }
                    if (itemSymbolSize != null) {
                        // PENDING Transform symbolSize ?
                        data.setItemVisual(idx, 'symbolSize', itemSymbolSize);
                    }
                    if (itemSymbolKeepAspect != null) {
                        data.setItemVisual(idx, 'symbolKeepAspect',
                            itemSymbolKeepAspect);
                    }
                }
            }

            return { dataEach: (data.hasItemOption || hasCallback) ? dataEach : null };
        }
    };
}

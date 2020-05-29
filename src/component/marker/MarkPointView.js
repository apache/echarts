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

import * as zrUtil from 'zrender/src/core/util';
import SymbolDraw from '../../chart/helper/SymbolDraw';
import * as numberUtil from '../../util/number';
import List from '../../data/List';
import * as markerHelper from './markerHelper';
import MarkerView from './MarkerView';

function updateMarkerLayout(mpData, seriesModel, api) {
    var coordSys = seriesModel.coordinateSystem;
    mpData.each(function (idx) {
        var itemModel = mpData.getItemModel(idx);
        var point;
        var xPx = numberUtil.parsePercent(itemModel.get('x'), api.getWidth());
        var yPx = numberUtil.parsePercent(itemModel.get('y'), api.getHeight());
        if (!isNaN(xPx) && !isNaN(yPx)) {
            point = [xPx, yPx];
        }
        // Chart like bar may have there own marker positioning logic
        else if (seriesModel.getMarkerPosition) {
            // Use the getMarkerPoisition
            point = seriesModel.getMarkerPosition(
                mpData.getValues(mpData.dimensions, idx)
            );
        }
        else if (coordSys) {
            var x = mpData.get(coordSys.dimensions[0], idx);
            var y = mpData.get(coordSys.dimensions[1], idx);
            point = coordSys.dataToPoint([x, y]);

        }

        // Use x, y if has any
        if (!isNaN(xPx)) {
            point[0] = xPx;
        }
        if (!isNaN(yPx)) {
            point[1] = yPx;
        }

        mpData.setItemLayout(idx, point);
    });
}

export default MarkerView.extend({

    type: 'markPoint',

    // updateLayout: function (markPointModel, ecModel, api) {
    //     ecModel.eachSeries(function (seriesModel) {
    //         var mpModel = seriesModel.markPointModel;
    //         if (mpModel) {
    //             updateMarkerLayout(mpModel.getData(), seriesModel, api);
    //             this.markerGroupMap.get(seriesModel.id).updateLayout(mpModel);
    //         }
    //     }, this);
    // },

    updateTransform: function (markPointModel, ecModel, api) {
        ecModel.eachSeries(function (seriesModel) {
            var mpModel = seriesModel.markPointModel;
            if (mpModel) {
                updateMarkerLayout(mpModel.getData(), seriesModel, api);
                this.markerGroupMap.get(seriesModel.id).updateLayout(mpModel);
            }
        }, this);
    },

    renderSeries: function (seriesModel, mpModel, ecModel, api) {
        var coordSys = seriesModel.coordinateSystem;
        var seriesId = seriesModel.id;
        var seriesData = seriesModel.getData();

        var symbolDrawMap = this.markerGroupMap;
        var symbolDraw = symbolDrawMap.get(seriesId)
            || symbolDrawMap.set(seriesId, new SymbolDraw());

        var mpData = createList(coordSys, seriesModel, mpModel);

        // FIXME
        mpModel.setData(mpData);

        updateMarkerLayout(mpModel.getData(), seriesModel, api);

        mpData.each(function (idx) {
            var itemModel = mpData.getItemModel(idx);
            var symbol = itemModel.getShallow('symbol');
            var symbolSize = itemModel.getShallow('symbolSize');
            var isFnSymbol = zrUtil.isFunction(symbol);
            var isFnSymbolSize = zrUtil.isFunction(symbolSize);

            if (isFnSymbol || isFnSymbolSize) {
                var rawIdx = mpModel.getRawValue(idx);
                var dataParams = mpModel.getDataParams(idx);
                if (isFnSymbol) {
                    symbol = symbol(rawIdx, dataParams);
                }
                if (isFnSymbolSize) {
                    // FIXME 这里不兼容 ECharts 2.x，2.x 貌似参数是整个数据？
                    symbolSize = symbolSize(rawIdx, dataParams);
                }
            }

            mpData.setItemVisual(idx, {
                symbol: symbol,
                symbolSize: symbolSize,
                color: itemModel.get('itemStyle.color')
                    || seriesData.getVisual('color')
            });
        });

        // TODO Text are wrong
        symbolDraw.updateData(mpData);
        this.group.add(symbolDraw.group);

        // Set host model for tooltip
        // FIXME
        mpData.eachItemGraphicEl(function (el) {
            el.traverse(function (child) {
                child.dataModel = mpModel;
            });
        });

        symbolDraw.__keep = true;

        symbolDraw.group.silent = mpModel.get('silent') || seriesModel.get('silent');
    }
});

/**
 * @inner
 * @param {module:echarts/coord/*} [coordSys]
 * @param {module:echarts/model/Series} seriesModel
 * @param {module:echarts/model/Model} mpModel
 */
function createList(coordSys, seriesModel, mpModel) {
    var coordDimsInfos;
    if (coordSys) {
        coordDimsInfos = zrUtil.map(coordSys && coordSys.dimensions, function (coordDim) {
            var info = seriesModel.getData().getDimensionInfo(
                seriesModel.getData().mapDimension(coordDim)
            ) || {};
            // In map series data don't have lng and lat dimension. Fallback to same with coordSys
            return zrUtil.defaults({name: coordDim}, info);
        });
    }
    else {
        coordDimsInfos = [{
            name: 'value',
            type: 'float'
        }];
    }

    var mpData = new List(coordDimsInfos, mpModel);
    var dataOpt = zrUtil.map(mpModel.get('data'), zrUtil.curry(
            markerHelper.dataTransform, seriesModel
        ));
    if (coordSys) {
        dataOpt = zrUtil.filter(
            dataOpt, zrUtil.curry(markerHelper.dataFilter, coordSys)
        );
    }

    mpData.initData(dataOpt, null,
        coordSys ? markerHelper.dimValueGetter : function (item) {
            return item.value;
        }
    );

    return mpData;
}

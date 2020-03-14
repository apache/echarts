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


import SymbolDraw from '../../chart/helper/SymbolDraw';
import * as numberUtil from '../../util/number';
import List from '../../data/List';
import * as markerHelper from './markerHelper';
import MarkerView from './MarkerView';
import ComponentView from '../../view/Component';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import SeriesModel from '../../model/Series';
import MarkPointModel, {MarkPointDataItemOption} from './MarkPointModel';
import GlobalModel from '../../model/Global';
import MarkerModel from './MarkerModel';
import ExtensionAPI from '../../ExtensionAPI';
import { HashMap, isFunction, map, defaults, filter, curry } from 'zrender/src/core/util';
import { getECData } from '../../util/graphic';

function updateMarkerLayout(
    mpData: List<MarkPointModel>,
    seriesModel: SeriesModel,
    api: ExtensionAPI
) {
    var coordSys = seriesModel.coordinateSystem;
    mpData.each(function (idx: number) {
        var itemModel = mpData.getItemModel<MarkPointDataItemOption>(idx);
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

class MarkPointView extends MarkerView {

    static type = 'markPoint'

    markerGroupMap: HashMap<SymbolDraw>

    updateTransform(markPointModel: MarkPointModel, ecModel: GlobalModel, api: ExtensionAPI) {
        ecModel.eachSeries(function (seriesModel) {
            var mpModel = MarkerModel.getMarkerModelFromSeries(seriesModel, 'markPoint') as MarkPointModel;
            if (mpModel) {
                updateMarkerLayout(
                    mpModel.getData(),
                    seriesModel, api
                );
                this.markerGroupMap.get(seriesModel.id).updateLayout();
            }
        }, this);
    }

    renderSeries(
        seriesModel: SeriesModel,
        mpModel: MarkPointModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
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
            var itemModel = mpData.getItemModel<MarkPointDataItemOption>(idx);
            var symbol = itemModel.getShallow('symbol');
            var symbolSize = itemModel.getShallow('symbolSize');

            if (isFunction(symbol) || isFunction(symbolSize)) {
                var rawIdx = mpModel.getRawValue(idx);
                var dataParams = mpModel.getDataParams(idx);
                if (isFunction(symbol)) {
                    symbol = symbol(rawIdx, dataParams);
                }
                if (isFunction(symbolSize)) {
                    // FIXME 这里不兼容 ECharts 2.x，2.x 貌似参数是整个数据？
                    symbolSize = symbolSize(rawIdx, dataParams);
                }
            }

            mpData.setItemVisual(idx, {
                symbol: symbol,
                symbolSize: symbolSize,
                color: itemModel.get(['itemStyle', 'color'])
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
                getECData(child).dataModel = mpModel;
            });
        });

        this.markKeep(symbolDraw);

        symbolDraw.group.silent = mpModel.get('silent') || seriesModel.get('silent');
    }
}

function createList(
    coordSys: CoordinateSystem,
    seriesModel: SeriesModel,
    mpModel: MarkPointModel
) {
    var coordDimsInfos;
    if (coordSys) {
        coordDimsInfos = map(coordSys && coordSys.dimensions, function (coordDim) {
            var info = seriesModel.getData().getDimensionInfo(
                seriesModel.getData().mapDimension(coordDim)
            ) || {};
            // In map series data don't have lng and lat dimension. Fallback to same with coordSys
            return defaults({name: coordDim}, info);
        });
    }
    else {
        coordDimsInfos = [{
            name: 'value',
            type: 'float'
        }];
    }

    var mpData = new List(coordDimsInfos, mpModel);
    var dataOpt = map(mpModel.get('data'), curry(
            markerHelper.dataTransform, seriesModel
        ));
    if (coordSys) {
        dataOpt = filter(
            dataOpt, curry(markerHelper.dataFilter, coordSys)
        );
    }

    mpData.initData(dataOpt, null,
        coordSys ? markerHelper.dimValueGetter : function (item: MarkPointDataItemOption) {
            return item.value;
        }
    );

    return mpData;
}

ComponentView.registerClass(MarkPointView);
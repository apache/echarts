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
import SeriesData from '../../data/SeriesData';
import * as markerHelper from './markerHelper';
import MarkerView from './MarkerView';
import { CoordinateSystem } from '../../coord/CoordinateSystem';
import SeriesModel from '../../model/Series';
import MarkPointModel, {MarkPointDataItemOption} from './MarkPointModel';
import GlobalModel from '../../model/Global';
import MarkerModel from './MarkerModel';
import ExtensionAPI from '../../core/ExtensionAPI';
import { HashMap, isFunction, map, filter, curry, extend } from 'zrender/src/core/util';
import { getECData } from '../../util/innerStore';
import { getVisualFromData } from '../../visual/helper';
import { ZRColor } from '../../util/types';
import SeriesDimensionDefine from '../../data/SeriesDimensionDefine';

function updateMarkerLayout(
    mpData: SeriesData<MarkPointModel>,
    seriesModel: SeriesModel,
    api: ExtensionAPI
) {
    const coordSys = seriesModel.coordinateSystem;
    mpData.each(function (idx: number) {
        const itemModel = mpData.getItemModel<MarkPointDataItemOption>(idx);
        let point;
        const xPx = numberUtil.parsePercent(itemModel.get('x'), api.getWidth());
        const yPx = numberUtil.parsePercent(itemModel.get('y'), api.getHeight());
        if (!isNaN(xPx) && !isNaN(yPx)) {
            point = [xPx, yPx];
        }
        // Chart like bar may have there own marker positioning logic
        else if (seriesModel.getMarkerPosition) {
            // Use the getMarkerPosition
            point = seriesModel.getMarkerPosition(
                mpData.getValues(mpData.dimensions, idx)
            );
        }
        else if (coordSys) {
            const x = mpData.get(coordSys.dimensions[0], idx);
            const y = mpData.get(coordSys.dimensions[1], idx);
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

    static type = 'markPoint';
    type = MarkPointView.type;

    markerGroupMap: HashMap<SymbolDraw>;

    updateTransform(markPointModel: MarkPointModel, ecModel: GlobalModel, api: ExtensionAPI) {
        ecModel.eachSeries(function (seriesModel) {
            const mpModel = MarkerModel.getMarkerModelFromSeries(seriesModel, 'markPoint') as MarkPointModel;
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
        const coordSys = seriesModel.coordinateSystem;
        const seriesId = seriesModel.id;
        const seriesData = seriesModel.getData();

        const symbolDrawMap = this.markerGroupMap;
        const symbolDraw = symbolDrawMap.get(seriesId)
            || symbolDrawMap.set(seriesId, new SymbolDraw());

        const mpData = createData(coordSys, seriesModel, mpModel);

        // FIXME
        mpModel.setData(mpData);

        updateMarkerLayout(mpModel.getData(), seriesModel, api);

        mpData.each(function (idx) {
            const itemModel = mpData.getItemModel<MarkPointDataItemOption>(idx);
            let symbol = itemModel.getShallow('symbol');
            let symbolSize = itemModel.getShallow('symbolSize');
            let symbolRotate = itemModel.getShallow('symbolRotate');
            let symbolOffset = itemModel.getShallow('symbolOffset');
            const symbolKeepAspect = itemModel.getShallow('symbolKeepAspect');

            // TODO: refactor needed: single data item should not support callback function
            if (isFunction(symbol) || isFunction(symbolSize) || isFunction(symbolRotate) || isFunction(symbolOffset)) {
                const rawIdx = mpModel.getRawValue(idx);
                const dataParams = mpModel.getDataParams(idx);
                if (isFunction(symbol)) {
                    symbol = symbol(rawIdx, dataParams);
                }
                if (isFunction(symbolSize)) {
                    // FIXME 这里不兼容 ECharts 2.x，2.x 貌似参数是整个数据？
                    symbolSize = symbolSize(rawIdx, dataParams);
                }
                if (isFunction(symbolRotate)) {
                    symbolRotate = symbolRotate(rawIdx, dataParams);
                }
                if (isFunction(symbolOffset)) {
                    symbolOffset = symbolOffset(rawIdx, dataParams);
                }
            }

            const style = itemModel.getModel('itemStyle').getItemStyle();
            const color = getVisualFromData(seriesData, 'color') as ZRColor;
            if (!style.fill) {
                style.fill = color;
            }

            mpData.setItemVisual(idx, {
                symbol: symbol,
                symbolSize: symbolSize,
                symbolRotate: symbolRotate,
                symbolOffset: symbolOffset,
                symbolKeepAspect: symbolKeepAspect,
                style
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

function createData(
    coordSys: CoordinateSystem,
    seriesModel: SeriesModel,
    mpModel: MarkPointModel
) {
    let coordDimsInfos: SeriesDimensionDefine[];
    if (coordSys) {
        coordDimsInfos = map(coordSys && coordSys.dimensions, function (coordDim) {
            const info = seriesModel.getData().getDimensionInfo(
                seriesModel.getData().mapDimension(coordDim)
            ) || {};
            // In map series data don't have lng and lat dimension. Fallback to same with coordSys
            return extend(extend({}, info), {
                name: coordDim,
                // DON'T use ordinalMeta to parse and collect ordinal.
                ordinalMeta: null
            });
        });
    }
    else {
        coordDimsInfos = [{
            name: 'value',
            type: 'float'
        }];
    }

    const mpData = new SeriesData(coordDimsInfos, mpModel);
    let dataOpt = map(mpModel.get('data'), curry(
            markerHelper.dataTransform, seriesModel
        ));
    if (coordSys) {
        dataOpt = filter(
            dataOpt, curry(markerHelper.dataFilter, coordSys)
        );
    }

    const dimValueGetter = markerHelper.createMarkerDimValueGetter(!!coordSys, coordDimsInfos);
    mpData.initData(dataOpt, null, dimValueGetter);

    return mpData;
}

export default MarkPointView;

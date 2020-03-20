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

import List from '../../data/List';
import * as numberUtil from '../../util/number';
import * as markerHelper from './markerHelper';
import LineDraw from '../../chart/helper/LineDraw';
import MarkerView from './MarkerView';
import {getStackedDimension} from '../../data/helper/dataStackHelper';
import { CoordinateSystem, isCoordinateSystemType } from '../../coord/CoordinateSystem';
import MarkLineModel, { MarkLine2DDataItemOption, MarkLineOption } from './MarkLineModel';
import { ScaleDataValue } from '../../util/types';
import SeriesModel from '../../model/Series';
import { __DEV__ } from '../../config';
import { getECData } from '../../util/graphic';
import ExtensionAPI from '../../ExtensionAPI';
import Cartesian2D from '../../coord/cartesian/Cartesian2D';
import GlobalModel from '../../model/Global';
import MarkerModel from './MarkerModel';
import {
    isArray,
    retrieve,
    clone,
    extend,
    logError,
    merge,
    map,
    defaults,
    curry,
    filter,
    HashMap
} from 'zrender/src/core/util';
import ComponentView from '../../view/Component';
import { makeInner } from '../../util/model';

// Item option for configuring line and each end of symbol.
// Line option. be merged from configuration of two ends.
type MarkLineMergedItemOption = MarkLine2DDataItemOption[number];

const inner = makeInner<{
    // from data
    from: List<MarkLineModel>
    // to data
    to: List<MarkLineModel>
}, MarkLineModel>();

const markLineTransform = function (
    seriesModel: SeriesModel,
    coordSys: CoordinateSystem,
    mlModel: MarkLineModel,
    item: MarkLineOption['data'][number]
) {
    let data = seriesModel.getData();

    let itemArray: MarkLineMergedItemOption[];
    if (!isArray(item)) {
        // Special type markLine like 'min', 'max', 'average', 'median'
        let mlType = item.type;
        if (
            mlType === 'min' || mlType === 'max' || mlType === 'average' || mlType === 'median'
            // In case
            // data: [{
            //   yAxis: 10
            // }]
            || (item.xAxis != null || item.yAxis != null)
        ) {

            let valueAxis;
            let value;

            if (item.yAxis != null || item.xAxis != null) {
                valueAxis = coordSys.getAxis(item.yAxis != null ? 'y' : 'x');
                value = retrieve(item.yAxis, item.xAxis);
            }
            else {
                let axisInfo = markerHelper.getAxisInfo(item, data, coordSys, seriesModel);
                valueAxis = axisInfo.valueAxis;
                let valueDataDim = getStackedDimension(data, axisInfo.valueDataDim);
                value = markerHelper.numCalculate(data, valueDataDim, mlType);
            }
            let valueIndex = valueAxis.dim === 'x' ? 0 : 1;
            let baseIndex = 1 - valueIndex;

            // Normized to 2d data with start and end point
            let mlFrom = clone(item) as MarkLine2DDataItemOption[number];
            let mlTo = {
                coord: []
            } as MarkLine2DDataItemOption[number];

            mlFrom.type = null;

            mlFrom.coord = [];
            mlFrom.coord[baseIndex] = -Infinity;
            mlTo.coord[baseIndex] = Infinity;

            let precision = mlModel.get('precision');
            if (precision >= 0 && typeof value === 'number') {
                value = +value.toFixed(Math.min(precision, 20));
            }

            mlFrom.coord[valueIndex] = mlTo.coord[valueIndex] = value;

            itemArray = [mlFrom, mlTo, { // Extra option for tooltip and label
                type: mlType,
                valueIndex: item.valueIndex,
                // Force to use the value of calculated value.
                value: value
            }];
        }
        else {
            // Invalid data
            if (__DEV__) {
                logError('Invalid markLine data.');
            }
            itemArray = [];
        }
    }
    else {
        itemArray = item;
    }

    const normalizedItem = [
        markerHelper.dataTransform(seriesModel, itemArray[0]),
        markerHelper.dataTransform(seriesModel, itemArray[1]),
        extend({}, itemArray[2])
    ];

    // Avoid line data type is extended by from(to) data type
    normalizedItem[2].type = normalizedItem[2].type || null;

    // Merge from option and to option into line option
    merge(normalizedItem[2], normalizedItem[0]);
    merge(normalizedItem[2], normalizedItem[1]);

    return normalizedItem;
};

function isInifinity(val: ScaleDataValue) {
    return !isNaN(val as number) && !isFinite(val as number);
}

// If a markLine has one dim
function ifMarkLineHasOnlyDim(
    dimIndex: number,
    fromCoord: ScaleDataValue[],
    toCoord: ScaleDataValue[],
    coordSys: CoordinateSystem
) {
    let otherDimIndex = 1 - dimIndex;
    let dimName = coordSys.dimensions[dimIndex];
    return isInifinity(fromCoord[otherDimIndex]) && isInifinity(toCoord[otherDimIndex])
        && fromCoord[dimIndex] === toCoord[dimIndex] && coordSys.getAxis(dimName).containData(fromCoord[dimIndex]);
}

function markLineFilter(
    coordSys: CoordinateSystem,
    item: MarkLine2DDataItemOption
) {
    if (coordSys.type === 'cartesian2d') {
        let fromCoord = item[0].coord;
        let toCoord = item[1].coord;
        // In case
        // {
        //  markLine: {
        //    data: [{ yAxis: 2 }]
        //  }
        // }
        if (
            fromCoord && toCoord
            && (ifMarkLineHasOnlyDim(1, fromCoord, toCoord, coordSys)
            || ifMarkLineHasOnlyDim(0, fromCoord, toCoord, coordSys))
        ) {
            return true;
        }
    }
    return markerHelper.dataFilter(coordSys, item[0])
        && markerHelper.dataFilter(coordSys, item[1]);
}

function updateSingleMarkerEndLayout(
    data: List<MarkLineModel>,
    idx: number,
    isFrom: boolean,
    seriesModel: SeriesModel,
    api: ExtensionAPI
) {
    let coordSys = seriesModel.coordinateSystem;
    let itemModel = data.getItemModel<MarkLine2DDataItemOption[number]>(idx);

    let point;
    let xPx = numberUtil.parsePercent(itemModel.get('x'), api.getWidth());
    let yPx = numberUtil.parsePercent(itemModel.get('y'), api.getHeight());
    if (!isNaN(xPx) && !isNaN(yPx)) {
        point = [xPx, yPx];
    }
    else {
        // Chart like bar may have there own marker positioning logic
        if (seriesModel.getMarkerPosition) {
            // Use the getMarkerPoisition
            point = seriesModel.getMarkerPosition(
                data.getValues(data.dimensions, idx)
            );
        }
        else {
            let dims = coordSys.dimensions;
            let x = data.get(dims[0], idx);
            let y = data.get(dims[1], idx);
            point = coordSys.dataToPoint([x, y]);
        }
        // Expand line to the edge of grid if value on one axis is Inifnity
        // In case
        //  markLine: {
        //    data: [{
        //      yAxis: 2
        //      // or
        //      type: 'average'
        //    }]
        //  }
        if (isCoordinateSystemType<Cartesian2D>(coordSys, 'cartesian2d')) {
            let xAxis = coordSys.getAxis('x');
            let yAxis = coordSys.getAxis('y');
            let dims = coordSys.dimensions;
            if (isInifinity(data.get(dims[0], idx))) {
                point[0] = xAxis.toGlobalCoord(xAxis.getExtent()[isFrom ? 0 : 1]);
            }
            else if (isInifinity(data.get(dims[1], idx))) {
                point[1] = yAxis.toGlobalCoord(yAxis.getExtent()[isFrom ? 0 : 1]);
            }
        }

        // Use x, y if has any
        if (!isNaN(xPx)) {
            point[0] = xPx;
        }
        if (!isNaN(yPx)) {
            point[1] = yPx;
        }
    }

    data.setItemLayout(idx, point);
}

class MarkLineView extends MarkerView {

    static type = 'markLine';
    type = MarkLineView.type;

    markerGroupMap: HashMap<LineDraw>;

    updateTransform(markLineModel: MarkLineModel, ecModel: GlobalModel, api: ExtensionAPI) {
        ecModel.eachSeries(function (seriesModel) {
            let mlModel = MarkerModel.getMarkerModelFromSeries(seriesModel, 'markLine') as MarkLineModel;
            if (mlModel) {
                let mlData = mlModel.getData();
                let fromData = inner(mlModel).from;
                let toData = inner(mlModel).to;
                // Update visual and layout of from symbol and to symbol
                fromData.each(function (idx) {
                    updateSingleMarkerEndLayout(fromData, idx, true, seriesModel, api);
                    updateSingleMarkerEndLayout(toData, idx, false, seriesModel, api);
                });
                // Update layout of line
                mlData.each(function (idx) {
                    mlData.setItemLayout(idx, [
                        fromData.getItemLayout(idx),
                        toData.getItemLayout(idx)
                    ]);
                });

                this.markerGroupMap.get(seriesModel.id).updateLayout();

            }
        }, this);
    }

    renderSeries(
        seriesModel: SeriesModel,
        mlModel: MarkLineModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        let coordSys = seriesModel.coordinateSystem;
        let seriesId = seriesModel.id;
        let seriesData = seriesModel.getData();

        let lineDrawMap = this.markerGroupMap;
        let lineDraw = lineDrawMap.get(seriesId)
            || lineDrawMap.set(seriesId, new LineDraw());
        this.group.add(lineDraw.group);

        let mlData = createList(coordSys, seriesModel, mlModel);

        let fromData = mlData.from;
        let toData = mlData.to;
        let lineData = mlData.line;

        inner(mlModel).from = fromData;
        inner(mlModel).to = toData;
        // Line data for tooltip and formatter
        mlModel.setData(lineData);

        let symbolType = mlModel.get('symbol');
        let symbolSize = mlModel.get('symbolSize');
        if (!isArray(symbolType)) {
            symbolType = [symbolType, symbolType];
        }
        if (!isArray(symbolSize)) {
            symbolSize = [symbolSize, symbolSize];
        }

        // Update visual and layout of from symbol and to symbol
        mlData.from.each(function (idx) {
            updateDataVisualAndLayout(fromData, idx, true);
            updateDataVisualAndLayout(toData, idx, false);
        });

        // Update visual and layout of line
        lineData.each(function (idx) {
            let lineColor = lineData.getItemModel<MarkLineMergedItemOption>(idx).get(['lineStyle', 'color']);
            lineData.setItemVisual(idx, {
                color: lineColor || fromData.getItemVisual(idx, 'color')
            });
            lineData.setItemLayout(idx, [
                fromData.getItemLayout(idx),
                toData.getItemLayout(idx)
            ]);

            lineData.setItemVisual(idx, {
                'fromSymbolSize': fromData.getItemVisual(idx, 'symbolSize'),
                'fromSymbol': fromData.getItemVisual(idx, 'symbol'),
                'toSymbolSize': toData.getItemVisual(idx, 'symbolSize'),
                'toSymbol': toData.getItemVisual(idx, 'symbol')
            });
        });

        lineDraw.updateData(lineData);

        // Set host model for tooltip
        // FIXME
        mlData.line.eachItemGraphicEl(function (el, idx) {
            el.traverse(function (child) {
                getECData(child).dataModel = mlModel;
            });
        });

        function updateDataVisualAndLayout(
            data: List<MarkLineModel>,
            idx: number,
            isFrom: boolean
        ) {
            let itemModel = data.getItemModel<MarkLineMergedItemOption>(idx);

            updateSingleMarkerEndLayout(
                data, idx, isFrom, seriesModel, api
            );

            data.setItemVisual(idx, {
                symbolSize: itemModel.get('symbolSize') || (symbolSize as number[])[isFrom ? 0 : 1],
                symbol: itemModel.get('symbol', true) || (symbolType as string[])[isFrom ? 0 : 1],
                color: itemModel.get(['itemStyle', 'color']) || seriesData.getVisual('color')
            });
        }

        this.markKeep(lineDraw);

        lineDraw.group.silent = mlModel.get('silent') || seriesModel.get('silent');
    }
}

function createList(coordSys: CoordinateSystem, seriesModel: SeriesModel, mlModel: MarkLineModel) {

    let coordDimsInfos;
    if (coordSys) {
        coordDimsInfos = map(coordSys && coordSys.dimensions, function (coordDim) {
            let info = seriesModel.getData().getDimensionInfo(
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

    let fromData = new List(coordDimsInfos, mlModel);
    let toData = new List(coordDimsInfos, mlModel);
    // No dimensions
    let lineData = new List([], mlModel);

    let optData = map(mlModel.get('data'), curry(
        markLineTransform, seriesModel, coordSys, mlModel
    ));
    if (coordSys) {
        optData = filter(
            optData, curry(markLineFilter, coordSys)
        );
    }
    let dimValueGetter = coordSys ? markerHelper.dimValueGetter : function (item: MarkLineMergedItemOption) {
        return item.value;
    };
    fromData.initData(
        map(optData, function (item) {
            return item[0];
        }),
        null,
        dimValueGetter
    );
    toData.initData(
        map(optData, function (item) {
            return item[1];
        }),
        null,
        dimValueGetter
    );
    lineData.initData(
        map(optData, function (item) {
            return item[2];
        })
    );
    lineData.hasItemOption = true;

    return {
        from: fromData,
        to: toData,
        line: lineData
    };
}

ComponentView.registerClass(MarkLineView);

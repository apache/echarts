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

// TODO Optimize on polar

import * as colorUtil from 'zrender/src/tool/color';
import SeriesData from '../../data/SeriesData';
import * as numberUtil from '../../util/number';
import * as graphic from '../../util/graphic';
import { toggleHoverEmphasis, setStatesStylesFromModel } from '../../util/states';
import * as markerHelper from './markerHelper';
import MarkerView from './MarkerView';
import { retrieve, mergeAll, map, curry, filter, HashMap, extend, isString } from 'zrender/src/core/util';
import { ScaleDataValue, ZRColor } from '../../util/types';
import { CoordinateSystem, isCoordinateSystemType } from '../../coord/CoordinateSystem';
import MarkAreaModel, { MarkArea2DDataItemOption } from './MarkAreaModel';
import SeriesModel from '../../model/Series';
import Cartesian2D from '../../coord/cartesian/Cartesian2D';
import SeriesDimensionDefine from '../../data/SeriesDimensionDefine';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import MarkerModel from './MarkerModel';
import { makeInner } from '../../util/model';
import { getVisualFromData } from '../../visual/helper';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import { getECData } from '../../util/innerStore';
import Axis2D from '../../coord/cartesian/Axis2D';
import { parseDataValue } from '../../data/helper/dataValueHelper';

interface MarkAreaDrawGroup {
    group: graphic.Group
}

const inner = makeInner<{
    data: SeriesData<MarkAreaModel>
}, MarkAreaDrawGroup>();

// Merge two ends option into one.
type MarkAreaMergedItemOption = Omit<MarkArea2DDataItemOption[number], 'coord'> & {
    coord: MarkArea2DDataItemOption[number]['coord'][]
    x0: number | string
    y0: number | string
    x1: number | string
    y1: number | string
};

const markAreaTransform = function (
    seriesModel: SeriesModel,
    coordSys: CoordinateSystem,
    maModel: MarkAreaModel,
    item: MarkArea2DDataItemOption
): MarkAreaMergedItemOption {
    // item may be null
    const item0 = item[0];
    const item1 = item[1];
    if (!item0 || !item1) {
        return;
    }

    const lt = markerHelper.dataTransform(seriesModel, item0);
    const rb = markerHelper.dataTransform(seriesModel, item1);

    // FIXME make sure lt is less than rb
    const ltCoord = lt.coord;
    const rbCoord = rb.coord;
    ltCoord[0] = retrieve(ltCoord[0], -Infinity);
    ltCoord[1] = retrieve(ltCoord[1], -Infinity);

    rbCoord[0] = retrieve(rbCoord[0], Infinity);
    rbCoord[1] = retrieve(rbCoord[1], Infinity);

    // Merge option into one
    const result: MarkAreaMergedItemOption = mergeAll([{}, lt, rb]);

    result.coord = [
        lt.coord, rb.coord
    ];
    result.x0 = lt.x;
    result.y0 = lt.y;
    result.x1 = rb.x;
    result.y1 = rb.y;
    return result;
};

function isInfinity(val: ScaleDataValue) {
    return !isNaN(val as number) && !isFinite(val as number);
}

// If a markArea has one dim
function ifMarkAreaHasOnlyDim(
    dimIndex: number,
    fromCoord: ScaleDataValue[],
    toCoord: ScaleDataValue[],
    coordSys: CoordinateSystem
) {
    const otherDimIndex = 1 - dimIndex;
    return isInfinity(fromCoord[otherDimIndex]) && isInfinity(toCoord[otherDimIndex]);
}

function markAreaFilter(coordSys: CoordinateSystem, item: MarkAreaMergedItemOption) {
    const fromCoord = item.coord[0];
    const toCoord = item.coord[1];
    const item0 = {
        coord: fromCoord,
        x: item.x0,
        y: item.y0
    };
    const item1 = {
        coord: toCoord,
        x: item.x1,
        y: item.y1
    };
    if (isCoordinateSystemType<Cartesian2D>(coordSys, 'cartesian2d')) {
        // In case
        // {
        //  markArea: {
        //    data: [{ yAxis: 2 }]
        //  }
        // }
        if (
            fromCoord && toCoord
            && (ifMarkAreaHasOnlyDim(1, fromCoord, toCoord, coordSys)
            || ifMarkAreaHasOnlyDim(0, fromCoord, toCoord, coordSys))
        ) {
            return true;
        }
        // Directly returning true may also do the work,
        // because markArea will not be shown automatically
        // when it's not included in coordinate system.
        // But filtering ahead can avoid keeping rendering markArea
        // when there are too many of them.
        return markerHelper.zoneFilter(coordSys, item0, item1);
    }
    return markerHelper.dataFilter(coordSys, item0)
        || markerHelper.dataFilter(coordSys, item1);
}

// dims can be ['x0', 'y0'], ['x1', 'y1'], ['x0', 'y1'], ['x1', 'y0']
function getSingleMarkerEndPoint(
    data: SeriesData<MarkAreaModel>,
    idx: number,
    dims: typeof dimPermutations[number],
    seriesModel: SeriesModel,
    api: ExtensionAPI
) {
    const coordSys = seriesModel.coordinateSystem;
    const itemModel = data.getItemModel<MarkAreaMergedItemOption>(idx);

    let point;
    const xPx = numberUtil.parsePercent(itemModel.get(dims[0]), api.getWidth());
    const yPx = numberUtil.parsePercent(itemModel.get(dims[1]), api.getHeight());
    if (!isNaN(xPx) && !isNaN(yPx)) {
        point = [xPx, yPx];
    }
    else {
        // Chart like bar may have there own marker positioning logic
        if (seriesModel.getMarkerPosition) {
            // Consider the case that user input the right-bottom point first
            // Pick the larger x and y as 'x1' and 'y1'
            const pointValue0 = data.getValues(['x0', 'y0'], idx);
            const pointValue1 = data.getValues(['x1', 'y1'], idx);
            const clampPointValue0 = coordSys.clampData(pointValue0);
            const clampPointValue1 = coordSys.clampData(pointValue1);
            const pointValue = [];
            if (dims[0] === 'x0') {
                pointValue[0] = (clampPointValue0[0] > clampPointValue1[0]) ? pointValue1[0] : pointValue0[0];
            }
            else {
                pointValue[0] = (clampPointValue0[0] > clampPointValue1[0]) ? pointValue0[0] : pointValue1[0];
            }
            if (dims[1] === 'y0') {
                pointValue[1] = (clampPointValue0[1] > clampPointValue1[1]) ? pointValue1[1] : pointValue0[1];
            }
            else {
                pointValue[1] = (clampPointValue0[1] > clampPointValue1[1]) ? pointValue0[1] : pointValue1[1];
            }
            // Use the getMarkerPosition
            point = seriesModel.getMarkerPosition(
                pointValue, dims, true
            );
        }
        else {
            const x = data.get(dims[0], idx) as number;
            const y = data.get(dims[1], idx) as number;
            const pt = [x, y];
            coordSys.clampData && coordSys.clampData(pt, pt);
            point = coordSys.dataToPoint(pt, true);
        }
        if (isCoordinateSystemType<Cartesian2D>(coordSys, 'cartesian2d')) {
            // TODO: TYPE ts@4.1 may still infer it as Axis instead of Axis2D. Not sure if it's a bug
            const xAxis = coordSys.getAxis('x') as Axis2D;
            const yAxis = coordSys.getAxis('y') as Axis2D;
            const x = data.get(dims[0], idx) as number;
            const y = data.get(dims[1], idx) as number;
            if (isInfinity(x)) {
                point[0] = xAxis.toGlobalCoord(xAxis.getExtent()[dims[0] === 'x0' ? 0 : 1]);
            }
            else if (isInfinity(y)) {
                point[1] = yAxis.toGlobalCoord(yAxis.getExtent()[dims[1] === 'y0' ? 0 : 1]);
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

    return point;
}

export const dimPermutations = [['x0', 'y0'], ['x1', 'y0'], ['x1', 'y1'], ['x0', 'y1']] as const;

class MarkAreaView extends MarkerView {

    static type = 'markArea';
    type = MarkAreaView.type;

    markerGroupMap: HashMap<MarkAreaDrawGroup>;

    updateTransform(markAreaModel: MarkAreaModel, ecModel: GlobalModel, api: ExtensionAPI) {
        ecModel.eachSeries(function (seriesModel) {
            const maModel = MarkerModel.getMarkerModelFromSeries(seriesModel, 'markArea') as MarkAreaModel;
            if (maModel) {
                const areaData = maModel.getData();
                areaData.each(function (idx) {
                    const points = map(dimPermutations, function (dim) {
                        return getSingleMarkerEndPoint(areaData, idx, dim, seriesModel, api);
                    });
                    // Layout
                    areaData.setItemLayout(idx, points);
                    const el = areaData.getItemGraphicEl(idx) as graphic.Polygon;
                    el.setShape('points', points);
                });
            }
        }, this);
    }

    renderSeries(
        seriesModel: SeriesModel,
        maModel: MarkAreaModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        const coordSys = seriesModel.coordinateSystem;
        const seriesId = seriesModel.id;
        const seriesData = seriesModel.getData();

        const areaGroupMap = this.markerGroupMap;
        const polygonGroup = areaGroupMap.get(seriesId)
            || areaGroupMap.set(seriesId, {group: new graphic.Group()});

        this.group.add(polygonGroup.group);
        this.markKeep(polygonGroup);

        const areaData = createList(coordSys, seriesModel, maModel);

        // Line data for tooltip and formatter
        maModel.setData(areaData);

        // Update visual and layout of line
        areaData.each(function (idx) {
            // Layout
            const points = map(dimPermutations, function (dim) {
                return getSingleMarkerEndPoint(areaData, idx, dim, seriesModel, api);
            });
            const xAxisScale = coordSys.getAxis('x').scale;
            const yAxisScale = coordSys.getAxis('y').scale;
            const xAxisExtent = xAxisScale.getExtent();
            const yAxisExtent = yAxisScale.getExtent();
            const xPointExtent = [xAxisScale.parse(areaData.get('x0', idx)), xAxisScale.parse(areaData.get('x1', idx))];
            const yPointExtent = [yAxisScale.parse(areaData.get('y0', idx)), yAxisScale.parse(areaData.get('y1', idx))];
            numberUtil.asc(xPointExtent);
            numberUtil.asc(yPointExtent);
            const overlapped = !(xAxisExtent[0] > xPointExtent[1] || xAxisExtent[1] < xPointExtent[0]
                                || yAxisExtent[0] > yPointExtent[1] || yAxisExtent[1] < yPointExtent[0]);
            // If none of the area is inside coordSys, allClipped is set to be true
            // in layout so that label will not be displayed. See #12591
            const allClipped = !overlapped;
            areaData.setItemLayout(idx, {
                points: points,
                allClipped: allClipped
            });


            const style = areaData.getItemModel<MarkAreaMergedItemOption>(idx).getModel('itemStyle').getItemStyle();
            const color = getVisualFromData(seriesData, 'color') as ZRColor;
            if (!style.fill) {
                style.fill = color;
                if (isString(style.fill)) {
                    style.fill = colorUtil.modifyAlpha(style.fill, 0.4);
                }
            }
            if (!style.stroke) {
                style.stroke = color;
            }
            // Visual
            areaData.setItemVisual(idx, 'style', style);
        });


        areaData.diff(inner(polygonGroup).data)
            .add(function (idx) {
                const layout = areaData.getItemLayout(idx);
                if (!layout.allClipped) {
                    const polygon = new graphic.Polygon({
                        shape: {
                            points: layout.points
                        }
                    });
                    areaData.setItemGraphicEl(idx, polygon);
                    polygonGroup.group.add(polygon);
                }
            })
            .update(function (newIdx, oldIdx) {
                let polygon = inner(polygonGroup).data.getItemGraphicEl(oldIdx) as graphic.Polygon;
                const layout = areaData.getItemLayout(newIdx);
                if (!layout.allClipped) {
                    if (polygon) {
                        graphic.updateProps(polygon, {
                            shape: {
                                points: layout.points
                            }
                        }, maModel, newIdx);
                    }
                    else {
                        polygon = new graphic.Polygon({
                            shape: {
                                points: layout.points
                            }
                        });
                    }
                    areaData.setItemGraphicEl(newIdx, polygon);
                    polygonGroup.group.add(polygon);
                }
                else if (polygon) {
                    polygonGroup.group.remove(polygon);
                }
            })
            .remove(function (idx) {
                const polygon = inner(polygonGroup).data.getItemGraphicEl(idx);
                polygonGroup.group.remove(polygon);
            })
            .execute();

        areaData.eachItemGraphicEl(function (polygon: graphic.Polygon, idx) {
            const itemModel = areaData.getItemModel<MarkAreaMergedItemOption>(idx);
            const style = areaData.getItemVisual(idx, 'style');
            polygon.useStyle(areaData.getItemVisual(idx, 'style'));

            setLabelStyle(
                polygon, getLabelStatesModels(itemModel),
                {
                    labelFetcher: maModel,
                    labelDataIndex: idx,
                    defaultText: areaData.getName(idx) || '',
                    inheritColor: isString(style.fill)
                        ? colorUtil.modifyAlpha(style.fill, 1) : '#000'
                }
            );

            setStatesStylesFromModel(polygon, itemModel);

            toggleHoverEmphasis(polygon, null, null, itemModel.get(['emphasis', 'disabled']));

            getECData(polygon).dataModel = maModel;
        });

        inner(polygonGroup).data = areaData;

        polygonGroup.group.silent = maModel.get('silent') || seriesModel.get('silent');
    }
}

function createList(
    coordSys: CoordinateSystem,
    seriesModel: SeriesModel,
    maModel: MarkAreaModel
) {

    let areaData: SeriesData<MarkAreaModel>;
    let dataDims: SeriesDimensionDefine[];
    const dims = ['x0', 'y0', 'x1', 'y1'];
    if (coordSys) {
        const coordDimsInfos: SeriesDimensionDefine[] = map(coordSys && coordSys.dimensions, function (coordDim) {
            const data = seriesModel.getData();
            const info = data.getDimensionInfo(
                data.mapDimension(coordDim)
            ) || {};
            // In map series data don't have lng and lat dimension. Fallback to same with coordSys
            return extend(extend({}, info), {
                name: coordDim,
                // DON'T use ordinalMeta to parse and collect ordinal.
                ordinalMeta: null
            });
        });
        dataDims = map(dims, (dim, idx) => ({
            name: dim,
            type: coordDimsInfos[idx % 2].type
        }));
        areaData = new SeriesData(dataDims, maModel);
    }
    else {
        dataDims = [{
            name: 'value',
            type: 'float'
        }];
        areaData = new SeriesData(dataDims, maModel);
    }

    let optData = map(maModel.get('data'), curry(
        markAreaTransform, seriesModel, coordSys, maModel
    ));
    if (coordSys) {
        optData = filter(
            optData, curry(markAreaFilter, coordSys)
        );
    }

    const dimValueGetter: markerHelper.MarkerDimValueGetter<MarkAreaMergedItemOption> = coordSys
        ? function (item, dimName, dataIndex, dimIndex) {
            // TODO should convert to ParsedValue?
            const rawVal = item.coord[Math.floor(dimIndex / 2)][dimIndex % 2];
            return parseDataValue(rawVal, dataDims[dimIndex]);
        }
        : function (item, dimName, dataIndex, dimIndex) {
            return parseDataValue(item.value, dataDims[dimIndex]);
        };
    areaData.initData(optData, null, dimValueGetter);
    areaData.hasItemOption = true;
    return areaData;
}

export default MarkAreaView;

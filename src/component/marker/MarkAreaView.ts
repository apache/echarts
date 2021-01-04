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
import List from '../../data/List';
import * as numberUtil from '../../util/number';
import * as graphic from '../../util/graphic';
import { enableHoverEmphasis, setStatesStylesFromModel } from '../../util/states';
import * as markerHelper from './markerHelper';
import MarkerView from './MarkerView';
import { retrieve, mergeAll, map, defaults, curry, filter, HashMap, each } from 'zrender/src/core/util';
import { ScaleDataValue, ParsedValue, ZRColor } from '../../util/types';
import { CoordinateSystem, isCoordinateSystemType } from '../../coord/CoordinateSystem';
import MarkAreaModel, { MarkArea2DDataItemOption } from './MarkAreaModel';
import SeriesModel from '../../model/Series';
import Cartesian2D from '../../coord/cartesian/Cartesian2D';
import DataDimensionInfo from '../../data/DataDimensionInfo';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import MarkerModel from './MarkerModel';
import { makeInner } from '../../util/model';
import { getVisualFromData } from '../../visual/helper';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import { getECData } from '../../util/innerStore';
import Axis2D from '../../coord/cartesian/Axis2D';

interface MarkAreaDrawGroup {
    group: graphic.Group
}

const inner = makeInner<{
    data: List<MarkAreaModel>
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
    const lt = markerHelper.dataTransform(seriesModel, item[0]);
    const rb = markerHelper.dataTransform(seriesModel, item[1]);

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

function isInifinity(val: ScaleDataValue) {
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
    return isInifinity(fromCoord[otherDimIndex]) && isInifinity(toCoord[otherDimIndex]);
}

function markAreaFilter(coordSys: CoordinateSystem, item: MarkAreaMergedItemOption) {
    const fromCoord = item.coord[0];
    const toCoord = item.coord[1];
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
    }
    return markerHelper.dataFilter(coordSys, {
            coord: fromCoord,
            x: item.x0,
            y: item.y0
        })
        || markerHelper.dataFilter(coordSys, {
            coord: toCoord,
            x: item.x1,
            y: item.y1
        });
}

// dims can be ['x0', 'y0'], ['x1', 'y1'], ['x0', 'y1'], ['x1', 'y0']
function getSingleMarkerEndPoint(
    data: List<MarkAreaModel>,
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
            // Use the getMarkerPoisition
            point = seriesModel.getMarkerPosition(
                data.getValues(dims, idx)
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
            if (isInifinity(x)) {
                point[0] = xAxis.toGlobalCoord(xAxis.getExtent()[dims[0] === 'x0' ? 0 : 1]);
            }
            else if (isInifinity(y)) {
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

const dimPermutations = [['x0', 'y0'], ['x1', 'y0'], ['x1', 'y1'], ['x0', 'y1']] as const;

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
            // If none of the area is inside coordSys, allClipped is set to be true
            // in layout so that label will not be displayed. See #12591
            let allClipped = true;
            each(dimPermutations, function (dim) {
                if (!allClipped) {
                    return;
                }
                const xValue = areaData.get(dim[0], idx);
                const yValue = areaData.get(dim[1], idx);
                // If is infinity, the axis should be considered not clipped
                if ((isInifinity(xValue) || coordSys.getAxis('x').containData(xValue))
                    && (isInifinity(yValue) || coordSys.getAxis('y').containData(yValue))
                ) {
                    allClipped = false;
                }
            });
            areaData.setItemLayout(idx, {
                points: points,
                allClipped: allClipped
            });


            const style = areaData.getItemModel<MarkAreaMergedItemOption>(idx).getModel('itemStyle').getItemStyle();
            const color = getVisualFromData(seriesData, 'color') as ZRColor;
            if (!style.fill) {
                style.fill = color;
                if (typeof style.fill === 'string') {
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
                    inheritColor: typeof style.fill === 'string'
                        ? colorUtil.modifyAlpha(style.fill, 1) : '#000'
                }
            );

            setStatesStylesFromModel(polygon, itemModel);

            enableHoverEmphasis(polygon);

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

    let coordDimsInfos: DataDimensionInfo[];
    let areaData: List<MarkAreaModel>;
    const dims = ['x0', 'y0', 'x1', 'y1'];
    if (coordSys) {
        coordDimsInfos = map(coordSys && coordSys.dimensions, function (coordDim) {
            const data = seriesModel.getData();
            const info = data.getDimensionInfo(
                data.mapDimension(coordDim)
            ) || {};
            // In map series data don't have lng and lat dimension. Fallback to same with coordSys
            return defaults({
                name: coordDim
            }, info);
        });
        areaData = new List(map(dims, function (dim, idx) {
            return {
                name: dim,
                type: coordDimsInfos[idx % 2].type
            };
        }), maModel);
    }
    else {
        coordDimsInfos = [{
            name: 'value',
            type: 'float'
        }];
        areaData = new List(coordDimsInfos, maModel);
    }

    let optData = map(maModel.get('data'), curry(
        markAreaTransform, seriesModel, coordSys, maModel
    ));
    if (coordSys) {
        optData = filter(
            optData, curry(markAreaFilter, coordSys)
        );
    }

    const dimValueGetter = coordSys ? function (
        item: MarkAreaMergedItemOption,
        dimName: string,
        dataIndex: number,
        dimIndex: number
    ) {
        // TODO should convert to ParsedValue?
        return item.coord[Math.floor(dimIndex / 2)][dimIndex % 2] as ParsedValue;
    } : function (item: MarkAreaMergedItemOption) {
        return item.value;
    };
    areaData.initData(optData, null, dimValueGetter);
    areaData.hasItemOption = true;
    return areaData;
}

export default MarkAreaView;
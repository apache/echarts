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

// TODO Better on polar

import * as zrUtil from 'zrender/src/core/util';
import * as colorUtil from 'zrender/src/tool/color';
import List from '../../data/List';
import * as numberUtil from '../../util/number';
import * as graphic from '../../util/graphic';
import * as markerHelper from './markerHelper';
import MarkerView from './MarkerView';


var markAreaTransform = function (seriesModel, coordSys, maModel, item) {
    var lt = markerHelper.dataTransform(seriesModel, item[0]);
    var rb = markerHelper.dataTransform(seriesModel, item[1]);
    var retrieve = zrUtil.retrieve;

    // FIXME make sure lt is less than rb
    var ltCoord = lt.coord;
    var rbCoord = rb.coord;
    ltCoord[0] = retrieve(ltCoord[0], -Infinity);
    ltCoord[1] = retrieve(ltCoord[1], -Infinity);

    rbCoord[0] = retrieve(rbCoord[0], Infinity);
    rbCoord[1] = retrieve(rbCoord[1], Infinity);

    // Merge option into one
    var result = zrUtil.mergeAll([{}, lt, rb]);

    result.coord = [
        lt.coord, rb.coord
    ];
    result.x0 = lt.x;
    result.y0 = lt.y;
    result.x1 = rb.x;
    result.y1 = rb.y;
    return result;
};

function isInifinity(val) {
    return !isNaN(val) && !isFinite(val);
}

// If a markArea has one dim
function ifMarkLineHasOnlyDim(dimIndex, fromCoord, toCoord, coordSys) {
    var otherDimIndex = 1 - dimIndex;
    return isInifinity(fromCoord[otherDimIndex]) && isInifinity(toCoord[otherDimIndex]);
}

function markAreaFilter(coordSys, item) {
    var fromCoord = item.coord[0];
    var toCoord = item.coord[1];
    if (coordSys.type === 'cartesian2d') {
        // In case
        // {
        //  markArea: {
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
function getSingleMarkerEndPoint(data, idx, dims, seriesModel, api) {
    var coordSys = seriesModel.coordinateSystem;
    var itemModel = data.getItemModel(idx);

    var point;
    var xPx = numberUtil.parsePercent(itemModel.get(dims[0]), api.getWidth());
    var yPx = numberUtil.parsePercent(itemModel.get(dims[1]), api.getHeight());
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
            var x = data.get(dims[0], idx);
            var y = data.get(dims[1], idx);
            var pt = [x, y];
            coordSys.clampData && coordSys.clampData(pt, pt);
            point = coordSys.dataToPoint(pt, true);
        }
        if (coordSys.type === 'cartesian2d') {
            var xAxis = coordSys.getAxis('x');
            var yAxis = coordSys.getAxis('y');
            var x = data.get(dims[0], idx);
            var y = data.get(dims[1], idx);
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

var dimPermutations = [['x0', 'y0'], ['x1', 'y0'], ['x1', 'y1'], ['x0', 'y1']];

MarkerView.extend({

    type: 'markArea',

    // updateLayout: function (markAreaModel, ecModel, api) {
    //     ecModel.eachSeries(function (seriesModel) {
    //         var maModel = seriesModel.markAreaModel;
    //         if (maModel) {
    //             var areaData = maModel.getData();
    //             areaData.each(function (idx) {
    //                 var points = zrUtil.map(dimPermutations, function (dim) {
    //                     return getSingleMarkerEndPoint(areaData, idx, dim, seriesModel, api);
    //                 });
    //                 // Layout
    //                 areaData.setItemLayout(idx, points);
    //                 var el = areaData.getItemGraphicEl(idx);
    //                 el.setShape('points', points);
    //             });
    //         }
    //     }, this);
    // },

    updateTransform: function (markAreaModel, ecModel, api) {
        ecModel.eachSeries(function (seriesModel) {
            var maModel = seriesModel.markAreaModel;
            if (maModel) {
                var areaData = maModel.getData();
                areaData.each(function (idx) {
                    var points = zrUtil.map(dimPermutations, function (dim) {
                        return getSingleMarkerEndPoint(areaData, idx, dim, seriesModel, api);
                    });
                    // Layout
                    areaData.setItemLayout(idx, points);
                    var el = areaData.getItemGraphicEl(idx);
                    el.setShape('points', points);
                });
            }
        }, this);
    },

    renderSeries: function (seriesModel, maModel, ecModel, api) {
        var coordSys = seriesModel.coordinateSystem;
        var seriesId = seriesModel.id;
        var seriesData = seriesModel.getData();

        var areaGroupMap = this.markerGroupMap;
        var polygonGroup = areaGroupMap.get(seriesId)
            || areaGroupMap.set(seriesId, {group: new graphic.Group()});

        this.group.add(polygonGroup.group);
        polygonGroup.__keep = true;

        var areaData = createList(coordSys, seriesModel, maModel);

        // Line data for tooltip and formatter
        maModel.setData(areaData);

        // Update visual and layout of line
        areaData.each(function (idx) {
            // Layout
            var points = zrUtil.map(dimPermutations, function (dim) {
                return getSingleMarkerEndPoint(areaData, idx, dim, seriesModel, api);
            });
            // If none of the area is inside coordSys, allClipped is set to be true
            // in layout so that label will not be displayed. See #12591
            var allClipped = true;
            zrUtil.each(dimPermutations, function (dim) {
                if (!allClipped) {
                    return;
                }
                var xValue = areaData.get(dim[0], idx);
                var yValue = areaData.get(dim[1], idx);
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

            // Visual
            areaData.setItemVisual(idx, {
                color: seriesData.getVisual('color')
            });
        });


        areaData.diff(polygonGroup.__data)
            .add(function (idx) {
                var layout = areaData.getItemLayout(idx);
                if (!layout.allClipped) {
                    var polygon = new graphic.Polygon({
                        shape: {
                            points: layout.points
                        }
                    });
                    areaData.setItemGraphicEl(idx, polygon);
                    polygonGroup.group.add(polygon);
                }
            })
            .update(function (newIdx, oldIdx) {
                var polygon = polygonGroup.__data.getItemGraphicEl(oldIdx);
                var layout = areaData.getItemLayout(newIdx);
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
                var polygon = polygonGroup.__data.getItemGraphicEl(idx);
                polygonGroup.group.remove(polygon);
            })
            .execute();

        areaData.eachItemGraphicEl(function (polygon, idx) {
            var itemModel = areaData.getItemModel(idx);
            var labelModel = itemModel.getModel('label');
            var labelHoverModel = itemModel.getModel('emphasis.label');
            var color = areaData.getItemVisual(idx, 'color');
            polygon.useStyle(
                zrUtil.defaults(
                    itemModel.getModel('itemStyle').getItemStyle(),
                    {
                        fill: colorUtil.modifyAlpha(color, 0.4),
                        stroke: color
                    }
                )
            );

            polygon.hoverStyle = itemModel.getModel('emphasis.itemStyle').getItemStyle();

            graphic.setLabelStyle(
                polygon.style, polygon.hoverStyle, labelModel, labelHoverModel,
                {
                    labelFetcher: maModel,
                    labelDataIndex: idx,
                    defaultText: areaData.getName(idx) || '',
                    isRectText: true,
                    autoColor: color
                }
            );

            graphic.setHoverStyle(polygon, {});

            polygon.dataModel = maModel;
        });

        polygonGroup.__data = areaData;

        polygonGroup.group.silent = maModel.get('silent') || seriesModel.get('silent');
    }
});

/**
 * @inner
 * @param {module:echarts/coord/*} coordSys
 * @param {module:echarts/model/Series} seriesModel
 * @param {module:echarts/model/Model} mpModel
 */
function createList(coordSys, seriesModel, maModel) {

    var coordDimsInfos;
    var areaData;
    var dims = ['x0', 'y0', 'x1', 'y1'];
    if (coordSys) {
        coordDimsInfos = zrUtil.map(coordSys && coordSys.dimensions, function (coordDim) {
            var data = seriesModel.getData();
            var info = data.getDimensionInfo(
                data.mapDimension(coordDim)
            ) || {};
            // In map series data don't have lng and lat dimension. Fallback to same with coordSys
            return zrUtil.defaults({name: coordDim}, info);
        });
        areaData = new List(zrUtil.map(dims, function (dim, idx) {
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

    var optData = zrUtil.map(maModel.get('data'), zrUtil.curry(
        markAreaTransform, seriesModel, coordSys, maModel
    ));
    if (coordSys) {
        optData = zrUtil.filter(
            optData, zrUtil.curry(markAreaFilter, coordSys)
        );
    }

    var dimValueGetter = coordSys ? function (item, dimName, dataIndex, dimIndex) {
        return item.coord[Math.floor(dimIndex / 2)][dimIndex % 2];
    } : function (item) {
        return item.value;
    };
    areaData.initData(optData, null, dimValueGetter);
    areaData.hasItemOption = true;
    return areaData;
}
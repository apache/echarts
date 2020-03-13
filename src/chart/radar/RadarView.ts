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

import * as graphic from '../../util/graphic';
import * as zrUtil from 'zrender/src/core/util';
import * as symbolUtil from '../../util/symbol';
import ChartView from '../../view/Chart';
import RadarSeriesModel, { RadarSeriesDataItemOption } from './RadarSeries';
import ExtensionAPI from '../../ExtensionAPI';
import List from '../../data/List';
import { ZRColor, DisplayState, ECElement } from '../../util/types';
import GlobalModel from '../../model/Global';

function normalizeSymbolSize(symbolSize: number | number[]) {
    if (!zrUtil.isArray(symbolSize)) {
        symbolSize = [+symbolSize, +symbolSize];
    }
    return symbolSize;
}

type RadarSymbol = ReturnType<typeof symbolUtil.createSymbol> & {
    __dimIdx: number
}

class RadarView extends ChartView {
    static type = 'radar'
    type = RadarView.type

    private _data: List<RadarSeriesModel>

    render(seriesModel: RadarSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        var polar = seriesModel.coordinateSystem;
        var group = this.group;

        var data = seriesModel.getData();
        var oldData = this._data;

        function createSymbol(data: List<RadarSeriesModel>, idx: number) {
            var symbolType = data.getItemVisual(idx, 'symbol') as string || 'circle';
            var color = data.getItemVisual(idx, 'color') as ZRColor;
            if (symbolType === 'none') {
                return;
            }
            var symbolSize = normalizeSymbolSize(
                data.getItemVisual(idx, 'symbolSize')
            );
            var symbolPath = symbolUtil.createSymbol(
                symbolType, -1, -1, 2, 2, color
            );
            symbolPath.attr({
                style: {
                    strokeNoScale: true
                },
                z2: 100,
                scale: [symbolSize[0] / 2, symbolSize[1] / 2]
            });
            return symbolPath as RadarSymbol;
        }

        function updateSymbols(
            oldPoints: number[][],
            newPoints: number[][],
            symbolGroup: graphic.Group,
            data: List<RadarSeriesModel>,
            idx: number,
            isInit?: boolean
        ) {
            // Simply rerender all
            symbolGroup.removeAll();
            for (var i = 0; i < newPoints.length - 1; i++) {
                var symbolPath = createSymbol(data, idx);
                if (symbolPath) {
                    symbolPath.__dimIdx = i;
                    if (oldPoints[i]) {
                        symbolPath.attr('position', oldPoints[i]);
                        graphic[isInit ? 'initProps' : 'updateProps'](
                            symbolPath, {
                                position: newPoints[i]
                            }, seriesModel, idx
                        );
                    }
                    else {
                        symbolPath.attr('position', newPoints[i]);
                    }
                    symbolGroup.add(symbolPath);
                }
            }
        }

        function getInitialPoints(points: number[][]) {
            return zrUtil.map(points, function (pt) {
                return [polar.cx, polar.cy];
            });
        }
        data.diff(oldData)
            .add(function (idx) {
                var points = data.getItemLayout(idx);
                if (!points) {
                    return;
                }
                var polygon = new graphic.Polygon();
                var polyline = new graphic.Polyline();
                var target = {
                    shape: {
                        points: points
                    }
                };

                polygon.shape.points = getInitialPoints(points);
                polyline.shape.points = getInitialPoints(points);
                graphic.initProps(polygon, target, seriesModel, idx);
                graphic.initProps(polyline, target, seriesModel, idx);

                var itemGroup = new graphic.Group();
                var symbolGroup = new graphic.Group();
                itemGroup.add(polyline);
                itemGroup.add(polygon);
                itemGroup.add(symbolGroup);

                updateSymbols(
                    polyline.shape.points, points, symbolGroup, data, idx, true
                );

                data.setItemGraphicEl(idx, itemGroup);
            })
            .update(function (newIdx, oldIdx) {
                var itemGroup = oldData.getItemGraphicEl(oldIdx) as graphic.Group;
                var polyline = itemGroup.childAt(0) as graphic.Polyline;
                var polygon = itemGroup.childAt(1) as graphic.Polygon;
                var symbolGroup = itemGroup.childAt(2) as graphic.Group;
                var target = {
                    shape: {
                        points: data.getItemLayout(newIdx)
                    }
                };

                if (!target.shape.points) {
                    return;
                }
                updateSymbols(
                    polyline.shape.points,
                    target.shape.points,
                    symbolGroup,
                    data,
                    newIdx,
                    false
                );

                graphic.updateProps(polyline, target, seriesModel);
                graphic.updateProps(polygon, target, seriesModel);

                data.setItemGraphicEl(newIdx, itemGroup);
            })
            .remove(function (idx) {
                group.remove(oldData.getItemGraphicEl(idx));
            })
            .execute();

        data.eachItemGraphicEl(function (itemGroup: graphic.Group, idx) {
            var itemModel = data.getItemModel<RadarSeriesDataItemOption>(idx);
            var polyline = itemGroup.childAt(0) as graphic.Polyline;
            var polygon = itemGroup.childAt(1) as graphic.Polygon;
            var symbolGroup = itemGroup.childAt(2) as graphic.Group;
            var color = data.getItemVisual(idx, 'color');

            group.add(itemGroup);

            polyline.useStyle(
                zrUtil.defaults(
                    itemModel.getModel('lineStyle').getLineStyle(),
                    {
                        fill: 'none',
                        stroke: color
                    }
                )
            );
            polyline.hoverStyle = itemModel.getModel(['emphasis', 'lineStyle']).getLineStyle();

            var areaStyleModel = itemModel.getModel('areaStyle');
            var hoverAreaStyleModel = itemModel.getModel(['emphasis', 'areaStyle']);
            var polygonIgnore = areaStyleModel.isEmpty() && areaStyleModel.parentModel.isEmpty();
            var hoverPolygonIgnore = hoverAreaStyleModel.isEmpty() && hoverAreaStyleModel.parentModel.isEmpty();

            hoverPolygonIgnore = hoverPolygonIgnore && polygonIgnore;
            polygon.ignore = polygonIgnore;

            polygon.useStyle(
                zrUtil.defaults(
                    areaStyleModel.getAreaStyle(),
                    {
                        fill: color,
                        opacity: 0.7
                    }
                )
            );
            polygon.hoverStyle = hoverAreaStyleModel.getAreaStyle();

            var itemStyle = itemModel.getModel('itemStyle').getItemStyle(['color']);
            var itemHoverStyle = itemModel.getModel(['emphasis', 'itemStyle']).getItemStyle();
            var labelModel = itemModel.getModel('label');
            var labelHoverModel = itemModel.getModel(['emphasis', 'label']);
            symbolGroup.eachChild(function (symbolPath: RadarSymbol) {
                symbolPath.setStyle(itemStyle);
                symbolPath.hoverStyle = zrUtil.clone(itemHoverStyle);
                var defaultText = data.get(data.dimensions[symbolPath.__dimIdx], idx);
                (defaultText == null || isNaN(defaultText as number)) && (defaultText = '');

                graphic.setLabelStyle(
                    symbolPath.style, symbolPath.hoverStyle, labelModel, labelHoverModel,
                    {
                        labelFetcher: data.hostModel,
                        labelDataIndex: idx,
                        labelDimIndex: symbolPath.__dimIdx,
                        defaultText: defaultText + '',
                        autoColor: color,
                        isRectText: true
                    }
                );
            });

            (itemGroup as ECElement).highDownOnUpdate = function (fromState: DisplayState, toState: DisplayState) {
                polygon.attr('ignore', toState === 'emphasis' ? hoverPolygonIgnore : polygonIgnore);
            };
            graphic.setHoverStyle(itemGroup);
        });

        this._data = data;
    }

    remove() {
        this.group.removeAll();
        this._data = null;
    }
}

ChartView.registerClass(RadarView);
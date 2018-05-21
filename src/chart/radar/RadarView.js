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

import * as echarts from '../../echarts';
import * as graphic from '../../util/graphic';
import * as zrUtil from 'zrender/src/core/util';
import * as symbolUtil from '../../util/symbol';

function normalizeSymbolSize(symbolSize) {
    if (!zrUtil.isArray(symbolSize)) {
        symbolSize = [+symbolSize, +symbolSize];
    }
    return symbolSize;
}

export default echarts.extendChartView({

    type: 'radar',

    render: function (seriesModel, ecModel, api) {
        var polar = seriesModel.coordinateSystem;
        var group = this.group;

        var data = seriesModel.getData();
        var oldData = this._data;

        function createSymbol(data, idx) {
            var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
            var color = data.getItemVisual(idx, 'color');
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
            return symbolPath;
        }

        function updateSymbols(oldPoints, newPoints, symbolGroup, data, idx, isInit) {
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

        function getInitialPoints(points) {
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
                var itemGroup = oldData.getItemGraphicEl(oldIdx);
                var polyline = itemGroup.childAt(0);
                var polygon = itemGroup.childAt(1);
                var symbolGroup = itemGroup.childAt(2);
                var target = {
                    shape: {
                        points: data.getItemLayout(newIdx)
                    }
                };
                if (!target.shape.points) {
                    return;
                }
                updateSymbols(
                    polyline.shape.points, target.shape.points, symbolGroup, data, newIdx, false
                );

                graphic.updateProps(polyline, target, seriesModel);
                graphic.updateProps(polygon, target, seriesModel);

                data.setItemGraphicEl(newIdx, itemGroup);
            })
            .remove(function (idx) {
                group.remove(oldData.getItemGraphicEl(idx));
            })
            .execute();

        data.eachItemGraphicEl(function (itemGroup, idx) {
            var itemModel = data.getItemModel(idx);
            var polyline = itemGroup.childAt(0);
            var polygon = itemGroup.childAt(1);
            var symbolGroup = itemGroup.childAt(2);
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
            polyline.hoverStyle = itemModel.getModel('emphasis.lineStyle').getLineStyle();

            var areaStyleModel = itemModel.getModel('areaStyle');
            var hoverAreaStyleModel = itemModel.getModel('emphasis.areaStyle');
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
            var itemHoverStyle = itemModel.getModel('emphasis.itemStyle').getItemStyle();
            var labelModel = itemModel.getModel('label');
            var labelHoverModel = itemModel.getModel('emphasis.label');
            symbolGroup.eachChild(function (symbolPath) {
                symbolPath.setStyle(itemStyle);
                symbolPath.hoverStyle = zrUtil.clone(itemHoverStyle);

                graphic.setLabelStyle(
                    symbolPath.style, symbolPath.hoverStyle, labelModel, labelHoverModel,
                    {
                        labelFetcher: data.hostModel,
                        labelDataIndex: idx,
                        labelDimIndex: symbolPath.__dimIdx,
                        defaultText: data.get(data.dimensions[symbolPath.__dimIdx], idx),
                        autoColor: color,
                        isRectText: true
                    }
                );
            });

            function onEmphasis() {
                polygon.attr('ignore', hoverPolygonIgnore);
            }

            function onNormal() {
                polygon.attr('ignore', polygonIgnore);
            }

            itemGroup.off('mouseover').off('mouseout').off('normal').off('emphasis');
            itemGroup.on('emphasis', onEmphasis)
                .on('mouseover', onEmphasis)
                .on('normal', onNormal)
                .on('mouseout', onNormal);

            graphic.setHoverStyle(itemGroup);
        });

        this._data = data;
    },

    remove: function () {
        this.group.removeAll();
        this._data = null;
    },

    dispose: function () {}
});
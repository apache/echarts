define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');

    function normalizeSymbolSize(symbolSize) {
        if (!zrUtil.isArray(symbolSize)) {
            symbolSize = [+symbolSize, +symbolSize];
        }
        return symbolSize;
    }
    return require('../../echarts').extendChartView({
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
                var symbolPath = symbolUtil.createSymbol(
                    symbolType, -0.5, -0.5, 1, 1, color
                );
                symbolPath.attr({
                    style: {
                        strokeNoScale: true
                    },
                    z2: 100,
                    scale: normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'))
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
                                }, seriesModel
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
                    graphic.initProps(polygon, target, seriesModel);
                    graphic.initProps(polyline, target, seriesModel);

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

                polyline.setStyle(
                    zrUtil.extend(
                        itemModel.getModel('lineStyle.normal').getLineStyle(),
                        {
                            stroke: color
                        }
                    )
                );
                polyline.hoverStyle = itemModel.getModel('lineStyle.emphasis').getLineStyle();

                var areaStyleModel = itemModel.getModel('areaStyle.normal');
                var hoverAreaStyleModel = itemModel.getModel('areaStyle.emphasis');
                var polygonIgnore = areaStyleModel.isEmpty() && areaStyleModel.parentModel.isEmpty();
                var hoverPolygonIgnore = hoverAreaStyleModel.isEmpty() && hoverAreaStyleModel.parentModel.isEmpty();

                hoverPolygonIgnore = hoverPolygonIgnore && polygonIgnore;
                polygon.ignore = polygonIgnore;

                polygon.setStyle(
                    zrUtil.defaults(
                        areaStyleModel.getAreaStyle(),
                        {
                            fill: color,
                            opacity: 0.7
                        }
                    )
                );
                polygon.hoverStyle = hoverAreaStyleModel.getAreaStyle();

                var itemStyle = itemModel.getModel('itemStyle.normal').getItemStyle(['color']);
                var itemHoverStyle = itemModel.getModel('itemStyle.emphasis').getItemStyle();
                var labelModel = itemModel.getModel('label.normal');
                var labelHoverModel = itemModel.getModel('label.emphasis');
                symbolGroup.eachChild(function (symbolPath) {
                    symbolPath.setStyle(itemStyle);
                    symbolPath.hoverStyle = zrUtil.clone(itemHoverStyle);

                    var defaultText = data.get(data.dimensions[symbolPath.__dimIdx], idx);
                    graphic.setText(symbolPath.style, labelModel, color);
                    symbolPath.setStyle({
                        text: labelModel.get('show') ? zrUtil.retrieve(
                            seriesModel.getFormattedLabel(
                                idx, 'normal', null, symbolPath.__dimIdx
                            ),
                            defaultText
                        ) : ''
                    });

                    graphic.setText(symbolPath.hoverStyle, labelHoverModel, color);
                    symbolPath.hoverStyle.text = labelHoverModel.get('show') ? zrUtil.retrieve(
                        seriesModel.getFormattedLabel(
                            idx, 'emphasis', null, symbolPath.__dimIdx
                        ),
                        defaultText
                    ) : '';
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
        }
    });
});
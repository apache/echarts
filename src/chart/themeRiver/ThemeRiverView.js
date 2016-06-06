define(function (require) {

    var poly = require('../line/poly');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var DataDiffer = require('../../data/DataDiffer');

    return require('../../echarts').extendChartView({

        type: 'themeRiver',

        init: function () {
            this._layers = [];
        },

        render: function (seriesModel, ecModel, api) {
            var data = seriesModel.getData();
            var rawData = seriesModel.getRawData();

            if (!data.count()) {
                return;
            }

            var group = this.group;

            var layerSeries = seriesModel.getLayerSeries();

            var layoutInfo = data.getLayout('layoutInfo');
            var rect = layoutInfo.rect;
            var boundaryGap = layoutInfo.boundaryGap;

            group.attr('position', [0, rect.y + boundaryGap[0]]);

            function keyGetter(item) {
                return item.name;
            }
            var dataDiffer = new DataDiffer(
                this._layersSeries || [], layerSeries,
                keyGetter, keyGetter
            );

            var newLayersGroups = {};

            dataDiffer.add(zrUtil.bind(zrUtil.curry(process, 'add'), this))
                .update(zrUtil.bind(zrUtil.curry(process, 'update'), this))
                .remove(zrUtil.bind(zrUtil.curry(process, 'remove'), this))
                .execute();

            function process(status, idx, oldIdx) {
                var oldLayersGroups = this._layers;
                if (status === 'remove') {
                    group.remove(oldLayersGroups[idx]);
                    return;
                }
                var points0 = [];
                var points1 = [];
                var color;
                var indices = layerSeries[idx].indices;
                for (var j = 0; j < indices.length; j++) {
                    var layout = data.getItemLayout(indices[j]);
                    var x = layout.x;
                    var y0 = layout.y0;
                    var y = layout.y;

                    points0.push([x, y0]);
                    points1.push([x, y0 + y]);

                    color = rawData.getItemVisual(
                        data.getRawIndex(indices[j]), 'color'
                    );
                }

                var polygon;
                var text;
                var textLayout = data.getItemLayout(indices[0]);
                var itemModel = data.getItemModel(indices[j - 1]);
                var labelModel = itemModel.getModel('label.normal');
                var margin = labelModel.get('margin');
                if (status === 'add') {
                    var layerGroup = newLayersGroups[idx] = new graphic.Group();
                    polygon = new poly.Polygon({
                        shape: {
                            points: points0,
                            stackedOnPoints: points1,
                            smooth: 0.4,
                            stackedOnSmooth: 0.4,
                            smoothConstraint: false
                        },
                        z2: 0
                    });
                    text = new graphic.Text({
                        style: {
                            x: textLayout.x - margin,
                            y: textLayout.y0 + textLayout.y / 2
                        }
                    });
                    layerGroup.add(polygon);
                    layerGroup.add(text);
                    group.add(layerGroup);

                    polygon.setClipPath(createGridClipShape(polygon.getBoundingRect(), seriesModel, function () {
                        polygon.removeClipPath();
                    }));
                }
                else {
                    var layerGroup = oldLayersGroups[oldIdx];
                    polygon = layerGroup.childAt(0);
                    text = layerGroup.childAt(1);
                    group.add(layerGroup);

                    newLayersGroups[idx] = layerGroup;

                    graphic.updateProps(polygon, {
                        shape: {
                            points: points0,
                            stackedOnPoints: points1
                        }
                    }, seriesModel);

                    graphic.updateProps(text, {
                        style: {
                            x: textLayout.x - margin,
                            y: textLayout.y0 + textLayout.y / 2
                        }
                    }, seriesModel);
                }

                var hoverItemStyleModel = itemModel.getModel('itemStyle.emphasis');
                var itemStyleModel = itemModel.getModel('itemStyle.nomral');
                var textStyleModel = labelModel.getModel('textStyle');

                text.setStyle({
                    text: labelModel.get('show')
                        ? seriesModel.getFormattedLabel(indices[j - 1], 'normal')
                            || data.getName(indices[j - 1])
                        : '',
                    textFont: textStyleModel.getFont(),
                    textAlign: labelModel.get('textAlign'),
                    textVerticalAlign: 'middle'
                });

                polygon.setStyle(zrUtil.extend({
                    fill: color
                }, itemStyleModel.getItemStyle(['color'])));

                graphic.setHoverStyle(polygon, hoverItemStyleModel.getItemStyle());
            }

            this._layersSeries = layerSeries;
            this._layers = newLayersGroups;
        }
    });

    //add animation to the view
    function createGridClipShape(rect, seriesModel, cb) {
        var rectEl = new graphic.Rect({
            shape: {
                x: rect.x - 10,
                y: rect.y - 10,
                width: 0,
                height: rect.height + 20
            }
        });
        graphic.initProps(rectEl, {
            shape: {
                width: rect.width + 20,
                height: rect.height + 20
            }
        }, seriesModel, cb);

        return rectEl;
    }

});

define(function (require) {

    var SymbolDraw = require('../helper/SymbolDraw');
    var LineDraw = require('../helper/LineDraw');
    var RoamController = require('../../component/helper/RoamController');

    var modelUtil = require('../../util/model');
    var graphic = require('../../util/graphic');

    require('../../echarts').extendChartView({

        type: 'graph',

        init: function (ecModel, api) {
            var symbolDraw = new SymbolDraw();
            var lineDraw = new LineDraw();
            var group = this.group;

            var controller = new RoamController(api.getZr(), group);

            group.add(symbolDraw.group);
            group.add(lineDraw.group);

            this._symbolDraw = symbolDraw;
            this._lineDraw = lineDraw;
            this._controller = controller;

            this._firstRender = true;
        },

        render: function (seriesModel, ecModel, api) {
            var coordSys = seriesModel.coordinateSystem;
            // Only support view and geo coordinate system
            if (coordSys.type !== 'geo' && coordSys.type !== 'view') {
                return;
            }

            var data = seriesModel.getData();
            this._model = seriesModel;

            var symbolDraw = this._symbolDraw;
            var lineDraw = this._lineDraw;

            symbolDraw.updateData(data);

            var edgeData = data.graph.edgeData;
            var rawOption = seriesModel.option;
            var formatModel = modelUtil.createDataFormatModel(
                seriesModel, edgeData, rawOption.edges || rawOption.links
            );
            formatModel.formatTooltip = function (dataIndex) {
                var params = this.getDataParams(dataIndex);
                var edge = data.graph.getEdgeByIndex(dataIndex);
                var sourceName = data.getName(edge.node1.dataIndex);
                var targetName = data.getName(edge.node2.dataIndex);
                var html = sourceName + ' > ' + targetName;
                if (params.value) {
                    html += ' : ' + params.value;
                }
                return html;
            };

            lineDraw.updateData(edgeData, null, null);
            edgeData.eachItemGraphicEl(function (el) {
                el.traverse(function (child) {
                    child.dataModel = formatModel;
                });
            });

            // Save the original lineWidth
            // data.graph.eachEdge(function (edge) {
            //     edge.__lineWidth = edge.getModel('lineStyle.normal').get('width');
            // });

            var group = this.group;
            var groupNewProp = {
                position: coordSys.position,
                scale: coordSys.scale
            };
            if (this._firstRender) {
                group.attr(groupNewProp);
            }
            else {
                graphic.updateProps(group, groupNewProp, seriesModel);
            }

            this._nodeScaleRatio = seriesModel.get('nodeScaleRatio');
            // this._edgeScaleRatio = seriesModel.get('edgeScaleRatio');

            this._updateNodeAndLinkScale();

            this._updateController(seriesModel, coordSys, api);

            clearTimeout(this._layoutTimeout);
            var forceLayout = seriesModel.forceLayout;
            var layoutAnimation = seriesModel.get('force.layoutAnimation');
            if (forceLayout) {
                this._startForceLayoutIteration(forceLayout, layoutAnimation);
            }
            // Update draggable
            data.eachItemGraphicEl(function (el, idx) {
                var draggable = data.getItemModel(idx).get('draggable');
                if (draggable && forceLayout) {
                    el.on('drag', function () {
                        forceLayout.warmUp();
                        !this._layouting
                            && this._startForceLayoutIteration(forceLayout, layoutAnimation);
                        forceLayout.setFixed(idx);
                        // Write position back to layout
                        data.setItemLayout(idx, el.position);
                    }, this).on('dragend', function () {
                        forceLayout.setUnfixed(idx);
                    }, this);
                }
                else {
                    el.off('drag');
                }
                el.setDraggable(draggable);
            }, this);

            this._firstRender = false;
        },

        _startForceLayoutIteration: function (forceLayout, layoutAnimation) {
            var self = this;
            (function step() {
                forceLayout.step(function (stopped) {
                    self.updateLayout();
                    (self._layouting = !stopped) && (
                        layoutAnimation
                            ? (self._layoutTimeout = setTimeout(step, 16))
                            : step()
                    );
                });
            })();
        },

        _updateController: function (seriesModel, coordSys, api) {
            var controller = this._controller;
            controller.rect = coordSys.getViewRect();

            controller.enable(seriesModel.get('roam'));

            controller
                .off('pan')
                .off('zoom')
                .on('pan', function (dx, dy) {
                    api.dispatchAction({
                        seriesId: seriesModel.id,
                        type: 'graphRoam',
                        dx: dx,
                        dy: dy
                    });
                })
                .on('zoom', function (zoom, mouseX, mouseY) {
                    api.dispatchAction({
                        seriesId: seriesModel.id,
                        type: 'graphRoam',
                        zoom:  zoom,
                        originX: mouseX,
                        originY: mouseY
                    });
                })
                .on('zoom', this._updateNodeAndLinkScale, this);
        },

        _updateNodeAndLinkScale: function () {
            var seriesModel = this._model;
            var data = seriesModel.getData();

            var group = this.group;
            var nodeScaleRatio = this._nodeScaleRatio;
            // var edgeScaleRatio = this._edgeScaleRatio;

            // Assume scale aspect is 1
            var groupScale = group.scale[0];

            var nodeScale = (groupScale - 1) * nodeScaleRatio + 1;
            // var edgeScale = (groupScale - 1) * edgeScaleRatio + 1;
            var invScale = [
                nodeScale / groupScale,
                nodeScale / groupScale
            ];

            data.eachItemGraphicEl(function (el, idx) {
                el.attr('scale', invScale);
            });
            // data.graph.eachEdge(function (edge) {
            //     var lineGroup = edge.getGraphicEl();
            //     // FIXME
            //     lineGroup.childOfName('line').setStyle(
            //         'lineWidth',
            //         edge.__lineWidth * edgeScale / groupScale
            //     );
            // });
        },

        updateLayout: function (seriesModel, ecModel) {
            this._symbolDraw.updateLayout();
            this._lineDraw.updateLayout();
        },

        remove: function (ecModel, api) {
            this._symbolDraw && this._symbolDraw.remove();
            this._lineDraw && this._lineDraw.remove();
        }
    });
});
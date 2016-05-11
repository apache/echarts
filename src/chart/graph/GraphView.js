
define(function (require) {

    var SymbolDraw = require('../helper/SymbolDraw');
    var LineDraw = require('../helper/LineDraw');
    var RoamController = require('../../component/helper/RoamController');

    var graphic = require('../../util/graphic');
    var adjustEdge = require('./adjustEdge');

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
            // if (coordSys.type !== 'geo' && coordSys.type !== 'view') {
            //     return;
            // }

            this._model = seriesModel;
            this._nodeScaleRatio = seriesModel.get('nodeScaleRatio');

            var symbolDraw = this._symbolDraw;
            var lineDraw = this._lineDraw;

            var group = this.group;

            if (coordSys.type === 'view') {
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
            }
            // Fix edge contact point with node
            adjustEdge(seriesModel.getGraph(), this._getNodeGlobalScale(seriesModel));


            var data = seriesModel.getData();
            symbolDraw.updateData(data);

            var edgeData = seriesModel.getEdgeData();
            lineDraw.updateData(edgeData);

            this._updateNodeAndLinkScale();

            this._updateController(seriesModel, api);

            clearTimeout(this._layoutTimeout);
            var forceLayout = seriesModel.forceLayout;
            var layoutAnimation = seriesModel.get('force.layoutAnimation');
            if (forceLayout) {
                this._startForceLayoutIteration(forceLayout, layoutAnimation);
            }
            // Update draggable
            data.eachItemGraphicEl(function (el, idx) {
                var draggable = data.getItemModel(idx).get('draggable');
                if (draggable) {
                    el.on('drag', function () {
                        if (forceLayout) {
                            forceLayout.warmUp();
                            !this._layouting
                                && this._startForceLayoutIteration(forceLayout, layoutAnimation);
                            forceLayout.setFixed(idx);
                            // Write position back to layout
                            data.setItemLayout(idx, el.position);
                        }
                    }, this).on('dragend', function () {
                        if (forceLayout) {
                            forceLayout.setUnfixed(idx);
                        }
                    }, this);
                }
                else {
                    el.off('drag');
                }
                el.setDraggable(draggable && forceLayout);
            }, this);

            this._firstRender = false;
        },

        _startForceLayoutIteration: function (forceLayout, layoutAnimation) {
            var self = this;
            (function step() {
                forceLayout.step(function (stopped) {
                    self.updateLayout(self._model);
                    (self._layouting = !stopped) && (
                        layoutAnimation
                            ? (self._layoutTimeout = setTimeout(step, 16))
                            : step()
                    );
                });
            })();
        },

        _updateController: function (seriesModel, api) {
            var controller = this._controller;
            var group = this.group;
            controller.rectProvider = function () {
                var rect = group.getBoundingRect();
                rect.applyTransform(group.transform);
                return rect;
            };
            if (seriesModel.coordinateSystem.type !== 'view') {
                controller.disable();
                return;
            }
            controller.enable(seriesModel.get('roam'));
            controller.zoomLimit = seriesModel.get('scaleLimit');
            // Update zoom from model
            controller.zoom = seriesModel.coordinateSystem.getZoom();

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
                    this._updateNodeAndLinkScale();
                    adjustEdge(seriesModel.getGraph(), this._getNodeGlobalScale(seriesModel));
                    this._lineDraw.updateLayout();
                }, this);
        },

        _updateNodeAndLinkScale: function () {
            var seriesModel = this._model;
            var data = seriesModel.getData();

            var nodeScale = this._getNodeGlobalScale(seriesModel);
            var invScale = [nodeScale, nodeScale];

            data.eachItemGraphicEl(function (el, idx) {
                el.attr('scale', invScale);
            });
        },

        _getNodeGlobalScale: function (seriesModel) {
            var coordSys = seriesModel.coordinateSystem;
            if (coordSys.type !== 'view') {
                return 1;
            }

            var nodeScaleRatio = this._nodeScaleRatio;

            var groupScale = this.group.scale;
            var groupZoom = (groupScale && groupScale[0]) || 1;
            // Scale node when zoom changes
            var roamZoom = coordSys.getZoom();
            var nodeScale = (roamZoom - 1) * nodeScaleRatio + 1;

            return nodeScale / groupZoom;
        },

        updateLayout: function (seriesModel) {
            this._symbolDraw.updateLayout();
            this._lineDraw.updateLayout();

            adjustEdge(seriesModel.getGraph(), this._getNodeGlobalScale(seriesModel));
        },

        remove: function (ecModel, api) {
            this._symbolDraw && this._symbolDraw.remove();
            this._lineDraw && this._lineDraw.remove();
        }
    });
});
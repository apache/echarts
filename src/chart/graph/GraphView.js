
define(function (require) {

    var SymbolDraw = require('../helper/SymbolDraw');
    var LineDraw = require('../helper/LineDraw');
    var RoamController = require('../../component/helper/RoamController');
    var roamHelper = require('../../component/helper/roamHelper');
    var cursorHelper = require('../../component/helper/cursorHelper');

    var graphic = require('../../util/graphic');
    var adjustEdge = require('./adjustEdge');
    var zrUtil = require('zrender/core/util');

    var nodeOpacityPath = ['itemStyle', 'normal', 'opacity'];
    var lineOpacityPath = ['lineStyle', 'normal', 'opacity'];

    function getItemOpacity(item, opacityPath) {
        return item.getVisual('opacity') || item.getModel().get(opacityPath);
    }

    function fadeOutItem(item, opacityPath, opacityRatio) {
        var el = item.getGraphicEl();

        var opacity = getItemOpacity(item, opacityPath);
        if (opacityRatio != null) {
            opacity == null && (opacity = 1);
            opacity *= opacityRatio;
        }

        el.downplay && el.downplay();
        el.traverse(function (child) {
            if (child.type !== 'group') {
                child.setStyle('opacity', opacity);
            }
        });
    }

    function fadeInItem(item, opacityPath) {
        var opacity = getItemOpacity(item, opacityPath);
        var el = item.getGraphicEl();

        el.highlight && el.highlight();
        el.traverse(function (child) {
            if (child.type !== 'group') {
                child.setStyle('opacity', opacity);
            }
        });
    }

    require('../../echarts').extendChartView({

        type: 'graph',

        init: function (ecModel, api) {
            var symbolDraw = new SymbolDraw();
            var lineDraw = new LineDraw();
            var group = this.group;

            this._controller = new RoamController(api.getZr());
            this._controllerHost = {target: group};

            group.add(symbolDraw.group);
            group.add(lineDraw.group);

            this._symbolDraw = symbolDraw;
            this._lineDraw = lineDraw;

            this._firstRender = true;
        },

        render: function (seriesModel, ecModel, api) {
            var coordSys = seriesModel.coordinateSystem;

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

            this._updateController(seriesModel, ecModel, api);

            clearTimeout(this._layoutTimeout);
            var forceLayout = seriesModel.forceLayout;
            var layoutAnimation = seriesModel.get('force.layoutAnimation');
            if (forceLayout) {
                this._startForceLayoutIteration(forceLayout, layoutAnimation);
            }
            data.eachItemGraphicEl(function (el, idx) {
                var itemModel = data.getItemModel(idx);
                // Update draggable
                el.off('drag').off('dragend');
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
                el.setDraggable(draggable && forceLayout);

                el.off('mouseover', el.__focusNodeAdjacency);
                el.off('mouseout', el.__unfocusNodeAdjacency);

                if (itemModel.get('focusNodeAdjacency')) {
                    el.on('mouseover', el.__focusNodeAdjacency = function () {
                        api.dispatchAction({
                            type: 'focusNodeAdjacency',
                            seriesId: seriesModel.id,
                            dataIndex: el.dataIndex
                        });
                    });
                    el.on('mouseout', el.__unfocusNodeAdjacency = function () {
                        api.dispatchAction({
                            type: 'unfocusNodeAdjacency',
                            seriesId: seriesModel.id
                        });
                    });
                }

            }, this);

            var circularRotateLabel = seriesModel.get('layout') === 'circular'
                && seriesModel.get('circular.rotateLabel');
            var cx = data.getLayout('cx');
            var cy = data.getLayout('cy');
            data.eachItemGraphicEl(function (el, idx) {
                var symbolPath = el.getSymbolPath();
                if (circularRotateLabel) {
                    var pos = data.getItemLayout(idx);
                    var rad = Math.atan2(pos[1] - cy, pos[0] - cx);
                    if (rad < 0) {
                        rad = Math.PI * 2 + rad;
                    }
                    var isLeft = pos[0] < cx;
                    if (isLeft) {
                        rad = rad - Math.PI;
                    }
                    var textPosition = isLeft ? 'left' : 'right';
                    symbolPath.setStyle({
                        textRotation: -rad,
                        textPosition: textPosition,
                        textOrigin: 'center'
                    });
                    symbolPath.hoverStyle && (symbolPath.hoverStyle.textPosition = textPosition);
                }
                else {
                    symbolPath.setStyle({
                        textRotation: 0
                    });
                }
            });

            this._firstRender = false;
        },

        dispose: function () {
            this._controller && this._controller.dispose();
            this._controllerHost = {};
        },

        focusNodeAdjacency: function (seriesModel, ecModel, api, payload) {
            var data = this._model.getData();
            var dataIndex = payload.dataIndex;
            var el = data.getItemGraphicEl(dataIndex);

            if (!el) {
                return;
            }

            var graph = data.graph;
            var dataType = el.dataType;

            if (dataIndex !== null && dataType !== 'edge') {
                graph.eachNode(function (node) {
                    fadeOutItem(node, nodeOpacityPath, 0.1);
                });
                graph.eachEdge(function (edge) {
                    fadeOutItem(edge, lineOpacityPath, 0.1);
                });

                var node = graph.getNodeByIndex(dataIndex);
                fadeInItem(node, nodeOpacityPath);
                zrUtil.each(node.edges, function (edge) {
                    if (edge.dataIndex < 0) {
                        return;
                    }
                    fadeInItem(edge, lineOpacityPath);
                    fadeInItem(edge.node1, nodeOpacityPath);
                    fadeInItem(edge.node2, nodeOpacityPath);
                });
            }
        },

        unfocusNodeAdjacency: function (seriesModel, ecModel, api, payload) {
            var graph = this._model.getData().graph;

            graph.eachNode(function (node) {
                fadeOutItem(node, nodeOpacityPath);
            });
            graph.eachEdge(function (edge) {
                fadeOutItem(edge, lineOpacityPath);
            });
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

        _updateController: function (seriesModel, ecModel, api) {
            var controller = this._controller;
            var controllerHost = this._controllerHost;
            var group = this.group;

            controller.setPointerChecker(function (e, x, y) {
                var rect = group.getBoundingRect();
                rect.applyTransform(group.transform);
                return rect.contain(x, y)
                    && !cursorHelper.onIrrelevantElement(e, api, seriesModel);
            });

            if (seriesModel.coordinateSystem.type !== 'view') {
                controller.disable();
                return;
            }
            controller.enable(seriesModel.get('roam'));
            controllerHost.zoomLimit = seriesModel.get('scaleLimit');
            controllerHost.zoom = seriesModel.coordinateSystem.getZoom();

            controller
                .off('pan')
                .off('zoom')
                .on('pan', function (dx, dy) {
                    roamHelper.updateViewOnPan(controllerHost, dx, dy);
                    api.dispatchAction({
                        seriesId: seriesModel.id,
                        type: 'graphRoam',
                        dx: dx,
                        dy: dy
                    });
                })
                .on('zoom', function (zoom, mouseX, mouseY) {
                    roamHelper.updateViewOnZoom(controllerHost, zoom, mouseX, mouseY);
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

            var groupScale = coordSys.scale;
            var groupZoom = (groupScale && groupScale[0]) || 1;
            // Scale node when zoom changes
            var roamZoom = coordSys.getZoom();
            var nodeScale = (roamZoom - 1) * nodeScaleRatio + 1;

            return nodeScale / groupZoom;
        },

        updateLayout: function (seriesModel) {
            adjustEdge(seriesModel.getGraph(), this._getNodeGlobalScale(seriesModel));

            this._symbolDraw.updateLayout();
            this._lineDraw.updateLayout();
        },

        remove: function (ecModel, api) {
            this._symbolDraw && this._symbolDraw.remove();
            this._lineDraw && this._lineDraw.remove();
        }
    });
});
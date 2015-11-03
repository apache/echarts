
define(function (require) {

    var SymbolDraw = require('../helper/SymbolDraw');
    var LineDraw = require('../helper/LineDraw');
    var RoamController = require('../../component/helper/RoamController');

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

            symbolDraw.updateData(
                data, seriesModel, api, true
            );

            lineDraw.updateData(
                data.graph.edgeData,
                seriesModel, api, false
            );

            // Save the original lineWidth
            data.graph.eachEdge(function (edge) {
                edge.__lineWidth = edge.getModel('lineStyle.normal').get('width');
            });

            var group = this.group;
            group.attr({
                position: coordSys.position,
                scale: coordSys.scale
            });

            this._nodeScaleRatio = seriesModel.get('nodeScaleRatio');
            this._edgeScaleRatio = seriesModel.get('edgeScaleRatio');

            this._updateNodeAndLinkScale();

            var controller = this._controller;
            controller.rect = coordSys.getViewRect();

            controller.disable();
            seriesModel.get('roam') && controller.enable();

            controller
                .off('pan')
                .off('zoom')
                .on('pan', function (dx, dy) {
                    api.dispatch({
                        name: seriesModel.name,
                        type: 'graphRoam',
                        dx: dx,
                        dy: dy
                    });
                })
                .on('zoom', function (zoom, mouseX, mouseY) {
                    api.dispatch({
                        name: seriesModel.name,
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
            var edgeScaleRatio = this._edgeScaleRatio;

            // Assume scale aspect is 1
            var groupScale = group.scale[0];

            var nodeScale = (groupScale - 1) * nodeScaleRatio + 1;
            var edgeScale = (groupScale - 1) * edgeScaleRatio + 1;
            var invScale = [
                nodeScale / groupScale,
                nodeScale / groupScale
            ];

            data.eachItemGraphicEl(function (el, idx) {
                el.attr('scale', invScale);
            });

            data.graph.eachEdge(function (edge) {
                edge.getGraphicEl().setStyle(
                    'lineWidth',
                    edge.__lineWidth * edgeScale / groupScale
                );
            });
        },

        updateLayout: function (seriesModel, ecModel) {
            this._symbolDraw.updateLayout();
            this._lineDraw.updateLayout();
        },

        remove: function (ecModel, api) {
            this._symbolDraw.remove();
            this._lineDraw.remove();
        }
    });
});
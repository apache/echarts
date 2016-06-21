define(function(require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var each = zrUtil.each;

    var COORD_NAMES = ['geo', 'grid'];
    var PANEL_ID_SPLIT = '---';

    var helper = {};

    helper.convertCoordRanges = function (ecModel) {
        ecModel.eachComponent({mainType: 'brush'}, function (brushModel) {
            each(brushModel.brushRanges, function (brushRange) {
                each(COORD_NAMES, function (coordName) {
                    var coordIndex = brushRange[coordName + 'Index'];
                    var coordRange = brushRange[coordName + 'Range'];
                    var coordModel;
                    if (coordIndex >= 0
                        && coordRange
                        && (coordModel = ecModel.getComponent(coordName, coordIndex))
                    ) {
                        brushRange.range = coordConvert[brushRange.brushType](
                            'dataToPoint', coordModel.coordinateSystem, coordRange
                        );
                    }
                });
            });
        });
    };

    helper.setCoordRanges = function (brushRanges, ecModel) {
        each(brushRanges, function (brushRange) {
            var panelId = brushRange.panelId;
            if (panelId) {
                panelId = brushRange.panelId.split(PANEL_ID_SPLIT);
                var coordName = panelId[0];
                var coordIndex = +panelId[1];
                var coordModel = ecModel.getComponent(coordName, coordIndex);
                brushRange[coordName + 'Index'] = coordIndex;
                brushRange[coordName + 'Range'] = coordConvert[brushRange.brushType](
                    'pointToData', coordModel.coordinateSystem, brushRange.range
                );
            }
        });
    };

    helper.setPanelId = function (brushRanges) {
        each(brushRanges, function (brushRange) {
            each(COORD_NAMES, function (coordName) {
                var coordIndex = brushRange[coordName + 'Index'];
                if (coordIndex != null) {
                    brushRange.panelId = coordName + PANEL_ID_SPLIT + coordIndex;
                }
            });
        });
        return brushRanges;
    };

    helper.makePanelOpts = function (brushModel, ecModel) {
        var panelOpts = [];

        each(COORD_NAMES, function (coordName) {
            var coordIndices = brushModel.option[coordName + 'Index'];

            if (coordIndices == null) {
                return;
            }
            !zrUtil.isArray(coordIndices) && (coordIndices = [coordIndices]);

            zrUtil.each(coordIndices, function (coordIndex) {
                var coordModel = ecModel.getComponent(coordName, coordIndex);
                if (!coordModel) {
                    return;
                }
                var coordSys = coordModel.coordinateSystem;
                // FIXME
                // geo is getBoundingRect, grid is getRect.
                var r = (coordSys.getRect || coordSys.getBoundingRect).call(coordSys);
                var points = [
                    [r.x, r.y],
                    [r.x, r.y + r.height],
                    [r.x + r.width, r.y + r.height],
                    [r.x + r.width, r.y]
                ];

                var coordTransform = graphic.getTransform(coordSys);
                points = zrUtil.map(points, function (point) {
                    return graphic.applyTransform(point, coordTransform);
                });

                panelOpts.push({
                    panelId: coordName + PANEL_ID_SPLIT + coordIndex,
                    points: points
                });
            });
        });

        return panelOpts;
    };


    var coordConvert = {

        lineX: function (to, coordSys, coordRange) {
            return [
                coordSys[to]([coordRange[0], 0]),
                coordSys[to]([coordRange[1], 0])
            ];
        },

        lineY: function (to, coordSys, coordRange) {
            return [
                coordSys[to]([0, coordRange[0]]),
                coordSys[to]([0, coordRange[1]])
            ];
        },

        rect: function (to, coordSys, coordRange) {
            var xminymin = coordSys[to]([coordRange[0][0], coordRange[1][0]]);
            var xmaxymax = coordSys[to]([coordRange[0][1], coordRange[1][1]]);
            return [[xminymin[0], xmaxymax[0]], [xminymin[1], xmaxymax[1]]];
        },

        polygon: function (to, coordSys, coordRange) {
            return zrUtil.map(coordRange, coordSys[to], coordSys);
        }
    };

    return helper;

});
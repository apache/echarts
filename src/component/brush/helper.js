define(function(require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var each = zrUtil.each;

    var COMPONENT_NAMES = ['geo', 'xAxis', 'yAxis'];
    var PANEL_ID_SPLIT = '--';
    var COORD_CONVERTS = ['dataToPoint', 'pointToData'];

    var helper = {};

    helper.coordRangesToGlobal = function (ecModel) {
        ecModel.eachComponent({mainType: 'brush'}, function (brushModel) {
            each(brushModel.brushRanges, function (brushRange) {
                var has = false;
                each(COMPONENT_NAMES, function (componentName) {
                    var componentModel = findComponentModel(brushRange, componentName, ecModel);
                    var componentRange = brushRange[componentName + 'Range'];

                    if (__DEV__) {
                        if (componentModel && !componentRange) {
                            throw new Error(
                                componentName + 'Range must be specified when ' + componentName + 'Index specified'
                            );
                        }
                        if (has && componentModel) {
                            throw new Error('Only one coordinateSystem can be specified');
                        }
                    }

                    if (componentModel) {
                        has = true;
                        brushRange.range = coordConvert[brushRange.brushType](
                            0, componentModel.coordinateSystem, componentRange, componentModel
                        );
                    }
                });
            });
        });
    };

    helper.globalRangesToCoord = function (brushRanges, ecModel) {
        each(brushRanges, function (brushRange) {
            var panelId = brushRange.panelId;
            if (panelId) {
                panelId = brushRange.panelId.split(PANEL_ID_SPLIT);
                var componentName = panelId[0];
                var componentIndex = +panelId[1];
                var componentModel = ecModel.getComponent(componentName, componentIndex);
                brushRange[componentName + 'Index'] = componentIndex;
                brushRange[componentName + 'Range'] = coordConvert[brushRange.brushType](
                    1, componentModel.coordinateSystem, brushRange.range, componentModel
                );
            }
        });
    };

    helper.controlSeries = function (brushRange, seriesModel, ecModel) {
        // Check whether brushRange in bound in coord, and series do not belong to that coord.
        // If do not do this check, some brush (like lineX) will controll all axes.
        var isControl = 0;
        var hasDefinedCpt;
        each(COMPONENT_NAMES, function (componentName) {
            var componentIndex = brushRange[componentName + 'Index'];
            if (componentIndex >= 0) {
                hasDefinedCpt = true;
                var componentModel = findComponentModel(brushRange, componentName, ecModel);
                isControl |= componentModel.coordinateSystem === seriesModel.coordinateSystem;
            }
        });
        return !hasDefinedCpt || !!isControl;
    };

    helper.setPanelIdToRanges = function (brushRanges) {
        each(brushRanges, function (brushRange) {
            each(COMPONENT_NAMES, function (componentName) {
                var componentIndex = brushRange[componentName + 'Index'];
                if (componentIndex != null) {
                    brushRange.panelId = componentName + PANEL_ID_SPLIT + componentIndex;
                }
            });
        });
        return brushRanges;
    };

    helper.makePanelOpts = function (brushModel, ecModel) {
        var panelOpts = [];

        each(COMPONENT_NAMES, function (componentName) {
            var componentIndices = brushModel.option[componentName + 'Index'];

            if (componentIndices == null) {
                return;
            }
            if (componentIndices !== 'all' && !zrUtil.isArray(componentIndices)) {
                componentIndices = [componentIndices];
            }

            ecModel.eachComponent({mainType: componentName}, function (componentModel, index) {
                if (componentIndices !== 'all' && zrUtil.indexOf(componentIndices, index) < 0) {
                    return;
                }

                var coordSys = componentModel.coordinateSystem;
                var rect;

                // Enumerate different coord.
                if (componentName === 'geo') {
                // geo is getBoundingRect, grid is getRect.
                    rect = coordSys.getBoundingRect().clone();
                    // geo roam and zoom transform
                    rect.applyTransform(graphic.getTransform(coordSys));
                }
                else if (componentName === 'xAxis' || componentName === 'yAxis') {
                    rect = coordSys.grid.getRect().clone();
                    // grid is not Transformable.
                }
                else {
                    if (__DEV__) {
                        throw new Error('Not support: ' + componentName);
                    }
                }

                panelOpts.push({
                    panelId: componentName + PANEL_ID_SPLIT + index,
                    rect: rect
                });
            });
        });

        return panelOpts;
    };

    function findComponentModel(brushRange, componentName, ecModel) {
        var componentIndex = brushRange[componentName + 'Index'];
        return componentIndex >= 0 && ecModel.getComponent(componentName, componentIndex);
    }

    function formatMinMax(minMax) {
        minMax[0] > minMax[1] && minMax.reverse();
        return minMax;
    }

    function axisConvert(to, coordSys, coordRange, componentModel) {
        if (__DEV__) {
            zrUtil.assert(componentModel.axis, 'line brush is only available in cartesian (grid).');
        }
        var axis = componentModel.axis;

        return formatMinMax(zrUtil.map([0, 1], function (i) {
            return to
                ? axis.coordToData(axis.toLocalCoord(coordRange[i]))
                : axis.toGlobalCoord(axis.dataToCoord(coordRange[i]));
        }));
    }

    var coordConvert = {

        lineX: axisConvert,

        lineY: axisConvert,

        rect: function (to, coordSys, coordRange) {
            var xminymin = coordSys[COORD_CONVERTS[to]]([coordRange[0][0], coordRange[1][0]]);
            var xmaxymax = coordSys[COORD_CONVERTS[to]]([coordRange[0][1], coordRange[1][1]]);
            return [
                formatMinMax([xminymin[0], xmaxymax[0]]),
                formatMinMax([xminymin[1], xmaxymax[1]])
            ];
        },

        polygon: function (to, coordSys, coordRange) {
            return zrUtil.map(coordRange, coordSys[COORD_CONVERTS[to]], coordSys);
        }
    };

    return helper;

});
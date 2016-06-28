define(function(require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');

    var each = zrUtil.each;

    var helper = {};

    var COMPONENT_NAMES = ['geo', 'xAxis', 'yAxis'];
    var PANEL_ID_SPLIT = '--';
    var COORD_CONVERTS = ['dataToPoint', 'pointToData'];

    helper.parseOutputRanges = function (brushRanges, coordInfoList, ecModel, rangesCoordInfo) {
        each(brushRanges, function (brushRange, index) {
            var panelId = brushRange.panelId;

            if (panelId) {
                panelId = panelId.split(PANEL_ID_SPLIT);

                brushRange[panelId[0] + 'Index'] = +panelId[1];

                var coordInfo = findCoordInfo(brushRange, coordInfoList);
                brushRange.coordRange = coordConvert[brushRange.brushType](
                    1, coordInfo, brushRange.range
                );
                rangesCoordInfo && (rangesCoordInfo[index] = coordInfo);
            }
        });
    };

    helper.parseInputRanges = function (brushModel, ecModel) {
        each(brushModel.brushRanges, function (brushRange) {
            var coordInfo = findCoordInfo(brushRange, brushModel.coordInfoList);

            if (__DEV__) {
                zrUtil.assert(
                    !coordInfo || coordInfo === true || brushRange.coordRange,
                    'coordRange must be specified when coord index specified.'
                );
                zrUtil.assert(
                    !coordInfo || coordInfo !== true || brushRange.range,
                    'range must be specified.'
                );
            }

            brushRange.range = brushRange.range || [];

            // convert coordRange to global range and set panelId.
            if (coordInfo && coordInfo !== true) {
                brushRange.range = coordConvert[brushRange.brushType](
                    0, coordInfo, brushRange.coordRange
                );
                brushRange.panelId = coordInfo.panelId;
            }
        });
    };

    helper.makePanelOpts = function (coordInfoList) {
        var panelOpts = [];

        each(coordInfoList, function (coordInfo) {
            var coordSys = coordInfo.coordSys;
            var rect;

            if (coordInfo.geoIndex >= 0) {
                rect = coordSys.getBoundingRect().clone();
                // geo roam and zoom transform
                rect.applyTransform(graphic.getTransform(coordSys));
            }
            else { // xAxis or yAxis
                // grid is not Transformable.
                rect = coordSys.grid.getRect().clone();
            }

            panelOpts.push({panelId: coordInfo.panelId, rect: rect});
        });

        return panelOpts;
    };

    /**
     * @param {Object} option {xAxisIndex, yAxisIndex, geoIndex}
     * @param {module:echarts/model/Global} ecModel
     * @return {Array.<Obejct>} coordInfoList
     */
    helper.makeCoordInfoList = function (option, ecModel) {
        var coordInfoList = [];

        each(COMPONENT_NAMES, function (componentName) {
            var componentIndices = option[componentName + 'Index'];
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

                var grid;
                var coordSys;

                (componentName === 'xAxis' || componentName === 'yAxis')
                    ? (grid = componentModel.axis.grid)
                    : (coordSys = componentModel.coordinateSystem); // geo

                var coordInfo;

                // Check duplicate and find cartesian when tranval to yAxis.
                for (var i = 0, len = coordInfoList.length; i < len; i++) {
                    var cInfo = coordInfoList[i];
                    if (__DEV__) {
                        zrUtil.assert(
                            cInfo[componentName + 'Index'] != index,
                            'Coord should not be defined duplicately: ' + componentName + index
                        );
                    }
                    // CoordSys is always required for `rect brush` or `polygon brush`.
                    // If both xAxisIndex and yAxisIndex specified, fetch cartesian by them.
                    if (componentName === 'yAxis' && !cInfo.yAxis && cInfo.xAxis) {
                        var aCoordSys = grid.getCartesian(cInfo.xAxisIndex, index);
                        if (aCoordSys) { // The yAxis and xAxis are in the same cartesian.
                            coordSys = aCoordSys;
                            coordInfo = cInfo;
                            break;
                        }
                    }
                }

                !coordInfo && coordInfoList.push(coordInfo = {});

                coordInfo[componentName] = componentModel;
                coordInfo[componentName + 'Index'] = index;
                // If both xAxisIndex and yAxisIndex specified, panelId only use yAxisIndex,
                // which is enough to index panel.
                coordInfo.panelId = componentName + PANEL_ID_SPLIT + index;
                coordInfo.coordSys = coordSys
                    // If only xAxisIndex or only yAxisIndex specified, find its first cartesian.
                    || grid.getCartesian(coordInfo.xAxisIndex, coordInfo.yAxisIndex);

                coordInfo.coordSys
                    ? (coordInfoList[componentName + 'Has'] = true)
                    : coordInfoList.pop(); // If a coordInfo exists originally, existance of coordSys is ensured.
            });
        });

        return coordInfoList;
    };

    helper.controlSeries = function (brushRange, brushModel, seriesModel) {
        // Check whether brushRange is bound in coord, and series do not belong to that coord.
        // If do not do this check, some brush (like lineX) will controll all axes.
        var coordInfo = findCoordInfo(brushRange, brushModel.coordInfoList);
        return coordInfo === true || (coordInfo && coordInfo.coordSys === seriesModel.coordinateSystem);
    };

    function formatMinMax(minMax) {
        minMax[0] > minMax[1] && minMax.reverse();
        return minMax;
    }

    /**
     * If return Object, a coord found.
     * If reutrn true, global found.
     * Otherwise nothing found.
     *
     * @param {Object} brushRange {<componentName>Index}
     * @param {Array} coordInfoList
     * @return {Obejct|boolean}
     */
    function findCoordInfo(brushRange, coordInfoList) {
        var isGlobal = true;
        for (var j = 0; j < COMPONENT_NAMES.length; j++) {
            var indexAttr = COMPONENT_NAMES[j] + 'Index';
            if (brushRange[indexAttr] >= 0) {
                isGlobal = false;
                for (var i = 0; i < coordInfoList.length; i++) {
                    if (coordInfoList[i][indexAttr] === brushRange[indexAttr]) {
                        return coordInfoList[i];
                    }
                }
            }
        }
        return isGlobal;
    }

    function axisConvert(axisName, to, coordInfo, coordRange) {
        var axis = coordInfo.coordSys.getAxis(axisName);

        if (__DEV__) {
            zrUtil.assert(axis, 'line brush is only available in cartesian (grid).');
        }

        return formatMinMax(zrUtil.map([0, 1], function (i) {
            return to
                ? axis.coordToData(axis.toLocalCoord(coordRange[i]))
                : axis.toGlobalCoord(axis.dataToCoord(coordRange[i]));
        }));
    }

    var coordConvert = {

        lineX: zrUtil.curry(axisConvert, 'x'),

        lineY: zrUtil.curry(axisConvert, 'y'),

        rect: function (to, coordInfo, coordRange) {
            var coordSys = coordInfo.coordSys;
            var xminymin = coordSys[COORD_CONVERTS[to]]([coordRange[0][0], coordRange[1][0]]);
            var xmaxymax = coordSys[COORD_CONVERTS[to]]([coordRange[0][1], coordRange[1][1]]);
            return [
                formatMinMax([xminymin[0], xmaxymax[0]]),
                formatMinMax([xminymin[1], xmaxymax[1]])
            ];
        },

        polygon: function (to, coordInfo, coordRange) {
            var coordSys = coordInfo.coordSys;
            return zrUtil.map(coordRange, coordSys[COORD_CONVERTS[to]], coordSys);
        }
    };

    return helper;

});
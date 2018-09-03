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

/**
 * Grid is a region which contains at most 4 cartesian systems
 *
 * TODO Default cartesian
 */

import {__DEV__} from '../../config';
import {isObject, each, map, indexOf, retrieve} from 'zrender/src/core/util';
import {getLayoutRect} from '../../util/layout';
import {
    createScaleByModel,
    ifAxisCrossZero,
    niceScaleExtent,
    estimateLabelUnionRect
} from '../../coord/axisHelper';
import Cartesian2D from './Cartesian2D';
import Axis2D from './Axis2D';
import CoordinateSystem from '../../CoordinateSystem';
import {getStackedDimension} from '../../data/helper/dataStackHelper';

// Depends on GridModel, AxisModel, which performs preprocess.
import './GridModel';

/**
 * Check if the axis is used in the specified grid
 * @inner
 */
function isAxisUsedInTheGrid(axisModel, gridModel, ecModel) {
    return axisModel.getCoordSysModel() === gridModel;
}

function Grid(gridModel, ecModel, api) {
    /**
     * @type {Object.<string, module:echarts/coord/cartesian/Cartesian2D>}
     * @private
     */
    this._coordsMap = {};

    /**
     * @type {Array.<module:echarts/coord/cartesian/Cartesian>}
     * @private
     */
    this._coordsList = [];

    /**
     * @type {Object.<string, module:echarts/coord/cartesian/Axis2D>}
     * @private
     */
    this._axesMap = {};

    /**
     * @type {Array.<module:echarts/coord/cartesian/Axis2D>}
     * @private
     */
    this._axesList = [];

    this._initCartesian(gridModel, ecModel, api);

    this.model = gridModel;
}

var gridProto = Grid.prototype;

gridProto.type = 'grid';

gridProto.axisPointerEnabled = true;

gridProto.getRect = function () {
    return this._rect;
};

gridProto.update = function (ecModel, api) {

    var axesMap = this._axesMap;

    this._updateScale(ecModel, this.model);

    each(axesMap.x, function (xAxis) {
        niceScaleExtent(xAxis.scale, xAxis.model);
    });
    each(axesMap.y, function (yAxis) {
        niceScaleExtent(yAxis.scale, yAxis.model);
    });

    // Key: axisDim_axisIndex, value: boolean, whether onZero target.
    var onZeroRecords = {};

    each(axesMap.x, function (xAxis) {
        fixAxisOnZero(axesMap, 'y', xAxis, onZeroRecords);
    });
    each(axesMap.y, function (yAxis) {
        fixAxisOnZero(axesMap, 'x', yAxis, onZeroRecords);
    });

    // Resize again if containLabel is enabled
    // FIXME It may cause getting wrong grid size in data processing stage
    this.resize(this.model, api);
};

function fixAxisOnZero(axesMap, otherAxisDim, axis, onZeroRecords) {

    axis.getAxesOnZeroOf = function () {
        // TODO: onZero of multiple axes.
        return otherAxisOnZeroOf ? [otherAxisOnZeroOf] : [];
    };

    // onZero can not be enabled in these two situations:
    // 1. When any other axis is a category axis.
    // 2. When no axis is cross 0 point.
    var otherAxes = axesMap[otherAxisDim];

    var otherAxisOnZeroOf;
    var axisModel = axis.model;
    var onZero = axisModel.get('axisLine.onZero');
    var onZeroAxisIndex = axisModel.get('axisLine.onZeroAxisIndex');

    if (!onZero) {
        return;
    }

    // If target axis is specified.
    if (onZeroAxisIndex != null) {
        if (canOnZeroToAxis(otherAxes[onZeroAxisIndex])) {
            otherAxisOnZeroOf = otherAxes[onZeroAxisIndex];
        }
    }
    else {
        // Find the first available other axis.
        for (var idx in otherAxes) {
            if (otherAxes.hasOwnProperty(idx)
                && canOnZeroToAxis(otherAxes[idx])
                // Consider that two Y axes on one value axis,
                // if both onZero, the two Y axes overlap.
                && !onZeroRecords[getOnZeroRecordKey(otherAxes[idx])]
            ) {
                otherAxisOnZeroOf = otherAxes[idx];
                break;
            }
        }
    }

    if (otherAxisOnZeroOf) {
        onZeroRecords[getOnZeroRecordKey(otherAxisOnZeroOf)] = true;
    }

    function getOnZeroRecordKey(axis) {
        return axis.dim + '_' + axis.index;
    }
}

function canOnZeroToAxis(axis) {
    return axis && axis.type !== 'category' && axis.type !== 'time' && ifAxisCrossZero(axis);
}

/**
 * Resize the grid
 * @param {module:echarts/coord/cartesian/GridModel} gridModel
 * @param {module:echarts/ExtensionAPI} api
 */
gridProto.resize = function (gridModel, api, ignoreContainLabel) {

    var gridRect = getLayoutRect(
        gridModel.getBoxLayoutParams(), {
            width: api.getWidth(),
            height: api.getHeight()
        });

    this._rect = gridRect;

    var axesList = this._axesList;

    adjustAxes();

    // Minus label size
    if (!ignoreContainLabel && gridModel.get('containLabel')) {
        each(axesList, function (axis) {
            if (!axis.model.get('axisLabel.inside')) {
                var labelUnionRect = estimateLabelUnionRect(axis);
                if (labelUnionRect) {
                    var dim = axis.isHorizontal() ? 'height' : 'width';
                    var margin = axis.model.get('axisLabel.margin');
                    gridRect[dim] -= labelUnionRect[dim] + margin;
                    if (axis.position === 'top') {
                        gridRect.y += labelUnionRect.height + margin;
                    }
                    else if (axis.position === 'left') {
                        gridRect.x += labelUnionRect.width + margin;
                    }
                }
            }
        });

        adjustAxes();
    }

    function adjustAxes() {
        each(axesList, function (axis) {
            var isHorizontal = axis.isHorizontal();
            var extent = isHorizontal ? [0, gridRect.width] : [0, gridRect.height];
            var idx = axis.inverse ? 1 : 0;
            axis.setExtent(extent[idx], extent[1 - idx]);
            updateAxisTransform(axis, isHorizontal ? gridRect.x : gridRect.y);
        });
    }
};

/**
 * @param {string} axisType
 * @param {number} [axisIndex]
 */
gridProto.getAxis = function (axisType, axisIndex) {
    var axesMapOnDim = this._axesMap[axisType];
    if (axesMapOnDim != null) {
        if (axisIndex == null) {
            // Find first axis
            for (var name in axesMapOnDim) {
                if (axesMapOnDim.hasOwnProperty(name)) {
                    return axesMapOnDim[name];
                }
            }
        }
        return axesMapOnDim[axisIndex];
    }
};

/**
 * @return {Array.<module:echarts/coord/Axis>}
 */
gridProto.getAxes = function () {
    return this._axesList.slice();
};

/**
 * Usage:
 *      grid.getCartesian(xAxisIndex, yAxisIndex);
 *      grid.getCartesian(xAxisIndex);
 *      grid.getCartesian(null, yAxisIndex);
 *      grid.getCartesian({xAxisIndex: ..., yAxisIndex: ...});
 *
 * @param {number|Object} [xAxisIndex]
 * @param {number} [yAxisIndex]
 */
gridProto.getCartesian = function (xAxisIndex, yAxisIndex) {
    if (xAxisIndex != null && yAxisIndex != null) {
        var key = 'x' + xAxisIndex + 'y' + yAxisIndex;
        return this._coordsMap[key];
    }

    if (isObject(xAxisIndex)) {
        yAxisIndex = xAxisIndex.yAxisIndex;
        xAxisIndex = xAxisIndex.xAxisIndex;
    }
    // When only xAxisIndex or yAxisIndex given, find its first cartesian.
    for (var i = 0, coordList = this._coordsList; i < coordList.length; i++) {
        if (coordList[i].getAxis('x').index === xAxisIndex
            || coordList[i].getAxis('y').index === yAxisIndex
        ) {
            return coordList[i];
        }
    }
};

gridProto.getCartesians = function () {
    return this._coordsList.slice();
};

/**
 * @implements
 * see {module:echarts/CoodinateSystem}
 */
gridProto.convertToPixel = function (ecModel, finder, value) {
    var target = this._findConvertTarget(ecModel, finder);

    return target.cartesian
        ? target.cartesian.dataToPoint(value)
        : target.axis
        ? target.axis.toGlobalCoord(target.axis.dataToCoord(value))
        : null;
};

/**
 * @implements
 * see {module:echarts/CoodinateSystem}
 */
gridProto.convertFromPixel = function (ecModel, finder, value) {
    var target = this._findConvertTarget(ecModel, finder);

    return target.cartesian
        ? target.cartesian.pointToData(value)
        : target.axis
        ? target.axis.coordToData(target.axis.toLocalCoord(value))
        : null;
};

/**
 * @inner
 */
gridProto._findConvertTarget = function (ecModel, finder) {
    var seriesModel = finder.seriesModel;
    var xAxisModel = finder.xAxisModel
        || (seriesModel && seriesModel.getReferringComponents('xAxis')[0]);
    var yAxisModel = finder.yAxisModel
        || (seriesModel && seriesModel.getReferringComponents('yAxis')[0]);
    var gridModel = finder.gridModel;
    var coordsList = this._coordsList;
    var cartesian;
    var axis;

    if (seriesModel) {
        cartesian = seriesModel.coordinateSystem;
        indexOf(coordsList, cartesian) < 0 && (cartesian = null);
    }
    else if (xAxisModel && yAxisModel) {
        cartesian = this.getCartesian(xAxisModel.componentIndex, yAxisModel.componentIndex);
    }
    else if (xAxisModel) {
        axis = this.getAxis('x', xAxisModel.componentIndex);
    }
    else if (yAxisModel) {
        axis = this.getAxis('y', yAxisModel.componentIndex);
    }
    // Lowest priority.
    else if (gridModel) {
        var grid = gridModel.coordinateSystem;
        if (grid === this) {
            cartesian = this._coordsList[0];
        }
    }

    return {cartesian: cartesian, axis: axis};
};

/**
 * @implements
 * see {module:echarts/CoodinateSystem}
 */
gridProto.containPoint = function (point) {
    var coord = this._coordsList[0];
    if (coord) {
        return coord.containPoint(point);
    }
};

/**
 * Initialize cartesian coordinate systems
 * @private
 */
gridProto._initCartesian = function (gridModel, ecModel, api) {
    var axisPositionUsed = {
        left: false,
        right: false,
        top: false,
        bottom: false
    };

    var axesMap = {
        x: {},
        y: {}
    };
    var axesCount = {
        x: 0,
        y: 0
    };

    /// Create axis
    ecModel.eachComponent('xAxis', createAxisCreator('x'), this);
    ecModel.eachComponent('yAxis', createAxisCreator('y'), this);

    if (!axesCount.x || !axesCount.y) {
        // Roll back when there no either x or y axis
        this._axesMap = {};
        this._axesList = [];
        return;
    }

    this._axesMap = axesMap;

    /// Create cartesian2d
    each(axesMap.x, function (xAxis, xAxisIndex) {
        each(axesMap.y, function (yAxis, yAxisIndex) {
            var key = 'x' + xAxisIndex + 'y' + yAxisIndex;
            var cartesian = new Cartesian2D(key);

            cartesian.grid = this;
            cartesian.model = gridModel;

            this._coordsMap[key] = cartesian;
            this._coordsList.push(cartesian);

            cartesian.addAxis(xAxis);
            cartesian.addAxis(yAxis);
        }, this);
    }, this);

    function createAxisCreator(axisType) {
        return function (axisModel, idx) {
            if (!isAxisUsedInTheGrid(axisModel, gridModel, ecModel)) {
                return;
            }

            var axisPosition = axisModel.get('position');
            if (axisType === 'x') {
                // Fix position
                if (axisPosition !== 'top' && axisPosition !== 'bottom') {
                    // Default bottom of X
                    axisPosition = 'bottom';
                    if (axisPositionUsed[axisPosition]) {
                        axisPosition = axisPosition === 'top' ? 'bottom' : 'top';
                    }
                }
            }
            else {
                // Fix position
                if (axisPosition !== 'left' && axisPosition !== 'right') {
                    // Default left of Y
                    axisPosition = 'left';
                    if (axisPositionUsed[axisPosition]) {
                        axisPosition = axisPosition === 'left' ? 'right' : 'left';
                    }
                }
            }
            axisPositionUsed[axisPosition] = true;

            var axis = new Axis2D(
                axisType, createScaleByModel(axisModel),
                [0, 0],
                axisModel.get('type'),
                axisPosition
            );

            var isCategory = axis.type === 'category';
            axis.onBand = isCategory && axisModel.get('boundaryGap');
            axis.inverse = axisModel.get('inverse');

            // Inject axis into axisModel
            axisModel.axis = axis;

            // Inject axisModel into axis
            axis.model = axisModel;

            // Inject grid info axis
            axis.grid = this;

            // Index of axis, can be used as key
            axis.index = idx;

            this._axesList.push(axis);

            axesMap[axisType][idx] = axis;
            axesCount[axisType]++;
        };
    }
};

/**
 * Update cartesian properties from series
 * @param  {module:echarts/model/Option} option
 * @private
 */
gridProto._updateScale = function (ecModel, gridModel) {
    // Reset scale
    each(this._axesList, function (axis) {
        axis.scale.setExtent(Infinity, -Infinity);
    });
    ecModel.eachSeries(function (seriesModel) {
        if (isCartesian2D(seriesModel)) {
            var axesModels = findAxesModels(seriesModel, ecModel);
            var xAxisModel = axesModels[0];
            var yAxisModel = axesModels[1];

            if (!isAxisUsedInTheGrid(xAxisModel, gridModel, ecModel)
                || !isAxisUsedInTheGrid(yAxisModel, gridModel, ecModel)
            ) {
                return;
            }

            var cartesian = this.getCartesian(
                xAxisModel.componentIndex, yAxisModel.componentIndex
            );
            var data = seriesModel.getData();
            var xAxis = cartesian.getAxis('x');
            var yAxis = cartesian.getAxis('y');

            if (data.type === 'list') {
                unionExtent(data, xAxis, seriesModel);
                unionExtent(data, yAxis, seriesModel);
            }
        }
    }, this);

    function unionExtent(data, axis, seriesModel) {
        each(data.mapDimension(axis.dim, true), function (dim) {
            axis.scale.unionExtentFromData(
                // For example, the extent of the orginal dimension
                // is [0.1, 0.5], the extent of the `stackResultDimension`
                // is [7, 9], the final extent should not include [0.1, 0.5].
                data, getStackedDimension(data, dim)
            );
        });
    }
};

/**
 * @param {string} [dim] 'x' or 'y' or 'auto' or null/undefined
 * @return {Object} {baseAxes: [], otherAxes: []}
 */
gridProto.getTooltipAxes = function (dim) {
    var baseAxes = [];
    var otherAxes = [];

    each(this.getCartesians(), function (cartesian) {
        var baseAxis = (dim != null && dim !== 'auto')
            ? cartesian.getAxis(dim) : cartesian.getBaseAxis();
        var otherAxis = cartesian.getOtherAxis(baseAxis);
        indexOf(baseAxes, baseAxis) < 0 && baseAxes.push(baseAxis);
        indexOf(otherAxes, otherAxis) < 0 && otherAxes.push(otherAxis);
    });

    return {baseAxes: baseAxes, otherAxes: otherAxes};
};

/**
 * @inner
 */
function updateAxisTransform(axis, coordBase) {
    var axisExtent = axis.getExtent();
    var axisExtentSum = axisExtent[0] + axisExtent[1];

    // Fast transform
    axis.toGlobalCoord = axis.dim === 'x'
        ? function (coord) {
            return coord + coordBase;
        }
        : function (coord) {
            return axisExtentSum - coord + coordBase;
        };
    axis.toLocalCoord = axis.dim === 'x'
        ? function (coord) {
            return coord - coordBase;
        }
        : function (coord) {
            return axisExtentSum - coord + coordBase;
        };
}

var axesTypes = ['xAxis', 'yAxis'];
/**
 * @inner
 */
function findAxesModels(seriesModel, ecModel) {
    return map(axesTypes, function (axisType) {
        var axisModel = seriesModel.getReferringComponents(axisType)[0];

        if (__DEV__) {
            if (!axisModel) {
                throw new Error(axisType + ' "' + retrieve(
                    seriesModel.get(axisType + 'Index'),
                    seriesModel.get(axisType + 'Id'),
                    0
                ) + '" not found');
            }
        }
        return axisModel;
    });
}

/**
 * @inner
 */
function isCartesian2D(seriesModel) {
    return seriesModel.get('coordinateSystem') === 'cartesian2d';
}

Grid.create = function (ecModel, api) {
    var grids = [];
    ecModel.eachComponent('grid', function (gridModel, idx) {
        var grid = new Grid(gridModel, ecModel, api);
        grid.name = 'grid_' + idx;
        // dataSampling requires axis extent, so resize
        // should be performed in create stage.
        grid.resize(gridModel, api, true);

        gridModel.coordinateSystem = grid;

        grids.push(grid);
    });

    // Inject the coordinateSystems into seriesModel
    ecModel.eachSeries(function (seriesModel) {
        if (!isCartesian2D(seriesModel)) {
            return;
        }

        var axesModels = findAxesModels(seriesModel, ecModel);
        var xAxisModel = axesModels[0];
        var yAxisModel = axesModels[1];

        var gridModel = xAxisModel.getCoordSysModel();

        if (__DEV__) {
            if (!gridModel) {
                throw new Error(
                    'Grid "' + retrieve(
                        xAxisModel.get('gridIndex'),
                        xAxisModel.get('gridId'),
                        0
                    ) + '" not found'
                );
            }
            if (xAxisModel.getCoordSysModel() !== yAxisModel.getCoordSysModel()) {
                throw new Error('xAxis and yAxis must use the same grid');
            }
        }

        var grid = gridModel.coordinateSystem;

        seriesModel.coordinateSystem = grid.getCartesian(
            xAxisModel.componentIndex, yAxisModel.componentIndex
        );
    });

    return grids;
};

// For deciding which dimensions to use when creating list data
Grid.dimensions = Grid.prototype.dimensions = Cartesian2D.prototype.dimensions;

CoordinateSystem.register('cartesian2d', Grid);

export default Grid;

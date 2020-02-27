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
import {isObject, each, map, indexOf, retrieve, retrieve3} from 'zrender/src/core/util';
import {getLayoutRect, LayoutRect} from '../../util/layout';
import {
    createScaleByModel,
    ifAxisCrossZero,
    niceScaleExtent,
    estimateLabelUnionRect
} from '../../coord/axisHelper';
import Cartesian2D from './Cartesian2D';
import Axis2D from './Axis2D';
import CoordinateSystemManager from '../../CoordinateSystem';
import {getStackedDimension} from '../../data/helper/dataStackHelper';
import {ParsedModelFinder} from '../../util/model';

// Depends on GridModel, AxisModel, which performs preprocess.
import GridModel from './GridModel';
import CartesianAxisModel from './AxisModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { Dictionary } from 'zrender/src/core/types';
import {CoordinateSystemMaster} from '../CoordinateSystem';
import { ScaleDataValue } from '../../util/types';
import List from '../../data/List';
import SeriesModel from '../../model/Series';


export const cartesian2DDimensions = ['x', 'y'];
type Cartesian2DDimensionName = 'x' | 'y';

type FinderAxisIndex = {xAxisIndex?: number, yAxisIndex?: number};
type AxesMap = {x: Axis2D[], y: Axis2D[]};

class Grid implements CoordinateSystemMaster {

    // FIXME:TS where used (different from registered type 'cartesian2d')?
    readonly type: string = 'grid';

    private _coordsMap: Dictionary<Cartesian2D> = {};
    private _coordsList: Cartesian2D[] = [];
    private _axesMap: AxesMap = {} as AxesMap;
    private _axesList: Axis2D[] = [];
    private _rect: LayoutRect;

    readonly model: GridModel;
    readonly axisPointerEnabled = true;

    // Injected:
    name: string;

    // For deciding which dimensions to use when creating list data
    static dimensions = cartesian2DDimensions;
    readonly dimensions = cartesian2DDimensions;

    constructor(gridModel: GridModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this._initCartesian(gridModel, ecModel, api);
        this.model = gridModel;
    }

    getRect(): LayoutRect {
        return this._rect;
    }

    update(ecModel: GlobalModel, api: ExtensionAPI): void {

        var axesMap = this._axesMap;

        this._updateScale(ecModel, this.model);

        each(axesMap.x, function (xAxis) {
            niceScaleExtent(xAxis.scale, xAxis.model);
        });
        each(axesMap.y, function (yAxis) {
            niceScaleExtent(yAxis.scale, yAxis.model);
        });

        // Key: axisDim_axisIndex, value: boolean, whether onZero target.
        var onZeroRecords = {} as Dictionary<boolean>;

        each(axesMap.x, function (xAxis) {
            fixAxisOnZero(axesMap, 'y', xAxis, onZeroRecords);
        });
        each(axesMap.y, function (yAxis) {
            fixAxisOnZero(axesMap, 'x', yAxis, onZeroRecords);
        });

        // Resize again if containLabel is enabled
        // FIXME It may cause getting wrong grid size in data processing stage
        this.resize(this.model, api);
    }

    /**
     * Resize the grid
     */
    resize(gridModel: GridModel, api: ExtensionAPI, ignoreContainLabel?: boolean): void {

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
                if (!axis.model.get(['axisLabel', 'inside'])) {
                    var labelUnionRect = estimateLabelUnionRect(axis);
                    if (labelUnionRect) {
                        var dim: 'height' | 'width' = axis.isHorizontal() ? 'height' : 'width';
                        var margin = axis.model.get(['axisLabel', 'margin']);
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
    }

    getAxis(dim: Cartesian2DDimensionName, axisIndex?: number): Axis2D {
        var axesMapOnDim = this._axesMap[dim];
        if (axesMapOnDim != null) {
            return axesMapOnDim[axisIndex || 0];
            // if (axisIndex == null) {
            //     Find first axis
            //     for (var name in axesMapOnDim) {
            //         if (axesMapOnDim.hasOwnProperty(name)) {
            //             return axesMapOnDim[name];
            //         }
            //     }
            // }
            // return axesMapOnDim[axisIndex];
        }
    }

    getAxes(): Axis2D[] {
        return this._axesList.slice();
    }

    /**
     * Usage:
     *      grid.getCartesian(xAxisIndex, yAxisIndex);
     *      grid.getCartesian(xAxisIndex);
     *      grid.getCartesian(null, yAxisIndex);
     *      grid.getCartesian({xAxisIndex: ..., yAxisIndex: ...});
     *
     * When only xAxisIndex or yAxisIndex given, find its first cartesian.
     */
    getCartesian(finder: FinderAxisIndex): Cartesian2D;
    getCartesian(xAxisIndex?: number, yAxisIndex?: number): Cartesian2D;
    getCartesian(xAxisIndex?: number | FinderAxisIndex, yAxisIndex?: number) {
        if (xAxisIndex != null && yAxisIndex != null) {
            var key = 'x' + xAxisIndex + 'y' + yAxisIndex;
            return this._coordsMap[key];
        }

        if (isObject(xAxisIndex)) {
            yAxisIndex = (xAxisIndex as FinderAxisIndex).yAxisIndex;
            xAxisIndex = (xAxisIndex as FinderAxisIndex).xAxisIndex;
        }
        for (var i = 0, coordList = this._coordsList; i < coordList.length; i++) {
            if (coordList[i].getAxis('x').index === xAxisIndex
                || coordList[i].getAxis('y').index === yAxisIndex
            ) {
                return coordList[i];
            }
        }
    }

    getCartesians(): Cartesian2D[] {
        return this._coordsList.slice();
    }

    /**
     * @implements
     */
    convertToPixel(
        ecModel: GlobalModel, finder: ParsedModelFinder, value: ScaleDataValue | ScaleDataValue[]
    ): number | number[] {
        var target = this._findConvertTarget(ecModel, finder);

        return target.cartesian
            ? target.cartesian.dataToPoint(value as ScaleDataValue[])
            : target.axis
            ? target.axis.toGlobalCoord(target.axis.dataToCoord(value as ScaleDataValue))
            : null;
    }

    /**
     * @implements
     */
    convertFromPixel(
        ecModel: GlobalModel, finder: ParsedModelFinder, value: number | number[]
    ): number | number[] {
        var target = this._findConvertTarget(ecModel, finder);

        return target.cartesian
            ? target.cartesian.pointToData(value as number[])
            : target.axis
            ? target.axis.coordToData(target.axis.toLocalCoord(value as number))
            : null;
    }

    private _findConvertTarget(
        ecModel: GlobalModel, finder: ParsedModelFinder
    ): {cartesian: Cartesian2D, axis: Axis2D} {
        var seriesModel = finder.seriesModel;
        var xAxisModel = finder.xAxisModel
            || (seriesModel && seriesModel.getReferringComponents('xAxis')[0]);
        var yAxisModel = finder.yAxisModel
            || (seriesModel && seriesModel.getReferringComponents('yAxis')[0]);
        var gridModel = finder.gridModel;
        var coordsList = this._coordsList;
        var cartesian: Cartesian2D;
        var axis;

        if (seriesModel) {
            cartesian = seriesModel.coordinateSystem as Cartesian2D;
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
    }

    /**
     * @implements
     */
    containPoint(point: number[]): boolean {
        var coord = this._coordsList[0];
        if (coord) {
            return coord.containPoint(point);
        }
    }

    /**
     * Initialize cartesian coordinate systems
     */
    private _initCartesian(
        gridModel: GridModel, ecModel: GlobalModel, api: ExtensionAPI
    ): void {
        var grid = this;
        var axisPositionUsed = {
            left: false,
            right: false,
            top: false,
            bottom: false
        };

        var axesMap = {
            x: {},
            y: {}
        } as AxesMap;
        var axesCount = {
            x: 0,
            y: 0
        };

        /// Create axis
        ecModel.eachComponent('xAxis', createAxisCreator('x'), this);
        ecModel.eachComponent('yAxis', createAxisCreator('y'), this);

        if (!axesCount.x || !axesCount.y) {
            // Roll back when there no either x or y axis
            this._axesMap = {} as AxesMap;
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

        function createAxisCreator(dimName: Cartesian2DDimensionName) {
            return function (axisModel: CartesianAxisModel, idx: number): void {
                if (!isAxisUsedInTheGrid(axisModel, gridModel)) {
                    return;
                }

                var axisPosition = axisModel.get('position');
                if (dimName === 'x') {
                    // Fix position
                    if (axisPosition !== 'top' && axisPosition !== 'bottom') {
                        // Default bottom of X
                        axisPosition = axisPositionUsed.bottom ? 'top' : 'bottom';
                    }
                }
                else {
                    // Fix position
                    if (axisPosition !== 'left' && axisPosition !== 'right') {
                        // Default left of Y
                        axisPosition = axisPositionUsed.left ? 'right' : 'left';
                    }
                }
                axisPositionUsed[axisPosition] = true;

                var axis = new Axis2D(
                    dimName,
                    createScaleByModel(axisModel),
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
                axis.grid = grid;

                // Index of axis, can be used as key
                axis.index = idx;

                grid._axesList.push(axis);

                axesMap[dimName][idx] = axis;
                axesCount[dimName]++;
            };
        }
    }

    /**
     * Update cartesian properties from series.
     */
    private _updateScale(ecModel: GlobalModel, gridModel: GridModel): void {
        // Reset scale
        each(this._axesList, function (axis) {
            axis.scale.setExtent(Infinity, -Infinity);
        });
        ecModel.eachSeries(function (seriesModel) {
            if (isCartesian2D(seriesModel)) {
                var axesModels = findAxesModels(seriesModel);
                var xAxisModel = axesModels[0];
                var yAxisModel = axesModels[1];

                if (!isAxisUsedInTheGrid(xAxisModel, gridModel)
                    || !isAxisUsedInTheGrid(yAxisModel, gridModel)
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
                    unionExtent(data, xAxis);
                    unionExtent(data, yAxis);
                }
            }
        }, this);

        function unionExtent(data: List, axis: Axis2D): void {
            each(data.mapDimension(axis.dim, true), function (dim) {
                axis.scale.unionExtentFromData(
                    // For example, the extent of the orginal dimension
                    // is [0.1, 0.5], the extent of the `stackResultDimension`
                    // is [7, 9], the final extent should not include [0.1, 0.5].
                    data, getStackedDimension(data, dim)
                );
            });
        }
    }

    /**
     * @param dim 'x' or 'y' or 'auto' or null/undefined
     */
    getTooltipAxes(dim: Cartesian2DDimensionName | 'auto'): {
        baseAxes: Axis2D[], otherAxes: Axis2D[]
    } {
        var baseAxes = [] as Axis2D[];
        var otherAxes = [] as Axis2D[];

        each(this.getCartesians(), function (cartesian) {
            var baseAxis = (dim != null && dim !== 'auto')
                ? cartesian.getAxis(dim) : cartesian.getBaseAxis();
            var otherAxis = cartesian.getOtherAxis(baseAxis);
            indexOf(baseAxes, baseAxis) < 0 && baseAxes.push(baseAxis);
            indexOf(otherAxes, otherAxis) < 0 && otherAxes.push(otherAxis);
        });

        return {baseAxes: baseAxes, otherAxes: otherAxes};
    }


    static create(ecModel: GlobalModel, api: ExtensionAPI): Grid[] {
        var grids = [] as Grid[];
        ecModel.eachComponent('grid', function (gridModel: GridModel, idx) {
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

            var axesModels = findAxesModels(seriesModel);
            var xAxisModel = axesModels[0];
            var yAxisModel = axesModels[1];

            var gridModel = xAxisModel.getCoordSysModel();

            if (__DEV__) {
                if (!gridModel) {
                    throw new Error(
                        'Grid "' + retrieve3(
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

            var grid = gridModel.coordinateSystem as Grid;

            seriesModel.coordinateSystem = grid.getCartesian(
                xAxisModel.componentIndex, yAxisModel.componentIndex
            );
        });

        return grids;
    }

}

/**
 * Check if the axis is used in the specified grid.
 */
function isAxisUsedInTheGrid(axisModel: CartesianAxisModel, gridModel: GridModel): boolean {
    return axisModel.getCoordSysModel() === gridModel;
}

function fixAxisOnZero(
    axesMap: AxesMap,
    otherAxisDim: Cartesian2DDimensionName,
    axis: Axis2D,
    // Key: see `getOnZeroRecordKey`
    onZeroRecords: Dictionary<boolean>
): void {

    axis.getAxesOnZeroOf = function () {
        // TODO: onZero of multiple axes.
        return otherAxisOnZeroOf ? [otherAxisOnZeroOf] : [];
    };

    // onZero can not be enabled in these two situations:
    // 1. When any other axis is a category axis.
    // 2. When no axis is cross 0 point.
    var otherAxes = axesMap[otherAxisDim];

    var otherAxisOnZeroOf: Axis2D;
    var axisModel = axis.model;
    var onZero = axisModel.get(['axisLine', 'onZero']);
    var onZeroAxisIndex = axisModel.get(['axisLine', 'onZeroAxisIndex']);

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

    function getOnZeroRecordKey(axis: Axis2D) {
        return axis.dim + '_' + axis.index;
    }
}

function canOnZeroToAxis(axis: Axis2D): boolean {
    return axis && axis.type !== 'category' && axis.type !== 'time' && ifAxisCrossZero(axis);
}

function updateAxisTransform(axis: Axis2D, coordBase: number) {
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
function findAxesModels(seriesModel: SeriesModel): CartesianAxisModel[] {
    return map(axesTypes, function (axisType) {
        var axisModel = seriesModel.getReferringComponents(axisType)[0] as CartesianAxisModel;

        if (__DEV__) {
            if (!axisModel) {
                throw new Error(axisType + ' "' + retrieve(
                    seriesModel.get(axisType + 'Index' as any),
                    seriesModel.get(axisType + 'Id' as any),
                    0
                ) + '" not found');
            }
        }
        return axisModel;
    });
}

function isCartesian2D(seriesModel: SeriesModel): boolean {
    return seriesModel.get('coordinateSystem') === 'cartesian2d';
}

CoordinateSystemManager.register('cartesian2d', Grid);

export default Grid;

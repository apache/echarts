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
 * Parallel Coordinates
 * <https://en.wikipedia.org/wiki/Parallel_coordinates>
 */

import * as zrUtil from 'zrender/src/core/util';
import * as matrix from 'zrender/src/core/matrix';
import * as layoutUtil from '../../util/layout';
import * as axisHelper from '../../coord/axisHelper';
import ParallelAxis from './ParallelAxis';
import * as graphic from '../../util/graphic';
import * as numberUtil from '../../util/number';
import sliderMove from '../../component/helper/sliderMove';
import ParallelModel, { ParallelLayoutDirection } from './ParallelModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { Dictionary, DimensionName, ScaleDataValue } from '../../util/types';
import { CoordinateSystem, CoordinateSystemMaster } from '../CoordinateSystem';
import ParallelAxisModel, { ParallelActiveState } from './AxisModel';
import ParallelSeries from '../../chart/parallel/ParallelSeries';
import List from '../../data/List';
import { ParsedModelFinder } from '../../util/model';

var each = zrUtil.each;
var mathMin = Math.min;
var mathMax = Math.max;
var mathFloor = Math.floor;
var mathCeil = Math.ceil;
var round = numberUtil.round;

var PI = Math.PI;

interface ParallelCoordinateSystemLayoutInfo {
    layout: ParallelLayoutDirection;
    pixelDimIndex: number;
    layoutBase: number;
    layoutLength: number;
    axisBase: number;
    axisLength: number;
    axisExpandable: boolean;
    axisExpandWidth: number;
    axisCollapseWidth: number;
    axisExpandWindow: number[];
    axisCount: number;
    winInnerIndices: number[];
    axisExpandWindow0Pos: number;
}

export interface ParallelAxisLayoutInfo {
    position: number[];
    rotation: number;
    transform: matrix.MatrixArray;
    axisNameAvailableWidth: number;
    axisLabelShow: boolean;
    nameTruncateMaxWidth: number;
    tickDirection: -1 | 1;
    labelDirection: -1 | 1;
}

type SlidedAxisExpandBehavior = 'none' | 'slide' | 'jump';

class Parallel implements CoordinateSystemMaster, CoordinateSystem {

    readonly type = 'parallel';

    /**
     * key: dimension
     */
    private _axesMap = zrUtil.createHashMap<ParallelAxis>();

    /**
     * key: dimension
     * value: {position: [], rotation, }
     */
    private _axesLayout: Dictionary<ParallelAxisLayoutInfo> = {};

    /**
     * Always follow axis order.
     */
    readonly dimensions: ParallelModel['dimensions'];

    private _rect: graphic.BoundingRect;

    private _model: ParallelModel;

    // Inject
    name: string;
    model: ParallelModel;


    constructor(parallelModel: ParallelModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this.dimensions = parallelModel.dimensions;
        this._model = parallelModel;

        this._init(parallelModel, ecModel, api);
    }

    private _init(parallelModel: ParallelModel, ecModel: GlobalModel, api: ExtensionAPI): void {

        var dimensions = parallelModel.dimensions;
        var parallelAxisIndex = parallelModel.parallelAxisIndex;

        each(dimensions, function (dim, idx) {

            var axisIndex = parallelAxisIndex[idx];
            var axisModel = ecModel.getComponent('parallelAxis', axisIndex) as ParallelAxisModel;

            var axis = this._axesMap.set(dim, new ParallelAxis(
                dim,
                axisHelper.createScaleByModel(axisModel),
                [0, 0],
                axisModel.get('type'),
                axisIndex
            ));

            var isCategory = axis.type === 'category';
            axis.onBand = isCategory && axisModel.get('boundaryGap');
            axis.inverse = axisModel.get('inverse');

            // Injection
            axisModel.axis = axis;
            axis.model = axisModel;
            axis.coordinateSystem = axisModel.coordinateSystem = this;

        }, this);
    }

    /**
     * Update axis scale after data processed
     */
    update(ecModel: GlobalModel, api: ExtensionAPI): void {
        this._updateAxesFromSeries(this._model, ecModel);
    }

    containPoint(point: number[]): boolean {
        var layoutInfo = this._makeLayoutInfo();
        var axisBase = layoutInfo.axisBase;
        var layoutBase = layoutInfo.layoutBase;
        var pixelDimIndex = layoutInfo.pixelDimIndex;
        var pAxis = point[1 - pixelDimIndex];
        var pLayout = point[pixelDimIndex];

        return pAxis >= axisBase
            && pAxis <= axisBase + layoutInfo.axisLength
            && pLayout >= layoutBase
            && pLayout <= layoutBase + layoutInfo.layoutLength;
    }

    getModel(): ParallelModel {
        return this._model;
    }

    /**
     * Update properties from series
     */
    private _updateAxesFromSeries(parallelModel: ParallelModel, ecModel: GlobalModel): void {
        ecModel.eachSeries(function (seriesModel) {

            if (!parallelModel.contains(seriesModel, ecModel)) {
                return;
            }

            var data = seriesModel.getData();

            each(this.dimensions, function (dim) {
                var axis = this._axesMap.get(dim);
                axis.scale.unionExtentFromData(data, data.mapDimension(dim));
                axisHelper.niceScaleExtent(axis.scale, axis.model);
            }, this);
        }, this);
    }

    /**
     * Resize the parallel coordinate system.
     */
    resize(parallelModel: ParallelModel, api: ExtensionAPI): void {
        this._rect = layoutUtil.getLayoutRect(
            parallelModel.getBoxLayoutParams(),
            {
                width: api.getWidth(),
                height: api.getHeight()
            }
        );

        this._layoutAxes();
    }

    getRect(): graphic.BoundingRect {
        return this._rect;
    }

    private _makeLayoutInfo(): ParallelCoordinateSystemLayoutInfo {
        var parallelModel = this._model;
        var rect = this._rect;
        var xy = ['x', 'y'] as const;
        var wh = ['width', 'height'] as const;
        var layout = parallelModel.get('layout');
        var pixelDimIndex = layout === 'horizontal' ? 0 : 1;
        var layoutLength = rect[wh[pixelDimIndex]];
        var layoutExtent = [0, layoutLength];
        var axisCount = this.dimensions.length;

        var axisExpandWidth = restrict(parallelModel.get('axisExpandWidth'), layoutExtent);
        var axisExpandCount = restrict(parallelModel.get('axisExpandCount') || 0, [0, axisCount]);
        var axisExpandable = parallelModel.get('axisExpandable')
            && axisCount > 3
            && axisCount > axisExpandCount
            && axisExpandCount > 1
            && axisExpandWidth > 0
            && layoutLength > 0;

        // `axisExpandWindow` is According to the coordinates of [0, axisExpandLength],
        // for sake of consider the case that axisCollapseWidth is 0 (when screen is narrow),
        // where collapsed axes should be overlapped.
        var axisExpandWindow = parallelModel.get('axisExpandWindow');
        var winSize;
        if (!axisExpandWindow) {
            winSize = restrict(axisExpandWidth * (axisExpandCount - 1), layoutExtent);
            var axisExpandCenter = parallelModel.get('axisExpandCenter') || mathFloor(axisCount / 2);
            axisExpandWindow = [axisExpandWidth * axisExpandCenter - winSize / 2];
            axisExpandWindow[1] = axisExpandWindow[0] + winSize;
        }
        else {
            winSize = restrict(axisExpandWindow[1] - axisExpandWindow[0], layoutExtent);
            axisExpandWindow[1] = axisExpandWindow[0] + winSize;
        }

        var axisCollapseWidth = (layoutLength - winSize) / (axisCount - axisExpandCount);
        // Avoid axisCollapseWidth is too small.
        axisCollapseWidth < 3 && (axisCollapseWidth = 0);

        // Find the first and last indices > ewin[0] and < ewin[1].
        var winInnerIndices = [
            mathFloor(round(axisExpandWindow[0] / axisExpandWidth, 1)) + 1,
            mathCeil(round(axisExpandWindow[1] / axisExpandWidth, 1)) - 1
        ];

        // Pos in ec coordinates.
        var axisExpandWindow0Pos = axisCollapseWidth / axisExpandWidth * axisExpandWindow[0];

        return {
            layout: layout,
            pixelDimIndex: pixelDimIndex,
            layoutBase: rect[xy[pixelDimIndex]],
            layoutLength: layoutLength,
            axisBase: rect[xy[1 - pixelDimIndex]],
            axisLength: rect[wh[1 - pixelDimIndex]],
            axisExpandable: axisExpandable,
            axisExpandWidth: axisExpandWidth,
            axisCollapseWidth: axisCollapseWidth,
            axisExpandWindow: axisExpandWindow,
            axisCount: axisCount,
            winInnerIndices: winInnerIndices,
            axisExpandWindow0Pos: axisExpandWindow0Pos
        };
    }

    private _layoutAxes(): void {
        var rect = this._rect;
        var axes = this._axesMap;
        var dimensions = this.dimensions;
        var layoutInfo = this._makeLayoutInfo();
        var layout = layoutInfo.layout;

        axes.each(function (axis) {
            var axisExtent = [0, layoutInfo.axisLength];
            var idx = axis.inverse ? 1 : 0;
            axis.setExtent(axisExtent[idx], axisExtent[1 - idx]);
        });

        each(dimensions, function (dim, idx) {
            var posInfo = (layoutInfo.axisExpandable
                ? layoutAxisWithExpand : layoutAxisWithoutExpand
            )(idx, layoutInfo);

            var positionTable = {
                horizontal: {
                    x: posInfo.position,
                    y: layoutInfo.axisLength
                },
                vertical: {
                    x: 0,
                    y: posInfo.position
                }
            };
            var rotationTable = {
                horizontal: PI / 2,
                vertical: 0
            };

            var position = [
                positionTable[layout].x + rect.x,
                positionTable[layout].y + rect.y
            ];

            var rotation = rotationTable[layout];
            var transform = matrix.create();
            matrix.rotate(transform, transform, rotation);
            matrix.translate(transform, transform, position);

            // TODO
            // tick layout info

            // TODO
            // update dimensions info based on axis order.

            this._axesLayout[dim] = {
                position: position,
                rotation: rotation,
                transform: transform,
                axisNameAvailableWidth: posInfo.axisNameAvailableWidth,
                axisLabelShow: posInfo.axisLabelShow,
                nameTruncateMaxWidth: posInfo.nameTruncateMaxWidth,
                tickDirection: 1,
                labelDirection: 1
            };
        }, this);
    }

    /**
     * Get axis by dim.
     */
    getAxis(dim: DimensionName): ParallelAxis {
        return this._axesMap.get(dim);
    }

    /**
     * Convert a dim value of a single item of series data to Point.
     */
    dataToPoint(value: ScaleDataValue, dim: DimensionName): number[] {
        return this.axisCoordToPoint(
            this._axesMap.get(dim).dataToCoord(value),
            dim
        );
    }

    /**
     * Travel data for one time, get activeState of each data item.
     * @param start the start dataIndex that travel from.
     * @param end the next dataIndex of the last dataIndex will be travel.
     */
    eachActiveState(
        data: List,
        callback: (activeState: ParallelActiveState, dataIndex: number) => void,
        start?: number,
        end?: number
    ): void {
        start == null && (start = 0);
        end == null && (end = data.count());

        var axesMap = this._axesMap;
        var dimensions = this.dimensions;
        var dataDimensions = [] as DimensionName[];
        var axisModels = [] as ParallelAxisModel[];

        zrUtil.each(dimensions, function (axisDim) {
            dataDimensions.push(data.mapDimension(axisDim));
            axisModels.push(axesMap.get(axisDim).model);
        });

        var hasActiveSet = this.hasAxisBrushed();

        for (var dataIndex = start; dataIndex < end; dataIndex++) {
            var activeState: ParallelActiveState;

            if (!hasActiveSet) {
                activeState = 'normal';
            }
            else {
                activeState = 'active';
                var values = data.getValues(dataDimensions, dataIndex);
                for (var j = 0, lenj = dimensions.length; j < lenj; j++) {
                    var state = axisModels[j].getActiveState(values[j]);

                    if (state === 'inactive') {
                        activeState = 'inactive';
                        break;
                    }
                }
            }

            callback(activeState, dataIndex);
        }
    }

    /**
     * Whether has any activeSet.
     */
    hasAxisBrushed(): boolean {
        var dimensions = this.dimensions;
        var axesMap = this._axesMap;
        var hasActiveSet = false;

        for (var j = 0, lenj = dimensions.length; j < lenj; j++) {
            if (axesMap.get(dimensions[j]).model.getActiveState() !== 'normal') {
                hasActiveSet = true;
            }
        }

        return hasActiveSet;
    }

    /**
     * Convert coords of each axis to Point.
     *  Return point. For example: [10, 20]
     */
    axisCoordToPoint(coord: number, dim: DimensionName): number[] {
        var axisLayout = this._axesLayout[dim];
        return graphic.applyTransform([coord, 0], axisLayout.transform);
    }

    /**
     * Get axis layout.
     */
    getAxisLayout(dim: DimensionName): ParallelAxisLayoutInfo {
        return zrUtil.clone(this._axesLayout[dim]);
    }

    /**
     * @return {Object} {axisExpandWindow, delta, behavior: 'jump' | 'slide' | 'none'}.
     */
    getSlidedAxisExpandWindow(point: number[]): {
        axisExpandWindow: number[],
        behavior: SlidedAxisExpandBehavior
    } {
        var layoutInfo = this._makeLayoutInfo();
        var pixelDimIndex = layoutInfo.pixelDimIndex;
        var axisExpandWindow = layoutInfo.axisExpandWindow.slice();
        var winSize = axisExpandWindow[1] - axisExpandWindow[0];
        var extent = [0, layoutInfo.axisExpandWidth * (layoutInfo.axisCount - 1)];

        // Out of the area of coordinate system.
        if (!this.containPoint(point)) {
            return {behavior: 'none', axisExpandWindow: axisExpandWindow};
        }

        // Conver the point from global to expand coordinates.
        var pointCoord = point[pixelDimIndex] - layoutInfo.layoutBase - layoutInfo.axisExpandWindow0Pos;

        // For dragging operation convenience, the window should not be
        // slided when mouse is the center area of the window.
        var delta;
        var behavior: SlidedAxisExpandBehavior = 'slide';
        var axisCollapseWidth = layoutInfo.axisCollapseWidth;
        var triggerArea = this._model.get('axisExpandSlideTriggerArea');
        // But consider touch device, jump is necessary.
        var useJump = triggerArea[0] != null;

        if (axisCollapseWidth) {
            if (useJump && axisCollapseWidth && pointCoord < winSize * triggerArea[0]) {
                behavior = 'jump';
                delta = pointCoord - winSize * triggerArea[2];
            }
            else if (useJump && axisCollapseWidth && pointCoord > winSize * (1 - triggerArea[0])) {
                behavior = 'jump';
                delta = pointCoord - winSize * (1 - triggerArea[2]);
            }
            else {
                (delta = pointCoord - winSize * triggerArea[1]) >= 0
                    && (delta = pointCoord - winSize * (1 - triggerArea[1])) <= 0
                    && (delta = 0);
            }
            delta *= layoutInfo.axisExpandWidth / axisCollapseWidth;
            delta
                ? sliderMove(delta, axisExpandWindow, extent, 'all')
                // Avoid nonsense triger on mousemove.
                : (behavior = 'none');
        }
        // When screen is too narrow, make it visible and slidable, although it is hard to interact.
        else {
            var winSize = axisExpandWindow[1] - axisExpandWindow[0];
            var pos = extent[1] * pointCoord / winSize;
            axisExpandWindow = [mathMax(0, pos - winSize / 2)];
            axisExpandWindow[1] = mathMin(extent[1], axisExpandWindow[0] + winSize);
            axisExpandWindow[0] = axisExpandWindow[1] - winSize;
        }

        return {
            axisExpandWindow: axisExpandWindow,
            behavior: behavior
        };
    }

    // TODO
    // convertToPixel
    // convertFromPixel
    // Note:
    // (1) Consider Parallel, the return type of `convertToPixel` could be number[][] (Point[]).
    // (2) In parallel coord sys, how to make `convertFromPixel` make sense?
    // Perhaps convert a point based on "a rensent most axis" is more meaningful rather than based on all axes?
}


function restrict(len: number, extent: number[]): number {
    return mathMin(mathMax(len, extent[0]), extent[1]);
}

interface ParallelAxisLayoutPositionInfo {
    position: number;
    axisNameAvailableWidth: number;
    axisLabelShow: boolean;
    nameTruncateMaxWidth?: number;
}

function layoutAxisWithoutExpand(
    axisIndex: number,
    layoutInfo: ParallelCoordinateSystemLayoutInfo
): ParallelAxisLayoutPositionInfo {
    var step = layoutInfo.layoutLength / (layoutInfo.axisCount - 1);
    return {
        position: step * axisIndex,
        axisNameAvailableWidth: step,
        axisLabelShow: true
    };
}

function layoutAxisWithExpand(
    axisIndex: number,
    layoutInfo: ParallelCoordinateSystemLayoutInfo
): ParallelAxisLayoutPositionInfo {
    var layoutLength = layoutInfo.layoutLength;
    var axisExpandWidth = layoutInfo.axisExpandWidth;
    var axisCount = layoutInfo.axisCount;
    var axisCollapseWidth = layoutInfo.axisCollapseWidth;
    var winInnerIndices = layoutInfo.winInnerIndices;

    var position;
    var axisNameAvailableWidth = axisCollapseWidth;
    var axisLabelShow = false;
    var nameTruncateMaxWidth;

    if (axisIndex < winInnerIndices[0]) {
        position = axisIndex * axisCollapseWidth;
        nameTruncateMaxWidth = axisCollapseWidth;
    }
    else if (axisIndex <= winInnerIndices[1]) {
        position = layoutInfo.axisExpandWindow0Pos
            + axisIndex * axisExpandWidth - layoutInfo.axisExpandWindow[0];
        axisNameAvailableWidth = axisExpandWidth;
        axisLabelShow = true;
    }
    else {
        position = layoutLength - (axisCount - 1 - axisIndex) * axisCollapseWidth;
        nameTruncateMaxWidth = axisCollapseWidth;
    }

    return {
        position: position,
        axisNameAvailableWidth: axisNameAvailableWidth,
        axisLabelShow: axisLabelShow,
        nameTruncateMaxWidth: nameTruncateMaxWidth
    };
}

export default Parallel;

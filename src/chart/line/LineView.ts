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

// FIXME step not support polar

import * as zrUtil from 'zrender/src/core/util';
import SymbolDraw from '../helper/SymbolDraw';
import SymbolClz from '../helper/Symbol';
import lineAnimationDiff from './lineAnimationDiff';
import * as graphic from '../../util/graphic';
import * as modelUtil from '../../util/model';
import { ECPolyline, ECPolygon } from './poly';
import ChartView from '../../view/Chart';
import { prepareDataCoordInfo, getStackedOnPoint } from './helper';
import { createGridClipPath, createPolarClipPath } from '../helper/createClipPathFromCoordSys';
import LineSeriesModel, { LineSeriesOption } from './LineSeries';
import type GlobalModel from '../../model/Global';
import type ExtensionAPI from '../../core/ExtensionAPI';
// TODO
import Cartesian2D from '../../coord/cartesian/Cartesian2D';
import Polar from '../../coord/polar/Polar';
import type SeriesData from '../../data/SeriesData';
import type {
    Payload,
    Dictionary,
    ColorString,
    ECElement,
    DisplayState,
    LabelOption,
    ParsedValue
} from '../../util/types';
import type OrdinalScale from '../../scale/Ordinal';
import type Axis2D from '../../coord/cartesian/Axis2D';
import { CoordinateSystemClipArea, isCoordinateSystemType } from '../../coord/CoordinateSystem';
import { setStatesStylesFromModel, setStatesFlag, toggleHoverEmphasis, SPECIAL_STATES } from '../../util/states';
import Model from '../../model/Model';
import { setLabelStyle, getLabelStatesModels, labelInner } from '../../label/labelStyle';
import { getDefaultLabel, getDefaultInterpolatedLabel } from '../helper/labelHelper';

import { getECData } from '../../util/innerStore';
import { createFloat32Array } from '../../util/vendor';
import { convertToColorString } from '../../util/format';
import { lerp } from 'zrender/src/tool/color';
import Element from 'zrender/src/Element';


type PolarArea = ReturnType<Polar['getArea']>;
type Cartesian2DArea = ReturnType<Cartesian2D['getArea']>;
interface SymbolExtended extends SymbolClz {
    __temp: boolean
}

interface ColorStop {
    offset: number
    coord?: number
    color: ColorString
}

function isPointsSame(points1: ArrayLike<number>, points2: ArrayLike<number>) {
    if (points1.length !== points2.length) {
        return;
    }
    for (let i = 0; i < points1.length; i++) {
        if (points1[i] !== points2[i]) {
            return;
        }
    }
    return true;
}

function bboxFromPoints(points: ArrayLike<number>) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < points.length;) {
        const x = points[i++];
        const y = points[i++];
        if (!isNaN(x)) {
            minX = Math.min(x, minX);
            maxX = Math.max(x, maxX);
        }
        if (!isNaN(y)) {
            minY = Math.min(y, minY);
            maxY = Math.max(y, maxY);
        }
    }
    return [
        [minX, minY],
        [maxX, maxY]
    ];
}

function getBoundingDiff(points1: ArrayLike<number>, points2: ArrayLike<number>): number {

    const [min1, max1] = bboxFromPoints(points1);
    const [min2, max2] = bboxFromPoints(points2);

    // Get a max value from each corner of two boundings.
    return Math.max(
        Math.abs(min1[0] - min2[0]),
        Math.abs(min1[1] - min2[1]),

        Math.abs(max1[0] - max2[0]),
        Math.abs(max1[1] - max2[1])
    );
}

function getSmooth(smooth: number | boolean) {
    return zrUtil.isNumber(smooth) ? smooth : (smooth ? 0.5 : 0);
}

function getStackedOnPoints(
    coordSys: Cartesian2D | Polar,
    data: SeriesData,
    dataCoordInfo: ReturnType<typeof prepareDataCoordInfo>
) {
    if (!dataCoordInfo.valueDim) {
        return [];
    }

    const len = data.count();
    const points = createFloat32Array(len * 2);
    for (let idx = 0; idx < len; idx++) {
        const pt = getStackedOnPoint(dataCoordInfo, coordSys, data, idx);
        points[idx * 2] = pt[0];
        points[idx * 2 + 1] = pt[1];
    }

    return points;
}

function turnPointsIntoStep(
    points: ArrayLike<number>,
    coordSys: Cartesian2D | Polar,
    stepTurnAt: 'start' | 'end' | 'middle',
    connectNulls: boolean
): number[] {
    const baseAxis = coordSys.getBaseAxis();
    const baseIndex = baseAxis.dim === 'x' || baseAxis.dim === 'radius' ? 0 : 1;

    const stepPoints: number[] = [];
    let i = 0;
    const stepPt: number[] = [];
    const pt: number[] = [];
    const nextPt: number[] = [];
    const filteredPoints = [];
    if (connectNulls) {
      for (i = 0; i < points.length; i += 2) {
          if (!isNaN(points[i]) && !isNaN(points[i + 1])) {
              filteredPoints.push(points[i], points[i + 1]);
          }
      }
      points = filteredPoints;
    }
    for (i = 0; i < points.length - 2; i += 2) {
        nextPt[0] = points[i + 2];
        nextPt[1] = points[i + 3];
        pt[0] = points[i];
        pt[1] = points[i + 1];
        stepPoints.push(pt[0], pt[1]);

        switch (stepTurnAt) {
            case 'end':
                stepPt[baseIndex] = nextPt[baseIndex];
                stepPt[1 - baseIndex] = pt[1 - baseIndex];
                stepPoints.push(stepPt[0], stepPt[1]);
                break;
            case 'middle':
                const middle = (pt[baseIndex] + nextPt[baseIndex]) / 2;
                const stepPt2 = [];
                stepPt[baseIndex] = stepPt2[baseIndex] = middle;
                stepPt[1 - baseIndex] = pt[1 - baseIndex];
                stepPt2[1 - baseIndex] = nextPt[1 - baseIndex];
                stepPoints.push(stepPt[0], stepPt[1]);
                stepPoints.push(stepPt2[0], stepPt2[1]);
                break;
            default:
                // default is start
                stepPt[baseIndex] = pt[baseIndex];
                stepPt[1 - baseIndex] = nextPt[1 - baseIndex];
                stepPoints.push(stepPt[0], stepPt[1]);
        }
    }
    // Last points
    stepPoints.push(points[i++], points[i++]);
    return stepPoints;
}

/**
 * Clip color stops to edge. Avoid creating too large gradients.
 * Which may lead to blurry when GPU acceleration is enabled. See #15680
 *
 * The stops has been sorted from small to large.
 */
function clipColorStops(colorStops: ColorStop[], maxSize: number): ColorStop[] {
    const newColorStops: ColorStop[] = [];
    const len = colorStops.length;
    // coord will always < 0 in prevOutOfRangeColorStop.
    let prevOutOfRangeColorStop: ColorStop;
    let prevInRangeColorStop: ColorStop;

    function lerpStop(stop0: ColorStop, stop1: ColorStop, clippedCoord: number) {
        const coord0 = stop0.coord;
        const p = (clippedCoord - coord0) / (stop1.coord - coord0);
        const color = lerp(p, [stop0.color, stop1.color]) as string;
        return { coord: clippedCoord, color } as ColorStop;
    }

    for (let i = 0; i < len; i++) {
        const stop = colorStops[i];
        const coord = stop.coord;
        if (coord < 0) {
            prevOutOfRangeColorStop = stop;
        }
        else if (coord > maxSize) {
            if (prevInRangeColorStop) {
                newColorStops.push(lerpStop(prevInRangeColorStop, stop, maxSize));
            }
            else if (prevOutOfRangeColorStop) { // If there are two stops and coord range is between these two stops
                newColorStops.push(
                    lerpStop(prevOutOfRangeColorStop, stop, 0),
                    lerpStop(prevOutOfRangeColorStop, stop, maxSize)
                );
            }
            // All following stop will be out of range. So just ignore them.
            break;
        }
        else {
            if (prevOutOfRangeColorStop) {
                newColorStops.push(lerpStop(prevOutOfRangeColorStop, stop, 0));
                // Reset
                prevOutOfRangeColorStop = null;
            }
            newColorStops.push(stop);
            prevInRangeColorStop = stop;
        }
    }
    return newColorStops;
}

function getVisualGradient(
    data: SeriesData,
    coordSys: Cartesian2D | Polar,
    api: ExtensionAPI
) {
    const visualMetaList = data.getVisual('visualMeta');
    if (!visualMetaList || !visualMetaList.length || !data.count()) {
        // When data.count() is 0, gradient range can not be calculated.
        return;
    }

    if (coordSys.type !== 'cartesian2d') {
        if (__DEV__) {
            console.warn('Visual map on line style is only supported on cartesian2d.');
        }
        return;
    }

    let coordDim: 'x' | 'y';
    let visualMeta;

    for (let i = visualMetaList.length - 1; i >= 0; i--) {
        const dimInfo = data.getDimensionInfo(visualMetaList[i].dimension);
        coordDim = (dimInfo && dimInfo.coordDim) as 'x' | 'y';
        // Can only be x or y
        if (coordDim === 'x' || coordDim === 'y') {
            visualMeta = visualMetaList[i];
            break;
        }
    }

    if (!visualMeta) {
        if (__DEV__) {
            console.warn('Visual map on line style only support x or y dimension.');
        }
        return;
    }

    // If the area to be rendered is bigger than area defined by LinearGradient,
    // the canvas spec prescribes that the color of the first stop and the last
    // stop should be used. But if two stops are added at offset 0, in effect
    // browsers use the color of the second stop to render area outside
    // LinearGradient. So we can only infinitesimally extend area defined in
    // LinearGradient to render `outerColors`.

    const axis = coordSys.getAxis(coordDim);

    // dataToCoord mapping may not be linear, but must be monotonic.
    const colorStops: ColorStop[] = zrUtil.map(visualMeta.stops, function (stop) {
        // offset will be calculated later.
        return {
            coord: axis.toGlobalCoord(axis.dataToCoord(stop.value)),
            color: stop.color
        } as ColorStop;
    });
    const stopLen = colorStops.length;
    const outerColors = visualMeta.outerColors.slice();

    if (stopLen && colorStops[0].coord > colorStops[stopLen - 1].coord) {
        colorStops.reverse();
        outerColors.reverse();
    }
    const colorStopsInRange = clipColorStops(
        colorStops, coordDim === 'x' ? api.getWidth() : api.getHeight()
    );
    const inRangeStopLen = colorStopsInRange.length;
    if (!inRangeStopLen && stopLen) {
        // All stops are out of range. All will be the same color.
        return colorStops[0].coord < 0
            ? (outerColors[1] ? outerColors[1] : colorStops[stopLen - 1].color)
            : (outerColors[0] ? outerColors[0] : colorStops[0].color);
    }

    const tinyExtent = 10; // Arbitrary value: 10px
    const minCoord = colorStopsInRange[0].coord - tinyExtent;
    const maxCoord = colorStopsInRange[inRangeStopLen - 1].coord + tinyExtent;
    const coordSpan = maxCoord - minCoord;

    if (coordSpan < 1e-3) {
        return 'transparent';
    }

    zrUtil.each(colorStopsInRange, function (stop) {
        stop.offset = (stop.coord - minCoord) / coordSpan;
    });
    colorStopsInRange.push({
        // NOTE: inRangeStopLen may still be 0 if stoplen is zero.
        offset: inRangeStopLen ? colorStopsInRange[inRangeStopLen - 1].offset : 0.5,
        color: outerColors[1] || 'transparent'
    });
    colorStopsInRange.unshift({ // notice newColorStops.length have been changed.
        offset: inRangeStopLen ? colorStopsInRange[0].offset : 0.5,
        color: outerColors[0] || 'transparent'
    });

    const gradient = new graphic.LinearGradient(0, 0, 0, 0, colorStopsInRange, true);
    gradient[coordDim] = minCoord;
    gradient[coordDim + '2' as 'x2' | 'y2'] = maxCoord;

    return gradient;
}

function getIsIgnoreFunc(
    seriesModel: LineSeriesModel,
    data: SeriesData,
    coordSys: Cartesian2D
) {
    const showAllSymbol = seriesModel.get('showAllSymbol');
    const isAuto = showAllSymbol === 'auto';

    if (showAllSymbol && !isAuto) {
        return;
    }

    const categoryAxis = coordSys.getAxesByScale('ordinal')[0];
    if (!categoryAxis) {
        return;
    }

    // Note that category label interval strategy might bring some weird effect
    // in some scenario: users may wonder why some of the symbols are not
    // displayed. So we show all symbols as possible as we can.
    if (isAuto
        // Simplify the logic, do not determine label overlap here.
        && canShowAllSymbolForCategory(categoryAxis, data)
    ) {
        return;
    }

    // Otherwise follow the label interval strategy on category axis.
    const categoryDataDim = data.mapDimension(categoryAxis.dim);
    const labelMap: Dictionary<1> = {};

    zrUtil.each(categoryAxis.getViewLabels(), function (labelItem) {
        const ordinalNumber = (categoryAxis.scale as OrdinalScale)
            .getRawOrdinalNumber(labelItem.tickValue);
        labelMap[ordinalNumber] = 1;
    });

    return function (dataIndex: number) {
        return !labelMap.hasOwnProperty(data.get(categoryDataDim, dataIndex));
    };
}

function canShowAllSymbolForCategory(
    categoryAxis: Axis2D,
    data: SeriesData
) {
    // In most cases, line is monotonous on category axis, and the label size
    // is close with each other. So we check the symbol size and some of the
    // label size alone with the category axis to estimate whether all symbol
    // can be shown without overlap.
    const axisExtent = categoryAxis.getExtent();
    let availSize = Math.abs(axisExtent[1] - axisExtent[0]) / (categoryAxis.scale as OrdinalScale).count();
    isNaN(availSize) && (availSize = 0); // 0/0 is NaN.

    // Sampling some points, max 5.
    const dataLen = data.count();
    const step = Math.max(1, Math.round(dataLen / 5));
    for (let dataIndex = 0; dataIndex < dataLen; dataIndex += step) {
        if (SymbolClz.getSymbolSize(
            data, dataIndex
            // Only for cartesian, where `isHorizontal` exists.
        )[categoryAxis.isHorizontal() ? 1 : 0]
            // Empirical number
            * 1.5 > availSize
        ) {
            return false;
        }
    }

    return true;
}


function isPointNull(x: number, y: number) {
    return isNaN(x) || isNaN(y);
}

function getLastIndexNotNull(points: ArrayLike<number>) {
    let len = points.length / 2;
    for (; len > 0; len--) {
        if (!isPointNull(points[len * 2 - 2], points[len * 2 - 1])) {
            break;
        }
    }

    return len - 1;
}

function getPointAtIndex(points: ArrayLike<number>, idx: number) {
    return [points[idx * 2], points[idx * 2 + 1]];
}

function getIndexRange(points: ArrayLike<number>, xOrY: number, dim: 'x' | 'y') {
    const len = points.length / 2;

    const dimIdx = dim === 'x' ? 0 : 1;
    let a;
    let b;
    let prevIndex = 0;
    let nextIndex = -1;
    for (let i = 0; i < len; i++) {
        b = points[i * 2 + dimIdx];
        if (isNaN(b) || isNaN(points[i * 2 + 1 - dimIdx])) {
            continue;
        }
        if (i === 0) {
            a = b;
            continue;
        }
        if (a <= xOrY && b >= xOrY || a >= xOrY && b <= xOrY) {
            nextIndex = i;
            break;
        }

        prevIndex = i;
        a = b;
    }

    return {
        range: [prevIndex, nextIndex],
        t: (xOrY - a) / (b - a)
    };
}

function anyStateShowEndLabel(
    seriesModel: LineSeriesModel
) {
    if (seriesModel.get(['endLabel', 'show'])) {
        return true;
    }
    for (let i = 0; i < SPECIAL_STATES.length; i++) {
        if (seriesModel.get([SPECIAL_STATES[i], 'endLabel', 'show'])) {
            return true;
        }
    }
    return false;
}


interface EndLabelAnimationRecord {
    lastFrameIndex: number
    originalX?: number
    originalY?: number
}

function createLineClipPath(
    lineView: LineView,
    coordSys: Cartesian2D | Polar,
    hasAnimation: boolean,
    seriesModel: LineSeriesModel
) {
    if (isCoordinateSystemType<Cartesian2D>(coordSys, 'cartesian2d')) {
        const endLabelModel = seriesModel.getModel('endLabel');
        const valueAnimation = endLabelModel.get('valueAnimation');
        const data = seriesModel.getData();

        const labelAnimationRecord: EndLabelAnimationRecord = { lastFrameIndex: 0 };

        const during = anyStateShowEndLabel(seriesModel)
            ? (percent: number, clipRect: graphic.Rect) => {
                lineView._endLabelOnDuring(
                    percent,
                    clipRect,
                    data,
                    labelAnimationRecord,
                    valueAnimation,
                    endLabelModel,
                    coordSys
                );
            }
            : null;

        const isHorizontal = coordSys.getBaseAxis().isHorizontal();
        const clipPath = createGridClipPath(coordSys, hasAnimation, seriesModel, () => {
            const endLabel = lineView._endLabel;
            if (endLabel && hasAnimation) {
                if (labelAnimationRecord.originalX != null) {
                    endLabel.attr({
                        x: labelAnimationRecord.originalX,
                        y: labelAnimationRecord.originalY
                    });
                }
            }
        }, during);
        // Expand clip shape to avoid clipping when line value exceeds axis
        if (!seriesModel.get('clip', true)) {
            const rectShape = clipPath.shape;
            const expandSize = Math.max(rectShape.width, rectShape.height);
            if (isHorizontal) {
                rectShape.y -= expandSize;
                rectShape.height += expandSize * 2;
            }
            else {
                rectShape.x -= expandSize;
                rectShape.width += expandSize * 2;
            }
        }

        // Set to the final frame. To make sure label layout is right.
        if (during) {
            during(1, clipPath);
        }
        return clipPath;
    }
    else {
        if (__DEV__) {
            if (seriesModel.get(['endLabel', 'show'])) {
                console.warn('endLabel is not supported for lines in polar systems.');
            }
        }
        return createPolarClipPath(coordSys, hasAnimation, seriesModel);
    }

}

function getEndLabelStateSpecified(endLabelModel: Model, coordSys: Cartesian2D) {
    const baseAxis = coordSys.getBaseAxis();
    const isHorizontal = baseAxis.isHorizontal();
    const isBaseInversed = baseAxis.inverse;
    const align = isHorizontal
        ? (isBaseInversed ? 'right' : 'left')
        : 'center';
    const verticalAlign = isHorizontal
        ? 'middle'
        : (isBaseInversed ? 'top' : 'bottom');

    return {
        normal: {
            align: endLabelModel.get('align') || align,
            verticalAlign: endLabelModel.get('verticalAlign') || verticalAlign
        }
    };
}

class LineView extends ChartView {

    static readonly type = 'line';

    _symbolDraw: SymbolDraw;

    _lineGroup: graphic.Group;
    _coordSys: Cartesian2D | Polar;

    _endLabel: graphic.Text;

    _polyline: ECPolyline;
    _polygon: ECPolygon;

    _stackedOnPoints: ArrayLike<number>;
    _points: ArrayLike<number>;

    _step: LineSeriesOption['step'];
    _valueOrigin: LineSeriesOption['areaStyle']['origin'];

    _clipShapeForSymbol: CoordinateSystemClipArea;

    _data: SeriesData;

    init() {
        const lineGroup = new graphic.Group();

        const symbolDraw = new SymbolDraw();
        this.group.add(symbolDraw.group);

        this._symbolDraw = symbolDraw;
        this._lineGroup = lineGroup;
    }

    render(seriesModel: LineSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const coordSys = seriesModel.coordinateSystem;
        const group = this.group;
        const data = seriesModel.getData();
        const lineStyleModel = seriesModel.getModel('lineStyle');
        const areaStyleModel = seriesModel.getModel('areaStyle');

        let points = data.getLayout('points') as number[] || [];

        const isCoordSysPolar = coordSys.type === 'polar';
        const prevCoordSys = this._coordSys;

        const symbolDraw = this._symbolDraw;
        let polyline = this._polyline;
        let polygon = this._polygon;

        const lineGroup = this._lineGroup;

        const hasAnimation = !ecModel.ssr && seriesModel.isAnimationEnabled();

        const isAreaChart = !areaStyleModel.isEmpty();

        const valueOrigin = areaStyleModel.get('origin');
        const dataCoordInfo = prepareDataCoordInfo(coordSys, data, valueOrigin);

        let stackedOnPoints = isAreaChart && getStackedOnPoints(coordSys, data, dataCoordInfo);

        const showSymbol = seriesModel.get('showSymbol');

        const connectNulls = seriesModel.get('connectNulls');

        const isIgnoreFunc = showSymbol && !isCoordSysPolar
            && getIsIgnoreFunc(seriesModel, data, coordSys as Cartesian2D);

        // Remove temporary symbols
        const oldData = this._data;
        oldData && oldData.eachItemGraphicEl(function (el: SymbolExtended, idx) {
            if (el.__temp) {
                group.remove(el);
                oldData.setItemGraphicEl(idx, null);
            }
        });

        // Remove previous created symbols if showSymbol changed to false
        if (!showSymbol) {
            symbolDraw.remove();
        }

        group.add(lineGroup);

        // FIXME step not support polar
        const step = !isCoordSysPolar ? seriesModel.get('step') : false;
        let clipShapeForSymbol: PolarArea | Cartesian2DArea;
        if (coordSys && coordSys.getArea && seriesModel.get('clip', true)) {
            clipShapeForSymbol = coordSys.getArea();
            // Avoid float number rounding error for symbol on the edge of axis extent.
            // See #7913 and `test/dataZoom-clip.html`.
            if ((clipShapeForSymbol as Cartesian2DArea).width != null) {
                (clipShapeForSymbol as Cartesian2DArea).x -= 0.1;
                (clipShapeForSymbol as Cartesian2DArea).y -= 0.1;
                (clipShapeForSymbol as Cartesian2DArea).width += 0.2;
                (clipShapeForSymbol as Cartesian2DArea).height += 0.2;
            }
            else if ((clipShapeForSymbol as PolarArea).r0) {
                (clipShapeForSymbol as PolarArea).r0 -= 0.5;
                (clipShapeForSymbol as PolarArea).r += 0.5;
            }
        }
        this._clipShapeForSymbol = clipShapeForSymbol;
        const visualColor = getVisualGradient(data, coordSys, api)
            || data.getVisual('style')[data.getVisual('drawType')];
        // Initialization animation or coordinate system changed
        if (
            !(polyline && prevCoordSys.type === coordSys.type && step === this._step)
        ) {
            showSymbol && symbolDraw.updateData(data, {
                isIgnore: isIgnoreFunc,
                clipShape: clipShapeForSymbol,
                disableAnimation: true,
                getSymbolPoint(idx) {
                    return [points[idx * 2], points[idx * 2 + 1]];
                }
            });

            hasAnimation && this._initSymbolLabelAnimation(
                data,
                coordSys,
                clipShapeForSymbol
            );

            if (step) {
                // TODO If stacked series is not step
                points = turnPointsIntoStep(points, coordSys, step, connectNulls);

                if (stackedOnPoints) {
                    stackedOnPoints = turnPointsIntoStep(stackedOnPoints, coordSys, step, connectNulls);
                }
            }

            polyline = this._newPolyline(points);
            if (isAreaChart) {
                polygon = this._newPolygon(
                    points, stackedOnPoints
                );
            }// If areaStyle is removed
            else if (polygon) {
                lineGroup.remove(polygon);
                polygon = this._polygon = null;
            }

            // NOTE: Must update _endLabel before setClipPath.
            if (!isCoordSysPolar) {
                this._initOrUpdateEndLabel(seriesModel, coordSys as Cartesian2D, convertToColorString(visualColor));
            }

            lineGroup.setClipPath(
                createLineClipPath(this, coordSys, true, seriesModel)
            );
        }
        else {
            if (isAreaChart && !polygon) {
                // If areaStyle is added
                polygon = this._newPolygon(
                    points, stackedOnPoints
                );
            }
            else if (polygon && !isAreaChart) {
                // If areaStyle is removed
                lineGroup.remove(polygon);
                polygon = this._polygon = null;
            }

            // NOTE: Must update _endLabel before setClipPath.
            if (!isCoordSysPolar) {
                this._initOrUpdateEndLabel(seriesModel, coordSys as Cartesian2D, convertToColorString(visualColor));
            }

            // Update clipPath
            const oldClipPath = lineGroup.getClipPath();
            if (oldClipPath) {
                const newClipPath = createLineClipPath(this, coordSys, false, seriesModel);
                graphic.initProps(oldClipPath, {
                    shape: newClipPath.shape
                }, seriesModel);
            }
            else {
                lineGroup.setClipPath(
                    createLineClipPath(this, coordSys, true, seriesModel)
                );
            }

            // Always update, or it is wrong in the case turning on legend
            // because points are not changed.
            showSymbol && symbolDraw.updateData(data, {
                isIgnore: isIgnoreFunc,
                clipShape: clipShapeForSymbol,
                disableAnimation: true,
                getSymbolPoint(idx) {
                    return [points[idx * 2], points[idx * 2 + 1]];
                }
            });

            // In the case data zoom triggered refreshing frequently
            // Data may not change if line has a category axis. So it should animate nothing.
            if (!isPointsSame(this._stackedOnPoints, stackedOnPoints)
                || !isPointsSame(this._points, points)
            ) {
                if (hasAnimation) {
                    this._doUpdateAnimation(
                        data, stackedOnPoints, coordSys, api, step, valueOrigin, connectNulls
                    );
                }
                else {
                    // Not do it in update with animation
                    if (step) {
                        // TODO If stacked series is not step
                        points = turnPointsIntoStep(points, coordSys, step, connectNulls);
                        if (stackedOnPoints) {
                            stackedOnPoints = turnPointsIntoStep(stackedOnPoints, coordSys, step, connectNulls);
                        }
                    }

                    polyline.setShape({
                        points: points
                    });
                    polygon && polygon.setShape({
                        points: points,
                        stackedOnPoints: stackedOnPoints
                    });
                }
            }
        }

        const emphasisModel = seriesModel.getModel('emphasis');
        const focus = emphasisModel.get('focus');
        const blurScope = emphasisModel.get('blurScope');
        const emphasisDisabled = emphasisModel.get('disabled');

        polyline.useStyle(zrUtil.defaults(
            // Use color in lineStyle first
            lineStyleModel.getLineStyle(),
            {
                fill: 'none',
                stroke: visualColor,
                lineJoin: 'bevel' as CanvasLineJoin
            }
        ));

        setStatesStylesFromModel(polyline, seriesModel, 'lineStyle');

        if (polyline.style.lineWidth > 0 && seriesModel.get(['emphasis', 'lineStyle', 'width']) === 'bolder') {
            const emphasisLineStyle = polyline.getState('emphasis').style;
            emphasisLineStyle.lineWidth = +polyline.style.lineWidth + 1;
        }

        // Needs seriesIndex for focus
        getECData(polyline).seriesIndex = seriesModel.seriesIndex;
        toggleHoverEmphasis(polyline, focus, blurScope, emphasisDisabled);

        const smooth = getSmooth(seriesModel.get('smooth'));
        const smoothMonotone = seriesModel.get('smoothMonotone');

        polyline.setShape({
            smooth,
            smoothMonotone,
            connectNulls
        });

        if (polygon) {
            const stackedOnSeries = data.getCalculationInfo('stackedOnSeries');
            let stackedOnSmooth = 0;

            polygon.useStyle(zrUtil.defaults(
                areaStyleModel.getAreaStyle(),
                {
                    fill: visualColor,
                    opacity: 0.7,
                    lineJoin: 'bevel' as CanvasLineJoin,
                    decal: data.getVisual('style').decal
                }
            ));

            if (stackedOnSeries) {
                stackedOnSmooth = getSmooth(stackedOnSeries.get('smooth'));
            }

            polygon.setShape({
                smooth,
                stackedOnSmooth,
                smoothMonotone,
                connectNulls
            });

            setStatesStylesFromModel(polygon, seriesModel, 'areaStyle');
            // Needs seriesIndex for focus
            getECData(polygon).seriesIndex = seriesModel.seriesIndex;
            toggleHoverEmphasis(polygon, focus, blurScope, emphasisDisabled);
        }

        const changePolyState = (toState: DisplayState) => {
            this._changePolyState(toState);
        };

        data.eachItemGraphicEl(function (el) {
            // Switch polyline / polygon state if element changed its state.
            el && ((el as ECElement).onHoverStateChange = changePolyState);
        });

        (this._polyline as ECElement).onHoverStateChange = changePolyState;

        this._data = data;
        // Save the coordinate system for transition animation when data changed
        this._coordSys = coordSys;
        this._stackedOnPoints = stackedOnPoints;
        this._points = points;
        this._step = step;
        this._valueOrigin = valueOrigin;

        if (seriesModel.get('triggerLineEvent')) {
            this.packEventData(seriesModel, polyline);
            polygon && this.packEventData(seriesModel, polygon);
        }
    }

    private packEventData(seriesModel: LineSeriesModel, el: Element) {
        getECData(el).eventData = {
            componentType: 'series',
            componentSubType: 'line',
            componentIndex: seriesModel.componentIndex,
            seriesIndex: seriesModel.seriesIndex,
            seriesName: seriesModel.name,
            seriesType: 'line'
        };
    }

    highlight(
        seriesModel: LineSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ) {
        const data = seriesModel.getData();
        const dataIndex = modelUtil.queryDataIndex(data, payload);

        this._changePolyState('emphasis');

        if (!(dataIndex instanceof Array) && dataIndex != null && dataIndex >= 0) {
            const points = data.getLayout('points');
            let symbol = data.getItemGraphicEl(dataIndex) as SymbolClz;
            if (!symbol) {
                // Create a temporary symbol if it is not exists
                const x = points[dataIndex * 2];
                const y = points[dataIndex * 2 + 1];
                if (isNaN(x) || isNaN(y)) {
                    // Null data
                    return;
                }
                // fix #11360: shouldn't draw symbol outside clipShapeForSymbol
                if (this._clipShapeForSymbol && !this._clipShapeForSymbol.contain(x, y)) {
                    return;
                }
                const zlevel = seriesModel.get('zlevel') || 0;
                const z = seriesModel.get('z') || 0;
                symbol = new SymbolClz(data, dataIndex);
                symbol.x = x;
                symbol.y = y;
                symbol.setZ(zlevel, z);

                // ensure label text of the temporary symbol is in front of line and area polygon
                const symbolLabel = symbol.getSymbolPath().getTextContent();
                if (symbolLabel) {
                    symbolLabel.zlevel = zlevel;
                    symbolLabel.z = z;
                    symbolLabel.z2 = this._polyline.z2 + 1;
                }

                (symbol as SymbolExtended).__temp = true;
                data.setItemGraphicEl(dataIndex, symbol);

                // Stop scale animation
                symbol.stopSymbolAnimation(true);

                this.group.add(symbol);
            }
            symbol.highlight();
        }
        else {
            // Highlight whole series
            ChartView.prototype.highlight.call(
                this, seriesModel, ecModel, api, payload
            );
        }
    }

    downplay(
        seriesModel: LineSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ) {
        const data = seriesModel.getData();
        const dataIndex = modelUtil.queryDataIndex(data, payload) as number;

        this._changePolyState('normal');

        if (dataIndex != null && dataIndex >= 0) {
            const symbol = data.getItemGraphicEl(dataIndex) as SymbolExtended;
            if (symbol) {
                if (symbol.__temp) {
                    data.setItemGraphicEl(dataIndex, null);
                    this.group.remove(symbol);
                }
                else {
                    symbol.downplay();
                }
            }
        }
        else {
            // FIXME
            // can not downplay completely.
            // Downplay whole series
            ChartView.prototype.downplay.call(
                this, seriesModel, ecModel, api, payload
            );
        }
    }

    _changePolyState(toState: DisplayState) {
        const polygon = this._polygon;
        setStatesFlag(this._polyline, toState);
        polygon && setStatesFlag(polygon, toState);
    }

    _newPolyline(points: ArrayLike<number>) {
        let polyline = this._polyline;
        // Remove previous created polyline
        if (polyline) {
            this._lineGroup.remove(polyline);
        }

        polyline = new ECPolyline({
            shape: {
                points
            },
            segmentIgnoreThreshold: 2,
            z2: 10
        });

        this._lineGroup.add(polyline);

        this._polyline = polyline;

        return polyline;
    }

    _newPolygon(points: ArrayLike<number>, stackedOnPoints: ArrayLike<number>) {
        let polygon = this._polygon;
        // Remove previous created polygon
        if (polygon) {
            this._lineGroup.remove(polygon);
        }

        polygon = new ECPolygon({
            shape: {
                points,
                stackedOnPoints: stackedOnPoints
            },
            segmentIgnoreThreshold: 2
        });

        this._lineGroup.add(polygon);

        this._polygon = polygon;
        return polygon;
    }

    _initSymbolLabelAnimation(
        data: SeriesData,
        coordSys: Polar | Cartesian2D,
        clipShape: PolarArea | Cartesian2DArea
    ) {
        let isHorizontalOrRadial: boolean;
        let isCoordSysPolar: boolean;
        const baseAxis = coordSys.getBaseAxis();
        const isAxisInverse = baseAxis.inverse;
        if (coordSys.type === 'cartesian2d') {
            isHorizontalOrRadial = (baseAxis as Axis2D).isHorizontal();
            isCoordSysPolar = false;
        }
        else if (coordSys.type === 'polar') {
            isHorizontalOrRadial = baseAxis.dim === 'angle';
            isCoordSysPolar = true;
        }

        const seriesModel = data.hostModel;
        let seriesDuration = seriesModel.get('animationDuration');
        if (zrUtil.isFunction(seriesDuration)) {
            seriesDuration = seriesDuration(null);
        }
        const seriesDelay = seriesModel.get('animationDelay') || 0;
        const seriesDelayValue = zrUtil.isFunction(seriesDelay)
            ? seriesDelay(null)
            : seriesDelay;

        data.eachItemGraphicEl(function (symbol: SymbolExtended, idx) {
            const el = symbol;
            if (el) {
                const point = [symbol.x, symbol.y];
                let start;
                let end;
                let current;
                if (clipShape) {
                    if (isCoordSysPolar) {
                        const polarClip = clipShape as PolarArea;
                        const coord = (coordSys as Polar).pointToCoord(point);
                        if (isHorizontalOrRadial) {
                            start = polarClip.startAngle;
                            end = polarClip.endAngle;
                            current = -coord[1] / 180 * Math.PI;
                        }
                        else {
                            start = polarClip.r0;
                            end = polarClip.r;
                            current = coord[0];
                        }
                    }
                    else {
                        const gridClip = clipShape as Cartesian2DArea;
                        if (isHorizontalOrRadial) {
                            start = gridClip.x;
                            end = gridClip.x + gridClip.width;
                            current = symbol.x;
                        }
                        else {
                            start = gridClip.y + gridClip.height;
                            end = gridClip.y;
                            current = symbol.y;
                        }
                    }
                }
                let ratio = end === start ? 0 : (current - start) / (end - start);
                if (isAxisInverse) {
                    ratio = 1 - ratio;
                }

                const delay = zrUtil.isFunction(seriesDelay) ? seriesDelay(idx)
                    : (seriesDuration * ratio) + seriesDelayValue;

                const symbolPath = el.getSymbolPath();
                const text = symbolPath.getTextContent();

                el.attr({ scaleX: 0, scaleY: 0 });
                el.animateTo({
                    scaleX: 1,
                    scaleY: 1
                }, {
                    duration: 200,
                    setToFinal: true,
                    delay: delay
                });

                if (text) {
                    text.animateFrom({
                        style: {
                            opacity: 0
                        }
                    }, {
                        duration: 300,
                        delay: delay
                    });
                }

                (symbolPath as ECElement).disableLabelAnimation = true;
            }
        });
    }

    _initOrUpdateEndLabel(
        seriesModel: LineSeriesModel,
        coordSys: Cartesian2D,
        inheritColor: string
    ) {
        const endLabelModel = seriesModel.getModel('endLabel');

        if (anyStateShowEndLabel(seriesModel)) {
            const data = seriesModel.getData();
            const polyline = this._polyline;
            // series may be filtered.
            const points = data.getLayout('points');
            if (!points) {
                polyline.removeTextContent();
                this._endLabel = null;
                return;
            }
            let endLabel = this._endLabel;
            if (!endLabel) {
                endLabel = this._endLabel = new graphic.Text({
                    z2: 200 // should be higher than item symbol
                });
                endLabel.ignoreClip = true;
                polyline.setTextContent(this._endLabel);
                (polyline as ECElement).disableLabelAnimation = true;
            }

            // Find last non-NaN data to display data
            const dataIndex = getLastIndexNotNull(points);
            if (dataIndex >= 0) {
                setLabelStyle(
                    polyline,
                    getLabelStatesModels(seriesModel, 'endLabel'),
                    {
                        inheritColor,
                        labelFetcher: seriesModel,
                        labelDataIndex: dataIndex,
                        defaultText(dataIndex, opt, interpolatedValue) {
                            return interpolatedValue != null
                                ? getDefaultInterpolatedLabel(data, interpolatedValue)
                                : getDefaultLabel(data, dataIndex);
                        },
                        enableTextSetter: true
                    },
                    getEndLabelStateSpecified(endLabelModel, coordSys)
                );
                polyline.textConfig.position = null;
            }
        }
        else if (this._endLabel) {
            this._polyline.removeTextContent();
            this._endLabel = null;
        }
    }

    _endLabelOnDuring(
        percent: number,
        clipRect: graphic.Rect,
        data: SeriesData,
        animationRecord: EndLabelAnimationRecord,
        valueAnimation: boolean,
        endLabelModel: Model<LabelOption>,
        coordSys: Cartesian2D
    ) {
        const endLabel = this._endLabel;
        const polyline = this._polyline;

        if (endLabel) {
            // NOTE: Don't remove percent < 1. percent === 1 means the first frame during render.
            // The label is not prepared at this time.
            if (percent < 1 && animationRecord.originalX == null) {
                animationRecord.originalX = endLabel.x;
                animationRecord.originalY = endLabel.y;
            }

            const points = data.getLayout('points');

            const seriesModel = data.hostModel as LineSeriesModel;
            const connectNulls = seriesModel.get('connectNulls');
            const precision = endLabelModel.get('precision');
            const distance = endLabelModel.get('distance') || 0;

            const baseAxis = coordSys.getBaseAxis();
            const isHorizontal = baseAxis.isHorizontal();
            const isBaseInversed = baseAxis.inverse;
            const clipShape = clipRect.shape;

            const xOrY = isBaseInversed
                ? isHorizontal ? clipShape.x : (clipShape.y + clipShape.height)
                : isHorizontal ? (clipShape.x + clipShape.width) : clipShape.y;
            const distanceX = (isHorizontal ? distance : 0) * (isBaseInversed ? -1 : 1);
            const distanceY = (isHorizontal ? 0 : -distance) * (isBaseInversed ? -1 : 1);
            const dim = isHorizontal ? 'x' : 'y';

            const dataIndexRange = getIndexRange(points, xOrY, dim);
            const indices = dataIndexRange.range;

            const diff = indices[1] - indices[0];
            let value: ParsedValue;
            if (diff >= 1) {
                // diff > 1 && connectNulls, which is on the null data.
                if (diff > 1 && !connectNulls) {
                    const pt = getPointAtIndex(points, indices[0]);
                    endLabel.attr({
                        x: pt[0] + distanceX,
                        y: pt[1] + distanceY
                    });
                    valueAnimation && (value = seriesModel.getRawValue(indices[0]) as ParsedValue);
                }
                else {
                    const pt = polyline.getPointOn(xOrY, dim);
                    pt && endLabel.attr({
                        x: pt[0] + distanceX,
                        y: pt[1] + distanceY
                    });

                    const startValue = seriesModel.getRawValue(indices[0]) as ParsedValue;
                    const endValue = seriesModel.getRawValue(indices[1]) as ParsedValue;
                    valueAnimation && (value = modelUtil.interpolateRawValues(
                        data, precision, startValue, endValue, dataIndexRange.t
                    ) as ParsedValue);
                }
                animationRecord.lastFrameIndex = indices[0];
            }
            else {
                // If diff <= 0, which is the range is not found(Include NaN)
                // Choose the first point or last point.
                const idx = (percent === 1 || animationRecord.lastFrameIndex > 0) ? indices[0] : 0;
                const pt = getPointAtIndex(points, idx);
                valueAnimation && (value = seriesModel.getRawValue(idx) as ParsedValue);
                endLabel.attr({
                    x: pt[0] + distanceX,
                    y: pt[1] + distanceY
                });
            }
            if (valueAnimation) {
                const inner = labelInner(endLabel);
                if (typeof inner.setLabelText === 'function') {
                    inner.setLabelText(value);
                }
            }
        }
    }

    /**
     * @private
     */
    // FIXME Two value axis
    _doUpdateAnimation(
        data: SeriesData,
        stackedOnPoints: ArrayLike<number>,
        coordSys: Cartesian2D | Polar,
        api: ExtensionAPI,
        step: LineSeriesOption['step'],
        valueOrigin: LineSeriesOption['areaStyle']['origin'],
        connectNulls: boolean
    ) {
        const polyline = this._polyline;
        const polygon = this._polygon;
        const seriesModel = data.hostModel;

        const diff = lineAnimationDiff(
            this._data, data,
            this._stackedOnPoints, stackedOnPoints,
            this._coordSys, coordSys,
            this._valueOrigin, valueOrigin
        );

        let current = diff.current;
        let stackedOnCurrent = diff.stackedOnCurrent;
        let next = diff.next;
        let stackedOnNext = diff.stackedOnNext;
        if (step) {
            // TODO If stacked series is not step
            current = turnPointsIntoStep(diff.current, coordSys, step, connectNulls);
            stackedOnCurrent = turnPointsIntoStep(diff.stackedOnCurrent, coordSys, step, connectNulls);
            next = turnPointsIntoStep(diff.next, coordSys, step, connectNulls);
            stackedOnNext = turnPointsIntoStep(diff.stackedOnNext, coordSys, step, connectNulls);
        }
        // Don't apply animation if diff is large.
        // For better result and avoid memory explosion problems like
        // https://github.com/apache/incubator-echarts/issues/12229
        if (getBoundingDiff(current, next) > 3000
            || (polygon && getBoundingDiff(stackedOnCurrent, stackedOnNext) > 3000)
        ) {
            polyline.stopAnimation();
            polyline.setShape({
                points: next
            });
            if (polygon) {
                polygon.stopAnimation();
                polygon.setShape({
                    points: next,
                    stackedOnPoints: stackedOnNext
                });
            }
            return;
        }

        (polyline.shape as any).__points = diff.current;
        polyline.shape.points = current;

        const target = {
            shape: {
                points: next
            }
        };
        // Also animate the original points.
        // If points reference is changed when turning into step line.
        if (diff.current !== current) {
            (target.shape as any).__points = diff.next;
        }

        // Stop previous animation.
        polyline.stopAnimation();
        graphic.updateProps(polyline, target, seriesModel);

        if (polygon) {
            polygon.setShape({
                // Reuse the points with polyline.
                points: current,
                stackedOnPoints: stackedOnCurrent
            });
            polygon.stopAnimation();
            graphic.updateProps(polygon, {
                shape: {
                    stackedOnPoints: stackedOnNext
                }
            }, seriesModel);
            // If use attr directly in updateProps.
            if (polyline.shape.points !== polygon.shape.points) {
                polygon.shape.points = polyline.shape.points;
            }
        }

        const updatedDataInfo: {
            el: SymbolExtended,
            ptIdx: number
        }[] = [];
        const diffStatus = diff.status;

        for (let i = 0; i < diffStatus.length; i++) {
            const cmd = diffStatus[i].cmd;
            if (cmd === '=') {
                const el = data.getItemGraphicEl(diffStatus[i].idx1) as SymbolExtended;
                if (el) {
                    updatedDataInfo.push({
                        el: el,
                        ptIdx: i    // Index of points
                    });
                }
            }
        }
        if (polyline.animators && polyline.animators.length) {
            polyline.animators[0].during(function () {
                polygon && polygon.dirtyShape();
                const points = (polyline.shape as any).__points;
                for (let i = 0; i < updatedDataInfo.length; i++) {
                    const el = updatedDataInfo[i].el;
                    const offset = updatedDataInfo[i].ptIdx * 2;
                    el.x = points[offset];
                    el.y = points[offset + 1];
                    el.markRedraw();
                }
            });
        }
    }

    remove(ecModel: GlobalModel) {
        const group = this.group;
        const oldData = this._data;
        this._lineGroup.removeAll();
        this._symbolDraw.remove(true);
        // Remove temporary created elements when highlighting
        oldData && oldData.eachItemGraphicEl(function (el: SymbolExtended, idx) {
            if (el.__temp) {
                group.remove(el);
                oldData.setItemGraphicEl(idx, null);
            }
        });

        this._polyline =
            this._polygon =
            this._coordSys =
            this._points =
            this._stackedOnPoints =
            this._endLabel =
            this._data = null;
    }
}

export default LineView;

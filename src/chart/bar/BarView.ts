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

import {__DEV__} from '../../config';
import * as zrUtil from 'zrender/src/core/util';
import {Rect, Sector, getECData, updateProps, initProps, setHoverStyle} from '../../util/graphic';
import {setLabel} from './helper';
import {getBarItemStyle} from './barItemStyle';
import Path, { PathProps } from 'zrender/src/graphic/Path';
import Group from 'zrender/src/container/Group';
import {throttle} from '../../util/throttle';
import {createClipPath} from '../helper/createClipPathFromCoordSys';
import Sausage from '../../util/shape/sausage';
import ChartView from '../../view/Chart';
import List from '../../data/List';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { StageHandlerProgressParams, ZRElementEvent } from '../../util/types';
import BarSeriesModel, { BarSeriesOption, BarDataItemOption } from './BarSeries';
import type Axis2D from '../../coord/cartesian/Axis2D';
import type Cartesian2D from '../../coord/cartesian/Cartesian2D';
import type { RectLike } from 'zrender/src/core/BoundingRect';
import type Model from '../../model/Model';
import { isCoordinateSystemType } from '../../coord/CoordinateSystem';

const BAR_BORDER_WIDTH_QUERY = ['itemStyle', 'borderWidth'] as const;
const _eventPos = [0, 0];

const mathMax = Math.max;
const mathMin = Math.min;

type CoordSysOfBar = BarSeriesModel['coordinateSystem'];
type RectShape = Rect['shape']
type SectorShape = Sector['shape']

type SectorLayout = SectorShape;
type RectLayout = RectShape;

type BarPossiblePath = Sector | Rect | Sausage


function getClipArea(coord: CoordSysOfBar, data: List) {
    if (isCoordinateSystemType<Cartesian2D>(coord, 'cartesian2d')) {
        var coordSysClipArea = coord.getArea && coord.getArea();
        var baseAxis = coord.getBaseAxis();
        // When boundaryGap is false or using time axis. bar may exceed the grid.
        // We should not clip this part.
        // See test/bar2.html
        if (baseAxis.type !== 'category' || !baseAxis.onBand) {
            var expandWidth = data.getLayout('bandWidth');
            if (baseAxis.isHorizontal()) {
                coordSysClipArea.x -= expandWidth;
                coordSysClipArea.width += expandWidth * 2;
            }
            else {
                coordSysClipArea.y -= expandWidth;
                coordSysClipArea.height += expandWidth * 2;
            }
        }
    }

    return coordSysClipArea;
}


class BarView extends ChartView {
    static type = 'bar' as const
    type = BarView.type

    _data: List

    _isLargeDraw: boolean

    _backgroundGroup: Group

    _backgroundEls: (Rect | Sector)[]

    render(seriesModel: BarSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this._updateDrawMode(seriesModel);

        var coordinateSystemType = seriesModel.get('coordinateSystem');

        if (coordinateSystemType === 'cartesian2d'
            || coordinateSystemType === 'polar'
        ) {
            this._isLargeDraw
                ? this._renderLarge(seriesModel, ecModel, api)
                : this._renderNormal(seriesModel, ecModel, api);
        }
        else if (__DEV__) {
            console.warn('Only cartesian2d and polar supported for bar.');
        }

        return this.group;
    }

    incrementalPrepareRender(seriesModel: BarSeriesModel) {
        this._clear();
        this._updateDrawMode(seriesModel);
    }

    incrementalRender(
        params: StageHandlerProgressParams, seriesModel: BarSeriesModel) {
        // Do not support progressive in normal mode.
        this._incrementalRenderLarge(params, seriesModel);
    }

    _updateDrawMode(seriesModel: BarSeriesModel) {
        var isLargeDraw = seriesModel.pipelineContext.large;
        if (this._isLargeDraw == null || isLargeDraw !== this._isLargeDraw) {
            this._isLargeDraw = isLargeDraw;
            this._clear();
        }
    }

    _renderNormal(seriesModel: BarSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        var group = this.group;
        var data = seriesModel.getData();
        var oldData = this._data;

        var coord = seriesModel.coordinateSystem;
        var baseAxis = coord.getBaseAxis();
        var isHorizontalOrRadial: boolean;

        if (coord.type === 'cartesian2d') {
            isHorizontalOrRadial = (baseAxis as Axis2D).isHorizontal();
        }
        else if (coord.type === 'polar') {
            isHorizontalOrRadial = baseAxis.dim === 'angle';
        }

        var animationModel = seriesModel.isAnimationEnabled() ? seriesModel : null;

        var needsClip = seriesModel.get('clip', true);
        var coordSysClipArea = getClipArea(coord, data);
        // If there is clipPath created in large mode. Remove it.
        group.removeClipPath();
        // We don't use clipPath in normal mode because we needs a perfect animation
        // And don't want the label are clipped.

        var roundCap = seriesModel.get('roundCap', true);

        var drawBackground = seriesModel.get('showBackground', true);
        var backgroundModel = seriesModel.getModel('backgroundStyle');

        var bgEls: BarView['_backgroundEls'] = [];
        var oldBgEls = this._backgroundEls;

        data.diff(oldData)
            .add(function (dataIndex) {
                var itemModel = data.getItemModel(dataIndex);
                var layout = getLayout[coord.type](data, dataIndex, itemModel);

                if (drawBackground) {
                    var bgEl = createBackgroundEl(
                        coord, isHorizontalOrRadial, layout
                    );
                    bgEl.useStyle(getBarItemStyle(backgroundModel));
                    bgEls[dataIndex] = bgEl;
                }

                // If dataZoom in filteMode: 'empty', the baseValue can be set as NaN in "axisProxy".
                if (!data.hasValue(dataIndex)) {
                    return;
                }

                if (needsClip) {
                    // Clip will modify the layout params.
                    // And return a boolean to determine if the shape are fully clipped.
                    var isClipped = clip[coord.type](coordSysClipArea, layout);
                    if (isClipped) {
                        group.remove(el);
                        return;
                    }
                }

                var el = elementCreator[coord.type](
                    dataIndex, layout, isHorizontalOrRadial, animationModel, false, roundCap
                );
                data.setItemGraphicEl(dataIndex, el);
                group.add(el);

                updateStyle(
                    el, data, dataIndex, itemModel, layout,
                    seriesModel, isHorizontalOrRadial, coord.type === 'polar'
                );
            })
            .update(function (newIndex, oldIndex) {
                var itemModel = data.getItemModel(newIndex);
                var layout = getLayout[coord.type](data, newIndex, itemModel);

                if (drawBackground) {
                    var bgEl = oldBgEls[oldIndex];
                    bgEl.useStyle(getBarItemStyle(backgroundModel));
                    bgEls[newIndex] = bgEl;

                    var shape = createBackgroundShape(isHorizontalOrRadial, layout, coord);
                    updateProps(
                        bgEl as Path, { shape: shape }, animationModel, newIndex
                    );
                }

                var el = oldData.getItemGraphicEl(oldIndex) as BarPossiblePath;
                if (!data.hasValue(newIndex)) {
                    group.remove(el);
                    return;
                }

                if (needsClip) {
                    var isClipped = clip[coord.type](coordSysClipArea, layout);
                    if (isClipped) {
                        group.remove(el);
                        return;
                    }
                }

                if (el) {
                    updateProps(el as Path, {
                        shape: layout
                    }, animationModel, newIndex);
                }
                else {
                    el = elementCreator[coord.type](
                        newIndex, layout, isHorizontalOrRadial, animationModel, true, roundCap
                    );
                }

                data.setItemGraphicEl(newIndex, el);
                // Add back
                group.add(el);

                updateStyle(
                    el, data, newIndex, itemModel, layout,
                    seriesModel, isHorizontalOrRadial, coord.type === 'polar'
                );
            })
            .remove(function (dataIndex) {
                var el = oldData.getItemGraphicEl(dataIndex);
                if (coord.type === 'cartesian2d') {
                    el && removeRect(dataIndex, animationModel, el as Rect);
                }
                else {
                    el && removeSector(dataIndex, animationModel, el as Sector);
                }
            })
            .execute();

        var bgGroup = this._backgroundGroup || (this._backgroundGroup = new Group());
        bgGroup.removeAll();

        for (var i = 0; i < bgEls.length; ++i) {
            bgGroup.add(bgEls[i]);
        }
        group.add(bgGroup);
        this._backgroundEls = bgEls;

        this._data = data;
    }

    _renderLarge(seriesModel: BarSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this._clear();
        createLarge(seriesModel, this.group);

        // Use clipPath in large mode.
        var clipPath = seriesModel.get('clip', true)
            ? createClipPath(seriesModel.coordinateSystem, false, seriesModel)
            : null;
        if (clipPath) {
            this.group.setClipPath(clipPath);
        }
        else {
            this.group.removeClipPath();
        }
    }

    _incrementalRenderLarge(params: StageHandlerProgressParams, seriesModel: BarSeriesModel) {
        this._removeBackground();
        createLarge(seriesModel, this.group, true);
    }

    remove(ecModel?: GlobalModel) {
        this._clear(ecModel);
    }

    _clear(ecModel?: GlobalModel) {
        var group = this.group;
        var data = this._data;
        if (ecModel && ecModel.get('animation') && data && !this._isLargeDraw) {
            this._removeBackground();
            this._backgroundEls = [];

            data.eachItemGraphicEl(function (el: Sector | Rect) {
                if (el.type === 'sector') {
                    removeSector(getECData(el).dataIndex, ecModel, el as (Sector));
                }
                else {
                    removeRect(getECData(el).dataIndex, ecModel, el as (Rect));
                }
            });
        }
        else {
            group.removeAll();
        }
        this._data = null;
    }

    _removeBackground() {
        this.group.remove(this._backgroundGroup);
        this._backgroundGroup = null;
    }
}

interface Clipper {
    (coordSysBoundingRect: RectLike, layout: RectLayout | SectorLayout): boolean
}
var clip: {
    [key in 'cartesian2d' | 'polar']: Clipper
} = {
    cartesian2d(coordSysBoundingRect: RectLike, layout: Rect['shape']) {
        var signWidth = layout.width < 0 ? -1 : 1;
        var signHeight = layout.height < 0 ? -1 : 1;
        // Needs positive width and height
        if (signWidth < 0) {
            layout.x += layout.width;
            layout.width = -layout.width;
        }
        if (signHeight < 0) {
            layout.y += layout.height;
            layout.height = -layout.height;
        }

        var x = mathMax(layout.x, coordSysBoundingRect.x);
        var x2 = mathMin(layout.x + layout.width, coordSysBoundingRect.x + coordSysBoundingRect.width);
        var y = mathMax(layout.y, coordSysBoundingRect.y);
        var y2 = mathMin(layout.y + layout.height, coordSysBoundingRect.y + coordSysBoundingRect.height);

        layout.x = x;
        layout.y = y;
        layout.width = x2 - x;
        layout.height = y2 - y;

        var clipped = layout.width < 0 || layout.height < 0;

        // Reverse back
        if (signWidth < 0) {
            layout.x += layout.width;
            layout.width = -layout.width;
        }
        if (signHeight < 0) {
            layout.y += layout.height;
            layout.height = -layout.height;
        }

        return clipped;
    },

    polar() {
        return false;
    }
};

interface ElementCreator {
    (
        dataIndex: number, layout: RectLayout | SectorLayout, isHorizontalOrRadial: boolean,
        animationModel: BarSeriesModel, isUpdate: boolean, roundCap?: boolean
    ): BarPossiblePath
}

var elementCreator: {
    [key in 'polar' | 'cartesian2d']: ElementCreator
} = {

    cartesian2d(
        dataIndex, layout: RectLayout, isHorizontal,
        animationModel, isUpdate
    ) {
        var rect = new Rect({
            shape: zrUtil.extend({}, layout),
            z2: 1
        });

        rect.name = 'item';

        // Animation
        if (animationModel) {
            var rectShape = rect.shape;
            var animateProperty = isHorizontal ? 'height' : 'width' as 'width' | 'height';
            var animateTarget = {} as RectShape;
            rectShape[animateProperty] = 0;
            animateTarget[animateProperty] = layout[animateProperty];
            (isUpdate ? updateProps : initProps)(rect, {
                shape: animateTarget
            }, animationModel, dataIndex);
        }

        return rect;
    },

    polar(
        dataIndex: number, layout: SectorLayout, isRadial: boolean,
        animationModel, isUpdate, roundCap
    ) {
        // Keep the same logic with bar in catesion: use end value to control
        // direction. Notice that if clockwise is true (by default), the sector
        // will always draw clockwisely, no matter whether endAngle is greater
        // or less than startAngle.
        var clockwise = layout.startAngle < layout.endAngle;

        var ShapeClass = (!isRadial && roundCap) ? Sausage : Sector;

        var sector = new ShapeClass({
            shape: zrUtil.defaults({clockwise: clockwise}, layout),
            z2: 1
        });

        sector.name = 'item';

        // Animation
        if (animationModel) {
            var sectorShape = sector.shape;
            var animateProperty = isRadial ? 'r' : 'endAngle' as 'r' | 'endAngle';
            var animateTarget = {} as SectorShape;
            sectorShape[animateProperty] = isRadial ? 0 : layout.startAngle;
            animateTarget[animateProperty] = layout[animateProperty];
            (isUpdate ? updateProps : initProps)(sector, {
                shape: animateTarget
            }, animationModel, dataIndex);
        }

        return sector;
    }
};

function removeRect(
    dataIndex: number,
    animationModel: BarSeriesModel | GlobalModel,
    el: Rect
) {
    // Not show text when animating
    el.style.text = null;
    updateProps(el, {
        shape: {
            width: 0
        }
    }, animationModel, dataIndex, function () {
        el.parent && el.parent.remove(el);
    });
}

function removeSector(
    dataIndex: number,
    animationModel: BarSeriesModel | GlobalModel,
    el: Sector
) {
    // Not show text when animating
    el.style.text = null;
    updateProps(el, {
        shape: {
            r: el.shape.r0
        }
    }, animationModel, dataIndex, function () {
        el.parent && el.parent.remove(el);
    });
}

interface GetLayout {
    (data: List, dataIndex: number, itemModel: Model<BarDataItemOption>): RectLayout | SectorLayout
}
var getLayout: {
    [key in 'cartesian2d' | 'polar']: GetLayout
} = {
    cartesian2d(data, dataIndex, itemModel): RectLayout {
        var layout = data.getItemLayout(dataIndex) as RectLayout;
        var fixedLineWidth = getLineWidth(itemModel, layout);

        // fix layout with lineWidth
        var signX = layout.width > 0 ? 1 : -1;
        var signY = layout.height > 0 ? 1 : -1;
        return {
            x: layout.x + signX * fixedLineWidth / 2,
            y: layout.y + signY * fixedLineWidth / 2,
            width: layout.width - signX * fixedLineWidth,
            height: layout.height - signY * fixedLineWidth
        };
    },

    polar(data, dataIndex, itemModel): SectorLayout {
        var layout = data.getItemLayout(dataIndex);
        return {
            cx: layout.cx,
            cy: layout.cy,
            r0: layout.r0,
            r: layout.r,
            startAngle: layout.startAngle,
            endAngle: layout.endAngle
        } as SectorLayout;
    }
};

function isZeroOnPolar(layout: SectorLayout) {
    return layout.startAngle != null
        && layout.endAngle != null
        && layout.startAngle === layout.endAngle;
}

function updateStyle(
    el: BarPossiblePath,
    data: List, dataIndex: number,
    itemModel: Model<BarDataItemOption>,
    layout: RectLayout | SectorLayout,
    seriesModel: BarSeriesModel,
    isHorizontal: boolean,
    isPolar: boolean
) {
    var color = data.getItemVisual(dataIndex, 'color');
    var opacity = data.getItemVisual(dataIndex, 'opacity');
    var stroke = data.getVisual('borderColor');
    var itemStyleModel = itemModel.getModel('itemStyle');
    var hoverStyle = getBarItemStyle(itemModel.getModel(['emphasis', 'itemStyle']));

    if (!isPolar) {
        el.setShape('r', itemStyleModel.get('barBorderRadius') || 0);
    }

    el.useStyle(zrUtil.defaults(
        {
            stroke: isZeroOnPolar(layout as SectorLayout) ? 'none' : stroke,
            fill: isZeroOnPolar(layout as SectorLayout) ? 'none' : color,
            opacity: opacity
        },
        getBarItemStyle(itemStyleModel)
    ));

    var cursorStyle = itemModel.getShallow('cursor');
    cursorStyle && el.attr('cursor', cursorStyle);

    if (!isPolar) {
        var labelPositionOutside = isHorizontal
            ? ((layout as RectLayout).height > 0 ? 'bottom' : 'top')
            : ((layout as RectLayout).width > 0 ? 'left' : 'right');

        setLabel(
            el.style, hoverStyle, itemModel, color,
            seriesModel, dataIndex, labelPositionOutside
        );
    }
    if (isZeroOnPolar(layout as SectorLayout)) {
        hoverStyle.fill = hoverStyle.stroke = 'none';
    }
    setHoverStyle(el, hoverStyle);
}

// In case width or height are too small.
function getLineWidth(
    itemModel: Model<BarSeriesOption>,
    rawLayout: RectLayout
) {
    var lineWidth = itemModel.get(BAR_BORDER_WIDTH_QUERY) || 0;
    // width or height may be NaN for empty data
    var width = isNaN(rawLayout.width) ? Number.MAX_VALUE : Math.abs(rawLayout.width);
    var height = isNaN(rawLayout.height) ? Number.MAX_VALUE : Math.abs(rawLayout.height);
    return Math.min(lineWidth, width, height);
}

class LagePathShape {
    points: ArrayLike<number>
}
interface LargePathProps extends PathProps {
    shape?: LagePathShape
}
class LargePath extends Path {
    type = 'largeBar'

    shape: LagePathShape

    __startPoint: number[]
    __baseDimIdx: number
    __largeDataIndices: ArrayLike<number>
    __barWidth: number

    constructor(opts?: LargePathProps) {
        super(opts, null, new LagePathShape());
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: LagePathShape) {
        // Drawing lines is more efficient than drawing
        // a whole line or drawing rects.
        const points = shape.points;
        const startPoint = this.__startPoint;
        const baseDimIdx = this.__baseDimIdx;

        for (var i = 0; i < points.length; i += 2) {
            startPoint[baseDimIdx] = points[i + baseDimIdx];
            ctx.moveTo(startPoint[0], startPoint[1]);
            ctx.lineTo(points[i], points[i + 1]);
        }
    }
}

function createLarge(
    seriesModel: BarSeriesModel,
    group: Group,
    incremental?: boolean
) {
    // TODO support polar
    var data = seriesModel.getData();
    var startPoint = [];
    var baseDimIdx = data.getLayout('valueAxisHorizontal') ? 1 : 0;
    startPoint[1 - baseDimIdx] = data.getLayout('valueAxisStart');

    var largeDataIndices = data.getLayout('largeDataIndices');
    var barWidth = data.getLayout('barWidth');

    var backgroundModel = seriesModel.getModel('backgroundStyle');
    var drawBackground = seriesModel.get('showBackground', true);

    if (drawBackground) {
        const points = data.getLayout('largeBackgroundPoints');
        const backgroundStartPoint: number[] = [];
        backgroundStartPoint[1 - baseDimIdx] = data.getLayout('backgroundStart');

        const bgEl = new LargePath({
            shape: {points: points},
            incremental: !!incremental,
            silent: true,
            z2: 0
        });
        bgEl.__startPoint = backgroundStartPoint;
        bgEl.__baseDimIdx = baseDimIdx;
        bgEl.__largeDataIndices = largeDataIndices;
        bgEl.__barWidth = barWidth;
        setLargeBackgroundStyle(bgEl, backgroundModel, data);
        group.add(bgEl);
    }

    var el = new LargePath({
        shape: {points: data.getLayout('largePoints')},
        incremental: !!incremental
    });
    el.__startPoint = startPoint;
    el.__baseDimIdx = baseDimIdx;
    el.__largeDataIndices = largeDataIndices;
    el.__barWidth = barWidth;
    group.add(el);
    setLargeStyle(el, seriesModel, data);

    // Enable tooltip and user mouse/touch event handlers.
    getECData(el).seriesIndex = seriesModel.seriesIndex;

    if (!seriesModel.get('silent')) {
        el.on('mousedown', largePathUpdateDataIndex);
        el.on('mousemove', largePathUpdateDataIndex);
    }
}

// Use throttle to avoid frequently traverse to find dataIndex.
var largePathUpdateDataIndex = throttle(function (this: LargePath, event: ZRElementEvent) {
    var largePath = this;
    var dataIndex = largePathFindDataIndex(largePath, event.offsetX, event.offsetY);
    getECData(largePath).dataIndex = dataIndex >= 0 ? dataIndex : null;
}, 30, false);

function largePathFindDataIndex(largePath: LargePath, x: number, y: number) {
    var baseDimIdx = largePath.__baseDimIdx;
    var valueDimIdx = 1 - baseDimIdx;
    var points = largePath.shape.points;
    var largeDataIndices = largePath.__largeDataIndices;
    var barWidthHalf = Math.abs(largePath.__barWidth / 2);
    var startValueVal = largePath.__startPoint[valueDimIdx];

    _eventPos[0] = x;
    _eventPos[1] = y;
    var pointerBaseVal = _eventPos[baseDimIdx];
    var pointerValueVal = _eventPos[1 - baseDimIdx];
    var baseLowerBound = pointerBaseVal - barWidthHalf;
    var baseUpperBound = pointerBaseVal + barWidthHalf;

    for (var i = 0, len = points.length / 2; i < len; i++) {
        var ii = i * 2;
        var barBaseVal = points[ii + baseDimIdx];
        var barValueVal = points[ii + valueDimIdx];
        if (
            barBaseVal >= baseLowerBound && barBaseVal <= baseUpperBound
            && (
                startValueVal <= barValueVal
                    ? (pointerValueVal >= startValueVal && pointerValueVal <= barValueVal)
                    : (pointerValueVal >= barValueVal && pointerValueVal <= startValueVal)
            )
        ) {
            return largeDataIndices[i];
        }
    }

    return -1;
}

function setLargeStyle(
    el: LargePath,
    seriesModel: BarSeriesModel,
    data: List
) {
    var borderColor = data.getVisual('borderColor') || data.getVisual('color');
    var itemStyle = seriesModel.getModel('itemStyle').getItemStyle(['color', 'borderColor']);

    el.useStyle(itemStyle);
    el.style.fill = null;
    el.style.stroke = borderColor;
    el.style.lineWidth = data.getLayout('barWidth');
}

function setLargeBackgroundStyle(
    el: LargePath,
    backgroundModel: Model<BarSeriesOption['backgroundStyle']>,
    data: List
) {
    var borderColor = backgroundModel.get('borderColor') || backgroundModel.get('color');
    var itemStyle = backgroundModel.getItemStyle(['color', 'borderColor']);

    el.useStyle(itemStyle);
    el.style.fill = null;
    el.style.stroke = borderColor;
    el.style.lineWidth = data.getLayout('barWidth') as number;
}

function createBackgroundShape(
    isHorizontalOrRadial: boolean,
    layout: SectorLayout | RectLayout,
    coord: CoordSysOfBar
): SectorShape | RectShape {
    if (isCoordinateSystemType<Cartesian2D>(coord, 'cartesian2d')) {
        const rectShape = layout as RectShape;
        const coordLayout = coord.getArea();
        return {
            x: isHorizontalOrRadial ? rectShape.x : coordLayout.x,
            y: isHorizontalOrRadial ? coordLayout.y : rectShape.y,
            width: isHorizontalOrRadial ? rectShape.width : coordLayout.width,
            height: isHorizontalOrRadial ? coordLayout.height : rectShape.height
        } as RectShape;
    }
    else {
        const coordLayout = coord.getArea();
        const sectorShape = layout as SectorShape;
        return {
            cx: coordLayout.cx,
            cy: coordLayout.cy,
            r0: isHorizontalOrRadial ? coordLayout.r0 : sectorShape.r0,
            r: isHorizontalOrRadial ? coordLayout.r : sectorShape.r,
            startAngle: isHorizontalOrRadial ? sectorShape.startAngle : 0,
            endAngle: isHorizontalOrRadial ? sectorShape.endAngle : Math.PI * 2
        } as SectorShape;
    }
}

function createBackgroundEl(
    coord: CoordSysOfBar,
    isHorizontalOrRadial: boolean,
    layout: SectorLayout | RectLayout
): Rect | Sector {
    var ElementClz = coord.type === 'polar' ? Sector : Rect;
    return new ElementClz({
        shape: createBackgroundShape(isHorizontalOrRadial, layout, coord) as any,
        silent: true,
        z2: 0
    });
}

ChartView.registerClass(BarView);

export default BarView;
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
import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import {setLabel} from './helper';
import Model from '../../model/Model';
import barItemStyle from './barItemStyle';
import Path from 'zrender/src/graphic/Path';
import Group from 'zrender/src/container/Group';
import {throttle} from '../../util/throttle';
import {createClipPath} from '../helper/createClipPathFromCoordSys';
import Sausage from '../../util/shape/sausage';

var BAR_BORDER_WIDTH_QUERY = ['itemStyle', 'barBorderWidth'];
var _eventPos = [0, 0];

// FIXME
// Just for compatible with ec2.
zrUtil.extend(Model.prototype, barItemStyle);

function getClipArea(coord, data) {
    var coordSysClipArea = coord.getArea && coord.getArea();
    if (coord.type === 'cartesian2d') {
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

export default echarts.extendChartView({

    type: 'bar',

    render: function (seriesModel, ecModel, api) {
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
    },

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        this._clear();
        this._updateDrawMode(seriesModel);
    },

    incrementalRender: function (params, seriesModel, ecModel, api) {
        // Do not support progressive in normal mode.
        this._incrementalRenderLarge(params, seriesModel);
    },

    _updateDrawMode: function (seriesModel) {
        var isLargeDraw = seriesModel.pipelineContext.large;
        if (this._isLargeDraw == null || isLargeDraw ^ this._isLargeDraw) {
            this._isLargeDraw = isLargeDraw;
            this._clear();
        }
    },

    _renderNormal: function (seriesModel, ecModel, api) {
        var group = this.group;
        var data = seriesModel.getData();
        var oldData = this._data;

        var coord = seriesModel.coordinateSystem;
        var baseAxis = coord.getBaseAxis();
        var isHorizontalOrRadial;

        if (coord.type === 'cartesian2d') {
            isHorizontalOrRadial = baseAxis.isHorizontal();
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
        var barBorderRadius = backgroundModel.get('barBorderRadius') || 0;

        var bgEls = [];
        var oldBgEls = this._backgroundEls || [];

        var createBackground = function (dataIndex) {
            var bgLayout = getLayout[coord.type](data, dataIndex);
            var bgEl = createBackgroundEl(coord, isHorizontalOrRadial, bgLayout);
            bgEl.useStyle(backgroundModel.getBarItemStyle());
            // Only cartesian2d support borderRadius.
            if (coord.type === 'cartesian2d') {
                bgEl.setShape('r', barBorderRadius);
            }
            bgEls[dataIndex] = bgEl;
            return bgEl;
        };

        data.diff(oldData)
            .add(function (dataIndex) {
                var itemModel = data.getItemModel(dataIndex);
                var layout = getLayout[coord.type](data, dataIndex, itemModel);

                if (drawBackground) {
                    createBackground(dataIndex);
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
                    var bgEl;
                    if (oldBgEls.length === 0) {
                        bgEl = createBackground(oldIndex);
                    }
                    else {
                        bgEl = oldBgEls[oldIndex];
                        bgEl.useStyle(backgroundModel.getBarItemStyle());
                        // Only cartesian2d support borderRadius.
                        if (coord.type === 'cartesian2d') {
                            bgEl.setShape('r', barBorderRadius);
                        }
                        bgEls[newIndex] = bgEl;
                    }

                    var bgLayout = getLayout[coord.type](data, newIndex);
                    var shape = createBackgroundShape(isHorizontalOrRadial, bgLayout, coord);
                    graphic.updateProps(bgEl, { shape: shape }, animationModel, newIndex);
                }

                var el = oldData.getItemGraphicEl(oldIndex);
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
                    graphic.updateProps(el, {shape: layout}, animationModel, newIndex);
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
                    el && removeRect(dataIndex, animationModel, el);
                }
                else {
                    el && removeSector(dataIndex, animationModel, el);
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
    },

    _renderLarge: function (seriesModel, ecModel, api) {
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
    },

    _incrementalRenderLarge: function (params, seriesModel) {
        this._removeBackground();
        createLarge(seriesModel, this.group, true);
    },

    dispose: zrUtil.noop,

    remove: function (ecModel) {
        this._clear(ecModel);
    },

    _clear: function (ecModel) {
        var group = this.group;
        var data = this._data;
        if (ecModel && ecModel.get('animation') && data && !this._isLargeDraw) {
            this._removeBackground();
            this._backgroundEls = [];

            data.eachItemGraphicEl(function (el) {
                if (el.type === 'sector') {
                    removeSector(el.dataIndex, ecModel, el);
                }
                else {
                    removeRect(el.dataIndex, ecModel, el);
                }
            });
        }
        else {
            group.removeAll();
        }
        this._data = null;
    },

    _removeBackground: function () {
        this.group.remove(this._backgroundGroup);
        this._backgroundGroup = null;
    }

});

var mathMax = Math.max;
var mathMin = Math.min;

var clip = {
    cartesian2d: function (coordSysBoundingRect, layout) {
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

    polar: function (coordSysClipArea, layout) {
        var signR = layout.r0 <= layout.r ? 1 : -1;
        // Make sure r is larger than r0
        if (signR < 0) {
            var r = layout.r;
            layout.r = layout.r0;
            layout.r0 = r;
        }

        var r = mathMin(layout.r, coordSysClipArea.r);
        var r0 = mathMax(layout.r0, coordSysClipArea.r0);

        layout.r = r;
        layout.r0 = r0;

        var clipped = r - r0 < 0;

        // Reverse back
        if (signR < 0) {
            var r = layout.r;
            layout.r = layout.r0;
            layout.r0 = r;
        }

        return clipped;
    }
};

var elementCreator = {

    cartesian2d: function (
        dataIndex, layout, isHorizontal,
        animationModel, isUpdate
    ) {
        var rect = new graphic.Rect({
            shape: zrUtil.extend({}, layout),
            z2: 1
        });

        rect.name = 'item';

        // Animation
        if (animationModel) {
            var rectShape = rect.shape;
            var animateProperty = isHorizontal ? 'height' : 'width';
            var animateTarget = {};
            rectShape[animateProperty] = 0;
            animateTarget[animateProperty] = layout[animateProperty];
            graphic[isUpdate ? 'updateProps' : 'initProps'](rect, {
                shape: animateTarget
            }, animationModel, dataIndex);
        }

        return rect;
    },

    polar: function (
        dataIndex, layout, isRadial,
        animationModel, isUpdate, roundCap
    ) {
        // Keep the same logic with bar in catesion: use end value to control
        // direction. Notice that if clockwise is true (by default), the sector
        // will always draw clockwisely, no matter whether endAngle is greater
        // or less than startAngle.
        var clockwise = layout.startAngle < layout.endAngle;

        var ShapeClass = (!isRadial && roundCap) ? Sausage : graphic.Sector;

        var sector = new ShapeClass({
            shape: zrUtil.defaults({clockwise: clockwise}, layout),
            z2: 1
        });

        sector.name = 'item';

        // Animation
        if (animationModel) {
            var sectorShape = sector.shape;
            var animateProperty = isRadial ? 'r' : 'endAngle';
            var animateTarget = {};
            sectorShape[animateProperty] = isRadial ? 0 : layout.startAngle;
            animateTarget[animateProperty] = layout[animateProperty];
            graphic[isUpdate ? 'updateProps' : 'initProps'](sector, {
                shape: animateTarget
            }, animationModel, dataIndex);
        }

        return sector;
    }
};

function removeRect(dataIndex, animationModel, el) {
    // Not show text when animating
    el.style.text = null;
    graphic.updateProps(el, {
        shape: {
            width: 0
        }
    }, animationModel, dataIndex, function () {
        el.parent && el.parent.remove(el);
    });
}

function removeSector(dataIndex, animationModel, el) {
    // Not show text when animating
    el.style.text = null;
    graphic.updateProps(el, {
        shape: {
            r: el.shape.r0
        }
    }, animationModel, dataIndex, function () {
        el.parent && el.parent.remove(el);
    });
}

var getLayout = {
    // itemModel is only used to get borderWidth, which is not needed
    // when calculating bar background layout.
    cartesian2d: function (data, dataIndex, itemModel) {
        var layout = data.getItemLayout(dataIndex);
        var fixedLineWidth = itemModel ? getLineWidth(itemModel, layout) : 0;

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

    polar: function (data, dataIndex, itemModel) {
        var layout = data.getItemLayout(dataIndex);
        return {
            cx: layout.cx,
            cy: layout.cy,
            r0: layout.r0,
            r: layout.r,
            startAngle: layout.startAngle,
            endAngle: layout.endAngle
        };
    }
};

function isZeroOnPolar(layout) {
    return layout.startAngle != null
        && layout.endAngle != null
        && layout.startAngle === layout.endAngle;
}

function updateStyle(
    el, data, dataIndex, itemModel, layout, seriesModel, isHorizontal, isPolar
) {
    var color = data.getItemVisual(dataIndex, 'color');
    var opacity = data.getItemVisual(dataIndex, 'opacity');
    var stroke = data.getVisual('borderColor');
    var itemStyleModel = itemModel.getModel('itemStyle');
    var hoverStyle = itemModel.getModel('emphasis.itemStyle').getBarItemStyle();

    if (!isPolar) {
        el.setShape('r', itemStyleModel.get('barBorderRadius') || 0);
    }

    el.useStyle(zrUtil.defaults(
        {
            stroke: isZeroOnPolar(layout) ? 'none' : stroke,
            fill: isZeroOnPolar(layout) ? 'none' : color,
            opacity: opacity
        },
        itemStyleModel.getBarItemStyle()
    ));

    var cursorStyle = itemModel.getShallow('cursor');
    cursorStyle && el.attr('cursor', cursorStyle);

    var labelPositionOutside = isHorizontal
        ? (layout.height > 0 ? 'bottom' : 'top')
        : (layout.width > 0 ? 'left' : 'right');

    if (!isPolar) {
        setLabel(
            el.style, hoverStyle, itemModel, color,
            seriesModel, dataIndex, labelPositionOutside
        );
    }
    if (isZeroOnPolar(layout)) {
        hoverStyle.fill = hoverStyle.stroke = 'none';
    }
    graphic.setHoverStyle(el, hoverStyle);
}

// In case width or height are too small.
function getLineWidth(itemModel, rawLayout) {
    var lineWidth = itemModel.get(BAR_BORDER_WIDTH_QUERY) || 0;
    // width or height may be NaN for empty data
    var width = isNaN(rawLayout.width) ? Number.MAX_VALUE : Math.abs(rawLayout.width);
    var height = isNaN(rawLayout.height) ? Number.MAX_VALUE : Math.abs(rawLayout.height);
    return Math.min(lineWidth, width, height);
}


var LargePath = Path.extend({

    type: 'largeBar',

    shape: {points: []},

    buildPath: function (ctx, shape) {
        // Drawing lines is more efficient than drawing
        // a whole line or drawing rects.
        var points = shape.points;
        var startPoint = this.__startPoint;
        var baseDimIdx = this.__baseDimIdx;

        for (var i = 0; i < points.length; i += 2) {
            startPoint[baseDimIdx] = points[i + baseDimIdx];
            ctx.moveTo(startPoint[0], startPoint[1]);
            ctx.lineTo(points[i], points[i + 1]);
        }
    }
});

function createLarge(seriesModel, group, incremental) {
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
        var points = data.getLayout('largeBackgroundPoints');
        var backgroundStartPoint = [];
        backgroundStartPoint[1 - baseDimIdx] = data.getLayout('backgroundStart');

        var bgEl = new LargePath({
            shape: {points: points},
            incremental: !!incremental,
            __startPoint: backgroundStartPoint,
            __baseDimIdx: baseDimIdx,
            __largeDataIndices: largeDataIndices,
            __barWidth: barWidth,
            silent: true,
            z2: 0
        });
        setLargeBackgroundStyle(bgEl, backgroundModel, data);
        group.add(bgEl);
    }

    var el = new LargePath({
        shape: {points: data.getLayout('largePoints')},
        incremental: !!incremental,
        __startPoint: startPoint,
        __baseDimIdx: baseDimIdx,
        __largeDataIndices: largeDataIndices,
        __barWidth: barWidth
    });
    group.add(el);
    setLargeStyle(el, seriesModel, data);

    // Enable tooltip and user mouse/touch event handlers.
    el.seriesIndex = seriesModel.seriesIndex;

    if (!seriesModel.get('silent')) {
        el.on('mousedown', largePathUpdateDataIndex);
        el.on('mousemove', largePathUpdateDataIndex);
    }
}

// Use throttle to avoid frequently traverse to find dataIndex.
var largePathUpdateDataIndex = throttle(function (event) {
    var largePath = this;
    var dataIndex = largePathFindDataIndex(largePath, event.offsetX, event.offsetY);
    largePath.dataIndex = dataIndex >= 0 ? dataIndex : null;
}, 30, false);

function largePathFindDataIndex(largePath, x, y) {
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

function setLargeStyle(el, seriesModel, data) {
    var borderColor = data.getVisual('borderColor') || data.getVisual('color');
    var itemStyle = seriesModel.getModel('itemStyle').getItemStyle(['color', 'borderColor']);

    el.useStyle(itemStyle);
    el.style.fill = null;
    el.style.stroke = borderColor;
    el.style.lineWidth = data.getLayout('barWidth');
}

function setLargeBackgroundStyle(el, backgroundModel, data) {
    var borderColor = backgroundModel.get('borderColor') || backgroundModel.get('color');
    var itemStyle = backgroundModel.getItemStyle(['color', 'borderColor']);

    el.useStyle(itemStyle);
    el.style.fill = null;
    el.style.stroke = borderColor;
    el.style.lineWidth = data.getLayout('barWidth');
}

function createBackgroundShape(isHorizontalOrRadial, layout, coord) {
    var coordLayout;
    var isPolar = coord.type === 'polar';
    if (isPolar) {
        coordLayout = coord.getArea();
    }
    else {
        coordLayout = coord.grid.getRect();
    }

    if (isPolar) {
        return {
            cx: coordLayout.cx,
            cy: coordLayout.cy,
            r0: isHorizontalOrRadial ? coordLayout.r0 : layout.r0,
            r: isHorizontalOrRadial ? coordLayout.r : layout.r,
            startAngle: isHorizontalOrRadial ? layout.startAngle : 0,
            endAngle: isHorizontalOrRadial ? layout.endAngle : Math.PI * 2
        };
    }
    else {
        return {
            x: isHorizontalOrRadial ? layout.x : coordLayout.x,
            y: isHorizontalOrRadial ? coordLayout.y : layout.y,
            width: isHorizontalOrRadial ? layout.width : coordLayout.width,
            height: isHorizontalOrRadial ? coordLayout.height : layout.height
        };
    }
}

function createBackgroundEl(coord, isHorizontalOrRadial, layout) {
    var ElementClz = coord.type === 'polar' ? graphic.Sector : graphic.Rect;
    return new ElementClz({
        shape: createBackgroundShape(isHorizontalOrRadial, layout, coord),
        silent: true,
        z2: 0
    });
}

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

var BAR_BORDER_WIDTH_QUERY = ['itemStyle', 'barBorderWidth'];

// FIXME
// Just for compatible with ec2.
zrUtil.extend(Model.prototype, barItemStyle);

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

        data.diff(oldData)
            .add(function (dataIndex) {
                if (!data.hasValue(dataIndex)) {
                    return;
                }

                var itemModel = data.getItemModel(dataIndex);
                var layout = getLayout[coord.type](data, dataIndex, itemModel);
                var el = elementCreator[coord.type](
                    data, dataIndex, itemModel, layout, isHorizontalOrRadial, animationModel
                );
                data.setItemGraphicEl(dataIndex, el);
                group.add(el);

                updateStyle(
                    el, data, dataIndex, itemModel, layout,
                    seriesModel, isHorizontalOrRadial, coord.type === 'polar'
                );
            })
            .update(function (newIndex, oldIndex) {
                var el = oldData.getItemGraphicEl(oldIndex);

                if (!data.hasValue(newIndex)) {
                    group.remove(el);
                    return;
                }

                var itemModel = data.getItemModel(newIndex);
                var layout = getLayout[coord.type](data, newIndex, itemModel);

                if (el) {
                    graphic.updateProps(el, {shape: layout}, animationModel, newIndex);
                }
                else {
                    el = elementCreator[coord.type](
                        data, newIndex, itemModel, layout, isHorizontalOrRadial, animationModel, true
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

        this._data = data;
    },

    _renderLarge: function (seriesModel, ecModel, api) {
        this._clear();
        createLarge(seriesModel, this.group);
    },

    _incrementalRenderLarge: function (params, seriesModel) {
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
    }

});

var elementCreator = {

    cartesian2d: function (
        data, dataIndex, itemModel, layout, isHorizontal,
        animationModel, isUpdate
    ) {
        var rect = new graphic.Rect({shape: zrUtil.extend({}, layout)});

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
        data, dataIndex, itemModel, layout, isRadial,
        animationModel, isUpdate
    ) {
        // Keep the same logic with bar in catesion: use end value to control
        // direction. Notice that if clockwise is true (by default), the sector
        // will always draw clockwisely, no matter whether endAngle is greater
        // or less than startAngle.
        var clockwise = layout.startAngle < layout.endAngle;
        var sector = new graphic.Sector({
            shape: zrUtil.defaults({clockwise: clockwise}, layout)
        });

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
    cartesian2d: function (data, dataIndex, itemModel) {
        var layout = data.getItemLayout(dataIndex);
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

function updateStyle(
    el, data, dataIndex, itemModel, layout, seriesModel, isHorizontal, isPolar
) {
    var color = data.getItemVisual(dataIndex, 'color');
    var opacity = data.getItemVisual(dataIndex, 'opacity');
    var itemStyleModel = itemModel.getModel('itemStyle');
    var hoverStyle = itemModel.getModel('emphasis.itemStyle').getBarItemStyle();

    if (!isPolar) {
        el.setShape('r', itemStyleModel.get('barBorderRadius') || 0);
    }

    el.useStyle(zrUtil.defaults(
        {
            fill: color,
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

    graphic.setHoverStyle(el, hoverStyle);
}

// In case width or height are too small.
function getLineWidth(itemModel, rawLayout) {
    var lineWidth = itemModel.get(BAR_BORDER_WIDTH_QUERY) || 0;
    return Math.min(lineWidth, Math.abs(rawLayout.width), Math.abs(rawLayout.height));
}


var LargePath = Path.extend({

    type: 'largeBar',

    shape: {points: []},

    buildPath: function (ctx, shape) {
        // Drawing lines is more efficient than drawing
        // a whole line or drawing rects.
        var points = shape.points;
        var startPoint = this.__startPoint;
        var valueIdx = this.__valueIdx;

        for (var i = 0; i < points.length; i += 2) {
            startPoint[this.__valueIdx] = points[i + valueIdx];
            ctx.moveTo(startPoint[0], startPoint[1]);
            ctx.lineTo(points[i], points[i + 1]);
        }
    }
});

function createLarge(seriesModel, group, incremental) {
    // TODO support polar
    var data = seriesModel.getData();
    var startPoint = [];
    var valueIdx = data.getLayout('valueAxisHorizontal') ? 1 : 0;
    startPoint[1 - valueIdx] = data.getLayout('valueAxisStart');

    var el = new LargePath({
        shape: {points: data.getLayout('largePoints')},
        incremental: !!incremental,
        __startPoint: startPoint,
        __valueIdx: valueIdx
    });
    group.add(el);
    setLargeStyle(el, seriesModel, data);
}

function setLargeStyle(el, seriesModel, data) {
    var borderColor = data.getVisual('borderColor') || data.getVisual('color');
    var itemStyle = seriesModel.getModel('itemStyle').getItemStyle(['color', 'borderColor']);

    el.useStyle(itemStyle);
    el.style.fill = null;
    el.style.stroke = borderColor;
    el.style.lineWidth = data.getLayout('barWidth');
}


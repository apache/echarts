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

import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import ChartView from '../../view/Chart';

/**
 * @param {module:echarts/model/Series} seriesModel
 * @param {boolean} hasAnimation
 * @inner
 */
function updateDataSelected(uid, seriesModel, hasAnimation, api) {
    var data = seriesModel.getData();
    var dataIndex = this.dataIndex;
    var name = data.getName(dataIndex);
    var selectedOffset = seriesModel.get('selectedOffset');

    api.dispatchAction({
        type: 'pieToggleSelect',
        from: uid,
        name: name,
        seriesId: seriesModel.id
    });

    data.each(function (idx) {
        toggleItemSelected(
            data.getItemGraphicEl(idx),
            data.getItemLayout(idx),
            seriesModel.isSelected(data.getName(idx)),
            selectedOffset,
            hasAnimation
        );
    });
}

/**
 * @param {module:zrender/graphic/Sector} el
 * @param {Object} layout
 * @param {boolean} isSelected
 * @param {number} selectedOffset
 * @param {boolean} hasAnimation
 * @inner
 */
function toggleItemSelected(el, layout, isSelected, selectedOffset, hasAnimation) {
    var midAngle = (layout.startAngle + layout.endAngle) / 2;

    var dx = Math.cos(midAngle);
    var dy = Math.sin(midAngle);

    var offset = isSelected ? selectedOffset : 0;
    var position = [dx * offset, dy * offset];

    hasAnimation
        // animateTo will stop revious animation like update transition
        ? el.animate()
            .when(200, {
                position: position
            })
            .start('bounceOut')
        : el.attr('position', position);
}

/**
 * Piece of pie including Sector, Label, LabelLine
 * @constructor
 * @extends {module:zrender/graphic/Group}
 */
function PiePiece(data, idx) {

    graphic.Group.call(this);

    var sector = new graphic.Sector({
        z2: 2
    });
    var polyline = new graphic.Polyline();
    var text = new graphic.Text();
    this.add(sector);
    this.add(polyline);
    this.add(text);

    this.updateData(data, idx, true);

    // Hover to change label and labelLine
    function onEmphasis() {
        polyline.ignore = polyline.hoverIgnore;
        text.ignore = text.hoverIgnore;
    }
    function onNormal() {
        polyline.ignore = polyline.normalIgnore;
        text.ignore = text.normalIgnore;
    }
    this.on('emphasis', onEmphasis)
        .on('normal', onNormal)
        .on('mouseover', onEmphasis)
        .on('mouseout', onNormal);
}

var piePieceProto = PiePiece.prototype;

piePieceProto.updateData = function (data, idx, firstCreate) {

    var sector = this.childAt(0);

    var seriesModel = data.hostModel;
    var itemModel = data.getItemModel(idx);
    var layout = data.getItemLayout(idx);
    var sectorShape = zrUtil.extend({}, layout);
    sectorShape.label = null;

    if (firstCreate) {
        sector.setShape(sectorShape);

        var animationType = seriesModel.getShallow('animationType');
        if (animationType === 'scale') {
            sector.shape.r = layout.r0;
            graphic.initProps(sector, {
                shape: {
                    r: layout.r
                }
            }, seriesModel, idx);
        }
        // Expansion
        else {
            sector.shape.endAngle = layout.startAngle;
            graphic.updateProps(sector, {
                shape: {
                    endAngle: layout.endAngle
                }
            }, seriesModel, idx);
        }

    }
    else {
        graphic.updateProps(sector, {
            shape: sectorShape
        }, seriesModel, idx);
    }

    // Update common style
    var visualColor = data.getItemVisual(idx, 'color');

    sector.useStyle(
        zrUtil.defaults(
            {
                lineJoin: 'bevel',
                fill: visualColor
            },
            itemModel.getModel('itemStyle').getItemStyle()
        )
    );
    sector.hoverStyle = itemModel.getModel('emphasis.itemStyle').getItemStyle();

    var cursorStyle = itemModel.getShallow('cursor');
    cursorStyle && sector.attr('cursor', cursorStyle);

    // Toggle selected
    toggleItemSelected(
        this,
        data.getItemLayout(idx),
        seriesModel.isSelected(null, idx),
        seriesModel.get('selectedOffset'),
        seriesModel.get('animation')
    );

    function onEmphasis() {
        // Sector may has animation of updating data. Force to move to the last frame
        // Or it may stopped on the wrong shape
        sector.stopAnimation(true);
        sector.animateTo({
            shape: {
                r: layout.r + seriesModel.get('hoverOffset')
            }
        }, 300, 'elasticOut');
    }
    function onNormal() {
        sector.stopAnimation(true);
        sector.animateTo({
            shape: {
                r: layout.r
            }
        }, 300, 'elasticOut');
    }
    sector.off('mouseover').off('mouseout').off('emphasis').off('normal');
    if (itemModel.get('hoverAnimation') && seriesModel.isAnimationEnabled()) {
        sector
            .on('mouseover', onEmphasis)
            .on('mouseout', onNormal)
            .on('emphasis', onEmphasis)
            .on('normal', onNormal);
    }

    this._updateLabel(data, idx);

    graphic.setHoverStyle(this);
};

piePieceProto._updateLabel = function (data, idx) {

    var labelLine = this.childAt(1);
    var labelText = this.childAt(2);

    var seriesModel = data.hostModel;
    var itemModel = data.getItemModel(idx);
    var layout = data.getItemLayout(idx);
    var labelLayout = layout.label;
    var visualColor = data.getItemVisual(idx, 'color');

    graphic.updateProps(labelLine, {
        shape: {
            points: labelLayout.linePoints || [
                [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y]
            ]
        }
    }, seriesModel, idx);

    graphic.updateProps(labelText, {
        style: {
            x: labelLayout.x,
            y: labelLayout.y
        }
    }, seriesModel, idx);
    labelText.attr({
        rotation: labelLayout.rotation,
        origin: [labelLayout.x, labelLayout.y],
        z2: 10
    });

    var labelModel = itemModel.getModel('label');
    var labelHoverModel = itemModel.getModel('emphasis.label');
    var labelLineModel = itemModel.getModel('labelLine');
    var labelLineHoverModel = itemModel.getModel('emphasis.labelLine');
    var visualColor = data.getItemVisual(idx, 'color');

    graphic.setLabelStyle(
        labelText.style, labelText.hoverStyle = {}, labelModel, labelHoverModel,
        {
            labelFetcher: data.hostModel,
            labelDataIndex: idx,
            defaultText: data.getName(idx),
            autoColor: visualColor,
            useInsideStyle: !!labelLayout.inside
        },
        {
            textAlign: labelLayout.textAlign,
            textVerticalAlign: labelLayout.verticalAlign,
            opacity: data.getItemVisual(idx, 'opacity')
        }
    );

    labelText.ignore = labelText.normalIgnore = !labelModel.get('show');
    labelText.hoverIgnore = !labelHoverModel.get('show');

    labelLine.ignore = labelLine.normalIgnore = !labelLineModel.get('show');
    labelLine.hoverIgnore = !labelLineHoverModel.get('show');

    // Default use item visual color
    labelLine.setStyle({
        stroke: visualColor,
        opacity: data.getItemVisual(idx, 'opacity')
    });
    labelLine.setStyle(labelLineModel.getModel('lineStyle').getLineStyle());

    labelLine.hoverStyle = labelLineHoverModel.getModel('lineStyle').getLineStyle();

    var smooth = labelLineModel.get('smooth');
    if (smooth && smooth === true) {
        smooth = 0.4;
    }
    labelLine.setShape({
        smooth: smooth
    });
};

zrUtil.inherits(PiePiece, graphic.Group);


// Pie view
var PieView = ChartView.extend({

    type: 'pie',

    init: function () {
        var sectorGroup = new graphic.Group();
        this._sectorGroup = sectorGroup;
    },

    render: function (seriesModel, ecModel, api, payload) {
        if (payload && (payload.from === this.uid)) {
            return;
        }

        var data = seriesModel.getData();
        var oldData = this._data;
        var group = this.group;

        var hasAnimation = ecModel.get('animation');
        var isFirstRender = !oldData;
        var animationType = seriesModel.get('animationType');

        var onSectorClick = zrUtil.curry(
            updateDataSelected, this.uid, seriesModel, hasAnimation, api
        );

        var selectedMode = seriesModel.get('selectedMode');

        data.diff(oldData)
            .add(function (idx) {
                var piePiece = new PiePiece(data, idx);
                // Default expansion animation
                if (isFirstRender && animationType !== 'scale') {
                    piePiece.eachChild(function (child) {
                        child.stopAnimation(true);
                    });
                }

                selectedMode && piePiece.on('click', onSectorClick);

                data.setItemGraphicEl(idx, piePiece);

                group.add(piePiece);
            })
            .update(function (newIdx, oldIdx) {
                var piePiece = oldData.getItemGraphicEl(oldIdx);

                piePiece.updateData(data, newIdx);

                piePiece.off('click');
                selectedMode && piePiece.on('click', onSectorClick);
                group.add(piePiece);
                data.setItemGraphicEl(newIdx, piePiece);
            })
            .remove(function (idx) {
                var piePiece = oldData.getItemGraphicEl(idx);
                group.remove(piePiece);
            })
            .execute();

        if (
            hasAnimation && isFirstRender && data.count() > 0
            // Default expansion animation
            && animationType !== 'scale'
        ) {
            var shape = data.getItemLayout(0);
            var r = Math.max(api.getWidth(), api.getHeight()) / 2;

            var removeClipPath = zrUtil.bind(group.removeClipPath, group);
            group.setClipPath(this._createClipPath(
                shape.cx, shape.cy, r, shape.startAngle, shape.clockwise, removeClipPath, seriesModel
            ));
        }
        else {
            // clipPath is used in first-time animation, so remove it when otherwise. See: #8994
            group.removeClipPath();
        }

        this._data = data;
    },

    dispose: function () {},

    _createClipPath: function (
        cx, cy, r, startAngle, clockwise, cb, seriesModel
    ) {
        var clipPath = new graphic.Sector({
            shape: {
                cx: cx,
                cy: cy,
                r0: 0,
                r: r,
                startAngle: startAngle,
                endAngle: startAngle,
                clockwise: clockwise
            }
        });

        graphic.initProps(clipPath, {
            shape: {
                endAngle: startAngle + (clockwise ? 1 : -1) * Math.PI * 2
            }
        }, seriesModel, cb);

        return clipPath;
    },

    /**
     * @implement
     */
    containPoint: function (point, seriesModel) {
        var data = seriesModel.getData();
        var itemLayout = data.getItemLayout(0);
        if (itemLayout) {
            var dx = point[0] - itemLayout.cx;
            var dy = point[1] - itemLayout.cy;
            var radius = Math.sqrt(dx * dx + dy * dy);
            return radius <= itemLayout.r && radius >= itemLayout.r0;
        }
    }

});

export default PieView;

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
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { Payload, DisplayState, ECElement } from '../../util/types';
import List from '../../data/List';
import PieSeriesModel, {PieDataItemOption} from './PieSeries';
import { Dictionary } from 'zrender/src/core/types';
import Element from 'zrender/src/Element';
import Displayable from 'zrender/src/graphic/Displayable';

function updateDataSelected(
    this: PiePiece,
    uid: string,
    seriesModel: PieSeriesModel,
    hasAnimation: boolean,
    api: ExtensionAPI
): void {
    let data = seriesModel.getData();
    let dataIndex = graphic.getECData(this).dataIndex;
    let name = data.getName(dataIndex);
    let selectedOffset = seriesModel.get('selectedOffset');

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

function toggleItemSelected(
    el: Element,
    layout: Dictionary<any>, // FIXME:TS make a type.
    isSelected: boolean,
    selectedOffset: number,
    hasAnimation: boolean
): void {
    let midAngle = (layout.startAngle + layout.endAngle) / 2;

    let dx = Math.cos(midAngle);
    let dy = Math.sin(midAngle);

    let offset = isSelected ? selectedOffset : 0;
    let position = [dx * offset, dy * offset];

    hasAnimation
        // animateTo will stop revious animation like update transition
        ? el.animate()
            .when(200, {
                position: position
            })
            .start('bounceOut')
        : el.attr('position', position);
}

interface PieceElementExtension extends Displayable {
    hoverIgnore?: boolean
    normalIgnore?: boolean
};

/**
 * Piece of pie including Sector, Label, LabelLine
 */
class PiePiece extends graphic.Group {

    constructor(data: List, idx: number) {
        super();

        let sector = new graphic.Sector({
            z2: 2
        });

        let polyline = new graphic.Polyline();
        let text = new graphic.Text();
        this.add(sector);
        this.add(polyline);
        this.add(text);

        this.updateData(data, idx, true);
    }

    updateData(data: List, idx: number, firstCreate?: boolean): void {
        let sector = this.childAt(0) as graphic.Sector;
        let labelLine = this.childAt(1) as PieceElementExtension;
        let labelText = this.childAt(2) as PieceElementExtension;

        let seriesModel = data.hostModel as PieSeriesModel;
        let itemModel = data.getItemModel<PieDataItemOption>(idx);
        let layout = data.getItemLayout(idx);
        let sectorShape = zrUtil.extend({}, layout);
        // Not animate label
        sectorShape.label = null;
        sectorShape.viewRect = null;

        let animationTypeUpdate = seriesModel.getShallow('animationTypeUpdate');

        if (firstCreate) {
            sector.setShape(sectorShape);

            let animationType = seriesModel.getShallow('animationType');
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
            if (animationTypeUpdate === 'expansion') {
                // Sectors are set to be target shape and an overlaying clipPath is used for animation
                sector.setShape(sectorShape);
            }
            else {
                // Transition animation from the old shape
                graphic.updateProps(sector, {
                    shape: sectorShape
                }, seriesModel, idx);
            }
        }

        // Update common style
        let visualColor = data.getItemVisual(idx, 'color');

        sector.useStyle(
            zrUtil.defaults(
                {
                    lineJoin: 'bevel',
                    fill: visualColor
                },
                itemModel.getModel('itemStyle').getItemStyle()
            )
        );
        const sectorEmphasisState = sector.ensureState('emphasis');
        sectorEmphasisState.style = itemModel.getModel(['emphasis', 'itemStyle']).getItemStyle();

        let cursorStyle = itemModel.getShallow('cursor');
        cursorStyle && sector.attr('cursor', cursorStyle);

        // Toggle selected
        toggleItemSelected(
            this,
            data.getItemLayout(idx),
            seriesModel.isSelected(data.getName(idx)),
            seriesModel.get('selectedOffset'),
            seriesModel.get('animation')
        );

        // Label and text animation should be applied only for transition type animation when update
        let withAnimation = !firstCreate && animationTypeUpdate === 'transition';
        this._updateLabel(data, idx, withAnimation);

        (this as ECElement).highDownOnUpdate = (itemModel.get('hoverAnimation') && seriesModel.isAnimationEnabled())
            ? function (fromState: DisplayState, toState: DisplayState): void {
                if (toState === 'emphasis') {
                    labelLine.ignore = labelLine.hoverIgnore;
                    labelText.ignore = labelText.hoverIgnore;

                    // Sector may has animation of updating data. Force to move to the last frame
                    // Or it may stopped on the wrong shape
                    sector.stopAnimation(true);
                    sector.animateTo({
                        shape: {
                            r: layout.r + seriesModel.get('hoverOffset')
                        }
                    }, 300, 'elasticOut');
                }
                else {
                    labelLine.ignore = labelLine.normalIgnore;
                    labelText.ignore = labelText.normalIgnore;

                    sector.stopAnimation(true);
                    sector.animateTo({
                        shape: {
                            r: layout.r
                        }
                    }, 300, 'elasticOut');
                }
            }
            : null;

        graphic.enableHoverEmphasis(this);
    }

    private _updateLabel(data: List, idx: number, withAnimation: boolean): void {

        let labelLine = this.childAt(1) as (PieceElementExtension & graphic.Polyline);
        let labelText = this.childAt(2) as (PieceElementExtension & graphic.Text);

        let seriesModel = data.hostModel;
        let itemModel = data.getItemModel<PieDataItemOption>(idx);
        let layout = data.getItemLayout(idx);
        let labelLayout = layout.label;
        // let visualColor = data.getItemVisual(idx, 'color');

        if (!labelLayout || isNaN(labelLayout.x) || isNaN(labelLayout.y)) {
            labelText.ignore = labelText.normalIgnore = labelText.hoverIgnore =
            labelLine.ignore = labelLine.normalIgnore = labelLine.hoverIgnore = true;
            return;
        }

        let targetLineShape: {
            points: number[][]
        } = {
            points: labelLayout.linePoints || [
                [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y]
            ]
        };
        let targetTextStyle = {
            x: labelLayout.x,
            y: labelLayout.y
        };
        if (withAnimation) {
            graphic.updateProps(labelLine, {
                shape: targetLineShape
            }, seriesModel, idx);

            graphic.updateProps(labelText, {
                style: targetTextStyle
            }, seriesModel, idx);
        }
        else {
            labelLine.attr({
                shape: targetLineShape
            });
            labelText.attr({
                style: targetTextStyle
            });
        }

        labelText.attr({
            rotation: labelLayout.rotation,
            origin: [labelLayout.x, labelLayout.y],
            z2: 10
        });

        let labelModel = itemModel.getModel('label');
        let labelHoverModel = itemModel.getModel(['emphasis', 'label']);
        let labelLineModel = itemModel.getModel('labelLine');
        let labelLineHoverModel = itemModel.getModel(['emphasis', 'labelLine']);
        let visualColor = data.getItemVisual(idx, 'color');

        graphic.setLabelStyle(
            labelText,
            labelModel,
            labelHoverModel,
            {
                labelFetcher: data.hostModel as PieSeriesModel,
                labelDataIndex: idx,
                defaultText: labelLayout.text,
                autoColor: visualColor,
                useInsideStyle: !!labelLayout.inside
            },
            {
                align: labelLayout.textAlign,
                verticalAlign: labelLayout.verticalAlign,
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

        const lineEmphasisState = labelLine.ensureState('emphasis');
        lineEmphasisState.style = labelLineHoverModel.getModel('lineStyle').getLineStyle();

        let smooth = labelLineModel.get('smooth');
        if (smooth && smooth === true) {
            smooth = 0.4;
        }
        labelLine.setShape({
            smooth: smooth as number
        });
    }
}


// Pie view
class PieView extends ChartView {

    static type = 'pie';

    private _sectorGroup: graphic.Group;
    private _data: List;

    init(): void {
        let sectorGroup = new graphic.Group();
        this._sectorGroup = sectorGroup;
    }

    render(seriesModel: PieSeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        if (payload && (payload.from === this.uid)) {
            return;
        }

        let data = seriesModel.getData();
        let oldData = this._data;
        let group = this.group;

        let hasAnimation = ecModel.get('animation');
        let isFirstRender = !oldData;
        let animationType = seriesModel.get('animationType');
        let animationTypeUpdate = seriesModel.get('animationTypeUpdate');

        let onSectorClick = zrUtil.curry(
            updateDataSelected, this.uid, seriesModel, hasAnimation, api
        );

        let selectedMode = seriesModel.get('selectedMode');
        data.diff(oldData)
            .add(function (idx) {
                let piePiece = new PiePiece(data, idx);
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
                let piePiece = oldData.getItemGraphicEl(oldIdx) as PiePiece;

                if (!isFirstRender && animationTypeUpdate !== 'transition') {
                    piePiece.eachChild(function (child) {
                        child.stopAnimation(true);
                    });
                }

                piePiece.updateData(data, newIdx);

                piePiece.off('click');
                selectedMode && piePiece.on('click', onSectorClick);
                group.add(piePiece);
                data.setItemGraphicEl(newIdx, piePiece);
            })
            .remove(function (idx) {
                let piePiece = oldData.getItemGraphicEl(idx);
                group.remove(piePiece);
            })
            .execute();

        if (
            hasAnimation && data.count() > 0
            && (isFirstRender ? animationType !== 'scale' : animationTypeUpdate !== 'transition')
        ) {
            let shape = data.getItemLayout(0);
            for (let s = 1; isNaN(shape.startAngle) && s < data.count(); ++s) {
                shape = data.getItemLayout(s);
            }

            let r = Math.max(api.getWidth(), api.getHeight()) / 2;

            let removeClipPath = zrUtil.bind(group.removeClipPath, group);
            group.setClipPath(this._createClipPath(
                shape.cx, shape.cy, r, shape.startAngle, shape.clockwise, removeClipPath, seriesModel, isFirstRender
            ));
        }
        else {
            // clipPath is used in first-time animation, so remove it when otherwise. See: #8994
            group.removeClipPath();
        }

        this._data = data;
    }

    dispose() {}

    _createClipPath(
        cx: number, cy: number, r: number,
        startAngle: number, clockwise: boolean,
        // @ts-ignore FIXME:TS make type in util.grpahic
        cb,
        seriesModel: PieSeriesModel, isFirstRender: boolean
    ): graphic.Sector {
        let clipPath = new graphic.Sector({
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

        let initOrUpdate = isFirstRender ? graphic.initProps : graphic.updateProps;
        initOrUpdate(clipPath, {
            shape: {
                endAngle: startAngle + (clockwise ? 1 : -1) * Math.PI * 2
            }
        }, seriesModel, cb);

        return clipPath;
    }

    containPoint(point: number[], seriesModel: PieSeriesModel): boolean {
        let data = seriesModel.getData();
        let itemLayout = data.getItemLayout(0);
        if (itemLayout) {
            let dx = point[0] - itemLayout.cx;
            let dy = point[1] - itemLayout.cy;
            let radius = Math.sqrt(dx * dx + dy * dy);
            return radius <= itemLayout.r && radius >= itemLayout.r0;
        }
    }
}

ChartView.registerClass(PieView);

export default PieView;

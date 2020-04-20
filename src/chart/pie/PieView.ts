
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
import { Payload, DisplayState, ECElement, ColorString } from '../../util/types';
import List from '../../data/List';
import PieSeriesModel, {PieDataItemOption} from './PieSeries';
import { Dictionary } from 'zrender/src/core/types';
import Element from 'zrender/src/Element';

function updateDataSelected(
    this: PiePiece,
    uid: string,
    seriesModel: PieSeriesModel,
    hasAnimation: boolean,
    api: ExtensionAPI
): void {
    const data = seriesModel.getData();
    const dataIndex = graphic.getECData(this).dataIndex;
    const name = data.getName(dataIndex);
    const selectedOffset = seriesModel.get('selectedOffset');

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
    const midAngle = (layout.startAngle + layout.endAngle) / 2;

    const dx = Math.cos(midAngle);
    const dy = Math.sin(midAngle);

    const offset = isSelected ? selectedOffset : 0;
    const obj = {
        x: dx * offset,
        y: dy * offset
    };

    hasAnimation
        // animateTo will stop revious animation like update transition
        ? el.animate()
            .when(200, obj)
            .start('bounceOut')
        : el.attr(obj);
}

/**
 * Piece of pie including Sector, Label, LabelLine
 */
class PiePiece extends graphic.Group {

    constructor(data: List, idx: number) {
        super();

        const sector = new graphic.Sector({
            z2: 2
        });

        const polyline = new graphic.Polyline();
        const text = new graphic.Text();
        this.add(sector);
        this.add(polyline);

        sector.setTextContent(text);

        this.updateData(data, idx, true);
    }

    updateData(data: List, idx: number, firstCreate?: boolean): void {
        const sector = this.childAt(0) as graphic.Sector;

        const seriesModel = data.hostModel as PieSeriesModel;
        const itemModel = data.getItemModel<PieDataItemOption>(idx);
        const layout = data.getItemLayout(idx);
        const sectorShape = zrUtil.extend({}, layout);
        // Not animate label
        sectorShape.label = null;
        sectorShape.viewRect = null;

        const animationTypeUpdate = seriesModel.getShallow('animationTypeUpdate');

        if (firstCreate) {
            sector.setShape(sectorShape);

            const animationType = seriesModel.getShallow('animationType');
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

        sector.useStyle(data.getItemVisual(idx, 'style'));
        const sectorEmphasisState = sector.ensureState('emphasis');
        sectorEmphasisState.style = itemModel.getModel(['emphasis', 'itemStyle']).getItemStyle();

        const cursorStyle = itemModel.getShallow('cursor');
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
        const withAnimation = !firstCreate && animationTypeUpdate === 'transition';
        this._updateLabel(data, idx, withAnimation);

        (this as ECElement).onStateChange = (itemModel.get('hoverAnimation') && seriesModel.isAnimationEnabled())
            ? function (fromState: DisplayState, toState: DisplayState): void {
                if (toState === 'emphasis') {

                    // Sector may has animation of updating data. Force to move to the last frame
                    // Or it may stopped on the wrong shape
                    sector.stopAnimation(true);
                    sector.animateTo({
                        shape: {
                            r: layout.r + seriesModel.get('hoverOffset')
                        }
                    }, { duration: 300, easing: 'elasticOut' });
                }
                else {
                    sector.stopAnimation(true);
                    sector.animateTo({
                        shape: {
                            r: layout.r
                        }
                    }, { duration: 300, easing: 'elasticOut' });
                }
            }
            : null;

        graphic.enableHoverEmphasis(this);
    }

    private _updateLabel(data: List, idx: number, withAnimation: boolean): void {
        const sector = this.childAt(0);
        const labelLine = this.childAt(1) as graphic.Polyline;
        const labelText = sector.getTextContent() as graphic.Text;

        const seriesModel = data.hostModel;
        const itemModel = data.getItemModel<PieDataItemOption>(idx);
        const layout = data.getItemLayout(idx);
        const labelLayout = layout.label;
        // let visualColor = data.getItemVisual(idx, 'color');

        const labelTextEmphasisState = labelText.ensureState('emphasis');
        const labelLineEmphasisState = labelLine.ensureState('emphasis');

        if (!labelLayout || isNaN(labelLayout.x) || isNaN(labelLayout.y)) {
            labelText.ignore = labelTextEmphasisState.ignore = true;
            labelLine.ignore = labelLineEmphasisState.ignore = true;
            return;
        }

        const targetLineShape: {
            points: number[][]
        } = {
            points: labelLayout.linePoints || [
                [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y]
            ]
        };
        const labelModel = itemModel.getModel('label');
        const labelHoverModel = itemModel.getModel(['emphasis', 'label']);
        const labelLineModel = itemModel.getModel('labelLine');
        const labelLineHoverModel = itemModel.getModel(['emphasis', 'labelLine']);

        const style = data.getItemVisual(idx, 'style');
        const visualColor = style && style.fill as ColorString;

        graphic.setLabelStyle(
            labelText,
            labelModel,
            labelHoverModel,
            {
                labelFetcher: data.hostModel as PieSeriesModel,
                labelDataIndex: idx,
                defaultText: labelLayout.text
            },
            {
                align: labelLayout.textAlign,
                verticalAlign: labelLayout.verticalAlign,
                opacity: style && style.opacity
            }
        );

        // Set textConfig on sector.
        sector.setTextConfig({
            local: true,
            inside: !!labelLayout.inside,
            insideStroke: visualColor,
            // insideFill: 'auto',
            outsideFill: visualColor
        });

        const targetTextStyle = {
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
            // Make sure update style on labelText after setLabelStyle.
            // Because setLabelStyle will replace a new style on it.
            labelText.attr({
                style: targetTextStyle
            });
        }

        labelText.attr({
            rotation: labelLayout.rotation,
            originX: labelLayout.x,
            originY: labelLayout.y,
            z2: 10
        });

        labelText.ignore = !labelModel.get('show');
        labelTextEmphasisState.ignore = !labelHoverModel.get('show');

        labelLine.ignore = !labelLineModel.get('show');
        labelLineEmphasisState.ignore = !labelLineHoverModel.get('show');

        // Default use item visual color
        labelLine.setStyle({
            stroke: visualColor,
            opacity: style && style.opacity
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
        const sectorGroup = new graphic.Group();
        this._sectorGroup = sectorGroup;
    }

    render(seriesModel: PieSeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        if (payload && (payload.from === this.uid)) {
            return;
        }

        const data = seriesModel.getData();
        const oldData = this._data;
        const group = this.group;

        const hasAnimation = ecModel.get('animation');
        const isFirstRender = !oldData;
        const animationType = seriesModel.get('animationType');
        const animationTypeUpdate = seriesModel.get('animationTypeUpdate');

        const onSectorClick = zrUtil.curry(
            updateDataSelected, this.uid, seriesModel, hasAnimation, api
        );

        const selectedMode = seriesModel.get('selectedMode');
        data.diff(oldData)
            .add(function (idx) {
                const piePiece = new PiePiece(data, idx);
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
                const piePiece = oldData.getItemGraphicEl(oldIdx) as PiePiece;

                graphic.clearStates(piePiece);

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
                const piePiece = oldData.getItemGraphicEl(idx);
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

            const r = Math.max(api.getWidth(), api.getHeight()) / 2;

            const removeClipPath = zrUtil.bind(group.removeClipPath, group);
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
        const clipPath = new graphic.Sector({
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

        const initOrUpdate = isFirstRender ? graphic.initProps : graphic.updateProps;
        initOrUpdate(clipPath, {
            shape: {
                endAngle: startAngle + (clockwise ? 1 : -1) * Math.PI * 2
            }
        }, seriesModel, cb);

        return clipPath;
    }

    containPoint(point: number[], seriesModel: PieSeriesModel): boolean {
        const data = seriesModel.getData();
        const itemLayout = data.getItemLayout(0);
        if (itemLayout) {
            const dx = point[0] - itemLayout.cx;
            const dy = point[1] - itemLayout.cy;
            const radius = Math.sqrt(dx * dx + dy * dy);
            return radius <= itemLayout.r && radius >= itemLayout.r0;
        }
    }
}

ChartView.registerClass(PieView);

export default PieView;

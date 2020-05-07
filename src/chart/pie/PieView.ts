
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
import { Payload, ColorString } from '../../util/types';
import List from '../../data/List';
import PieSeriesModel, {PieDataItemOption} from './PieSeries';
import { ElementAnimateConfig } from 'zrender/src/Element';

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

    api.dispatchAction({
        type: 'pieToggleSelect',
        from: uid,
        name: name,
        seriesId: seriesModel.id
    });

    const animationCfg: ElementAnimateConfig = {
        duration: seriesModel.get('animation') ? 200 : 0,
        easing: 'cubicOut'
    };
    data.each(function (idx) {
        const el = data.getItemGraphicEl(idx);
        el.toggleState('select', seriesModel.isSelected(data.getName(idx)), animationCfg);
    });
}

/**
 * Piece of pie including Sector, Label, LabelLine
 */
class PiePiece extends graphic.Sector {

    constructor(data: List, idx: number, startAngle: number) {
        super();

        this.z2 = 2;

        const polyline = new graphic.Polyline();
        const text = new graphic.Text();

        this.setTextGuideLine(polyline);

        this.setTextContent(text);

        this.updateData(data, idx, startAngle, true);
    }

    updateData(data: List, idx: number, startAngle?: number, firstCreate?: boolean): void {
        const sector = this;

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
                if (startAngle != null) {
                    sector.setShape({ startAngle, endAngle: startAngle });
                    graphic.initProps(sector, {
                        shape: {
                            startAngle: layout.startAngle,
                            endAngle: layout.endAngle
                        }
                    }, seriesModel, idx);
                }
                else {
                    sector.shape.endAngle = layout.startAngle;
                    graphic.updateProps(sector, {
                        shape: {
                            endAngle: layout.endAngle
                        }
                    }, seriesModel, idx);
                }
            }

        }
        else {
            // Transition animation from the old shape
            graphic.updateProps(sector, {
                shape: sectorShape
            }, seriesModel, idx);
        }

        sector.useStyle(data.getItemVisual(idx, 'style'));
        const sectorEmphasisState = sector.ensureState('emphasis');
        sectorEmphasisState.style = itemModel.getModel(['emphasis', 'itemStyle']).getItemStyle();

        const sectorSelectState = sector.ensureState('select');
        const midAngle = (layout.startAngle + layout.endAngle) / 2;
        const offset = seriesModel.get('selectedOffset');
        const dx = Math.cos(midAngle) * offset;
        const dy = Math.sin(midAngle) * offset;
        sectorSelectState.x = dx;
        sectorSelectState.y = dy;


        sector.toggleState('select', seriesModel.isSelected(data.getName(idx)), {
            duration: seriesModel.get('animation') ? 200 : 0,
            easing: 'cubicOut'
        });

        const cursorStyle = itemModel.getShallow('cursor');
        cursorStyle && sector.attr('cursor', cursorStyle);

        // Label and text animation should be applied only for transition type animation when update
        const withAnimation = !firstCreate && animationTypeUpdate === 'transition';
        this._updateLabel(data, idx, withAnimation);

        const emphasisState = sector.ensureState('emphasis');
        emphasisState.shape = {
            r: layout.r + (itemModel.get('hoverAnimation') // TODO: Change a name.
                ? seriesModel.get('hoverOffset') : 0)
        };

        const labelLine = sector.getTextGuideLine();
        const labelText = sector.getTextContent();

        const labelLineSelectState = labelLine.ensureState('select');
        const labelTextSelectState = labelText.ensureState('select');
        labelLineSelectState.x = dx;
        labelLineSelectState.y = dy;
        labelTextSelectState.x = dx;
        labelTextSelectState.y = dy;

        graphic.enableHoverEmphasis(this);
    }

    private _updateLabel(data: List, idx: number, withAnimation: boolean): void {
        const sector = this;
        const labelLine = sector.getTextGuideLine();
        const labelText = sector.getTextContent();

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

        const targetTextPos = {
            x: labelLayout.x,
            y: labelLayout.y
        };
        if (withAnimation) {
            graphic.updateProps(labelLine, {
                shape: targetLineShape
            }, seriesModel, idx);

            graphic.updateProps(labelText, targetTextPos, seriesModel, idx);
        }
        else {
            labelLine.attr({
                shape: targetLineShape
            });
            // Make sure update style on labelText after setLabelStyle.
            // Because setLabelStyle will replace a new style on it.
            labelText.attr(targetTextPos);
        }

        labelText.attr({
            rotation: labelLayout.rotation,
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

        const onSectorClick = zrUtil.curry(
            updateDataSelected, this.uid, seriesModel, hasAnimation, api
        );

        const selectedMode = seriesModel.get('selectedMode');

        let startAngle: number;
        // First render
        if (!oldData) {
            let shape = data.getItemLayout(0) as graphic.Sector['shape'];
            for (let s = 1; isNaN(shape.startAngle) && s < data.count(); ++s) {
                shape = data.getItemLayout(s);
            }
            if (shape) {
                startAngle = shape.startAngle;
            }
        }

        data.diff(oldData)
            .add(function (idx) {
                const piePiece = new PiePiece(data, idx, startAngle);

                selectedMode && piePiece.on('click', onSectorClick);

                data.setItemGraphicEl(idx, piePiece);

                group.add(piePiece);
            })
            .update(function (newIdx, oldIdx) {
                const piePiece = oldData.getItemGraphicEl(oldIdx) as PiePiece;

                graphic.clearStates(piePiece);

                piePiece.updateData(data, newIdx, startAngle);

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

        // Always use initial animation.
        if (seriesModel.get('animationTypeUpdate') !== 'expansion') {
            this._data = data;
        }
    }

    dispose() {}

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

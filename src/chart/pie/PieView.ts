
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


import { extend, curry } from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import { setStatesStylesFromModel, enableHoverEmphasis } from '../../util/states';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { Payload, ColorString, ECElement } from '../../util/types';
import List from '../../data/List';
import PieSeriesModel, {PieDataItemOption} from './PieSeries';
import labelLayout from './labelLayout';
import { setLabelLineStyle, getLabelLineStatesModels } from '../../label/labelGuideHelper';
import Model from '../../model/Model';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';

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
        const emphasisModel = itemModel.getModel('emphasis');
        const layout = data.getItemLayout(idx);
        const sectorShape = extend({}, layout);

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
        setStatesStylesFromModel(sector, itemModel);

        const midAngle = (layout.startAngle + layout.endAngle) / 2;
        const offset = seriesModel.get('selectedOffset');
        const dx = Math.cos(midAngle) * offset;
        const dy = Math.sin(midAngle) * offset;

        const cursorStyle = itemModel.getShallow('cursor');
        cursorStyle && sector.attr('cursor', cursorStyle);

        this._updateLabel(seriesModel, data, idx);


        sector.ensureState('emphasis').shape = {
            r: layout.r + (itemModel.get('hoverAnimation') // TODO: Change a name.
                ? seriesModel.get('hoverOffset') : 0)
        };
        extend(sector.ensureState('select'), {
            x: dx,
            y: dy
        });

        const labelLine = sector.getTextGuideLine();
        const labelText = sector.getTextContent();

        extend(labelLine.ensureState('select'), {
            x: dx,
            y: dy
        });
        // TODO: needs dx, dy in zrender?
        extend(labelText.ensureState('select'), {
            x: dx,
            y: dy
        });

        enableHoverEmphasis(this, emphasisModel.get('focus'), emphasisModel.get('blurScope'));

        // State will be set after all rendered in the pipeline.
        (sector as ECElement).selected = seriesModel.isSelected(data.getName(idx));
    }

    private _updateLabel(seriesModel: PieSeriesModel, data: List, idx: number): void {
        const sector = this;
        const labelText = sector.getTextContent();

        const itemModel = data.getItemModel<PieDataItemOption>(idx);

        const labelTextEmphasisState = labelText.ensureState('emphasis');

        const labelModel = itemModel.getModel('label');
        const labelHoverModel = itemModel.getModel(['emphasis', 'label']);

        const style = data.getItemVisual(idx, 'style');
        const visualColor = style && style.fill as ColorString;

        setLabelStyle(
            sector,
            getLabelStatesModels(itemModel),
            {
                labelFetcher: data.hostModel as PieSeriesModel,
                labelDataIndex: idx,
                inheritColor: visualColor,
                defaultText: seriesModel.getFormattedLabel(idx, 'normal')
                    || data.getName(idx)
            },
            { normal: {
                opacity: style && style.opacity
            } }
        );

        // Set textConfig on sector.
        sector.setTextConfig({
            // reset position, rotation
            position: null,
            rotation: null
        });

        // Make sure update style on labelText after setLabelStyle.
        // Because setLabelStyle will replace a new style on it.

        labelText.attr({
            z2: 10
        });

        labelText.ignore = !labelModel.get('show');
        labelTextEmphasisState.ignore = !labelHoverModel.get('show');

        // Default use item visual color
        setLabelLineStyle(this, getLabelLineStatesModels(itemModel), {
            stroke: visualColor,
            opacity: style && style.opacity
        });
    }
}


// Pie view
class PieView extends ChartView {

    static type = 'pie';

    ignoreLabelLineUpdate = true;

    private _sectorGroup: graphic.Group;
    private _data: List;

    init(): void {
        const sectorGroup = new graphic.Group();
        this._sectorGroup = sectorGroup;
    }

    render(seriesModel: PieSeriesModel, ecModel: GlobalModel, api: ExtensionAPI, payload: Payload): void {
        const data = seriesModel.getData();
        if (payload && (payload.from === this.uid)) {
            // update selected status
            data.each(function (idx) {
                const el = data.getItemGraphicEl(idx);
                (el as ECElement).selected = seriesModel.isSelected(data.getName(idx));
            });

            return;
        }

        const oldData = this._data;
        const group = this.group;

        const hasAnimation = ecModel.get('animation');

        const onSectorClick = curry(updateDataSelected, this.uid, seriesModel, hasAnimation, api);

        const selectedMode = seriesModel.get('selectedMode');

        let startAngle: number;
        // First render
        if (!oldData && data.count() > 0) {
            let shape = data.getItemLayout(0) as graphic.Sector['shape'];
            for (let s = 1; isNaN(shape && shape.startAngle) && s < data.count(); ++s) {
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

                piePiece.updateData(data, newIdx, startAngle);

                piePiece.off('click');
                selectedMode && piePiece.on('click', onSectorClick);
                group.add(piePiece);
                data.setItemGraphicEl(newIdx, piePiece);
            })
            .remove(function (idx) {
                const piePiece = oldData.getItemGraphicEl(idx);
                graphic.removeElementWithFadeOut(piePiece, seriesModel, idx);
            })
            .execute();

        labelLayout(seriesModel);

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

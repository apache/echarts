
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


import { extend, retrieve3 } from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import { setStatesStylesFromModel, enableHoverEmphasis } from '../../util/states';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { Payload, ColorString } from '../../util/types';
import List from '../../data/List';
import PieSeriesModel, {PieDataItemOption} from './PieSeries';
import labelLayout from './labelLayout';
import { setLabelLineStyle, getLabelLineStatesModels } from '../../label/labelGuideHelper';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import { getSectorCornerRadius } from '../helper/pieHelper';

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
        const sectorShape = extend(
            getSectorCornerRadius(itemModel.getModel('itemStyle'), layout) || {},
            layout
        );

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
            r: layout.r + (emphasisModel.get('scale')
                ? (emphasisModel.get('scaleSize') || 0) : 0),
            ...getSectorCornerRadius(emphasisModel.getModel('itemStyle'), layout)
        };
        extend(sector.ensureState('select'), {
            x: dx,
            y: dy,
            shape: getSectorCornerRadius(itemModel.getModel(['select', 'itemStyle']), layout)
        });
        extend(sector.ensureState('blur'), {
            shape: getSectorCornerRadius(itemModel.getModel(['blur', 'itemStyle']), layout)
        });

        const labelLine = sector.getTextGuideLine();
        const labelText = sector.getTextContent();

        labelLine && extend(labelLine.ensureState('select'), {
            x: dx,
            y: dy
        });
        // TODO: needs dx, dy in zrender?
        extend(labelText.ensureState('select'), {
            x: dx,
            y: dy
        });

        enableHoverEmphasis(this, emphasisModel.get('focus'), emphasisModel.get('blurScope'));
    }

    private _updateLabel(seriesModel: PieSeriesModel, data: List, idx: number): void {
        const sector = this;
        const itemModel = data.getItemModel<PieDataItemOption>(idx);
        const labelLineModel = itemModel.getModel('labelLine');

        const style = data.getItemVisual(idx, 'style');
        const visualColor = style && style.fill as ColorString;
        const visualOpacity = style && style.opacity;

        setLabelStyle(
            sector,
            getLabelStatesModels(itemModel),
            {
                labelFetcher: data.hostModel as PieSeriesModel,
                labelDataIndex: idx,
                inheritColor: visualColor,
                defaultOpacity: visualOpacity,
                defaultText: seriesModel.getFormattedLabel(idx, 'normal')
                    || data.getName(idx)
            }
        );
        const labelText = sector.getTextContent();

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

        const labelPosition = seriesModel.get(['label', 'position']);
        if (labelPosition !== 'outside' && labelPosition !== 'outer') {
            sector.getTextGuideLine()?.hide();
            return;
        }
        // Default use item visual color
        setLabelLineStyle(this, getLabelLineStatesModels(itemModel), {
            stroke: visualColor,
            opacity: retrieve3(labelLineModel.get(['lineStyle', 'opacity']), visualOpacity, 1)
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

        const oldData = this._data;
        const group = this.group;

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

                data.setItemGraphicEl(idx, piePiece);

                group.add(piePiece);
            })
            .update(function (newIdx, oldIdx) {
                const piePiece = oldData.getItemGraphicEl(oldIdx) as PiePiece;

                piePiece.updateData(data, newIdx, startAngle);

                piePiece.off('click');

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

export default PieView;

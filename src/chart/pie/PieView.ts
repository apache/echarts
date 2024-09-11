
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
import { setStatesStylesFromModel, toggleHoverEmphasis } from '../../util/states';
import ChartView from '../../view/Chart';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { Payload, ColorString } from '../../util/types';
import SeriesData from '../../data/SeriesData';
import PieSeriesModel, { PieDataItemOption } from './PieSeries';
import labelLayout from './labelLayout';
import { setLabelLineStyle, getLabelLineStatesModels } from '../../label/labelGuideHelper';
import { setLabelStyle, getLabelStatesModels, createTextStyle } from '../../label/labelStyle';
import { getSectorCornerRadius } from '../helper/pieHelper';
import { saveOldStyle } from '../../animation/basicTransition';
import { getBasicPieLayout, getSeriesLayoutData } from './pieLayout';
import { parsePercent } from '../../util/number';


interface PosInfo {
    cx: number;
    cy: number;
    r: number;
    offsetX: number;
    offsetY: number;

}

function parsePosition(seriesModel: PieSeriesModel, api: ExtensionAPI): PosInfo {
    const { top, right, bottom, left } = seriesModel?.option;
    const center = seriesModel.get('center') as (string | number)[]; // !TODO: we don't have cases without arrays but...
    const radius = seriesModel.get('radius') as (string | number)[]; // !TODO: we don't have cases without arrays but...
    const width = api.getWidth();
    const height = api.getHeight();
    const size = Math.min(width, height);
    const cx = parsePercent(center[0], width);
    const cy = parsePercent(center[1], height);
    const r = parsePercent(radius[0], size / 2);
    const offsetX = (+left - +right) / 2;
    const offsetY = (+top - +bottom) / 2;

    return {
        cx,
        cy,
        r,
        offsetX,
        offsetY
    };
}

/**
 * Piece of pie including Sector, Label, LabelLine
 */
class PiePiece extends graphic.Sector {

    constructor(data: SeriesData, idx: number, startAngle: number) {
        super();

        this.z2 = 2;

        const text = new graphic.Text();

        this.setTextContent(text);

        this.updateData(data, idx, startAngle, true);
    }

    updateData(data: SeriesData, idx: number, startAngle?: number, firstCreate?: boolean): void {
        const sector = this;

        const seriesModel = data.hostModel as PieSeriesModel;
        const itemModel = data.getItemModel<PieDataItemOption>(idx);
        const emphasisModel = itemModel.getModel('emphasis');
        const layout = data.getItemLayout(idx) as graphic.Sector['shape'];
        // cornerRadius & innerCornerRadius doesn't exist in the item layout. Use `0` if null value is specified.
        // see `setItemLayout` in `pieLayout.ts`.
        const sectorShape = extend(
            getSectorCornerRadius(itemModel.getModel('itemStyle'), layout, true),
            layout
        );

        // Ignore NaN data.
        if (isNaN(sectorShape.startAngle)) {
            // Use NaN shape to avoid drawing shape.
            sector.setShape(sectorShape);
            return;
        }

        if (firstCreate) {
            sector.setShape(sectorShape);

            const animationType = seriesModel.getShallow('animationType');
            if (seriesModel.ecModel.ssr) {
                // Use scale animation in SSR mode(opacity?)
                // Because CSS SVG animation doesn't support very customized shape animation.
                graphic.initProps(sector, {
                    scaleX: 0,
                    scaleY: 0
                }, seriesModel, { dataIndex: idx, isFrom: true });
                sector.originX = sectorShape.cx;
                sector.originY = sectorShape.cy;
            }
            else if (animationType === 'scale') {
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
            saveOldStyle(sector);
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

        sector.ensureState('emphasis').shape = extend({
            r: layout.r + (emphasisModel.get('scale')
                ? (emphasisModel.get('scaleSize') || 0) : 0)
        }, getSectorCornerRadius(emphasisModel.getModel('itemStyle'), layout));
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

        toggleHoverEmphasis(
            this, emphasisModel.get('focus'), emphasisModel.get('blurScope'), emphasisModel.get('disabled')
        );
    }

    private _updateLabel(seriesModel: PieSeriesModel, data: SeriesData, idx: number): void {
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
            sector.removeTextGuideLine();
        }
        else {
            let polyline = this.getTextGuideLine();
            if (!polyline) {
                polyline = new graphic.Polyline();
                this.setTextGuideLine(polyline);
            }

            // Default use item visual color
            setLabelLineStyle(this, getLabelLineStatesModels(itemModel), {
                stroke: visualColor,
                opacity: retrieve3(labelLineModel.get(['lineStyle', 'opacity']), visualOpacity, 1)
            });
        }
    }
}


// Pie view
class PieView extends ChartView {

    static type = 'pie';

    ignoreLabelLineUpdate = true;

    private _data: SeriesData;
    private _emptyCircleSector: graphic.Sector;
    private _titleEls: graphic.Text[];

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

        // remove empty-circle if it exists
        if (this._emptyCircleSector) {
            group.remove(this._emptyCircleSector);
        }
        // when all data are filtered, show lightgray empty circle
        if (data.count() === 0 && seriesModel.get('showEmptyCircle')) {
            const layoutData = getSeriesLayoutData(seriesModel);
            const sector = new graphic.Sector({
                shape: extend(getBasicPieLayout(seriesModel, api), layoutData)
            });

            sector.useStyle(seriesModel.getModel('emptyCircleStyle').getItemStyle());
            this._emptyCircleSector = sector;
            group.add(sector);
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

        this._renderTitle(seriesModel, ecModel, api);
    }

    dispose() { }

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

    _renderTitle(
        seriesModel: PieSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        const title = seriesModel?.option.title;
        if (!title) {
            if (this._titleEls) {
                this.group.remove(this._titleEls[0]);
                this._titleEls = null;
            }
            return;
        }

        const posInfo = parsePosition(seriesModel, api);
        const data = seriesModel.getData();

        const valueDim = data.mapDimension('value');
        let titleStr = title.str;

        if (title.isSum) {
            const sumVal = data.getSum(valueDim);
            titleStr += title?.formatter ? title.formatter(sumVal) : `${sumVal}`;
        }

        const newTitleEls: graphic.Text[] = this._titleEls || [new graphic.Text({
            silent: true
        })];

        const itemModel = data.getItemModel<PieSeriesModel>(0);

        const titleX = posInfo.cx + posInfo.offsetX + parsePercent(title.offset?.[0] ?? 0, posInfo.r);
        const titleY = posInfo.cy + posInfo.offsetY + parsePercent(title.offset?.[1] ?? 0, posInfo.r);
        const labelEl = newTitleEls[0];
        labelEl.attr({
            z2: 2,
            style: createTextStyle(itemModel, {
                x: titleX,
                y: titleY,
                text: titleStr,
                align: 'center',
                verticalAlign: 'middle',
                fill: title?.style?.color || '#000000',
                fontWeight: 600,
                overflow: 'break',
                ...title.style
            }, {})
        });

        this.group.add(labelEl);
        this._titleEls = newTitleEls;
    }
}

export default PieView;

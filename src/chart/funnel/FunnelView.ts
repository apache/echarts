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
import { setStatesStylesFromModel, toggleHoverEmphasis } from '../../util/states';
import ChartView from '../../view/Chart';
import FunnelSeriesModel, {FunnelDataItemOption} from './FunnelSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesData from '../../data/SeriesData';
import {
    ColorString,
    DimensionLoose,
    DisplayState,
    InterpolatableValue,
    OptionDataValue,
    SeriesDataType
} from '../../util/types';
import { setLabelLineStyle, getLabelLineStatesModels } from '../../label/labelGuideHelper';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import { saveOldStyle } from '../../animation/basicTransition';
import { formatTpl } from '../../util/format';
import { error } from '../../util/log';
import { retrieveRawValue } from '../../data/helper/dataProvider';

const opacityAccessPath = ['itemStyle', 'opacity'] as const;
const DIMENSION_LABEL_REG = /\{@(.+?)\}/g;

const rateLabelFetcher = {
    getFormattedLabel(
        // In MapDraw case it can be string (region name)
        labelDataIndex: number,
        status: DisplayState,
        dataType?: SeriesDataType,
        labelDimIndex?: number,
        formatter?: string | ((params: object) => string),
        // If provided, the implementation of `getFormattedLabel` can use it
        // to generate the final label text.
        extendParams?: {
            interpolatedValue: InterpolatableValue
        }
    ): string {
        status = status || 'normal';
        const { hostModel, layout } = this as unknown as { hostModel: FunnelSeriesModel, layout: any };
        const data = hostModel.getData(dataType);

        const { rate, isLastPiece, nextName, preName } = layout;
        const params = { ...hostModel.getDataParams(labelDataIndex), rate, isLastPiece, nextName, preName };

        if (extendParams) {
            params.value = extendParams.interpolatedValue;
        }

        if (labelDimIndex != null && zrUtil.isArray(params.value)) {
            params.value = params.value[labelDimIndex];
        }

        if (!formatter) {
            const itemModel = data.getItemModel(labelDataIndex);
            // @ts-ignore
            formatter = itemModel.get(status === 'normal'
                ? ['rateLabel', 'formatter']
                : [status, 'rateLabel', 'formatter']
            );
            if (!formatter) {
                return;
            }
        }
        if (zrUtil.isFunction(formatter)) {
            params.status = status;
            params.dimensionIndex = labelDimIndex;
            return formatter(params);
        }
        else if (zrUtil.isString(formatter)) {
            params.$vars.push('preName'); // e
            params.$vars.push('nextName'); // f
            params.$vars.push('rate'); // g
            const str = formatTpl(formatter, params);
            // Support 'aaa{@[3]}bbb{@product}ccc'.
            // Do not support '}' in dim name util have to.
            return str.replace(DIMENSION_LABEL_REG, function (origin, dimStr: string) {
                const len = dimStr.length;

                let dimLoose: DimensionLoose = dimStr;
                if (dimLoose.charAt(0) === '[' && dimLoose.charAt(len - 1) === ']') {
                    dimLoose = +dimLoose.slice(1, len - 1); // Also support: '[]' => 0
                    if (__DEV__) {
                        if (isNaN(dimLoose)) {
                            error(`Invalide label formatter: @${dimStr}, only support @[0], @[1], @[2], ...`);
                        }
                    }
                }

                let val = retrieveRawValue(data, labelDataIndex, dimLoose) as OptionDataValue;

                if (extendParams && zrUtil.isArray(extendParams.interpolatedValue)) {
                    const dimIndex = data.getDimensionIndex(dimLoose);
                    if (dimIndex >= 0) {
                        val = extendParams.interpolatedValue[dimIndex];
                    }
                }

                return val != null ? val + '' : '';
            });
        }
        return '';
    }
};

/**
 * Piece of pie including Sector, Label, LabelLine
 */
class FunnelPiece extends graphic.Polygon {

    /**
     * @param type judge is data blocks or conversion blocks
     */

    constructor(data: SeriesData, idx: number, type: 'data' | 'rate') {
        super();

        const polygon = this;
        const labelLine = new graphic.Polyline();
        const text = new graphic.Text();
        polygon.setTextContent(text);
        this.setTextGuideLine(labelLine);

        this.updateData(data, idx, type, true);
    }

    updateData(data: SeriesData, idx: number, type: 'data' | 'rate', firstCreate?: boolean) {

        const polygon = this;

        const seriesModel = data.hostModel;
        const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        const layout = data.getItemLayout(idx);
        const emphasisModel = itemModel.getModel('emphasis');
        let opacity = itemModel.get(opacityAccessPath);
        opacity = opacity == null ? 1 : opacity;
        if (type === 'rate') {
            // the opacity of rate piece is half of data
            opacity /= 2;
        }

        if (!firstCreate) {
            saveOldStyle(polygon);
        }
        // hide the last rate piece and when it not the last one show it again
        polygon.invisible = false;
        if (layout.isLastPiece && type === 'rate') {
            // hide last rate piece
            polygon.invisible = true;
        }
        // Update common style
        polygon.useStyle(data.getItemVisual(idx, 'style'));
        polygon.style.lineJoin = 'round';

        const points = type === 'data' ? layout.points : layout.ratePoints;

        if (firstCreate) {
            polygon.setShape({
                points: points
            });
            polygon.style.opacity = 0;
            graphic.initProps(polygon, {
                style: {
                    opacity: opacity
                }
            }, seriesModel, idx);
        }
        else {
            graphic.updateProps(polygon, {
                style: {
                    opacity: opacity
                },
                shape: {
                    points: points
                }
            }, seriesModel, idx);
        }

        this._updateLabel(data, idx, type);

        setStatesStylesFromModel(polygon, itemModel);
        if (type === 'data') {
            toggleHoverEmphasis(
                this,
                emphasisModel.get('focus'),
                emphasisModel.get('blurScope'),
                emphasisModel.get('disabled')
            );
        }
    }

    _updateLabel(data: SeriesData, idx: number, type: 'data' | 'rate') {
        const polygon = this;
        const labelLine = this.getTextGuideLine();
        const labelText = polygon.getTextContent();

        const seriesModel = data.hostModel as FunnelSeriesModel;
        const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        const layout = data.getItemLayout(idx);
        const labelLayout = layout[type === 'data' ? 'label' : 'rateLabel'];
        const style = data.getItemVisual(idx, 'style');
        const visualColor = style.fill as ColorString;
        // bind this to data of rateLabelFetherFunc
        let rateFetcher: any; // clone default fechter
        if (type === 'rate') {
            rateFetcher = {
                getFormattedLabel: rateLabelFetcher.getFormattedLabel.bind(
                    { hostModel: data.hostModel, layout }
                )
            };
        }

        setLabelStyle(
            // position will not be used in setLabelStyle
            labelText,
            getLabelStatesModels(itemModel, type === 'data' ? undefined : 'rateLabel'),
            {
                labelFetcher: type === 'data' ? data.hostModel as FunnelSeriesModel : rateFetcher,
                labelDataIndex: idx,
                defaultOpacity: style.opacity,
                defaultText: type === 'data' ? data.getName(idx) : layout.rate
            },
            {
                normal: {
                    align: labelLayout.textAlign,
                    verticalAlign: labelLayout.verticalAlign
                }
            }
        );

        polygon.setTextConfig({
            local: true,
            inside: !!labelLayout.inside,
            insideStroke: visualColor,
            // insideFill: 'auto',
            outsideFill: visualColor
        });

        const linePoints = labelLayout.linePoints;

        labelLine.setShape({
            points: linePoints
        });

        polygon.textGuideLineConfig = {
            anchor: linePoints ? new graphic.Point(linePoints[0][0], linePoints[0][1]) : null
        };

        // Make sure update style on labelText after setLabelStyle.
        // Because setLabelStyle will replace a new style on it.
        graphic.updateProps(labelText, {
            style: {
                x: labelLayout.x,
                y: labelLayout.y
            }
        }, seriesModel, idx);

        labelText.attr({
            rotation: labelLayout.rotation,
            originX: labelLayout.x,
            originY: labelLayout.y,
            z2: 10
        });

        setLabelLineStyle(polygon, getLabelLineStatesModels(itemModel), {
            // Default use item visual color
            stroke: visualColor
        });
    }

    // relate ratePiece with dataPiece
    ratePiece: FunnelPiece;
}

class FunnelView extends ChartView {
    static type = 'funnel' as const;
    type = FunnelView.type;

    private _data: SeriesData;

    ignoreLabelLineUpdate = true;

    render(seriesModel: FunnelSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();
        const oldData = this._data;

        const group = this.group;
        // rate in other two mode did not support yet
        const showRate =
            seriesModel.get('showRate')
            && !(
                seriesModel.get('dynamicHeight')
                || seriesModel.get('dynamicArea')
                || seriesModel.get('sort') === 'none'
            );

        data.diff(oldData)
            .add(function (idx) {
                const funnelPiece = new FunnelPiece(data, idx, 'data');

                data.setItemGraphicEl(idx, funnelPiece);

                group.add(funnelPiece);

                if (showRate) {
                    const ratePiece = new FunnelPiece(data, idx, 'rate');
                    group.add(ratePiece);
                    funnelPiece.ratePiece = ratePiece;
                }
            })
            .update(function (newIdx, oldIdx) {
                const piece = oldData.getItemGraphicEl(oldIdx) as FunnelPiece;

                piece.updateData(data, newIdx, 'data');

                group.add(piece);
                data.setItemGraphicEl(newIdx, piece);

                // rate funnel piece may remove in this mount func
                const ratePiece = piece.ratePiece;
                if (showRate) {
                    if (ratePiece) {
                        ratePiece.updateData(data, newIdx, 'rate');
                        group.add(ratePiece);
                    }
                    else {
                        const ratePiece = new FunnelPiece(data, newIdx, 'rate');
                        group.add(ratePiece);
                        piece.ratePiece = ratePiece;
                    }
                }
                else {
                    if (ratePiece) {
                        graphic.removeElementWithFadeOut(ratePiece, seriesModel, oldIdx);
                        piece.ratePiece = null;
                    }
                }
            })
            .remove(function (idx) {
                const piece = oldData.getItemGraphicEl(idx) as FunnelPiece;
                graphic.removeElementWithFadeOut(piece, seriesModel, idx);

                if (showRate) {
                    const ratePiece = piece.ratePiece;
                    graphic.removeElementWithFadeOut(ratePiece, seriesModel, idx);
                }
            })
            .execute();

        this._data = data;
    }

    remove() {
        this.group.removeAll();
        this._data = null;
    }

    dispose() {}
}


export default FunnelView;

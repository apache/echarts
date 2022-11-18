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
import FunnelSeriesModel, { FunnelDataItemOption } from './FunnelSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import SeriesData from '../../data/SeriesData';
import {
    ColorString,
    DisplayState,
    InterpolatableValue,
    SeriesDataType,
    ViewRootGroup
} from '../../util/types';
import { setLabelLineStyle, getLabelLineStatesModels } from '../../label/labelGuideHelper';
import { setLabelStyle, getLabelStatesModels } from '../../label/labelStyle';
import { saveOldStyle } from '../../animation/basicTransition';
import ZRText from 'zrender/src/graphic/Text';

const opacityAccessPath = ['itemStyle', 'opacity'] as const;

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
        const { layout } = this as unknown as { hostModel: FunnelSeriesModel, layout: any };

        const { rate, nextName, preName, preDataIndex, nextDataIndex } = layout;

        type RateParams = {
            rate: string,
            preName: string,
            nextName: string,
            preDataIndex: string,
            nextDataIndex: string
        };

        const params: RateParams = {
            rate,
            preName,
            nextName,
            preDataIndex,
            nextDataIndex
        };

        if (zrUtil.isFunction(formatter)) {
            return formatter(params);
        }

        return '';
    }
};

type Accessory = {
    type: 'rate' | 'overallLabel',
    item: graphic.Polygon | ZRText
};

/**
 * Piece of pie including Sector, Label, LabelLine
 */
class FunnelPiece extends graphic.Polygon {

    constructor(data: SeriesData, idx: number) {
        super();

        const polygon = this;
        const labelLine = new graphic.Polyline();
        const text = new graphic.Text();
        polygon.setTextContent(text);
        this.setTextGuideLine(labelLine);

        this.updateData(data, idx, true);
    }

    updateData(data: SeriesData, idx: number, firstCreate?: boolean) {

        const polygon = this;

        const seriesModel = data.hostModel;
        const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        const layout = data.getItemLayout(idx);
        const emphasisModel = itemModel.getModel('emphasis');
        let opacity = itemModel.get(opacityAccessPath);
        opacity = opacity == null ? 1 : opacity;
        this.isLastPiece = layout.isLastPiece;

        if (!firstCreate) {
            saveOldStyle(polygon);
        }

        // Update common style
        polygon.useStyle(data.getItemVisual(idx, 'style'));
        polygon.style.lineJoin = 'round';

        const points = layout.points;

        if (firstCreate) {
            polygon.setShape({
                points
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
                    points
                }
            }, seriesModel, idx);
        }

        this._updateLabel(data, idx);

        setStatesStylesFromModel(polygon, itemModel);
        toggleHoverEmphasis(
            this,
            emphasisModel.get('focus'),
            emphasisModel.get('blurScope'),
            emphasisModel.get('disabled')
        );
    }

    _updateLabel(data: SeriesData, idx: number) {
        const polygon = this;
        const labelLine = this.getTextGuideLine();
        const labelText = polygon.getTextContent();

        const seriesModel = data.hostModel as FunnelSeriesModel;
        const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        const layout = data.getItemLayout(idx);
        const labelLayout = layout.label;
        const style = data.getItemVisual(idx, 'style');
        const visualColor = style.fill as ColorString;


        setLabelStyle(
            // position will not be used in setLabelStyle
            labelText,
            getLabelStatesModels(itemModel),
            {
                labelFetcher: data.hostModel as FunnelSeriesModel,
                labelDataIndex: idx,
                defaultOpacity: style.opacity,
                defaultText: data.getName(idx)
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
    accessory: Accessory;
    isLastPiece: boolean;
}

function RatePiece(
    data: SeriesData,
    idx: number,
    firstCreate: boolean,
    polygon: graphic.Polygon = new graphic.Polygon()
): graphic.Polygon {
    const seriesModel = data.hostModel;
    const layout = data.getItemLayout(idx);
    const opacity = 0.5;
    const style = data.getItemVisual(idx, 'style');

    polygon.useStyle(style);
    polygon.style.lineJoin = 'round';

    if (!firstCreate) {
        saveOldStyle(polygon);
    }

    const points = layout.ratePoints;

    if (firstCreate) {
        const text = new graphic.Text();
        polygon.setTextConfig(text);

        polygon.setShape({
            points
        });
        polygon.style.opacity = 0;
        graphic.initProps(polygon, {
            style: {
                opacity
            }
        }, seriesModel, idx);
    }
    else {
        graphic.updateProps(polygon, {
            style: {
                opacity
            },
            shape: {
                points
            }
        }, seriesModel, idx);
    }

    const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
    const rateFetcher = {
        getFormattedLabel: rateLabelFetcher.getFormattedLabel.bind(
            { hostModel: data.hostModel, layout }
        )
    };

    setLabelStyle(
        polygon,
        getLabelStatesModels(itemModel, 'rateLabel'),
        {
            labelFetcher: rateFetcher,
            labelDataIndex: idx,
            defaultOpacity: style.opacity,
            defaultText: layout.rate
        },
        {
            normal: {
                align: 'center',
                verticalAlign: 'middle'
            }
        }
    );

    return polygon;
}

function OverallRateLabel(data: SeriesData, idx: number, text: ZRText = new graphic.Text()) {
    const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
    const layout = data.getItemLayout(idx);
    const rateFetcher = {
        getFormattedLabel: rateLabelFetcher.getFormattedLabel.bind(
            { hostModel: data.hostModel, layout }
        )
    };
    const seriesModel = data.hostModel;
    const labelLayout = layout.rateLabel;

    setLabelStyle(
        text,
        getLabelStatesModels(itemModel, 'overallRateLabel'),
        {
            labelFetcher: rateFetcher,
            labelDataIndex: idx,
            defaultOpacity: 1,
            defaultText: layout.rate
        },
        {
            normal: {
                align: labelLayout.textAlign,
                verticalAlign: labelLayout.verticalAlign
            }
        }
    );

    graphic.updateProps(text, {
        style: {
            x: labelLayout.x,
            y: labelLayout.y
        }
    }, seriesModel, idx);

    return text;
}

const initRate = function (
    data: SeriesData,
    idx: number,
    isLastPiece: boolean

): Accessory {
    if (isLastPiece) {
        return {
            type: 'overallLabel',
            item: OverallRateLabel(data, idx)
        };
    }
    return {
        type: 'rate',
        item: RatePiece(data, idx, true)
    };
};

const replaceTop = function (
    data: SeriesData,
    newIdx: number,
    oldIdx: number,
    type: 'rate' | 'overallLabel',
    item: graphic.Polygon | ZRText,
    group: ViewRootGroup,
    piece: FunnelPiece,
    seriesModel: FunnelSeriesModel = data.hostModel as FunnelSeriesModel
) {
    graphic.removeElementWithFadeOut(item, seriesModel, oldIdx);
    const accessory = initRate(data, newIdx, type === 'rate');
    group.add(accessory.item);
    piece.accessory = accessory;
};

const addRateItem = function (
    data: SeriesData,
    newIdx: number,
    piece: FunnelPiece,
    group: ViewRootGroup
) {
    const accessory = initRate(data, newIdx, piece.isLastPiece);
    group.add(accessory.item);
    piece.accessory = accessory;
};

const updateRate = function (
    data: SeriesData,
    newIdx: number,
    oldIdx: number,
    group: ViewRootGroup,
    piece: FunnelPiece,
    isLastPiece: boolean = piece.isLastPiece,
    accessory: Accessory | undefined = piece.accessory
) {
    if (!accessory) {
        addRateItem(data, newIdx, piece, group);
    }
    else {
        const { type, item } = accessory;

        if (isLastPiece && type === 'rate' || !isLastPiece && type === 'overallLabel') {
            replaceTop(data, newIdx, oldIdx, type, item, group, piece);
        }
        else if (isLastPiece && type === 'overallLabel') {
            OverallRateLabel(data, newIdx, item as ZRText);
        }
        else if (!isLastPiece && type === 'rate') {
            RatePiece(data, newIdx, false, item as graphic.Polygon);
        }
    }

};

const removeAccessory = function (
    idx: number,
    piece: FunnelPiece,
    seriesModel: FunnelSeriesModel,
    accessory: Accessory | undefined = piece.accessory
) {
    accessory && graphic.removeElementWithFadeOut(accessory.item, seriesModel, idx);
    piece.accessory = null;
};

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
                || seriesModel.get('sort') === 'none'
            );


        data.diff(oldData)
            .add(function (idx) {
                const funnelPiece = new FunnelPiece(data, idx);

                data.setItemGraphicEl(idx, funnelPiece);

                group.add(funnelPiece);

                showRate && addRateItem(data, idx, funnelPiece, group);
            })
            .update(function (newIdx, oldIdx) {
                const piece = oldData.getItemGraphicEl(oldIdx) as FunnelPiece;

                piece.updateData(data, newIdx);

                group.add(piece);
                data.setItemGraphicEl(newIdx, piece);

                if (showRate) {
                    updateRate(data, newIdx, oldIdx, group, piece);
                }
                else {
                    removeAccessory(oldIdx, piece, seriesModel);
                }
            })
            .remove(function (idx) {
                const piece = oldData.getItemGraphicEl(idx) as FunnelPiece;
                graphic.removeElementWithFadeOut(piece, seriesModel, idx);

                showRate && removeAccessory(idx, piece, seriesModel);
            })
            .execute();

        this._data = data;
    }

    remove() {
        this.group.removeAll();
        this._data = null;
    }

    dispose() { }
};

export default FunnelView;

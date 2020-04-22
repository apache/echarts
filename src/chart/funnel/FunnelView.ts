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

import * as graphic from '../../util/graphic';
import ChartView from '../../view/Chart';
import FunnelSeriesModel, {FunnelDataItemOption} from './FunnelSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import List from '../../data/List';
import { ColorString, LabelOption } from '../../util/types';
import Model from '../../model/Model';

const opacityAccessPath = ['itemStyle', 'opacity'] as const;

/**
 * Piece of pie including Sector, Label, LabelLine
 */
class FunnelPiece extends graphic.Group {

    constructor(data: List, idx: number) {
        super();

        const polygon = new graphic.Polygon();
        const labelLine = new graphic.Polyline();
        const text = new graphic.Text();
        this.add(polygon);
        this.add(labelLine);
        polygon.setTextContent(text);

        this.updateData(data, idx, true);
    }

    updateData(data: List, idx: number, firstCreate?: boolean) {

        const polygon = this.childAt(0) as graphic.Polygon;

        const seriesModel = data.hostModel;
        const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        const layout = data.getItemLayout(idx);
        let opacity = itemModel.get(opacityAccessPath);
        opacity = opacity == null ? 1 : opacity;


        // Update common style
        polygon.useStyle(data.getItemVisual(idx, 'style'));
        polygon.style.lineJoin = 'round';

        if (firstCreate) {
            polygon.setShape({
                points: layout.points
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
                    points: layout.points
                }
            }, seriesModel, idx);
        }

        const polygonEmphasisState = polygon.ensureState('emphasis');
        polygonEmphasisState.style = itemModel.getModel(['emphasis', 'itemStyle']).getItemStyle();

        this._updateLabel(data, idx);

        graphic.enableHoverEmphasis(this);
    }

    _updateLabel(data: List, idx: number) {
        const polygon = this.childAt(0);
        const labelLine = this.childAt(1) as graphic.Polyline;
        const labelText = polygon.getTextContent();

        const seriesModel = data.hostModel;
        const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        const layout = data.getItemLayout(idx);
        const labelLayout = layout.label;
        // let visualColor = data.getItemVisual(idx, 'color');

        const labelModel = itemModel.getModel('label');
        const labelHoverModel = itemModel.getModel(['emphasis', 'label']);
        const labelLineModel = itemModel.getModel('labelLine');
        const labelLineHoverModel = itemModel.getModel(['emphasis', 'labelLine']);

        const visualColor = data.getItemVisual(idx, 'style').fill as ColorString;

        graphic.setLabelStyle(
            // position will not be used in setLabelStyle
            labelText, labelModel as Model<LabelOption>, labelHoverModel as Model<LabelOption>,
            {
                labelFetcher: data.hostModel as FunnelSeriesModel,
                labelDataIndex: idx,
                defaultText: data.getName(idx)
            },
            {
                align: labelLayout.textAlign,
                verticalAlign: labelLayout.verticalAlign
            }
        );

        polygon.setTextConfig({
            local: true,
            inside: !!labelLayout.inside,
            insideStroke: visualColor,
            insideFill: 'auto',
            outsideFill: visualColor
        });

        graphic.updateProps(labelLine, {
            shape: {
                points: labelLayout.linePoints || labelLayout.linePoints
            }
        }, seriesModel, idx);

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

        labelLine.ignore = !labelLineModel.get('show');
        const labelLineEmphasisState = labelLine.ensureState('emphasis');
        labelLineEmphasisState.ignore = !labelLineHoverModel.get('show');

        // Default use item visual color
        labelLine.setStyle({
            stroke: visualColor
        });
        labelLine.setStyle(labelLineModel.getModel('lineStyle').getLineStyle());

        const lineEmphasisState = labelLine.ensureState('emphasis');
        lineEmphasisState.style = labelLineHoverModel.getModel('lineStyle').getLineStyle();
    }
}

class FunnelView extends ChartView {
    static type = 'funnel' as const;
    type = FunnelView.type;

    private _data: List;

    render(seriesModel: FunnelSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        const data = seriesModel.getData();
        const oldData = this._data;

        const group = this.group;

        data.diff(oldData)
            .add(function (idx) {
                const funnelPiece = new FunnelPiece(data, idx);

                data.setItemGraphicEl(idx, funnelPiece);

                group.add(funnelPiece);
            })
            .update(function (newIdx, oldIdx) {
                const piece = oldData.getItemGraphicEl(oldIdx) as FunnelPiece;
                graphic.clearStates(piece);

                piece.updateData(data, newIdx);

                group.add(piece);
                data.setItemGraphicEl(newIdx, piece);
            })
            .remove(function (idx) {
                const piece = oldData.getItemGraphicEl(idx);
                group.remove(piece);
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

ChartView.registerClass(FunnelView);


export default FunnelView;
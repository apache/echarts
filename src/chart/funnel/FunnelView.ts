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
import * as zrUtil from 'zrender/src/core/util';
import ChartView from '../../view/Chart';
import FunnelSeriesModel, {FunnelDataItemOption} from './FunnelSeries';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import List from '../../data/List';
import { DisplayState, ColorString } from '../../util/types';
import Displayable from 'zrender/src/graphic/Displayable';

const opacityAccessPath = ['itemStyle', 'opacity'] as const;

type FunnelLabelEl = Displayable & {
    hoverIgnore?: boolean
    normalIgnore?: boolean
};
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

    onStateChange(fromState: DisplayState, toState: DisplayState) {

        const labelLine = this.childAt(1) as graphic.Polyline;
        const text = this.childAt(2) as graphic.Text;

        if (toState === 'emphasis') {
            labelLine.ignore = (labelLine as FunnelLabelEl).hoverIgnore;
            text.ignore = (text as FunnelLabelEl).hoverIgnore;
        }
        else {
            labelLine.ignore = (labelLine as FunnelLabelEl).normalIgnore;
            text.ignore = (text as FunnelLabelEl).normalIgnore;
        }
    }

    updateData(data: List, idx: number, firstCreate?: boolean) {

        const polygon = this.childAt(0) as graphic.Polygon;

        const seriesModel = data.hostModel;
        const itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        const layout = data.getItemLayout(idx);
        let opacity = itemModel.get(opacityAccessPath);
        opacity = opacity == null ? 1 : opacity;

        // Reset style
        polygon.useStyle({});

        if (firstCreate) {
            polygon.setShape({
                points: layout.points
            });
            polygon.setStyle({opacity: 0});
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

        // Update common style
        polygon.useStyle(data.getItemVisual(idx, 'style'));
        polygon.style.lineJoin = 'round';

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

        const visualColor = data.getItemVisual(idx, 'style').stroke as ColorString;

        graphic.setLabelStyle(
            labelText, labelModel, labelHoverModel,
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

        labelText.ignore = (labelText as FunnelLabelEl).normalIgnore = !labelModel.get('show');
        (labelText as FunnelLabelEl).hoverIgnore = !labelHoverModel.get('show');

        labelLine.ignore = (labelLine as FunnelLabelEl).normalIgnore = !labelLineModel.get('show');
        (labelLine as FunnelLabelEl).hoverIgnore = !labelLineHoverModel.get('show');

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
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
import { DisplayState } from '../../util/types';
import Displayable from 'zrender/src/graphic/Displayable';

const opacityAccessPath = ['itemStyle', 'opacity'] as const;

type FunnelLabelEl = Displayable & {
    hoverIgnore?: boolean
    normalIgnore?: boolean
}
/**
 * Piece of pie including Sector, Label, LabelLine
 */
class FunnelPiece extends graphic.Group {

    constructor(data: List, idx: number) {
        super();

        var polygon = new graphic.Polygon();
        var labelLine = new graphic.Polyline();
        var text = new graphic.Text();
        this.add(polygon);
        this.add(labelLine);
        this.add(text);

        this.updateData(data, idx, true);
    }

    highDownOnUpdate(fromState: DisplayState, toState: DisplayState) {

        var labelLine = this.childAt(1) as graphic.Polyline;
        var text = this.childAt(2) as graphic.Text;

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

        var polygon = this.childAt(0) as graphic.Polygon;

        var seriesModel = data.hostModel;
        var itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        var layout = data.getItemLayout(idx);
        var opacity = itemModel.get(opacityAccessPath);
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
        var itemStyleModel = itemModel.getModel('itemStyle');
        var visualColor = data.getItemVisual(idx, 'color');

        polygon.setStyle(
            zrUtil.defaults(
                {
                    lineJoin: 'round',
                    fill: visualColor
                },
                itemStyleModel.getItemStyle(['opacity'])
            )
        );
        polygon.hoverStyle = itemModel.getModel(['emphasis', 'itemStyle']).getItemStyle();

        this._updateLabel(data, idx);

        graphic.setHoverStyle(this);
    }

    _updateLabel(data: List, idx: number) {

        var labelLine = this.childAt(1) as graphic.Polyline;
        var labelText = this.childAt(2) as graphic.Text;

        var seriesModel = data.hostModel;
        var itemModel = data.getItemModel<FunnelDataItemOption>(idx);
        var layout = data.getItemLayout(idx);
        var labelLayout = layout.label;
        var visualColor = data.getItemVisual(idx, 'color');

        graphic.updateProps(labelLine, {
            shape: {
                points: labelLayout.linePoints || labelLayout.linePoints
            }
        }, seriesModel, idx);

        graphic.updateProps(labelText, {
            style: {
                x: labelLayout.x,
                y: labelLayout.y
            }
        }, seriesModel, idx);
        labelText.attr({
            rotation: labelLayout.rotation,
            origin: [labelLayout.x, labelLayout.y],
            z2: 10
        });

        var labelModel = itemModel.getModel('label');
        var labelHoverModel = itemModel.getModel(['emphasis', 'label']);
        var labelLineModel = itemModel.getModel('labelLine');
        var labelLineHoverModel = itemModel.getModel(['emphasis', 'labelLine']);
        var visualColor = data.getItemVisual(idx, 'color');

        graphic.setLabelStyle(
            labelText.style, labelText.hoverStyle = {}, labelModel, labelHoverModel,
            {
                labelFetcher: data.hostModel as FunnelSeriesModel,
                labelDataIndex: idx,
                defaultText: data.getName(idx),
                autoColor: visualColor,
                useInsideStyle: !!labelLayout.inside
            },
            {
                textAlign: labelLayout.textAlign,
                textVerticalAlign: labelLayout.verticalAlign
            }
        );

        labelText.ignore = (labelText as FunnelLabelEl).normalIgnore = !labelModel.get('show');
        (labelText as FunnelLabelEl).hoverIgnore = !labelHoverModel.get('show');

        labelLine.ignore = (labelLine as FunnelLabelEl).normalIgnore = !labelLineModel.get('show');
        (labelLine as FunnelLabelEl).hoverIgnore = !labelLineHoverModel.get('show');

        // Default use item visual color
        labelLine.setStyle({
            stroke: visualColor
        });
        labelLine.setStyle(labelLineModel.getModel('lineStyle').getLineStyle());

        labelLine.hoverStyle = labelLineHoverModel.getModel('lineStyle').getLineStyle();
    }
}

class FunnelView extends ChartView {
    static type = 'funnel' as const
    type = FunnelView.type

    private _data: List

    render(seriesModel: FunnelSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        var data = seriesModel.getData();
        var oldData = this._data;

        var group = this.group;

        data.diff(oldData)
            .add(function (idx) {
                var funnelPiece = new FunnelPiece(data, idx);

                data.setItemGraphicEl(idx, funnelPiece);

                group.add(funnelPiece);
            })
            .update(function (newIdx, oldIdx) {
                var piece = oldData.getItemGraphicEl(oldIdx) as FunnelPiece;

                piece.updateData(data, newIdx);

                group.add(piece);
                data.setItemGraphicEl(newIdx, piece);
            })
            .remove(function (idx) {
                var piece = oldData.getItemGraphicEl(idx);
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
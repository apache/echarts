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
import SeriesData from '../../data/SeriesData';
import { getSectorCornerRadius } from '../helper/sectorHelper';
import ChordSeriesModel, { ChordNodeItemOption } from './ChordSeries';
import type Model from '../../model/Model';
import type { GraphNode } from '../../data/Graph';
import { getLabelStatesModels, setLabelStyle } from '../../label/labelStyle';
import type { BuiltinTextPosition } from 'zrender/src/core/types';
import { setStatesStylesFromModel, toggleHoverEmphasis } from '../../util/states';
import { getECData } from '../../util/innerStore';

export default class ChordPiece extends graphic.Sector {

    constructor(data: SeriesData, idx: number, startAngle: number) {
        super();
        getECData(this).dataType = 'node';
        this.z2 = 2;

        const text = new graphic.Text();

        this.setTextContent(text);

        this.updateData(data, idx, startAngle, true);
    }

    updateData(data: SeriesData, idx: number, startAngle?: number, firstCreate?: boolean): void {
        const sector = this;
        const node = data.graph.getNodeByIndex(idx);

        const seriesModel = data.hostModel as ChordSeriesModel;
        const itemModel = node.getModel<ChordNodeItemOption>();
        const emphasisModel = itemModel.getModel('emphasis');

        // layout position is the center of the sector
        const layout = data.getItemLayout(idx) as graphic.Sector['shape'];
        const shape: graphic.Sector['shape'] = extend(
            getSectorCornerRadius(itemModel.getModel('itemStyle'), layout, true),
            layout
        );

        const el = this;

        // Ignore NaN data.
        if (isNaN(shape.startAngle)) {
            // Use NaN shape to avoid drawing shape.
            el.setShape(shape);
            return;
        }

        if (firstCreate) {
            el.setShape(shape);
        }
        else {
            graphic.updateProps(el, {
                shape: shape
            }, seriesModel, idx);
        }

        const sectorShape = extend(
            getSectorCornerRadius(
                itemModel.getModel('itemStyle'),
                layout,
                true
            ),
            layout
        );
        sector.setShape(sectorShape);
        sector.useStyle(data.getItemVisual(idx, 'style'));
        setStatesStylesFromModel(sector, itemModel);

        this._updateLabel(seriesModel, itemModel, node);

        data.setItemGraphicEl(idx, el);
        setStatesStylesFromModel(el, itemModel, 'itemStyle');

        // Add focus/blur states handling
        const focus = emphasisModel.get('focus');
        toggleHoverEmphasis(
            this,
            focus === 'adjacency'
                ? node.getAdjacentDataIndices()
                : focus,
            emphasisModel.get('blurScope'),
            emphasisModel.get('disabled')
        );
    }

    protected _updateLabel(
        seriesModel: ChordSeriesModel,
        itemModel: Model<ChordNodeItemOption>,
        node: GraphNode
    ) {
        const label = this.getTextContent();
        const layout = node.getLayout();
        const midAngle = (layout.startAngle + layout.endAngle) / 2;
        const dx = Math.cos(midAngle);
        const dy = Math.sin(midAngle);

        const normalLabelModel = itemModel.getModel('label');
        label.ignore = !normalLabelModel.get('show');

        // Set label style
        const labelStateModels = getLabelStatesModels(itemModel);
        const style = node.getVisual('style');
        setLabelStyle(
            label,
            labelStateModels,
            {
                labelFetcher: {
                    getFormattedLabel(dataIndex, stateName, dataType, labelDimIndex, formatter, extendParams) {
                        return seriesModel.getFormattedLabel(
                            dataIndex, stateName, 'node',
                            labelDimIndex,
                            // ensure edgeLabel formatter is provided
                            // to prevent the inheritance from `label.formatter` of the series
                            retrieve3(
                                formatter,
                                labelStateModels.normal && labelStateModels.normal.get('formatter'),
                                itemModel.get('name')
                            ),
                            extendParams
                        );
                    }
                },
                labelDataIndex: node.dataIndex,
                defaultText: node.dataIndex + '',
                inheritColor: style.fill,
                defaultOpacity: style.opacity,
                defaultOutsidePosition: 'startArc' as BuiltinTextPosition
            }
        );

        // Set label position
        const labelPosition = normalLabelModel.get('position') || 'outside';
        const labelPadding = normalLabelModel.get('distance') || 0;

        let r;
        if (labelPosition === 'outside') {
            r = layout.r + labelPadding;
        }
        else {
            r = (layout.r + layout.r0) / 2;
        }

        this.textConfig = {
            inside: labelPosition !== 'outside'
        };

        const align = labelPosition !== 'outside'
            ? normalLabelModel.get('align') || 'center'
            : (dx > 0 ? 'left' : 'right');

        const verticalAlign = labelPosition !== 'outside'
            ? normalLabelModel.get('verticalAlign') || 'middle'
            : (dy > 0 ? 'top' : 'bottom');

        label.attr({
            x: dx * r + layout.cx,
            y: dy * r + layout.cy,
            rotation: 0,
            style: {
                align,
                verticalAlign
            }
        });
    }
}


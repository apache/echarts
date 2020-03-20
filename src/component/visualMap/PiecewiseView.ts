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
import VisualMapView from './VisualMapView';
import * as graphic from '../../util/graphic';
import {createSymbol} from '../../util/symbol';
import * as layout from '../../util/layout';
import * as helper from './helper';
import PiecewiseModel from './PiecewiseModel';
import ComponentView from '../../view/Component';
import { TextAlign } from 'zrender/src/core/types';
import { VisualMappingOption } from '../../visual/VisualMapping';

class PiecewiseVisualMapView extends VisualMapView {

    static type = 'visualMap.piecewise' as const;

    type = PiecewiseVisualMapView.type;

    visualMapModel: PiecewiseModel;

    protected doRender() {
        let thisGroup = this.group;

        thisGroup.removeAll();

        let visualMapModel = this.visualMapModel;
        let textGap = visualMapModel.get('textGap');
        let textStyleModel = visualMapModel.textStyleModel;
        let textFont = textStyleModel.getFont();
        let textFill = textStyleModel.getTextColor();
        let itemAlign = this._getItemAlign();
        let itemSize = visualMapModel.itemSize;
        let viewData = this._getViewData();
        let endsText = viewData.endsText;
        let showLabel = zrUtil.retrieve(visualMapModel.get('showLabel', true), !endsText);

        endsText && this._renderEndsText(
            thisGroup, endsText[0], itemSize, showLabel, itemAlign
        );

        zrUtil.each(viewData.viewPieceList, function (item: typeof viewData.viewPieceList[number]) {
            let piece = item.piece;

            let itemGroup = new graphic.Group();
            itemGroup.onclick = zrUtil.bind(this._onItemClick, this, piece);

            this._enableHoverLink(itemGroup, item.indexInModelPieceList);

            // TODO Category
            let representValue = visualMapModel.getRepresentValue(piece) as number;

            this._createItemSymbol(
                itemGroup, representValue, [0, 0, itemSize[0], itemSize[1]]
            );

            if (showLabel) {
                let visualState = this.visualMapModel.getValueState(representValue);

                itemGroup.add(new graphic.Text({
                    style: {
                        x: itemAlign === 'right' ? -textGap : itemSize[0] + textGap,
                        y: itemSize[1] / 2,
                        text: piece.text,
                        textVerticalAlign: 'middle',
                        textAlign: itemAlign as TextAlign,
                        textFont: textFont,
                        textFill: textFill,
                        opacity: visualState === 'outOfRange' ? 0.5 : 1
                    }
                }));
            }

            thisGroup.add(itemGroup);
        }, this);

        endsText && this._renderEndsText(
            thisGroup, endsText[1], itemSize, showLabel, itemAlign
        );

        layout.box(
            visualMapModel.get('orient'), thisGroup, visualMapModel.get('itemGap')
        );

        this.renderBackground(thisGroup);

        this.positionGroup(thisGroup);


    }

    private _enableHoverLink(itemGroup: graphic.Group, pieceIndex: number) {
        itemGroup
            .on('mouseover', () => onHoverLink('highlight'))
            .on('mouseout', () => onHoverLink('downplay'));

        const onHoverLink = (method?: 'highlight' | 'downplay') => {
            let visualMapModel = this.visualMapModel;

            // TODO: TYPE More detailed action types
            visualMapModel.option.hoverLink && this.api.dispatchAction({
                type: method,
                batch: helper.makeHighDownBatch(
                    visualMapModel.findTargetDataIndices(pieceIndex),
                    visualMapModel
                )
            });
        };
    }

    private _getItemAlign(): helper.ItemAlign {
        let visualMapModel = this.visualMapModel;
        let modelOption = visualMapModel.option;

        if (modelOption.orient === 'vertical') {
            return helper.getItemAlign(
                visualMapModel, this.api, visualMapModel.itemSize
            );
        }
        else { // horizontal, most case left unless specifying right.
            let align = modelOption.align;
            if (!align || align === 'auto') {
                align = 'left';
            }
            return align;
        }
    }

    private _renderEndsText(
        group: graphic.Group,
        text: string,
        itemSize: number[],
        showLabel: boolean,
        itemAlign: helper.ItemAlign
    ) {
        if (!text) {
            return;
        }

        let itemGroup = new graphic.Group();
        let textStyleModel = this.visualMapModel.textStyleModel;

        itemGroup.add(new graphic.Text({
            style: {
                x: showLabel ? (itemAlign === 'right' ? itemSize[0] : 0) : itemSize[0] / 2,
                y: itemSize[1] / 2,
                textVerticalAlign: 'middle',
                textAlign: showLabel ? (itemAlign as TextAlign) : 'center',
                text: text,
                textFont: textStyleModel.getFont(),
                textFill: textStyleModel.getTextColor()
            }
        }));

        group.add(itemGroup);
    }

    /**
     * @private
     * @return {Object} {peiceList, endsText} The order is the same as screen pixel order.
     */
    private _getViewData() {
        let visualMapModel = this.visualMapModel;

        let viewPieceList = zrUtil.map(visualMapModel.getPieceList(), function (piece, index) {
            return {piece: piece, indexInModelPieceList: index};
        });
        let endsText = visualMapModel.get('text');

        // Consider orient and inverse.
        let orient = visualMapModel.get('orient');
        let inverse = visualMapModel.get('inverse');

        // Order of model pieceList is always [low, ..., high]
        if (orient === 'horizontal' ? inverse : !inverse) {
            viewPieceList.reverse();
        }
        // Origin order of endsText is [high, low]
        else if (endsText) {
            endsText = endsText.slice().reverse();
        }

        return {viewPieceList: viewPieceList, endsText: endsText};
    }

    private _createItemSymbol(
        group: graphic.Group,
        representValue: number,
        shapeParam: number[]
    ) {
        group.add(createSymbol(
            // symbol will be string
            this.getControllerVisual(representValue, 'symbol') as string,
            shapeParam[0], shapeParam[1], shapeParam[2], shapeParam[3],
            // color will be string
            this.getControllerVisual(representValue, 'color') as string
        ));
    }

    private _onItemClick(
        piece: VisualMappingOption['pieceList'][number]
    ) {
        let visualMapModel = this.visualMapModel;
        let option = visualMapModel.option;
        let selected = zrUtil.clone(option.selected);
        let newKey = visualMapModel.getSelectedMapKey(piece);

        if (option.selectedMode === 'single') {
            selected[newKey] = true;
            zrUtil.each(selected, function (o, key) {
                selected[key] = key === newKey;
            });
        }
        else {
            selected[newKey] = !selected[newKey];
        }

        this.api.dispatchAction({
            type: 'selectDataRange',
            from: this.uid,
            visualMapId: this.visualMapModel.id,
            selected: selected
        });
    }
}

ComponentView.registerClass(PiecewiseVisualMapView);

export default PiecewiseVisualMapView;
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
import { toggleHoverEmphasis, SPECIAL_STATES, DISPLAY_STATES } from '../../util/states';
import {createTextStyle} from '../../label/labelStyle';
import { TreeNode } from '../../data/Tree';
import SunburstSeriesModel, { SunburstSeriesNodeItemOption, SunburstSeriesOption } from './SunburstSeries';
import GlobalModel from '../../model/Global';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { ColorString } from '../../util/types';
import Model from '../../model/Model';
import { getECData } from '../../util/innerStore';
import { getSectorCornerRadius } from '../helper/sectorHelper';
import {createOrUpdatePatternFromDecal} from '../../util/decal';
import ExtensionAPI from '../../core/ExtensionAPI';
import { saveOldStyle } from '../../animation/basicTransition';
import { normalizeRadian } from 'zrender/src/contain/util';

const DEFAULT_SECTOR_Z = 2;
const DEFAULT_TEXT_Z = 4;
interface DrawTreeNode extends TreeNode {
    piece: SunburstPiece
}
/**
 * Sunburstce of Sunburst including Sector, Label, LabelLine
 */
class SunburstPiece extends graphic.Sector {

    node: TreeNode;

    private _seriesModel: SunburstSeriesModel;
    private _ecModel: GlobalModel;

    constructor(node: TreeNode, seriesModel: SunburstSeriesModel, ecModel: GlobalModel, api: ExtensionAPI) {
        super();

        this.z2 = DEFAULT_SECTOR_Z;
        this.textConfig = {
            inside: true
        };

        getECData(this).seriesIndex = seriesModel.seriesIndex;

        const text = new graphic.Text({
            z2: DEFAULT_TEXT_Z,
            silent: node.getModel<SunburstSeriesNodeItemOption>().get(['label', 'silent'])
        });
        this.setTextContent(text);

        this.updateData(true, node, seriesModel, ecModel, api);
    }

    updateData(
        firstCreate: boolean,
        node: TreeNode,
        // state: 'emphasis' | 'normal' | 'highlight' | 'downplay',
        seriesModel: SunburstSeriesModel,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        this.node = node;
        (node as DrawTreeNode).piece = this;

        seriesModel = seriesModel || this._seriesModel;
        ecModel = ecModel || this._ecModel;

        const sector = this;
        getECData(sector).dataIndex = node.dataIndex;

        const itemModel = node.getModel<SunburstSeriesNodeItemOption>();
        const emphasisModel = itemModel.getModel('emphasis');
        const layout = node.getLayout();

        const sectorShape = zrUtil.extend({}, layout);
        sectorShape.label = null;

        const normalStyle = node.getVisual('style') as PathStyleProps;
        normalStyle.lineJoin = 'bevel';

        const decal = node.getVisual('decal');
        if (decal) {
            normalStyle.decal = createOrUpdatePatternFromDecal(decal, api);
        }

        const cornerRadius = getSectorCornerRadius(itemModel.getModel('itemStyle'), sectorShape, true);
        zrUtil.extend(sectorShape, cornerRadius);

        zrUtil.each(SPECIAL_STATES, function (stateName) {
            const state = sector.ensureState(stateName);
            const itemStyleModel = itemModel.getModel([stateName, 'itemStyle']);
            state.style = itemStyleModel.getItemStyle();
            // border radius
            const cornerRadius = getSectorCornerRadius(itemStyleModel, sectorShape);
            if (cornerRadius) {
                state.shape = cornerRadius;
            }
        });

        if (firstCreate) {
            sector.setShape(sectorShape);
            sector.shape.r = layout.r0;
            graphic.initProps(
                sector,
                {
                    shape: {
                        r: layout.r
                    }
                },
                seriesModel,
                node.dataIndex
            );
        }
        else {
            // Disable animation for gradient since no interpolation method
            // is supported for gradient
            graphic.updateProps(sector, {
                shape: sectorShape
            }, seriesModel);

            saveOldStyle(sector);
        }

        sector.useStyle(normalStyle);

        this._updateLabel(seriesModel);

        const cursorStyle = itemModel.getShallow('cursor');
        cursorStyle && sector.attr('cursor', cursorStyle);

        this._seriesModel = seriesModel || this._seriesModel;
        this._ecModel = ecModel || this._ecModel;

        const focus = emphasisModel.get('focus');

        const focusOrIndices =
            focus === 'ancestor' ? node.getAncestorsIndices()
            : focus === 'descendant' ? node.getDescendantIndices()
            : focus;

        toggleHoverEmphasis(this, focusOrIndices, emphasisModel.get('blurScope'), emphasisModel.get('disabled'));
    }

    _updateLabel(
        seriesModel: SunburstSeriesModel
    ) {
        const itemModel = this.node.getModel<SunburstSeriesNodeItemOption>();
        const normalLabelModel = itemModel.getModel('label');

        const layout = this.node.getLayout();
        const angle = layout.endAngle - layout.startAngle;

        const midAngle = (layout.startAngle + layout.endAngle) / 2;
        const dx = Math.cos(midAngle);
        const dy = Math.sin(midAngle);

        const sector = this;
        const label = sector.getTextContent();
        const dataIndex = this.node.dataIndex;
        const labelMinAngle = normalLabelModel.get('minAngle') / 180 * Math.PI;
        const isNormalShown = normalLabelModel.get('show')
            && !(labelMinAngle != null && Math.abs(angle) < labelMinAngle);
        label.ignore = !isNormalShown;

        // TODO use setLabelStyle
        zrUtil.each(DISPLAY_STATES, (stateName) => {

            const labelStateModel = stateName === 'normal' ? itemModel.getModel('label')
                : itemModel.getModel([stateName, 'label']);
            const isNormal = stateName === 'normal';

            const state = isNormal ? label : label.ensureState(stateName);
            let text = seriesModel.getFormattedLabel(dataIndex, stateName);
            if (isNormal) {
                text = text || this.node.name;
            }

            state.style = createTextStyle(labelStateModel, {}, null, stateName !== 'normal', true);
            if (text) {
                state.style.text = text;
            }
            // Not displaying text when angle is too small
            const isShown = labelStateModel.get('show');
            if (isShown != null && !isNormal) {
                state.ignore = !isShown;
            }

            const labelPosition = getLabelAttr(labelStateModel, 'position');

            const sectorState = isNormal ? sector : sector.states[stateName];
            const labelColor = sectorState.style.fill as ColorString;
            sectorState.textConfig = {
                outsideFill: labelStateModel.get('color') === 'inherit' ? labelColor : null,
                inside: labelPosition !== 'outside'
            };

            let r;
            const labelPadding = getLabelAttr(labelStateModel, 'distance') || 0;
            let textAlign = getLabelAttr(labelStateModel, 'align');
            if (labelPosition === 'outside') {
                r = layout.r + labelPadding;
                textAlign = midAngle > Math.PI / 2 ? 'right' : 'left';
            }
            else {
                if (!textAlign || textAlign === 'center') {
                    // Put label in the center if it's a circle
                    if (angle === 2 * Math.PI && layout.r0 === 0) {
                        r = 0;
                    }
                    else {
                        r = (layout.r + layout.r0) / 2;
                    }
                    textAlign = 'center';
                }
                else if (textAlign === 'left') {
                    r = layout.r0 + labelPadding;
                    if (midAngle > Math.PI / 2) {
                        textAlign = 'right';
                    }
                }
                else if (textAlign === 'right') {
                    r = layout.r - labelPadding;
                    if (midAngle > Math.PI / 2) {
                        textAlign = 'left';
                    }
                }
            }

            state.style.align = textAlign;
            state.style.verticalAlign = getLabelAttr(labelStateModel, 'verticalAlign') || 'middle';

            state.x = r * dx + layout.cx;
            state.y = r * dy + layout.cy;

            const rotateType = getLabelAttr(labelStateModel, 'rotate');
            let rotate = 0;
            if (rotateType === 'radial') {
                rotate = normalizeRadian(-midAngle);
                if (((rotate > Math.PI / 2 && rotate < Math.PI * 1.5))) {
                    rotate += Math.PI;
                }
            }
            else if (rotateType === 'tangential') {
                rotate = Math.PI / 2 - midAngle;
                if (rotate > Math.PI / 2) {
                    rotate -= Math.PI;
                }
                else if (rotate < -Math.PI / 2) {
                    rotate += Math.PI;
                }
            }
            else if (zrUtil.isNumber(rotateType)) {
                rotate = rotateType * Math.PI / 180;
            }

            state.rotation = normalizeRadian(rotate);
        });


        type LabelOpt = SunburstSeriesOption['label'];
        function getLabelAttr<T extends keyof LabelOpt>(model: Model<LabelOpt>, name: T): LabelOpt[T] {
            const stateAttr = model.get(name);
            if (stateAttr == null) {
                return normalLabelModel.get(name) as LabelOpt[T];
            }
            return stateAttr;
        }

        label.dirtyStyle();
    }
}


export default SunburstPiece;

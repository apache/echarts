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
import { enableHoverEmphasis } from '../../util/states';
import {createTextStyle} from '../../label/labelStyle';
import { TreeNode } from '../../data/Tree';
import SunburstSeriesModel, { SunburstSeriesNodeItemOption, SunburstSeriesOption } from './SunburstSeries';
import GlobalModel from '../../model/Global';
import { AllPropTypes } from 'zrender/src/core/types';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { ColorString } from '../../util/types';
import Model from '../../model/Model';

const NodeHighlightPolicy = {
    NONE: 'none', // not downplay others
    DESCENDANT: 'descendant',
    ANCESTOR: 'ancestor',
    SELF: 'self'
} as const;

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

    constructor(node: TreeNode, seriesModel: SunburstSeriesModel, ecModel: GlobalModel) {
        super();

        this.z2 = DEFAULT_SECTOR_Z;
        this.textConfig = {
            inside: true
        };

        graphic.getECData(this).seriesIndex = seriesModel.seriesIndex;

        const text = new graphic.Text({
            z2: DEFAULT_TEXT_Z,
            silent: node.getModel<SunburstSeriesNodeItemOption>().get(['label', 'silent'])
        });
        this.setTextContent(text);

        this.updateData(true, node, seriesModel, ecModel);

        // Hover to change label and labelLine
        // FIXME
        // function onEmphasis() {
        //     text.ignore = text.hoverIgnore;
        // }
        // function onNormal() {
        //     text.ignore = text.normalIgnore;
        // }
        // this.on('emphasis', onEmphasis)
        //     .on('normal', onNormal)
        //     .on('mouseover', onEmphasis)
        //     .on('mouseout', onNormal);
    }

    updateData(
        firstCreate: boolean,
        node: TreeNode,
        // state: 'emphasis' | 'normal' | 'highlight' | 'downplay',
        seriesModel?: SunburstSeriesModel,
        ecModel?: GlobalModel
    ) {
        this.node = node;
        (node as DrawTreeNode).piece = this;

        seriesModel = seriesModel || this._seriesModel;
        ecModel = ecModel || this._ecModel;

        const sector = this;
        graphic.getECData(sector).dataIndex = node.dataIndex;

        const itemModel = node.getModel<SunburstSeriesNodeItemOption>();
        const layout = node.getLayout();
        // if (!layout) {
        //     console.log(node.getLayout());
        // }
        const sectorShape = zrUtil.extend({}, layout);
        sectorShape.label = null;

        // const visualColor = getNodeColor(node, seriesModel, ecModel);
        // fillDefaultColor(node, seriesModel, visualColor);
        const normalStyle = node.getVisual('style') as PathStyleProps;
        normalStyle.lineJoin = 'bevel';

        zrUtil.each(['emphasis', 'blur', 'select'] as const, function (stateName) {
            const state = sector.ensureState(stateName);
            state.style = itemModel.getModel([stateName, 'itemStyle']).getItemStyle();
        });

        if (firstCreate) {
            sector.setShape(sectorShape);
            sector.shape.r = layout.r0;
            graphic.updateProps(
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
        }

        sector.useStyle(normalStyle);

        this._updateLabel(seriesModel);

        const cursorStyle = itemModel.getShallow('cursor');
        cursorStyle && sector.attr('cursor', cursorStyle);

        if (firstCreate) {
            const highlightPolicy = seriesModel.getShallow('highlightPolicy');
            this._initEvents(sector, node, seriesModel, highlightPolicy);
        }

        this._seriesModel = seriesModel || this._seriesModel;
        this._ecModel = ecModel || this._ecModel;

        enableHoverEmphasis(this);
    }

    onEmphasis(highlightPolicy: AllPropTypes<typeof NodeHighlightPolicy>) {
        const that = this;
        this.node.hostTree.root.eachNode(function (n: DrawTreeNode) {
            if (n.piece) {
                if (that.node === n) {
                    n.piece.useState('emphasis', true);
                }
                else if (isNodeHighlighted(n, that.node, highlightPolicy)) {
                    // n.piece.useState('highlight', true);
                }
                else if (highlightPolicy !== NodeHighlightPolicy.NONE) {
                    n.piece.useState('downplay', true);
                }
            }
        });
    }

    onNormal() {
        this.node.hostTree.root.eachNode(function (n: DrawTreeNode) {
            if (n.piece) {
                n.piece.clearStates();
            }
        });
    }

    onHighlight() {
        this.replaceState('downplay', 'highlight', true);
    }

    onDownplay() {
        this.replaceState('highlight', 'downplay', true);
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

        zrUtil.each(['normal', 'emphasis', 'blur', 'select'] as const, (stateName) => {

            const labelStateModel = stateName === 'normal' ? itemModel.getModel('label')
                : itemModel.getModel([stateName, 'label']);
            const labelMinAngle = labelStateModel.get('minAngle') / 180 * Math.PI;
            const isNormal = stateName === 'normal';

            const state = isNormal ? label : label.ensureState(stateName);
            let text = seriesModel.getFormattedLabel(dataIndex, stateName);
            if (isNormal) {
                text = text || this.node.name;
            }

            state.style = createTextStyle(labelStateModel, {
            }, null, stateName !== 'normal', true);
            if (text) {
                state.style.text = text;
            }

            // Not displaying text when angle is too small
            state.ignore = labelMinAngle != null && Math.abs(angle) < labelMinAngle;

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
                    r = (layout.r + layout.r0) / 2;
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
                rotate = -midAngle;
                if (rotate < -Math.PI / 2) {
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
            else if (typeof rotateType === 'number') {
                rotate = rotateType * Math.PI / 180;
            }

            state.rotation = rotate;
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

    _initEvents(
        sector: graphic.Sector,
        node: TreeNode,
        seriesModel: SunburstSeriesModel,
        highlightPolicy: SunburstSeriesOption['highlightPolicy']
    ) {
        sector.off('mouseover').off('mouseout').off('emphasis').off('normal');

        const that = this;
        const onEmphasis = function () {
            that.onEmphasis(highlightPolicy);
        };
        const onNormal = function () {
            that.onNormal();
        };
        const onDownplay = function () {
            that.onDownplay();
        };
        const onHighlight = function () {
            that.onHighlight();
        };

        sector
            .on('mouseover', onEmphasis)
            .on('mouseout', onNormal)
            .on('emphasis', onEmphasis)
            .on('normal', onNormal)
            .on('downplay', onDownplay)
            .on('highlight', onHighlight);
    }

}


export default SunburstPiece;


// /**
//  * Get node color
//  */
// function getNodeColor(
//     node: TreeNode,
//     seriesModel: SunburstSeriesModel,
//     ecModel: GlobalModel
// ) {
//     // Color from visualMap
//     let visualColor = node.getVisual('color');
//     const visualMetaList = node.getVisual('visualMeta');
//     if (!visualMetaList || visualMetaList.length === 0) {
//         // Use first-generation color if has no visualMap
//         visualColor = null;
//     }

//     // Self color or level color
//     let color = node.getModel<SunburstSeriesNodeItemOption>().get(['itemStyle', 'color']);
//     if (color) {
//         return color;
//     }
//     else if (visualColor) {
//         // Color mapping
//         return visualColor;
//     }
//     else if (node.depth === 0) {
//         // Virtual root node
//         return ecModel.option.color[0];
//     }
//     else {
//         // First-generation color
//         const length = ecModel.option.color.length;
//         color = ecModel.option.color[getRootId(node) % length];
//     }
//     return color;
// }

// /**
//  * Get index of root in sorted order
//  *
//  * @param {TreeNode} node current node
//  * @return {number} index in root
//  */
// function getRootId(node: TreeNode) {
//     let ancestor = node;
//     while (ancestor.depth > 1) {
//         ancestor = ancestor.parentNode;
//     }

//     const virtualRoot = node.getAncestors()[0];
//     return zrUtil.indexOf(virtualRoot.children, ancestor);
// }

function isNodeHighlighted(
    node: TreeNode,
    activeNode: TreeNode,
    policy: AllPropTypes<typeof NodeHighlightPolicy>
) {
    if (policy === NodeHighlightPolicy.NONE) {
        return false;
    }
    else if (policy === NodeHighlightPolicy.SELF) {
        return node === activeNode;
    }
    else if (policy === NodeHighlightPolicy.ANCESTOR) {
        return node === activeNode || node.isAncestorOf(activeNode);
    }
    else {
        return node === activeNode || node.isDescendantOf(activeNode);
    }
}

// Fix tooltip callback function params.color incorrect when pick a default color
// function fillDefaultColor(node: TreeNode, seriesModel: SunburstSeriesModel, color: ZRColor) {
//     const data = seriesModel.getData();
//     data.setItemVisual(node.dataIndex, 'color', color);
// }

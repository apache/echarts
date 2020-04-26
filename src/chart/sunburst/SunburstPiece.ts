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
import { ColorString } from '../../util/types';
import { TreeNode } from '../../data/Tree';
import SunburstSeriesModel, { SunburstSeriesNodeItemOption, SunburstSeriesOption } from './SunburstSeries';
import GlobalModel from '../../model/Global';
import { AllPropTypes } from 'zrender/src/core/types';

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
class SunburstPiece extends graphic.Group {

    node: TreeNode;

    private _seriesModel: SunburstSeriesModel;
    private _ecModel: GlobalModel;

    constructor(node: TreeNode, seriesModel: SunburstSeriesModel, ecModel: GlobalModel) {
        super();

        const sector = new graphic.Sector({
            z2: DEFAULT_SECTOR_Z,
            textConfig: {
                inside: true
            }
        });
        this.add(sector);
        graphic.getECData(sector).seriesIndex = seriesModel.seriesIndex;

        const text = new graphic.Text({
            z2: DEFAULT_TEXT_Z,
            silent: node.getModel<SunburstSeriesNodeItemOption>().get(['label', 'silent'])
        });
        sector.setTextContent(text);

        this.updateData(true, node, 'normal', seriesModel, ecModel);

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
        state: 'emphasis' | 'normal' | 'highlight' | 'downplay',
        seriesModel?: SunburstSeriesModel,
        ecModel?: GlobalModel
    ) {
        this.node = node;
        (node as DrawTreeNode).piece = this;

        seriesModel = seriesModel || this._seriesModel;
        ecModel = ecModel || this._ecModel;

        const sector = this.childAt(0) as graphic.Sector;
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
        const normalStyle = node.getVisual('style');
        let style;
        if (state === 'normal') {
            style = normalStyle;
        }
        else {
            const stateStyle = itemModel.getModel([state, 'itemStyle'])
                .getItemStyle();
            style = zrUtil.merge(stateStyle, normalStyle);
        }
        // style = zrUtil.defaults(
        //     {
        //         lineJoin: 'bevel',
        //         fill: style.fill || visualColor
        //     },
        //     style
        // );

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
            sector.useStyle(style);
        }
        else if (typeof style.fill === 'object' && style.fill.type
            || typeof sector.style.fill === 'object' && sector.style.fill.type
        ) {
            // Disable animation for gradient since no interpolation method
            // is supported for gradient
            graphic.updateProps(sector, {
                shape: sectorShape
            }, seriesModel);
            sector.useStyle(style);
        }
        else {
            graphic.updateProps(sector, {
                shape: sectorShape,
                style: style
            }, seriesModel);
        }

        this._updateLabel(seriesModel, style.fill, state);

        const cursorStyle = itemModel.getShallow('cursor');
        cursorStyle && sector.attr('cursor', cursorStyle);

        if (firstCreate) {
            const highlightPolicy = seriesModel.getShallow('highlightPolicy');
            this._initEvents(sector, node, seriesModel, highlightPolicy);
        }

        this._seriesModel = seriesModel || this._seriesModel;
        this._ecModel = ecModel || this._ecModel;
    }

    onEmphasis(highlightPolicy: AllPropTypes<typeof NodeHighlightPolicy>) {
        const that = this;
        this.node.hostTree.root.eachNode(function (n: DrawTreeNode) {
            if (n.piece) {
                if (that.node === n) {
                    n.piece.updateData(false, n, 'emphasis');
                }
                else if (isNodeHighlighted(n, that.node, highlightPolicy)) {
                    n.piece.childAt(0).trigger('highlight');
                }
                else if (highlightPolicy !== NodeHighlightPolicy.NONE) {
                    n.piece.childAt(0).trigger('downplay');
                }
            }
        });
    }

    onNormal() {
        this.node.hostTree.root.eachNode(function (n: DrawTreeNode) {
            if (n.piece) {
                n.piece.updateData(false, n, 'normal');
            }
        });
    }

    onHighlight() {
        this.updateData(false, this.node, 'highlight');
    }

    onDownplay() {
        this.updateData(false, this.node, 'downplay');
    }

    _updateLabel(
        seriesModel: SunburstSeriesModel,
        visualColor: ColorString,
        state: 'emphasis' | 'normal' | 'highlight' | 'downplay'
    ) {
        const itemModel = this.node.getModel<SunburstSeriesNodeItemOption>();
        const normalModel = itemModel.getModel('label');
        const labelModel = state === 'normal' || state === 'emphasis'
            ? normalModel
            : itemModel.getModel([state, 'label']);
        const labelHoverModel = itemModel.getModel(['emphasis', 'label']);

        let text = zrUtil.retrieve(
            seriesModel.getFormattedLabel(
                this.node.dataIndex, state, null, null, 'label'
            ),
            this.node.name
        );
        if (getLabelAttr('show') === false) {
            text = '';
        }

        const layout = this.node.getLayout();
        let labelMinAngle = labelModel.get('minAngle');
        if (labelMinAngle == null) {
            labelMinAngle = normalModel.get('minAngle');
        }
        labelMinAngle = labelMinAngle / 180 * Math.PI;
        const angle = layout.endAngle - layout.startAngle;
        if (labelMinAngle != null && Math.abs(angle) < labelMinAngle) {
            // Not displaying text when angle is too small
            text = '';
        }

        const sector = this.childAt(0);
        const label = sector.getTextContent();


        const midAngle = (layout.startAngle + layout.endAngle) / 2;
        const dx = Math.cos(midAngle);
        const dy = Math.sin(midAngle);

        let r;
        const labelPosition = getLabelAttr('position');
        const labelPadding = getLabelAttr('distance') || 0;
        let textAlign = getLabelAttr('align');
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

        graphic.setLabelStyle(
            label, normalModel, labelHoverModel,
            {
                defaultText: labelModel.getShallow('show') ? text : null
            }
        );
        sector.setTextConfig({
            inside: labelPosition !== 'outside',
            insideStroke: visualColor,
            // insideFill: 'auto',
            outsideFill: visualColor
        });

        label.attr('style', {
            text: text,
            align: textAlign,
            verticalAlign: getLabelAttr('verticalAlign') || 'middle',
            opacity: getLabelAttr('opacity')
        });

        label.x = r * dx + layout.cx;
        label.y = r * dy + layout.cy;

        const rotateType = getLabelAttr('rotate');
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
        label.attr('rotation', rotate);

        type LabelOption = SunburstSeriesNodeItemOption['label'];
        function getLabelAttr<T extends keyof LabelOption>(name: T): LabelOption[T] {
            const stateAttr = labelModel.get(name);
            if (stateAttr == null) {
                return normalModel.get(name);
            }
            else {
                return stateAttr;
            }
        }
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

        if (seriesModel.isAnimationEnabled()) {
            sector
                .on('mouseover', onEmphasis)
                .on('mouseout', onNormal)
                .on('emphasis', onEmphasis)
                .on('normal', onNormal)
                .on('downplay', onDownplay)
                .on('highlight', onHighlight);
        }
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

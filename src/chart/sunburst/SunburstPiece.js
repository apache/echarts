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

var NodeHighlightPolicy = {
    NONE: 'none', // not downplay others
    DESCENDANT: 'descendant',
    ANCESTOR: 'ancestor',
    SELF: 'self'
};

var DEFAULT_SECTOR_Z = 2;
var DEFAULT_TEXT_Z = 4;

/**
 * Sunburstce of Sunburst including Sector, Label, LabelLine
 * @constructor
 * @extends {module:zrender/graphic/Group}
 */
function SunburstPiece(node, seriesModel, ecModel) {

    graphic.Group.call(this);

    var sector = new graphic.Sector({
        z2: DEFAULT_SECTOR_Z
    });
    sector.seriesIndex = seriesModel.seriesIndex;

    var text = new graphic.Text({
        z2: DEFAULT_TEXT_Z,
        silent: node.getModel('label').get('silent')
    });
    this.add(sector);
    this.add(text);

    this.updateData(true, node, 'normal', seriesModel, ecModel);

    // Hover to change label and labelLine
    function onEmphasis() {
        text.ignore = text.hoverIgnore;
    }
    function onNormal() {
        text.ignore = text.normalIgnore;
    }
    this.on('emphasis', onEmphasis)
        .on('normal', onNormal)
        .on('mouseover', onEmphasis)
        .on('mouseout', onNormal);
}

var SunburstPieceProto = SunburstPiece.prototype;

SunburstPieceProto.updateData = function (
    firstCreate,
    node,
    state,
    seriesModel,
    ecModel
) {
    this.node = node;
    node.piece = this;

    seriesModel = seriesModel || this._seriesModel;
    ecModel = ecModel || this._ecModel;

    var sector = this.childAt(0);
    sector.dataIndex = node.dataIndex;

    var itemModel = node.getModel();
    var layout = node.getLayout();
    // if (!layout) {
    //     console.log(node.getLayout());
    // }
    var sectorShape = zrUtil.extend({}, layout);
    sectorShape.label = null;

    var visualColor = getNodeColor(node, seriesModel, ecModel);

    fillDefaultColor(node, seriesModel, visualColor);

    var normalStyle = itemModel.getModel('itemStyle').getItemStyle();
    var style;
    if (state === 'normal') {
        style = normalStyle;
    }
    else {
        var stateStyle = itemModel.getModel(state + '.itemStyle')
            .getItemStyle();
        style = zrUtil.merge(stateStyle, normalStyle);
    }
    style = zrUtil.defaults(
        {
            lineJoin: 'bevel',
            fill: style.fill || visualColor
        },
        style
    );

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

    this._updateLabel(seriesModel, visualColor, state);

    var cursorStyle = itemModel.getShallow('cursor');
    cursorStyle && sector.attr('cursor', cursorStyle);

    if (firstCreate) {
        var highlightPolicy = seriesModel.getShallow('highlightPolicy');
        this._initEvents(sector, node, seriesModel, highlightPolicy);
    }

    this._seriesModel = seriesModel || this._seriesModel;
    this._ecModel = ecModel || this._ecModel;
};

SunburstPieceProto.onEmphasis = function (highlightPolicy) {
    var that = this;
    this.node.hostTree.root.eachNode(function (n) {
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
};

SunburstPieceProto.onNormal = function () {
    this.node.hostTree.root.eachNode(function (n) {
        if (n.piece) {
            n.piece.updateData(false, n, 'normal');
        }
    });
};

SunburstPieceProto.onHighlight = function () {
    this.updateData(false, this.node, 'highlight');
};

SunburstPieceProto.onDownplay = function () {
    this.updateData(false, this.node, 'downplay');
};

SunburstPieceProto._updateLabel = function (seriesModel, visualColor, state) {
    var itemModel = this.node.getModel();
    var normalModel = itemModel.getModel('label');
    var labelModel = state === 'normal' || state === 'emphasis'
        ? normalModel
        : itemModel.getModel(state + '.label');
    var labelHoverModel = itemModel.getModel('emphasis.label');

    var text = zrUtil.retrieve(
        seriesModel.getFormattedLabel(
            this.node.dataIndex, 'normal', null, null, 'label'
        ),
        this.node.name
    );
    if (getLabelAttr('show') === false) {
        text = '';
    }

    var layout = this.node.getLayout();
    var labelMinAngle = labelModel.get('minAngle');
    if (labelMinAngle == null) {
        labelMinAngle = normalModel.get('minAngle');
    }
    labelMinAngle = labelMinAngle / 180 * Math.PI;
    var angle = layout.endAngle - layout.startAngle;
    if (labelMinAngle != null && Math.abs(angle) < labelMinAngle) {
        // Not displaying text when angle is too small
        text = '';
    }

    var label = this.childAt(1);

    graphic.setLabelStyle(
        label.style, label.hoverStyle || {}, normalModel, labelHoverModel,
        {
            defaultText: labelModel.getShallow('show') ? text : null,
            autoColor: visualColor,
            useInsideStyle: true
        }
    );

    var midAngle = (layout.startAngle + layout.endAngle) / 2;
    var dx = Math.cos(midAngle);
    var dy = Math.sin(midAngle);

    var r;
    var labelPosition = getLabelAttr('position');
    var labelPadding = getLabelAttr('distance') || 0;
    var textAlign = getLabelAttr('align');
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

    label.attr('style', {
        text: text,
        textAlign: textAlign,
        textVerticalAlign: getLabelAttr('verticalAlign') || 'middle',
        opacity: getLabelAttr('opacity')
    });

    var textX = r * dx + layout.cx;
    var textY = r * dy + layout.cy;
    label.attr('position', [textX, textY]);

    var rotateType = getLabelAttr('rotate');
    var rotate = 0;
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
    } else if (typeof rotateType === 'number') {
        rotate = rotateType * Math.PI / 180;
    }
    label.attr('rotation', rotate);

    function getLabelAttr(name) {
        var stateAttr = labelModel.get(name);
        if (stateAttr == null) {
            return normalModel.get(name);
        }
        else {
            return stateAttr;
        }
    }
};

SunburstPieceProto._initEvents = function (
    sector,
    node,
    seriesModel,
    highlightPolicy
) {
    sector.off('mouseover').off('mouseout').off('emphasis').off('normal');

    var that = this;
    var onEmphasis = function () {
        that.onEmphasis(highlightPolicy);
    };
    var onNormal = function () {
        that.onNormal();
    };
    var onDownplay = function () {
        that.onDownplay();
    };
    var onHighlight = function () {
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
};

zrUtil.inherits(SunburstPiece, graphic.Group);

export default SunburstPiece;


/**
 * Get node color
 *
 * @param {TreeNode} node the node to get color
 * @param {module:echarts/model/Series} seriesModel series
 * @param {module:echarts/model/Global} ecModel echarts defaults
 */
function getNodeColor(node, seriesModel, ecModel) {
    // Color from visualMap
    var visualColor = node.getVisual('color');
    var visualMetaList = node.getVisual('visualMeta');
    if (!visualMetaList || visualMetaList.length === 0) {
        // Use first-generation color if has no visualMap
        visualColor = null;
    }

    // Self color or level color
    var color = node.getModel('itemStyle').get('color');
    if (color) {
        return color;
    }
    else if (visualColor) {
        // Color mapping
        return visualColor;
    }
    else if (node.depth === 0) {
        // Virtual root node
        return ecModel.option.color[0];
    }
    else {
        // First-generation color
        var length = ecModel.option.color.length;
        color = ecModel.option.color[getRootId(node) % length];
    }
    return color;
}

/**
 * Get index of root in sorted order
 *
 * @param {TreeNode} node current node
 * @return {number} index in root
 */
function getRootId(node) {
    var ancestor = node;
    while (ancestor.depth > 1) {
        ancestor = ancestor.parentNode;
    }

    var virtualRoot = node.getAncestors()[0];
    return zrUtil.indexOf(virtualRoot.children, ancestor);
}

function isNodeHighlighted(node, activeNode, policy) {
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
function fillDefaultColor(node, seriesModel, color) {
    var data = seriesModel.getData();
    data.setItemVisual(node.dataIndex, 'color', color);
}

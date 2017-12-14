import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import Model from '../../model/Model';

var NodeHighlightPolicy = {
    NONE: 'none', // not downplay others
    DESCENDANT: 'descendant',
    ANCESTOR: 'ancestor',
    SELF: 'self'
};

var DEFAULT_SECTOR_Z = 2;
var DEFAULT_TEXT_Z = 4;
var DEFAULT_SECTOR_HIGHLIGHT_Z = 3;
var DEFAULT_TEXT_HIGHLIGHT_Z = 5;

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
    var text = new graphic.Text({
        z2: DEFAULT_TEXT_Z,
        silent: node.getModel('label.normal').get('silent')
    });
    this.add(sector);
    this.add(text);

    this.node = node;

    this.updateData(true, node, seriesModel, ecModel);

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
    seriesModel,
    ecModel
) {
    this.node = node;
    node.piece = this;

    var sector = this.childAt(0);

    var itemModel = node.getModel();
    var layout = node.getLayout();
    var sectorShape = zrUtil.extend({}, layout);
    sectorShape.label = null;

    if (firstCreate) {
        sector.setShape(sectorShape);
        sector.shape.r = layout.r0;

        var duration = seriesModel.getShallow('animationDuration')
            / Math.max(node.depth + node.height, 1);
        var delay = (node.depth - 1) * duration;
        var easing = seriesModel.getShallow('animationEasing');

        sector.animateTo({
            shape: {
                r: layout.r
            }
        }, duration, delay, easing);
    }
    else {
        graphic.updateProps(sector, {
            shape: sectorShape
        }, seriesModel);
    }

    // Update common style
    var itemStyleModel = itemModel.getModel('itemStyle');
    var visualColor = getNodeColor(node, seriesModel, ecModel);

    sector.useStyle(
        zrUtil.defaults(
            {
                lineJoin: 'bevel',
                fill: visualColor
            },
            itemStyleModel.getModel('normal').getItemStyle()
        )
    );
    sector.hoverStyle = itemStyleModel.getModel('emphasis').getItemStyle();

    sector.dataIndex = node.dataIndex;

    var cursorStyle = itemModel.getShallow('cursor');
    cursorStyle && sector.attr('cursor', cursorStyle);

    var highlightPolicy = seriesModel.getShallow('highlightPolicy');
    this._initEvents(sector, node, seriesModel, highlightPolicy);

    this._updateLabel(seriesModel, ecModel, visualColor);

    graphic.setHoverStyle(this);
};

SunburstPieceProto.onEmphasis = function (highlightPolicy) {
    var that = this;
    this.node.hostTree.root.eachNode(function (n) {
        if (n.piece) {
            if (isNodeHighlighted(n, that.node, highlightPolicy)) {
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
            updatePiece(n, 'normal');
        }
    });
};

SunburstPieceProto.onHighlight = function () {
    updatePiece(this.node, 'highlight');
};

SunburstPieceProto.onDownplay = function () {
    updatePiece(this.node, 'downplay');
};

SunburstPieceProto._updateLabel = function (seriesModel, ecModel, visualColor) {
    var itemModel = this.node.getModel();
    var labelModel = itemModel.getModel('label.normal');
    var labelHoverModel = itemModel.getModel('label.emphasis');

    var text = zrUtil.retrieve(
        seriesModel.getFormattedLabel(
            this.node.dataIndex, 'normal', null, null, 'label'
        ),
        this.node.name
    );
    if (!labelModel.get('show')) {
        text = '';
    }

    var label = this.childAt(1);

    graphic.setLabelStyle(
        label.style, label.hoverStyle = {}, labelModel, labelHoverModel,
        {
            defaultText: labelModel.getShallow('show') ? text : null,
            autoColor: visualColor,
            useInsideStyle: true
        }
    );

    var layout = this.node.getLayout();
    var midAngle = (layout.startAngle + layout.endAngle) / 2;
    var dx = Math.cos(midAngle);
    var dy = Math.sin(midAngle);

    var r;
    var labelPosition = labelModel.get('position');
    var labelPadding = labelModel.get('padding') || 0;
    var textAlign = labelModel.get('align');
    if (labelPosition === 'outside') {
        r = layout.r + labelPadding;
        if (!textAlign) {
            textAlign = midAngle > Math.PI / 2 ? 'right' : 'left';
        }
    }
    else {
        if (!textAlign) {
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
        textVerticalAlign: labelModel.get('verticalAlign') || 'middle',
        opacity: labelModel.get('opacity')
    });

    var textX = r * dx + layout.cx;
    var textY = r * dy + layout.cy;
    label.attr('position', [textX, textY]);

    var rotateType = labelModel.getShallow('rotate');
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
    }
    label.attr('rotation', rotate);
};

SunburstPieceProto._initEvents = function (
    sector,
    node,
    seriesModel,
    highlightPolicy
) {
    var itemModel = node.getModel();

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

    if (itemModel.get('hoverAnimation') && seriesModel.isAnimationEnabled()) {
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
    if (node.depth === 0) {
        // Virtual root node
        return ecModel.option.color[0];
    }
    else {
        // Self color or level color
        var color = node.getModel('itemStyle.normal').get('color');
        if (!color) {
            // First-generation color
            var length = ecModel.option.color.length;
            color = ecModel.option.color[getRootId(node) % length];
        }

        return color;
    }
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
        return  node === activeNode || node.isAncestorOf(activeNode);
    }
    else {
        return node === activeNode || node.isDescendantOf(activeNode);
    }
}

function updatePiece(node, state) {
    var isHighlight = state === 'highlight';

    // Update sector
    var itemModel = node.getModel('itemStyle.' + state);
    var itemZ = itemModel.get('z');

    var sector = node.piece.childAt(0);
    var sectorZ = itemZ != null
        ? itemZ
        : (isHighlight ? DEFAULT_SECTOR_HIGHLIGHT_Z : DEFAULT_SECTOR_Z);
    sector.attr('z', sectorZ);

    sector.animateTo({
        style: {
            opacity: itemModel.get('opacity') || 1
        }
    });

    // Update text
    var labelModel = node.getModel('label.' + state);
    var labelZ = labelModel.get('z');

    var text = node.piece.childAt(1);
    var textZ = labelZ != null
        ? labelZ
        : (isHighlight ? DEFAULT_TEXT_HIGHLIGHT_Z : DEFAULT_TEXT_Z);
    text.attr('z', textZ);

    text.animateTo({
        style: {
            opacity: labelModel.get('opacity') || 1
        }
    });
}

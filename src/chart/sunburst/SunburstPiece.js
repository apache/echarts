import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';

/**
 * Sunburstce of Sunburst including Sector, Label, LabelLine
 * @constructor
 * @extends {module:zrender/graphic/Group}
 */
function SunburstPiece(node, seriesModel, ecModel) {

    graphic.Group.call(this);

    var sector = new graphic.Sector({
        z2: 2
    });
    var polyline = new graphic.Polyline();
    var text = new graphic.Text();
    this.add(sector);
    this.add(polyline);
    this.add(text);

    this.updateData(node, true, seriesModel, ecModel);

    // Hover to change label and labelLine
    function onEmphasis() {
        polyline.ignore = polyline.hoverIgnore;
        text.ignore = text.hoverIgnore;
    }
    function onNormal() {
        polyline.ignore = polyline.normalIgnore;
        text.ignore = text.normalIgnore;
    }
    this.on('emphasis', onEmphasis)
        .on('normal', onNormal)
        .on('mouseover', onEmphasis)
        .on('mouseout', onNormal);
}

var SunburstPieceProto = SunburstPiece.prototype;

SunburstPieceProto.updateData = function (
    node,
    firstCreate,
    seriesModel,
    ecModel
) {

    var sector = this.childAt(0);

    // var seriesModel = node.hostModel;
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
    var visualColor = getNodeColor(node, ecModel);

    sector.useStyle(
        zrUtil.defaults(
            {
                fill: visualColor
            },
            itemStyleModel.getModel('normal').getItemStyle()
        )
    );
    sector.hoverStyle = itemStyleModel.getModel('emphasis').getItemStyle();

    var cursorStyle = itemModel.getShallow('cursor');
    cursorStyle && sector.attr('cursor', cursorStyle);

    function onEmphasis() {
        // Sector may has animation of updating data. Force to move to the last frame
        // Or it may stopped on the wrong shape
        // sector.stopAnimation(true);
        // sector.animateTo({
        //     shape: {
        //         r: layout.r + seriesModel.get('hoverOffset')
        //     }
        // }, 300, 'elasticOut');
    }
    function onNormal() {
        // sector.stopAnimation(true);

        // var duration = 300;
        // var delay = node.depth * duration;

        // sector.animateTo({
        //     shape: {
        //         r: layout.r
        //     }
        // }, duration, delay, 'elasticOut');
    }
    sector.off('mouseover').off('mouseout').off('emphasis').off('normal');
    if (itemModel.get('hoverAnimation') && seriesModel.isAnimationEnabled()) {
        sector
            .on('mouseover', onEmphasis)
            .on('mouseout', onNormal)
            .on('emphasis', onEmphasis)
            .on('normal', onNormal);
    }

    // this._updateLabel(data, idx);

    graphic.setHoverStyle(this);
};

SunburstPieceProto._updateLabel = function (data, idx) {

    // var labelLine = this.childAt(1);
    // var labelText = this.childAt(2);

    // var seriesModel = data.hostModel;
    // var itemModel = data.getItemModel(idx);
    // var layout = data.getItemLayout(idx);
    // var labelLayout = layout.label;
    // var visualColor = data.getItemVisual(idx, 'color');

    // graphic.updateProps(labelLine, {
    //     shape: {
    //         points: labelLayout.linePoints || [
    //             [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y], [labelLayout.x, labelLayout.y]
    //         ]
    //     }
    // }, seriesModel, idx);

    // graphic.updateProps(labelText, {
    //     style: {
    //         x: labelLayout.x,
    //         y: labelLayout.y
    //     }
    // }, seriesModel, idx);
    // labelText.attr({
    //     rotation: labelLayout.rotation,
    //     origin: [labelLayout.x, labelLayout.y],
    //     z2: 10
    // });

    // var labelModel = itemModel.getModel('label.normal');
    // var labelHoverModel = itemModel.getModel('label.emphasis');
    // var labelLineModel = itemModel.getModel('labelLine.normal');
    // var labelLineHoverModel = itemModel.getModel('labelLine.emphasis');
    // var visualColor = data.getItemVisual(idx, 'color');

    // graphic.setLabelStyle(
    //     labelText.style, labelText.hoverStyle = {}, labelModel, labelHoverModel,
    //     {
    //         labelFetcher: data.hostModel,
    //         labelDataIndex: idx,
    //         defaultText: data.getName(idx),
    //         autoColor: visualColor,
    //         useInsideStyle: !!labelLayout.inside
    //     },
    //     {
    //         textAlign: labelLayout.textAlign,
    //         textVerticalAlign: labelLayout.verticalAlign,
    //         opacity: data.getItemVisual(idx, 'opacity')
    //     }
    // );

    // labelText.ignore = labelText.normalIgnore = !labelModel.get('show');
    // labelText.hoverIgnore = !labelHoverModel.get('show');

    // labelLine.ignore = labelLine.normalIgnore = !labelLineModel.get('show');
    // labelLine.hoverIgnore = !labelLineHoverModel.get('show');

    // // Default use item visual color
    // labelLine.setStyle({
    //     stroke: visualColor,
    //     opacity: data.getItemVisual(idx, 'opacity')
    // });
    // labelLine.setStyle(labelLineModel.getModel('lineStyle').getLineStyle());

    // labelLine.hoverStyle = labelLineHoverModel.getModel('lineStyle').getLineStyle();

    // var smooth = labelLineModel.get('smooth');
    // if (smooth && smooth === true) {
    //     smooth = 0.4;
    // }
    // labelLine.setShape({
    //     smooth: smooth
    // });
};

zrUtil.inherits(SunburstPiece, graphic.Group);

export default SunburstPiece;


/**
 * Get node color
 *
 * @param {TreeNode} node the node to get color
 * @param {module:echarts/model/Global} ecModel echarts defaults
 */
function getNodeColor(node, ecModel) {
    if (node.depth === 0) {
        // Virtual root node
        return 'transparent';
    }
    else {
        // Use color of the first generation
        var ancestor = node;
        var color = ancestor.getModel('itemStyle.normal').get('color');
        while (ancestor.parentNode && !color) {
            ancestor = ancestor.parentNode;
            color = ancestor.getModel('itemStyle.normal').get('color');
        }

        if (!color) {
            color = ecModel.option.color[getRootId(node)];
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

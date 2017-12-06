import * as graphic from '../../util/graphic';
import * as zrUtil from 'zrender/src/core/util';
import ChartView from '../../view/Chart';

/**
 * Piece of pie including Sector, Label, LabelLine
 * @constructor
 * @extends {module:zrender/graphic/Group}
 */
function FunnelPiece(data, idx) {

    graphic.Group.call(this);

    var polygon = new graphic.Polygon();
    var labelLine = new graphic.Polyline();
    var text = new graphic.Text();
    this.add(polygon);
    this.add(labelLine);
    this.add(text);

    this.updateData(data, idx, true);

    // Hover to change label and labelLine
    function onEmphasis() {
        labelLine.ignore = labelLine.hoverIgnore;
        text.ignore = text.hoverIgnore;
    }
    function onNormal() {
        labelLine.ignore = labelLine.normalIgnore;
        text.ignore = text.normalIgnore;
    }
    this.on('emphasis', onEmphasis)
        .on('normal', onNormal)
        .on('mouseover', onEmphasis)
        .on('mouseout', onNormal);
}

var funnelPieceProto = FunnelPiece.prototype;

var opacityAccessPath = ['itemStyle', 'normal', 'opacity'];
funnelPieceProto.updateData = function (data, idx, firstCreate) {

    var polygon = this.childAt(0);

    var seriesModel = data.hostModel;
    var itemModel = data.getItemModel(idx);
    var layout = data.getItemLayout(idx);
    var opacity = data.getItemModel(idx).get(opacityAccessPath);
    opacity = opacity == null ? 1 : opacity;

    // Reset style
    polygon.useStyle({});

    if (firstCreate) {
        polygon.setShape({
            points: layout.points
        });
        polygon.setStyle({ opacity : 0 });
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
            itemStyleModel.getModel('normal').getItemStyle(['opacity'])
        )
    );
    polygon.hoverStyle = itemStyleModel.getModel('emphasis').getItemStyle();

    this._updateLabel(data, idx);

    graphic.setHoverStyle(this);
};

funnelPieceProto._updateLabel = function (data, idx) {

    var labelLine = this.childAt(1);
    var labelText = this.childAt(2);

    var seriesModel = data.hostModel;
    var itemModel = data.getItemModel(idx);
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

    var labelModel = itemModel.getModel('label.normal');
    var labelHoverModel = itemModel.getModel('label.emphasis');
    var labelLineModel = itemModel.getModel('labelLine.normal');
    var labelLineHoverModel = itemModel.getModel('labelLine.emphasis');
    var visualColor = data.getItemVisual(idx, 'color');

    graphic.setLabelStyle(
        labelText.style, labelText.hoverStyle = {}, labelModel, labelHoverModel,
        {
            labelFetcher: data.hostModel,
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

    labelText.ignore = labelText.normalIgnore = !labelModel.get('show');
    labelText.hoverIgnore = !labelHoverModel.get('show');

    labelLine.ignore = labelLine.normalIgnore = !labelLineModel.get('show');
    labelLine.hoverIgnore = !labelLineHoverModel.get('show');

    // Default use item visual color
    labelLine.setStyle({
        stroke: visualColor
    });
    labelLine.setStyle(labelLineModel.getModel('lineStyle').getLineStyle());

    labelLine.hoverStyle = labelLineHoverModel.getModel('lineStyle').getLineStyle();
};

zrUtil.inherits(FunnelPiece, graphic.Group);


var FunnelView = ChartView.extend({

    type: 'funnel',

    render: function (seriesModel, ecModel, api) {
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
                var piePiece = oldData.getItemGraphicEl(oldIdx);

                piePiece.updateData(data, newIdx);

                group.add(piePiece);
                data.setItemGraphicEl(newIdx, piePiece);
            })
            .remove(function (idx) {
                var piePiece = oldData.getItemGraphicEl(idx);
                group.remove(piePiece);
            })
            .execute();

        this._data = data;
    },

    remove: function () {
        this.group.removeAll();
        this._data = null;
    },

    dispose: function () {}
});

export default FunnelView;
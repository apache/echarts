import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import ChartView from '../../view/Chart';
import SunburstPiece from './SunburstPiece';
import DataDiffer from '../../data/DataDiffer';

/**
 * @param {module:echarts/model/Series} seriesModel
 * @param {boolean} hasAnimation
 * @inner
 */
function updateDataSelected(uid, seriesModel, hasAnimation, api) {
    var treeRoot = seriesModel.getData();
    var dataIndex = this.dataIndex;
    var name = treeRoot.getName(dataIndex);

    api.dispatchAction({
        type: 'SunburstToggleSelect',
        from: uid,
        name: name,
        seriesId: seriesModel.id
    });
}

var SunburstView = ChartView.extend({

    type: 'sunburst',

    init: function () {
        var sectorGroup = new graphic.Group();
        this._sectorGroup = sectorGroup;
    },

    render: function (seriesModel, ecModel, api, payload) {
        if (payload && (payload.from === this.uid)) {
            return;
        }

        var treeRoot = seriesModel.getData().tree.root;
        var oldData = this._data;
        var group = this.group;

        var hasAnimation = ecModel.get('animation');
        var isFirstRender = !oldData;
        var animationType = seriesModel.get('animationType');

        // var onSectorClick = zrUtil.curry(
        //     updateDataSelected, this.uid, seriesModel, hasAnimation, api
        // );

        treeRoot.eachNode(function (node) {
            if (node !== treeRoot) {
                var piece = new SunburstPiece(node, seriesModel);
                group.add(piece);
            }
        });

        // treeRoot.diff(oldData)
        //     .add(function (idx) {
        //         var sunburstPiece = new SunburstPiece(treeRoot, idx);
        //         // Default expansion animation
        //         if (isFirstRender && animationType !== 'scale') {
        //             sunburstPiece.eachChild(function (child) {
        //                 child.stopAnimation(true);
        //             });
        //         }

        //         treeRoot.setItemGraphicEl(idx, sunburstPiece);

        //         group.add(sunburstPiece);
        //     })
        //     .update(function (newIdx, oldIdx) {
        //         var sunburstPiece = oldData.getItemGraphicEl(oldIdx);

        //         sunburstPiece.updateData(treeRoot, newIdx);

        //         group.add(sunburstPiece);
        //         treeRoot.setItemGraphicEl(newIdx, sunburstPiece);
        //     })
        //     .remove(function (idx) {
        //         var sunburstPiece = oldData.getItemGraphicEl(idx);
        //         group.remove(sunburstPiece);
        //     })
        //     .execute();

        // if (
        //     hasAnimation && isFirstRender && treeRoot.count() > 0
        //     // Default expansion animation
        //     && animationType !== 'scale'
        // ) {
        //     var shape = treeRoot.getLayout();
        //     var r = Math.max(api.getWidth(), api.getHeight()) / 2;

        //     var removeClipPath = zrUtil.bind(group.removeClipPath, group);
        //     group.setClipPath(this._createClipPath(
        //         shape.cx, shape.cy, r, shape.startAngle, shape.clockwise, removeClipPath, seriesModel
        //     ));
        // }

        this._data = treeRoot;
    },

    dispose: function () {},

    _createClipPath: function (
        cx, cy, r, startAngle, clockwise, cb, seriesModel
    ) {
        var clipPath = new graphic.Sector({
            shape: {
                cx: cx,
                cy: cy,
                r0: 0,
                r: r,
                startAngle: startAngle,
                endAngle: startAngle,
                clockwise: clockwise
            }
        });

        graphic.initProps(clipPath, {
            shape: {
                endAngle: startAngle + (clockwise ? 1 : -1) * Math.PI * 2
            }
        }, seriesModel, cb);

        return clipPath;
    },

    /**
     * @implement
     */
    containPoint: function (point, seriesModel) {
        var treeRoot = seriesModel.getData();
        var itemLayout = treeRoot.getItemLayout(0);
        if (itemLayout) {
            var dx = point[0] - itemLayout.cx;
            var dy = point[1] - itemLayout.cy;
            var radius = Math.sqrt(dx * dx + dy * dy);
            return radius <= itemLayout.r && radius >= itemLayout.r0;
        }
    }

});

export default SunburstView;

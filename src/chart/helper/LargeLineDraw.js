// TODO Batch by color

import * as graphic from '../../util/graphic';
import * as lineContain from 'zrender/src/contain/line';
import * as quadraticContain from 'zrender/src/contain/quadratic';

var LargeLineShape = graphic.extendShape({
    shape: {
        polyline: false,

        segs: []
    },

    buildPath: function (path, shape) {
        var segs = shape.segs;
        var isPolyline = shape.polyline;

        for (var i = 0; i < segs.length; i++) {
            var seg = segs[i];
            if (isPolyline) {
                path.moveTo(seg[0][0], seg[0][1]);
                for (var j = 1; j < seg.length; j++) {
                    path.lineTo(seg[j][0], seg[j][1]);
                }
            }
            else {
                path.moveTo(seg[0][0], seg[0][1]);
                if (seg.length > 2) {
                    path.quadraticCurveTo(seg[2][0], seg[2][1], seg[1][0], seg[1][1]);
                }
                else {
                    path.lineTo(seg[1][0], seg[1][1]);
                }
            }
        }
    },

    findDataIndex: function (x, y) {
        var shape = this.shape;
        var segs = shape.segs;
        var isPolyline = shape.polyline;
        var lineWidth = Math.max(this.style.lineWidth, 1);

        // Not consider transform
        for (var i = 0; i < segs.length; i++) {
            var seg = segs[i];
            if (isPolyline) {
                for (var j = 1; j < seg.length; j++) {
                    if (lineContain.containStroke(
                        seg[j - 1][0], seg[j - 1][1], seg[j][0], seg[j][1], lineWidth, x, y
                    )) {
                        return i;
                    }
                }
            }
            else {
                if (seg.length > 2) {
                    if (quadraticContain.containStroke(
                        seg[0][0], seg[0][1], seg[2][0], seg[2][1], seg[1][0], seg[1][1], lineWidth, x, y
                    )) {
                        return i;
                    }
                }
                else {
                    if (lineContain.containStroke(
                        seg[0][0], seg[0][1], seg[1][0], seg[1][1], lineWidth, x, y
                    )) {
                        return i;
                    }
                }
            }
        }

        return -1;
    }
});

function LargeLineDraw() {
    this.group = new graphic.Group();

    this._lineEl = new LargeLineShape();
}

var largeLineProto = LargeLineDraw.prototype;

/**
 * Update symbols draw by new data
 * @param {module:echarts/data/List} data
 */
largeLineProto.updateData = function (data) {
    this.group.removeAll();

    var lineEl = this._lineEl;

    var seriesModel = data.hostModel;

    lineEl.setShape({
        segs: data.mapArray(data.getItemLayout),
        polyline: seriesModel.get('polyline')
    });

    lineEl.useStyle(
        seriesModel.getModel('lineStyle.normal').getLineStyle()
    );

    var visualColor = data.getVisual('color');
    if (visualColor) {
        lineEl.setStyle('stroke', visualColor);
    }
    lineEl.setStyle('fill');

    // Enable tooltip
    // PENDING May have performance issue when path is extremely large
    lineEl.seriesIndex = seriesModel.seriesIndex;
    lineEl.on('mousemove', function (e) {
        lineEl.dataIndex = null;
        var dataIndex = lineEl.findDataIndex(e.offsetX, e.offsetY);
        if (dataIndex > 0) {
            // Provide dataIndex for tooltip
            lineEl.dataIndex = dataIndex;
        }
    });

    // Add back
    this.group.add(lineEl);
};

largeLineProto.updateLayout = function (seriesModel) {
    var data = seriesModel.getData();
    this._lineEl.setShape({
        segs: data.mapArray(data.getItemLayout)
    });
};

largeLineProto.remove = function () {
    this.group.removeAll();
};

export default LargeLineDraw;
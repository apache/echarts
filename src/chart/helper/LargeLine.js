import * as graphic from '../../util/graphic';
import * as lineContain from 'zrender/src/contain/line';
import * as quadraticContain from 'zrender/src/contain/quadratic';

export default graphic.extendShape({
    shape: {
        polyline: false,

        curveness: 0,

        segs: []
    },

    buildPath: function (path, shape) {
        var segs = shape.segs;
        var curveness = shape.curveness;

        if (shape.polyline) {
            for (var i = 0; i < segs.length;) {
                var count = segs[i++];
                if (count > 0) {
                    path.moveTo(segs[i++], segs[i++]);
                    for (var k = 1; k < count; k++) {
                        path.lineTo(segs[i++], segs[i++]);
                    }
                }
            }
        }
        else {
            for (var i = 0; i < segs.length;) {
                var x0 = segs[i++];
                var y0 = segs[i++];
                var x1 = segs[i++];
                var y1 = segs[i++];
                path.moveTo(x0, y0);
                if (curveness > 0) {
                    var x2 = (x0 + x1) / 2 - (y0 - y1) * curveness;
                    var y2 = (y0 + y1) / 2 - (x1 - x0) * curveness;
                    path.quadraticCurveTo(x2, y2, x1, y1);
                }
                else {
                    path.lineTo(x1, y1);
                }
            }
        }
    },

    findDataIndex: function (x, y) {
        // var shape = this.shape;
        // var segs = shape.segs;
        // var isPolyline = shape.polyline;
        // var lineWidth = Math.max(this.style.lineWidth, 1);

        // Not consider transform
        // for (var i = 0; i < segs.length; i++) {
        //     var seg = segs[i];
        //     if (isPolyline) {
        //         for (var j = 1; j < seg.length; j++) {
        //             if (lineContain.containStroke(
        //                 seg[j - 1][0], seg[j - 1][1], seg[j][0], seg[j][1], lineWidth, x, y
        //             )) {
        //                 return i;
        //             }
        //         }
        //     }
        //     else {
        //         if (seg.length > 2) {
        //             if (quadraticContain.containStroke(
        //                 seg[0][0], seg[0][1], seg[2][0], seg[2][1], seg[1][0], seg[1][1], lineWidth, x, y
        //             )) {
        //                 return i;
        //             }
        //         }
        //         else {
        //             if (lineContain.containStroke(
        //                 seg[0][0], seg[0][1], seg[1][0], seg[1][1], lineWidth, x, y
        //             )) {
        //                 return i;
        //             }
        //         }
        //     }
        // }

        return -1;
    }
});
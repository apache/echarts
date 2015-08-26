define(function(require) {

    'use strict';

    var pathTool = require('zrender/tool/path');

    var matrix = require('zrender/core/matrix');

    return {

        Group: require('zrender/container/Group'),

        Image: require('zrender/graphic/Image'),

        Text: require('zrender/graphic/Text'),

        Circle: require('zrender/graphic/shape/Circle'),

        Sector: require('zrender/graphic/shape/Sector'),

        Polygon: require('zrender/graphic/shape/Polygon'),

        Polyline: require('zrender/graphic/shape/Polyline'),

        Rect: require('zrender/graphic/shape/Rectangle'),

        Line: require('zrender/graphic/shape/Line'),

        /**
         * Create a path element from path data string
         */
        makePath: function (pathData, opts, rect) {
            var path = pathTool.createFromString(pathData, opts);
            if (rect) {
                this.resizePath(path, rect);
            }
            return path;
        },

        mergePath: pathTool.mergePath,

        /**
         * Resize a path to fit the rect
         */
        resizePath: function (path, rect) {
            if (! path.applyTransform) {
                return;
            }

            var pathRect = path.getBoundingRect();

            var sx = rect.width / pathRect.width;
            var sy = rect.height / pathRect.height;

            var m = matrix.create();
            matrix.translate(m, m, [rect.x, rect.y]);
            matrix.scale(m, m, [sx, sy]);
            matrix.translate(m, m, [-pathRect.x, -pathRect.y]);
            path.applyTransform(m);
        },

        subPixelOptimizeLine: function (p1, p2, lineWidth) {
            var round = Math.round;
            // Sub pixel optimize
            var offset = lineWidth % 2 / 2;
            var x1 = round(p1[0]);
            var y1 = round(p1[1]);
            var x2 = round(p2[0]);
            var y2 = round(p2[1]);

            if (x1 === x2) {
                x1 += offset;
                x2 += offset;
            }
            if (y1 === y2) {
                y1 += offset;
                y2 += offset;
            }
        }

    }
});
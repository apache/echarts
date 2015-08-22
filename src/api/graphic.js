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
        }
    }
});
define(function(require) {

    'use strict';

    var Group = require('zrender/container/Group');
    var Circle = require('zrender/graphic/Circle');
    var ZImage = require('zrender/graphic/Image');
    var Text = require('zrender/graphic/Text');
    var Polygon = require('zrender/graphic/Polygon');
    var Polyline = require('zrender/graphic/Polyline');
    var pathTool = require('zrender/tool/path');
    var transformPath = require('zrender/tool/transformPath');

    var matrix = require('zrender/core/matrix');

    return {

        /**
         * Create a group element
         */
        createGroup: function (opts) {
            return new Group(opts);
        },

        /**
         * Create a path element from path data string
         */
        createPath: function (pathData, opts, rect) {
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
            var pathRect = path.getBoundingRect();

            var dx = rect.x - pathRect.x;
            var dy = rect.y - pathRect.y;
            var sx = rect.width / pathRect.width;
            var sy = rect.height / pathRect.height;

            var m = matrix.create();
            matrix.translate(m, m, [dx, dy]);
            matrix.scale(m, m, [sx, sy]);
            // TODOTODOTODOTODO
            transformPath(path, m);
        },

        /**
         * Create a circle element
         */
        createCircle: function () {

        },

        createImage: function () {

        },

        createText: function () {

        },

        createSector: function () {

        },

        createPolygon: function () {

        },

        createPolyline: function () {

        }
    }
});
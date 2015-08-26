// Symbol factory
define(function(require) {

    'use strict';

    var graphic = require('./graphic');
    var BoundingRect = require('zrender/core/BoundingRect');

    /**
     * Diamond shape
     */
    var Diamond = graphic.extendShape({
        type: 'diamond',
        shape: {
            cx: 0,
            cy: 0,
            width: 0,
            height: 0
        },
        buildPath: function (path, shape) {
            path.moveTo(shape.cx, shape.cy - shape.h)
        }
    });

    var symbols = {
        rect: function (x, y, w, h) {
            return new graphic.Rect({
                shape: {
                    x: x,
                    y: y,
                    width: w,
                    height: h
                }
            })
        },

        roundRect: function (x, y, w, h, r) {
            return new graphic.Rect({
                shape: {
                    x: x,
                    y: y,
                    width: w,
                    height: h,
                    r: r || Math.min(w, h) / 4
                }
            });
        },

        square: function (x, y, size) {
            return new graphic.Rect({
                shape: {
                    x: x,
                    y: y,
                    width: size / 2,
                    height: size / 2
                }
            });
        },

        circle: function (x, y, r) {
            return new graphic.Circle({
                shape: {
                    cx: x + r,
                    cy: y + r,
                    r: r
                }
            });
        },

        diamond: function (x, y, w, h) {
            return new Diamond({
                shape: {
                    cx: x + w,
                    cy: y + h,
                    width: w,
                    height: h
                }
            })
        },

        image: function (img, x, y, w, h) {
            return new graphic.Image({
                style: {
                    image: img,
                    x: x,
                    y: y,
                    width: w,
                    height: h
                }
            })
        },

        path: function (pathStr, x, y, w, h) {
            return graphic.makePath(pathStr, null, new BoundingRect(x, y, w, h));
        }
    };

    return symbols;
});
// Symbol factory
define(function(require) {

    'use strict';

    var graphic = require('./graphic');
    var BoundingRect = require('zrender/core/BoundingRect');
    var zrUtil = require('zrender/core/util');

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
            var cx = shape.cx;
            var cy = shape.cy;
            var width = shape.width / 2;
            var height = shape.height / 2;
            path.moveTo(cx, cy - height);
            path.lineTo(cx + width, cy);
            path.lineTo(cx, cy + height);
            path.lineTo(cx - width, cy);
        }
    });

    /**
     * Pin shape
     */
    var Pin = graphic.extendShape({
        type: 'diamond',
        shape: {
            // x, y on the cusp
            x: 0,
            y: 0,
            width: 0,
            height: 0
        },
        buildPath: function (path, shape) {
            var x = shape.x;
            var y = shape.y;
            var w = shape.width;
            // Height must be larger than width
            var h = Math.max(w, shape.height);
            var r = w / 2;

            // Dist on y with tangent point and circle center
            var dy = r * r / (h - r);
            var cy = y - h + r + dy;
            var angle = Math.asin(dy / r);
            // Dist on x with tangent point and circle center
            var dx = Math.cos(angle) * r;

            var tanX = Math.sin(angle);
            var tanY = Math.cos(angle);

            path.arc(
                x,
                cy,
                r,
                Math.PI - angle,
                Math.PI * 2 + angle
            );

            var cpLen = r * 0.6;
            var cpLen2 = r * 0.7;
            path.bezierCurveTo(
                x + dx - tanX * cpLen, cy + dy + tanY * cpLen,
                x, y - cpLen2,
                x, y
            );
            path.bezierCurveTo(
                x, y - cpLen2,
                x - dx + tanX * cpLen, cy + dy + tanY * cpLen,
                x - dx, cy + dy
            );
        }
    });

    var symbolCreators = {

        line: function (x, y, w, h) {
            return new graphic.Line({
                shape: {
                    x1: x,
                    y1: y + h / 2,
                    x2: x + w,
                    y2: y + h / 2
                }
            });
        },

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

        circle: function (x, y, w, h) {
            // Put circle in the center of square
            var size = Math.min(w, h);
            return new graphic.Circle({
                shape: {
                    cx: x + w / 2,
                    cy: y + h / 2,
                    r: size / 2
                }
            });
        },

        diamond: function (x, y, w, h) {
            return new Diamond({
                shape: {
                    cx: x + w / 2,
                    cy: y + h / 2,
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

        pin: function (x, y, w, h) {
            return new Pin({
                shape: {
                    x: x + w / 2,
                    y: y + h / 2,
                    width: w,
                    height: h
                }
            });
        },

        path: function (pathStr, x, y, w, h) {
            return graphic.makePath(pathStr, null, new BoundingRect(x, y, w, h));
        }

    };

    // Provide setColor helper method to avoid determine if set the fill or stroke outside
    var symbolPathSetColor = function (color) {
        var symbolStyle = this.style;
        if (this.__isEmptyBrush) {
            symbolStyle.stroke = color;
        }
        else {
            // FIXME 判断图形默认是填充还是描边，使用 onlyStroke ?
            symbolStyle.fill && (symbolStyle.fill = color);
            symbolStyle.stroke && (symbolStyle.stroke = color);
        }
        this.dirty();
    };

    return {
        /**
         * Create a symbol element with given symbol configuration: shape, x, y, width, height, color
         * @param {string} symbolConfig
         * @param {number} x
         * @param {number} y
         * @param {number} w
         * @param {number} h
         * @param {string} color
         */
        createSymbol: function (symbolConfig, x, y, w, h, color) {
            var isEmpty = symbolConfig.indexOf('empty') === 0;
            if (isEmpty) {
                symbolConfig = symbolConfig.substr(5, 1).toLowerCase() + symbolConfig.substr(6);
            }
            var symbolPath;

            if (symbolConfig.indexOf('image://') === 0) {
                symbolPath = symbolCreators.image(symbolConfig.slice(8), x, y, w, h);
            }
            else if (symbolConfig.indexOf('path://') === 0) {
                symbolPath = symbolCreators.image(symbolConfig.slice(7), x, y, w, h);
            }
            else {
                if (symbolCreators[symbolConfig]) {
                    symbolPath = symbolCreators[symbolConfig](x, y, w, h);
                }
                else {
                    symbolPath = symbolCreators.rect(x, y, w, h);
                }
            }

            var symbolStyle = symbolPath.style;
            if (isEmpty) {
                symbolStyle.set({
                    fill: '#fff',
                    lineWidth: 2
                });
            }

            symbolPath.__isEmptyBrush = isEmpty;

            symbolPath.setColor = symbolPathSetColor;

            symbolPath.setColor(color);

            return symbolPath;
        }
    };
});
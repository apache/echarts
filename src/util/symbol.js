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

        path: function (pathStr, x, y, w, h) {
            return graphic.makePath(pathStr, null, new BoundingRect(x, y, w, h));
        }

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
            if (symbolConfig === 'none') {
                symbolConfig = 'rect';
                w = 0;
                h = 0;
                color = 'rgba(0,0,0,0)';
            }

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
                    stroke: color,
                    fill: '#fff',
                    lineWidth: 2
                });
            }
            else {
                // FIXME 判断图形默认是填充还是描边，使用 onlyStroke ?
                symbolStyle.fill && (symbolStyle.fill = color);
                symbolStyle.stroke && (symbolStyle.stroke = color);
            }

            return symbolPath;
        }
    };
});
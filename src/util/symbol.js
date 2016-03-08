// Symbol factory
define(function(require) {

    'use strict';

    var graphic = require('./graphic');
    var BoundingRect = require('zrender/core/BoundingRect');

    /**
     * Triangle shape
     * @inner
     */
    var Triangle = graphic.extendShape({
        type: 'triangle',
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
            path.lineTo(cx + width, cy + height);
            path.lineTo(cx - width, cy + height);
            path.closePath();
        }
    });
    /**
     * Diamond shape
     * @inner
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
            path.closePath();
        }
    });

    /**
     * Pin shape
     * @inner
     */
    var Pin = graphic.extendShape({
        type: 'pin',
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
            var w = shape.width / 5 * 3;
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
                x, cy, r,
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
            path.closePath();
        }
    });

    /**
     * Arrow shape
     * @inner
     */
    var Arrow = graphic.extendShape({

        type: 'arrow',

        shape: {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        },

        buildPath: function (ctx, shape) {
            var height = shape.height;
            var width = shape.width;
            var x = shape.x;
            var y = shape.y;
            var dx = width / 3 * 2;
            ctx.moveTo(x, y);
            ctx.lineTo(x + dx, y + height);
            ctx.lineTo(x, y + height / 4 * 3);
            ctx.lineTo(x - dx, y + height);
            ctx.lineTo(x, y);
            ctx.closePath();
        }
    });

    /**
     * Map of path contructors
     * @type {Object.<string, module:zrender/graphic/Path>}
     */
    var symbolCtors = {
        line: graphic.Line,

        rect: graphic.Rect,

        roundRect: graphic.Rect,

        square: graphic.Rect,

        circle: graphic.Circle,

        diamond: Diamond,

        pin: Pin,

        arrow: Arrow,

        triangle: Triangle
    };

    var symbolShapeMakers = {

        line: function (x, y, w, h, shape) {
            // FIXME
            shape.x1 = x;
            shape.y1 = y + h / 2;
            shape.x2 = x + w;
            shape.y2 = y + h / 2;
        },

        rect: function (x, y, w, h, shape) {
            shape.x = x;
            shape.y = y;
            shape.width = w;
            shape.height = h;
        },

        roundRect: function (x, y, w, h, shape) {
            shape.x = x;
            shape.y = y;
            shape.width = w;
            shape.height = h;
            shape.r = Math.min(w, h) / 4;
        },

        square: function (x, y, w, h, shape) {
            var size = Math.min(w, h);
            shape.x = x;
            shape.y = y;
            shape.width = size;
            shape.height = size;
        },

        circle: function (x, y, w, h, shape) {
            // Put circle in the center of square
            shape.cx = x + w / 2;
            shape.cy = y + h / 2;
            shape.r = Math.min(w, h) / 2;
        },

        diamond: function (x, y, w, h, shape) {
            shape.cx = x + w / 2;
            shape.cy = y + h / 2;
            shape.width = w;
            shape.height = h;
        },

        pin: function (x, y, w, h, shape) {
            shape.x = x + w / 2;
            shape.y = y + h / 2;
            shape.width = w;
            shape.height = h;
        },

        arrow: function (x, y, w, h, shape) {
            shape.x = x + w / 2;
            shape.y = y + h / 2;
            shape.width = w;
            shape.height = h;
        },

        triangle: function (x, y, w, h, shape) {
            shape.cx = x + w / 2;
            shape.cy = y + h / 2;
            shape.width = w;
            shape.height = h;
        }
    };

    var symbolBuildProxies = {};
    for (var name in symbolCtors) {
        symbolBuildProxies[name] = new symbolCtors[name]();
    }

    var Symbol = graphic.extendShape({

        type: 'symbol',

        shape: {
            symbolType: '',
            x: 0,
            y: 0,
            width: 0,
            height: 0
        },

        beforeBrush: function () {
            var style = this.style;
            var shape = this.shape;
            // FIXME
            if (shape.symbolType === 'pin' && style.textPosition === 'inside') {
                style.textPosition = ['50%', '40%'];
                style.textAlign = 'center';
                style.textVerticalAlign = 'middle';
            }
        },

        buildPath: function (ctx, shape) {
            var symbolType = shape.symbolType;
            var proxySymbol = symbolBuildProxies[symbolType];
            if (shape.symbolType !== 'none') {
                if (!proxySymbol) {
                    // Default rect
                    symbolType = 'rect';
                    proxySymbol = symbolBuildProxies[symbolType];
                }
                symbolShapeMakers[symbolType](
                    shape.x, shape.y, shape.width, shape.height, proxySymbol.shape
                );
                proxySymbol.buildPath(ctx, proxySymbol.shape);
            }
        }
    });

    // Provide setColor helper method to avoid determine if set the fill or stroke outside
    var symbolPathSetColor = function (color) {
        if (this.type !== 'image') {
            var symbolStyle = this.style;
            var symbolShape = this.shape;
            if (symbolShape && symbolShape.symbolType === 'line') {
                symbolStyle.stroke = color;
            }
            else if (this.__isEmptyBrush) {
                symbolStyle.stroke = color;
                symbolStyle.fill = '#fff';
            }
            else {
                // FIXME 判断图形默认是填充还是描边，使用 onlyStroke ?
                symbolStyle.fill && (symbolStyle.fill = color);
                symbolStyle.stroke && (symbolStyle.stroke = color);
            }
            this.dirty();
        }
    };

    var symbolUtil = {
        /**
         * Create a symbol element with given symbol configuration: shape, x, y, width, height, color
         * @param {string} symbolType
         * @param {number} x
         * @param {number} y
         * @param {number} w
         * @param {number} h
         * @param {string} color
         */
        createSymbol: function (symbolType, x, y, w, h, color) {
            var isEmpty = symbolType.indexOf('empty') === 0;
            if (isEmpty) {
                symbolType = symbolType.substr(5, 1).toLowerCase() + symbolType.substr(6);
            }
            var symbolPath;

            if (symbolType.indexOf('image://') === 0) {
                symbolPath = new graphic.Image({
                    style: {
                        image: symbolType.slice(8),
                        x: x,
                        y: y,
                        width: w,
                        height: h
                    }
                });
            }
            else if (symbolType.indexOf('path://') === 0) {
                symbolPath = graphic.makePath(symbolType.slice(7), {}, new BoundingRect(x, y, w, h));
            }
            else {
                symbolPath = new Symbol({
                    shape: {
                        symbolType: symbolType,
                        x: x,
                        y: y,
                        width: w,
                        height: h
                    }
                });
            }

            symbolPath.__isEmptyBrush = isEmpty;

            symbolPath.setColor = symbolPathSetColor;

            symbolPath.setColor(color);

            return symbolPath;
        }
    };

    return symbolUtil;
});
/**
 * @file defines echarts Heatmap Chart
 * @author Ovilia (me@zhangwenli.com)
 * Inspired by https://github.com/mourner/simpleheat
 *
 * @module
 */
define(function (require) {

    var GRADIENT_LEVELS = 256;
    var zrUtil = require('zrender/core/util');

    /**
     * Heatmap Chart
     *
     * @class
     */
    function Heatmap() {
        var canvas = zrUtil.createCanvas();
        this.canvas = canvas;

        this.blurSize = 30;
        this.pointSize = 20;

        this.maxOpacity = 1;
        this.minOpacity = 0;

        this._gradientPixels = {};
    }

    Heatmap.prototype = {
        /**
         * Renders Heatmap and returns the rendered canvas
         * @param {Array} data array of data, each has x, y, value
         * @param {number} width canvas width
         * @param {number} height canvas height
         */
        update: function(data, width, height, normalize, colorFunc, isInRange) {
            var brush = this._getBrush();
            var gradientInRange = this._getGradient(data, colorFunc, 'inRange');
            var gradientOutOfRange = this._getGradient(data, colorFunc, 'outOfRange');
            var r = this.pointSize + this.blurSize;

            var canvas = this.canvas;
            var ctx = canvas.getContext('2d');
            var len = data.length;
            canvas.width = width;
            canvas.height = height;
            for (var i = 0; i < len; ++i) {
                var p = data[i];
                var x = p[0];
                var y = p[1];
                var value = p[2];

                // calculate alpha using value
                var alpha = normalize(value);

                // draw with the circle brush with alpha
                ctx.globalAlpha = alpha;
                ctx.drawImage(brush, x - r, y - r);
            }

            // colorize the canvas using alpha value and set with gradient
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var pixels = imageData.data;
            var offset = 0;
            var pixelLen = pixels.length;
            var minOpacity = this.minOpacity;
            var maxOpacity = this.maxOpacity;
            var diffOpacity = maxOpacity - minOpacity;

            while(offset < pixelLen) {
                var alpha = pixels[offset + 3] / 256;
                var gradientOffset = Math.floor(alpha * (GRADIENT_LEVELS - 1)) * 4;
                // Simple optimize to ignore the empty data
                if (alpha > 0) {
                    var gradient = isInRange(alpha) ? gradientInRange : gradientOutOfRange;
                    // Any alpha > 0 will be mapped to [minOpacity, maxOpacity]
                    alpha > 0 && (alpha = alpha * diffOpacity + minOpacity);
                    pixels[offset++] = gradient[gradientOffset];
                    pixels[offset++] = gradient[gradientOffset + 1];
                    pixels[offset++] = gradient[gradientOffset + 2];
                    pixels[offset++] = gradient[gradientOffset + 3] * alpha * 256;
                }
                else {
                    offset += 4;
                }
            }
            ctx.putImageData(imageData, 0, 0);

            return canvas;
        },

        /**
         * get canvas of a black circle brush used for canvas to draw later
         * @private
         * @returns {Object} circle brush canvas
         */
        _getBrush: function() {
            var brushCanvas = this._brushCanvas || (this._brushCanvas = zrUtil.createCanvas());
            // set brush size
            var r = this.pointSize + this.blurSize;
            var d = r * 2;
            brushCanvas.width = d;
            brushCanvas.height = d;

            var ctx = brushCanvas.getContext('2d');
            ctx.clearRect(0, 0, d, d);

            // in order to render shadow without the distinct circle,
            // draw the distinct circle in an invisible place,
            // and use shadowOffset to draw shadow in the center of the canvas
            ctx.shadowOffsetX = d;
            ctx.shadowBlur = this.blurSize;
            // draw the shadow in black, and use alpha and shadow blur to generate
            // color in color map
            ctx.shadowColor = '#000';

            // draw circle in the left to the canvas
            ctx.beginPath();
            ctx.arc(-r, r, this.pointSize, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
            return brushCanvas;
        },

        /**
         * get gradient color map
         * @private
         */
        _getGradient: function (data, colorFunc, state) {
            var gradientPixels = this._gradientPixels;
            var pixelsSingleState = gradientPixels[state] || (gradientPixels[state] = new Uint8ClampedArray(256 * 4));
            var color = [0, 0, 0, 0];
            var off = 0;
            for (var i = 0; i < 256; i++) {
                colorFunc[state](i / 255, true, color);
                pixelsSingleState[off++] = color[0];
                pixelsSingleState[off++] = color[1];
                pixelsSingleState[off++] = color[2];
                pixelsSingleState[off++] = color[3];
            }
            return pixelsSingleState;
        }
    };

    return Heatmap;
});

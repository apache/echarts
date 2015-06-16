/**
 * @file defines echarts Heatmap Chart
 * @author Ovilia (me@zhangwenli.com)
 * Inspired by https://github.com/mourner/simpleheat
 *
 * @module
 *
 * @requires /src/component/base.js
 * @requires NPM:zrender/shape/Image.js
 */
define(function (require) {
    var zrImage = require('zrender/shape/Image');

    var defaultOptions = {
        blurSize: 30,
        gradientColors: {
            0.4: 'blue',
            0.5: 'cyan',
            0.6: 'lime',
            0.8: 'yellow',
            1.0: 'red'
        },
        minAlpha: 0.05,
        unifyValue: 1
    };

    var BRUSH_SIZE = 20;
    var GRADIENT_LEVELS = 256;

    /**
     * Heatmap Chart
     *
     * @class
     * @param {Object} opt options
     */
    function Heatmap(opt) {
        this.option = opt;
        if (opt) {
            for (var i in defaultOptions) {
                if (opt[i] !== undefined) {
                    this.option[i] = opt[i];
                } else {
                    this.option[i] = defaultOptions[i];
                }
            }
        } else {
            this.option = defaultOptions;
        }
    }

    Heatmap.prototype = {
        /**
         * Renders Heatmap
         * @param {Array} [x, y, value] array of data
         * @param {number} canvas width
         * @param {number} canvas height
         * @return {Object} rendered zrender image
         */
        getZRImage: function(data, width, height) {
            var brush = this._getBrush();
            var gradient = this._getGradient();
            var r = BRUSH_SIZE + this.option.blurSize;

            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');

            var len = data.length;
            for (var i = 0; i < len; ++i) {
                var p = data[i];
                var x = p[0];
                var y = p[1];
                var value = p[2];

                // calculate alpha using value
                var alpha = Math.min(value / this.option.maxValue
                    || this.option.minAlpha, this.option.minAlpha);

                // draw with the circle brush with alpha
                ctx.globalAlpha = alpha;
                ctx.drawImage(brush, x - r, y - r);
            }

            // colorize the canvas using alpha value and set with gradient
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var pixels = imageData.data;
            var len = pixels.length / 4;
            while(len--) {
                var id = len * 4 + 3;
                var alpha = pixels[id] / 256;
                var colorOffset = Math.floor(alpha * (GRADIENT_LEVELS - 1));
                pixels[id - 3] = gradient[colorOffset * 4];     // red
                pixels[id - 2] = gradient[colorOffset * 4 + 1]; // green
                pixels[id - 1] = gradient[colorOffset * 4 + 2]; // blue
            }
            ctx.putImageData(imageData, 0, 0);

            var image = new zrImage({
                position: [0, 0],
                scale: [1, 1],
                style: {
                    x: 0,
                    y: 0,
                    image: canvas,
                    width: canvas.width,
                    height: canvas.height
                }
            });
            return image;
        },

        /**
         * get canvas of a black circle brush used for canvas to draw later
         * @private
         * @returns {Object} circle brush canvas
         */
        _getBrush: function() {
            if (!this._brushCanvas) {
                this._brushCanvas = document.createElement('canvas');

                // set brush size
                var r = BRUSH_SIZE + this.option.blurSize;
                var d = r * 2;
                this._brushCanvas.width = d;
                this._brushCanvas.height = d;

                var ctx = this._brushCanvas.getContext('2d');

                // in order to render shadow without the distinct circle,
                // draw the distinct circle in an invisible place,
                // and use shadowOffset to draw shadow in the center of the canvas
                ctx.shadowOffsetX = d;
                ctx.shadowBlur = this.option.blurSize;
                // draw the shadow in black, and use alpha and shadow blur to generate
                // color in color map
                ctx.shadowColor = 'black';

                // draw circle in the left to the canvas
                ctx.beginPath();
                ctx.arc(-r, r, BRUSH_SIZE, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.fill();
            }
            return this._brushCanvas;
        },

        /**
         * get gradient color map
         * @private
         * @returns {array} gradient color pixels
         */
        _getGradient: function() {
            if (!this._gradientPixels) {
                var levels = GRADIENT_LEVELS;
                var canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = levels;
                var ctx = canvas.getContext('2d');
                
                // add color to gradient stops
                var gradient = ctx.createLinearGradient(0, 0, 0, levels);
                for (var pos in this.option.gradientColors) {
                    gradient.addColorStop(pos, this.option.gradientColors[pos]);
                }

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 1, levels);
                this._gradientPixels = ctx.getImageData(0, 0, 1, levels).data;
            }
            return this._gradientPixels;
        }
    };

    return Heatmap;
});

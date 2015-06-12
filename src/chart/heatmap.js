/**
 * @file defines echarts Heatmap Chart
 * @author Ovilia (me@zhangwenli.com)
 * Inspired by https://github.com/mourner/simpleheat
 *
 * @module
 *
 * @requires /src/chart/base.js
 * @requires /src/config.js
 * @requires /src/util/ecData.js
 * @requires NPM:zrender/tool/util.js
 * @requires NPM:zrender/tool/color.js
 */
define(function (require) {
    var ChartBase = require('./base');

    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    var zrImage = require('zrender/shape/Image');

    ecConfig.heatmap = {
        zlevel: 0,
        z: 2,
        clickable: true,

        brushSize: 20,
        brushBlurSize: 30,
        gradientLevels: 256,
        gradientColors: {
            0.4: 'blue',
            0.5: 'cyan',
            0.6: 'lime',
            0.8: 'yellow',
            1.0: 'red'
        },
        minAlpha: 0.05,
        maxValue: 1
    };

    /**
     * Heatmap Chart
     *
     * @class
     * @extends ChartBase
     */
    function Heatmap(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);

        this.refresh(option);
    }

    Heatmap.prototype = {
        type: ecConfig.CHART_TYPE_HEATMAP,

        /**
         * refreshes the chart
         * @param {Object} newOption - options to refresh the chart
         * @public
         */
        refresh: function(newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }

            this._init();
        },

        /**
         * init heatmap
         * @private
         */
        _init: function() {
            var series = this.series;
            this.backupShapeList();

            var len = series.length;
            for (var i = 0; i < len; ++i) {
                if (series[i].type === ecConfig.CHART_TYPE_HEATMAP) {
                    series[i] = this.reformOption(series[i]);
                    this._initSerie(series[i]);
                }
            }
        },

        /**
         * init heatmap serie
         */
        _initSerie: function(serie) {
            var brush = this._getBrush();
            var gradient = this._getGradient();
            var r = ecConfig.heatmap.brushSize + ecConfig.heatmap.brushBlurSize;

            var canvas = document.createElement('canvas');
            canvas.width = this.zr.getWidth();
            canvas.height = this.zr.getHeight();
            var ctx = canvas.getContext('2d');

            var len = serie.data.length;
            for (var i = 0; i < len; ++i) {
                var p = serie.data[i];
                var x = p[0];
                var y = p[1];
                var value = p[2];

                // calculate alpha using value
                var alpha = Math.min(value / ecConfig.heatmap.maxValue
                    || ecConfig.heatmap.minAlpha, ecConfig.heatmap.minAlpha);

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
                var colorOffset = Math.floor(alpha * (ecConfig.heatmap.gradientLevels - 1));
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
            this.zr.addShape(image);
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
                var r = ecConfig.heatmap.brushSize + ecConfig.heatmap.brushBlurSize;
                var d = r * 2;
                this._brushCanvas.width = d;
                this._brushCanvas.height = d;

                var ctx = this._brushCanvas.getContext('2d');

                // in order to render shadow without the distinct circle,
                // draw the distinct circle in an invisible place,
                // and use shadowOffset to draw shadow in the center of the canvas
                ctx.shadowOffsetX = d;
                ctx.shadowBlur = ecConfig.heatmap.brushBlurSize;
                // draw the shadow in black, and use alpha and shadow blur to generate
                // color in color map
                ctx.shadowColor = 'black';

                // draw circle in the left to the canvas
                ctx.beginPath();
                ctx.arc(-r, r, ecConfig.heatmap.brushSize, 0, Math.PI * 2, true);
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
                var levels = ecConfig.heatmap.gradientLevels;
                var canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = levels;
                var ctx = canvas.getContext('2d');
                
                // add color to gradient stops
                var gradient = ctx.createLinearGradient(0, 0, 0, levels);
                for (var pos in ecConfig.heatmap.gradientColors) {
                    gradient.addColorStop(pos, ecConfig.heatmap.gradientColors[pos]);
                }

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 1, levels);
                this._gradientPixels = ctx.getImageData(0, 0, 1, levels).data;
            }
            return this._gradientPixels;
        }
    };



    zrUtil.inherits(Heatmap, ChartBase);

    require('../chart').define('heatmap', Heatmap);

    return Heatmap;
});

define('echarts/chart/heatmap', [
    'require',
    './base',
    '../layer/heatmap',
    '../config',
    '../util/ecData',
    'zrender/tool/util',
    'zrender/tool/color',
    'zrender/shape/Image',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var HeatmapLayer = require('../layer/heatmap');
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    var zrImage = require('zrender/shape/Image');
    ecConfig.heatmap = {
        zlevel: 0,
        z: 2,
        clickable: true
    };
    function Heatmap(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Heatmap.prototype = {
        type: ecConfig.CHART_TYPE_HEATMAP,
        refresh: function (newOption) {
            this.clear();
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            this._init();
        },
        _init: function () {
            var series = this.series;
            this.backupShapeList();
            var len = series.length;
            for (var i = 0; i < len; ++i) {
                if (series[i].type === ecConfig.CHART_TYPE_HEATMAP) {
                    series[i] = this.reformOption(series[i]);
                    var layer = new HeatmapLayer(series[i]);
                    var canvas = layer.getCanvas(series[i].data, this.zr.getWidth(), this.zr.getHeight());
                    var image = new zrImage({
                        position: [
                            0,
                            0
                        ],
                        scale: [
                            1,
                            1
                        ],
                        hoverable: this.option.hoverable,
                        style: {
                            x: 0,
                            y: 0,
                            image: canvas,
                            width: canvas.width,
                            height: canvas.height
                        }
                    });
                    this.shapeList.push(image);
                }
            }
            this.addShapeList();
        }
    };
    zrUtil.inherits(Heatmap, ChartBase);
    require('../chart').define('heatmap', Heatmap);
    return Heatmap;
});define('echarts/layer/heatmap', ['require'], function (require) {
    var defaultOptions = {
        blurSize: 30,
        gradientColors: [
            'blue',
            'cyan',
            'lime',
            'yellow',
            'red'
        ],
        minAlpha: 0.05,
        valueScale: 1,
        opacity: 1
    };
    var BRUSH_SIZE = 20;
    var GRADIENT_LEVELS = 256;
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
        getCanvas: function (data, width, height) {
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
                var alpha = Math.min(1, Math.max(value * this.option.valueScale || this.option.minAlpha, this.option.minAlpha));
                ctx.globalAlpha = alpha;
                ctx.drawImage(brush, x - r, y - r);
            }
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var pixels = imageData.data;
            var len = pixels.length / 4;
            while (len--) {
                var id = len * 4 + 3;
                var alpha = pixels[id] / 256;
                var colorOffset = Math.floor(alpha * (GRADIENT_LEVELS - 1));
                pixels[id - 3] = gradient[colorOffset * 4];
                pixels[id - 2] = gradient[colorOffset * 4 + 1];
                pixels[id - 1] = gradient[colorOffset * 4 + 2];
                pixels[id] *= this.option.opacity;
            }
            ctx.putImageData(imageData, 0, 0);
            return canvas;
        },
        _getBrush: function () {
            if (!this._brushCanvas) {
                this._brushCanvas = document.createElement('canvas');
                var r = BRUSH_SIZE + this.option.blurSize;
                var d = r * 2;
                this._brushCanvas.width = d;
                this._brushCanvas.height = d;
                var ctx = this._brushCanvas.getContext('2d');
                ctx.shadowOffsetX = d;
                ctx.shadowBlur = this.option.blurSize;
                ctx.shadowColor = 'black';
                ctx.beginPath();
                ctx.arc(-r, r, BRUSH_SIZE, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.fill();
            }
            return this._brushCanvas;
        },
        _getGradient: function () {
            if (!this._gradientPixels) {
                var levels = GRADIENT_LEVELS;
                var canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = levels;
                var ctx = canvas.getContext('2d');
                var gradient = ctx.createLinearGradient(0, 0, 0, levels);
                var len = this.option.gradientColors.length;
                for (var i = 0; i < len; ++i) {
                    if (typeof this.option.gradientColors[i] === 'string') {
                        gradient.addColorStop((i + 1) / len, this.option.gradientColors[i]);
                    } else {
                        gradient.addColorStop(this.option.gradientColors[i].offset, this.option.gradientColors[i].color);
                    }
                }
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 1, levels);
                this._gradientPixels = ctx.getImageData(0, 0, 1, levels).data;
            }
            return this._gradientPixels;
        }
    };
    return Heatmap;
});define('echarts/layer/heatmap', ['require'], function (require) {
    var defaultOptions = {
        blurSize: 30,
        gradientColors: [
            'blue',
            'cyan',
            'lime',
            'yellow',
            'red'
        ],
        minAlpha: 0.05,
        valueScale: 1,
        opacity: 1
    };
    var BRUSH_SIZE = 20;
    var GRADIENT_LEVELS = 256;
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
        getCanvas: function (data, width, height) {
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
                var alpha = Math.min(1, Math.max(value * this.option.valueScale || this.option.minAlpha, this.option.minAlpha));
                ctx.globalAlpha = alpha;
                ctx.drawImage(brush, x - r, y - r);
            }
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var pixels = imageData.data;
            var len = pixels.length / 4;
            while (len--) {
                var id = len * 4 + 3;
                var alpha = pixels[id] / 256;
                var colorOffset = Math.floor(alpha * (GRADIENT_LEVELS - 1));
                pixels[id - 3] = gradient[colorOffset * 4];
                pixels[id - 2] = gradient[colorOffset * 4 + 1];
                pixels[id - 1] = gradient[colorOffset * 4 + 2];
                pixels[id] *= this.option.opacity;
            }
            ctx.putImageData(imageData, 0, 0);
            return canvas;
        },
        _getBrush: function () {
            if (!this._brushCanvas) {
                this._brushCanvas = document.createElement('canvas');
                var r = BRUSH_SIZE + this.option.blurSize;
                var d = r * 2;
                this._brushCanvas.width = d;
                this._brushCanvas.height = d;
                var ctx = this._brushCanvas.getContext('2d');
                ctx.shadowOffsetX = d;
                ctx.shadowBlur = this.option.blurSize;
                ctx.shadowColor = 'black';
                ctx.beginPath();
                ctx.arc(-r, r, BRUSH_SIZE, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.fill();
            }
            return this._brushCanvas;
        },
        _getGradient: function () {
            if (!this._gradientPixels) {
                var levels = GRADIENT_LEVELS;
                var canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = levels;
                var ctx = canvas.getContext('2d');
                var gradient = ctx.createLinearGradient(0, 0, 0, levels);
                var len = this.option.gradientColors.length;
                for (var i = 0; i < len; ++i) {
                    if (typeof this.option.gradientColors[i] === 'string') {
                        gradient.addColorStop((i + 1) / len, this.option.gradientColors[i]);
                    } else {
                        gradient.addColorStop(this.option.gradientColors[i].offset, this.option.gradientColors[i].color);
                    }
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
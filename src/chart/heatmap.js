/**
 * @file defines echarts Heatmap Chart
 * @author Ovilia (me@zhangwenli.com)
 * Inspired by https://github.com/mourner/simpleheat
 *
 * @module
 *
 * @requires /src/chart/base.js
 * @requires /src/chart/layer/heatmap.js
 * @requires /src/config.js
 * @requires /src/util/ecData.js
 * @requires NPM:zrender/tool/util.js
 * @requires NPM:zrender/tool/color.js
 * @requires NPM:zrender/shape/Image.js
 */
define(function (require) {
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

            var layer = new HeatmapLayer();

            var len = series.length;
            for (var i = 0; i < len; ++i) {
                if (series[i].type === ecConfig.CHART_TYPE_HEATMAP) {
                    series[i] = this.reformOption(series[i]);

                    var canvas = layer.getCanvas(series[i].data,
                        this.zr.getWidth(), this.zr.getHeight())
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
                }
            }
        }
    };



    zrUtil.inherits(Heatmap, ChartBase);

    require('../chart').define('heatmap', Heatmap);

    return Heatmap;
});

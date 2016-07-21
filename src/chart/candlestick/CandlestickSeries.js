define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var SeriesModel = require('../../model/Series');
    var whiskerBoxCommon = require('../helper/whiskerBoxCommon');
    var formatUtil = require('../../util/format');
    var encodeHTML = formatUtil.encodeHTML;
    var addCommas = formatUtil.addCommas;

    var CandlestickSeries = SeriesModel.extend({

        type: 'series.candlestick',

        dependencies: ['xAxis', 'yAxis', 'grid'],

        /**
         * @readOnly
         */
        valueDimensions: ['open', 'close', 'lowest', 'highest'],

        /**
         * @type {Array.<string>}
         * @readOnly
         */
        dimensions: null,

        /**
         * @override
         */
        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠
            coordinateSystem: 'cartesian2d',
            legendHoverLink: true,

            hoverAnimation: true,

            // xAxisIndex: 0,
            // yAxisIndex: 0,

            layout: null, // 'horizontal' or 'vertical'

            itemStyle: {
                normal: {
                    color: '#c23531', // 阳线 positive
                    color0: '#314656', // 阴线 negative     '#c23531', '#314656'
                    borderWidth: 1,
                    // FIXME
                    // ec2中使用的是lineStyle.color 和 lineStyle.color0
                    borderColor: '#c23531',
                    borderColor0: '#314656'
                },
                emphasis: {
                    borderWidth: 2
                }
            },

            animationUpdate: false,
            animationEasing: 'linear',
            animationDuration: 300
        },

        /**
         * Get dimension for shadow in dataZoom
         * @return {string} dimension name
         */
        getShadowDim: function () {
            return 'open';
        },

        /**
         * @override
         */
        formatTooltip: function (dataIndex, mutipleSeries) {
            // It rearly use mutiple candlestick series in one cartesian,
            // so only consider one series in this default tooltip.
            var valueHTMLArr = zrUtil.map(this.valueDimensions, function (dim) {
                return dim + ': ' + addCommas(this._data.get(dim, dataIndex));
            }, this);

            return encodeHTML(this.name) + '<br />' + valueHTMLArr.join('<br />');
        },

        brushSelector: function (itemLayout, selectors) {
            return selectors.rect(itemLayout.brushRect);
        }

    });

    zrUtil.mixin(CandlestickSeries, whiskerBoxCommon.seriesModelMixin, true);

    return CandlestickSeries;

});
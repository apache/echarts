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

            barMaxWidth: null,
            barMinWidth: null,
            barWidth: null,

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
            var valueHTML = zrUtil.map(this.valueDimensions, function (dim) {
                return encodeHTML(dim + ': ' + addCommas(this.getData().get(dim, dataIndex)));
            }, this).join('<br />');

            var html = [];
            this.name != null && html.push(encodeHTML(this.name));
            valueHTML != null && html.push(valueHTML);

            return html.join('<br />');
        },

        brushSelector: function (dataIndex, data, selectors) {
            var itemLayout = data.getItemLayout(dataIndex);
            return selectors.rect(itemLayout.brushRect);
        }

    });

    zrUtil.mixin(CandlestickSeries, whiskerBoxCommon.seriesModelMixin, true);

    return CandlestickSeries;

});
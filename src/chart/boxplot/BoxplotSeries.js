define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var SeriesModel = require('../../model/Series');
    var whiskerBoxCommon = require('../helper/whiskerBoxCommon');

    var BoxplotSeries = SeriesModel.extend({

        type: 'series.boxplot',

        dependencies: ['xAxis', 'yAxis', 'grid'],

        // TODO
        // box width represents group size, so dimension should have 'size'.

        /**
         * @see <https://en.wikipedia.org/wiki/Box_plot>
         * The meanings of 'min' and 'max' depend on user,
         * and echarts do not need to know it.
         * @readOnly
         */
        valueDimensions: ['min', 'Q1', 'median', 'Q3', 'max'],

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

            layout: null,               // 'horizontal' or 'vertical'
            boxWidth: [7, 50],       // [min, max] can be percent of band width.

            itemStyle: {
                normal: {
                    color: '#fff',
                    borderWidth: 1
                },
                emphasis: {
                    borderWidth: 2,
                    shadowBlur: 5,
                    shadowOffsetX: 2,
                    shadowOffsetY: 2,
                    shadowColor: 'rgba(0,0,0,0.4)'
                }
            },

            animationEasing: 'elasticOut',
            animationDuration: 800
        }
    });

    zrUtil.mixin(BoxplotSeries, whiskerBoxCommon.seriesModelMixin, true);

    return BoxplotSeries;

});
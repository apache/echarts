define(function (require) {

    'use strict';

    var createListFromArray = require('../helper/createListFromArray');
    var SeriesModel = require('../../model/Series');

    return SeriesModel.extend({

        type: 'series.effectScatter',

        dependencies: ['grid', 'polar'],

        getInitialData: function (option, ecModel) {
            var list = createListFromArray(option.data, this, ecModel);
            return list;
        },

        brushSelector: 'point',

        defaultOption: {
            coordinateSystem: 'cartesian2d',
            zlevel: 0,
            z: 2,
            legendHoverLink: true,

            effectType: 'ripple',

            progressive: 0,

            // When to show the effect, option: 'render'|'emphasis'
            showEffectOn: 'render',

            // Ripple effect config
            rippleEffect: {
                period: 4,
                // Scale of ripple
                scale: 2.5,
                // Brush type can be fill or stroke
                brushType: 'fill'
            },

            // Cartesian coordinate system
            // xAxisIndex: 0,
            // yAxisIndex: 0,

            // Polar coordinate system
            // polarIndex: 0,

            // Geo coordinate system
            // geoIndex: 0,

            // symbol: null,        // 图形类型
            symbolSize: 10          // 图形大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
            // symbolRotate: null,  // 图形旋转控制

            // large: false,
            // Available when large is true
            // largeThreshold: 2000,

            // itemStyle: {
            //     normal: {
            //         opacity: 1
            //     }
            // }
        }

    });
});
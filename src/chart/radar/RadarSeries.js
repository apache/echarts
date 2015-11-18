define(function(require) {

    'use strict';

    var createListFromArray = require('../helper/createListFromArray');
    var SeriesModel = require('../../model/Series');

    // Must have polar coordinate system
    require('../../component/polar');

    return SeriesModel.extend({

        type: 'series.radar',

        dependencies: ['polar'],

        getInitialData: function (option, ecModel) {
            return createListFromArray(option.data, this, ecModel);
        },

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 2,                       // 二级层叠
            coordinateSystem: 'polar',
            legendHoverLink: true,
            polarIndex: 0,
            lineStyle: {
                normal: {
                    width: 2,
                    type: 'solid'
                }
            },
            // areaStyle: {
            // },
            // 拐点图形类型
            symbol: 'emptyCircle',
            // 拐点图形大小
            symbolSize: 4,
            // 拐点图形旋转控制
            // symbolRotate: null,
            // 标志图形默认只有主轴显示（随主轴标签间隔隐藏策略）
            showAllSymbol: false
        }
    });
});
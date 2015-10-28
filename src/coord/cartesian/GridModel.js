// Grid 是在有直角坐标系的时候必须要存在的
// 所以这里也要被 Cartesian2D 依赖
define(function(require) {

    'use strict';

    require('./AxisModel');

    var zrUtil = require('zrender/core/util');

    var GridModel = require('../../echarts').extendComponentModel({

        type: 'grid',

        dependencies: ['xAxis', 'yAxis'],

        /**
         * @type {module:echarts/coord/cartesian/Grid}
         */
        coordinateSystem: null,

        defaultOption: {
            show: false,
            zlevel: 0,                  // 一级层叠
            z: 0,                       // 二级层叠
            x: 80,
            y: 60,
            x2: 80,
            y2: 60,
            // width: {totalWidth} - x - x2,
            // height: {totalHeight} - y - y2,
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 1,
            borderColor: '#ccc'
        }
    });
});